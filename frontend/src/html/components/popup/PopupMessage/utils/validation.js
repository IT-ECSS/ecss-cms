/**
 * Password validation utilities
 */

export const validatePassword = (password) => {
  // Password validation regex: at least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const getPasswordErrorMessage = () => {
  return "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character";
};

/**
 * Email validation utilities
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * NRIC validation utilities
 */
export const validateNRIC = (nric) => {
  return nric && nric.trim().length > 0;
};

/**
 * Contact number validation utilities
 */
export const validateContactNumber = (contact) => {
  return contact && contact.trim().length > 0;
};
