const crypto = require('crypto');

/**
 * Purpose: Payload Decryption
 * Decrypts AES-256-CBC encrypted response from SSG SkillsFuture
 */

const AES_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Condition: Verify request body is not empty
 * @param {object} body - Request body
 * @returns {object} { isValid: boolean, error: string|null }
 */
function hasBodyContent(body) {
  if (!body || (typeof body === 'string' && body.trim() === '')) {
    return {
      isValid: false,
      error: 'Body is empty',
      statusCode: 400
    };
  }
  
  return { isValid: true, error: null };
}

/**
 * Condition: Verify encryption key is valid 256-bit AES key
 * @param {string|Buffer} encryptionKey - Base64-encoded or raw key
 * @returns {object} { isValid: boolean, error: string|null }
 */
function hasValidEncryptionKey(encryptionKey) {
  if (!encryptionKey) {
    return {
      isValid: false,
      error: 'AES Key is missing in metadata',
      statusCode: 400
    };
  }
  
  try {
    let key;
    if (typeof encryptionKey === 'string') {
      key = Buffer.from(encryptionKey, 'base64');
    } else {
      key = encryptionKey;
    }
    
    if (key.length !== KEY_LENGTH) {
      return {
        isValid: false,
        error: `Encryption key must be exactly ${KEY_LENGTH} bytes (256 bits). Got ${key.length} bytes.`,
        statusCode: 400
      };
    }
    
    return { isValid: true, error: null };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid encryption key format (must be base64 or Buffer)',
      statusCode: 400
    };
  }
}

/**
 * Condition: Verify encrypted data has valid format
 * Format: Base64(IV + ciphertext)
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @returns {object} { isValid: boolean, error: string|null }
 */
function hasValidEncryptedDataFormat(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    return {
      isValid: false,
      error: 'Encrypted data must be a non-empty base64 string',
      statusCode: 400
    };
  }
  
  try {
    const decoded = Buffer.from(encryptedData, 'base64');
    
    if (decoded.length < IV_LENGTH + 1) {
      return {
        isValid: false,
        error: 'Encrypted data format invalid (too short)',
        statusCode: 400
      };
    }
    
    return { isValid: true, error: null };
  } catch (error) {
    return {
      isValid: false,
      error: 'Encrypted data must be valid base64',
      statusCode: 400
    };
  }
}

/**
 * Decrypt AES-256-CBC encrypted data
 * Extracts IV from first 16 bytes, decrypts remainder
 * @param {string} encryptedData - Base64-encoded (IV + ciphertext)
 * @param {string|Buffer} encryptionKey - Base64-encoded or raw 256-bit key
 * @returns {object} { success: boolean, decryptedData: object|null, error: string|null }
 */
function decryptPayload(encryptedData, encryptionKey) {
  // Validate encrypted data format
  const formatCheck = hasValidEncryptedDataFormat(encryptedData);
  if (!formatCheck.isValid) {
    return {
      success: false,
      decryptedData: null,
      ...formatCheck
    };
  }
  
  // Validate encryption key
  const keyCheck = hasValidEncryptionKey(encryptionKey);
  if (!keyCheck.isValid) {
    return {
      success: false,
      decryptedData: null,
      ...keyCheck
    };
  }
  
  try {
    // Prepare key
    let key;
    if (typeof encryptionKey === 'string') {
      key = Buffer.from(encryptionKey, 'base64');
    } else {
      key = encryptionKey;
    }
    
    // Extract IV and ciphertext
    const encrypted = Buffer.from(encryptedData, 'base64');
    const iv = encrypted.slice(0, IV_LENGTH);
    const ciphertext = encrypted.slice(IV_LENGTH);
    
    // Decrypt
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const decryptedStr = decrypted.toString('utf8');
    
    // Parse JSON
    try {
      return {
        success: true,
        decryptedData: JSON.parse(decryptedStr),
        error: null
      };
    } catch (parseError) {
      console.warn('[SkillsFuture] Decrypted data is not valid JSON');
      return {
        success: true,
        decryptedData: decryptedStr,
        error: null
      };
    }
  } catch (error) {
    console.error('[SkillsFuture] Decryption error:', error.message);
    return {
      success: false,
      decryptedData: null,
      error: `Unable to perform decryption due to system error: ${error.message}`,
      statusCode: 500
    };
  }
}

module.exports = {
  hasBodyContent,
  hasValidEncryptionKey,
  hasValidEncryptedDataFormat,
  decryptPayload
};
