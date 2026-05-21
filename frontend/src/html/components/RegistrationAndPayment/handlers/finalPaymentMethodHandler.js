/**
 * Final Payment Method handler for AG-Grid cell changes.
 * Handles staff final payment method overrides (Cash, PayNow, SkillsFuture).
 * Single entry point that orchestrates all steps: method → status → confirmation → registration → receipt/invoice generation → download/preview.
 */

import {
  updatePaymentMethod,
  updatePaymentStatus,
  editRegistrationField,
  clearPaymentDetails,
  // addRefundedDate,
  // removeRefundedDate,
} from '../services/registrationApi';

import {
  isApiResultSuccessful,
  buildLogPayload,
  resolveEventId,
} from './handlerHelpers';

import { logRegistrationUpdate } from '../../../../utils/auditLog';

/**
 * Handles changes to the "Final Payment Method" column (staff override).
 * Updates payment status and generates receipt/invoice based on the selected method.
 */
export async function handleFinalPaymentMethodChange(event, context) {
  const { userName, userRole, progressTracker, showUpdatePopup, closePopup, autoReceiptGenerator, updateWooCommerce } = context;
  const id = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for final payment method update');
  }
  const sn = event.data.sn;
  const participantInfo = event.data.participantInfo;
  const courseInfo      = event.data.courseInfo;
  const officialInfo    = event.data.officialInfo;
  const courseChiName   = event.data.courseChi || courseInfo?.courseChiName || '';
  const courseEngName   = event.data.course || courseInfo?.courseEngName || '';
  const courseLocation  = event.data.location || courseInfo?.courseLocation || '';
  const newValue = String(event.value || '').trim();
  const oldValue = String(event.oldValue || '').trim();
  // Prefer event.data.status (the reliable DB-sourced field from rowDataMapper) over
  // event.data.paymentStatus, which can diverge when the payment-status cell editor
  // writes to it independently of the actual DB status.
  const currentPaymentStatus = String(event.data.status || event.data.paymentStatus || '').trim();
  const currentRegistrationStatus = String(event.data.registrationStatus || '').trim();

  console.log('═══════════════════════════════════════════════════════');
  console.log('[FinalPaymentMethod] ENTRY - Payment Method Change Detection');
  console.log('═══════════════════════════════════════════════════════');
  console.log('[FinalPaymentMethod] Input Values:', {
    sn,
    id,
    oldValue,
    newValue,
  });
  console.log('[FinalPaymentMethod] Current State:', {
    currentPaymentStatus,
    currentRegistrationStatus,
    finalPaymentMethod: event.data.finalPaymentMethod,
  });
  console.log('[FinalPaymentMethod] UI Fields:', {
    paymentStatus: event.data.paymentStatus,
    status: event.data.status,
    registrationStatus: event.data.registrationStatus,
  });

  // Detect the specific Cash/PayNow → SkillsFuture transition
  const isCashPayNowToSF =
    (oldValue === 'Cash' || oldValue === 'PayNow') && newValue === 'SkillsFuture';
  
  console.log('[FinalPaymentMethod] DEBUG Case 8 Detection:', {
    isCashPayNowToSF,
    oldValue,
    newValue,
    currentPaymentStatus,
    isPaid: currentPaymentStatus === 'Paid',
  });

  // Detect the specific SkillsFuture → Cash/PayNow transition
  const isSFToCashPayNow =
    oldValue === 'SkillsFuture' && (newValue === 'Cash' || newValue === 'PayNow');

  // Detect Cash ↔ PayNow swaps (e.g. Cash → PayNow or PayNow → Cash)
  const isCashPayNowSwap =
    (oldValue === 'Cash' && newValue === 'PayNow') ||
    (oldValue === 'PayNow' && newValue === 'Cash');

  // All swap-direction transitions: clear payment details and do NOT generate a receipt
  const isPaymentMethodSwap = isCashPayNowToSF || isSFToCashPayNow || isCashPayNowSwap;

  if (newValue === oldValue) {
    return { updated: false };
  }

  const { refreshChild } = context;

  // ── Case: Cash ↔ PayNow Paid swap: payment already made, full reset ──────────
  // When either Cash or PayNow has already been marked as "Paid" and staff switches
  // between them, reset everything and restore vacancies:
  //   1. Method swapped (Cash ↔ PayNow)
  //   2. Payment status → "Pending" (reset)
  //   3. Registration status → "Submitted"
  //   4. Receipt number cleared
  //   5. Payment date and time cleared
  //   6. Vacancies counter will increase back by 1
  const isCashPayNowPaidSwap =
    isCashPayNowSwap && currentPaymentStatus === 'Paid';

  console.log('[CashPayNow Swap] Checking condition:', { isCashPayNowPaidSwap, isCashPayNowSwap, currentPaymentStatus });

  if (isCashPayNowPaidSwap) {
    console.log('[CashPayNow Swap] ✅ TRIGGERED: Cash/PayNow Paid swap transition');
    
    const steps = [
      'Changing final payment method',
      'Updating registration status',
      'Updating payment status',
      'Clearing payment details',
      'Updating vacancies counter',
    ];

    if (progressTracker) progressTracker.start(steps);
    else showUpdatePopup('Updating in progress... Please wait ...');

    // Step 1: Persist the method change (Cash ↔ PayNow).
    console.log('[CashPayNow Swap] Step 1: Changing final payment method to:', newValue);
    const res = await editRegistrationField(id, 'finalPaymentMethod', newValue);
    if (!isApiResultSuccessful(res)) {
      console.error('[CashPayNow Swap] ❌ Step 1 FAILED: Could not update finalPaymentMethod');
      if (progressTracker) progressTracker.error();
      else closePopup();
      throw new Error(`Failed to update final payment method for registration ${id}`);
    }
    console.log('[CashPayNow Swap] ✅ Step 1 Complete: finalPaymentMethod updated to', newValue);

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Final Payment Method (by Staff)',
      oldValue: oldValue || '',
      newValue,
    }));

    // Step 2: Registration status → Submitted
    if (progressTracker) progressTracker.advance();
    console.log('[CashPayNow Swap] Step 2: Updating registration status to Submitted');

    const regRes = await editRegistrationField(id, 'registrationStatus', 'Submitted');
    if (isApiResultSuccessful(regRes)) {
      event.data.registrationStatus = 'Submitted';
      console.log('[CashPayNow Swap] ✅ Step 2 Complete: registrationStatus updated to Submitted');
      await logRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Registration Status (Auto)',
        oldValue: currentRegistrationStatus || '',
        newValue: 'Submitted',
      }));
    } else {
      console.warn('[CashPayNow Swap] ⚠️ Step 2 WARN: registrationStatus update may have failed');
    }

    // Step 3: Payment status → Pending (also sets confirmed = false on the backend)
    if (progressTracker) progressTracker.advance();
    console.log('[CashPayNow Swap] Step 3: Updating payment status to Pending');

    const payRes = await updatePaymentStatus(id, 'Pending', userName, userRole);
    if (isApiResultSuccessful(payRes)) {
      event.data.status        = 'Pending';
      event.data.paymentStatus = 'Pending';
      event.data.confirmed = false;
      if (event.data.officialInfo) event.data.officialInfo.confirmed = false;
      console.log('[CashPayNow Swap] ✅ Step 3 Complete: Payment status updated to Pending');
      await logRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Payment Status (Auto)',
        oldValue: currentPaymentStatus || '',
        newValue: 'Pending',
      }));
    } else {
      console.warn('[CashPayNow Swap] ⚠️ Step 3 WARN: Payment status update may have failed');
    }

    // Step 4: Clear receipt number, payment date, and time
    if (progressTracker) progressTracker.advance();
    console.log('[CashPayNow Swap] Step 4: Clearing payment details');

    await clearPaymentDetails(id);
    event.data.recinvNo    = '';
    event.data.paymentDate = '';
    event.data.paymentTime = '';
    if (event.data.officialInfo) {
      event.data.officialInfo.receiptNo = '';
      event.data.officialInfo.date      = '';
      event.data.officialInfo.time      = '';
    }
    console.log('[CashPayNow Swap] ✅ Step 4 Complete: Payment details cleared');

    // Step 5: Update WooCommerce to increase vacancies counter (LAST STEP)
    if (progressTracker) progressTracker.advance();
    console.log('[CashPayNow Swap] Step 5: Updating vacancies counter in WooCommerce');

    if (updateWooCommerce && typeof updateWooCommerce === 'function') {
      try {
        const wooRes = await updateWooCommerce(courseChiName, courseEngName, courseLocation, 'Change of Final Payment Method');
        console.log('[CashPayNow Swap] ✅ Step 5 Complete: Vacancies counter increased by 1', { courseEngName, courseLocation });
      } catch (wooError) {
        console.warn('[CashPayNow Swap] ⚠️ Step 5 WARN: WooCommerce update failed but continuing:', wooError.message);
        // Don't fail the entire flow - WooCommerce sync is best-effort
      }
    } else {
      console.warn('[CashPayNow Swap] ⚠️ Step 5 WARN: updateWooCommerce function not available');
    }

    // Refresh all affected columns so the grid reflects the new state immediately
    if (event.api && typeof event.api.refreshCells === 'function') {
      console.log('[CashPayNow Swap] Refreshing table cells');
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: [
          'paymentStatusCashPayNow', 'paymentStatusSkillsFuture',
          'finalPaymentMethod', 'confirmed', 'registrationStatus',
          'recinvNo', 'paymentDate', 'paymentTime',
        ],
        force: true,
      });
    }

    if (refreshChild) refreshChild();
    if (progressTracker) {
      progressTracker.finish(null, { immediateClose: true });
      console.log('[CashPayNow Swap] ✅ ALL STEPS COMPLETE');
    } else {
      closePopup();
    }

    return { updated: true, generatedNo: '' };
  }

  // ── Simple path: already Pending + Submitted ───────────────────────────────
  // When the record is already in the Pending/Submitted state (from a prior payment
  // method change), swapping the method again only needs one step — just update the
  // finalPaymentMethod field. All other bookkeeping (setting Pending, Submitted,
  // clearing receipts) is already in the correct state.
  const isAlreadyPendingSubmitted =
    currentPaymentStatus === 'Pending' && currentRegistrationStatus === 'Submitted';

  if (isAlreadyPendingSubmitted && isPaymentMethodSwap) {
    if (progressTracker) progressTracker.start(['Changing final payment method']);

    const res = await editRegistrationField(id, 'finalPaymentMethod', newValue);
    if (!isApiResultSuccessful(res)) {
      if (progressTracker) progressTracker.error();
      else closePopup();
      throw new Error(`Failed to update final payment method for registration ${id}`);
    }

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Final Payment Method (by Staff)',
      oldValue: oldValue || '',
      newValue,
    }));

    // Only refresh the payment status columns so the active column (Cash/PayNow vs SkillsFuture)
    // re-evaluates after the method swap. Do NOT reload the full table — nothing else changes
    // in this path, and a full reload would overwrite locally-set paymentStatus values.
    if (event.api && typeof event.api.refreshCells === 'function') {
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: ['paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'finalPaymentMethod'],
        force: true,
      });
    }

    if (progressTracker) {
      progressTracker.finish(null, { immediateClose: true });
    } else {
      closePopup();
    }

    return { updated: true, generatedNo: '' };
  }

  // ── Case 8: Cash/PayNow Paid → SkillsFuture: payment already made, transition to SF ────
  // When a Cash/PayNow payment has already been recorded ("Paid" status) and the staff
  // switches to SkillsFuture, reset everything and restore vacancies:
  //   1. Cash/PayNow payment status column → "Not Available" (finalPaymentMethod change)
  //   2. Confirmation status → will be displayed in the table for SkillsFuture
  //   3. SkillsFuture payment status → "Pending"
  //   4. Registration status → "Submitted"
  //   5. Receipt number cleared
  //   6. Payment date and time cleared
  //   7. Vacancies counter will increase back by 1
  const isCashPayNowPaidToSF =
    isCashPayNowToSF && currentPaymentStatus === 'Paid';

  console.log('[Case 8] Checking condition:', { isCashPayNowPaidToSF, isCashPayNowToSF, currentPaymentStatus });

  if (isCashPayNowPaidToSF) {
    console.log('[Case 8] ✅ TRIGGERED: Cash/PayNow Paid → SkillsFuture transition');
    
    const steps = [
      'Changing final payment method',
      'Updating registration status',
      'Updating payment status',
      'Clearing payment details',
      'Updating vacancies counter',
    ];

    if (progressTracker) progressTracker.start(steps);
    else showUpdatePopup('Updating in progress... Please wait ...');

    // Step 1: Persist the method change (Cash/PayNow → SkillsFuture).
    console.log('[Case 8] Step 1: Changing final payment method to:', newValue);
    const res = await editRegistrationField(id, 'finalPaymentMethod', newValue);
    if (!isApiResultSuccessful(res)) {
      console.error('[Case 8] ❌ Step 1 FAILED: Could not update finalPaymentMethod');
      if (progressTracker) progressTracker.error();
      else closePopup();
      throw new Error(`Failed to update final payment method for registration ${id}`);
    }
    console.log('[Case 8] ✅ Step 1 Complete: finalPaymentMethod updated to', newValue);

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Final Payment Method (by Staff)',
      oldValue: oldValue || '',
      newValue,
    }));

    // Step 2: Registration status → Submitted
    if (progressTracker) progressTracker.advance();
    console.log('[Case 8] Step 2: Updating registration status to Submitted');

    const regRes = await editRegistrationField(id, 'registrationStatus', 'Submitted');
    if (isApiResultSuccessful(regRes)) {
      event.data.registrationStatus = 'Submitted';
      console.log('[Case 8] ✅ Step 2 Complete: registrationStatus updated to Submitted');
      await logRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Registration Status (Auto)',
        oldValue: currentRegistrationStatus || '',
        newValue: 'Submitted',
      }));
    } else {
      console.warn('[Case 8] ⚠️ Step 2 WARN: registrationStatus update may have failed');
    }

    // Step 3: Payment status → Pending (also sets confirmed = false on the backend)
    if (progressTracker) progressTracker.advance();
    console.log('[Case 8] Step 3: Updating payment status to Pending');

    const payRes = await updatePaymentStatus(id, 'Pending', userName, userRole);
    if (isApiResultSuccessful(payRes)) {
      event.data.status        = 'Pending';
      event.data.paymentStatus = 'Pending';
      event.data.confirmed = false;
      if (event.data.officialInfo) event.data.officialInfo.confirmed = false;
      console.log('[Case 8] ✅ Step 3 Complete: Payment status updated to Pending');
      await logRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Payment Status (Auto)',
        oldValue: currentPaymentStatus || '',
        newValue: 'Pending',
      }));
    } else {
      console.warn('[Case 8] ⚠️ Step 3 WARN: Payment status update may have failed');
    }

    // Step 4: Clear receipt number, payment date, and time
    if (progressTracker) progressTracker.advance();
    console.log('[Case 8] Step 4: Clearing payment details');

    await clearPaymentDetails(id);
    event.data.recinvNo    = '';
    event.data.paymentDate = '';
    event.data.paymentTime = '';
    if (event.data.officialInfo) {
      event.data.officialInfo.receiptNo = '';
      event.data.officialInfo.date      = '';
      event.data.officialInfo.time      = '';
    }
    console.log('[Case 8] ✅ Step 4 Complete: Payment details cleared');

    // Step 5: Update WooCommerce to increase vacancies counter (LAST STEP)
    if (progressTracker) progressTracker.advance();
    console.log('[Case 8] Step 5: Updating vacancies counter in WooCommerce');

    if (updateWooCommerce && typeof updateWooCommerce === 'function') {
      try {
        const wooRes = await updateWooCommerce(courseChiName, courseEngName, courseLocation, 'Change of Final Payment Method');
        console.log('[Case 8] ✅ Step 5 Complete: Vacancies counter increased by 1', { courseEngName, courseLocation });
      } catch (wooError) {
        console.warn('[Case 8] ⚠️ Step 5 WARN: WooCommerce update failed but continuing:', wooError.message);
        // Don't fail the entire flow - WooCommerce sync is best-effort
      }
    } else {
      console.warn('[Case 8] ⚠️ Step 5 WARN: updateWooCommerce function not available');
    }

    // Refresh all affected columns so the grid reflects the new state immediately
    if (event.api && typeof event.api.refreshCells === 'function') {
      console.log('[Case 8] Refreshing table cells');
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: [
          'paymentStatusCashPayNow', 'paymentStatusSkillsFuture',
          'finalPaymentMethod', 'confirmed', 'registrationStatus',
          'recinvNo', 'paymentDate', 'paymentTime',
        ],
        force: true,
      });
    }

    if (refreshChild) refreshChild();
    if (progressTracker) {
      progressTracker.finish(null, { immediateClose: true });
      console.log('[Case 8] ✅ ALL STEPS COMPLETE');
    } else {
      closePopup();
    }

    return { updated: true, generatedNo: '' };
  }

  // ── Case 9: SkillsFuture Done → Cash/PayNow: payment already made, full reset ─────
  // When a SkillsFuture payment has already been recorded and the staff switches the
  // method to Cash/PayNow, reset everything and restore vacancies:
  //   1. SkillsFuture payment status column → "Not Available" (finalPaymentMethod change)
  //   2. Confirmation status → Not Confirmed (cleared from table)
  //   3. Cash/PayNow payment status → "Pending"
  //   4. Registration status → "Submitted"
  //   5. Receipt number cleared
  //   6. Payment date and time cleared
  //   7. Vacancies counter will increase back by 1
  const isSFDoneSwapToCashPayNow =
    isSFToCashPayNow && currentPaymentStatus === 'SkillsFuture Done';

  console.log('[Case 9] Checking condition:', { isSFDoneSwapToCashPayNow, isSFToCashPayNow, currentPaymentStatus });

  if (isSFDoneSwapToCashPayNow) {
    console.log('[Case 9] ✅ TRIGGERED: SkillsFuture Done → Cash/PayNow transition');
    
    const steps = [
      'Changing final payment method',
      'Updating registration status',
      'Updating payment status',
      'Clearing payment details',
      'Updating vacancies counter',
    ];

    if (progressTracker) progressTracker.start(steps);
    else showUpdatePopup('Updating in progress... Please wait ...');

    // Step 1: Persist the method change (SkillsFuture → Cash/PayNow).
    console.log('[Case 9] Step 1: Changing final payment method to:', newValue);
    const res = await editRegistrationField(id, 'finalPaymentMethod', newValue);
    if (!isApiResultSuccessful(res)) {
      console.error('[Case 9] ❌ Step 1 FAILED: Could not update finalPaymentMethod');
      if (progressTracker) progressTracker.error();
      else closePopup();
      throw new Error(`Failed to update final payment method for registration ${id}`);
    }
    console.log('[Case 9] ✅ Step 1 Complete: finalPaymentMethod updated to', newValue);

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Final Payment Method (by Staff)',
      oldValue: oldValue || '',
      newValue,
    }));

    // Step 2: Registration status → Submitted
    if (progressTracker) progressTracker.advance();
    console.log('[Case 9] Step 2: Updating registration status to Submitted');

    const regRes = await editRegistrationField(id, 'registrationStatus', 'Submitted');
    if (isApiResultSuccessful(regRes)) {
      event.data.registrationStatus = 'Submitted';
      console.log('[Case 9] ✅ Step 2 Complete: registrationStatus updated to Submitted');
      await logRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Registration Status (Auto)',
        oldValue: currentRegistrationStatus || '',
        newValue: 'Submitted',
      }));
    } else {
      console.warn('[Case 9] ⚠️ Step 2 WARN: registrationStatus update may have failed');
    }

    // Step 3: Payment status → Pending (also sets confirmed = false on the backend)
    if (progressTracker) progressTracker.advance();
    console.log('[Case 9] Step 3: Updating payment status to Pending');

    const payRes = await updatePaymentStatus(id, 'Pending', userName, userRole);
    if (isApiResultSuccessful(payRes)) {
      event.data.status        = 'Pending';
      event.data.paymentStatus = 'Pending';
      event.data.confirmed = false;
      if (event.data.officialInfo) event.data.officialInfo.confirmed = false;
      console.log('[Case 9] ✅ Step 3 Complete: Payment status updated to Pending');
      await logRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Payment Status (Auto)',
        oldValue: currentPaymentStatus || '',
        newValue: 'Pending',
      }));
    } else {
      console.warn('[Case 9] ⚠️ Step 3 WARN: Payment status update may have failed');
    }

    // Step 4: Clear receipt number, payment date, and time
    if (progressTracker) progressTracker.advance();
    console.log('[Case 9] Step 4: Clearing payment details');

    await clearPaymentDetails(id);
    event.data.recinvNo    = '';
    event.data.paymentDate = '';
    event.data.paymentTime = '';
    if (event.data.officialInfo) {
      event.data.officialInfo.receiptNo = '';
      event.data.officialInfo.date      = '';
      event.data.officialInfo.time      = '';
    }
    console.log('[Case 9] ✅ Step 4 Complete: Payment details cleared');

    // Step 5: Update WooCommerce to increase vacancies counter (LAST STEP)
    if (progressTracker) progressTracker.advance();
    console.log('[Case 9] Step 5: Updating vacancies counter in WooCommerce');

    if (updateWooCommerce && typeof updateWooCommerce === 'function') {
      try {
        const wooRes = await updateWooCommerce(courseChiName, courseEngName, courseLocation, 'Change of Final Payment Method');
        console.log('[Case 9] ✅ Step 5 Complete: Vacancies counter increased by 1', { courseEngName, courseLocation });
      } catch (wooError) {
        console.warn('[Case 9] ⚠️ Step 5 WARN: WooCommerce update failed but continuing:', wooError.message);
        // Don't fail the entire flow - WooCommerce sync is best-effort
      }
    } else {
      console.warn('[Case 9] ⚠️ Step 5 WARN: updateWooCommerce function not available');
    }

    // Refresh all affected columns so the grid reflects the new state immediately
    if (event.api && typeof event.api.refreshCells === 'function') {
      console.log('[Case 9] Refreshing table cells');
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: [
          'paymentStatusCashPayNow', 'paymentStatusSkillsFuture',
          'finalPaymentMethod', 'confirmed', 'registrationStatus',
          'recinvNo', 'paymentDate', 'paymentTime',
        ],
        force: true,
      });
    }

    if (refreshChild) refreshChild();
    if (progressTracker) {
      progressTracker.finish(null, { immediateClose: true });
      console.log('[Case 9] ✅ ALL STEPS COMPLETE');
    } else {
      closePopup();
    }

    return { updated: true, generatedNo: '' };
  }

  // ── Full path: non-Pending state (or first-time method set) ───────────────
  // Generate a receipt only when setting Cash/PayNow for the first time (not when swapping methods)
  const isCashOrPayNow = newValue === 'Cash' || newValue === 'PayNow';
  const willGenerateReceipt = (newValue === 'Cash' || newValue === 'PayNow') && !isPaymentMethodSwap;
  const shouldSyncWooCommerceStock =
    courseInfo?.courseType === 'NSA' &&
    isCashOrPayNow &&
    !isPaymentMethodSwap;
  // Open tab immediately (before any awaits) to avoid browser popup blocker
  const preOpenedTab = willGenerateReceipt ? window.open('', '_blank') : null;

  const shouldShowProgress = true;

  const steps = isPaymentMethodSwap
    ? [
        'Changing final payment method',
        'Updating registration status',
        'Updating payment status',
        'Clearing payment details',
      ]
    : [
        ...(isCashOrPayNow ? ['Updating payment status'] : ['Updating payment status']),
        'Updating registration status',
        ...(shouldSyncWooCommerceStock ? ['Updating vacancies counter'] : []),
        ...(willGenerateReceipt
          ? ['Generating receipt number', 'Generating receipt', 'Recording payment date and time', 'Downloading and previewing receipt']
          : []),
      ];

  if (shouldShowProgress && progressTracker) {
    progressTracker.start(steps);
  } else if (shouldShowProgress) {
    showUpdatePopup('Updating in progress... Please wait ...');
  }

  // Step 1: Update final payment method via backend payment-method flow.
  const res = isPaymentMethodSwap
    ? await editRegistrationField(id, 'finalPaymentMethod', newValue)
    : await updatePaymentMethod(id, newValue, userName);
  if (!isApiResultSuccessful(res)) {
    if (preOpenedTab) preOpenedTab.close();
    if (shouldShowProgress && progressTracker) progressTracker.error();
    else if (shouldShowProgress) closePopup();
    throw new Error(`Failed to update final payment method for registration ${id}`);
  }

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Final Payment Method (by Staff)',
    oldValue: oldValue || '',
    newValue,
  }));

  event.data.finalPaymentMethod = newValue;

  if (!isPaymentMethodSwap) {
    const nextPaymentStatus = isCashOrPayNow ? 'Paid' : 'Pending';
    const nextRegistrationStatus = isCashOrPayNow ? 'Confirmed Slot' : 'Submitted';

    event.data.status = nextPaymentStatus;
    event.data.paymentStatus = nextPaymentStatus;
    event.data.registrationStatus = nextRegistrationStatus;
    event.data.confirmed = false;
    if (event.data.officialInfo) {
      event.data.officialInfo.confirmed = false;
    }

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Payment Status (Auto)',
      oldValue: currentPaymentStatus || '',
      newValue: nextPaymentStatus,
    }));

    if (shouldShowProgress && progressTracker) progressTracker.advance();

    await logRegistrationUpdate(buildLogPayload({
      userName, sn, id, participantInfo,
      columnName: 'Registration Status (Auto)',
      oldValue: currentRegistrationStatus || '',
      newValue: nextRegistrationStatus,
    }));

    if (shouldSyncWooCommerceStock) {
      if (shouldShowProgress && progressTracker) progressTracker.advance();
      await updateWooCommerce(courseChiName, courseEngName, courseLocation, 'Paid');
    }
  } else {
    // Step 2: Update registration status to Submitted
    if (shouldShowProgress && progressTracker) progressTracker.advance();

    const regRes = await editRegistrationField(id, 'registrationStatus', 'Submitted');
    if (isApiResultSuccessful(regRes)) {
      event.data.registrationStatus = 'Submitted';
      await logRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Registration Status (Auto)',
        oldValue: currentRegistrationStatus || '',
        newValue: 'Submitted',
      }));
    }

    // Step 3: Update payment status to Pending
    if (shouldShowProgress && progressTracker) progressTracker.advance();

    const payRes = await updatePaymentStatus(id, 'Pending', userName, userRole);
    if (isApiResultSuccessful(payRes)) {
      // Keep both fields in sync so subsequent swaps in the same session read correctly
      event.data.status = 'Pending';
      event.data.paymentStatus = 'Pending';
      // Backend sets official.confirmed = false for Pending status — mirror it locally
      event.data.confirmed = false;
      if (event.data.officialInfo) {
        event.data.officialInfo.confirmed = false;
      }
      await logRegistrationUpdate(buildLogPayload({
        userName, sn, id, participantInfo,
        columnName: 'Payment Status (Auto)',
        oldValue: currentPaymentStatus || '',
        newValue: 'Pending',
      }));
    }
  }

  // Step 4: clear receipt number, payment date, and time when swapping payment methods
  if (isPaymentMethodSwap) {
    if (shouldShowProgress && progressTracker) progressTracker.advance();

    await clearPaymentDetails(id);

    // Update local row data immediately so grid reflects the cleared values at once
    event.data.recinvNo    = '';
    event.data.paymentDate = '';
    event.data.paymentTime = '';
    if (event.data.officialInfo) {
      event.data.officialInfo.receiptNo = '';
      event.data.officialInfo.date      = '';
      event.data.officialInfo.time      = '';
    }
  }

  if (event.api && typeof event.api.refreshCells === 'function') {
    event.api.refreshCells({
      rowNodes: [event.node],
      columns: ['paymentStatusCashPayNow', 'paymentStatusSkillsFuture', 'finalPaymentMethod', 'confirmed', 'registrationStatus', 'recinvNo', 'paymentDate', 'paymentTime', 'remarks'],
      force: true,
    });
  }

  // Generate receipt PDF and open in new tab for Cash / PayNow
  if (willGenerateReceipt && autoReceiptGenerator) {
    if (progressTracker) progressTracker.advance(); // → Generating receipt number

    let receiptResult = null;
    try {
      const RECEIPT_TIMEOUT_MS = 30000;
      receiptResult = await Promise.race([
        autoReceiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue, 'Paid', progressTracker),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Receipt generation timed out')), RECEIPT_TIMEOUT_MS)
        ),
      ]);
    } catch (receiptErr) {
      console.error('Receipt generation failed or timed out:', receiptErr);
      if (preOpenedTab) preOpenedTab.close();
    }

    // Step: Recording payment date and time
    if (progressTracker) progressTracker.advance();

    if (receiptResult?.receiptNo) {
      // Use the exact date/time returned from generatePDFReceipt (same values sent to addReceiptNumber)
      const _dispDate = receiptResult.paymentDate;
      const _dispTime = receiptResult.paymentTime;
      event.data.recinvNo    = receiptResult.receiptNo;
      event.data.paymentDate = _dispDate;
      event.data.paymentTime = _dispTime;
      if (event.data.officialInfo) {
        event.data.officialInfo.receiptNo = receiptResult.receiptNo;
        event.data.officialInfo.date      = _dispDate;
        event.data.officialInfo.time      = _dispTime;
      }
      if (event.api && typeof event.api.refreshCells === 'function') {
        event.api.refreshCells({
          rowNodes: [event.node],
          columns: ['recinvNo', 'paymentDate', 'paymentTime'],
          force: true,
        });
      }
    }

    if (receiptResult?.blob && progressTracker) {
      progressTracker.advance(); // → Downloading and previewing receipt
    }

    if (receiptResult?.blob) {
      try {
        const blobUrl = window.URL.createObjectURL(receiptResult.blob);
        if (preOpenedTab) preOpenedTab.location.href = blobUrl;
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = receiptResult.filename || 'receipt.pdf';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
      } catch (blobErr) {
        console.error('Failed to open receipt:', blobErr);
      }
    }
  }

  if (shouldShowProgress && progressTracker) {
    // Schedule a table data reload to happen once the progress modal closes.
    // refreshChild detects that progressModalOpen is true and sets _pendingRefreshChild = true.
    // componentDidUpdate then calls refreshChild({ force: true }) when the modal closes.
    if (refreshChild) refreshChild();
    progressTracker.finish(null, { immediateClose: true });
  } else if (shouldShowProgress) {
    closePopup();
  }

  return { updated: true, generatedNo: '' };
}
