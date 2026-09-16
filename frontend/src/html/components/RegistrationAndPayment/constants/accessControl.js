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

/**
 * Site in-charge accounts granted the same NSA column edit access as
 * NSA in-charge (Registration Status, Confirmation Status, Payment Status
 * (SkillsFuture), Remarks), regardless of their assigned site location.
 */
export const NSA_IN_CHARGE_EQUIVALENT_SITE_IC_EMAILS = [
  'xiuxiang_he@ecss.org.sg',
  'beebee_chua@ecss.org.sg',
  'lim_may@ecss.org.sg',
  'eileen_tay@ecss.org.sg',
  'allison_teo@ecss.org.sg',
];

/**
 * Returns true if the given email belongs to a Site in-charge user who has
 * been granted NSA in-charge-equivalent edit access for NSA courses.
 * @param {string} email
 * @returns {boolean}
 */
export function isNsaInChargeEquivalentSiteInCharge(email) {
  return NSA_IN_CHARGE_EQUIVALENT_SITE_IC_EMAILS.some((e) => e.toLowerCase() === (email || '').toLowerCase());
}

