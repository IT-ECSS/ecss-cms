/**
 * Registration Status Color Mapping
 * Defines the background colors for each registration status badge
 * 
 * Color Palette Strategy:
 * - Vibrant/saturated tones for registration statuses
 * - Distinct from payment status colors
 * - Similar status names have visually different colors from payment equivalents
 */
const COLOR_GROUPS = {
  blue: ['Submitted', 'Pending'],
  green: ['Confirmed Slot', 'Confirmed'],
  red: ['Cancelled'],
  orange: ['Withdrawn'],
  purple: ['Waiting List'],
};

export const REGISTRATION_STATUS_COLORS = Object.entries(COLOR_GROUPS).reduce(
  (acc, [color, statuses]) => {
    const hex =
      color === 'blue' ? '#1976D2' :
      color === 'green' ? '#388E3C' :
      color === 'red' ? '#C62828' :
      color === 'orange' ? '#F57C00' :
      '#7B1FA2';

    statuses.forEach(status => {
      acc[status] = hex;
    });

    return acc;
  },
  {}
);