const test = require('node:test');
const assert = require('node:assert/strict');
const { generateReceiptNumber } = require('../numbering/receiptNumber');
const { generateInvoiceNumber } = require('../numbering/invoiceNumber');

test('generateReceiptNumber uses the new ECSS receipt format with a dedicated receipt series', async () => {
  const result = await generateReceiptNumber({
    course: { courseEngName: 'Sample Course', courseLocation: 'Pasir Ris West Wellness Centre', itemCode: 'SFC' },
    paymentMethod: 'Card',
    existingReceipts: [{ receiptNo: 'ECSS-PRW-SFC-00004-26' }],
    currentYear: 26,
    fullYear: 2026
  });

  assert.equal(result, 'ECSS-PRW-SFC-00005-26');
});

test('generateInvoiceNumber uses the new ECSS invoice format with a dedicated invoice series', async () => {
  const result = await generateInvoiceNumber({
    existingInvoices: [{ invoiceNo: 'ECSS-CTH-SFC-00006-26' }],
    year: '2026',
    itemCode: 'SFC',
    course: { courseEngName: 'Sample Course', courseLocation: 'CT Hub' }
  });

  assert.equal(result, 'ECSS-CTH-SFC-00007-26');
});

test('generateReceiptNumber uses the spreadsheet-style item category field when present', async () => {
  const result = await generateReceiptNumber({
    course: {
      courseEngName: 'Miscellaneous Sale',
      courseLocation: 'Pasir Ris West Wellness Centre',
      itemCategoryForMosesUses: 'Miscellaneous'
    },
    paymentMethod: 'Card',
    existingReceipts: [],
    currentYear: 26,
    fullYear: 2026
  });

  assert.equal(result, 'ECSS-PRW-MSC-00001-26');
});

test('generateReceiptNumber derives the item code from course type and product category', async () => {
  const result = await generateReceiptNumber({
    course: {
      courseEngName: 'Fitness Class',
      courseLocation: 'CT Hub',
      courseType: 'Fitness',
      productCategory: 'Wellness'
    },
    paymentMethod: 'Card',
    existingReceipts: [],
    currentYear: 26,
    fullYear: 2026
  });

  assert.equal(result, 'ECSS-CTH-FIT-00001-26');
});

test('generateReceiptNumber maps spreadsheet category values to the correct item code', async () => {
  const result = await generateReceiptNumber({
    course: {
      courseEngName: '',
      courseLocation: 'Pasir Ris West Wellness Centre',
      itemCategoryForMosesUses: 'Fitness'
    },
    paymentMethod: 'Card',
    existingReceipts: [],
    currentYear: 26,
    fullYear: 2026
  });

  assert.equal(result, 'ECSS-PRW-FIT-00001-26');
});

test('generateInvoiceNumber maps the NSA category to SFC for invoices (SkillsFuture claims)', async () => {
  const result = await generateInvoiceNumber({
    existingInvoices: [],
    year: '2026',
    course: {
      courseEngName: 'Sample Course',
      courseLocation: 'Pasir Ris West Wellness Centre',
      itemCategoryForMosesUses: 'NSA'
    }
  });

  assert.equal(result, 'ECSS-PRW-SFC-00001-26');
});

test('generateReceiptNumber maps cash and paynow payment methods to NSA', async () => {
  const result = await generateReceiptNumber({
    course: {
      courseEngName: 'Sample Course',
      courseLocation: 'Pasir Ris West Wellness Centre',
      itemCategoryForMosesUses: 'Fitness'
    },
    paymentMethod: 'PayNow',
    existingReceipts: [],
    currentYear: 26,
    fullYear: 2026
  });

  assert.equal(result, 'ECSS-PRW-NSA-00001-26');
});

test('generateReceiptNumber maps the NSA category to NSA for receipts', async () => {
  const result = await generateReceiptNumber({
    course: {
      courseEngName: 'Sample Course',
      courseLocation: 'Pasir Ris West Wellness Centre',
      itemCategoryForMosesUses: 'NSA'
    },
    paymentMethod: 'Card',
    existingReceipts: [],
    currentYear: 26,
    fullYear: 2026
  });

  assert.equal(result, 'ECSS-PRW-NSA-00001-26');
});

test('generateReceiptNumber keeps the same serial series across years and beyond 99999', async () => {
  const result = await generateReceiptNumber({
    course: {
      courseEngName: 'Sample Course',
      courseLocation: 'Pasir Ris West Wellness Centre',
      itemCode: 'FIT'
    },
    paymentMethod: 'Card',
    existingReceipts: [{ receiptNo: 'ECSS-PRW-FIT-00099-25' }, { receiptNo: 'ECSS-PRW-FIT-99999-26' }],
    currentYear: 26,
    fullYear: 2026
  });

  assert.equal(result, 'ECSS-PRW-FIT-100000-26');
});

test('generateInvoiceNumber keeps the same serial series across years and beyond 99999', async () => {
  const result = await generateInvoiceNumber({
    existingInvoices: [{ invoiceNo: 'ECSS-CTH-SFC-00099-25' }, { invoiceNo: 'ECSS-CTH-SFC-99999-26' }],
    year: '2026',
    itemCode: 'SFC',
    course: { courseEngName: 'Sample Course', courseLocation: 'CT Hub' }
  });

  assert.equal(result, 'ECSS-CTH-SFC-100000-26');
});
