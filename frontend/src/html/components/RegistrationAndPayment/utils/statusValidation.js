/**
 * Status validation utilities for NSA course payment and registration status combinations.
 * 
 * Validation Rules for NSA Courses:
 * - Payment Status "Paid" or "SkillsFuture Done" → Registration Status MUST be "Confirmed Slot"
 * - Payment Status "To Refund" → Registration Status MUST be "Cancelled" (before payment) or "Withdrawn"
 * - Payment Status "Participants Withdrawn" → Registration Status MUST be "Withdrawn"
 * - Payment Status "SkillsFuture Unsuccessful" → Registration Status MUST be "Not Successful"
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
  
  // Payment Status "To Refund" or "Refunded" → must have "Cancelled" (before payment) or "Withdrawn"
  if (status === 'To refund' || status === 'Refunded') {
   return ['Cancelled', 'Withdrawn'];
  }
  
  // Other payment statuses have no restriction
  return ['Submitted', 'Confirmed Slot', 'Cancelled', 'Withdrawn', 'Waiting List'];
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
    return ['Paid', 'SkillsFuture Done', 'Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Unsuccessful'];
  }
  
  // Registration Status "Cancelled" (before payment) or "Withdrawn" → can have "To Refund", "Refunded", "Participants Withdrawn", or "Pending"
  if (status === 'Cancelled' || status === 'Withdrawn') {
  return ['To refund', 'Refunded', 'Pending', 'Participants Withdrawn'];
  }
  
  // Registration Status "Not Successful" → must have "SkillsFuture Unsuccessful"
  if (status === 'Not Successful') {
    return ['SkillsFuture Unsuccessful'];
  }
  
  // Other registration statuses have no specific restriction on payment status
  return ['Paid', 'SkillsFuture Done', 'Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Unsuccessful', 'Participants Withdrawn', 'To refund', 'Refunded'];
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
    if (registrationStr !== 'Cancelled' && registrationStr !== 'Withdrawn') {
      return {
        isValid: false,
        reason: `When Payment Status is "To Refund", Registration Status must be either "Cancelled" (before payment) or "Withdrawn". Current: "${registrationStr}"`,        
      };
    }
  }
  
  // Check if payment status "SkillsFuture Unsuccessful" requires "Not Successful"
  if (paymentStr === 'SkillsFuture Unsuccessful') {
    if (registrationStr !== 'Not Successful') {
      return {
        isValid: false,
        reason: `When Payment Status is "SkillsFuture Unsuccessful", Registration Status must be "Not Successful". Current: "${registrationStr}"`,
      };
    }
  }
  
  // Check if payment status "Participants Withdrawn" requires "Withdrawn"
  if (paymentStr === 'Participants Withdrawn') {
    if (registrationStr !== 'Withdrawn') {
      return {
        isValid: false,
        reason: `When Payment Status is "Participants Withdrawn", Registration Status must be "Withdrawn". Current: "${registrationStr}"`,
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
  
  // Payment Status "To Refund" or "Refunded" → must have "Cancelled (before payment)", "Cancelled (after payment)", or "Withdrawn"
  if (paymentStr === 'To refund' || paymentStr === 'Refunded') {
    if (newRegStatus !== 'Cancelled' && newRegStatus !== 'Withdrawn') {  
    return {
        isValid: false,
        reason: `Cannot change Registration Status to "${newRegStatus}". When Payment Status is "${paymentStr}", Registration Status must be either "Cancelled" (before payment) or "Withdrawn".`,
      };
    }
  }
  
  // Payment Status "SkillsFuture Unsuccessful" → must have "Not Successful"
  if (paymentStr === 'SkillsFuture Unsuccessful') {
    if (newRegStatus !== 'Not Successful') {
      return {
        isValid: false,
        reason: `Cannot change Registration Status to "${newRegStatus}". When Payment Status is "SkillsFuture Unsuccessful", Registration Status must be "Not Successful".`,
      };
    }
  }
  
  // Payment Status "Participants Withdrawn" → must have "Withdrawn"
  if (paymentStr === 'Participants Withdrawn') {
    if (newRegStatus !== 'Withdrawn') {
      return {
        isValid: false,
        reason: `Cannot change Registration Status to "${newRegStatus}". When Payment Status is "Participants Withdrawn", Registration Status must be "Withdrawn".`,
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
  
  // When trying to set payment to "To Refund" or "Refunded", registration must be "Cancelled" (before payment) or "Withdrawn"
  if (newPaymentStr === 'To refund' || newPaymentStr === 'Refunded') {
    if (registrationStr !== 'Cancelled' && registrationStr !== 'Withdrawn') {  
      return {
        isValid: false,
        reason: `Cannot change Payment Status to "${newPaymentStr}". Registration Status must be either "Cancelled" (before payment) or "Withdrawn". Current: "${registrationStr}"`,
      };
    }
  }
  
  // When trying to set payment to "SkillsFuture Unsuccessful", registration must be "Not Successful"
  if (newPaymentStr === 'SkillsFuture Unsuccessful') {
    if (registrationStr !== 'Not Successful') {
      return {
        isValid: false,
        reason: `Cannot change Payment Status to "SkillsFuture Unsuccessful". Registration Status must be "Not Successful". Current: "${registrationStr}"`,
      };
    }
  }
  
  // When trying to set payment to "Participants Withdrawn", registration must be "Withdrawn"
  if (newPaymentStr === 'Participants Withdrawn') {
    if (registrationStr !== 'Withdrawn') {
      return {
        isValid: false,
        reason: `Cannot change Payment Status to "Participants Withdrawn". Registration Status must be "Withdrawn". Current: "${registrationStr}"`,
      };
    }
  }
  
  return { isValid: true, reason: '' };
}
