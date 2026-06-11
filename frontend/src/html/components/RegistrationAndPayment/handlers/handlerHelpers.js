/**
 * Common utility functions and helpers for AG-Grid cell handlers.
 */

import {
  updatePaymentStatus,
  editRegistrationField,
  addCancelRemarks,
} from '../services/registrationApi';

import { logRegistrationUpdate } from '../../../../utils/auditLog';

export const RECENT_VOID_REMARK_WINDOW_MS = 10000;
export const recentVoidRemarkByKey = new Map();

// ─── utility functions ────────────────────────────────────────────────────────

/**
 * Resolves the MongoDB _id string from an AG-Grid event.data object.
 * Handles all MongoDB _id shapes: plain string, { $oid }, { _id }, or a
 * pre-normalised `id` field that mapRegistrationToRowData already set.
 */
export function resolveEventId(eventData) {
  const normalizeCandidate = (value) => {
    const rawValue = value?._id ?? value?.$oid ?? value ?? '';
    if (typeof rawValue === 'object' && rawValue !== null) {
      return String(rawValue.$oid ?? rawValue._id ?? rawValue.id ?? '').trim();
    }
    return String(rawValue || '').trim();
  };

  // Always prefer MongoDB _id (including {_id:{ $oid }} and {$oid} shapes).
  const mongoId = normalizeCandidate(eventData?._id);
  if (mongoId) return mongoId;

  // Fallback to `id` only if it looks like a Mongo ObjectId string.
  const fallbackId = normalizeCandidate(eventData?.id);
  if (/^[a-fA-F0-9]{24}$/.test(fallbackId)) return fallbackId;

  return '';
}

export function waitForNextPaint() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

export function isResultSuccessful(result) {
  if (result === true) return true;
  if (result === false || result === null || result === undefined) return false;

  if (typeof result === 'string') {
    const normalized = result.trim().toLowerCase();
    return normalized === 'success' || normalized === 'ok' || normalized === 'true';
  }

  if (typeof result === 'object') {
    if (result.success === true) return true;
    if (result.acknowledged === true) {
      // For updateOne operations, just check acknowledged
      // modifiedCount could be 0 if value didn't change, but operation still succeeded
      return true;
    }
    if (typeof result.matchedCount === 'number') {
      return result.matchedCount > 0;
    }
    if (typeof result.modifiedCount === 'number') {
      return result.modifiedCount > 0;
    }
    if (typeof result.result === 'boolean') {
      return result.result;
    }
  }

  return false;
}

export function isApiResultSuccessful(response) {
  return isResultSuccessful(response?.data?.result);
}

export function isSkillsFutureInvoiceNumber(receiptNo) {
  return /ECSS\/SFC\//i.test(String(receiptNo || ''));
}

export function inferDocumentType(receiptNo) {
  const value = String(receiptNo || '').trim();
  if (!value) return '';
  return isSkillsFutureInvoiceNumber(value) ? 'invoice' : 'receipt';
}

/**
 * Returns timestamp in format: DD/MM/YYYY HH:MM hrs (24-hour format)
 * Example: "11/06/2026 17:30 hrs"
 */
export function getCurrentTimestampLabel() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes} hrs`;
}

export function appendLocalRemark(event, remarkText) {
  const existing = String(event?.data?.remarks || '').trim();
  event.data.remarks = existing ? `${existing}\n${remarkText}` : remarkText;
}

/**
 * Appends a numbered remark to the event data.
 * Automatically numbers remarks as 1), 2), 3), etc.
 * 
 * Handles both:
 * - Full event objects: appendNumberedRemark(event, text)
 * - Data objects directly: appendNumberedRemark(event.data, text)
 * 
 * Updates both the top-level remarks AND nested officialInfo/official.remarks
 * to keep the grid display in sync with the backend data.
 */
export function appendNumberedRemark(eventOrData, remarkText) {
  // Detect if we received a full event object or just a data object
  const dataObj = eventOrData?.data || eventOrData;
  
  const existing = String(dataObj?.remarks || '').trim();
  
  // Count existing numbered items (lines that start with number))
  let nextNumber = 1;
  if (existing) {
    const matches = existing.match(/^\s*(\d+)\)/gm);
    if (matches && matches.length > 0) {
      // Extract the highest number and add 1
      const numbers = matches.map(m => parseInt(m.match(/\d+/)[0]));
      nextNumber = Math.max(...numbers) + 1;
    }
  }
  
  const numberedRemark = `${nextNumber}) ${remarkText}`;
  const updatedRemarks = existing ? `${existing}\n${numberedRemark}` : numberedRemark;
  
  // Update the top-level remarks field (what the grid displays from rowDataMapper)
  dataObj.remarks = updatedRemarks;
  
  // Also sync to nested officialInfo/official.remarks (backend source of truth)
  if (dataObj.officialInfo) {
    dataObj.officialInfo.remarks = updatedRemarks;
  }
  if (dataObj.official) {
    dataObj.official.remarks = updatedRemarks;
  }
}

/**
 * Builds the common log payload shared by all update calls.
 */
export function buildLogPayload({ userName, sn, id, participantInfo, columnName, oldValue, newValue }) {
  return {
    userName,
    module: 'Registration And Payment',
    sn,
    recordId: id,
    participantName: participantInfo?.name || 'Unknown',
    contactNumber: participantInfo?.contactNumber || 'N/A',
    columnName,
    oldValue,
    newValue,
  };
}

// ─── common helpers ──────────────────────────────────────────────────────────

/**
 * Updates the final payment method if not already set.
 */
export async function updateFinalPaymentMethodIfNeeded({ id, sn, userName, participantInfo, paymentMethod, currentFinalPaymentMethod }) {
  const normalizedPaymentMethod = String(paymentMethod || '').trim();
  const normalizedFinalMethod = String(currentFinalPaymentMethod || '').trim();

  if (!normalizedPaymentMethod) {
    return false;
  }

  if (normalizedFinalMethod) {
    if (normalizedFinalMethod !== normalizedPaymentMethod) {
      return false;
    }
    return false;
  }

  const res = await editRegistrationField(id, 'finalPaymentMethod', normalizedPaymentMethod);
  if (!isApiResultSuccessful(res)) {
    return false;
  }

  await logRegistrationUpdate(buildLogPayload({
    userName,
    sn,
    id,
    participantInfo,
    columnName: 'Final Payment Method (Auto)',
    oldValue: normalizedFinalMethod || '',
    newValue: normalizedPaymentMethod,
  }));

  return true;
}

/**
 * Auto-sets registration status to 'Confirmed Slot' if needed.
 */
export async function autoSetConfirmedSlotRegistrationStatus({ id, sn, userName, participantInfo, currentRegistrationStatus }) {
  const normalizedCurrentStatus = String(currentRegistrationStatus || '').trim().toLowerCase();
  if (normalizedCurrentStatus === 'confirmed slot') {
    return false;
  }
  if (normalizedCurrentStatus !== '' && normalizedCurrentStatus !== 'submitted') {
    return false;
  }

  const res = await editRegistrationField(id, 'registrationStatus', 'Confirmed Slot');
  if (!isApiResultSuccessful(res)) {
    return false;
  }

  await logRegistrationUpdate(buildLogPayload({
    userName,
    sn,
    id,
    participantInfo,
    columnName: 'Registration Status (Auto)',
    oldValue: currentRegistrationStatus || '',
    newValue: 'Confirmed Slot',
  }));

  return true;
}

/**
 * Appends a void remark when a receipt/invoice number is being replaced.
 */
export async function appendVoidedNumberRemark({ id, event, existingReceiptNo, reason }) {
  const docType = inferDocumentType(existingReceiptNo) === 'invoice'
    ? 'SkillsFuture invoice number'
    : 'Receipt number';

  const voidMarker = `${docType} ${existingReceiptNo} is void`;
  const voidKey = `${String(id || '')}::${String(existingReceiptNo || '').trim().toLowerCase()}`;
  const now = Date.now();

  const lastAppendedAt = recentVoidRemarkByKey.get(voidKey) || 0;
  if (now - lastAppendedAt < RECENT_VOID_REMARK_WINDOW_MS) {
    return;
  }

  const currentRemarks = [
    String(event?.data?.remarks || ''),
    String(event?.data?.officialInfo?.remarks || ''),
  ]
    .join('\n')
    .toLowerCase();

  if (currentRemarks.includes(voidMarker.toLowerCase())) {
    return;
  }

  recentVoidRemarkByKey.set(voidKey, now);

  const remarkText = `[${getCurrentTimestampLabel()}] ${voidMarker}`;
  try {
    await addCancelRemarks(id, remarkText);
    appendNumberedRemark(event, remarkText);
  } catch (error) {
    recentVoidRemarkByKey.delete(voidKey);
    throw error;
  }
}
