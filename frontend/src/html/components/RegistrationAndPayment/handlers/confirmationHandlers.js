/**
 * Confirmation status handlers for AG-Grid cell changes.
 * Handles SkillsFuture confirmation toggles and invoice generation.
 */

import {
  updateConfirmationStatus,
  updatePaymentStatus,
  editRegistrationField,
} from '../services/registrationApi';

import {
  isApiResultSuccessful,
  buildLogPayload,
  appendVoidedNumberRemark,
  updateFinalPaymentMethodIfNeeded,
  waitForNextPaint,
  resolveEventId,
} from './handlerHelpers';

import { logRegistrationUpdate } from '../../../../utils/auditLog';

function safeLogRegistrationUpdate(payload, contextLabel = 'confirmation flow') {
  logRegistrationUpdate(payload).catch((error) => {
    console.error(`Registration audit log failed (${contextLabel}):`, error);
  });
}

/**
 * Handles changes to the "Confirmation Status" column (SkillsFuture toggle).
 * Auto-triggers invoice generation when the SF participant is confirmed.
 * 
 * When Confirming (newValue=true) for SkillsFuture with Pending status:
 * 1. Confirmation Status → Confirmed
 * 2. Payment Status → Generating SkillsFuture Invoice
 * 3. Invoice number generated
 * 4. SkillsFuture invoice PDF generated
 * 5. Invoice auto-opens in tab and auto-downloads
 * Registration Status stays as "Submitted" (unchanged)
 * 
 * When Unconfirming (newValue=false) from Generating SkillsFuture Invoice:
 * 1. Confirmation Status → Not Confirmed
 * 2. Payment Status → Pending
 * 3. Invoice number is voided (if it exists)
 * 4. Registration Status → Submitted (if not already)
 */
export async function handleConfirmationStatusChange(event, context) {
  const { userName, userRole, progressTracker, showUpdatePopup, closePopup, autoReceiptGenerator } = context;

  const id              = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for confirmation status update');
  }
  const sn              = event.data.sn;
  const rawNewValue     = event.value;
  const rawOldValue     = event.oldValue;
  const newValue        = rawNewValue === true || rawNewValue === 'true' || rawNewValue === 1 || rawNewValue === '1';
  const oldConfirmation = rawOldValue === true || rawOldValue === 'true' || rawOldValue === 1 || rawOldValue === '1';
  const participantInfo = event.data.participantInfo;
  const courseInfo      = event.data.courseInfo;
  const officialInfo    = event.data.officialInfo;
  const paymentMethod   = event.data.finalPaymentMethod || event.data.paymentMethod;
  const paymentStatus   = event.data.paymentStatus;

  const existingReceiptNo = String(event.data.recinvNo || officialInfo?.receiptNo || '').trim();
  const hasExistingReceiptNo = existingReceiptNo !== '';
  const currentRegistrationStatus = String(event.data.registrationStatus || '').trim();
  const isSkillsFuture = paymentMethod === 'SkillsFuture';
  const isPendingSF = isSkillsFuture && (!paymentStatus || paymentStatus === 'Pending');
  const isGeneratingSFInvoice = isSkillsFuture && paymentStatus === 'Generating SkillsFuture Invoice';
  const shouldToggleSFInvoiceStatus =
    isSkillsFuture &&
    ((newValue === true && isPendingSF) || (newValue === false && isGeneratingSFInvoice));
  const shouldSetSubmittedOnUnconfirm =
    isSkillsFuture &&
    newValue === false &&
    currentRegistrationStatus !== 'Submitted';
  const shouldSetPaymentPendingOnUnconfirm =
    isSkillsFuture &&
    newValue === false &&
    paymentStatus !== 'Pending';

  // Build progress steps based on the action
  const steps = ['Updating confirmation status'];
  if (shouldSetSubmittedOnUnconfirm && newValue === false) {
    steps.push('Updating registration status');
  }
  if (shouldSetPaymentPendingOnUnconfirm && !shouldToggleSFInvoiceStatus && newValue === false) {
    steps.push('Updating payment status');
  }
  if (shouldToggleSFInvoiceStatus && newValue === true && isPendingSF) {
    // Confirming: update payment status, generate invoice
    steps.push('Updating payment status');
    steps.push('Generating invoice number');
    steps.push('Generating SkillsFuture invoice');
    steps.push('Downloading and previewing invoice');
  } else if (shouldToggleSFInvoiceStatus && newValue === false && isGeneratingSFInvoice) {
    // Unconfirming: revert to pending
    steps.push('Updating payment status');
  }

  if (progressTracker) {
    progressTracker.start(steps);
  } else {
    showUpdatePopup('Updating in progress... Please wait ...');
  }

  // ── Step 1: Update confirmation status ──────────────────────────────────
  const res = await updateConfirmationStatus(id, newValue, userName);

  safeLogRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Confirmation',
    oldValue: oldConfirmation ? 'Confirmed' : 'Not Confirmed',
    newValue: newValue ? 'Confirmed' : 'Not Confirmed',
  }), 'update confirmation status');

  event.data.confirmed = Boolean(newValue);

  let generatedNo = '';
  let generatedInvoiceData = null;

  if (isApiResultSuccessful(res) && shouldSetSubmittedOnUnconfirm && newValue === false) {
    if (progressTracker) progressTracker.advance();

    const regRes = await editRegistrationField(id, 'registrationStatus', 'Submitted');
    if (!isApiResultSuccessful(regRes)) {
      if (progressTracker) progressTracker.error();
      else closePopup();
      return { generatedNo: '' };
    }

    safeLogRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Registration Status (by Confirmation Toggle)',
      oldValue: currentRegistrationStatus || '',
      newValue: 'Submitted',
    }), 'set registration status submitted');

    event.data.registrationStatus = 'Submitted';
  }

  // Also ensure SkillsFuture payment status becomes Pending when unconfirming
  // Skip when shouldToggleSFInvoiceStatus is true — it already handles the payment status change.
  if (isApiResultSuccessful(res) && shouldSetPaymentPendingOnUnconfirm && !shouldToggleSFInvoiceStatus && newValue === false) {
    if (progressTracker) progressTracker.advance();

    const payRes = await updatePaymentStatus(id, 'Pending', userName, userRole);
    if (!isApiResultSuccessful(payRes)) {
      if (progressTracker) progressTracker.error();
      else closePopup();
      return { generatedNo: '' };
    }

    safeLogRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Payment Status (by Confirmation Toggle)',
      oldValue: paymentStatus || '',
      newValue: 'Pending',
    }), 'set payment status pending on unconfirm');

    event.data.paymentStatus = 'Pending';
  }

  // ── SkillsFuture Invoice Toggle (Confirm or Unconfirm) ──────────────────
  if (isApiResultSuccessful(res) && shouldToggleSFInvoiceStatus) {
    if (progressTracker) progressTracker.advance(); // → Next step

    if (newValue === true && isPendingSF) {
      // ── CONFIRMING: Set payment status to "Generating SkillsFuture Invoice" ──
      const sfRes = await updatePaymentStatus(id, 'Generating SkillsFuture Invoice', userName, userRole);
      if (!isApiResultSuccessful(sfRes)) {
        if (progressTracker) progressTracker.error();
        else closePopup();
        return { generatedNo: '' };
      }

      safeLogRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Payment Status (Auto - SkillsFuture Confirmation)',
        oldValue: paymentStatus || 'Pending',
        newValue: 'Generating SkillsFuture Invoice',
      }), 'set payment status generating skillsfuture invoice on confirmation');

      await updateFinalPaymentMethodIfNeeded({
        id, sn, userName, participantInfo,
        paymentMethod,
        currentFinalPaymentMethod: courseInfo?.finalPaymentMethod,
      });

      event.data.paymentStatus = 'Generating SkillsFuture Invoice';

      // ── Step 3: Advance to generate invoice ──────────────────────────────
      if (progressTracker) progressTracker.advance(); // → Generating invoice number

      try {
        const generatedInvoice = await autoReceiptGenerator(
          id,
          participantInfo,
          courseInfo,
          officialInfo,
          paymentMethod,
          'Generating SkillsFuture Invoice',
          progressTracker
        );
        if (generatedInvoice && typeof generatedInvoice === 'object' && generatedInvoice.receiptNo) {
          generatedNo = generatedInvoice.receiptNo;
          generatedInvoiceData = generatedInvoice;
          event.data.recinvNo = generatedNo;
        } else if (typeof generatedInvoice === 'string' && generatedInvoice) {
          generatedNo = generatedInvoice;
          event.data.recinvNo = generatedNo;
        }
      } catch (err) {
        console.error('SkillsFuture invoice generation failed:', err);
        if (progressTracker) progressTracker.error();
        else closePopup();
        return { generatedNo: '' };
      }
    } else if (newValue === false && isGeneratingSFInvoice) {
      // ── UNCONFIRMING: Revert to Pending ──
      const pendingRes = await updatePaymentStatus(id, 'Pending', userName, userRole);
      if (!isApiResultSuccessful(pendingRes)) {
        if (progressTracker) progressTracker.error();
        else closePopup();
        return { generatedNo: '' };
      }

      safeLogRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Payment Status (Auto - SkillsFuture Unconfirmation)',
        oldValue: 'Generating SkillsFuture Invoice',
        newValue: 'Pending',
      }), 'revert payment status to pending on unconfirmation');

      event.data.paymentStatus = 'Pending';

      if (hasExistingReceiptNo) {
        await appendVoidedNumberRemark({
          id,
          event,
          existingReceiptNo,
          reason: 'SkillsFuture confirmation removed',
        });
        event.data.recinvNo = '';
      }

      if (shouldSetSubmittedOnUnconfirm) {
        if (progressTracker) progressTracker.advance();

        const regRes = await editRegistrationField(id, 'registrationStatus', 'Submitted');
        if (isApiResultSuccessful(regRes)) {
          safeLogRegistrationUpdate(buildLogPayload({
            userName, sn, id, participantInfo,
            columnName: 'Registration Status (by Confirmation Toggle)',
            oldValue: currentRegistrationStatus || '',
            newValue: 'Submitted',
          }), 'set registration status submitted on unconfirmation');
          event.data.registrationStatus = 'Submitted';
        }
      }
    }
  }

  if (event.api && typeof event.api.refreshCells === 'function') {
    event.api.refreshCells({
      rowNodes: [event.node],
      columns: ['confirmed', 'paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'registrationStatus', 'recinvNo', 'remarks'],
      force: true,
    });
  }

  await waitForNextPaint();
  if (progressTracker) progressTracker.finish(generatedInvoiceData);
  else closePopup();

  return { generatedNo };

}

/**
 * Triggers SkillsFuture invoice generation after a participant is confirmed.
 */
export async function handleSkillsFutureConfirmation({
  id, sn, userName, userRole,
  participantInfo, courseInfo, officialInfo,
  paymentMethod, paymentStatus,
  autoReceiptGenerator,
}) {
  const sfRes = await updatePaymentStatus(id, 'Generating SkillsFuture Invoice', userName, userRole);

  if (!isApiResultSuccessful(sfRes)) return '';

  safeLogRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Payment Status (Auto - SkillsFuture)',
    oldValue: paymentStatus || 'Pending',
    newValue: 'Generating SkillsFuture Invoice',
  }), 'handleSkillsFutureConfirmation');

  await updateFinalPaymentMethodIfNeeded({
    id, sn, userName, participantInfo,
    paymentMethod,
    currentFinalPaymentMethod: courseInfo?.finalPaymentMethod,
  });

  const generatedInvoice = await autoReceiptGenerator(id, participantInfo, courseInfo, officialInfo, paymentMethod, 'Generating SkillsFuture Invoice');
  if (generatedInvoice && typeof generatedInvoice === 'object' && generatedInvoice.receiptNo) {
    return generatedInvoice;
  }
  if (typeof generatedInvoice === 'string') {
    return generatedInvoice || '';
  }
  return '';
}
