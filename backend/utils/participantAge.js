const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function validDateParts(year, month, day) {
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function parseDateParts(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth(),
      day: value.getDate(),
    };
  }

  const text = String(value ?? '').trim();
  let match = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (match) {
    return validDateParts(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  match = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (match) {
    return validDateParts(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  match = text.match(/\b(\d{1,2})[\s-]+([A-Za-z]+)[\s-]+(\d{4})\b/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    return month === undefined
      ? null
      : validDateParts(Number(match[3]), month, Number(match[1]));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth(),
    day: parsed.getDate(),
  };
}

function getParticipantAgeAtCourseStart(dateOfBirth, courseDuration) {
  const birthDate = parseDateParts(dateOfBirth);
  if (!birthDate) return null;

  const courseStartDate = parseDateParts(courseDuration) || parseDateParts(new Date());
  let age = courseStartDate.year - birthDate.year;
  if (
    courseStartDate.month < birthDate.month ||
    (courseStartDate.month === birthDate.month && courseStartDate.day < birthDate.day)
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

module.exports = { getParticipantAgeAtCourseStart };