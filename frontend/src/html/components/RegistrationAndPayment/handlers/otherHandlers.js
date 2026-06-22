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

  // Add detailed logging to diagnose the value issue
  console.log('📝 [Remarks Change] Event received:', {
    id,
    newValueType: typeof newValue,
    newValueLength: typeof newValue === 'string' ? newValue.length : 'N/A',
    newValue: typeof newValue === 'string' ? newValue.substring(0, 100) : newValue,
    eventValue: typeof event.value === 'string' ? event.value.substring(0, 100) : typeof event.value,
    eventOldValue: typeof event.oldValue === 'string' ? event.oldValue.substring(0, 100) : typeof event.oldValue,
    eventColDef: event.colDef?.field,
  });

  // Keep legacy append behavior for non-empty remarks, but allow explicit clear.
  if (forceClearThenAppendReason) {
    console.log('📝 [Remarks Update] Force clear then append for registration:', id);
    try {
      await addCancelRemarks(id, ''); // Clear first using proper addCancelRemarks path
      const response = await addCancelRemarks(id, String(newValue ?? '').trim());
      console.log('📝 [Remarks Update] Backend response:', response);
      
      // Update both possible data locations in the row to ensure UI refresh
      const finalRemarks = String(newValue ?? '').trim();
      event.data.remarks = finalRemarks;
      event.data.officialInfo = event.data.officialInfo || {};
      event.data.officialInfo.remarks = finalRemarks;
      event.data.official = event.data.official || {};
      event.data.official.remarks = finalRemarks;
      
      console.log('📝 [Remarks Update] Row data updated locally:', event.data);
      
      // Force grid refresh for this row's remarks cell with a slight delay to ensure DB sync
      if (event.api && event.node) {
        await waitForNextPaint();
        console.log('📝 [Remarks Update] Refreshing remarks cell in grid');
        event.api.refreshCells({ rowNodes: [event.node], columns: ['remarks'], force: true });
      }
    } catch (error) {
      console.error('📝 [Remarks Update] Error in force clear then append:', error);
      throw error;
    }
  } else if (String(newValue ?? '').trim() === '') {
    // Clearing remarks: use addCancelRemarks with empty string for proper backend clearing
    console.log('🗑️ [Remarks Clear] Clearing remarks for registration:', id);
    
    try {
      const response = await addCancelRemarks(id, '');
      console.log('🗑️ [Remarks Clear] Backend response:', response);
      
      // Update both possible data locations in the row to ensure UI refresh
      event.data.remarks = '';
      event.data.officialInfo = event.data.officialInfo || {};
      event.data.officialInfo.remarks = '';
      event.data.official = event.data.official || {};
      event.data.official.remarks = '';
      
      console.log('🗑️ [Remarks Clear] Row data updated locally:', event.data);
      
      // Force grid refresh for this row's remarks cell with a slight delay to ensure DB sync
      if (event.api && event.node) {
        await waitForNextPaint();
        console.log('🗑️ [Remarks Clear] Refreshing remarks cell in grid');
        event.api.refreshCells({ rowNodes: [event.node], columns: ['remarks'], force: true });
      }
    } catch (error) {
      console.error('🗑️ [Remarks Clear] Error clearing remarks:', error);
      throw error;
    }
  } else {
    // Adding/updating remarks
    console.log('📝 [Remarks Update] Adding/updating remarks for registration:', id, 'New value:', newValue);
    try {
      const response = await addCancelRemarks(id, newValue);
      console.log('📝 [Remarks Update] Backend response:', response);
      
      // Update both possible data locations in the row to ensure UI refresh
      event.data.remarks = newValue;
      event.data.officialInfo = event.data.officialInfo || {};
      event.data.officialInfo.remarks = newValue;
      event.data.official = event.data.official || {};
      event.data.official.remarks = newValue;
      
      console.log('📝 [Remarks Update] Row data updated locally:', event.data);
      
      // Force grid refresh for this row's remarks cell with a slight delay to ensure DB sync
      if (event.api && event.node) {
        await waitForNextPaint();
        console.log('📝 [Remarks Update] Refreshing remarks cell in grid');
        event.api.refreshCells({ rowNodes: [event.node], columns: ['remarks'], force: true });
      }
    } catch (error) {
      console.error('📝 [Remarks Update] Error adding/updating remarks:', error);
      throw error;
    }
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
  const paymentStatusSkillsFuture = String(event.data.paymentStatusSkillsFuture || '').trim();
  const shouldAutoChangeToRefunded = isAddingRefundDate && 
    currentPaymentStatus !== 'Refunded' && 
    currentPaymentStatus !== 'SkillsFuture Done' &&
    paymentStatusSkillsFuture !== 'To refund';
  const courseType = String(courseInfo?.courseType || '').trim();
  
  // For SkillsFuture refunds: increase WooCommerce stock when transitioning from "To refund" to "Refunded"
  const shouldIncreaseWooCommerceStock =
    courseType === 'NSA' &&
    isAddingRefundDate &&
    currentPaymentStatus === 'To refund' &&
    (registrationStatus === 'Cancellation for duplication' || registrationStatus === 'Withdrawn');

  // DEBUG LOGGING: Show all conditions at the start
  console.log('🔍 [Refund Date Handler] Entry Point Debug:', {
    courseName,
    courseType,
    isAddingRefundDate,
    currentPaymentStatus,
    registrationStatus,
    shouldAutoChangeToRefunded,
    shouldIncreaseWooCommerceStock,
    checks: {
      isCourseNSA: courseType === 'NSA',
      isAddingDate: isAddingRefundDate,
      isPaidOrSkillsFuture: currentPaymentStatus === 'Paid' || currentPaymentStatus === 'SkillsFuture Done',
      isCancelledOrWithdrawn: registrationStatus === 'Cancellation for duplication' || registrationStatus === 'Withdrawn',
    }
  });

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
    console.log('✅ [Refund Date Handler] shouldAutoChangeToRefunded = TRUE, starting refund flow');
    
    const steps = ['The payment status will be updated to Refunded'];
    
    // Always prepare to update WooCommerce when refunding (applies to all course types and payment methods)
    if (shouldIncreaseWooCommerceStock) {
      console.log('✅ [Refund Date Handler] shouldIncreaseWooCommerceStock = TRUE, will update WooCommerce');
      steps.push('The vacancies counter will increase back by 1');
    } else {
      console.log('⚠️ [Refund Date Handler] shouldIncreaseWooCommerceStock = FALSE, skipping WooCommerce update');
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

    // Advance progress after Step 1: Payment Status Updated
    if (progressTracker) {
      progressTracker.advance(); // → Step 2: Increase vacancies or finish
      console.log('✅ [Step 1] Payment Status Updated to Refunded');
    }

    // Update WooCommerce stock if applicable (Step 2)
    if (shouldIncreaseWooCommerceStock) {
      console.log('📊 [Refund Date Handler] Starting Step 2: Update WooCommerce', {
        courseType,
        courseName,
        courseChiName,
        courseLocation,
        currentPaymentStatus,
        registrationStatus,
      });
      
      if (progressTracker) {
        console.log('🔄 [Step 2] Advancing to: Vacancies Counter Update');
        progressTracker.advance();
      }
      
      console.log(`↓ Calling updateWooCommerce for ${courseChiName}/${courseName} at ${courseLocation} with status "Refunded"`);
      try {
        const wooRes = await updateWooCommerce(courseChiName, courseName, courseLocation, 'Refunded');
        
        console.log('📨 WooCommerce Response:', wooRes);
        
        if (!isApiResultSuccessful(wooRes)) {
          console.error('❌ WooCommerce update failed:', wooRes);
          if (progressTracker) progressTracker.error();
          else closePopup();
          throw new Error(`Failed to update WooCommerce stock for course ${courseName}`);
        }
        
        console.log('✅ [Step 2] Vacancies Counter Successfully Updated - Stock increased by 1');
        
        if (progressTracker) {
          progressTracker.advance(); // → Mark Step 2 complete and prepare to finish
          console.log('🔄 [Step 2] Progress advancing to completion');
        }
      } catch (wooError) {
        console.error('❌ Error calling updateWooCommerce:', wooError);
        if (progressTracker) progressTracker.error();
        else closePopup();
        throw wooError;
      }
    } else {
      console.log('⚠️ [Refund Date Handler] Skipping WooCommerce update:', {
        courseType,
        isAddingRefundDate,
        currentPaymentStatus,
        registrationStatus,
      });
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
  } else {
    console.log('⚠️ [Refund Date Handler] Refund flow NOT triggered:', {
      isAddingRefundDate,
      currentPaymentStatus,
      reason: !isAddingRefundDate 
        ? 'No refund date being added' 
        : currentPaymentStatus === 'Refunded'
          ? 'Payment status is already Refunded'
          : 'Unknown reason'
    });
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

/**
 * Handles changes to the "Sending Payment Details" column.
 * Sends WhatsApp payment details to participant via the backend.
 */
export async function handleSendingPaymentDetailsChange(event, context) {
  const id = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for sending payment details');
  }

  // Call backend to update sendingWhatsappMessage field
  try {
    const response = await fetch(
      `${window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://ecss-backend-node.azurewebsites.net'}/courseregistration`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purpose: 'sendDetails',
          id: id,
        }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to send payment details');
    }

    console.log('✓ Payment details sent successfully for registration:', id);
  } catch (error) {
    console.error('Error sending payment details:', error);
    throw error;
  }
}
