/**
 * Data query utilities for the Registration and Payment module.
 * Pure functions that transform / query raw registration data arrays.
 */

const MONTH_MAP = {
  January: 1, February: 2, March: 3, April: 4,
  May: 5, June: 6, July: 7, August: 8,
  September: 9, October: 10, November: 11, December: 12,
};

/**
 * Strips / swaps language-specific fields in-place based on the selected UI language.
 * @param {Array} array - raw registration records
 * @param {'en'|'zh'} language
 * @returns {Array} mutated array (same reference)
 */
export function languageDatabase(array, language) {
  if (!Array.isArray(array)) return [];

  for (let i = 0; i < array.length; i++) {
    const participant = array[i].participant;

    if (language === 'en') {
      participant.residentialStatus = participant.residentialStatus.split(' ')[0];
      participant.race = participant.race.split(' ')[0];

      participant.educationLevel =
        participant.educationLevel.split(' ').length === 3
          ? participant.educationLevel.split(' ').slice(0, 2).join(' ')
          : participant.educationLevel.split(' ')[0];

      participant.workStatus =
        participant.workStatus.split(' ').length === 3
          ? participant.workStatus.split(' ').slice(0, 2).join(' ')
          : participant.workStatus.split(' ')[0];

      array[i].agreement = array[i].agreement.split(' ')[0];

    } else if (language === 'zh') {
      participant.residentialStatus = participant.residentialStatus.split(' ')[1];
      participant.race = participant.race.split(' ')[1];
      participant.gender =
        participant.gender === 'M' ? '男' :
        participant.gender === 'F' ? '女' :
        participant.gender;

      participant.educationLevel =
        participant.educationLevel.split(' ').length === 3
          ? participant.educationLevel.split(' ')[2]
          : participant.educationLevel.split(' ')[1];

      participant.workStatus =
        participant.workStatus.split(' ').length === 3
          ? participant.workStatus.split(' ')[2]
          : participant.workStatus.split(' ')[1];

      array[i].course.courseEngName = array[i].course.courseChiName;
    }
  }
  return array;
}

/**
 * Returns a unique, sorted list of course locations from a dataset.
 */
export function getAllLocations(datas) {
  return [...new Set(datas.map(d => d.course.courseLocation))];
}

/**
 * Returns all unique course types. Always includes 'Others'.
 */
export function getAllTypes(datas) {
  return [...new Set(datas.map(d => d.course?.courseType).filter(Boolean))];
}

/**
 * Returns all unique English course names.
 */
export function getAllNames(datas) {
  return [...new Set(datas.map(d => d.course.courseEngName))];
}

/**
 * Returns unique quarters (e.g. "Q1 2025") sorted chronologically.
 */
export function getAllQuarters(datas) {
  const quarters = datas.map(data => {
    if (!data?.course?.courseDuration) return null;
    const firstDate = data.course.courseDuration.split(' - ')[0];
    const [, monthStr, year] = firstDate.split(' ');
    const month = MONTH_MAP[monthStr];
    if (!month || !year) return null;
    if (month <= 3)  return `Q1 ${year}`;
    if (month <= 6)  return `Q2 ${year}`;
    if (month <= 9)  return `Q3 ${year}`;
    return `Q4 ${year}`;
  });

  return [...new Set(quarters.filter(Boolean))].sort((a, b) => {
    const [qA, yearA] = a.split(' ');
    const [qB, yearB] = b.split(' ');
    return yearA - yearB || qA.localeCompare(qB);
  });
}

/**
 * Derives the quarter string for a single courseDuration value.
 * Returns null when the duration cannot be parsed.
 */
export function getQuarterFromDuration(courseDuration) {
  if (!courseDuration) return null;
  try {
    const firstDate = courseDuration.split(' - ')[0];
    const [, monthStr, year] = firstDate.split(' ');
    const month = MONTH_MAP[monthStr];
    if (!month || !year) return null;
    if (month <= 3)  return `Q1 ${year}`;
    if (month <= 6)  return `Q2 ${year}`;
    if (month <= 9)  return `Q3 ${year}`;
    return `Q4 ${year}`;
  } catch {
    return null;
  }
}

/**
 * Returns all unique registration statuses from a dataset.
 */
export function getAllRegistrationStatuses(datas) {
  return [...new Set(datas.map(d => d.registrationStatus || d.official?.registration_status).filter(Boolean))].sort();
}
