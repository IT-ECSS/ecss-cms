const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRegistrationPayload } = require('../routes/courseregistration');

function getCurrentDateTime() {
  const now = new Date();
  const singaporeOffset = 8 * 60;
  const localOffset = now.getTimezoneOffset();
  const adjustedTime = new Date(now.getTime() + (singaporeOffset - localOffset) * 60000);
  const day = String(adjustedTime.getDate()).padStart(2, '0');
  const month = String(adjustedTime.getMonth() + 1).padStart(2, '0');
  const year = adjustedTime.getFullYear();
  return `${day}/${month}/${year}`;
}

test('buildRegistrationPayload preserves full form values and initializes official fields', () => {
  const payload = buildRegistrationPayload({
    participantDetails: {
      participant: { name: 'Jane Doe', nric: 'S1234567A' },
      course: { courseEngName: 'Test Course', payment: 'PayNow' },
      agreement: 'Yes',
      status: 'Pending'
    },
    formData: {
      type: 'NSA',
      englishName: 'Test Course',
      chineseName: '测试课程',
      location: 'Tampines',
      price: '100',
      courseDuration: '2 days',
      courseMode: 'Online',
      courseTime: '9am',
      payment: 'PayNow',
      customField: 'keep-me'
    }
  }, getCurrentDateTime());

  assert.equal(payload.participant.name, 'Jane Doe');
  assert.equal(payload.course.courseEngName, 'Test Course');
  assert.equal(payload.course.payment, 'PayNow');
  assert.equal(payload.agreement, 'Yes');
  assert.equal(payload.status, 'Pending');
  assert.equal(payload.registrationDate, getCurrentDateTime());
  assert.deepEqual(payload.official, {
    name: '',
    date: '',
    time: '',
    receiptNo: '',
    remarks: '',
    registration_status: 'Submitted'
  });
  assert.equal(payload.formData.customField, 'keep-me');
  assert.equal(payload.formData.type, 'NSA');
});
