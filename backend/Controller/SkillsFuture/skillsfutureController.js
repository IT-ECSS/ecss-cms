const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── Encryption/Decryption Utilities ─────────────────────────────────────────
// AES-256-CBC for symmetric encryption (from SSG)
// RSA-2048 for asymmetric signing/verification

const AES_ALGORITHM = 'aes-256-cbc';
const RSA_ALGORITHM = 'RSA-SHA256';

/**
 * Decrypt AES-256-CBC encrypted data
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @param {string} encryptionKey - Base64-encoded encryption key (256-bit)
 * @returns {object} Decrypted JSON object
 */
function decryptAES256CBC(encryptedData, encryptionKey) {
  try {
    // Decode base64 inputs
    const encrypted = Buffer.from(encryptedData, 'base64');
    const key = Buffer.from(encryptionKey, 'base64');
    
    // Extract IV (first 16 bytes) and ciphertext (remainder)
    const iv = encrypted.slice(0, 16);
    const ciphertext = encrypted.slice(16);
    
    // Decrypt
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('[SkillsFuture] AES decryption successful');
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('[SkillsFuture] AES decryption failed:', error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Verify RSA signature
 * @param {string} data - Original data (base64-encoded)
 * @param {string} signature - RSA signature (base64-encoded)
 * @param {string} publicKeyPEM - Public key in PEM format
 * @returns {boolean} Signature verification result
 */
function verifyRSASignature(data, signature, publicKeyPEM) {
  try {
    const verify = crypto.createVerify(RSA_ALGORITHM);
    verify.update(Buffer.from(data, 'base64'));
    const isValid = verify.verify(publicKeyPEM, Buffer.from(signature, 'base64'));
    
    console.log('[SkillsFuture] RSA signature verification:', isValid ? 'VALID' : 'INVALID');
    return isValid;
  } catch (error) {
    console.error('[SkillsFuture] RSA verification failed:', error.message);
    return false;
  }
}

/**
 * Handle SkillsFuture callback
 * SSG sends encrypted claim response with digital signature
 */
async function handleCallback(req, res) {
  try {
    console.log('[SkillsFuture] Callback received from SSG');
    
    // ─── Extract callback data ────────────────────────────────────────────
    const { responseSignature, encryptedResponse, transactionId } = req.body;
    
    if (!encryptedResponse || !responseSignature) {
      return res.status(400).json({
        success: false,
        error: 'Missing encrypted response or signature'
      });
    }
    
    // ─── Get credentials from environment ─────────────────────────────────
    const AES_KEY = process.env.SF_ENCRYPTION_KEY;
    const RSA_PRIVATE_KEY = process.env.SF_PRIVATE_KEY;
    
    if (!AES_KEY || !RSA_PRIVATE_KEY) {
      console.error('[SkillsFuture] Missing encryption credentials in environment');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }
    
    // ─── Verify signature ─────────────────────────────────────────────────
    const isSignatureValid = verifyRSASignature(
      encryptedResponse,
      responseSignature,
      RSA_PRIVATE_KEY
    );
    
    if (!isSignatureValid) {
      console.error('[SkillsFuture] Signature verification failed');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }
    
    // ─── Decrypt response ────────────────────────────────────────────────
    const decryptedData = decryptAES256CBC(encryptedResponse, AES_KEY);
    
    console.log('[SkillsFuture] Decrypted claim data:', {
      claimId: decryptedData.claimId,
      courseId: decryptedData.courseId,
      userId: decryptedData.userId,
      creditAmount: decryptedData.creditAmount
    });
    
    // ─── Extract claim information ────────────────────────────────────────
    const claimInfo = {
      claimId: decryptedData.claimId,
      courseId: decryptedData.courseId,
      userId: decryptedData.userId,
      creditAmount: decryptedData.creditAmount,
      status: decryptedData.claimStatus || 'PENDING',
      timestamp: new Date().toISOString(),
      transactionId
    };
    
    // ─── Store claim in session/database ──────────────────────────────────
    // TODO: Implement database storage if needed
    req.session = req.session || {};
    req.session.skillsFutureClaim = claimInfo;
    
    console.log('[SkillsFuture] Claim processed successfully:', claimInfo.claimId);
    
    // ─── Redirect to frontend callback page ───────────────────────────────
    const frontendCallbackUrl = `https://salmon-wave-09f02b100.6.azurestaticapps.net/skillsfuture/callback?status=success&claimId=${claimInfo.claimId}&courseId=${claimInfo.courseId}`;
    
    res.redirect(frontendCallbackUrl);
    
  } catch (error) {
    console.error('[SkillsFuture] Callback processing failed:', error.message);
    
    // Redirect to error page
    const errorCallbackUrl = `https://salmon-wave-09f02b100.6.azurestaticapps.net/skillsfuture/callback?status=error&error=${encodeURIComponent(error.message)}`;
    
    res.redirect(errorCallbackUrl);
  }
}

/**
 * Create payment request (called from frontend)
 * Returns encrypted request to send to SkillsFuture
 */
async function createPaymentRequest(req, res) {
  try {
    const { courseId, userId, creditAmount } = req.body;
    
    console.log('[SkillsFuture] Creating payment request for:', {
      courseId,
      userId,
      creditAmount
    });
    
    const paymentRequest = {
      courseId,
      userId,
      creditAmount,
      timestamp: Date.now(),
      callbackUrl: 'https://ecss-backend-node.azurewebsites.net/api/skillsfuture/callback'
    };
    
    // TODO: Encrypt request if needed for SSG API
    
    res.json({
      success: true,
      requestId: `REQ-${Date.now()}`,
      payload: paymentRequest
    });
    
  } catch (error) {
    console.error('[SkillsFuture] Payment request creation failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get claim details
 */
async function getClaimDetails(req, res) {
  try {
    const { claimId } = req.params;
    
    console.log('[SkillsFuture] Retrieving claim details:', claimId);
    
    // TODO: Fetch from database using claimId
    // For now, return sample data
    const claimDetails = {
      claimId,
      status: 'APPROVED',
      courseId: 'COURSE-001',
      creditUsed: 500,
      remainingCredit: 4500,
      processingDate: new Date().toISOString()
    };
    
    res.json({
      success: true,
      claim: claimDetails
    });
    
  } catch (error) {
    console.error('[SkillsFuture] Failed to retrieve claim:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  handleCallback,
  createPaymentRequest,
  getClaimDetails,
  decryptAES256CBC,
  verifyRSASignature
};
