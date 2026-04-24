/**
 * Purpose: Claim Data Validation
 * Validates the structure and content of decrypted claim data
 */

/**
 * Condition: Verify required fields exist in decrypted data
 * @param {object} claimData - Decrypted claim data
 * @returns {object} { isValid: boolean, missingFields: array, error: string|null }
 */
function hasRequiredClaimFields(claimData) {
  const requiredFields = ['claimId', 'courseId', 'userId', 'creditAmount'];
  const missingFields = [];
  
  requiredFields.forEach(field => {
    if (!claimData[field]) {
      missingFields.push(field);
    }
  });
  
  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      error: `Missing required fields: ${missingFields.join(', ')}`,
      statusCode: 400
    };
  }
  
  return { isValid: true, missingFields: [], error: null };
}

/**
 * Condition: Verify credit amount is valid positive number
 * @param {any} creditAmount - Credit amount value
 * @returns {object} { isValid: boolean, error: string|null }
 */
function isValidCreditAmount(creditAmount) {
  if (typeof creditAmount !== 'number' || creditAmount <= 0) {
    return {
      isValid: false,
      error: 'creditAmount must be a positive number',
      statusCode: 400
    };
  }
  
  return { isValid: true, error: null };
}

/**
 * Condition: Verify claim status is valid
 * Allowed statuses: PENDING, APPROVED, REJECTED, PROCESSING
 * @param {string} status - Claim status
 * @returns {object} { isValid: boolean, error: string|null }
 */
function isValidClaimStatus(status) {
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING'];
  
  if (status && !validStatuses.includes(status)) {
    return {
      isValid: false,
      error: `Invalid claim status. Allowed: ${validStatuses.join(', ')}`,
      statusCode: 400
    };
  }
  
  return { isValid: true, error: null };
}

/**
 * Condition: Verify IDs are non-empty strings
 * @param {object} claimData - Claim data object
 * @returns {object} { isValid: boolean, error: string|null }
 */
function hasValidIds(claimData) {
  const idFields = ['claimId', 'courseId', 'userId'];
  
  for (const field of idFields) {
    if (typeof claimData[field] !== 'string' || claimData[field].trim() === '') {
      return {
        isValid: false,
        error: `${field} must be a non-empty string`,
        statusCode: 400
      };
    }
  }
  
  return { isValid: true, error: null };
}

/**
 * Complete claim validation flow
 * @param {object} claimData - Decrypted claim data
 * @returns {object} { isValid: boolean, error: string|null, statusCode: number }
 */
function validateClaimData(claimData) {
  // Check required fields
  const fieldsCheck = hasRequiredClaimFields(claimData);
  if (!fieldsCheck.isValid) {
    return fieldsCheck;
  }
  
  // Check IDs
  const idsCheck = hasValidIds(claimData);
  if (!idsCheck.isValid) {
    return idsCheck;
  }
  
  // Check credit amount
  const amountCheck = isValidCreditAmount(claimData.creditAmount);
  if (!amountCheck.isValid) {
    return amountCheck;
  }
  
  // Check status if provided
  if (claimData.claimStatus) {
    const statusCheck = isValidClaimStatus(claimData.claimStatus);
    if (!statusCheck.isValid) {
      return statusCheck;
    }
  }
  
  return { isValid: true, error: null };
}

module.exports = {
  hasRequiredClaimFields,
  isValidCreditAmount,
  isValidClaimStatus,
  hasValidIds,
  validateClaimData
};
