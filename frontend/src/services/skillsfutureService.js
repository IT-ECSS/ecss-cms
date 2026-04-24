/**
 * SkillsFuture API Service
 * Handles communication with SkillsFuture backend endpoints
 */

const BACKEND_URL = 'http://localhost:3001';
const API_BASE = `${BACKEND_URL}/skillsfuture`;

/**
 * Build request options with proper headers
 */
function getRequestOptions(method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include' // Include cookies for session
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
}

/**
 * Handle API response
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  // For redirects, return the redirected URL
  if (response.redirected) {
    return {
      success: true,
      redirectUrl: response.url
    };
  }

  return response.json();
}

/**
 * Parse callback URL parameters
 */
export function parseCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  
  return {
    status: params.get('status'), // 'success' or 'error'
    claimId: params.get('claimId'),
    courseId: params.get('courseId'),
    transactionId: params.get('transactionId'),
    error: params.get('error')
  };
}

/**
 * Get claim details from backend
 * @param {string} claimId - Claim ID
 * @returns {Promise<object>}
 */
export async function getClaimDetails(claimId) {
  try {
    const response = await fetch(
      `${API_BASE}/claim/${claimId}/details`,
      getRequestOptions('GET')
    );

    return handleResponse(response);
  } catch (error) {
    console.error('[SkillsFuture] Failed to fetch claim details:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create payment request to backend
 * @param {object} paymentData - { courseId, userId, creditAmount }
 * @returns {Promise<object>}
 */
export async function createPaymentRequest(paymentData) {
  try {
    if (!paymentData.courseId || !paymentData.userId || !paymentData.creditAmount) {
      throw new Error('Missing required fields: courseId, userId, creditAmount');
    }

    if (paymentData.creditAmount <= 0) {
      throw new Error('creditAmount must be positive');
    }

    const response = await fetch(
      `${API_BASE}/payment/request`,
      getRequestOptions('POST', paymentData)
    );

    return handleResponse(response);
  } catch (error) {
    console.error('[SkillsFuture] Failed to create payment request:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Redirect to SkillsFuture payment page
 * @param {string} requestId - Payment request ID
 */
export function redirectToSkillsFuture(requestId) {
  // This would be replaced with actual SkillsFuture redirect logic
  const skillsfutureUrl = `https://ssg-wsg.gov.sg/skillsfuture/pay/${requestId}`;
  window.location.href = skillsfutureUrl;
}

/**
 * Format claim data for display
 */
export function formatClaimData(claimData) {
  if (!claimData) return null;

  return {
    claimId: claimData.claimId || 'N/A',
    courseId: claimData.courseId || 'N/A',
    creditAmount: claimData.creditAmount || 0,
    status: claimData.status || 'UNKNOWN',
    creditUsed: claimData.creditUsed || 0,
    remainingCredit: claimData.remainingCredit || 0,
    processingDate: claimData.processingDate ? new Date(claimData.processingDate).toLocaleString() : 'N/A'
  };
}

/**
 * Check if callback is successful
 */
export function isSuccessfulCallback(callbackParams) {
  return callbackParams.status === 'success' && callbackParams.claimId;
}

export default {
  parseCallbackParams,
  getClaimDetails,
  createPaymentRequest,
  redirectToSkillsFuture,
  formatClaimData,
  isSuccessfulCallback
};
