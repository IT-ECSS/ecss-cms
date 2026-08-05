/**
 * Date utility functions for Registration and Payment module.
 * All functions are pure (no side effects, no React dependencies).
 */

export function convertToChineseDate(dateStr) {
  const monthMap = {
    January: 1, February: 2, March: 3, April: 4,
    May: 5, June: 6, July: 7, August: 8,
    September: 9, October: 10, November: 11, December: 12,
  };
  const [day, month, year] = dateStr.split(' ');
  const monthNumber = monthMap[month];
  return `${year}年${monthNumber}月${parseInt(day)}日`;
}

/**
 * Converts "1 January 2025" → "01/01/2025"
 */
export function convertDateFormat1(dateString) {
  const months = {
    January: '01', February: '02', Feburary: '02', March: '03', April: '04',
    May: '05', June: '06', July: '07', August: '08', September: '09',
    October: '10', November: '11', December: '12',
  };
  const regex = /^(\d{1,2})\s([A-Za-z]+)\s(\d{4})$/;
  const match = dateString.trim().match(regex);
  if (!match) {
    console.error('Invalid date format:', dateString);
    return 'Invalid date format';
  }
  const [, day, month, year] = match;
  const monthNumber = months[month];
  if (!monthNumber) {
    console.error('Invalid month name:', month);
    return 'Invalid date format';
  }
  return `${day.padStart(2, '0')}/${monthNumber}/${year}`;
}

/**
 * Converts ISO/JS date string → "DD/MM/YYYY"
 */
export function convertDateFormat(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converts ISO/JS date string → "DDMMYYYY" (no separators)
 */
export function convertDateFormat3(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Converts "DD/MM/YYYY" → "YYYY-MM-DD"
 */
export function convertDateToYYYYMMDD(dateString) {
  if (!dateString) return '';
  try {
    const [day, month, year] = dateString.split('/');
    if (!day || !month || !year) return dateString;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting date format:', error);
    return dateString;
  }
}

/**
 * Returns current date as "DDMMYY" string (used in export file names).
 */
export function getCurrentDateTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(2);
  return `${day}${month}${year}`;
}

/**
 * Formats a Date object → "DD/MM/YYYY"
 */
export function formatDateToDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a Date object → "DDMMYYYY" (no separators, for file names)
 */
export function formatDateToDDMMYYYY1(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Formats a Date object → "DD Mon YYYY" (e.g. "04 May 2026")
 */
export function formatDateToDDMMYYYY2(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Calculates current age (in years) from a date of birth string.
 * Accepts "DD/MM/YYYY" (participant DOB format) or any ISO/JS-parseable date string.
 * Returns null if the date of birth is missing/invalid.
 */
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  let birthDate;
  const ddmmyyyyMatch = String(dateOfBirth).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    birthDate = new Date(Number(year), Number(month) - 1, Number(day));
  } else {
    birthDate = new Date(dateOfBirth);
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  return age >= 0 ? age : null;
}
