/**
 * Registration Status Color Mapping
 * Defines the background colors for each registration status badge
 * 
 * Color Palette Strategy:
 * - Vibrant/saturated tones for registration statuses
 * - Distinct from payment status colors
 * - Similar status names have visually different colors from payment equivalents
 */
export const REGISTRATION_STATUS_COLORS = {
  // ── NSA Course Registration Statuses ──────────────────────────────────
  Submitted: '#1976D2',           // Bright blue (initial submission)
  'Confirmed Slot': '#388E3C',    // Bright green (slot confirmed/accepted)
  Cancelled: '#C62828',           // Deep red (cancelled by participant)
  Withdrawn: '#F57C00',           // Bright orange (participant withdrawn)
  'Waiting List': '#7B1FA2',      // Deep purple (on waiting list)
};
