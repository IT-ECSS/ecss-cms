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

  console.log("Payment status change event:", event.data);

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
  const registrationStatus = String(event.data.registrationStatus || '').trim();
  const courseType = String(courseInfo?.courseType || '').trim();
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
  const shouldDecreaseWooCommerceStock =
    courseType === 'NSA' &&
    (((paymentMethod === 'Cash' || paymentMethod === 'PayNow') && newValue === 'Paid') ||
      (paymentMethod === 'SkillsFuture' && newValue === 'SkillsFuture Done'));
  const shouldIncreaseWooCommerceStock = 
    courseType === 'NSA' &&
    newValue === 'Refunded' &&
    (oldPaymentStatus === 'To refund' || oldPaymentStatus === 'Paid' || oldPaymentStatus === 'SkillsFuture Done') &&
    (registrationStatus === 'Cancellation before Payment' || registrationStatus === 'Cancellation after Payment' || registrationStatus === 'Withdrawn');
  const shouldSetConfirmedSlot =
    newValue === 'SkillsFuture Done' ||
    ((paymentMethod === 'Cash' || paymentMethod === 'PayNow') && newValue === 'Paid');
  const shouldSyncWooCommerceStock =
    shouldDecreaseWooCommerceStock || shouldIncreaseWooCommerceStock;
  const shouldGenerateReceipt =
    (paymentMethod === 'Cash' || paymentMethod === 'PayNow') &&
    newValue === 'Paid' &&
    (!hasExistingReceiptNo || shouldReplaceWithReceipt);

  // Always use the tracker when available; steps adjust based on what will happen.
  const useTracker = progressTracker;

  const isCurrentlyConfirmed = event.data.confirmed !== false; // treat missing/null as confirmed

  // Build step tracker based on the new payment status
  // For Paid (Cash/PayNow): 6 steps for receipt
  // For SkillsFuture Done: 4 steps (status, registration, vacancies, date/time)
  // For Refunded: 2 steps (status, vacancies) - ❌ NO confirmation status changes
  //   - Payment status updates to "Refunded"
  //   - Vacancies counter increases by 1 (for NSA courses only)
  //   - Refund date/time recorded silently
  //   - ⚠️ Confirmation Status toggle MUST remain unchanged
  let statusLabel = 'Payment Status Updated';
  if (newValue === 'Paid') {
    statusLabel = 'Payment Status Updated to Paid';
  } else if (newValue === 'SkillsFuture Done') {
    statusLabel = 'Payment Status Updated to SkillsFuture Done';
  } else if (newValue === 'Refunded') {
    statusLabel = 'The payment status will be updated to Refunded';
  }

  const steps = [statusLabel];

  // Build registration status update step
  // For Cash/PayNow Paid: always update registration status
  // For SkillsFuture Done: always update registration status  
  // For other statuses: only update if currently confirmed
  const shouldUpdateRegistrationStatusInSteps = 
    (paymentMethod === 'Cash' || paymentMethod === 'PayNow' || paymentMethod === 'SkillsFuture') ||
    isCurrentlyConfirmed;

  if (shouldSetConfirmedSlot && shouldUpdateRegistrationStatusInSteps) {
    steps.push('Registration Status Updated to Confirmed Slot');
    if (shouldGenerateInvoice) {
      steps.push('Payment Status Reset to Pending');
    }
  }
  if (shouldSyncWooCommerceStock) {
    let vacanciesLabel;
    if (shouldIncreaseWooCommerceStock) {
      vacanciesLabel = 'The vacancies counter will increase back by 1';
    } else if (shouldDecreaseWooCommerceStock) {
      vacanciesLabel = 'The vacancies counter will decrease by 1';
    } else {
      vacanciesLabel = 'Updating vacancies counter';
    }
    steps.push(vacanciesLabel);
    console.log('🔄 [Backend] WooCommerce sync step added:', { shouldIncreaseWooCommerceStock, shouldDecreaseWooCommerceStock, newValue, registrationStatus, courseType });
  } else if (newValue === 'Refunded' && courseType === 'NSA') {
    // Only show vacancies step for NSA courses when refunding
    steps.push('The vacancies counter will increase back by 1');
    console.log('🔄 [Backend] Refund vacancies step added for NSA course:', { paymentMethod, courseType });
  }
  if (shouldGenerateReceipt) {
    steps.push('Receipt Number Generated and Displayed', 'Payment Date and Time Recorded', 'Receipt Downloaded and Opened in New Tab');
  } else if (shouldGenerateInvoice) {
    steps.push('Invoice Number Generated', 'SkillsFuture Invoice Generated', 'Invoice Downloaded and Opened');
  }
  // SkillsFuture Done: add payment date and time step (only if not already added by Cash/PayNow receipt generation)
  if (newValue === 'SkillsFuture Done' && !shouldGenerateReceipt) {
    steps.push('Payment Date and Time Recorded');
  }
  // Note: Refund date/time is recorded silently after vacancies update

  console.log('📊 [Frontend] Progress tracker steps initialized:', { 
    steps: steps.length, 
    stepsList: steps, 
    newValue, 
    paymentMethod,
    shouldGenerateReceipt,
    useTracker: !!useTracker 
  });
  if (useTracker) {
    progressTracker.start(steps);
    console.log('✅ [Frontend] Progress tracker started with', steps.length, 'steps for status:', newValue);
  } else {
    showUpdatePopup('Updating in progress... Please wait ...');
  }

  // ── Step 1: Update payment status ───────────────────────────────────────
  // Pre-compute SGT date/time once for statuses that record payment date/time or refund date/time
  let _sgtPayDate, _sgtPayTime;
  if (newValue === 'Paid' || newValue === 'SkillsFuture Done' || newValue === 'Refunded') {
    const _now = new Date();
    const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
    _sgtPayDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
    _sgtPayTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
  }

  const res = await updatePaymentStatus(id, newValue, userName, userRole, _sgtPayDate, _sgtPayTime);
  console.log('Payment status updated:', { newValue, success: isApiResultSuccessful(res), hasTracker: !!useTracker, stepCount: steps.length });

  if (!isApiResultSuccessful(res)) {
    if (useTracker) progressTracker.error();
    else closePopup();
    return { generatedNo: '' };
  }

  // Extract refundedDate/Time from backend response if available (for Refunded status)
  let backendRefundedDate = '';
  let backendRefundedTime = '';
  if (newValue === 'Refunded' && res?.data?.result) {
    if (res.data.result.refundedDate) backendRefundedDate = res.data.result.refundedDate;
    if (res.data.result.refundedTime) backendRefundedTime = res.data.result.refundedTime;
    console.log('✅ [Backend] Refund date/time received:', { backendRefundedDate, backendRefundedTime });
  }

  // ── Step 1: Complete and advance to Step 2 ───────────────────────────────
  if (useTracker) {
    console.log(`✅ [Step 1] Payment Status Updated to ${newValue}`);
    console.log(`🔄 [Step 1→2] Advancing to: Registration Status Updated or Next Step`);
    progressTracker.advance(); // Step 1 done, move to Step 2 (or Step 3 if Step 2 not applicable)
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
  // For Cash/PayNow Paid: always update registration status
  // For SkillsFuture Done: always update registration status
  // For other statuses: only update if currently confirmed
  const shouldUpdateRegistrationStatus = 
    (paymentMethod === 'Cash' || paymentMethod === 'PayNow' || paymentMethod === 'SkillsFuture') ||
    isCurrentlyConfirmed;

  if (shouldSetConfirmedSlot && shouldUpdateRegistrationStatus) {
    if (useTracker) {
      console.log('🔄 [Step 2] Now Running: Registration Status Updated to Confirmed Slot');
    }

    const updated = await autoSetConfirmedSlotRegistrationStatus({
      id, sn, userName, participantInfo,
      currentRegistrationStatus: event.data.registrationStatus,
    });
    if (updated) {
      event.data.registrationStatus = 'Confirmed Slot';
      console.log('✅ [Step 2] Registration Status Updated to Confirmed Slot');
    }

    // For SF invoice: advance to 'Updating payment status to Pending' and do it now
    if (shouldGenerateInvoice) {
      if (useTracker) {
        console.log('🔄 [Step 2→3] Advancing to: Payment Status Reset to Pending');
        progressTracker.advance(); // → Updating payment status to Pending
      }
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
    } else if (useTracker && shouldSetConfirmedSlot) {
      // For SkillsFuture Done (or other non-invoice cases): advance to next step
      console.log('🔄 [Step 2→3] Advancing to: Vacancies or Payment Date/Time Step');
      progressTracker.advance(); // → Next step (Vacancies for NSA, or Payment Date/Time if not NSA)
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

    const shouldRunWooCommerceSync =
      shouldIncreaseWooCommerceStock ||
      (shouldDecreaseWooCommerceStock && String(event.data.registrationStatus || '').trim() === 'Confirmed Slot');

    // Advance to WooCommerce step if applicable (or skip if not needed)
    if (shouldRunWooCommerceSync && updateWooCommerce && typeof updateWooCommerce === 'function') {
      if (useTracker) {
        console.log('🔄 [Step 3] Advancing to: Vacancies Counter Updated');
        progressTracker.advance(); // -> Updating vacancies counter
      }
      try {
        console.log('📊 [WooCommerce Debug] Calling updateWooCommerce:', {
          courseType: courseInfo?.courseType,
          courseName,
          newValue,
          shouldDecreaseWooCommerceStock,
          shouldIncreaseWooCommerceStock,
          registrationStatus: event.data.registrationStatus,
        });
        
        const wooRes = await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
        
        // Handle both successful responses and undefined/empty responses
        if (wooRes === undefined || wooRes === null) {
          console.warn('⚠️ [Step 3] WooCommerce returned empty response - assuming sync completed silently');
        } else if (!isApiResultSuccessful(wooRes)) {
          console.error('❌ WooCommerce update failed:', wooRes);
          if (useTracker) progressTracker.error();
          else closePopup();
          throw new Error(`Failed to update WooCommerce stock for course ${courseName}`);
        }
        console.log('✅ [Step 3] Vacancies Counter Updated');
      } catch (wooError) {
        console.error('❌ Error updating WooCommerce stock:', wooError);
        // For Cash/PayNow Paid, don't fail the entire flow - WooCommerce sync is best-effort
        // Continue to next step instead of throwing
        if (newValue === 'Paid' && (paymentMethod === 'Cash' || paymentMethod === 'PayNow')) {
          console.warn('⚠️ [Step 3] WooCommerce sync failed but continuing (Cash/PayNow flow) - payment will still be recorded');
          // Automatically advance to next step since WooCommerce is optional for payment processing
          if (useTracker && shouldGenerateReceipt) {
            progressTracker.advance();
          }
        } else {
          // For other flows, show error
          if (useTracker) progressTracker.error();
          else closePopup();
          throw wooError;
        }
      }
    } else if (shouldRunWooCommerceSync) {
      console.warn('⚠️ [Step 3] WooCommerce sync requested but function not available or not a function:', {
        hasFunction: !!updateWooCommerce,
        isFunction: typeof updateWooCommerce === 'function',
      });
      if (useTracker && shouldGenerateReceipt) {
        console.log('🔄 [Step 3] Skipping WooCommerce, advancing to Step 4');
        progressTracker.advance();
      }
    }

    const result = await handleCashPayNowStatusChange({
      id, courseName, courseChiName, courseLocation,
      newValue, oldPaymentStatus,
      participantInfo, courseInfo, officialInfo,
      updateWooCommerce, receiptGenerator,
      shouldGenerateReceipt,
      skipWooCommerceUpdate: shouldRunWooCommerceSync,
      progressTracker,
      backendRefundedDate,
      backendRefundedTime,
    });
    
    if (result && typeof result === 'object' && result.receiptNo) {
      // Result is the full receipt data object { receiptNo, blob, filename }
      generatedNo = result.receiptNo;
      receiptData = result;
      event.data.recinvNo = generatedNo;
      
      if (shouldGenerateReceipt && useTracker) {
        console.log('✅ [Receipt Generated] Receipt number:', generatedNo);
        console.log('🔄 [Step 4] Advancing to: Payment Date and Time Recorded');
        progressTracker.advance(); // → Step 5: Payment Date and Time Recorded
      }
    } else if (typeof result === 'string' && result) {
      // Legacy: result is just the receipt number
      generatedNo = result;
      event.data.recinvNo = generatedNo;
      
      if (shouldGenerateReceipt && useTracker) {
        console.log('✅ [Receipt Generated] Receipt number:', generatedNo);
        console.log('🔄 [Step 4] Advancing to: Payment Date and Time Recorded');
        progressTracker.advance(); // → Step 5: Payment Date and Time Recorded
      }
    }

    if (result && typeof result === 'object' && 'refundedDate' in result) {
      event.data.refundedDate = result.refundedDate;
      event.data.refundedTime = result.refundedTime || '';
      if (event.data.officialInfo) {
        event.data.officialInfo.refundedDate = result.refundedDate;
        event.data.officialInfo.refundedTime = result.refundedTime || '';
      }
    }

    if (shouldGenerateReceipt && useTracker && generatedNo) {
      // Now we're at Step 5: Payment Date and Time Recorded
      // Use the exact date/time that was sent to addReceiptNumber (from generatePDFReceipt)
      const _dispDate = receiptData?.paymentDate || _sgtPayDate;
      const _dispTime = receiptData?.paymentTime || _sgtPayTime;
      event.data.paymentDate = _dispDate;
      event.data.paymentTime = _dispTime;
      if (event.data.officialInfo) {
        event.data.officialInfo.date = _dispDate;
        event.data.officialInfo.time = _dispTime;
      }
      
      // Sync to event.node.data BEFORE refreshCells so grid displays updated values
      if (event.node && event.node.data) {
        event.node.data.paymentDate = _dispDate;
        event.node.data.paymentTime = _dispTime;
        if (event.data.officialInfo) {
          if (!event.node.data.officialInfo) event.node.data.officialInfo = {};
          event.node.data.officialInfo.date = _dispDate;
          event.node.data.officialInfo.time = _dispTime;
        }
      }
      
      if (event.api && typeof event.api.refreshCells === 'function') {
        event.api.refreshCells({
          rowNodes: [event.node],
          columns: ['recinvNo', 'paymentDate', 'paymentTime'],
          force: true,
        });
      }
      console.log('✅ [Step 5] Payment Date and Time displayed in table');
      console.log('🔄 [Step 5] Advancing to: Receipt Downloaded and Opened in New Tab');
      progressTracker.advance(); // → Step 6: Receipt Downloaded and Opened in New Tab
      console.log('✅ [Step 5→6] Now waiting for Step 6 to auto-complete when receipt downloads/previews');
    }
  } else if (paymentMethod === 'SkillsFuture') {
    const shouldRunWooCommerceSync =
      shouldIncreaseWooCommerceStock ||
      (shouldDecreaseWooCommerceStock && String(event.data.registrationStatus || '').trim() === 'Confirmed Slot');

    // For SkillsFuture invoice generation, advance to "Generating invoice number"
    if (shouldGenerateInvoice && useTracker) {
      progressTracker.advance(); // → Generating invoice number
    }
    
    // For SkillsFuture Done or Refunded: call WooCommerce sync if needed before handler
    // This ensures the step tracker has the correct progression
    if (shouldRunWooCommerceSync && (newValue === 'SkillsFuture Done' || newValue === 'Refunded') && updateWooCommerce && typeof updateWooCommerce === 'function') {
      if (useTracker) {
        progressTracker.advance(); // → Updating vacancies counter
      }
      try {
        console.log('📊 [WooCommerce Debug] SkillsFuture', newValue, '- Calling updateWooCommerce:', {
          courseType: courseInfo?.courseType,
          newValue,
          shouldIncreaseWooCommerceStock,
          oldPaymentStatus,
        });
        const wooRes = await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
        if (wooRes === undefined || wooRes === null) {
          console.warn('⚠️ WooCommerce returned empty response - assuming sync completed silently');
        } else if (!isApiResultSuccessful(wooRes)) {
          console.error('WooCommerce update failed:', wooRes);
          if (useTracker) progressTracker.error();
          else closePopup();
          throw new Error(`Failed to update WooCommerce stock for course ${courseName}`);
        }
      } catch (wooError) {
        console.error('Error updating WooCommerce stock:', wooError);
        console.warn('⚠️ WooCommerce sync failed but continuing (SkillsFuture', newValue, ') - payment will still be recorded');
        // Continue without throwing for SkillsFuture
      }
    }

    const result = await handleSkillsFutureStatusChange({
      id, courseName, courseChiName, courseLocation,
      newValue, oldPaymentStatus,
      participantInfo, courseInfo, officialInfo,
      updateWooCommerce, receiptGenerator,
      skipWooCommerceUpdate: shouldRunWooCommerceSync,
      progressTracker,
      backendRefundedDate,
      backendRefundedTime,
    });
    
    if (result && typeof result === 'object' && result.receiptNo) {
      generatedNo = result.receiptNo;
      receiptData = result;
      event.data.recinvNo = generatedNo;
    } else if (typeof result === 'string' && result) {
      generatedNo = result;
      event.data.recinvNo = generatedNo;
    }

    if (result && typeof result === 'object' && 'refundedDate' in result) {
      event.data.refundedDate = result.refundedDate;
      event.data.refundedTime = result.refundedTime || '';
      if (event.data.officialInfo) {
        event.data.officialInfo.refundedDate = result.refundedDate;
        event.data.officialInfo.refundedTime = result.refundedTime || '';
      }
    }

    // SkillsFuture Done: record payment date and time in local grid
    if (newValue === 'SkillsFuture Done' && useTracker) {
      // Reuse the same SGT time already sent to the backend in step 1
      event.data.paymentDate = _sgtPayDate;
      event.data.paymentTime = _sgtPayTime;
      if (event.data.officialInfo) {
        event.data.officialInfo.date = _sgtPayDate;
        event.data.officialInfo.time = _sgtPayTime;
      }
      
      // Sync to event.node.data BEFORE refreshCells so grid displays updated values
      if (event.node && event.node.data) {
        event.node.data.paymentDate = _sgtPayDate;
        event.node.data.paymentTime = _sgtPayTime;
        if (event.data.officialInfo) {
          if (!event.node.data.officialInfo) event.node.data.officialInfo = {};
          event.node.data.officialInfo.date = _sgtPayDate;
          event.node.data.officialInfo.time = _sgtPayTime;
        }
      }
      
      if (event.api && typeof event.api.refreshCells === 'function') {
        event.api.refreshCells({
          rowNodes: [event.node],
          columns: ['paymentDate', 'paymentTime'],
          force: true,
        });
      }
      console.log('✅ [Step 4] Payment Date and Time Recorded:', { date: _sgtPayDate, time: _sgtPayTime });
    }

  } else if (courseInfo.courseType === 'ILP' || courseInfo.courseType === 'Talks And Seminar') {
    await handleILPOrTalksStatusChange({
      courseName, courseChiName, courseLocation,
      newValue,
      updateWooCommerce,
    });
  }

  // Refresh cells to reflect payment status and related changes
  // IMPORTANT: Sync event.data to event.node.data BEFORE refreshCells so grid renders updated values
  if (event.node && event.node.data) {
    event.node.data.paymentDate = event.data.paymentDate;
    event.node.data.paymentTime = event.data.paymentTime;
    event.node.data.recinvNo = event.data.recinvNo;
    event.node.data.registrationStatus = event.data.registrationStatus;
    event.node.data.refundedDate = event.data.refundedDate;
    event.node.data.refundedTime = event.data.refundedTime;
    event.node.data.remarks = event.data.remarks;
    if (event.data.official) {
      if (!event.node.data.official) event.node.data.official = {};
      event.node.data.official.date = event.data.official.date;
      event.node.data.official.time = event.data.official.time;
      event.node.data.official.remarks = event.data.official.remarks;
    }
    if (event.data.officialInfo) {
      if (!event.node.data.officialInfo) event.node.data.officialInfo = {};
      event.node.data.officialInfo.date = event.data.officialInfo.date;
      event.node.data.officialInfo.time = event.data.officialInfo.time;
      event.node.data.officialInfo.remarks = event.data.officialInfo.remarks;
    }
  }
  
  if (event.api && typeof event.api.refreshCells === 'function') {
    event.api.refreshCells({
      rowNodes: [event.node],
      columns: ['paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'registrationStatus', 'recinvNo', 'paymentDate', 'paymentTime', 'refundedDate', 'refundedTime', 'remarks'],
      force: true,
    });
  }

  await waitForNextPaint();
  if (useTracker) {
    // Queue a table reload so the latest server values are shown once the modal closes.
    if (newValue === 'Paid' && (paymentMethod === 'Cash' || paymentMethod === 'PayNow')) {
      console.log('🔄 [Step 6] Finalizing: Receipt Downloaded and Opened in New Tab');
    } else if (newValue === 'SkillsFuture Done') {
      console.log('🔄 [Step 4] Finalizing: All steps complete for SkillsFuture Done');
    } else {
      console.log('🔄 Finalizing payment flow');
    }
    if (refreshChild) refreshChild();
    progressTracker.finish(receiptData);
    console.log('✅ [All Steps Complete] Payment flow finished');
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
  skipWooCommerceUpdate = false,
  progressTracker = null,
  backendRefundedDate = '',
  backendRefundedTime = '',
}) {
  if ((newValue === 'To refund' || newValue === 'Withdrawn') && oldPaymentStatus === 'Paid') {
    if (!skipWooCommerceUpdate && updateWooCommerce && typeof updateWooCommerce === 'function') {
      try {
        await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      } catch (err) {
        console.warn('⚠️ WooCommerce sync failed during To refund/Withdrawn:', err);
        // Continue without throwing
      }
    }
    await removeRefundedDate(id);
    return { refundedDate: '', refundedTime: '' };
  } else if (newValue === 'Refunded') {
    // When refund is completed, update WooCommerce to increase vacancies counter
    if (!skipWooCommerceUpdate && (oldPaymentStatus === 'Paid' || oldPaymentStatus === 'To refund') && updateWooCommerce && typeof updateWooCommerce === 'function') {
      try {
        //console.log(`↓ Calling updateWooCommerce for ${courseChiName}/${courseName} at ${courseLocation} with status "Refunded"`);
        await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      } catch (err) {
        console.warn('⚠️ WooCommerce sync failed during Refunded:', err);
        // Continue without throwing
      }
    }
    
    // Use backend-provided refund date/time if available, otherwise calculate locally
    let refundedDate = backendRefundedDate;
    let refundedTime = backendRefundedTime;
    
    if (!refundedDate || !refundedTime) {
      const _now = new Date();
      const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
      refundedDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
      refundedTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
    }
    
    // Only call addRefundedDate if backend didn't already store it
    if (!backendRefundedDate && !backendRefundedTime) {
      await addRefundedDate(id, refundedDate, refundedTime);
    }
    
    return { refundedDate, refundedTime };
  } else {
    if (!shouldGenerateReceipt) {
      if (!skipWooCommerceUpdate && updateWooCommerce && typeof updateWooCommerce === 'function') {
        try {
          await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
        } catch (err) {
          console.warn('⚠️ WooCommerce sync failed:', err);
          // Continue without throwing
        }
      }
      return '';
    }

    const generatedNo = await receiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue, progressTracker);
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
  skipWooCommerceUpdate = false,
  progressTracker = null,
  backendRefundedDate = '',
  backendRefundedTime = '',
}) {
  // Generate SkillsFuture invoice when status changes to "Generating SkillsFuture Invoice"
  if (newValue === 'Generating SkillsFuture Invoice') {
    try {
      const result = await receiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue, progressTracker);
      return result || '';
    } catch (error) {
      console.error('Error generating SkillsFuture invoice:', error);
      return '';
    }
  } else if (newValue === 'SkillsFuture Done') {
    if (!skipWooCommerceUpdate) {
      await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
    }
    return '';
  } else if (newValue === 'SkillsFuture Unsuccessful') {
    // When SkillsFuture fails and payment was made, automatically set registration status to "Withdrawn"
    if (oldPaymentStatus === 'SkillsFuture Done') {
      console.log('🔄 [SkillsFuture Unsuccessful] Auto-updating registration status to "Withdrawn"');
      await editRegistrationField(id, 'official.registration_status', 'Withdrawn');
    }
    return '';
  } else if (newValue === 'Participant Withdrawn') {
    // When participant withdraws for SkillsFuture, registration status is already set to "Withdrawn" by registrationStatusHandler
    console.log('🔄 [Participant Withdrawn] Participant has withdrawn from SkillsFuture course');
    return '';
  } else if (newValue === 'Cancelled' || newValue === 'Refunded' || newValue === 'Withdrawn' || oldPaymentStatus === 'To refund') {
    if (oldPaymentStatus === 'To refund') {
      await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      const _now = new Date();
      const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
      const refundedDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
      const refundedTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
      await addRefundedDate(id, refundedDate, refundedTime);
      return { refundedDate, refundedTime };
    }

    if (oldPaymentStatus === 'SkillsFuture Done') {
      if (!skipWooCommerceUpdate) {
        await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      }
      await removeRefundedDate(id);
      return { refundedDate: '', refundedTime: '' };
    } else if (newValue === 'Refunded') {
      // Use backend-provided refund date/time if available, otherwise calculate locally
      let refundedDate = backendRefundedDate;
      let refundedTime = backendRefundedTime;
      
      if (!refundedDate || !refundedTime) {
        const _now = new Date();
        const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
        refundedDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
        refundedTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
      }
      
      // Only call addRefundedDate if backend didn't already store it
      if (!backendRefundedDate && !backendRefundedTime) {
        await addRefundedDate(id, refundedDate, refundedTime);
      }
      
      return { refundedDate, refundedTime };
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
