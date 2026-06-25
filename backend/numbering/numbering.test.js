const assert = require('assert');
const test = require('node:test');
const { generateInventoryReceiptNumber, generateFundraisingReceiptNumber } = require('./receiptNumber');

test('inventory receipt number starts at the existing ECSS/SKU/0001 format', () => {
  const result = generateInventoryReceiptNumber({ sku: 'SKU01', existingRecords: [] });
  assert.strictEqual(result, 'ECSS/SKU01/0001');
});

test('inventory receipt number increments from the highest existing suffix', () => {
  const result = generateInventoryReceiptNumber({
    sku: 'SKU01',
    existingRecords: [{ receiptNumber: 'ECSS/SKU01/0003' }, { receiptNumber: 'ECSS/SKU01/0010' }],
  });
  assert.strictEqual(result, 'ECSS/SKU01/0011');
});

test('fundraising receipt number uses the FR format by default', () => {
  const result = generateFundraisingReceiptNumber({ items: [{ productName: 'Donation' }], existingReceipts: [], currentYear: '26' });
  assert.strictEqual(result, 'ECSS/FR/001/26');
});

test('fundraising receipt number uses the Panettone format when all items match', () => {
  const result = generateFundraisingReceiptNumber({ items: [{ productName: 'Panettone' }, { productName: 'Panettone' }], existingReceipts: [], currentYear: '26' });
  assert.strictEqual(result, 'ECSS/Panettone/001/26');
});
