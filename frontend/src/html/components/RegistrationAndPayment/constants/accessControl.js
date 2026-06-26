/**
 * Accounts that have read-only access to the Registration & Payment table.
 * These users can view all data but cannot edit or update any cell values.
 */
export const READ_ONLY_EMAILS = ['testingA@ecss.org.sg', 'testingB@ecss.org.sg', 'mossleegermany@gmail.com'];

/**
 * Returns true if the given email belongs to a read-only user.
 * @param {string} email
 * @returns {boolean}
 */
export function isReadOnlyUser(email) {
  return READ_ONLY_EMAILS.some((e) => e.toLowerCase() === (email || '').toLowerCase());
}

