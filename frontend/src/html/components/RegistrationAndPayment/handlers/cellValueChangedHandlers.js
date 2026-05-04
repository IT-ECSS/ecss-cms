/**
 * Handlers for AG-Grid onCellValueChanged events in the Registration & Payment table.
 *
 * Each exported function handles one column's update logic.
 * They all receive a `context` object that mirrors the data normally accessed via
 * `this` inside the class component:
 *
 *   context = {
 *     userName,              // string
 *     showUpdatePopup,       // fn(message)
 *     closePopup,            // fn()
 *     updateWooCommerce,     // fn(chiName, engName, location, status)
 *     autoReceiptGenerator,  // fn(id, participantInfo, courseInfo, officialInfo, method, status)
 *     receiptGenerator,      // fn(id, participantInfo, courseInfo, officialInfo, status)
 *     refreshChild,          // fn()
 *   }
 */

import {
  updatePaymentMethod,
  updatePaymentStatus,
  updateConfirmationStatus,
  editRegistrationField,
  addCancelRemarks,
  addRefundedDate,
  removeRefundedDate,
} from '../services/registrationApi';

import { logRegistrationUpdate } from '../../../../utils/auditLog';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds the common log payload shared by all update calls.
 */
function buildLogPayload({ userName, sn, id, participantInfo, columnName, oldValue, newValue }) {
  return {
    userName,
    module: 'Registration And Payment',
    sn,
    recordId: id,
    participantName: participantInfo?.name || 'Unknown',
    contactNumber: participantInfo?.contactNumber || 'N/A',
    columnName,
    oldValue,
    newValue,
  };
}

// ─── column handlers ──────────────────────────────────────────────────────────

/**
 * Handles changes to the "Payment Method" column.
 * Auto-sets status to Paid and generates a receipt when switching to Cash or PayNow.
 */
export async function handlePaymentMethodChange(event, context) {
  const { userName, showUpdatePopup, closePopup, updateWooCommerce, autoReceiptGenerator } = context;

  const id             = event.data.id;
  const sn             = event.data.sn;
  const courseName     = event.data.course;
  const courseChiName  = event.data.courseChi;
  const courseLocation = event.data.location;
  const newValue       = event.value;
  const oldPaymentMethod = event.oldValue;
  const oldPaymentStatus = event.data.paymentStatus;
  const participantInfo  = event.data.participantInfo;
  const courseInfo       = event.data.courseInfo;
  const officialInfo     = event.data.officialInfo;

  showUpdatePopup('Updating in progress... Please wait ...');

  await updatePaymentMethod(id, newValue, userName);

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Payment Method',
    oldValue: oldPaymentMethod,
    newValue,
  }));

  if (newValue === 'Cash' || newValue === 'PayNow') {
    await handleAutoSetPaidStatus({
      id, sn, userName,
      courseName, courseChiName, courseLocation,
      participantInfo, courseInfo, officialInfo,
      oldPaymentStatus,
      newPaymentMethod: newValue,
      updateWooCommerce,
      autoReceiptGenerator,
    });
  }

  closePopup();
}

/**
 * Auto-sets payment status to "Paid" after a Cash / PayNow method change.
 * Extracted to keep `handlePaymentMethodChange` readable.
 */
async function handleAutoSetPaidStatus({
  id, sn, userName,
  courseName, courseChiName, courseLocation,
  participantInfo, courseInfo, officialInfo,
  oldPaymentStatus, newPaymentMethod,
  updateWooCommerce, autoReceiptGenerator,
}) {
  const res = await updatePaymentStatus(id, 'Paid', userName);

  if (res.data.result !== true) return;

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Payment Status (Auto)',
    oldValue: oldPaymentStatus || 'Pending',
    newValue: 'Paid',
  }));

  await Promise.all([
    updateWooCommerce(courseChiName, courseName, courseLocation, 'Paid'),
    autoReceiptGenerator(id, participantInfo, courseInfo, officialInfo, newPaymentMethod, 'Paid'),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles changes to the "Confirmation Status" column (SkillsFuture toggle).
 * Auto-triggers invoice generation when the SF participant is confirmed.
 */
export async function handleConfirmationStatusChange(event, context) {
  const { userName, showUpdatePopup, closePopup, autoReceiptGenerator } = context;

  const id            = event.data.id;
  const sn            = event.data.sn;
  const newValue      = event.value;
  const oldConfirmation = event.oldValue;
  const participantInfo = event.data.participantInfo;
  const courseInfo    = event.data.courseInfo;
  const officialInfo  = event.data.officialInfo;
  const paymentMethod = event.data.paymentMethod;
  const paymentStatus = event.data.paymentStatus;

  showUpdatePopup('Updating in progress... Please wait ...');

  const res = await updateConfirmationStatus(id, newValue, userName);

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Confirmation',
    oldValue: oldConfirmation ? 'Confirmed' : 'Not Confirmed',
    newValue: newValue ? 'Confirmed' : 'Not Confirmed',
  }));

  if (paymentMethod === 'SkillsFuture'/* && newValue === true*/ && res.data.result === true) {
    await handleSkillsFutureConfirmation({
      id, sn, userName,
      participantInfo, courseInfo, officialInfo,
      paymentMethod, paymentStatus,
      autoReceiptGenerator,
    });
  }

  closePopup();
}

/**
 * Triggers SkillsFuture invoice generation after a participant is confirmed.
 */
async function handleSkillsFutureConfirmation({
  id, sn, userName,
  participantInfo, courseInfo, officialInfo,
  paymentMethod, paymentStatus,
  autoReceiptGenerator,
}) {
  const sfRes = await updatePaymentStatus(id, 'Generating SkillsFuture Invoice', userName);

  if (sfRes.data.result !== true) return;

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Payment Status (Auto - SkillsFuture)',
    oldValue: paymentStatus || 'Pending',
    newValue: 'Generating SkillsFuture Invoice',
  }));

  await autoReceiptGenerator(id, participantInfo, courseInfo, officialInfo, paymentMethod, 'Generating SkillsFuture Invoice');
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles changes to the "Registration and Payment Status", "Registration Status",
 * or "Payment Status" columns.
 */
export async function handlePaymentStatusChange(event, context) {
  const { userName, showUpdatePopup, closePopup, updateWooCommerce, receiptGenerator } = context;

  const id             = event.data.id;
  const sn             = event.data.sn;
  const columnName     = event.colDef.headerName;
  const courseName     = event.data.course;
  const courseChiName  = event.data.courseChi;
  const courseLocation = event.data.location;
  const newValue       = event.value;
  const oldPaymentStatus = event.oldValue;
  const participantInfo  = event.data.participantInfo;
  const courseInfo       = event.data.courseInfo;
  const officialInfo     = event.data.officialInfo;
  const paymentMethod    = event.data.paymentMethod;

  showUpdatePopup('Updating in progress... Please wait ...');

  const res = await updatePaymentStatus(id, newValue, userName);

  if (res.data.result !== true) {
    closePopup();
    return;
  }

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName,
    oldValue: oldPaymentStatus,
    newValue,
  }));

  if (paymentMethod === 'Cash' || paymentMethod === 'PayNow') {
    await handleCashPayNowStatusChange({
      id, courseName, courseChiName, courseLocation,
      newValue, oldPaymentStatus,
      participantInfo, courseInfo, officialInfo,
      updateWooCommerce, receiptGenerator,
    });
  } else if (paymentMethod === 'SkillsFuture') {
    await handleSkillsFutureStatusChange({
      id, courseName, courseChiName, courseLocation,
      newValue, oldPaymentStatus,
      updateWooCommerce,
    });
  } else if (courseInfo.courseType === 'ILP' || courseInfo.courseType === 'Talks And Seminar') {
    await handleILPOrTalksStatusChange({
      courseName, courseChiName, courseLocation,
      newValue,
      updateWooCommerce,
    });
  }

  closePopup();
}

/**
 * Side-effects for Cash / PayNow payment method when the status changes.
 */
async function handleCashPayNowStatusChange({
  id, courseName, courseChiName, courseLocation,
  newValue, oldPaymentStatus,
  participantInfo, courseInfo, officialInfo,
  updateWooCommerce, receiptGenerator,
}) {
  if (newValue === 'Withdrawn' && oldPaymentStatus === 'Paid') {
    await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
    await removeRefundedDate(id);
  } else if (newValue === 'Refunded') {
    await addRefundedDate(id);
  } else {
    await Promise.all([
      updateWooCommerce(courseChiName, courseName, courseLocation, newValue),
      receiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue),
    ]);
  }
}

/**
 * Side-effects for SkillsFuture payment method when the status changes.
 */
async function handleSkillsFutureStatusChange({
  id, courseName, courseChiName, courseLocation,
  newValue, oldPaymentStatus,
  updateWooCommerce,
}) {
  if (newValue === 'SkillsFuture Done') {
    await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
  } else if (newValue === 'Cancelled' || newValue === 'Refunded' || newValue === 'Withdrawn') {
    if (oldPaymentStatus === 'SkillsFuture Done') {
      await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
      await removeRefundedDate(id);
    } else if (newValue === 'Refunded') {
      await addRefundedDate(id);
    }
  }
}

/**
 * Side-effects for ILP / Talks And Seminar course types when the status changes.
 */
async function handleILPOrTalksStatusChange({
  courseName, courseChiName, courseLocation,
  newValue,
  updateWooCommerce,
}) {
  const statuses = ['Confirmed', 'Paid', 'Cancelled', 'Withdrawn', 'Not Successful'];
  if (statuses.includes(newValue)) {
    await updateWooCommerce(courseChiName, courseName, courseLocation, newValue);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles changes to the "Remarks" column.
 */
export async function handleRemarksChange(event, context) {
  const { userName } = context;

  const id          = event.data.id;
  const sn          = event.data.sn;
  const newValue    = event.value;
  const participantInfo = event.data.participantInfo;

  if (!newValue) {
    alert('No remarks added');
    return;
  }

  await addCancelRemarks(id, newValue);

  await logRegistrationUpdate(buildLogPayload({
    userName, sn, id, participantInfo,
    columnName: 'Remarks',
    oldValue: event.oldValue || '',
    newValue,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles changes to the "Refunded Date" column.
 */
export async function handleRefundedDateChange(event, context) {
  const { userName } = context;

  const id          = event.data.id;
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fallback handler for any other editable column — persists the raw field value.
 */
export async function handleGenericFieldChange(event) {
  const id = event.data.id;
  await editRegistrationField(id, event.colDef.field, event.value);
}
