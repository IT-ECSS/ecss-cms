/**
 * Status validation utilities for NSA course payment and registration status combinations.
 * 
 * Validation Rules for NSA Courses:
 * - Payment Status "Paid" or "SkillsFuture Done" → Registration Status MUST be "Confirmed Slot"
 * - Payment Status "To Refund" → Registration Status MUST be "Cancelled for duplication" or "Withdrawn"
 * - Payment Status "Cancelled - No payment received" → Registration Status MUST be "Not Successful"
 */

/**
 * Get allowed registration statuses based on payment status (for NSA courses)
 * @param {string} paymentStatus - The current/new payment status
 * @returns {string[]} Array of allowed registration statuses for this payment status
 */
export function getAllowedRegistrationStatuses(paymentStatus) {
  const status = String(paymentStatus || '').trim();
  
  // Payment Status "Paid" or "SkillsFuture Done" → must have "Confirmed Slot"
  if (status === 'Paid' || status === 'SkillsFuture Done') {
    return ['Confirmed Slot'];
  }
  
  // Payment Status "To Refund" → must have "Cancelled for duplication" or "Withdrawn"
  if (status === 'To refund') {
    return ['Cancelled for duplication', 'Withdrawn'];
  }
  
  // Payment Status "Cancelled - No payment received" → must have "Not Successful"
  if (status === 'Cancelled - No payment received') {
    return ['Not Successful'];
  }
  
  // Other payment statuses have no restriction
  return ['Submitted', 'Confirmed Slot', 'Cancelled for duplication', 'Withdrawn', 'Not Successful'];
}

/**
 * Get allowed payment statuses based on registration status (for NSA courses)
 * @param {string} registrationStatus - The current/new registration status
 * @returns {string[]} Array of allowed payment statuses for this registration status
 */
export function getAllowedPaymentStatuses(registrationStatus) {
  const status = String(registrationStatus || '').trim();
  
  // Registration Status "Confirmed Slot" → can have "Paid" or "SkillsFuture Done"
  if (status === 'Confirmed Slot') {
    return ['Paid', 'SkillsFuture Done', 'Pending', 'Generating SkillsFuture Invoice', 'Cancelled - No payment received'];
  }
  
  // Registration Status "Cancelled for duplication" or "Withdrawn" → must have "To Refund" or "Refunded"
  if (status === 'Cancelled for duplication' || status === 'Withdrawn') {
    return ['To refund', 'Refunded', 'Pending'];
  }
  
  // Registration Status "Not Successful" → must have "Cancelled - No payment received"
  if (status === 'Not Successful') {
    return ['Cancelled - No payment received'];
  }
  
  // Other registration statuses have no specific restriction on payment status
  return ['Paid', 'SkillsFuture Done', 'Pending', 'Generating SkillsFuture Invoice', 'Cancelled - No payment received', 'To refund', 'Refunded'];
}

/**
 * Validate if a combination of payment status and registration status is valid for NSA courses
 * @param {string} paymentStatus - The new payment status being selected
 * @param {string} registrationStatus - The current registration status
 * @returns {object} { isValid: boolean, reason: string }
 */
export function validateStatusCombination(paymentStatus, registrationStatus) {
  const paymentStr = String(paymentStatus || '').trim();
  const registrationStr = String(registrationStatus || '').trim();
  
  // No validation if either status is empty
  if (!paymentStr || !registrationStr) {
    return { isValid: true, reason: '' };
  }
  
  // Check if registration status is compatible with payment status
  if (paymentStr === 'Paid' || paymentStr === 'SkillsFuture Done') {
    if (registrationStr !== 'Confirmed Slot') {
      return {
        isValid: false,
        reason: `When Payment Status is "${paymentStr}", Registration Status must be "Confirmed Slot". Current: "${registrationStr}"`,
      };
    }
  }
  
  // Check if payment status "To Refund" requires specific registration statuses
  if (paymentStr === 'To refund') {
    if (registrationStr !== 'Cancelled for duplication' && registrationStr !== 'Withdrawn') {
      return {
        isValid: false,
        reason: `When Payment Status is "To Refund", Registration Status must be either "Cancelled for duplication" or "Withdrawn". Current: "${registrationStr}"`,
      };
    }
  }
  
  // Check if payment status "Cancelled - No payment received" requires "Not Successful"
  if (paymentStr === 'Cancelled - No payment received') {
    if (registrationStr !== 'Not Successful') {
      return {
        isValid: false,
        reason: `When Payment Status is "Cancelled - No payment received", Registration Status must be "Not Successful". Current: "${registrationStr}"`,
      };
    }
  }
  
  return { isValid: true, reason: '' };
}

/**
 * Validate if a registration status can be changed to a new value given the current payment status
 * @param {string} newRegistrationStatus - The new registration status being selected
 * @param {string} paymentStatus - The current payment status
 * @returns {object} { isValid: boolean, reason: string }
 */
export function  novalidateRegistrationStatusChange(newRegistrationStatus, paymentStatus) {
  const newRegStatus = String(newRegistrationStatus || '').trim();
  const paymentStr = String(paymentStatus || '').trim();
  
  // No validation if either status is empty
  if (!newRegStatus || !paymentStr) {
    return { isValid: true, reason: '' };
  }
  
  // Payment Status "Paid" or "SkillsFuture Done" → must have "Confirmed Slot"
  if (paymentStr === 'Paid' || paymentStr === 'SkillsFuture Done') {
    if (newRegStatus !== 'Confirmed Slot') {
      return {
        isValid: false,
        reason: `Cannot change Registration Status to "${newRegStatus}". When Payment Status is "${paymentStr}", Registration Status must be "Confirmed Slot".`,
      };
    }
  }
  
  // Payment Status "To Refund" → must have "Cancelled for duplication" or "Withdrawn"
  if (paymentStr === 'To refund') {
    if (newRegStatus !== 'Cancelled for duplication' && newRegStatus !== 'Withdrawn') {
      return {
        isValid: false,
        reason: `Cannot change Registration Status to "${newRegStatus}". When Payment Status is "To Refund", Registration Status must be either "Cancelled for duplication" or "Withdrawn".`,
      };
    }
  }
  
  // Payment Status "Cancelled - No payment received" → must have "Not Successful"
  if (paymentStr === 'Cancelled - No payment received') {
    if (newRegStatus !== 'Not Successful') {
      return {
        isValid: false,
        reason: `Cannot change Registration Status to "${newRegStatus}". When Payment Status is "Cancelled - No payment received", Registration Status must be "Not Successful".`,
      };
    }
  }
  
  return { isValid: true, reason: '' };
}

/**
 * Validate if a payment status can be changed to a new value given the current registration status
 * @param {string} newPaymentStatus - The new payment status being selected
 * @param {string} registrationStatus - The current registration status
 * @returns {object} { isValid: boolean, reason: string }
 */
export function validatePaymentStatusChange(newPaymentStatus, registrationStatus) {
  const newPaymentStr = String(newPaymentStatus || '').trim();
  const registrationStr = String(registrationStatus || '').trim();
  
  // No validation if either status is empty
  if (!newPaymentStr || !registrationStr) {
    return { isValid: true, reason: '' };
  }
  
  // When trying to set payment to "Paid" or "SkillsFuture Done", registration must be "Confirmed Slot"
  if (newPaymentStr === 'Paid' || newPaymentStr === 'SkillsFuture Done') {
    if (registrationStr !== 'Confirmed Slot') {
      return {
        isValid: false,
        reason: `Cannot change Payment Status to "${newPaymentStr}". Registration Status must be "Confirmed Slot". Current: "${registrationStr}"`,
      };
    }
  }
  
  // When trying to set payment to "To Refund", registration must be "Cancelled for duplication" or "Withdrawn"
  if (newPaymentStr === 'To refund') {
    if (registrationStr !== 'Cancelled for duplication' && registrationStr !== 'Withdrawn') {
      return {
        isValid: false,
        reason: `Cannot change Payment Status to "To Refund". Registration Status must be either "Cancelled for duplication" or "Withdrawn". Current: "${registrationStr}"`,
      };
    }
  }
  
  // When trying to set payment to "Cancelled - No payment received", registration must be "Not Successful"
  if (newPaymentStr === 'Cancelled - No payment received') {
    if (registrationStr !== 'Not Successful') {
      return {
        isValid: false,
        reason: `Cannot change Payment Status to "Cancelled - No payment received". Registration Status must be "Not Successful". Current: "${registrationStr}"`,
      };
    }
  }
  
  return { isValid: true, reason: '' };
}
