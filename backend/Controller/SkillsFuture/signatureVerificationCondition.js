const crypto = require('crypto');

/**
 * Purpose: Digital Signature Verification
 * Validates RSA-SHA256 signature from SSG SkillsFuture
 */

const RSA_ALGORITHM = 'RSA-SHA256';

/**
 * Condition: Verify request has X-Api-Signature header
 * @param {object} headers - Request headers
 * @returns {object} { isValid: boolean, error: string|null }
 */
function hasSignatureHeader(headers) {
  const signature = headers['x-api-signature'];
  
  if (!signature || signature.trim() === '') {
    return {
      isValid: false,
      error: 'Signature Header is missing or empty',
      statusCode: 400
    };
  }
  
  return { isValid: true, error: null };
}

/**
 * Condition: Verify public key is available
 * @param {string} publicKeyPEM - Public key in PEM format
 * @returns {object} { isValid: boolean, error: string|null }
 */
function hasPublicKey(publicKeyPEM) {
  if (!publicKeyPEM || publicKeyPEM.trim() === '') {
    return {
      isValid: false,
      error: 'Public Key is missing in metadata',
      statusCode: 400
    };
  }
  
  return { isValid: true, error: null };
}

/**
 * Condition: Verify RSA signature is valid
 * @param {string|Buffer} data - Original data
 * @param {string} signature - RSA signature (base64-encoded)
 * @param {string} publicKeyPEM - Public key in PEM format
 * @returns {object} { isValid: boolean, error: string|null }
 */
function verifyRSASignature(data, signature, publicKeyPEM) {
  try {
    const verify = crypto.createVerify(RSA_ALGORITHM);
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
    verify.update(dataBuffer);
    const isValid = verify.verify(publicKeyPEM, Buffer.from(signature, 'base64'));
    
    if (!isValid) {
      return {
        isValid: false,
        error: 'Verification of signature failed',
        statusCode: 401
      };
    }
    
    return { isValid: true, error: null };
  } catch (error) {
    console.error('[SkillsFuture] RSA verification failed:', error.message);
    return {
      isValid: false,
      error: 'Unable to perform verification of signature due to system error',
      statusCode: 500
    };
  }
}

/**
 * Complete signature verification flow
 * @param {object} req - Express request object
 * @param {string} publicKeyPEM - Public key in PEM format
 * @returns {object} { isValid: boolean, error: string|null, statusCode: number }
 */
function verifySignatureFlow(req, publicKeyPEM) {
  // Check header
  const headerCheck = hasSignatureHeader(req.headers);
  if (!headerCheck.isValid) {
    return headerCheck;
  }
  
  // Check public key
  const keyCheck = hasPublicKey(publicKeyPEM);
  if (!keyCheck.isValid) {
    return keyCheck;
  }
  
  // Verify signature
  const signature = req.headers['x-api-signature'];
  const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  
  return verifyRSASignature(bodyString, signature, publicKeyPEM);
}

module.exports = {
  hasSignatureHeader,
  hasPublicKey,
  verifyRSASignature,
  verifySignatureFlow
};
