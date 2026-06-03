/**
 * Registration status handler for AG-Grid cell changes.
 * Handles registration status updates and cascading payment status changes.
 */

import {
  editRegistrationField,
  updatePaymentStatus,
} from '../services/registrationApi';

import {
  isApiResultSuccessful,
  buildLogPayload,
  waitForNextPaint,
  resolveEventId,
} from './handlerHelpers';

import { logRegistrationUpdate } from '../../../../utils/auditLog';

/**
 * Handles changes to the "Registration Status" column.
 * When status changes to Submitted, Cancellation For Duplication, or Withdrawn,
 * the payment status is also updated automatically.
 * Payment date and time are preserved for all status transitions.
 */
export async function handleRegistrationStatusChange(event, context) {
  const { userName, userRole, progressTracker, showUpdatePopup, closePopup, updateWooCommerce } = context;
  const id = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for registration status update');
  }
  const sn = event.data.sn;
  const participantInfo = event.data.participantInfo;
  const courseInfo = event.data.courseInfo;
  const newValue = event.value;
  const oldValue = event.oldValue;
  const currentPaymentStatus = String(event.data.paymentStatus || '').trim();
  const officialInfo = event.data.officialInfo || {};
  const courseName = event.data.course;
  const courseChiName = event.data.courseChi;
  const courseLocation = event.data.location;
  const courseType = String(courseInfo?.courseType || '').trim();
  
  const isCancelledBeforePayment = newValue === 'Cancelled (before payment)';
  const isWithdrawn = newValue === 'Withdrawn';
  const isRefundRegistrationStatus = isCancelledBeforePayment || isWithdrawn;
  
  const registrationStatusTrackerLabel =
    isCancelledBeforePayment
      ? 'The registration status will be updated to Cancelled (before payment)'
      : isWithdrawn
        ? 'The registration status will be updated to Withdrawn'
        : 'Updating The Registration Status';
  const nextPaymentStatus =
    newValue === 'Submitted'
      ? 'Pending'
      : isCancelledBeforePayment
        ? ''  // NO payment status change for Cancelled (before payment) - only 1 step
        : isWithdrawn
          ? 'To refund'  // ALWAYS "To refund" for Withdrawn
          : '';
  const shouldUpdatePaymentStatus = !!nextPaymentStatus && currentPaymentStatus !== nextPaymentStatus;
  const paymentStatusTrackerLabel =
    nextPaymentStatus === 'To refund'
      ? 'The payment status will be updated to To Refund'
      : nextPaymentStatus === 'Refunded'
        ? 'The payment status will be updated to Refunded'
        : nextPaymentStatus === 'Pending'
          ? 'The payment status will be updated to Pending'
          : 'Updating The Payment Status';
  const vacanciesTrackerLabel =
    nextPaymentStatus === 'Refunded'
      ? 'Updating Vacancies Counted'
      : 'Updating Vacancies Counted';
  const shouldIncreaseWooCommerceStock =
    courseInfo?.courseType === 'NSA' &&
    nextPaymentStatus === 'Refunded' &&
    (currentPaymentStatus === 'Paid' || currentPaymentStatus === 'SkillsFuture Done');
  const useRefundedTracker = shouldUpdatePaymentStatus && shouldIncreaseWooCommerceStock;

  if (newValue === oldValue) {
    return { updated: false };
  }

  if (progressTracker) {
    progressTracker.start(
      useRefundedTracker
        ? [paymentStatusTrackerLabel, vacanciesTrackerLabel]
        : shouldUpdatePaymentStatus
          ? [registrationStatusTrackerLabel, paymentStatusTrackerLabel]
        : [registrationStatusTrackerLabel]
    );
  } else {
    showUpdatePopup('Updating in progress... Please wait ...');
  }

  await editRegistrationField(id, 'registrationStatus', newValue);

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Registration Status',
    oldValue: oldValue || '',
    newValue,
  }));

  event.data.registrationStatus = newValue;

  if (shouldUpdatePaymentStatus) {
    if (progressTracker && !useRefundedTracker) progressTracker.advance();

    const statusRes = await updatePaymentStatus(id, nextPaymentStatus, userName, userRole);
    if (!isApiResultSuccessful(statusRes)) {
      if (progressTracker) progressTracker.error();
      else closePopup();
      throw new Error(`Failed to update payment status to ${nextPaymentStatus} for registration ${id}`);
    }

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Payment Status (by Registration Status)',
      oldValue: currentPaymentStatus || '',
      newValue: nextPaymentStatus,
    }));

    event.data.paymentStatus = nextPaymentStatus;

    if (shouldIncreaseWooCommerceStock) {
      if (progressTracker) progressTracker.advance();
      await updateWooCommerce(courseChiName, courseName, courseLocation, nextPaymentStatus);
    }
  }

  if (event.api && typeof event.api.refreshCells === 'function') {
    event.api.refreshCells({
      rowNodes: [event.node],
      columns: ['registrationStatus', 'paymentStatus', 'paymentStatusCashPayNow', 'paymentStatusSkillsFuture'],
      force: true,
    });
  }

  await waitForNextPaint();
  if (progressTracker) progressTracker.finish();
  else closePopup();

  return { updated: true };
}
