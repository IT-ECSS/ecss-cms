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
 * Accounts that can access the NSA Notifier feature.
 */
export const NSA_NOTIFIER_EMAILS = ['moses_lee@ecss.org.sg', 'rosalind_ong@ecss.org.sg', 'peipei_low@ecss.org.sg'];

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
 * - testingA: approval flow for all course types
 * - testingB: approval flow for NSA only
 * - mossleegermany@gmail.com: approval flow for NSA only
 *
 * @param {string} email
 * @param {string} courseType
 * @returns {boolean}
 */
export function shouldRequireApprovalForCourse(email, courseType) {
  const normalizedEmail = (email || '').toLowerCase();
  const normalizedType = (courseType || '').toString().trim().toLowerCase();

  if (!isReadOnlyUser(normalizedEmail)) return false;

  const isNsaOnlyUser = NSA_ONLY_APPROVAL_EMAILS.some((e) => e.toLowerCase() === normalizedEmail);
  if (!isNsaOnlyUser) return true;

  return normalizedType === 'nsa';
}

/**
 * Returns true if the given user is an NSA Notifier (can use NSA Notifier feature).
 * @param {string} email
 * @returns {boolean}
 */
export function isNsaNotifier(email) {
  return NSA_NOTIFIER_EMAILS.some((e) => e.toLowerCase() === (email || '').toLowerCase());
}
