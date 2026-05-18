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

const resolvePaymentMethod = (course) => String(
  course?.finalPaymentMethod || course?.paymentMethod || course?.payment || ''
).trim();

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
 * Returns: { receiptNo, blob, filename }
 */
export async function generatePDFReceipt(id, participant, course, userName, receiptNo, status, officialInfo = null) {
  const resolvedPaymentMethod = resolvePaymentMethod(course);
  
  // Add receipt number to backend with frontend-computed SGT date/time
  if (id) {
    const _now = new Date();
    const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
    const paymentDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
    const paymentTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
    await addReceiptNumber(id, participant, course, userName, receiptNo, status, paymentDate, paymentTime);
  }
  
  logReceiptGeneration({
    userName,
    module: 'Registration And Payment',
    receiptNo,
    participantName: participant.name,
    contactNumber: participant.contactNumber || 'N/A',
    courseName: course.courseEngName || course.courseName || 'N/A',
    paymentType: resolvedPaymentMethod || course.payment,
    triggerSource: 'Payment Status Change',
  });

  const pdfResponse = await generateReceiptPDF('receipt', participant, course, userName, receiptNo, officialInfo);
  const blob = pdfResponse.data;
  const filename = `${participant.name}-${resolvedPaymentMethod || 'payment'}-${receiptNo}.pdf`;
  
  return { receiptNo, blob, filename };
}

/**
 * Generates an invoice PDF and logs the action.
 * Returns: { receiptNo, blob, filename }
 */
export async function generatePDFInvoice(id, participant, course, userName, receiptNo, status, officialInfo = null) {
  const resolvedPaymentMethod = resolvePaymentMethod(course);
  
  // Add invoice number to backend
  if (id) {
    await addInvoiceNumber(id, participant, course, userName, receiptNo, status);
  }
  
  logReceiptGeneration({
    userName,
    module: 'Registration And Payment',
    receiptNo,
    participantName: participant.name,
    contactNumber: participant.contactNumber || 'N/A',
    courseName: course.courseEngName || course.courseName || 'N/A',
    paymentType: resolvedPaymentMethod || 'Other',
    triggerSource: 'Payment Status Change (Other)',
  });

  const pdfResponse = await generateReceiptPDF('invoice', participant, course, userName, receiptNo, officialInfo);
  const blob = pdfResponse.data;
  const filename = `${participant.name}-Invoice-${receiptNo}.pdf`;
  
  return { receiptNo, blob, filename };
}

// ─── database record ─────────────────────────────────────────────────────────

/**
 * Persists a receipt record to the database.
 */
export async function saveReceiptToDatabase(receiptNo, location, registrationId, url, userName) {
  if (registrationId) {
    await createReceiptRecord(receiptNo, location, registrationId, url, userName);
  }
}

// ─── view receipt ─────────────────────────────────────────────────────────────

/**
 * Generates and opens a receipt/invoice PDF in a new browser tab,
 * then triggers a file download.
 */
export async function showReceipt(participant, course, receiptNo, officialInfo, userName) {
  const resolvedPaymentMethod = String(
    course?.finalPaymentMethod || course?.paymentMethod || course?.payment || ''
  ).trim();
  const purpose = (resolvedPaymentMethod === 'Cash' || resolvedPaymentMethod === 'PayNow')
    ? 'receipt'
    : 'invoice';
  const pdfResponse = await generateReceiptPDF(purpose, participant, course, userName, receiptNo, officialInfo);

  const filename = `${participant.name}-${resolvedPaymentMethod || 'payment'}-${receiptNo}.pdf`;
  const blob     = new Blob([pdfResponse.data], { type: 'application/pdf' });
  const blobUrl  = window.URL.createObjectURL(blob);

  const win = window.open(blobUrl, '_blank');
  if (!win) alert('Please allow popups to view the PDF receipt.');

  const a    = document.createElement('a');
  a.href     = blobUrl;
  a.download = filename;
  a.click();

  // Delay revoking the object URL so the newly opened tab has time to load the PDF.
  // Revoking immediately can cause the new tab to fail to load the blob resource.
  setTimeout(() => {
    try {
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Failed to revoke blob URL:', err);
    }
  }, 5000);

  logReceiptGeneration({
    userName,
    module: 'Registration And Payment',
    receiptNo,
    participantName: participant.name,
    contactNumber: participant.contactNumber || 'N/A',
    courseName: course.courseEngName || course.courseName || 'N/A',
    paymentType: resolvedPaymentMethod || course.payment,
    triggerSource: 'Click Receipt Number',
  });
}

// ─── private sub-functions ────────────────────────────────────────────────────

async function _generateCashPayNowReceipt(id, participant, course, userName, paymentMethod, status, officialInfo = null) {
  const receiptNo = await fetchReceiptNumber(course, paymentMethod);
  const result = await generatePDFReceipt(id, participant, course, userName, receiptNo, status, officialInfo);
  await saveReceiptToDatabase(receiptNo, course.courseLocation, id, '', userName);
  return result; // { receiptNo, blob, filename }
}

async function _generateSkillsFutureInvoice(id, participant, course, userName, paymentMethod, status, officialInfo = null) {
  const invoiceNo = await fetchReceiptNumber(course, paymentMethod);
  const result = await generatePDFInvoice(id, participant, course, userName, invoiceNo, status, officialInfo);
  await saveReceiptToDatabase(invoiceNo, course.courseLocation, id, '', userName);
  return result; // { receiptNo, blob, filename }
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
      return await _generateSkillsFutureInvoice(id, participant, course, userName, 'SkillsFuture', value, official);
    } catch (error) {
      console.error('Error during SkillsFuture invoice generation:', error);
    }
    return null;
  }

  if (value !== 'Paid') return null;
  const resolvedPaymentMethod = resolvePaymentMethod(course);
  if (resolvedPaymentMethod !== 'Cash' && resolvedPaymentMethod !== 'PayNow') return null;

  try {
    return await _generateCashPayNowReceipt(id, participant, course, userName, resolvedPaymentMethod, value, official);
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
      return await _generateCashPayNowReceipt(id, participant, course, userName, newMethod, value, official);
    } catch (error) {
      console.error('Error during receipt generation:', error);
    }
  } else if (newMethod === 'SkillsFuture') {
    try {
      return await _generateSkillsFutureInvoice(id, participant, course, userName, 'SkillsFuture', value, official);
    } catch (error) {
      console.error('Error during SkillsFuture invoice generation:', error);
    }
  }

  return null;
}
