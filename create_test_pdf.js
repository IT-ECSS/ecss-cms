const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create a PDF
const doc = new PDFDocument();
const pdfPath = path.join(__dirname, 'test_fundraising.pdf');
const stream = fs.createWriteStream(pdfPath);

doc.pipe(stream);

// Add content to PDF
doc.fontSize(25).text('Fundraising Receipt', 100, 50);
doc.fontSize(12).text('', 100, 100);
doc.text('Receipt Number: ECSS/FR/001/25', 100, 120);
doc.text('Date: ' + new Date().toLocaleDateString(), 100, 140);
doc.text('', 100, 160);
doc.text('Customer Details:', 100, 180);
doc.text('Name: John Doe', 100, 200);
doc.text('Email: john@example.com', 100, 220);
doc.text('', 100, 240);
doc.text('Items:', 100, 260);
doc.text('- Fundraising Item 1: $50.00', 100, 280);
doc.text('- Fundraising Item 2: $30.00', 100, 300);
doc.text('', 100, 320);
doc.fontSize(14).text('Total: $80.00', 100, 340);

doc.end();

stream.on('finish', () => {
  console.log('PDF created successfully at:', pdfPath);
  console.log('File size:', fs.statSync(pdfPath).size, 'bytes');
});

stream.on('error', (err) => {
  console.error('Error creating PDF:', err);
  process.exit(1);
});
