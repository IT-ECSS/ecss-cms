const express = require('express');
const router = express.Router();
const moment = require('moment');
const axios = require('axios');
const path = require('path');

// Constants defined at top level
const CLIENT_ID = "ZrjDybXZeOFUA70KYMwb1dnfmdEXFfAS"
// New API: Use /fapi base URL for FAPI 2.0 endpoints (per official demo-app)
const JWTTOKENURL = "https://id.singpass.gov.sg/fapi";
const SPTOKENURL = "https://id.singpass.gov.sg/fapi/token";

const REDIRECT_URI = "https://salmon-wave-09f02b100.6.azurestaticapps.net/callback";

const USERINFO_URL = "https://id.singpass.gov.sg/fapi/userinfo";

// FAPI 2.0: DPoP (Demonstrating Proof of Possession) support
const { generateDPoPKeyPair, generateDPoPProof, computeAccessTokenHash, storeDPoPKeyPair, getDPoPKeyPair, removeDPoPKeyPair } = require('../Others/SingPass/dpop');

// FAPI 2.0: OpenID Discovery configuration cache
let openidConfigCache = null;
let openidConfigCacheTime = 0;
const OPENID_CONFIG_CACHE_TTL = 3600000; // 1 hour in ms

async function fetchOpenIDConfiguration() {
  const now = Date.now();
  if (openidConfigCache && (now - openidConfigCacheTime) < OPENID_CONFIG_CACHE_TTL) {
    return openidConfigCache;
  }
  try {
    const response = await axios.get(`${JWTTOKENURL}/.well-known/openid-configuration`, { timeout: 10000 });
    openidConfigCache = response.data;
    openidConfigCacheTime = now;
    console.log('FAPI 2.0: OpenID Configuration fetched and cached');
    return openidConfigCache;
  } catch (error) {
    console.error('Failed to fetch OpenID configuration:', error.message);
    if (openidConfigCache) return openidConfigCache;
    throw error;
  }
}

// Initialize jose as null and import it dynamically
let jose = null;

// Load jose asynchronously before handling requests
async function initializeJose() {
  if (jose === null) {
    jose = await import('jose');
    console.log('Jose library loaded successfully');
  }
  return jose;
}

// FIXED: Helper function to format date of birth to dd/mm/yyyy
const formatDateOfBirth = (dateInput) => {
  try {
    console.log('Formatting date input:', dateInput, 'Type:', typeof dateInput);
    
    // Handle null, undefined, or empty values
    if (!dateInput || dateInput === '') {
      console.log('Empty date input, returning N/A');
      return 'N/A';
    }
    
    // Extract value from SingPass structured data if needed
    const dateString = (typeof dateInput === 'object' && dateInput.value !== undefined) 
      ? dateInput.value 
      : dateInput;
    
    // Convert to string if it's not already
    const dateStr = String(dateString).trim();
    
    // If it's already in dd/mm/yyyy format, return as is
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      console.log('Date already in dd/mm/yyyy format:', dateStr);
      return dateStr;
    }
    
    // If it's in yyyy-mm-dd format (ISO format) - most common SingPass format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      console.log('Converted yyyy-mm-dd to dd/mm/yyyy:', formattedDate);
      return formattedDate;
    }
    
    // If it's in dd-mm-yyyy format with dashes
    if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = dateStr.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      console.log('Converted dd-mm-yyyy to dd/mm/yyyy:', formattedDate);
      return formattedDate;
    }
    
    // Try parsing as a Date object for other formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      console.log('Parsed date object to dd/mm/yyyy:', formattedDate);
      return formattedDate;
    }
    
    // If it's just a year (like "1960")
    if (dateStr.match(/^\d{4}$/)) {
      console.log('Only year provided:', dateStr);
      return `01/01/${dateStr}`;
    }
    
    // If all else fails, return the original string
    console.log('Could not format date, returning original:', dateStr);
    return dateStr;
    
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateInput || 'N/A';
  }
};

// Helper function to map residential status codes to full values
function mapResidentialStatus(code) {
  if (!code) return null;
  
  const statusMap = {
    'C': 'SC',
    'P': 'PR'
  };
  
  return statusMap[code] || code; // Return mapped value or original if not found
}

// Helper function to map sex codes to full values
function mapSex(code) {
  if (!code) return null;
  
  const sexMap = {
    'M': 'M',
    'F': 'F'
  };
  
  return sexMap[code] || code; // Return mapped value or original if not found
}

// Helper function to map race codes to standard values
function mapRace(code) {
  if (!code) return null;
  
  const raceMap = {
    'CN': 'CN',
    'IN': 'IN',
    'MY': 'MY',
    'XX': 'XX'
  };
  
  return raceMap[code] || code; // Return mapped value or original if not found
}

// Helper function to extract value from SingPass structured data
function extractSingPassValue(data) {
  if (data === null || data === undefined) {
    return null;
  }
  
  // Handle SingPass structured data with 'code' property (common for residential status)
  if (typeof data === 'object' && data.code !== undefined) {
    return data.code;
  }
  
  // Handle SingPass structured data format: {lastupdated, source, classification, value}
  if (typeof data === 'object' && data.value !== undefined) {
    return data.value;
  }
  
  // Return the data as-is if it's not structured
  return data;
}

// Helper function to process extracted data and remove structured objects
function processExtractedData(rawData) {
  const processedData = {};
  
  Object.keys(rawData).forEach(key => {
    let extractedValue = extractSingPassValue(rawData[key]);
    
    // Apply special mapping for residential status codes
    if (key === 'residentialstatus' && extractedValue) {
      extractedValue = mapResidentialStatus(extractedValue);
    }
    
    // Keep the field even if empty for debugging purposes, but log nulls
    if (extractedValue === null || extractedValue === undefined) {
      console.log(`Warning: Field '${key}' is ${extractedValue}`);
      processedData[key] = extractedValue;
    } else {
      processedData[key] = extractedValue;
    }
  });
  
  return processedData;
}

// Modified encrypt function to use dynamically imported jose
async function encryptJwtAsJwe(unsignedJwt, encryptionJwk) {
  const joseLib = await initializeJose();
  // Extract public JWK from private key
  const publicJwk = { ...encryptionJwk };
  delete publicJwk.d;
  const encKey = await joseLib.importJWK(publicJwk, "ECDH-ES+A256KW");
  return await new joseLib.CompactEncrypt(
    new TextEncoder().encode(unsignedJwt)
  )
    .setProtectedHeader({
      alg: "ECDH-ES+A256KW",
      enc: "A256GCM",
      kid: encryptionJwk.kid,
    })
    .encrypt(encKey);
}

// Modified sign function to use dynamically imported jose
async function signJwtAsJws(payload, signingJwk, kid) {
  const joseLib = await initializeJose();
  const privateKey = await joseLib.importJWK(signingJwk, "ES256");
  return await new joseLib.SignJWT(payload)
    .setProtectedHeader({
      alg: "ES256",
      kid: kid,
      typ: "JWT",
    })
    .sign(privateKey);
}

// Enhanced UserInfo function with better debugging and error handling
// FAPI 2.0: Added dpopKeyPair parameter for DPoP support
async function fetchUserInfo(accessToken, options = {}, dpopKeyPair = null) {
  const { retries = 2, timeout = 15000 } = options;
  let attempt = 0;
  
  console.log('=== USERINFO DEBUG START ===');
  console.log('Access Token (first 20 chars):', accessToken?.substring(0, 20) + '...');
  console.log('UserInfo URL:', USERINFO_URL);
  console.log('FAPI 2.0 DPoP:', dpopKeyPair ? 'enabled' : 'disabled');
  
  while (attempt <= retries) {
    try {
      console.log(`UserInfo request attempt ${attempt + 1}/${retries + 1}`);
      
      // FAPI 2.0: Generate fresh DPoP proof for each attempt
      const requestHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'SingPass-Integration-AzureSWA/1.0'
      };
      if (dpopKeyPair) {
        const ath = computeAccessTokenHash(accessToken);
        const dpopProof = await generateDPoPProof(dpopKeyPair.privateKey, dpopKeyPair.publicJwk, 'GET', USERINFO_URL, ath);
        requestHeaders['Authorization'] = `DPoP ${accessToken}`;
        requestHeaders['DPoP'] = dpopProof;
        console.log('FAPI 2.0: DPoP proof generated for UserInfo request');
      } else {
        requestHeaders['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await axios.get(USERINFO_URL, {
        headers: requestHeaders,
        timeout,
        validateStatus: status => status < 600 // Accept all responses for debugging
      });
      
      console.log(`UserInfo response status: ${response.status}`);
      console.log('UserInfo response headers:', JSON.stringify(response.headers, null, 2));
      console.log('UserInfo response data type:', typeof response.data);
      console.log('UserInfo response data preview:', 
        typeof response.data === 'string' 
          ? response.data.substring(0, 200) + '...'
          : JSON.stringify(response.data).substring(0, 200) + '...'
      );
      
      if (response.status === 200) {
        const userInfoResponse = response.data;
        
        // Check if response is empty or null
        if (!userInfoResponse) {
          console.error("UserInfo response is null or empty");
          return {
            success: false,
            error: "Empty UserInfo response",
            debug: { status: response.status, headers: response.headers }
          };
        }
        
        // Check if response is a JWE (encrypted) - 5 parts separated by dots
        if (typeof userInfoResponse === 'string' && userInfoResponse.split('.').length === 5) {
          console.log("UserInfo response is JWE, attempting decryption...");
          
          try {
            // Load encryption private key with error handling
            let ENCRYPTION_PRIVATE_KEY;
            try {
              ENCRYPTION_PRIVATE_KEY = require("../Others/SingPass/Keys/private-ec-encryption-key.jwk.json");
              console.log("Encryption key loaded, kid:", ENCRYPTION_PRIVATE_KEY.kid);
            } catch (keyError) {
              console.error("Failed to load encryption key:", keyError.message);
              return {
                success: false,
                error: "Encryption key not found",
                message: keyError.message
              };
            }
            
            // Decrypt the JWE
            const joseLib = await initializeJose();
            const privateKey = await joseLib.importJWK(ENCRYPTION_PRIVATE_KEY, "ECDH-ES+A256KW");
            
            const { plaintext } = await joseLib.compactDecrypt(userInfoResponse, privateKey);
            const decryptedText = new TextDecoder().decode(plaintext);
            
            console.log("JWE decryption successful");
            console.log("Decrypted content preview:", decryptedText.substring(0, 200) + '...');
            
            // Parse decrypted content
            let decryptedUserInfo;
            
            // Check if decrypted content is a JWT
            if (decryptedText.startsWith('eyJ')) {
              console.log("Decrypted content is a JWT, decoding...");
              decryptedUserInfo = joseLib.decodeJwt(decryptedText);
            } else {
              // Parse as JSON
              try {
                decryptedUserInfo = JSON.parse(decryptedText);
                console.log("Decrypted content parsed as JSON");
              } catch (jsonError) {
                console.error("Failed to parse decrypted content:", jsonError);
                return {
                  success: false,
                  error: "Invalid decrypted content format",
                  message: jsonError.message,
                  decryptedPreview: decryptedText.substring(0, 100)
                };
              }
            }
            
            console.log("Decrypted UserInfo fields:", Object.keys(decryptedUserInfo));
            
            // FAPI 2.0: Check for person_info wrapper in response
            if (decryptedUserInfo.person_info) {
              console.log("FAPI 2.0: Extracting data from person_info wrapper");
              decryptedUserInfo = { ...decryptedUserInfo, ...decryptedUserInfo.person_info };
            }
            
            // Extract and process user data
            const rawExtractedData = {
              sub: decryptedUserInfo.sub,
              uinfin: decryptedUserInfo.uinfin,
              name: decryptedUserInfo.name,
              dob: decryptedUserInfo.dob ? formatDateOfBirth(decryptedUserInfo.dob) : null,
              sex: decryptedUserInfo.sex,
              race: decryptedUserInfo.race,
              nationality: decryptedUserInfo.nationality,
              residentialstatus: decryptedUserInfo.residentialstatus,
              email: decryptedUserInfo.email,
              mobileno: decryptedUserInfo.mobileno,
              regadd: decryptedUserInfo.regadd
            };
            
            console.log("Raw extracted data:", JSON.stringify(rawExtractedData, null, 2));
            
            const processedData = processExtractedData(rawExtractedData);
            console.log("Processed data:", JSON.stringify(processedData, null, 2));
            
            return { 
              success: true, 
              userInfo: decryptedUserInfo,
              extractedData: processedData,
              uinfin: extractSingPassValue(decryptedUserInfo.uinfin),
              debug: { decrypted: true, fields: Object.keys(decryptedUserInfo) }
            };
            
          } catch (decryptError) {
            console.error("JWE decryption failed:", decryptError);
            return {
              success: false,
              error: "UserInfo JWE decryption failed",
              message: decryptError.message,
              stack: decryptError.stack
            };
          }
          
        } else {
          // Handle plain JSON response
          console.log("UserInfo response is plain JSON or other format");
          
          let parsedUserInfo;
          if (typeof userInfoResponse === 'string') {
            try {
              parsedUserInfo = JSON.parse(userInfoResponse);
            } catch (parseError) {
              console.error("Failed to parse string response as JSON:", parseError);
              return {
                success: false,
                error: "Invalid JSON response",
                message: parseError.message,
                responsePreview: userInfoResponse.substring(0, 200)
              };
            }
          } else {
            parsedUserInfo = userInfoResponse;
          }
          
          console.log("Parsed UserInfo fields:", Object.keys(parsedUserInfo));
          console.log("UserInfo sample data:", JSON.stringify(parsedUserInfo, null, 2).substring(0, 500));
          
          // FAPI 2.0: Check for person_info wrapper in response
          if (parsedUserInfo.person_info) {
            console.log("FAPI 2.0: Extracting data from person_info wrapper");
            parsedUserInfo = { ...parsedUserInfo, ...parsedUserInfo.person_info };
          }
          
          const rawExtractedData = {
            sub: parsedUserInfo.sub,
            uinfin: parsedUserInfo.uinfin,
            name: parsedUserInfo.name,
            dob: parsedUserInfo.dob ? formatDateOfBirth(parsedUserInfo.dob) : null,
            sex: parsedUserInfo.sex,
            nationality: parsedUserInfo.nationality,
            race: parsedUserInfo.race,
            residentialstatus: parsedUserInfo.residentialstatus,
            email: parsedUserInfo.email,
            mobileno: parsedUserInfo.mobileno,
            regadd: parsedUserInfo.regadd
          };
          
          console.log("Raw extracted data:", JSON.stringify(rawExtractedData, null, 2));
          
          const processedData = processExtractedData(rawExtractedData);
          console.log("Processed data:", JSON.stringify(processedData, null, 2));
          
          return { 
            success: true, 
            userInfo: parsedUserInfo,
            extractedData: processedData,
            uinfin: extractSingPassValue(parsedUserInfo.uinfin),
            debug: { decrypted: false, fields: Object.keys(parsedUserInfo) }
          };
        }
      }
      
      // Handle specific error responses
      if (response.status === 401) {
        console.error("UserInfo authorization failed (401)");
        console.error("Response data:", response.data);
        return { 
          success: false,
          error: "UserInfo authorization failed", 
          status: response.status, 
          details: response.data,
          suggestion: "Check access token validity"
        };
      }
      
      if (response.status === 403) {
        console.error("UserInfo access forbidden (403)");
        return { 
          success: false,
          error: "UserInfo access forbidden", 
          status: response.status, 
          details: response.data,
          suggestion: "Check client permissions and scopes"
        };
      }
      
      // Retry for server errors and rate limiting
      if (response.status === 429 || response.status >= 500) {
        const waitTime = response.status === 429 ? 2000 : 1000 * Math.min(3, attempt + 1);
        console.warn(`Retriable error (${response.status}), waiting ${waitTime}ms before retry ${attempt + 1}`);
        await new Promise(r => setTimeout(r, waitTime));
        attempt++;
        continue;
      }
      
      console.error("UserInfo request failed with unexpected status:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      return { 
        success: false,
        error: "UserInfo request failed", 
        status: response.status, 
        details: response.data
      };
      
    } catch (error) {
      console.error(`UserInfo request error (attempt ${attempt + 1}):`, {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      if (attempt < retries) {
        const waitTime = 1000 * (attempt + 1);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
        attempt++;
        continue;
      }
      
      return { 
        success: false,
        error: "UserInfo network error", 
        message: error.message,
        code: error.code || 'NETWORK_ERROR',
        suggestion: "Check network connectivity and SingPass service status"
      };
    }
  }
  
  console.log('=== USERINFO DEBUG END ===');
  return {
    success: false,
    error: "UserInfo request failed after all retries",
    lastAttempt: attempt,
    suggestion: "Check SingPass UserInfo endpoint availability"
  };
}

// Enhanced Step 5: Invoke the User Endpoint following SingPass specification exactly
// FAPI 2.0: Added dpopKeyPair parameter for DPoP support
async function invokeUserEndpoint(accessToken, options = {}, dpopKeyPair = null) {
  const { retries = 2, timeout = 15000 } = options;
  let attempt = 0;
  
  // Step 5: SingPass User Endpoint (Note: demo app uses /fapi/userinfo, not /user)
  const USER_ENDPOINT_URL = "https://id.singpass.gov.sg/fapi/userinfo";
  
  console.log('=== STEP 5: USER ENDPOINT DEBUG START ===');
  console.log('User Endpoint URL:', USER_ENDPOINT_URL);
  console.log('Access Token (first 20 chars):', accessToken?.substring(0, 20) + '...');
  console.log('FAPI 2.0 DPoP:', dpopKeyPair ? 'enabled' : 'disabled');
  
  while (attempt <= retries) {
    try {
      console.log(`Step 5 User endpoint request attempt ${attempt + 1}/${retries + 1}`);
      
      // FAPI 2.0: Generate fresh DPoP proof for each attempt
      const requestHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'SingPass-Integration-AzureSWA/1.0'
      };
      if (dpopKeyPair) {
        const ath = computeAccessTokenHash(accessToken);
        const dpopProof = await generateDPoPProof(dpopKeyPair.privateKey, dpopKeyPair.publicJwk, 'GET', USER_ENDPOINT_URL, ath);
        requestHeaders['Authorization'] = `DPoP ${accessToken}`;
        requestHeaders['DPoP'] = dpopProof;
        console.log('FAPI 2.0: DPoP proof generated for User endpoint request');
      } else {
        requestHeaders['Authorization'] = `Bearer ${accessToken}`;
      }
      
      // Step 5: Make request to User endpoint with proper headers
      const response = await axios.get(USER_ENDPOINT_URL, {
        headers: requestHeaders,
        timeout,
        validateStatus: status => status < 600 // Accept all responses for debugging
      });
      
      console.log(`Step 5 User endpoint response status: ${response.status}`);
      console.log('User endpoint response headers:', JSON.stringify(response.headers, null, 2));
      console.log('User endpoint response data type:', typeof response.data);
      console.log('User endpoint response data preview:', 
        typeof response.data === 'string' 
          ? response.data.substring(0, 200) + '...'
          : JSON.stringify(response.data).substring(0, 200) + '...'
      );
      
      if (response.status === 200) {
        const userEndpointResponse = response.data;
        
        // Check if response is empty or null
        if (!userEndpointResponse) {
          console.error("User endpoint response is null or empty");
          return {
            success: false,
            error: "Empty User endpoint response",
            debug: { status: response.status, headers: response.headers }
          };
        }
        
        // Step 5: Handle encrypted JWE response (most common for SingPass User endpoint)
        if (typeof userEndpointResponse === 'string' && userEndpointResponse.split('.').length === 5) {
          console.log("User endpoint response is JWE, attempting decryption...");
          
          try {
            // Load encryption private key for Step 5
            let ENCRYPTION_PRIVATE_KEY;
            try {
              ENCRYPTION_PRIVATE_KEY = require("../Others/SingPass/Keys/private-ec-encryption-key.jwk.json");
              console.log("Encryption key loaded for Step 5, kid:", ENCRYPTION_PRIVATE_KEY.kid);
            } catch (keyError) {
              console.error("Failed to load encryption key for Step 5:", keyError.message);
              return {
                success: false,
                error: "Step 5: Encryption key not found",
                message: keyError.message
              };
            }
            
            // Decrypt the JWE using Step 5 methodology
            const joseLib = await initializeJose();
            const privateKey = await joseLib.importJWK(ENCRYPTION_PRIVATE_KEY, "ECDH-ES+A256KW");
            
            const { plaintext } = await joseLib.compactDecrypt(userEndpointResponse, privateKey);
            const decryptedText = new TextDecoder().decode(plaintext);
            
            console.log("Step 5 JWE decryption successful");
            console.log("Step 5 decrypted content preview:", decryptedText.substring(0, 200) + '...');
            
            // Parse decrypted user data
            let decryptedUserData;
            
            // Check if decrypted content is a JWT
            if (decryptedText.startsWith('eyJ')) {
              console.log("Step 5 decrypted content is a JWT, decoding...");
              decryptedUserData = joseLib.decodeJwt(decryptedText);
            } else {
              // Parse as JSON
              try {
                decryptedUserData = JSON.parse(decryptedText);
                console.log("Step 5 decrypted content parsed as JSON");
              } catch (jsonError) {
                console.error("Step 5 failed to parse decrypted content:", jsonError);
                return {
                  success: false,
                  error: "Step 5: Invalid decrypted content format",
                  message: jsonError.message,
                  decryptedPreview: decryptedText.substring(0, 100)
                };
              }
            }
            
            console.log("Step 5 decrypted user data fields:", Object.keys(decryptedUserData));
            
            // FAPI 2.0: Check for person_info wrapper in response
            if (decryptedUserData.person_info) {
              console.log("FAPI 2.0: Extracting data from person_info wrapper");
              decryptedUserData = { ...decryptedUserData, ...decryptedUserData.person_info };
            }
            
            // Extract and process Step 5 user data following SingPass specification
            const rawExtractedData = {
              sub: decryptedUserData.sub,
              uinfin: decryptedUserData.uinfin,
              name: decryptedUserData.name,
              dob: decryptedUserData.dob ? formatDateOfBirth(decryptedUserData.dob) : null,
              sex: decryptedUserData.sex,
              race: decryptedUserData.race,
              nationality: decryptedUserData.nationality,
              residentialstatus: decryptedUserData.residentialstatus,
              email: decryptedUserData.email,
              mobileno: decryptedUserData.mobileno,
              regadd: decryptedUserData.regadd,
              // Include any additional fields from Step 5 response
              ...Object.fromEntries(
                Object.entries(decryptedUserData).filter(([key]) => 
                  !['sub', 'uinfin', 'name', 'dob', 'sex', 'race', 'nationality', 
                    'residentialstatus', 'email', 'mobileno', 'regadd'].includes(key)
                )
              )
            };
            
            console.log("Step 5 raw extracted data:", JSON.stringify(rawExtractedData, null, 2));
            
            const processedData = processExtractedData(rawExtractedData);
            console.log("Step 5 processed data:", JSON.stringify(processedData, null, 2));
            
            return { 
              success: true, 
              userInfo: decryptedUserData,
              extractedData: processedData,
              uinfin: extractSingPassValue(decryptedUserData.uinfin),
              debug: { 
                step: 5,
                decrypted: true, 
                fields: Object.keys(decryptedUserData),
                endpoint: 'user'
              }
            };
            
          } catch (decryptError) {
            console.error("Step 5 JWE decryption failed:", decryptError);
            return {
              success: false,
              error: "Step 5: User endpoint JWE decryption failed",
              message: decryptError.message,
              stack: decryptError.stack
            };
          }
          
        } else {
          // Handle plain JSON response from Step 5
          console.log("Step 5 User endpoint response is plain JSON");
          
          let parsedUserData;
          if (typeof userEndpointResponse === 'string') {
            try {
              parsedUserData = JSON.parse(userEndpointResponse);
            } catch (parseError) {
              console.error("Step 5 failed to parse string response as JSON:", parseError);
              return {
                success: false,
                error: "Step 5: Invalid JSON response",
                message: parseError.message,
                responsePreview: userEndpointResponse.substring(0, 200)
              };
            }
          } else {
            parsedUserData = userEndpointResponse;
          }
          
          console.log("Step 5 parsed user data fields:", Object.keys(parsedUserData));
          console.log("Step 5 user data sample:", JSON.stringify(parsedUserData, null, 2).substring(0, 500));
          
          // FAPI 2.0: Check for person_info wrapper in response
          if (parsedUserData.person_info) {
            console.log("FAPI 2.0: Extracting data from person_info wrapper");
            parsedUserData = { ...parsedUserData, ...parsedUserData.person_info };
          }
          
          const rawExtractedData = {
            sub: parsedUserData.sub,
            uinfin: parsedUserData.uinfin,
            name: parsedUserData.name,
            dob: parsedUserData.dob ? formatDateOfBirth(parsedUserData.dob) : null,
            sex: parsedUserData.sex,
            nationality: parsedUserData.nationality,
            race: parsedUserData.race,
            residentialstatus: parsedUserData.residentialstatus,
            email: parsedUserData.email,
            mobileno: parsedUserData.mobileno,
            regadd: parsedUserData.regadd
          };
          
          console.log("Step 5 raw extracted data:", JSON.stringify(rawExtractedData, null, 2));
          
          const processedData = processExtractedData(rawExtractedData);
          console.log("Step 5 processed data:", JSON.stringify(processedData, null, 2));
          
          return { 
            success: true, 
            userInfo: parsedUserData,
            extractedData: processedData,
            uinfin: extractSingPassValue(parsedUserData.uinfin),
            debug: { 
              step: 5,
              decrypted: false, 
              fields: Object.keys(parsedUserData),
              endpoint: 'user'
            }
          };
        }
      }
      
      // Handle Step 5 specific error responses
      if (response.status === 401) {
        console.error("Step 5 User endpoint authorization failed (401)");
        console.error("Step 5 Response data:", response.data);
        return { 
          success: false,
          error: "Step 5: User endpoint authorization failed", 
          status: response.status, 
          details: response.data,
          suggestion: "Check access token validity and scope permissions for User endpoint"
        };
      }
      
      if (response.status === 403) {
        console.error("Step 5 User endpoint access forbidden (403)");
        return { 
          success: false,
          error: "Step 5: User endpoint access forbidden", 
          status: response.status, 
          details: response.data,
          suggestion: "Check client permissions and scopes for User endpoint access"
        };
      }
      
      // Retry for server errors and rate limiting
      if (response.status === 429 || response.status >= 500) {
        const waitTime = response.status === 429 ? 2000 : 1000 * Math.min(3, attempt + 1);
        console.warn(`Step 5 retriable error (${response.status}), waiting ${waitTime}ms before retry ${attempt + 1}`);
        await new Promise(r => setTimeout(r, waitTime));
        attempt++;
        continue;
      }
      
      console.error("Step 5 User endpoint request failed with unexpected status:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      return { 
        success: false,
        error: "Step 5: User endpoint request failed", 
        status: response.status, 
        details: response.data
      };
      
    } catch (error) {
      console.error(`Step 5 User endpoint request error (attempt ${attempt + 1}):`, {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      if (attempt < retries) {
        const waitTime = 1000 * (attempt + 1);
        console.log(`Step 5 retrying in ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
        attempt++;
        continue;
      }
      
      return { 
        success: false,
        error: "Step 5: User endpoint network error", 
        message: error.message,
        code: error.code || 'NETWORK_ERROR',
        suggestion: "Check network connectivity and SingPass User endpoint service status"
      };
    }
  }
  
  console.log('=== STEP 5: USER ENDPOINT DEBUG END ===');
  return {
    success: false,
    error: "Step 5: User endpoint request failed after all retries",
    lastAttempt: attempt,
    suggestion: "Check SingPass User endpoint availability and access token validity"
  };
}

// =============================================================================
// FAPI 2.0: Pushed Authorization Request (PAR) endpoint
// =============================================================================
router.post('/par', async (req, res) => {
  try {
    
    await initializeJose();
    
    const { scope, redirect_uri, state, nonce, code_challenge, code_challenge_method } = req.body;
    
    console.log('FAPI 2.0 PAR request received:', { 
      scope: scope?.substring(0, 30) + '...', 
      redirect_uri, 
      state: state?.substring(0, 8) + '...', 
      nonce: nonce?.substring(0, 8) + '...' 
    });
    
    // Validate required parameters
    if (!scope || !redirect_uri || !state || !nonce || !code_challenge || !code_challenge_method) {
      return res.status(400).json({ 
        error: 'invalid_request', 
        error_description: 'Missing required PAR parameters' 
      });
    }
    
    // Step 1: Generate ephemeral DPoP key pair for this authentication flow
    const dpopKeyPair = await generateDPoPKeyPair();
    console.log('FAPI 2.0: DPoP key pair generated');
    
    // Store DPoP key pair associated with state for later token exchange
    storeDPoPKeyPair(state, dpopKeyPair);
    
    // Step 2: Fetch OpenID configuration to get PAR endpoint
    const openidConfig = await fetchOpenIDConfiguration();
    // SingPass does not expose pushed_authorization_request_endpoint in OpenID config
    // Use the known PAR endpoint directly
    const parEndpoint = openidConfig.pushed_authorization_request_endpoint || 'https://id.singpass.gov.sg/fapi/par';
    
    console.log('FAPI 2.0 PAR endpoint:', parEndpoint);
    
    // Step 3: Generate client assertion JWT for PAR request
    const SIGNATURE_PRIVATE_KEY = require("../Others/SingPass/Keys/private-signing-key.jwk.json");
    const KID = SIGNATURE_PRIVATE_KEY.kid;
    
    const nowTime = moment().unix();
    const futureTime = moment().add(2, "minutes").unix();
    
    const jwtPayload = {
      sub: CLIENT_ID,
      iss: CLIENT_ID,
      aud: JWTTOKENURL,
      iat: nowTime,
      exp: futureTime,
      jti: `${CLIENT_ID}_par_${nowTime}`
    };
    
    const clientAssertion = await signJwtAsJws(jwtPayload, SIGNATURE_PRIVATE_KEY, KID);
    console.log('FAPI 2.0: Client assertion generated for PAR');
    
    // Step 4: Generate DPoP proof for PAR endpoint
    const dpopProof = await generateDPoPProof(dpopKeyPair.privateKey, dpopKeyPair.publicJwk, 'POST', parEndpoint);
    console.log('FAPI 2.0: DPoP proof generated for PAR');
    
    // Step 5: Send PAR request to SingPass
    const parRequestBody = {
      client_id: CLIENT_ID,
      response_type: 'code',
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      nonce: nonce,
      code_challenge: code_challenge,
      code_challenge_method: code_challenge_method,
      // New API: Required for Login apps
      authentication_context_type: 'national',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion
    };
    
    console.log('FAPI 2.0: Sending PAR request to SingPass...');
    
    const parResponse = await axios.post(
      parEndpoint,
      new URLSearchParams(parRequestBody),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'DPoP': dpopProof
        },
        timeout: 15000,
        validateStatus: status => status < 600
      }
    );
    
    console.log('FAPI 2.0 PAR response status:', parResponse.status);
    console.log('FAPI 2.0 PAR response data:', JSON.stringify(parResponse.data).substring(0, 200));
    
    if (parResponse.status !== 201 && parResponse.status !== 200) {
      // Clean up DPoP key pair on failure
      removeDPoPKeyPair(state);
      
      return res.status(parResponse.status).json({
        error: parResponse.data?.error || 'par_request_failed',
        error_description: parResponse.data?.error_description || 'Pushed Authorization Request failed',
        details: parResponse.data
      });
    }
    
    const { request_uri, expires_in } = parResponse.data;
    
    if (!request_uri) {
      removeDPoPKeyPair(state);
      return res.status(500).json({
        error: 'invalid_par_response',
        error_description: 'No request_uri in PAR response'
      });
    }
    
    console.log('FAPI 2.0: PAR successful, request_uri:', request_uri);
    
    // Return request_uri and authorization endpoint to frontend
    return res.status(200).json({
      request_uri: request_uri,
      expires_in: expires_in,
      authorization_endpoint: openidConfig.authorization_endpoint || 'https://id.singpass.gov.sg/fapi/auth'
    });
    
  } catch (error) {
    console.error('FAPI 2.0 PAR error:', error.message);
    
    // Clean up DPoP key pair on error
    const { state } = req.body || {};
    if (state) removeDPoPKeyPair(state);
    
    return res.status(500).json({
      error: 'server_error',
      error_description: 'PAR request processing failed',
      message: error.message
    });
  }
});

// FAPI 2.0: Handle CORS preflight for PAR
// CORS preflight for PAR is handled by app-level cors middleware

// Update the main token endpoint to use Step 5: User Endpoint instead of UserInfo
router.post('/token', async (req, res) => {
  try {
    
    // Ensure jose is initialized
    await initializeJose();
    
    // Extract parameters from request body (following SingPass Step 4 exactly)
    const { code, code_verifier, state, platform, href } = req.body;
    console.log("Request body parameters:", req)
    
    // FAPI 2.0: Retrieve DPoP key pair for this authentication flow
    const dpopKeyPair = state ? getDPoPKeyPair(state) : null;
    const isFAPI2 = !!dpopKeyPair;
    if (isFAPI2) {
      console.log('FAPI 2.0: DPoP key pair found for state, using FAPI 2.0 flow');
    } else {
      console.log('Legacy flow: No DPoP key pair found, using legacy Bearer flow');
    }
    
    // Validate required parameters
    if (!code) {
      return res.status(400).json({ 
        error: "invalid_request", 
        error_description: "Missing required parameter: code" 
      });
    }
    
    if (!code_verifier) {
      return res.status(400).json({ 
        error: "invalid_request", 
        error_description: "Missing required parameter: code_verifier" 
      });
    }
    
    // Load configuration and keys
    const SIGNATURE_PRIVATE_KEY = require("../Others/SingPass/Keys/private-signing-key.jwk.json");
    const KID = SIGNATURE_PRIVATE_KEY.kid;
    
    // Create JWT payload for client assertion
    const nowTime = moment().unix();
    const futureTime = moment().add(2, "minutes").unix();
    
    const jwtPayload = {
      sub: CLIENT_ID,
      iss: CLIENT_ID,
      aud: JWTTOKENURL,
      iat: nowTime,
      exp: futureTime,
      jti: `${CLIENT_ID}_${nowTime}` // Add unique identifier
    };
    
    // Step 4.1: Sign JWT for client assertion
    let clientAssertion;
    try {
      //log("Creating client assertion JWT...");
      clientAssertion = await signJwtAsJws(jwtPayload, SIGNATURE_PRIVATE_KEY, KID);
      //console.log("Client assertion created successfully");
    } catch (err) {
      //console.error("JWT signing failed:", err);
      return res.status(500).json({ 
        error: "server_error", 
        error_description: "Client assertion creation failed" 
      });
    }

      const getRedirectUriFromHref = (href) => {
        return "https://salmon-wave-09f02b100.6.azurestaticapps.net/callback";
      };


    // Usage: Dynamically set REDIRECT_URI based on req.body.href
    const dynamicRedirectUri = getRedirectUriFromHref(href);

    // Step 4.2: Exchange authorization code for tokens with correct configuration
    let tokenData;
    try {
      //console.log("Exchanging authorization code for tokens...");
      
      // FIXED: Proper token request configuration
      const tokenRequest = {
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code: code,
        redirect_uri: dynamicRedirectUri, // Use dynamically determined redirect URI
        code_verifier: code_verifier,
        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: clientAssertion
      };

      // FAPI 2.0: Generate DPoP proof for token exchange
      let tokenExchangeHeaders = { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "SingPass-Integration-AzureSWA/1.0",
        "Cache-Control": "no-cache"
      };
      if (isFAPI2) {
        const tokenDPoPProof = await generateDPoPProof(dpopKeyPair.privateKey, dpopKeyPair.publicJwk, 'POST', SPTOKENURL);
        tokenExchangeHeaders['DPoP'] = tokenDPoPProof;
        console.log('FAPI 2.0: DPoP proof added to token exchange request');
      }

      // Make the token exchange request with proper headers
      const response = await axios.post(
        SPTOKENURL,
        new URLSearchParams(tokenRequest),
        {
          headers: tokenExchangeHeaders,
          timeout: 30000, // Increased timeout for Azure SWA
          validateStatus: function (status) {
            return status < 600; // Don't throw for any status code less than 600
          }
        }
      );

      if (response.status !== 200) {

        return res.status(response.status).json({ 
          error: "token_exchange_failed", 
          error_description: "SingPass token exchange failed",
          status: response.status,
          details: response.data,
          requestDetails: {
            redirect_uri: dynamicRedirectUri,
            platform: platform || 'web'
          }
        });
      }
      
      tokenData = response.data;
      console.log("Token exchange successful");
     // console.log("Token response fields:", Object.keys(tokenData));
      
      // Validate token response
      if (!tokenData.access_token) {
        console.error("Missing access_token in response:", tokenData);
        return res.status(500).json({ 
          error: "invalid_token_response", 
          error_description: "Missing access_token in SingPass response" 
        });
      }
      
      if (!tokenData.id_token) {
        console.error("Missing id_token in response:", tokenData);
        return res.status(500).json({ 
          error: "invalid_token_response", 
          error_description: "Missing id_token in SingPass response" 
        });
      }
      
    } catch (tokenError) {
      console.error("Token exchange failed:", {
        message: tokenError.message,
        code: tokenError.code,
        response: tokenError.response?.data,
        status: tokenError.response?.status,
        config: {
          url: tokenError.config?.url,
          method: tokenError.config?.method,
          headers: tokenError.config?.headers
        }
      });
      
      // Provide more specific error messages
      let errorDescription = "Authorization code exchange failed";
      if (tokenError.code === 'ECONNABORTED') {
        errorDescription = "Request timeout - SingPass service may be slow";
      } else if (tokenError.code === 'ENOTFOUND') {
        errorDescription = "Cannot connect to SingPass service";
      } else if (tokenError.response?.status === 400) {
        errorDescription = "Invalid request parameters";
      } else if (tokenError.response?.status === 401) {
        errorDescription = "Authentication failed - check client credentials";
      } else if (tokenError.response?.status === 403) {
        errorDescription = "Access forbidden - check client permissions";
      }
      
      return res.status(500).json({ 
        error: "invalid_grant", 
        error_description: errorDescription,
        details: tokenError.response?.data,
        code: tokenError.code,
        requestDetails: {
          redirect_uri: dynamicRedirectUri,
          platform: platform || 'web'
        }
      });
    }

    // Step 4.3: Validate and process ID token
    try {
      if (!tokenData || !tokenData.id_token) {
        return res.status(500).json({ 
          error: "server_error", 
          error_description: "Missing id_token in token response" 
        });
      } 
      let idToken = tokenData.id_token;
      console.log("Processing ID token...");
      
      const joseLib = await initializeJose();
      
      // New API: ID tokens are always encrypted (JWE). Decrypt first if needed.
      // A JWE has 5 Base64URL parts separated by dots.
      if (typeof idToken === 'string' && idToken.split('.').length === 5) {
        console.log("ID token is JWE (encrypted), decrypting...");
        try {
          const ENCRYPTION_PRIVATE_KEY = require("../Others/SingPass/Keys/private-ec-encryption-key.jwk.json");
          const encPrivateKey = await joseLib.importJWK(ENCRYPTION_PRIVATE_KEY, "ECDH-ES+A256KW");
          const { plaintext } = await joseLib.compactDecrypt(idToken, encPrivateKey);
          idToken = new TextDecoder().decode(plaintext);
          console.log("ID token JWE decrypted successfully");
        } catch (decryptErr) {
          console.error("ID token JWE decryption failed:", decryptErr.message);
          // Fall through — try to decode as plain JWT anyway
        }
      }
      
      // Decode JWT ID token (either the original or the decrypted inner JWT)
      const idTokenClaims = joseLib.decodeJwt(idToken);
      console.log("ID token decoded successfully");
      console.log("ID token claims:", Object.keys(idTokenClaims));
      
      // Extract user identifier
      // New API: sub claim now contains only the UUID (no more comma-separated s=...,u=...)
      const userUuid = idTokenClaims.sub;
      
      // New API: Extract sub_attributes claim (contains NRIC/FIN when user.identity scope is granted)
      const subAttributes = idTokenClaims.sub_attributes || null;
      if (subAttributes) {
        console.log("sub_attributes found in ID token:", JSON.stringify(subAttributes));
      } else {
        console.log("No sub_attributes in ID token (user.identity scope may not be approved)");
      }
      
      // Step 5: Invoke the User Endpoint (replacing UserInfo endpoint)
      let userProfile = null;
      let userEndpointDebug = null;
      let endpointUsed = 'none';
      
      if (tokenData.access_token) {
        console.log("=== INVOKING STEP 5: USER ENDPOINT ===");
        const userEndpointResult = await invokeUserEndpoint(tokenData.access_token, { 
          retries: 2, 
          timeout: 15000 
        }, dpopKeyPair);
        
        userEndpointDebug = userEndpointResult.debug || {};
        
        if (userEndpointResult.success) {
          userProfile = userEndpointResult.extractedData;
          endpointUsed = 'user';
          console.log("Step 5: User profile retrieved successfully");
          console.log("Step 5: Profile fields:", Object.keys(userProfile || {}));
        } else {
          console.error("Step 5: User endpoint failed:", {
            error: userEndpointResult.error,
            message: userEndpointResult.message,
            suggestion: userEndpointResult.suggestion
          });
          
          // Try fallback to UserInfo endpoint if User endpoint fails
          console.log("Trying fallback to UserInfo endpoint...");
          const userInfoResult = await fetchUserInfo(tokenData.access_token, { 
            retries: 2, 
            timeout: 15000 
          }, dpopKeyPair);
          
          if (userInfoResult.success) {
            userProfile = userInfoResult.extractedData;
            endpointUsed = 'userinfo';
            console.log("UserInfo fallback successful");
            console.log("UserInfo Profile fields:", Object.keys(userProfile || {}));
          } else {
            console.error("Both User endpoint and UserInfo failed");
            console.error("User endpoint error:", userEndpointResult.error);
            console.error("UserInfo error:", userInfoResult.error);
            
            // Don't fail the entire request - return basic info from ID token
            userProfile = {
              sub: userUuid
            };
            endpointUsed = 'id_token_only';
            console.log("Using ID token data only as fallback");
          }
        }
      } else {
        console.warn("No access token available for Step 5: User endpoint");
        userProfile = { sub: userUuid };
        endpointUsed = 'no_access_token';
      }
      
      // Ensure we have individual fields extracted properly - handle null userProfile
      const extractedFields = {
        name: extractSingPassValue(userProfile?.name) || null,
        uinfin: extractSingPassValue(userProfile?.uinfin) || null,
        residentialstatus: mapResidentialStatus(extractSingPassValue(userProfile?.residentialstatus)) || null,
        race: mapRace(extractSingPassValue(userProfile?.race)) || null,
        sex: mapSex(extractSingPassValue(userProfile?.sex)) || null,
        dob: extractSingPassValue(userProfile?.dob) || null,
        mobileno: extractSingPassValue(userProfile?.mobileno) || null,
        email: extractSingPassValue(userProfile?.email) || null,
        regadd: extractSingPassValue(userProfile?.regadd) || null
      };
      
      console.log("Extracted individual fields:", extractedFields);
      console.log("Endpoint used:", endpointUsed);
      
      // Return successful response with Step 5 data - always succeed even if user data is minimal
      const response = {
        success: true,
        message: `SingPass authentication completed successfully (endpoint: ${endpointUsed})`,
        data: {
          uuid: userUuid,
          access_token: tokenData.access_token,
          token_type: tokenData.token_type || "Bearer",
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
          userProfile: userProfile,
          // New API: sub_attributes from ID token (NRIC/FIN when user.identity scope is granted)
          sub_attributes: subAttributes,
          // Extract individual fields for frontend compatibility
          ...extractedFields,
          // If sub_attributes has NRIC/FIN, use it as fallback for uinfin
          ...(subAttributes?.nric_fin && !extractedFields.uinfin ? { uinfin: subAttributes.nric_fin } : {}),
          // Add metadata about what worked
          endpointUsed: endpointUsed,
          // Include debug info in development
          ...(process.env.NODE_ENV !== 'production' && {
            debug: {
              step5Debug: userEndpointDebug,
              idTokenClaims: Object.keys(idTokenClaims),
              hasUserProfile: !!userProfile,
              extractedFields: Object.keys(extractedFields).filter(key => extractedFields[key] !== null),
              endpoint: endpointUsed
            }
          })
        }
      };
      
      console.log("SingPass Step 4 + Step 5 completed successfully");
      console.log("Final response has userProfile:", !!userProfile);
      console.log("Individual fields extracted:", Object.keys(extractedFields).filter(key => extractedFields[key] !== null));
      console.log("Response data keys:", response.data);
      
      // FAPI 2.0: Clean up DPoP key pair after successful authentication
      if (state && isFAPI2) {
        removeDPoPKeyPair(state);
        console.log('FAPI 2.0: DPoP key pair cleaned up');
      }
      
      return res.status(200).json(response);
      
    } catch (tokenProcessingError) {
      console.error("Token processing failed:", tokenProcessingError);
      console.error("Token processing stack:", tokenProcessingError.stack);
      return res.status(500).json({ 
        error: "server_error", 
        error_description: "ID token processing failed",
        message: tokenProcessingError.message,
        details: process.env.NODE_ENV !== 'production' ? tokenProcessingError.stack : undefined
      });
    }
    
  } catch (error) {
    console.error("SingPass token endpoint error:", error);
    console.error("SingPass token endpoint stack:", error.stack);
    return res.status(500).json({ 
      error: "server_error", 
      error_description: "Internal server error",
      message: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Handle CORS preflight requests
// CORS preflight for token is handled by app-level cors middleware

// Legacy endpoint for backward compatibility
router.post('/', async (req, res) => {
  // Redirect to the new token endpoint
  req.url = '/token';
  console.log("Request123:", req.body.href);
  return router.handle(req, res);
});

module.exports = router;