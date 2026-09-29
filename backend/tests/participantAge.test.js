const test = require('node:test');
const assert = require('node:assert/strict');
const { getParticipantAgeAtCourseStart } = require('../utils/participantAge');

test('calculates NSA eligibility age on the course start date', () => {
  assert.equal(
    getParticipantAgeAtCourseStart('15/10/1976', '6 November 2026 - 6 November 2026'),
    50
  );
  assert.equal(
    getParticipantAgeAtCourseStart('15/12/1976', '6 November 2026 - 6 November 2026'),
    49
  );
});

test('accepts ISO DOBs and returns null for invalid DOBs', () => {
  assert.equal(
    getParticipantAgeAtCourseStart('1976-10-15', '2026-11-06 - 2026-11-06'),
    50
  );
  assert.equal(
    getParticipantAgeAtCourseStart('not-a-date', '6 November 2026 - 6 November 2026'),
    null
  );
});