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
  const registrationStatus = String(event.data.registrationStatus || '').trim();
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
    courseInfo?.courseType === 'NSA' &&
    (((paymentMethod === 'Cash' || paymentMethod === 'PayNow') && newValue === 'Paid') ||
      (paymentMethod === 'SkillsFuture' && newValue === 'SkillsFuture Done'));
  const shouldIncreaseWooCommerceStock =
    newValue === 'Refunded' &&
    (oldPaymentStatus === 'Paid' || oldPaymentStatus === 'SkillsFuture Done') &&
    (registrationStatus === 'Cancellation For Duplication' || registrationStatus === 'Withdrawn');
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
  // For Refunded: 2 steps (status, vacancies) or 3 steps (status, vacancies, refund date/time) depending on context
  let statusLabel = 'Payment Status Updated';
  if (newValue === 'Paid') {
    statusLabel = 'Payment Status Updated to Paid';
  } else if (newValue === 'SkillsFuture Done') {
    statusLabel = 'Payment Status Updated to SkillsFuture Done';
  } else if (newValue === 'Refunded') {
    statusLabel = 'The payment status will be updated to Refunded';
  }

  const steps = [statusLabel];

  if (shouldSetConfirmedSlot) {
    // For Cash/PayNow: always update registration status when Paid (not affected by confirmation status)
    // For SkillsFuture Done: only update if currently confirmed
    if ((paymentMethod === 'Cash' || paymentMethod === 'PayNow') || isCurrentlyConfirmed) {
      steps.push('Registration Status Updated to Confirmed Slot');
      if (shouldGenerateInvoice) {
        steps.push('Payment Status Reset to Pending');
      }
    }
  }
  if (shouldSyncWooCommerceStock) {
    const vacanciesLabel = newValue === 'Refunded' 
      ? 'The vacancies counter will increase back by 1'
      : 'Vacancies Counter Updated';
    steps.push(vacanciesLabel);
    console.log('🔄 [Backend] WooCommerce sync step added:', { shouldIncreaseWooCommerceStock, newValue, registrationStatus });
  } else if (newValue === 'Refunded') {
    // Always show vacancies step for refund, applies to all Final Payment Methods
    steps.push('The vacancies counter will increase back by 1');
    console.log('🔄 [Backend] Refund vacancies step added for payment method:', { paymentMethod });
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
  // Pre-compute SGT date/time once for statuses that record payment date/time
  let _sgtPayDate, _sgtPayTime;
  if (newValue === 'Paid' || newValue === 'SkillsFuture Done') {
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
    if (useTracker) {
      console.log('🔄 [Step 2] Advancing to: Registration Status Updated to Confirmed Slot');
      progressTracker.advance(); // → Updating registration status
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
        console.log('🔄 Advancing to: Payment Status Reset to Pending');
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
    
    // For SkillsFuture Done: call WooCommerce sync if needed before handler
    // This ensures the step tracker has the correct progression
    if (shouldRunWooCommerceSync && newValue === 'SkillsFuture Done' && updateWooCommerce && typeof updateWooCommerce === 'function') {
      if (useTracker) {
        progressTracker.advance(); // → Updating vacancies counter
      }
      try {
        console.log('📊 [WooCommerce Debug] SkillsFuture Done - Calling updateWooCommerce:', {
          courseType: courseInfo?.courseType,
          newValue,
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
        console.warn('⚠️ WooCommerce sync failed but continuing (SkillsFuture Done) - payment will still be recorded');
        // Continue without throwing for SkillsFuture
      }
    } else if (shouldRunWooCommerceSync && useTracker && newValue === 'SkillsFuture Done') {
      // For other cases (refund, etc.), advance if applicable
      progressTracker.advance(); // → Updating vacancies counter
      if (updateWooCommerce && typeof updateWooCommerce === 'function') {
        try {
          console.log('📊 [WooCommerce Debug] SkillsFuture other case - Calling updateWooCommerce:', {
            courseType: courseInfo?.courseType,
            newValue,
          });
          const wooRes = await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
          if (wooRes === undefined || wooRes === null) {
            console.warn('⚠️ WooCommerce returned empty response - assuming sync completed silently');
          } else if (!isApiResultSuccessful(wooRes)) {
            console.error('WooCommerce update failed:', wooRes);
            progressTracker.error();
            throw new Error(`Failed to update WooCommerce stock for course ${courseName}`);
          }
        } catch (wooError) {
          console.error('Error updating WooCommerce stock:', wooError);
          console.warn('⚠️ WooCommerce sync failed but continuing - payment will still be recorded');
        }
      } else {
        console.warn('⚠️ WooCommerce function not available');
      }
    }

    const result = await handleSkillsFutureStatusChange({
      id, courseName, courseChiName, courseLocation,
      newValue, oldPaymentStatus,
      participantInfo, courseInfo, officialInfo,
      updateWooCommerce, receiptGenerator,
      skipWooCommerceUpdate: shouldRunWooCommerceSync,
      progressTracker,
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
      progressTracker.advance(); // → Recording payment date and time

      // Reuse the same SGT time already sent to the backend in step 1
      event.data.paymentDate = _sgtPayDate;
      event.data.paymentTime = _sgtPayTime;
      if (event.data.officialInfo) {
        event.data.officialInfo.date = _sgtPayDate;
        event.data.officialInfo.time = _sgtPayTime;
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
      columns: ['paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'registrationStatus', 'recinvNo', 'paymentDate', 'paymentTime', 'refundedDate', 'refundedTime', 'remarks'],
      force: true,
    });
  }

  await waitForNextPaint();
  if (useTracker) {
    // Queue a table reload so the latest server values are shown once the modal closes.
    console.log('🔄 [Step 6] Finalizing: Receipt Downloaded and Opened in New Tab');
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
        await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      } catch (err) {
        console.warn('⚠️ WooCommerce sync failed during Refunded:', err);
        // Continue without throwing
      }
    }
    
    const _now = new Date();
    const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
    const refundedDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
    const refundedTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
    await addRefundedDate(id, refundedDate, refundedTime);
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
  } else if (newValue === 'Cancelled' || newValue === 'Refunded' || newValue === 'Withdrawn' || newValue === 'To refund') {
    if (newValue === 'Refunded' && oldPaymentStatus === 'SkillsFuture Done') {
      if (!skipWooCommerceUpdate) {
        await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      }
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
      const _now = new Date();
      const _sgNow = new Date(_now.getTime() + 8 * 60 * 60 * 1000); // SGT (UTC+8)
      const refundedDate = `${String(_sgNow.getUTCDate()).padStart(2,'0')}/${String(_sgNow.getUTCMonth()+1).padStart(2,'0')}/${_sgNow.getUTCFullYear()}`;
      const refundedTime = `${String(_sgNow.getUTCHours()).padStart(2,'0')}:${String(_sgNow.getUTCMinutes()).padStart(2,'0')}:${String(_sgNow.getUTCSeconds()).padStart(2,'0')}`;
      await addRefundedDate(id, refundedDate, refundedTime);
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
