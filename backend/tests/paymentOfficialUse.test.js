const test = require('node:test');
const assert = require('node:assert/strict');
const DatabaseConnectivity = require('../database/databaseConnectivity');

test('updatePaymentOfficialUse records payment date and time for SkillsFuture invoice generation', async () => {
  const db = new DatabaseConnectivity();
  db._makeObjectId = (id) => id;
  let updatePayload;

  const collection = {
    findOne: async () => ({
      _id: 'registration-123',
      status: 'Pending',
      finalPaymentMethod: 'SkillsFuture',
      registrationStatus: ''
    }),
    updateOne: async (_filter, update) => {
      updatePayload = update;
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    },
  };

  db.client = {
    db: () => ({
      collection: () => collection,
    }),
  };

  const result = await db.updatePaymentOfficialUse(
    'Company-Management-System',
    'registration-123',
    'Alice Tan',
    '26/06/2026',
    '16:30',
    'Generating SkillsFuture Invoice'
  );

  assert.equal(result.acknowledged, true);
  assert.equal(updatePayload.$set.status, 'Generating SkillsFuture Invoice');
  assert.equal(updatePayload.$set['official.name'], 'Alice Tan');
  assert.equal(updatePayload.$set['official.date'], '26/06/2026');
  assert.equal(updatePayload.$set['official.time'], '16:30');
});

test('updatePaymentOfficialUse clears the system-generated registration status when payment status becomes Refunded', async () => {
  const db = new DatabaseConnectivity();
  db._makeObjectId = (id) => id;
  let updatePayload;

  const collection = {
    findOne: async () => ({
      _id: 'registration-123',
      status: 'Paid',
      finalPaymentMethod: 'PayNow',
      registrationStatus: 'Withdrawn',
      official: {
        registration_status_system: 'Confirmed Slot'
      }
    }),
    updateOne: async (_filter, update) => {
      updatePayload = update;
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    },
  };

  db.client = {
    db: () => ({
      collection: () => collection,
    }),
  };

  const result = await db.updatePaymentOfficialUse(
    'Company-Management-System',
    'registration-123',
    'Alice Tan',
    '26/06/2026',
    '16:30',
    'Refunded'
  );

  assert.equal(result.acknowledged, true);
  assert.equal(updatePayload.$set.status, 'Refunded');
  assert.equal(updatePayload.$set['official.name'], 'Alice Tan');
  assert.equal(updatePayload.$set['official.refundedDate'], '26/06/2026');
  assert.equal(updatePayload.$set['official.refundedTime'], '16:30');
  assert.equal(updatePayload.$set['official.registration_status_system'], '');
});
