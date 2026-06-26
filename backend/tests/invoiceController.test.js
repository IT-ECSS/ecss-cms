const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const InvoiceController = require('../Controller/Invoice/InvoiceController');
const DatabaseConnectivity = require('../database/databaseConnectivity');

test('createInvoice stores invoice documents in the Invoices collection', async () => {
  const controller = new InvoiceController();
  const insertCalls = [];

  controller.databaseConnectivity = {
    ensureConnection: async () => {},
    insertToDatabase: async (databaseName, collectionName, details) => {
      insertCalls.push({ databaseName, collectionName, details });
      return { acknowledged: true };
    },
  };

  const result = await controller.createInvoice(
    'ECSS/SFC/001/26',
    'registration-123',
    '/documents/invoice.pdf',
    'Alice Tan',
    '01/01/2026',
    '12:00',
    'Tampines 253 Centre',
    'Paid'
  );

  assert.equal(result.success, true);
  assert.equal(insertCalls.length, 1);
  assert.equal(insertCalls[0].databaseName, 'Company-Management-System');
  assert.equal(insertCalls[0].collectionName, 'Invoices');
  assert.equal(insertCalls[0].details.invoiceNo, 'ECSS/SFC/001/26');
  assert.equal(insertCalls[0].details.registration_id, 'registration-123');
  assert.equal(insertCalls[0].details.location, 'Tampines 253 Centre');
  assert.equal(insertCalls[0].details.status, 'Paid');
});

test('insertToDatabase skips duplicate invoice records when registration_id is stored as an ObjectId', async () => {
  const db = new DatabaseConnectivity();
  const insertCalls = [];
  const collection = {
    findOne: async () => ({ _id: new ObjectId() }),
    insertOne: async (data) => {
      insertCalls.push(data);
      return { acknowledged: true, insertedId: new ObjectId() };
    },
  };

  db.client = { db: () => ({ collection: () => collection }) };
  db.isConnected = true;

  const result = await db.insertToDatabase('Company-Management-System', 'Invoices', {
    invoiceNo: 'ECSS-PRW-SFC-00001-26',
    registration_id: '672d6e68b0a9b2d757d09844',
    staff: 'Alice Tan',
    location: 'Tampines 253 Centre',
  });

  assert.equal(result.skipped, true);
  assert.equal(insertCalls.length, 0);
});
