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
  createInvoiceRecord,
} from '../services/registrationApi';

import { logReceiptGeneration } from '../../../../utils/auditLog';
import { resolveEffectivePaymentMethod } from '../utils/paymentMethodResolver.mjs';

const resolvePaymentMethod = (course) => resolveEffectivePaymentMethod(course);

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
  const _now = new Date();
  const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
  const paymentDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
  const paymentTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
  if (id) {
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
  const filename = `${participant.name} - Receipt - ${resolvedPaymentMethod || 'payment'} - ${receiptNo}.pdf`;
  
  return { receiptNo, blob, filename, paymentDate, paymentTime };
}

/**
 * Generates an invoice PDF and logs the action.
 * Returns: { receiptNo, blob, filename }
 */
export async function generatePDFInvoice(id, participant, course, userName, receiptNo, status, officialInfo = null) {
  const resolvedPaymentMethod = resolvePaymentMethod(course);
  
  // Add invoice number to backend
  if (id) {
    try {
      console.log('📝 [Invoice Handler] Adding invoice number to backend:', { id, receiptNo, status });
      const response = await addInvoiceNumber(id, participant, course, userName, receiptNo, status);
      console.log('✅ [Invoice Handler] Invoice number added successfully:', response);
    } catch (error) {
      console.error('❌ [Invoice Handler] Failed to add invoice number to backend:', error);
      throw error; // Propagate error so caller knows it failed
    }
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
  const filename = `${participant.name} - Invoice - ${resolvedPaymentMethod || 'payment'} - ${receiptNo}.pdf`;
  
  return { receiptNo, blob, filename };
}

// ─── database record ─────────────────────────────────────────────────────────

/**
 * Persists a receipt record to the database.
 */
async function saveDocumentRecord(documentNo, documentType, location, registrationId, url, userName) {
  if (!registrationId) {
    console.warn('⚠️ [Save Record] Skipping: missing registrationId');
    return;
  }
  
  const registrationIdStr = String(registrationId).trim();
  if (!/^[0-9a-f]{24}$/i.test(registrationIdStr)) {
    const error = new Error(`Invalid registration ID format: "${registrationIdStr}" (expected 24 hex characters)`);
    console.error('❌ [Save Record] Invalid ObjectId format:', error);
    throw error;
  }
  
  try {
    if (documentType === 'invoice') {
      console.log('📝 [Save Invoice] Saving invoice to database:', { documentNo, location, registrationId: registrationIdStr, userName });
      await createInvoiceRecord(documentNo, location, registrationIdStr, url, userName);
      console.log('✅ [Save Invoice] Invoice saved successfully');
      return;
    }

    console.log('📝 [Save Receipt] Saving receipt to database:', { documentNo, location, registrationId: registrationIdStr, userName });
    await createReceiptRecord(documentNo, location, registrationIdStr, url, userName);
    console.log('✅ [Save Receipt] Receipt saved successfully');
  } catch (error) {
    const label = documentType === 'invoice' ? 'invoice' : 'receipt';
    console.error(`❌ [Save ${label}] Failed to save ${label}:`, { documentNo, location, registrationId: registrationIdStr, error });
    throw error;
  }
}

export async function saveReceiptToDatabase(receiptNo, location, registrationId, url, userName) {
  return saveDocumentRecord(receiptNo, 'receipt', location, registrationId, url, userName);
}

export async function saveInvoiceToDatabase(invoiceNo, location, registrationId, url, userName) {
  return saveDocumentRecord(invoiceNo, 'invoice', location, registrationId, url, userName);
}

// ─── view receipt ─────────────────────────────────────────────────────────────

/**
 * Generates and opens a receipt/invoice PDF in a new browser tab,
 * then triggers a file download.
 */
export async function showReceipt(participant, course, receiptNo, officialInfo, userName) {
  const progressTracker = arguments[5]?.progressTracker;
  const showUpdatePopup = arguments[5]?.showUpdatePopup;
  const closePopup = arguments[5]?.closePopup;

  const resolvedPaymentMethod = String(
    course?.finalPaymentMethod || course?.paymentMethod || course?.payment || ''
  ).trim();
  const purpose = (resolvedPaymentMethod === 'Cash' || resolvedPaymentMethod === 'PayNow')
    ? 'receipt'
    : 'invoice';
  const progressLabel = purpose === 'invoice'
    ? 'Downloading and previewing invoice'
    : 'Downloading and previewing receipt';

  if (progressTracker) {
    progressTracker.start([progressLabel]);
  } else if (showUpdatePopup) {
    showUpdatePopup(`${progressLabel}...`);
  }

  let hasError = false;

  try {
    const pdfResponse = await generateReceiptPDF(purpose, participant, course, userName, receiptNo, officialInfo);

    const documentTypeLabel = purpose === 'invoice' ? 'Invoice' : 'Receipt';
    const filename = `${participant.name} - ${documentTypeLabel} - ${resolvedPaymentMethod || 'payment'} - ${receiptNo}.pdf`;
    const blob     = new Blob([pdfResponse.data], { type: 'application/pdf' });
    const blobUrl  = window.URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank');
    if (!win) {
      console.warn('Popup blocked while opening PDF receipt preview.');
    }

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
  } catch (error) {
    hasError = true;
    if (progressTracker) {
      progressTracker.error();
    }
    throw error;
  } finally {
    if (progressTracker) {
      if (!hasError) progressTracker.finish();
    } else if (closePopup) {
      closePopup();
    }
  }
}

// ─── private sub-functions ────────────────────────────────────────────────────

async function _generateCashPayNowReceipt(id, participant, course, userName, paymentMethod, status, officialInfo = null, progressTracker = null) {
  const receiptNo = await fetchReceiptNumber(course, paymentMethod);
  console.log('✅ [Receipt Handler] Receipt number fetched:', receiptNo);
  
  const result = await generatePDFReceipt(id, participant, course, userName, receiptNo, status, officialInfo);
  console.log('✅ [Receipt Handler] Receipt PDF generated and added to database');
  
  try {
    // The persisted Receipts record stores the CENTRE location (e.g. "CT Hub"),
    // not the course venue (e.g. "Renewal Christian Church"). The PDF still shows
    // the course/venue location; only the database record uses the centre.
    const recordLocation = course.centre_location || course.centreLocation || course.courseLocation;
    await saveReceiptToDatabase(receiptNo, recordLocation, id, '', userName);
    console.log('✅ [Receipt Handler] Receipt record saved to Receipts collection');
  } catch (dbError) {
    console.error('❌ [Receipt Handler] Failed to save receipt record to Receipts collection:', {
      receiptNo,
      registrationId: id,
      courseName: course.courseEngName,
      error: dbError.message
    });
    // Don't throw - receipt is already in registration table, just not in Receipts collection
  }
  
  // Do NOT advance tracker here - let the main handler control the progression
  // The main handler will advance after updating the table with the receipt number
  return result; // { receiptNo, blob, filename, paymentDate, paymentTime }
}

async function _generateSkillsFutureInvoice(id, participant, course, userName, paymentMethod, status, officialInfo = null, progressTracker = null) {
  try {
    console.log('📋 [SkillsFuture Invoice] Starting invoice generation for:', { id, participantName: participant.name, course: course.courseEngName });
    
    const invoiceNo = await fetchReceiptNumber(course, paymentMethod);
    console.log('✅ [SkillsFuture Invoice] Invoice number fetched:', invoiceNo);
    
    if (progressTracker) progressTracker.advance(); // → SkillsFuture Invoice Generated
    
    const result = await generatePDFInvoice(id, participant, course, userName, invoiceNo, status, officialInfo);
    console.log('✅ [SkillsFuture Invoice] PDF generated and database updated:', result);
    
    if (progressTracker) progressTracker.advance(); // → Invoice Downloaded and Opened
    
    try {
      // The persisted Invoices record stores the CENTRE location (e.g. "CT Hub"),
      // not the course venue (e.g. "Renewal Christian Church"). The PDF still shows
      // the course/venue location; only the database record uses the centre.
      const recordLocation = course.centre_location || course.centreLocation || course.courseLocation;
      await saveInvoiceToDatabase(invoiceNo, recordLocation, id, '', userName);
      console.log('✅ [SkillsFuture Invoice] Invoice record saved to database');
    } catch (dbError) {
      console.error('❌ [SkillsFuture Invoice] Failed to save invoice record to Invoices collection:', {
        invoiceNo,
        registrationId: id,
        courseName: course.courseEngName,
        error: dbError.message
      });
    }
    
    return result; // { receiptNo, blob, filename }
  } catch (error) {
    console.error('❌ [SkillsFuture Invoice] Error:', error);
    throw error;
  }
}

// ─── receipt generator (on status change) ────────────────────────────────────

/**
 * Generates a receipt/invoice when the payment status changes.
 * - 'Paid' + Cash/PayNow  → receipt PDF
 * - 'Generating SkillsFuture Invoice' → invoice PDF
 */
export async function receiptGenerator(id, participant, course, official, value, userName, progressTracker = null) {
  if (value === 'Generating SkillsFuture Invoice') {
    try {
      return await _generateSkillsFutureInvoice(id, participant, course, userName, 'SkillsFuture', value, official, progressTracker);
    } catch (error) {
      console.error('Error during SkillsFuture invoice generation:', error);
    }
    return null;
  }

  if (value !== 'Paid') return null;
  const resolvedPaymentMethod = resolvePaymentMethod(course);
  if (resolvedPaymentMethod !== 'Cash' && resolvedPaymentMethod !== 'PayNow') return null;

  try {
    return await _generateCashPayNowReceipt(id, participant, course, userName, resolvedPaymentMethod, value, official, progressTracker);
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
export async function autoReceiptGenerator(id, participant, course, official, newMethod, value, userName, progressTracker = null) {
  if (newMethod === 'Cash' || newMethod === 'PayNow') {
    if (value !== 'Paid') return null;
    try {
      return await _generateCashPayNowReceipt(id, participant, course, userName, newMethod, value, official, progressTracker);
    } catch (error) {
      console.error('Error during receipt generation:', error);
    }
  } else if (newMethod === 'SkillsFuture') {
    try {
      return await _generateSkillsFutureInvoice(id, participant, course, userName, 'SkillsFuture', value, official, progressTracker);
    } catch (error) {
      console.error('Error during SkillsFuture invoice generation:', error);
    }
  }

  return null;
}
