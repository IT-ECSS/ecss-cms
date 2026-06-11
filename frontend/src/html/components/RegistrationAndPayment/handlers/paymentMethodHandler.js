/**
 * Payment Method (indicated by participant) handler
 * 
 * This is STEP 1 in the sequential workflow:
 * 1. Participant sets Payment Method (indicated by participant)
 *    → Updates course.payment AND course.finalPaymentMethod (both synced)
 *    → Sets default payment status to "Pending"
 *    → Sets default registration status to "Submitted"
 *    → Clears payment details (receipt/invoice, date, time)
 *    → Voids invoice if changing FROM SkillsFuture
 * 
 * 2. Staff can then update Final Payment Method (by staff) if needed
 *    → Can approve with same method or change to different method
 *    → Updates ONLY finalPaymentMethod (keeps paymentMethod unchanged for audit trail)
 *    → Can set payment status to "Paid", "Generating Invoice", etc.
 *    → Triggers receipt/invoice generation for approved methods
 * 
 * KEY REQUIREMENT:
 * When participant updates Payment Method, BOTH fields are synchronized:
 * - paymentMethod = participant's choice (original preference)
 * - finalPaymentMethod = same as paymentMethod (source of truth until staff override)
 * 
 * This allows staff to later override finalPaymentMethod while keeping the participant's
 * original choice visible for audit trail purposes.
 * 
 * WORKFLOW:
 * Payment Method (participant) → Default Status Set (Pending/Submitted) → Final Payment Method (staff optional override) → Payment Approval
 */

import {
  updatePaymentMethod,
  clearPaymentDetails,
  addCancelRemarks,
} from '../services/registrationApi';

import {
  isApiResultSuccessful,
  buildLogPayload,
  resolveEventId,
  appendNumberedRemark,
  getCurrentTimestampLabel,
} from './handlerHelpers';

import { logRegistrationUpdate } from '../../../../utils/auditLog';

/**
 * Handler for "Payment Method (indicated by participant)" column.
 * 
 * CRITICAL REQUIREMENT:
 * When participant updates Payment Method, BOTH fields MUST be updated:
 * 1. course.paymentMethod (or course.payment) = participant's choice
 * 2. course.finalPaymentMethod = same as paymentMethod (initial sync)
 * 
 * This ensures that:
 * - finalPaymentMethod starts as the participant's choice
 * - Staff can later override finalPaymentMethod while keeping paymentMethod for audit trail
 * - All payment processing uses finalPaymentMethod as source of truth
 * 
 * This DOES:
 * 1. Update course.payment to participant's selected method
 * 2. Auto-sync course.finalPaymentMethod to match payment method (BOTH fields updated)
 * 3. Set payment status to "Pending" (default)
 * 4. Set registration status to "Submitted" (default)
 * 5. Clear payment details (receipt/invoice number, date, time)
 * 6. Void SkillsFuture invoice if switching FROM SkillsFuture (audit trail)
 * 7. Refresh grid to show both updated fields
 * 
 * This DOES NOT:
 * - Generate receipts/invoices (that happens when staff sets "Paid" or invoice status)
 * - Change payment status beyond setting default "Pending"
 * - Lock the record (staff can still override via Final Payment Method)
 */
export async function handlePaymentMethodChange(event, context) {
  const { userName, progressTracker, showUpdatePopup, closePopup } = context;
  
  const id = resolveEventId(event.data);
  if (!id) {
    throw new Error('Missing MongoDB _id for payment method update');
  }
  
  const sn = event.data.sn;
  const participantInfo = event.data.participantInfo;
  const newValue = String(event.value || '').trim();
  const oldValue = String(event.oldValue || '').trim();

  console.log('═══════════════════════════════════════════════════════');
  console.log('[PaymentMethod] ENTRY - Participant Payment Method Change');
  console.log('═══════════════════════════════════════════════════════');
  console.log('[PaymentMethod] Change:', { oldValue, newValue });

  if (newValue === oldValue) {
    return { updated: false };
  }

  // Show progress tracker while updating
  if (progressTracker) {
    progressTracker.start([
      'Updating payment method (indicated by participant)',
      'Syncing to Final Payment Method',
      'Setting default payment status to Pending',
      'Setting registration status to Submitted',
      'Clearing payment details',
      'Updating grid display'
    ]);
  } else {
    showUpdatePopup('Updating payment method... Please wait');
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Step 0: Capture CURRENT remarks BEFORE any operations
    // (In case remarks already exist and we need to preserve them)
    // ─────────────────────────────────────────────────────────────────────────
    const currentRemarks = event.data?.remarks || event.data?.official?.remarks || event.data?.officialInfo?.remarks || '';
    
    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: Void SkillsFuture Invoice if switching FROM SkillsFuture
    // ─────────────────────────────────────────────────────────────────────────
    // CRITICAL: Check the CURRENT FINAL PAYMENT METHOD (latest source of truth),
    // not the old Payment Method value. This ensures we void the correct invoice.
    const currentFinalPaymentMethod = String(event.data?.finalPaymentMethod || '').trim();
    const isCurrentlySkillsFuture = currentFinalPaymentMethod === 'SkillsFuture';
    const isChangingToNonSkillsFuture = (newValue === 'Cash' || newValue === 'PayNow');
    
    const shouldVoidSkillsFutureInvoice = isCurrentlySkillsFuture && isChangingToNonSkillsFuture;
    let voidRemarkText = '';
    
    if (shouldVoidSkillsFutureInvoice) {
      const existingReceiptNo = String(event.data.recinvNo || event.data.officialInfo?.receiptNo || '').trim();
      if (existingReceiptNo) {
        console.log('[PaymentMethod] Voiding SkillsFuture invoice based on CURRENT Final Payment Method:', {
          currentFinalPaymentMethod,
          newPaymentMethod: newValue,
          existingReceiptNo
        });
        try {
          const docType = 'SkillsFuture Invoice Number';
          const voidMarker = `${docType} ${existingReceiptNo} is void`;
          voidRemarkText = `[${getCurrentTimestampLabel()}] ${voidMarker}`;
          
          // Add void remark to backend
          await addCancelRemarks(id, voidRemarkText);
          console.log('[PaymentMethod] ✅ Void remark sent to backend');
          
          // Update local event data with numbered remark for immediate display
          if (event.data.official) {
            appendNumberedRemark(event.data.official, voidRemarkText);
          } else if (event.data.officialInfo) {
            appendNumberedRemark(event.data.officialInfo, voidRemarkText);
          } else {
            appendNumberedRemark(event.data, voidRemarkText);
          }
          console.log('[PaymentMethod] ✅ Void remark added locally to event.data');
        } catch (voidError) {
          console.warn('[PaymentMethod] ⚠️ Failed to void invoice:', voidError.message);
          // Continue even if void fails
        }
      }
    } else {
      console.log('[PaymentMethod] No invoice void needed:', {
        currentFinalPaymentMethod,
        newPaymentMethod: newValue,
        isCurrentlySkillsFuture,
        isChangingToNonSkillsFuture
      });
    }

    if (progressTracker) progressTracker.advance();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2: Update Payment Method
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[PaymentMethod] Step 2: Calling updatePaymentMethod API');
    const result = await updatePaymentMethod(id, newValue, userName);
    
    if (!isApiResultSuccessful(result)) {
      console.error('[PaymentMethod] ❌ API call failed. Response:', result?.data);
      throw new Error(`Failed to update payment method for registration ${id}`);
    }

    console.log('[PaymentMethod] ✅ API response successful');

    // Extract the updated document from API response
    const apiResult = result?.data?.result;
    const updatedDocument = apiResult?.updatedDocument;
    
    console.log('[PaymentMethod] API Result:', {
      acknowledged: apiResult?.acknowledged,
      modifiedCount: apiResult?.modifiedCount,
      hasUpdatedDocument: !!updatedDocument,
      updatedDocumentRemarks: updatedDocument?.official?.remarks || updatedDocument?.officialInfo?.remarks || updatedDocument?.remarks,
    });

    // Get remarks from database (updatedDocument) - this is the source of truth
    const databaseRemarks = updatedDocument?.official?.remarks || updatedDocument?.officialInfo?.remarks || updatedDocument?.remarks || '';
    
    if (updatedDocument && updatedDocument.course) {
      console.log('[PaymentMethod] Syncing course data from API response');
      console.log('[PaymentMethod] Database values:', {
        payment: updatedDocument.course.payment,
        finalPaymentMethod: updatedDocument.course.finalPaymentMethod,
        status: updatedDocument.status,
        registration_status: updatedDocument.official?.registration_status,
        remarks: databaseRemarks
      });
      
      // Merge updated document into event.data (use database values)
      event.data = { ...event.data, ...updatedDocument };
      event.data.course = { ...event.data.course, ...updatedDocument.course };
      
      // Ensure remarks come from database (latest from API response)
      // Database is the source of truth for remarks
      if (updatedDocument.official && updatedDocument.official.remarks) {
        if (!event.data.official) event.data.official = {};
        event.data.official.remarks = updatedDocument.official.remarks;
        console.log('[PaymentMethod] ✅ Synced official.remarks from database');
      }
      if (updatedDocument.officialInfo && updatedDocument.officialInfo.remarks) {
        if (!event.data.officialInfo) event.data.officialInfo = {};
        event.data.officialInfo.remarks = updatedDocument.officialInfo.remarks;
        console.log('[PaymentMethod] ✅ Synced officialInfo.remarks from database');
      }
      if (updatedDocument.remarks) {
        event.data.remarks = updatedDocument.remarks;
        console.log('[PaymentMethod] ✅ Synced remarks from database');
      }
      console.log('[PaymentMethod] ✅ All data synced from database');
    } else {
      // Fallback: manually update if updatedDocument not in response
      console.warn('[PaymentMethod] ⚠️ No updatedDocument in response, updating locally');
      event.data.paymentMethod = newValue;
      event.data.course = event.data.course || {};
      event.data.course.payment = newValue;
      event.data.course.finalPaymentMethod = newValue;
    }

    // Explicit sync for BOTH payment method fields + status updates
    // CRITICAL: When participant updates Payment Method, BOTH fields must be synced:
    // 1. paymentMethod (by Participant) = newValue
    // 2. finalPaymentMethod (source of truth) = newValue (until staff overrides it)
    event.data.paymentMethod = newValue;
    event.data.finalPaymentMethod = newValue;  // Sync to Final Payment Method
    event.data.status = 'Pending';  // Default payment status set by backend
    event.data.paymentStatus = 'Pending';
    event.data.registrationStatus = 'Submitted';  // Default registration status set by backend
    event.data.confirmed = false;
    
    if (event.data.officialInfo) {
      event.data.officialInfo.registration_status = 'Submitted';
      event.data.officialInfo.confirmed = false;
    }
    
    console.log('[PaymentMethod] Local state updated:', {
      paymentMethod: event.data.paymentMethod,
      finalPaymentMethod: event.data.finalPaymentMethod,
      status: event.data.status,
      registrationStatus: event.data.registrationStatus,
      confirmed: event.data.confirmed,
    });

    await logRegistrationUpdate(buildLogPayload({
      userName,
      sn,
      id,
      participantInfo,
      columnName: 'Payment Method (indicated by participant)',
      oldValue: oldValue || '',
      newValue,
    }));

    console.log('[PaymentMethod] ✅ Payment method updated and synced to Final Payment Method');

    if (progressTracker) progressTracker.advance();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3: Default Payment Status Set to Pending
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[PaymentMethod] Step 3: Default payment status set to Pending (by backend)');
    console.log('[PaymentMethod] ✅ Payment status: Pending | Registration status: Submitted');

    if (progressTracker) progressTracker.advance();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 4: Default Registration Status Set to Submitted
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[PaymentMethod] Step 4: Default registration status set to Submitted (by backend)');

    if (progressTracker) progressTracker.advance();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 5: Clear Payment Details (receipt/invoice number, date, time)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[PaymentMethod] Step 5: Clearing payment details');
    await clearPaymentDetails(id);
    
    event.data.recinvNo    = '';
    event.data.paymentDate = '';
    event.data.paymentTime = '';
    if (event.data.officialInfo) {
      event.data.officialInfo.receiptNo = '';
      event.data.officialInfo.date      = '';
      event.data.officialInfo.time      = '';
    }
    if (event.data.official) {
      event.data.official.receiptNo = '';
      event.data.official.date      = '';
      event.data.official.time      = '';
    }

    console.log('[PaymentMethod] ✅ Payment details cleared');

    if (progressTracker) progressTracker.advance();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 6: Update Grid Row Data Explicitly
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[PaymentMethod] Step 6: Updating grid row node data with remarks');
    
    // Ensure AG-Grid has the updated values
    if (event.node && event.node.data) {
      event.node.data.paymentMethod = newValue;
      event.node.data.finalPaymentMethod = newValue;
      event.node.data.status = 'Pending';
      event.node.data.paymentStatus = 'Pending';
      event.node.data.registrationStatus = 'Submitted';
      event.node.data.confirmed = false;
      event.node.data.recinvNo = '';
      event.node.data.paymentDate = '';
      event.node.data.paymentTime = '';
      
      // CRITICAL: Sync remarks from ALL sources to event.node.data (so grid displays void remarks)
      // Priority: top-level → official → officialInfo
      if (event.data?.remarks) {
        event.node.data.remarks = event.data.remarks;
        console.log('[PaymentMethod] ✅ Synced top-level remarks to grid:', event.data.remarks);
      } else if (event.data?.official?.remarks) {
        event.node.data.remarks = event.data.official.remarks;
        console.log('[PaymentMethod] ✅ Synced official.remarks to grid:', event.data.official.remarks);
      } else if (event.data?.officialInfo?.remarks) {
        event.node.data.remarks = event.data.officialInfo.remarks;
        console.log('[PaymentMethod] ✅ Synced officialInfo.remarks to grid:', event.data.officialInfo.remarks);
      }
      
      // Also ensure nested remarks are synced
      if (event.data.official?.remarks) {
        event.node.data.official = event.node.data.official || {};
        event.node.data.official.remarks = event.data.official.remarks;
      }
      if (event.data.officialInfo?.remarks) {
        event.node.data.officialInfo = event.node.data.officialInfo || {};
        event.node.data.officialInfo.remarks = event.data.officialInfo.remarks;
      }
      
      // Also sync course data
      if (!event.node.data.course) {
        event.node.data.course = {};
      }
      event.node.data.course.payment = newValue;
      event.node.data.course.finalPaymentMethod = newValue;
      
      console.log('[PaymentMethod] ✅ Grid row data updated:', {
        paymentMethod: event.node.data.paymentMethod,
        finalPaymentMethod: event.node.data.finalPaymentMethod,
        status: event.node.data.status,
        registrationStatus: event.node.data.registrationStatus,
      });
    }

    if (progressTracker) progressTracker.advance();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 7: Refresh Table Columns
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[PaymentMethod] Step 7: Refreshing table columns');
    if (event.api && typeof event.api.refreshCells === 'function') {
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: [
          'paymentMethod',                      // Updated
          'finalPaymentMethod',                 // Auto-synced
          'paymentStatusCashPayNow',            // Reflects new Pending status
          'paymentStatusSkillsFuture',          // Reflects new Pending status
          'registrationStatus',                 // Now Submitted
          'recinvNo',                           // Cleared
          'paymentDate',                        // Cleared
          'paymentTime',                        // Cleared
          'remarks',                            // Void message if applicable
          'confirmed',                          // Reset to false
        ],
        force: true,
      });
      console.log('[PaymentMethod] ✅ Columns refreshed');
    }

    if (progressTracker) progressTracker.advance();

    // ─────────────────────────────────────────────────────────────────────────
    // Complete: Payment method change fully processed
    // ─────────────────────────────────────────────────────────────────────────
    if (progressTracker) {
      progressTracker.finish('✅ Payment method updated with default status "Pending" and registration status "Submitted"! Staff can now update "Final Payment Method (by staff)" if approval is needed.', { 
        immediateClose: true,
      });
    } else {
      closePopup();
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('[PaymentMethod] COMPLETE - Payment Method & Default Status Updated');
    console.log('═══════════════════════════════════════════════════════');
    console.log('[PaymentMethod] Summary:', {
      paymentMethod: event.data.paymentMethod,
      finalPaymentMethod: event.data.finalPaymentMethod,
      paymentStatus: 'Pending',
      registrationStatus: 'Submitted',
      detailsCleared: true,
    });

    return { updated: true };

  } catch (error) {
    console.error('[PaymentMethod] ❌ ERROR:', error);
    if (progressTracker) {
      progressTracker.error(`Failed: ${error.message}`);
    } else {
      showUpdatePopup(`Error: ${error.message}`);
    }
    throw error;
  }
}
