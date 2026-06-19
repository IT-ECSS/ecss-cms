/**
 * Payment Status Color Mapping
 * Defines the background colors for each payment status badge
 * 
 * Color Palette Strategy:
 * - Earthy/muted tones for payment statuses
 * - Distinct from registration status colors
 */
export const PAYMENT_STATUS_COLORS = {
  // ── Cash/PayNow Payment Statuses ──────────────────────────────────────
  Paid: '#00796B',                              // Teal-green (success - money received)
  Pending: '#B26A00',                           // Orange-brown (waiting for payment)
  Refunded: '#AD3F00',                          // Orange-red (money returned)
  'To refund': '#8D4F12',                       // Dark brown (pending refund)

  // ── SkillsFuture Payment Statuses ────────────────────────────────────
  'Generating SkillsFuture Invoice': '#006D77', // Teal (processing SF invoice)
  'SkillsFuture Done': '#2E7D32',               // Green (SF processing complete)
  'Participant Withdrawn': '#7B1FA2',          // Deep purple (participant withdrew)
  'SkillsFuture Unsuccessful': '#D32F2F',       // Red (SF processing failed)

  // ── Legacy/Other Statuses ────────────────────────────────────────────
  'Not Successful': '#5D4037',                  // Brown (legacy)
  Confirmed: '#1565C0',                         // Dark blue (legacy)
};
