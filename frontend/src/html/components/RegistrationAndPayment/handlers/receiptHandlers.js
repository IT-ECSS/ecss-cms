/**
 * Receipt and invoice generation handlers for the Registration & Payment module.
 *
 * All functions receive a `context` object:
 *
 *   context = {
 *     userName,            // string
 *     createReceiptInDb,   // fn(receiptNo, location, registrationId, url)
 *   }
 *
 * API calls (addReceiptNumber, addInvoiceNumber, etc.) are imported directly
 * from the service layer so this file has no dependency on the class component.
 */

import {
  addReceiptNumber,
  addInvoiceNumber,
  generateReceiptPDF,
  getReceiptNumber,
  createReceiptRecord,
} from '../services/registrationApi';

import { logReceiptGeneration } from '../../../../utils/auditLog';

// ─── receipt number ───────────────────────────────────────────────────────────

/**
 * Fetches the next receipt/invoice number from the server.
 *
 * @param {object} course        - courseInfo object from row data (contains courseType, courseEngName, etc.)
 * @param {string} paymentMethod - the payment method ('Cash', 'PayNow', 'SkillsFuture', …)
 */
export async function fetchReceiptNumber(course, paymentMethod) {
  const response = await getReceiptNumber(course, paymentMethod);
  if (response?.data?.result?.success) return response.data.result.receiptNumber;
  throw new Error('Failed to fetch receipt number');
}

// ─── PDF generation ───────────────────────────────────────────────────────────

/**
 * Generates a receipt PDF and logs the action.
 */
export async function generatePDFReceipt(id, participant, course, userName, receiptNo, status) {
  const pdfResponse = await addReceiptNumber(id, participant, course, userName, receiptNo, status);
  logReceiptGeneration({
    userName,
    module: 'Registration And Payment',
    receiptNo,
    participantName: participant.name,
    contactNumber: participant.contactNumber || 'N/A',
    courseName: course.courseEngName || course.courseName || 'N/A',
    paymentType: course.payment,
    triggerSource: 'Payment Status Change',
  });
  return pdfResponse;
}

/**
 * Generates an invoice PDF and logs the action.
 */
export async function generatePDFInvoice(id, participant, course, userName, receiptNo, status) {
  const pdfResponse = await addInvoiceNumber(id, participant, course, userName, receiptNo, status);
  logReceiptGeneration({
    userName,
    module: 'Registration And Payment',
    receiptNo,
    participantName: participant.name,
    contactNumber: participant.contactNumber || 'N/A',
    courseName: course.courseEngName || course.courseName || 'N/A',
    paymentType: 'Other',
    triggerSource: 'Payment Status Change (Other)',
  });
  return pdfResponse;
}

// ─── database record ─────────────────────────────────────────────────────────

/**
 * Persists a receipt record to the database.
 */
export async function saveReceiptToDatabase(receiptNo, location, registrationId, url, userName) {
  await createReceiptRecord(receiptNo, location, registrationId, url, userName);
}

// ─── view receipt ─────────────────────────────────────────────────────────────

/**
 * Generates and opens a receipt/invoice PDF in a new browser tab,
 * then triggers a file download.
 */
export async function showReceipt(participant, course, receiptNo, officialInfo, userName) {
  const purpose = (course.payment === 'Cash' || course.payment === 'PayNow') ? 'receipt' : 'invoice';
  const pdfResponse = await generateReceiptPDF(purpose, participant, course, userName, receiptNo, officialInfo);

  const filename = `${participant.name}-${course.payment}-${receiptNo}.pdf`;
  const blob     = new Blob([pdfResponse.data], { type: 'application/pdf' });
  const blobUrl  = window.URL.createObjectURL(blob);

  const win = window.open(blobUrl, '_blank');
  if (!win) alert('Please allow popups to view the PDF receipt.');

  const a    = document.createElement('a');
  a.href     = blobUrl;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(blobUrl);

  logReceiptGeneration({
    userName,
    module: 'Registration And Payment',
    receiptNo,
    participantName: participant.name,
    contactNumber: participant.contactNumber || 'N/A',
    courseName: course.courseEngName || course.courseName || 'N/A',
    paymentType: course.payment,
    triggerSource: 'Click Receipt Number',
  });
}

// ─── private sub-functions ────────────────────────────────────────────────────

async function _generateCashPayNowReceipt(id, participant, course, userName, paymentMethod, status) {
  const receiptNo = await fetchReceiptNumber(course, paymentMethod);
  await generatePDFReceipt(id, participant, course, userName, receiptNo, status);
  await saveReceiptToDatabase(receiptNo, course.courseLocation, id, '', userName);
  return receiptNo;
}

async function _generateSkillsFutureInvoice(id, participant, course, userName, paymentMethod, status) {
  const invoiceNo = await fetchReceiptNumber(course, paymentMethod);
  await generatePDFInvoice(id, participant, course, userName, invoiceNo, status);
  await saveReceiptToDatabase(invoiceNo, course.courseLocation, id, '', userName);
  return invoiceNo;
}

// ─── receipt generator (on status change) ────────────────────────────────────

/**
 * Generates a receipt/invoice when the payment status changes.
 * - 'Paid' + Cash/PayNow  → receipt PDF
 * - 'Generating SkillsFuture Invoice' → invoice PDF
 */
export async function receiptGenerator(id, participant, course, official, value, userName) {
  if (value === 'Generating SkillsFuture Invoice') {
    try {
      return await _generateSkillsFutureInvoice(id, participant, course, userName, 'SkillsFuture', value);
    } catch (error) {
      console.error('Error during SkillsFuture invoice generation:', error);
    }
    return null;
  }

  if (value !== 'Paid') return null;
  if (course.payment !== 'Cash' && course.payment !== 'PayNow') return null;

  try {
    return await _generateCashPayNowReceipt(id, participant, course, userName, course.payment, value);
  } catch (error) {
    console.error('Error during receipt generation:', error);
  }

  return null;
}

// ─── auto receipt generator (on payment method change) ───────────────────────

/**
 * Auto-generates a receipt/invoice when the payment method changes.
 * - Cash / PayNow (status auto-set to Paid) → receipt PDF
 * - SkillsFuture                            → invoice PDF
 */
export async function autoReceiptGenerator(id, participant, course, official, newMethod, value, userName) {
  if (newMethod === 'Cash' || newMethod === 'PayNow') {
    if (value !== 'Paid') return null;
    try {
      return await _generateCashPayNowReceipt(id, participant, course, userName, newMethod, value);
    } catch (error) {
      console.error('Error during receipt generation:', error);
    }
  } else if (newMethod === 'SkillsFuture') {
    try {
      return await _generateSkillsFutureInvoice(id, participant, course, userName, 'SkillsFuture', value);
    } catch (error) {
      console.error('Error during SkillsFuture invoice generation:', error);
    }
  }

  return null;
}
