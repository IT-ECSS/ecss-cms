const test = require('node:test');
const assert = require('node:assert/strict');
const { generateReceiptNumber } = require('../numbering/receiptNumber');
const { generateInvoiceNumber } = require('../numbering/invoiceNumber');

test('generateReceiptNumber uses the ECSS item-code format', async () => {
  const result = await generateReceiptNumber({
    course: { courseEngName: 'Sample Course', itemCode: 'TGS-001', courseLocation: 'Tampines 253 Centre' },
    paymentMethod: 'PayNow',
    existingReceipts: [{ receiptNo: 'ECSS-TGS-001-00001-26' }],
    currentYear: 26,
    fullYear: 2026
  });

  assert.equal(result, 'ECSS-TGS-001-00002-26');
});

test('generateInvoiceNumber uses the ECSS item-code format', async () => {
  const result = await generateInvoiceNumber({
    existingInvoices: [{ invoiceNumber: 'ECSS-TGS-001-00001-26' }],
    year: '26',
    itemCode: 'TGS-001',
    course: { courseEngName: 'Sample Course' }
  });

  assert.equal(result, 'ECSS-TGS-001-00002-26');
});
