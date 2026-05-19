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
  const { userName, userRole, progressTracker, showUpdatePopup, closePopup } = context;
  const id = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for registration status update');
  }
  const sn = event.data.sn;
  const participantInfo = event.data.participantInfo;
  const newValue = event.value;
  const oldValue = event.oldValue;
  const currentPaymentStatus = String(event.data.paymentStatus || '').trim();
  const nextPaymentStatus =
    newValue === 'Submitted'
      ? 'Pending'
      : (newValue === 'Cancellation For Duplication' || newValue === 'Withdrawn')
        ? 'To Refund'
        : '';
  const shouldUpdatePaymentStatus = !!nextPaymentStatus && currentPaymentStatus !== nextPaymentStatus;

  if (newValue === oldValue) {
    return { updated: false };
  }

  if (progressTracker) {
    progressTracker.start(
      shouldUpdatePaymentStatus
        ? ['Updating registration status', 'Updating payment status']
        : ['Updating registration status']
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
    if (progressTracker) progressTracker.advance();

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
