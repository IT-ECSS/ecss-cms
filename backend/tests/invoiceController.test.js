const test = require('node:test');
const assert = require('node:assert/strict');
const InvoiceController = require('../Controller/Invoice/InvoiceController');

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
