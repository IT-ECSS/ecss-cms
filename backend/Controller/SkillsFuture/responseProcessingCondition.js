/**
 * Purpose: Response Processing
 * Structures successful claim responses and redirects
 */

/**
 * Build claim info object from decrypted data
 * @param {object} decryptedData - Decrypted claim data
 * @param {string} transactionId - Transaction ID from request
 * @returns {object} Structured claim info
 */
function buildClaimInfo(decryptedData, transactionId) {
  return {
    claimId: decryptedData.claimId,
    courseId: decryptedData.courseId,
    userId: decryptedData.userId,
    creditAmount: decryptedData.creditAmount,
    status: decryptedData.claimStatus || 'PENDING',
    timestamp: new Date().toISOString(),
    transactionId: transactionId || `TXN-${Date.now()}`
  };
}

/**
 * Create redirect URL for frontend callback
 * @param {string} baseUrl - Frontend base URL
 * @param {object} claimInfo - Claim information
 * @returns {string} Redirect URL
 */
function createCallbackRedirectUrl(baseUrl, claimInfo) {
  const params = new URLSearchParams({
    status: 'success',
    claimId: claimInfo.claimId,
    courseId: claimInfo.courseId,
    transactionId: claimInfo.transactionId
  });
  
  return `${baseUrl}/skillsfuture/callback?${params.toString()}`;
}

/**
 * Create error redirect URL for frontend
 * @param {string} baseUrl - Frontend base URL
 * @param {string} error - Error message
 * @param {string} transactionId - Transaction ID for tracking
 * @returns {string} Redirect URL
 */
function createErrorRedirectUrl(baseUrl, error, transactionId = null) {
  const params = new URLSearchParams({
    status: 'error',
    error: error
  });
  
  if (transactionId) {
    params.append('transactionId', transactionId);
  }
  
  return `${baseUrl}/skillsfuture/callback?${params.toString()}`;
}

/**
 * Verify redirect URL is valid
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function isValidRedirectUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Build success response JSON
 * @param {object} claimInfo - Claim information
 * @returns {object}
 */
function buildSuccessResponse(claimInfo) {
  return {
    success: true,
    message: 'Claim processed successfully',
    claim: claimInfo,
    timestamp: new Date().toISOString()
  };
}

/**
 * Store claim in session
 * @param {object} req - Express request object
 * @param {object} claimInfo - Claim information
 * @returns {boolean}
 */
function storeClaimInSession(req, claimInfo) {
  try {
    if (!req.session) {
      req.session = {};
    }
    
    req.session.skillsFutureClaim = claimInfo;
    console.log('[SkillsFuture] Claim stored in session:', claimInfo.claimId);
    return true;
  } catch (error) {
    console.error('[SkillsFuture] Failed to store claim in session:', error.message);
    return false;
  }
}

module.exports = {
  buildClaimInfo,
  createCallbackRedirectUrl,
  createErrorRedirectUrl,
  isValidRedirectUrl,
  buildSuccessResponse,
  storeClaimInSession
};
