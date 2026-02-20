/**
 * FFT Scoring Helper — Female & Male Rating Tables
 *
 * Lookup tables for 7 fitness stations based on the participant's gender and age group.
 * Given a station key, gender, participant age, and score, returns a rating:
 *   'Very weak' | 'Weak' | 'Normal' | 'Good' | 'Very good'
 *
 * Age groups: 65–69, 70–74, 75–79, 80–84, 85–89, 90+
 *
 * Source: ECSS FFT reference scoring chart.
 */

// ─── Threshold format ───────────────────────────────────────────────────
//
// Each age group has 4 named thresholds that define the boundaries between
// 5 rating levels. No arrays, no nulls.
//
//   { veryWeak: A, weak: B, normal: C, good: D }
//
// For HIGHER-IS-BETTER stations (sitStand, armCurl, march, sitReach, backStretch, gripTest):
//   score < veryWeak  → "Very weak"
//   score >= veryWeak  → "Weak"
//   score >= weak      → "Normal"
//   score >= normal    → "Good"
//   score > good       → "Very good"
//
// For LOWER-IS-BETTER stations (speedWalk):
//   score > veryWeak  → "Very weak"
//   score <= veryWeak  → "Weak"
//   score < weak       → "Normal"
//   score < normal     → "Good"
//   score < good       → "Very good"

// ─── Station direction ──────────────────────────────────────────────────

const STATION_DIRECTION = {
  sitStand:    'higher',
  armCurl:     'higher',
  march:       'higher',
  sitReach:    'higher',
  backStretch: 'higher',
  speedWalk:   'lower',
  gripTest:    'higher',
};

// ─── Female scoring tables ──────────────────────────────────────────────

const FEMALE_SCORING = {

  // ── Station 1: 30-Sec Sit and Stand (higher is better) ──
  sitStand: {
    '65-69': { veryWeak: 13, weak: 15, normal: 17, good: 18 },
    '70-74': { veryWeak: 12, weak: 14, normal: 16, good: 17 },
    '75-79': { veryWeak: 11, weak: 13, normal: 15, good: 16 },
    '80-84': { veryWeak: 10, weak: 12, normal: 14, good: 15 },
    '85-89': { veryWeak: 8,  weak: 10, normal: 12, good: 13 },
    '90+':   { veryWeak: 8,  weak: 9,  normal: 11, good: 12 },
  },

  // ── Station 2: 30-Sec Arm Curl (higher is better) ──
  armCurl: {
    '65-69': { veryWeak: 16, weak: 19, normal: 21, good: 22 },
    '70-74': { veryWeak: 15, weak: 18, normal: 20, good: 21 },
    '75-79': { veryWeak: 15, weak: 17, normal: 19, good: 20 },
    '80-84': { veryWeak: 13, weak: 16, normal: 18, good: 19 },
    '85-89': { veryWeak: 13, weak: 15, normal: 17, good: 18 },
    '90+':   { veryWeak: 10, weak: 14, normal: 16, good: 17 },
  },

  // ── Station 3: 2-Min On-the-spot Marching (higher is better) ──
  march: {
    '65-69': { veryWeak: 76,  weak: 86,  normal: 96,  good: 105 },
    '70-74': { veryWeak: 69,  weak: 80,  normal: 91,  good: 101 },
    '75-79': { veryWeak: 62,  weak: 74,  normal: 86,  good: 97 },
    '80-84': { veryWeak: 51,  weak: 65,  normal: 79,  good: 92 },
    '85-89': { veryWeak: 42,  weak: 58,  normal: 74,  good: 90 },
    '90+':   { veryWeak: 31,  weak: 48,  normal: 65,  good: 82 },
  },

  // ── Station 4: Sit & Reach (higher is better, can be negative) ──
  sitReach: {
    '65-69': { veryWeak: 0,    weak: 4,  normal: 9,  good: 13 },
    '70-74': { veryWeak: 0,    weak: 3,  normal: 8,  good: 12 },
    '75-79': { veryWeak: 0,    weak: 3,  normal: 7,  good: 10 },
    '80-84': { veryWeak: 0,    weak: 2,  normal: 5,  good: 8 },
    '85-89': { veryWeak: -1.5, weak: 1,  normal: 4,  good: 6 },
    '90+':   { veryWeak: -1.8, weak: -1, normal: 2,  good: 4 },
  },

  // ── Station 5: Back Stretching Test (higher is better, often negative) ──
  backStretch: {
    '65-69': { veryWeak: -8,  weak: -4,    normal: 0,    good: 3 },
    '70-74': { veryWeak: -11, weak: -6,    normal: -1,   good: 3 },
    '75-79': { veryWeak: -15, weak: -11,   normal: -4,   good: 2 },
    '80-84': { veryWeak: -17, weak: -11,   normal: -5,   good: 1 },
    '85-89': { veryWeak: -20, weak: -13.3, normal: -6.2, good: 0.8 },
    '90+':   { veryWeak: -20, weak: -15,   normal: -7,   good: 0 },
  },

  // ── Station 6: 2.44m Speed Walk (lower is better — time in seconds) ──
  speedWalk: {
    '65-69': { veryWeak: 7.7,  weak: 7.0,  normal: 6.4,  good: 5.7 },
    '70-74': { veryWeak: 8.7,  weak: 7.9,  normal: 6.9,  good: 6 },
    '75-79': { veryWeak: 10,   weak: 9.1,  normal: 7.9,  good: 6.8 },
    '80-84': { veryWeak: 11.1, weak: 10.1, normal: 8.8,  good: 7.6 },
    '85-89': { veryWeak: 12.5, weak: 11.1, normal: 9.6,  good: 8.2 },
    '90+':   { veryWeak: 14.6, weak: 12.7, normal: 10.8, good: 9 },
  },

  // ── Station 7: Grip Test (higher is better, decimals) ──
  gripTest: {
    '65-69': { veryWeak: 18.1, weak: 22.6, normal: 27.3, good: 31.9 },
    '70-74': { veryWeak: 17.7, weak: 22.2, normal: 26.9, good: 31.5 },
    '75-79': { veryWeak: 17.2, weak: 21.7, normal: 26.4, good: 31 },
    '80-84': { veryWeak: 15.4, weak: 19.1, normal: 23.2, good: 27.2 },
    '85-89': { veryWeak: 14.7, weak: 17.4, normal: 21.5, good: 24.5 },
    '90+':   { veryWeak: 14.7, weak: 17.4, normal: 21.5, good: 24.5 },
  },
};

// ─── Male scoring tables ────────────────────────────────────────────────

const MALE_SCORING = {

  // ── Station 1: 30-Sec Sit and Stand (higher is better) ──
  sitStand: {
    '65-69': { veryWeak: 16, weak: 18, normal: 20, good: 21 },
    '70-74': { veryWeak: 13, weak: 15, normal: 17, good: 18 },
    '75-79': { veryWeak: 11, weak: 13, normal: 15, good: 16 },
    '80-84': { veryWeak: 10, weak: 12, normal: 14, good: 15 },
    '85-89': { veryWeak: 10, weak: 12, normal: 14, good: 15 },
    '90+':   { veryWeak: 9,  weak: 11, normal: 13, good: 14 },
  },

  // ── Station 2: 30-Sec Arm Curl (higher is better) ──
  armCurl: {
    '65-69': { veryWeak: 17, weak: 20, normal: 23, good: 25 },
    '70-74': { veryWeak: 16, weak: 19, normal: 22, good: 24 },
    '75-79': { veryWeak: 15, weak: 17, normal: 20, good: 22 },
    '80-84': { veryWeak: 14, weak: 16, normal: 19, good: 20 },
    '85-89': { veryWeak: 12, weak: 15, normal: 18, good: 19 },
    '90+':   { veryWeak: 11, weak: 14, normal: 16, good: 17 },
  },

  // ── Station 3: 2-Min On-the-spot Marching (higher is better) ──
  march: {
    '65-69': { veryWeak: 82,  weak: 92,  normal: 102, good: 109 },
    '70-74': { veryWeak: 76,  weak: 86,  normal: 96,  good: 104 },
    '75-79': { veryWeak: 67,  weak: 78,  normal: 89,  good: 99 },
    '80-84': { veryWeak: 59,  weak: 72,  normal: 85,  good: 97 },
    '85-89': { veryWeak: 54,  weak: 68,  normal: 82,  good: 94 },
    '90+':   { veryWeak: 47,  weak: 63,  normal: 79,  good: 93 },
  },

  // ── Station 4: Sit & Reach (higher is better, can be negative) ──
  sitReach: {
    '65-69': { veryWeak: -3,   weak: 1,  normal: 4,  good: 8 },
    '70-74': { veryWeak: -4,   weak: 1,  normal: 5,  good: 9 },
    '75-79': { veryWeak: -5,   weak: 1,  normal: 4,  good: 7 },
    '80-84': { veryWeak: -8.5, weak: -4, normal: 0,  good: 5 },
    '85-89': { veryWeak: -10,  weak: -6, normal: 0,  good: 3 },
    '90+':   { veryWeak: -12,  weak: -6, normal: -1, good: 2 },
  },

  // ── Station 5: Back Stretching Test (higher is better, often negative) ──
  backStretch: {
    '65-69': { veryWeak: -18,   weak: -12,   normal: -7,    good: 1 },
    '70-74': { veryWeak: -20,   weak: -13,   normal: -6,    good: 0 },
    '75-79': { veryWeak: -23,   weak: -15,   normal: -7,    good: 0 },
    '80-84': { veryWeak: -25,   weak: -17,   normal: -10,   good: -4 },
    '85-89': { veryWeak: -26,   weak: -18,   normal: -11,   good: -4 },
    '90+':   { veryWeak: -26.5, weak: -19.4, normal: -12.3, good: -7 },
  },

  // ── Station 6: 2.44m Speed Walk (lower is better — time in seconds) ──
  speedWalk: {
    '65-69': { veryWeak: 7.2,  weak: 6.5,   normal: 5.8,   good: 5.2 },
    '70-74': { veryWeak: 8,    weak: 7.23,  normal: 6.46,  good: 5.7 },
    '75-79': { veryWeak: 9,    weak: 8.06,  normal: 7.12,  good: 6.2 },
    '80-84': { veryWeak: 10.4, weak: 9.23,  normal: 8.06,  good: 6.9 },
    '85-89': { veryWeak: 11.6, weak: 10.26, normal: 9.12,  good: 7.6 },
    '90+':   { veryWeak: 14,   weak: 12.26, normal: 10.52, good: 8.8 },
  },

  // ── Station 7: Grip Test (higher is better, decimals) ──
  gripTest: {
    '65-69': { veryWeak: 30.7, weak: 36.7, normal: 42.7, good: 48.5 },
    '70-74': { veryWeak: 30.2, weak: 36.2, normal: 43,   good: 48 },
    '75-79': { veryWeak: 28.2, weak: 33.5, normal: 38.8, good: 44 },
    '80-84': { veryWeak: 21.3, weak: 26,   normal: 30.7, good: 35.1 },
    '85-89': { veryWeak: 21.3, weak: 26,   normal: 30.7, good: 35.1 },
    '90+':   { veryWeak: 21.3, weak: 26,   normal: 30.7, good: 35.1 },
  },
};

// ─── Rating levels & display colours ────────────────────────────────────

const RATINGS = ['Very weak', 'Weak', 'Normal', 'Good', 'Very good'];

const RATING_COLORS = {
  'Very weak': { bg: '#fecaca', text: '#991b1b', border: '#f87171' },   // red
  'Weak':      { bg: '#fed7aa', text: '#9a3412', border: '#fb923c' },   // orange
  'Normal':    { bg: '#fef08a', text: '#854d0e', border: '#facc15' },   // yellow
  'Good':      { bg: '#bbf7d0', text: '#166534', border: '#4ade80' },   // green
  'Very good': { bg: '#86efac', text: '#14532d', border: '#22c55e' },   // dark green
};

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Determine the age group key from a numeric age.
 * @param {number} age
 * @returns {string|null} e.g. '65-69', '90+', or null if below 65
 */
function getAgeGroup(age) {
  const a = Number(age);
  if (isNaN(a) || a < 65) return null;
  if (a <= 69) return '65-69';
  if (a <= 74) return '70-74';
  if (a <= 79) return '75-79';
  if (a <= 84) return '80-84';
  if (a <= 89) return '85-89';
  return '90+';
}

/**
 * Parse a score string into a numeric value.
 * Handles combined L/R scores like "5 / 3" by summing them.
 * @param {string|number} raw
 * @returns {number|null}
 */
function parseScore(raw) {
  if (raw == null || raw === '') return null;
  const str = String(raw).trim();

  // Handle "L / R" combined scores (e.g. "5 / 3") → sum
  if (/\//.test(str)) {
    const parts = str.split('/').map(p => parseFloat(p.trim()));
    if (parts.some(isNaN)) return null;
    return parts.reduce((a, b) => a + b, 0);
  }

  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

// ─── Main lookup function ───────────────────────────────────────────────

/**
 * Get the fitness rating for a given station, age, and score.
 *
 * Each station has 4 thresholds: { veryWeak, weak, normal, good }.
 *
 * Higher-is-better:  < veryWeak → Very weak | >= veryWeak → Weak |
 *                    >= weak → Normal | >= normal → Good | > good → Very good
 *
 * Lower-is-better:   > veryWeak → Very weak | <= veryWeak → Weak |
 *                    < weak → Normal | < normal → Good | < good → Very good
 *
 * @param {string} station   – One of: sitStand, armCurl, march, sitReach, backStretch, speedWalk, gripTest
 * @param {number} age       – Participant's age (≥ 65)
 * @param {string|number} rawScore – The score value (can be a string like "5 / 3")
 * @param {string} [gender='female'] – 'male' or 'female'
 * @returns {{ rating: string, color: object } | null}
 */
export function getRating(station, age, rawScore, gender = 'female') {
  const table = (gender && gender.toLowerCase() === 'male') ? MALE_SCORING : FEMALE_SCORING;
  const stationData = table[station];
  if (!stationData) return null;

  const ageGroup = getAgeGroup(age);
  if (!ageGroup) return null;

  const t = stationData[ageGroup]; // { veryWeak, weak, normal, good }
  if (!t) return null;

  const score = parseScore(rawScore);
  if (score == null) return null;

  const direction = STATION_DIRECTION[station] || 'higher';
  let rating;

  if (direction === 'higher') {
    // Higher score = better
    if (score > t.good)        rating = 'Very good';
    else if (score >= t.normal) rating = 'Good';
    else if (score >= t.weak)   rating = 'Normal';
    else if (score >= t.veryWeak) rating = 'Weak';
    else                         rating = 'Very weak';
  } else {
    // Lower score = better (speedWalk)
    if (score < t.good)        rating = 'Very good';
    else if (score < t.normal) rating = 'Good';
    else if (score < t.weak)   rating = 'Normal';
    else if (score <= t.veryWeak) rating = 'Weak';
    else                         rating = 'Very weak';
  }

  return { rating, color: RATING_COLORS[rating] };
}

/**
 * Convenience: get just the rating string.
 */
export function getRatingLabel(station, age, rawScore, gender = 'female') {
  const result = getRating(station, age, rawScore, gender);
  return result ? result.rating : null;
}

/**
 * Get the colour object for a rating string.
 */
export function getRatingColor(ratingLabel) {
  return RATING_COLORS[ratingLabel] || null;
}

/**
 * Get the threshold info for a given station, age, and gender.
 * Returns the thresholds object and a human-readable range label.
 *
 * @param {string} station
 * @param {number} age
 * @param {string} [gender='female']
 * @returns {{ ageGroup: string, thresholds: object, rangeLabel: string } | null}
 */
export function getStationRange(station, age, gender = 'female') {
  const table = (gender && gender.toLowerCase() === 'male') ? MALE_SCORING : FEMALE_SCORING;
  const stationData = table[station];
  if (!stationData) return null;

  const ageGroup = getAgeGroup(age);
  if (!ageGroup) return null;

  const t = stationData[ageGroup];
  if (!t) return null;

  const direction = STATION_DIRECTION[station] || 'higher';

  // Show the range spanning Weak → Good boundaries
  let rangeLabel;
  if (direction === 'higher') {
    rangeLabel = `${t.veryWeak} – ${t.good}`;
  } else {
    // For lower-is-better, show ascending: good (best) → veryWeak (worst)
    rangeLabel = `${t.good} – ${t.veryWeak}`;
  }

  return { ageGroup, thresholds: t, rangeLabel };
}

export { FEMALE_SCORING, MALE_SCORING, RATINGS, RATING_COLORS, STATION_DIRECTION, getAgeGroup, parseScore };
