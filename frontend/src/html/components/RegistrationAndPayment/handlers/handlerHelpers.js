/**
 * Common utility functions and helpers for AG-Grid cell handlers.
 */

import {
  updatePaymentStatus,
  editRegistrationField,
  addCancelRemarks,
  editRemarksField,
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
 * Returns the timestamp in the same format the manual RemarksEditor uses:
 * DD/MM/YYYY HH:MM:SS (24-hour). Keeping this identical to the
 * editor means System-generated remarks render byte-for-byte like typed ones.
 * Example: "26/06/2026 23:46:07"
 */
export function getEditorTimestampLabel() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Reads the current remarks block from whichever data shape carries it.
 */
function readExistingRemarks(dataObj) {
  return String(
    dataObj?.remarks ||
    dataObj?.officialInfo?.remarks ||
    dataObj?.official?.remarks ||
    ''
  ).trim();
}

/**
 * Appends a role-tagged, numbered, timestamped remark in the canonical
 * `[Role]: N) [DD/MM/YYYY HH:MM] message` format and persists the full block
 * via the overwrite path (editRemarksField) so it is byte-for-byte consistent
 * with manually-entered remarks. Defaults to the "System" role so machine-
 * generated remarks (e.g. invoice voids) render in the System colour (black).
 *
 * Returns the updated remarks block.
 */
export async function appendSystemRemark({ id, event, message, role = 'System' }) {
  const dataObj = event?.data || event;
  // Defensive sanitisation: if a caller ever passes an already-formatted line
  // (e.g. "[System]: 1) [ts] ..."), strip any leading `[Role]: N)` prefixes and
  // a leading `[timestamp]` so we never produce a double-prefixed remark.
  const cleanMessage = String(message ?? '')
    .trim()
    .replace(/^(?:(?:\[[^\]]*\]:\s*)?\d+\)\s*)+/, '')
    .replace(/^\[\d{1,2}\/\d{1,2}\/\d{2,4}[^\]]*\]\s*/, '')
    .trim();
  if (!cleanMessage) return readExistingRemarks(dataObj);

  const existing = readExistingRemarks(dataObj);
  const lines = existing.split('\n').map((line) => line.trim()).filter(Boolean);

  // Next number = highest existing number + 1 (robust to removed lines).
  // Matches both legacy "N) ..." and role-prefixed "[Role]: N) ..." lines.
  let maxNo = 0;
  for (const line of lines) {
    const m = line.match(/(?:^|\]:\s*)(\d+)\)/);
    if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10) || 0);
  }
  const nextNumber = maxNo + 1;

  const newLine = `[${role}]: ${nextNumber}) [${getEditorTimestampLabel()}] ${cleanMessage}`;
  const updatedBlock = lines.length ? `${lines.join('\n')}\n${newLine}` : newLine;

  // Persist via the overwrite path so the backend performs no re-numbering.
  await editRemarksField(id, 'remarks', updatedBlock);

  // Optimistic local update across every data shape the grid reads from.
  dataObj.remarks = updatedBlock;
  if (dataObj.officialInfo) dataObj.officialInfo.remarks = updatedBlock;
  if (dataObj.official) dataObj.official.remarks = updatedBlock;

  // Live-refresh the Remarks cell so system-generated remarks (e.g. receipt/
  // invoice voids appended during a payment-method/status change) appear
  // immediately, matching the manual-edit path. Without this the backend and
  // local row data update but the grid keeps showing the stale remarks until a
  // manual page reload. Guarded so it is a no-op when a caller passes a plain
  // data object instead of a full ag-grid event.
  try {
    const api = event?.api;
    if (api && typeof api.refreshCells === 'function') {
      const node = event?.node;
      api.refreshCells({
        rowNodes: node ? [node] : undefined,
        columns: ['remarks'],
        force: true,
      });
    }
  } catch (refreshError) {
    console.warn('[appendSystemRemark] Failed to refresh remarks cell:', refreshError);
  }

  return updatedBlock;
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

  // Strip any leading "N) " from the incoming remark so we never end up with a
  // doubled prefix like "1) 1) ...". This function owns the numbering; callers
  // should pass a single, unnumbered remark.
  const cleanRemarkText = String(remarkText ?? '').replace(/^\s*\d+\)\s*/, '').trim();
  
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
  
  const numberedRemark = `${nextNumber}) ${cleanRemarkText}`;
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
    ? 'SkillsFuture Invoice Number'
    : 'Receipt Number';

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

  try {
    // Void remarks are machine-generated, so they are tagged as "System" and
    // written in the same `[System]: N) [timestamp] ...` format as manual ones.
    await appendSystemRemark({ id, event, message: voidMarker, role: 'System' });
  } catch (error) {
    recentVoidRemarkByKey.delete(voidKey);
    throw error;
  }
}
