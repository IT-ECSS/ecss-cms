/**
 * Other handlers for AG-Grid cell changes.
 * Handles remarks, refund dates, registration status, and generic field updates.
 */

import {
  editRegistrationField,
  addCancelRemarks,
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
 * Handles changes to the "Remarks" column.
 */
export async function handleRemarksChange(event, context) {
  const { userName } = context;

  const id          = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for remarks update');
  }
  const sn          = event.data.sn;
  const newValue    = event.value;
  const participantInfo = event.data.participantInfo;
  const forceClearThenAppendReason = Boolean(event?.forceClearThenAppendReason);

  // Keep legacy append behavior for non-empty remarks, but allow explicit clear.
  if (forceClearThenAppendReason) {
    await editRegistrationField(id, event.colDef.field, '');
    await addCancelRemarks(id, String(newValue ?? '').trim());
  } else if (String(newValue ?? '').trim() === '') {
    await editRegistrationField(id, event.colDef.field, '');
  } else {
    await addCancelRemarks(id, newValue);
  }

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Remarks',
    oldValue: event.oldValue || '',
    newValue,
  }));
}

/**
 * Handles changes to the "Refunded Date" column.
 */
export async function handleRefundedDateChange(event, context) {
  const { userName } = context;

  const id          = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for refunded date update');
  }
  const sn          = event.data.sn;
  const newValue    = event.value;
  const participantInfo = event.data.participantInfo;

  await editRegistrationField(id, event.colDef.field, newValue);

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Refunded Date',
    oldValue: event.oldValue || '',
    newValue,
  }));
}

/**
 * Fallback handler for any other editable column — persists the raw field value.
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

/**
 * Generic handler for any other editable column — persists the raw field value.
 */
export async function handleGenericFieldChange(event) {
  const id = resolveEventId(event.data);
  if (!id) {
    throw new Error(`Missing MongoDB _id for field update: ${event.colDef.field}`);
  }
  await editRegistrationField(id, event.colDef.field, event.value);
}
