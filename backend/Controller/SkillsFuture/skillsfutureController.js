const crypto = require('crypto');
const DatabaseConnectivity = require('../../database/databaseConnectivity');

class SkillsFutureController {
  constructor() {
    this.databaseConnectivity = new DatabaseConnectivity();
    this.AES_ALGORITHM = 'aes-256-cbc';
    this.RSA_ALGORITHM = 'RSA-SHA256';
    this.IV_LENGTH = 16;
  }

  /**
   * Decrypt AES-256-CBC encrypted data
   * @param {string} encryptedData - Base64-encoded encrypted data (IV + ciphertext)
   * @param {string} encryptionKey - Base64-encoded encryption key (256-bit)
   * @returns {object} Decrypted data
   */
  decryptAES256CBC(encryptedData, encryptionKey) {
    try {
      const encrypted = Buffer.from(encryptedData, 'base64');
      const key = Buffer.from(encryptionKey, 'base64');
      
      const iv = encrypted.slice(0, this.IV_LENGTH);
      const ciphertext = encrypted.slice(this.IV_LENGTH);
      
      const decipher = crypto.createDecipheriv(this.AES_ALGORITHM, key, iv);
      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      console.log('[SkillsFuture] AES decryption successful');
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('[SkillsFuture] AES decryption failed:', error.message);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Verify RSA signature
   * @param {string|Buffer} data - Original data
   * @param {string} signature - RSA signature (base64-encoded)
   * @param {string} publicKeyPEM - Public key in PEM format
   * @returns {boolean} Signature verification result
   */
  verifyRSASignature(data, signature, publicKeyPEM) {
    try {
      const verify = crypto.createVerify(this.RSA_ALGORITHM);
      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
      verify.update(dataBuffer);
      const isValid = verify.verify(publicKeyPEM, Buffer.from(signature, 'base64'));
      
      console.log('[SkillsFuture] RSA signature verification:', isValid ? 'VALID' : 'INVALID');
      return isValid;
    } catch (error) {
      console.error('[SkillsFuture] RSA verification failed:', error.message);
      return false;
    }
  }

  /**
   * Handle SkillsFuture callback from SSG
   * SSG sends encrypted claim response with digital signature
   */
  async handleCallback(req, res) {
    try {
      console.log('[SkillsFuture] Callback received from SSG');
      
      const { responseSignature, encryptedResponse, transactionId } = req.body;
      
      if (!encryptedResponse || !responseSignature) {
        return res.status(400).json({
          success: false,
          error: 'Missing encrypted response or signature'
        });
      }
      
      const AES_KEY = process.env.SF_ENCRYPTION_KEY;
      const RSA_PUBLIC_KEY = process.env.SF_PUBLIC_KEY;
      
      if (!AES_KEY || !RSA_PUBLIC_KEY) {
        console.error('[SkillsFuture] Missing encryption credentials in environment');
        return res.status(500).json({
          success: false,
          error: 'Server configuration error'
        });
      }
      
      // Verify signature
      const isSignatureValid = this.verifyRSASignature(
        encryptedResponse,
        responseSignature,
        RSA_PUBLIC_KEY
      );
      
      if (!isSignatureValid) {
        console.error('[SkillsFuture] Signature verification failed');
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }
      
      // Decrypt response
      const decryptedData = this.decryptAES256CBC(encryptedResponse, AES_KEY);
      
      console.log('[SkillsFuture] Decrypted claim data:', {
        claimId: decryptedData.claimId,
        courseId: decryptedData.courseId,
        userId: decryptedData.userId,
        creditAmount: decryptedData.creditAmount
      });
      
      // Extract claim information
      const claimInfo = {
        claimId: decryptedData.claimId,
        courseId: decryptedData.courseId,
        userId: decryptedData.userId,
        creditAmount: decryptedData.creditAmount,
        status: decryptedData.claimStatus || 'PENDING',
        timestamp: new Date().toISOString(),
        transactionId
      };
      
      // Store claim in session
      req.session = req.session || {};
      req.session.skillsFutureClaim = claimInfo;
      
      console.log('[SkillsFuture] Claim processed successfully:', claimInfo.claimId);
      
      // Redirect to frontend callback page
      const frontendCallbackUrl = `${process.env.FRONTEND_URL}/skillsfuture/callback?status=success&claimId=${claimInfo.claimId}&courseId=${claimInfo.courseId}`;
      
      return res.redirect(frontendCallbackUrl);
      
    } catch (error) {
      console.error('[SkillsFuture] Callback processing failed:', error.message);
      const errorCallbackUrl = `${process.env.FRONTEND_URL}/skillsfuture/callback?status=error&error=${encodeURIComponent(error.message)}`;
      return res.redirect(errorCallbackUrl);
    }
  }

  /**
   * Create payment request from frontend
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async createPaymentRequest(req, res) {
    try {
      const { courseId, userId, creditAmount } = req.body;
      
      if (!courseId || !userId || !creditAmount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: courseId, userId, creditAmount'
        });
      }
      
      if (typeof creditAmount !== 'number' || creditAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'creditAmount must be a positive number'
        });
      }
      
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
        callbackUrl: `${process.env.BACKEND_URL}/api/skillsfuture/callback`
      };
      
      return res.json({
        success: true,
        requestId: `REQ-${Date.now()}`,
        payload: paymentRequest,
        message: 'Payment request created successfully'
      });
      
    } catch (error) {
      console.error('[SkillsFuture] Payment request creation failed:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get claim details by claimId
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  async getClaimDetails(req, res) {
    try {
      const { claimId } = req.params;
      
      if (!claimId) {
        return res.status(400).json({
          success: false,
          error: 'claimId parameter is required'
        });
      }
      
      console.log('[SkillsFuture] Retrieving claim details:', claimId);
      
      // TODO: Fetch from database using claimId
      const claimDetails = {
        claimId,
        status: 'APPROVED',
        courseId: 'COURSE-001',
        creditUsed: 500,
        remainingCredit: 4500,
        processingDate: new Date().toISOString()
      };
      
      return res.json({
        success: true,
        claim: claimDetails,
        message: 'Claim details retrieved successfully'
      });
      
    } catch (error) {
      console.error('[SkillsFuture] Failed to retrieve claim:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = SkillsFutureController;
