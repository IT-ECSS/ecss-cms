/**
 * Accounts that have read-only access to the Registration & Payment table.
 * These users can view all data but cannot edit or update any cell values.
 */
export const READ_ONLY_EMAILS = ['testingA@ecss.org.sg', 'testingB@ecss.org.sg', 'mossleegermany@gmail.com'];

/**
 * Accounts that only require approval flow for NSA rows.
 */
export const NSA_ONLY_APPROVAL_EMAILS = ['testingB@ecss.org.sg', 'mossleegermany@gmail.com'];

/**
 * Returns true if the given email belongs to a read-only user.
 * @param {string} email
 * @returns {boolean}
 */
export function isReadOnlyUser(email) {
  return READ_ONLY_EMAILS.some((e) => e.toLowerCase() === (email || '').toLowerCase());
}

/**
 * Returns true if the given user should be routed through approval flow for
 * the specified course type.
 *
 * Currently bypass approval entirely because backend approval is not used.
 * @param {string} email
 * @param {string} courseType
 * @returns {boolean}
 */
export function shouldRequireApprovalForCourse(email, courseType) {
  return false;
}


