/**
 * Payment status handlers for AG-Grid cell changes.
 * Handles all payment status column updates and related side-effects.
 */

import {
  updatePaymentStatus,
  editRegistrationField,
  addCancelRemarks,
  addRefundedDate,
  removeRefundedDate,
} from '../services/registrationApi';

import {
  isApiResultSuccessful,
  inferDocumentType,
  buildLogPayload,
  autoSetConfirmedSlotRegistrationStatus,
  appendVoidedNumberRemark,
  updateFinalPaymentMethodIfNeeded,
  waitForNextPaint,
  resolveEventId,
} from './handlerHelpers';

import { logRegistrationUpdate } from '../../../../utils/auditLog';

/**
 * Handles changes to the "Registration and Payment Status", "Registration Status",
 * or "Payment Status" columns.
 */
export async function handlePaymentStatusChange(event, context) {
  const { userName, userRole, progressTracker, showUpdatePopup, closePopup, updateWooCommerce, receiptGenerator, refreshChild } = context;

  const id = resolveEventId(event.data);
  const sn               = event.data.sn;
  const columnName       = event.colDef.headerName;
  const courseName       = event.data.course;
  const courseChiName    = event.data.courseChi;
  const courseLocation   = event.data.location;
  const newValue         = event.value;
  const oldPaymentStatus = event.oldValue;
  const participantInfo  = event.data.participantInfo;
  const courseInfo       = event.data.courseInfo;
  const officialInfo     = event.data.officialInfo;
  const paymentMethod    = String(
    event.data.finalPaymentMethod ||
    event.data.paymentMethod ||
    courseInfo?.finalPaymentMethod ||
    courseInfo?.payment ||
    officialInfo?.paymentMethod ||
    ''
  ).trim();
  const existingReceiptNo = String(event.data.recinvNo || officialInfo?.receiptNo || '').trim();
  const hasExistingReceiptNo = existingReceiptNo !== '';
  const existingDocType = inferDocumentType(existingReceiptNo);
  const shouldReplaceWithReceipt = hasExistingReceiptNo && existingDocType === 'invoice';

  const shouldGenerateInvoice = paymentMethod === 'SkillsFuture' && newValue === 'Generating SkillsFuture Invoice';
  const shouldRemoveExistingInvoice = shouldGenerateInvoice && hasExistingReceiptNo;
  const shouldSetConfirmedSlot =
    newValue === 'SkillsFuture Done' ||
    ((paymentMethod === 'Cash' || paymentMethod === 'PayNow') && newValue === 'Paid');
  const shouldGenerateReceipt =
    (paymentMethod === 'Cash' || paymentMethod === 'PayNow') &&
    newValue === 'Paid' &&
    (!hasExistingReceiptNo || shouldReplaceWithReceipt);

  // Always use the tracker when available; steps adjust based on what will happen.
  const useTracker = progressTracker;

  const isCurrentlyConfirmed = event.data.confirmed !== false; // treat missing/null as confirmed

  const steps = ['Updating payment status'];
  if (shouldSetConfirmedSlot) {
    // For Cash/PayNow: always update registration status when Paid (not affected by confirmation status)
    // For SkillsFuture Done: only update if currently confirmed
    if ((paymentMethod === 'Cash' || paymentMethod === 'PayNow') || isCurrentlyConfirmed) {
      steps.push('Updating registration status');
      if (shouldGenerateInvoice) {
        steps.push('Updating payment status');
      }
    }
  }
  if (shouldGenerateReceipt) {
    steps.push('Generating receipt', 'Recording payment date and time', 'Downloading and previewing receipt');
  } else if (shouldGenerateInvoice) {
    steps.push('Generating SkillsFuture invoice', 'Downloading and previewing invoice');
  }
  if (newValue === 'SkillsFuture Done') steps.push('Recording payment date and time');

  if (useTracker) {
    progressTracker.start(steps);
  } else {
    showUpdatePopup('Updating in progress... Please wait ...');
  }

  // ── Step 1: Update payment status ───────────────────────────────────────
  const res = await updatePaymentStatus(id, newValue, userName, userRole);

  if (!isApiResultSuccessful(res)) {
    if (useTracker) progressTracker.error();
    else closePopup();
    return { generatedNo: '' };
  }

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName,
    oldValue: oldPaymentStatus,
    newValue,
  }));

  // Update frontend state immediately after backend call
  event.data.paymentStatus = newValue;

  const finalMethodUpdated = await updateFinalPaymentMethodIfNeeded({
    id, sn, userName, participantInfo,
    paymentMethod: event.data.paymentMethod,
    currentFinalPaymentMethod: event.data.finalPaymentMethod,
  });
  if (finalMethodUpdated) {
    event.data.finalPaymentMethod = event.data.paymentMethod;
  }

  let generatedNo = '';
  let stepIdx = 1; // steps[0] is 'Updating payment status', already done

  // ── Step 2: Update confirmation status (if applicable) ──────────────────
  if (shouldSetConfirmedSlot && ((paymentMethod === 'Cash' || paymentMethod === 'PayNow') || isCurrentlyConfirmed)) {
    if (useTracker) progressTracker.advance(); // → Updating registration status

    const updated = await autoSetConfirmedSlotRegistrationStatus({
      id, sn, userName, participantInfo,
      currentRegistrationStatus: event.data.registrationStatus,
    });
    if (updated) {
      event.data.registrationStatus = 'Confirmed Slot';
    }

    // For SF invoice: advance to 'Updating payment status to Pending' and do it now
    if (shouldGenerateInvoice) {
      if (useTracker) progressTracker.advance(); // → Updating payment status to Pending
      await updatePaymentStatus(id, 'Pending', userName, userRole);
      event.data.paymentStatus = 'Pending';

      // If an existing invoice number is present, void it as part of confirmation
      if (shouldRemoveExistingInvoice) {
        await appendVoidedNumberRemark({
          id,
          event,
          existingReceiptNo,
          reason: 'new SkillsFuture invoice generated',
        });
        event.data.recinvNo = '';
      }
    }

    stepIdx++;
  }

  // ── Step 3: Generate receipt / invoice (Cash/PayNow) ────────────────────
  let receiptData = null;
  if (paymentMethod === 'Cash' || paymentMethod === 'PayNow') {
    if (shouldReplaceWithReceipt) {
      await appendVoidedNumberRemark({
        id,
        event,
        existingReceiptNo,
        reason: `payment status changed to ${newValue} for ${paymentMethod}`,
      });
      event.data.recinvNo = '';
    }

    if (shouldGenerateReceipt && useTracker) progressTracker.advance(); // → Generating receipt

    const result = await handleCashPayNowStatusChange({
      id, courseName, courseChiName, courseLocation,
      newValue, oldPaymentStatus,
      participantInfo, courseInfo, officialInfo,
      updateWooCommerce, receiptGenerator,
      shouldGenerateReceipt,
    });
    
    if (result && typeof result === 'object' && result.receiptNo) {
      // Result is the full receipt data object { receiptNo, blob, filename }
      generatedNo = result.receiptNo;
      receiptData = result;
      event.data.recinvNo = generatedNo;
    } else if (typeof result === 'string' && result) {
      // Legacy: result is just the receipt number
      generatedNo = result;
      event.data.recinvNo = generatedNo;
    }

    if (shouldGenerateReceipt && useTracker) {
      progressTracker.advance(); // → Recording payment date and time

      if (generatedNo) {
        const _now = new Date();
        const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
        const _paymentDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
        const _paymentTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
        event.data.paymentDate = _paymentDate;
        event.data.paymentTime = _paymentTime;
        if (event.data.officialInfo) {
          event.data.officialInfo.date = _paymentDate;
          event.data.officialInfo.time = _paymentTime;
        }
        if (event.api && typeof event.api.refreshCells === 'function') {
          event.api.refreshCells({
            rowNodes: [event.node],
            columns: ['recinvNo', 'paymentDate', 'paymentTime'],
            force: true,
          });
        }
        progressTracker.advance(); // → Downloading and previewing receipt
      }
    }
  } else if (paymentMethod === 'SkillsFuture') {
    // Advance: last confirmation step → Generating SkillsFuture invoice
    if (shouldGenerateInvoice && useTracker) progressTracker.advance();

    const result = await handleSkillsFutureStatusChange({
      id, courseName, courseChiName, courseLocation,
      newValue, oldPaymentStatus,
      participantInfo, courseInfo, officialInfo,
      updateWooCommerce, receiptGenerator,
    });
    
    if (result && typeof result === 'object' && result.receiptNo) {
      generatedNo = result.receiptNo;
      receiptData = result;
      event.data.recinvNo = generatedNo;
    } else if (typeof result === 'string' && result) {
      generatedNo = result;
      event.data.recinvNo = generatedNo;
    }

    // Advance: Generating SkillsFuture invoice → Downloading and previewing invoice
    if (receiptData && useTracker && steps.length > 3) {
      progressTracker.advance();
    }

    // SkillsFuture Done: record payment date and time in local grid
    if (newValue === 'SkillsFuture Done' && useTracker) {
      progressTracker.advance(); // → Recording payment date and time

      const _now = new Date();
      const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
      const _paymentDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
      const _paymentTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
      event.data.paymentDate = _paymentDate;
      event.data.paymentTime = _paymentTime;
      if (event.data.officialInfo) {
        event.data.officialInfo.date = _paymentDate;
        event.data.officialInfo.time = _paymentTime;
      }
      if (event.api && typeof event.api.refreshCells === 'function') {
        event.api.refreshCells({
          rowNodes: [event.node],
          columns: ['paymentDate', 'paymentTime'],
          force: true,
        });
      }
    }
  } else if (courseInfo.courseType === 'ILP' || courseInfo.courseType === 'Talks And Seminar') {
    await handleILPOrTalksStatusChange({
      courseName, courseChiName, courseLocation,
      newValue,
      updateWooCommerce,
    });
  }

  // Refresh cells to reflect payment status and related changes
  if (event.api && typeof event.api.refreshCells === 'function') {
    event.api.refreshCells({
      rowNodes: [event.node],
      columns: ['paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'registrationStatus', 'recinvNo', 'paymentDate', 'paymentTime', 'remarks'],
      force: true,
    });
  }

  await waitForNextPaint();
  if (useTracker) {
    // Queue a table reload so the latest server values are shown once the modal closes.
    if (refreshChild) refreshChild();
    progressTracker.finish(receiptData);
  } else {
    closePopup();
  }

  return { generatedNo };
}

/**
 * Side-effects for Cash / PayNow payment method when the status changes.
 * Returns: { receiptNo, blob, filename } or empty string
 */
export async function handleCashPayNowStatusChange({
  id, courseName, courseChiName, courseLocation,
  newValue, oldPaymentStatus,
  participantInfo, courseInfo, officialInfo,
  updateWooCommerce, receiptGenerator,
  shouldGenerateReceipt = true,
}) {
  if ((newValue === 'To refund' || newValue === 'To refund' || newValue === 'Withdrawn') && oldPaymentStatus === 'Paid') {
    await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
    await removeRefundedDate(id);
    return '';
  } else if (newValue === 'Refunded') {
    await addRefundedDate(id);
    return '';
  } else {
    if (!shouldGenerateReceipt) {
      await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      return '';
    }

    const [, generatedNo] = await Promise.all([
      updateWooCommerce(courseChiName, courseName, courseLocation, newValue),
      receiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue),
    ]);
    return generatedNo || '';
  }

  return '';
}

/**
 * Side-effects for SkillsFuture payment method when the status changes.
 * Returns: { receiptNo, blob, filename } or empty string
 */
export async function handleSkillsFutureStatusChange({
  id, courseName, courseChiName, courseLocation,
  newValue, oldPaymentStatus,
  participantInfo, courseInfo, officialInfo,
  updateWooCommerce, receiptGenerator,
}) {
  // Generate SkillsFuture invoice when status changes to "Generating SkillsFuture Invoice"
  if (newValue === 'Generating SkillsFuture Invoice') {
    try {
      const result = await receiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue);
      return result || '';
    } catch (error) {
      console.error('Error generating SkillsFuture invoice:', error);
      return '';
    }
  } else if (newValue === 'SkillsFuture Done') {
    await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
    return '';
  } else if (newValue === 'Cancelled' || newValue === 'Refunded' || newValue === 'Withdrawn' || newValue === 'To Refund' || newValue === 'To refund') {
    if (oldPaymentStatus === 'SkillsFuture Done') {
      await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      await removeRefundedDate(id);
    } else if (newValue === 'Refunded') {
      await addRefundedDate(id);
    }
    return '';
  }
  
  return '';
}

/**
 * Side-effects for ILP / Talks And Seminar course types when the status changes.
 */
export async function handleILPOrTalksStatusChange({
  courseName, courseChiName, courseLocation,
  newValue,
  updateWooCommerce,
}) {
  const statuses = ['Confirmed', 'Paid', 'Cancelled', 'Withdrawn', 'Not Successful'];
  if (statuses.includes(newValue)) {
    await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
  }
}
