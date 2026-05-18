/**
 * Final Payment Method handler for AG-Grid cell changes.
 * Handles staff final payment method overrides (Cash, PayNow, SkillsFuture).
 * Single entry point that orchestrates all steps: method → status → confirmation → registration → receipt/invoice generation → download/preview.
 */

import {
  updatePaymentStatus,
  editRegistrationField,
  clearPaymentDetails,
  // addRefundedDate,
  // removeRefundedDate,
} from '../services/registrationApi';

import {
  isApiResultSuccessful,
  buildLogPayload,
  resolveEventId,
} from './handlerHelpers';

import { logRegistrationUpdate } from '../../../../utils/auditLog';

/**
 * Handles changes to the "Final Payment Method" column (staff override).
 * Updates payment status and generates receipt/invoice based on the selected method.
 */
export async function handleFinalPaymentMethodChange(event, context) {
  const { userName, userRole, progressTracker, showUpdatePopup, closePopup, autoReceiptGenerator } = context;
  const id = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for final payment method update');
  }
  const sn = event.data.sn;
  const participantInfo = event.data.participantInfo;
  const courseInfo      = event.data.courseInfo;
  const officialInfo    = event.data.officialInfo;
  const newValue = String(event.value || '').trim();
  const oldValue = String(event.oldValue || '').trim();
  // Prefer event.data.status (the reliable DB-sourced field from rowDataMapper) over
  // event.data.paymentStatus, which can diverge when the payment-status cell editor
  // writes to it independently of the actual DB status.
  const currentPaymentStatus = String(event.data.status || event.data.paymentStatus || '').trim();
  const currentRegistrationStatus = String(event.data.registrationStatus || '').trim();

  console.log('[FinalPaymentMethod] event.data fields:', {
    paymentStatus: event.data.paymentStatus,
    status: event.data.status,
    registrationStatus: event.data.registrationStatus,
    finalPaymentMethod: event.data.finalPaymentMethod,
    currentPaymentStatus,
    currentRegistrationStatus,
    oldValue: event.oldValue,
    newValue: event.value,
  });

  // Detect the specific Cash/PayNow → SkillsFuture transition
  const isCashPayNowToSF =
    (oldValue === 'Cash' || oldValue === 'PayNow') && newValue === 'SkillsFuture';

  // Detect the specific SkillsFuture → Cash/PayNow transition
  const isSFToCashPayNow =
    oldValue === 'SkillsFuture' && (newValue === 'Cash' || newValue === 'PayNow');

  // Detect Cash ↔ PayNow swaps (e.g. Cash → PayNow or PayNow → Cash)
  const isCashPayNowSwap =
    (oldValue === 'Cash' && newValue === 'PayNow') ||
    (oldValue === 'PayNow' && newValue === 'Cash');

  // All swap-direction transitions: clear payment details and do NOT generate a receipt
  const isPaymentMethodSwap = isCashPayNowToSF || isSFToCashPayNow || isCashPayNowSwap;

  if (newValue === oldValue) {
    return { updated: false };
  }

  const { refreshChild } = context;

  // ── Simple path: already Pending + Submitted ───────────────────────────────
  // When the record is already in the Pending/Submitted state (from a prior payment
  // method change), swapping the method again only needs one step — just update the
  // finalPaymentMethod field. All other bookkeeping (setting Pending, Submitted,
  // clearing receipts) is already in the correct state.
  const isAlreadyPendingSubmitted =
    currentPaymentStatus === 'Pending' && currentRegistrationStatus === 'Submitted';

  if (isAlreadyPendingSubmitted && isPaymentMethodSwap) {
    if (progressTracker) progressTracker.start(['Changing final payment method']);

    const res = await editRegistrationField(id, 'finalPaymentMethod', newValue);
    if (!isApiResultSuccessful(res)) {
      if (progressTracker) progressTracker.error();
      else closePopup();
      throw new Error(`Failed to update final payment method for registration ${id}`);
    }

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Final Payment Method (by Staff)',
      oldValue: oldValue || '',
      newValue,
    }));

    // Only refresh the payment status columns so the active column (Cash/PayNow vs SkillsFuture)
    // re-evaluates after the method swap. Do NOT reload the full table — nothing else changes
    // in this path, and a full reload would overwrite locally-set paymentStatus values.
    if (event.api && typeof event.api.refreshCells === 'function') {
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: ['paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'finalPaymentMethod'],
        force: true,
      });
    }

    if (progressTracker) {
      progressTracker.finish(null, { immediateClose: true });
    } else {
      closePopup();
    }

    return { updated: true, generatedNo: '' };
  }

  // ── Full path: non-Pending state (or first-time method set) ───────────────
  // Generate a receipt only when setting Cash/PayNow for the first time (not when swapping methods)
  const willGenerateReceipt = (newValue === 'Cash' || newValue === 'PayNow') && !isPaymentMethodSwap;
  // Open tab immediately (before any awaits) to avoid browser popup blocker
  const preOpenedTab = willGenerateReceipt ? window.open('', '_blank') : null;

  const shouldShowProgress = true;

  const steps = [
    'Changing final payment method',
    'Updating registration status',
    'Updating payment status',
    ...(isPaymentMethodSwap ? ['Clearing payment details'] : []),
    ...(willGenerateReceipt ? ['Generating receipt', 'Recording payment date and time'] : []),
  ];

  if (shouldShowProgress && progressTracker) {
    progressTracker.start(steps);
  } else if (shouldShowProgress) {
    showUpdatePopup('Updating in progress... Please wait ...');
  }

  // Step 1: Update final payment method
  const res = await editRegistrationField(id, 'finalPaymentMethod', newValue);
  if (!isApiResultSuccessful(res)) {
    if (preOpenedTab) preOpenedTab.close();
    if (shouldShowProgress && progressTracker) progressTracker.error();
    else if (shouldShowProgress) closePopup();
    throw new Error(`Failed to update final payment method for registration ${id}`);
  }

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Final Payment Method (by Staff)',
    oldValue: oldValue || '',
    newValue,
  }));

  // Step 2: Update registration status to Submitted
  if (shouldShowProgress && progressTracker) progressTracker.advance();

  const regRes = await editRegistrationField(id, 'registrationStatus', 'Submitted');
  if (isApiResultSuccessful(regRes)) {
    event.data.registrationStatus = 'Submitted';
    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Registration Status (Auto)',
      oldValue: currentRegistrationStatus || '',
      newValue: 'Submitted',
    }));
  }

  // Step 3: Update payment status to Pending
  if (shouldShowProgress && progressTracker) progressTracker.advance();

  const payRes = await updatePaymentStatus(id, 'Pending', userName, userRole);
  if (isApiResultSuccessful(payRes)) {
    // Keep both fields in sync so subsequent swaps in the same session read correctly
    event.data.status = 'Pending';
    event.data.paymentStatus = 'Pending';
    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Payment Status (Auto)',
      oldValue: currentPaymentStatus || '',
      newValue: 'Pending',
    }));
  }

  // Step 4: clear receipt number, payment date, and time when swapping payment methods
  if (isPaymentMethodSwap) {
    if (shouldShowProgress && progressTracker) progressTracker.advance();

    await clearPaymentDetails(id);

    // Update local row data immediately so grid reflects the cleared values at once
    event.data.recinvNo    = '';
    event.data.paymentDate = '';
    event.data.paymentTime = '';
    if (event.data.officialInfo) {
      event.data.officialInfo.receiptNo = '';
      event.data.officialInfo.date      = '';
      event.data.officialInfo.time      = '';
    }
  }

  if (event.api && typeof event.api.refreshCells === 'function') {
    event.api.refreshCells({
      rowNodes: [event.node],
      columns: ['paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'finalPaymentMethod', 'confirmed', 'registrationStatus', 'recinvNo', 'paymentDate', 'paymentTime', 'remarks'],
      force: true,
    });
  }

  // Generate receipt PDF and open in new tab for Cash / PayNow
  if (willGenerateReceipt && autoReceiptGenerator) {
    if (progressTracker) progressTracker.advance(); // Step 4: Generating receipt

    let receiptResult = null;
    try {
      const RECEIPT_TIMEOUT_MS = 30000;
      receiptResult = await Promise.race([
        autoReceiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue, 'Paid'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Receipt generation timed out')), RECEIPT_TIMEOUT_MS)
        ),
      ]);
    } catch (receiptErr) {
      console.error('Receipt generation failed or timed out:', receiptErr);
      if (preOpenedTab) preOpenedTab.close();
    }

    // Step: Recording payment date and time
    if (progressTracker) progressTracker.advance();

    if (receiptResult?.receiptNo) {
      const _now = new Date();
      const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
      const _paymentDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
      const _paymentTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
      event.data.recinvNo    = receiptResult.receiptNo;
      event.data.paymentDate = _paymentDate;
      event.data.paymentTime = _paymentTime;
      if (event.data.officialInfo) {
        event.data.officialInfo.receiptNo = receiptResult.receiptNo;
        event.data.officialInfo.date      = _paymentDate;
        event.data.officialInfo.time      = _paymentTime;
      }
      if (event.api && typeof event.api.refreshCells === 'function') {
        event.api.refreshCells({
          rowNodes: [event.node],
          columns: ['recinvNo', 'paymentDate', 'paymentTime'],
          force: true,
        });
      }
    }

    if (receiptResult?.blob) {
      try {
        const blobUrl = window.URL.createObjectURL(receiptResult.blob);
        if (preOpenedTab) preOpenedTab.location.href = blobUrl;
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = receiptResult.filename || 'receipt.pdf';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
      } catch (blobErr) {
        console.error('Failed to open receipt:', blobErr);
      }
    }
  }

  if (shouldShowProgress && progressTracker) {
    // Schedule a table data reload to happen once the progress modal closes.
    // refreshChild detects that progressModalOpen is true and sets _pendingRefreshChild = true.
    // componentDidUpdate then calls refreshChild({ force: true }) when the modal closes.
    if (refreshChild) refreshChild();
    progressTracker.finish(null, { immediateClose: true });
  } else if (shouldShowProgress) {
    closePopup();
  }

  return { updated: true, generatedNo: '' };
}
