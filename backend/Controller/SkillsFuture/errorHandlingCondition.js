/**
 * Purpose: Error Response Handling
 * Standardizes error responses and error classification
 */

/**
 * SSG API Error Types and Status Codes
 */
const ERROR_TYPES = {
  SIGNATURE_VERIFICATION_FAILED: {
    statusCode: 401,
    message: 'Verification of signature failed',
    reason: 'Signature does not match the data sent'
  },
  SIGNATURE_HEADER_MISSING: {
    statusCode: 400,
    message: 'Unable to perform verification due invalid request',
    reason: 'Signature Header is missing or empty'
  },
  PUBLIC_KEY_MISSING: {
    statusCode: 400,
    message: 'Unable to perform verification due invalid request',
    reason: 'Public Key is missing in metadata'
  },
  BODY_EMPTY: {
    statusCode: 400,
    message: 'Unable to perform verification due invalid request',
    reason: 'Body is empty'
  },
  DECRYPTION_FAILED: {
    statusCode: 401,
    message: 'Unable to perform decryption due invalid request',
    reason: 'Decryption failed - check encryption key'
  },
  ENCRYPTION_KEY_MISSING: {
    statusCode: 400,
    message: 'Unable to perform decryption due invalid request',
    reason: 'AES Key is missing in metadata'
  },
  INVALID_ENCRYPTED_DATA: {
    statusCode: 400,
    message: 'Unable to perform decryption due invalid request',
    reason: 'Encrypted data format is invalid'
  },
  INVALID_CLAIM_DATA: {
    statusCode: 400,
    message: 'Invalid claim data',
    reason: 'Decrypted data structure does not match expected format'
  },
  SYSTEM_ERROR: {
    statusCode: 500,
    message: 'Unable to perform verification/decryption due to system error',
    reason: 'System error - please contact support with correlationId'
  }
};

/**
 * Create standardized error response
 * @param {string} errorType - Key from ERROR_TYPES
 * @param {string} correlationId - Optional: unique identifier for tracking
 * @param {string} details - Optional: additional error details
 * @returns {object} { statusCode, body }
 */
function createErrorResponse(errorType, correlationId = null, details = null) {
  const error = ERROR_TYPES[errorType] || ERROR_TYPES.SYSTEM_ERROR;
  
  const body = {
    success: false,
    error: error.message,
    reason: error.reason
  };
  
  if (details) {
    body.details = details;
  }
  
  if (correlationId) {
    body.correlationId = correlationId;
  }
  
  return {
    statusCode: error.statusCode,
    body
  };
}

/**
 * Convert validation result to error response
 * @param {object} validationResult - Result from condition validator
 * @param {string} correlationId - Optional: unique identifier for tracking
 * @returns {object|null} { statusCode, body } or null if valid
 */
function handleValidationError(validationResult, correlationId = null) {
  if (validationResult.isValid) {
    return null;
  }
  
  const body = {
    success: false,
    error: validationResult.error,
    ...(validationResult.missingFields && { missingFields: validationResult.missingFields }),
    ...(correlationId && { correlationId })
  };
  
  return {
    statusCode: validationResult.statusCode || 400,
    body
  };
}

/**
 * Classify error as retryable or permanent
 * @param {number} statusCode - HTTP status code
 * @returns {boolean} true if retryable
 */
function isRetryableError(statusCode) {
  const retryableStatuses = [500, 502, 503, 504, 408];
  return retryableStatuses.includes(statusCode);
}

/**
 * Generate unique correlation ID for error tracking
 * Format: SF-{timestamp}-{random}
 * @returns {string}
 */
function generateCorrelationId() {
  return `SF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format error for logging
 * @param {string} context - Where error occurred
 * @param {string} message - Error message
 * @param {any} error - Error object/details
 * @returns {object}
 */
function formatErrorLog(context, message, error) {
  return {
    context: `[SkillsFuture] ${context}`,
    message,
    error: error instanceof Error ? error.message : error,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  ERROR_TYPES,
  createErrorResponse,
  handleValidationError,
  isRetryableError,
  generateCorrelationId,
  formatErrorLog
};
