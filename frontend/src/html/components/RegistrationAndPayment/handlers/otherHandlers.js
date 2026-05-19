/**
 * Other handlers for AG-Grid cell changes.
 * Handles remarks, refund dates, and generic field updates.
 */

import {
  editRegistrationField,
  addCancelRemarks,
} from '../services/registrationApi';

import {
  buildLogPayload,
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
 * Generic handler for any other editable column — persists the raw field value.
 */
export async function handleGenericFieldChange(event) {
  const id = resolveEventId(event.data);
  if (!id) {
    throw new Error(`Missing MongoDB _id for field update: ${event.colDef.field}`);
  }
  await editRegistrationField(id, event.colDef.field, event.value);
}
