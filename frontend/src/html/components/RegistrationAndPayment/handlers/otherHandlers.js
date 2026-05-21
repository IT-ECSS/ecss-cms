/**
 * Other handlers for AG-Grid cell changes.
 * Handles remarks, refund dates, and generic field updates.
 */

import {
  editRegistrationField,
  addCancelRemarks,
  updatePaymentStatus,
} from '../services/registrationApi';

import {
  buildLogPayload,
  resolveEventId,
  isApiResultSuccessful,
  waitForNextPaint,
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
 * When a refund date is entered, automatically changes payment status to "Refunded"
 * and increases WooCommerce stock (vacancies) for NSA courses.
 */
export async function handleRefundedDateChange(event, context) {
  const { userName, progressTracker, showUpdatePopup, closePopup, updateWooCommerce } = context;

  const id          = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for refunded date update');
  }
  const sn          = event.data.sn;
  const newValue    = event.value;
  const participantInfo = event.data.participantInfo;
  const courseInfo       = event.data.courseInfo;
  const currentPaymentStatus = String(event.data.paymentStatus || '').trim();
  const registrationStatus = String(event.data.registrationStatus || '').trim();
  const courseName    = event.data.course;
  const courseChiName = event.data.courseChi;
  const courseLocation = event.data.location;

  // Check if refund date is being added (newValue is not empty and oldValue was empty)
  const isAddingRefundDate = newValue && !event.oldValue;
  const shouldAutoChangeToRefunded = isAddingRefundDate && currentPaymentStatus !== 'Refunded';
  
  const shouldIncreaseWooCommerceStock =
    isAddingRefundDate &&
    (currentPaymentStatus === 'Paid' || currentPaymentStatus === 'SkillsFuture Done') &&
    (registrationStatus === 'Cancellation For Duplication' || registrationStatus === 'Withdrawn');

  // Update refunded date field
  await editRegistrationField(id, event.colDef.field, newValue);

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Refunded Date',
    oldValue: event.oldValue || '',
    newValue,
  }));

  // If refund date was added and payment status is not already Refunded, update it
  if (shouldAutoChangeToRefunded) {
    const steps = ['The payment status will be updated to Refunded'];
    
    // Always prepare to update WooCommerce when refunding (applies to all course types and payment methods)
    if (shouldIncreaseWooCommerceStock) {
      steps.push('The vacancies counter will increase back by 1');
    }

    if (progressTracker) {
      progressTracker.start(steps);
    } else {
      showUpdatePopup('Updating in progress... Please wait ...');
    }

    // Update payment status to Refunded
    const statusRes = await updatePaymentStatus(id, 'Refunded', userName, '');
    if (!isApiResultSuccessful(statusRes)) {
      if (progressTracker) progressTracker.error();
      else closePopup();
      throw new Error(`Failed to update payment status to Refunded for registration ${id}`);
    }

    event.data.paymentStatus = 'Refunded';

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Payment Status (by Refund Date)',
      oldValue: currentPaymentStatus || '',
      newValue: 'Refunded',
    }));

    // Update WooCommerce stock if applicable (Step 2)
    if (shouldIncreaseWooCommerceStock) {
      if (progressTracker) progressTracker.advance(); // → Step 2: Increase vacancies
      console.log(`Calling updateWooCommerce for ${courseChiName}/${courseName} at ${courseLocation} with status Refunded`);
      try {
        const wooRes = await updateWooCommerce(courseChiName, courseName, courseLocation, 'Refunded');
        if (!isApiResultSuccessful(wooRes)) {
          console.error('WooCommerce update failed:', wooRes);
          if (progressTracker) progressTracker.error();
          else closePopup();
          throw new Error(`Failed to update WooCommerce stock for course ${courseName}`);
        }
      } catch (wooError) {
        console.error('Error updating WooCommerce stock:', wooError);
        if (progressTracker) progressTracker.error();
        else closePopup();
        throw wooError;
      }
    }

    // Refresh table cells
    if (event.api && typeof event.api.refreshCells === 'function') {
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: ['paymentStatus', 'paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'refundedDate'],
        force: true,
      });
    }

    await waitForNextPaint();
    if (progressTracker) progressTracker.finish();
    else closePopup();
  }
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
