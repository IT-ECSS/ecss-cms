/**
 * Central export point for all AG-Grid cell handlers.
 * Re-exports all handlers from specialized modules.
 */

// Final payment method handler (staff override)
export {
  handleFinalPaymentMethodChange,
} from './finalPaymentMethodHandler';

// Confirmation handlers
export {
  handleConfirmationStatusChange,
  handleSkillsFutureConfirmation,
} from './confirmationHandlers';

// Payment status handlers
export {
  handlePaymentStatusChange,
  handleCashPayNowStatusChange,
  handleSkillsFutureStatusChange,
  handleILPOrTalksStatusChange,
} from './paymentStatusHandlers';

// Other handlers
export {
  handleRemarksChange,
  handleRefundedDateChange,
  handleRegistrationStatusChange,
  handleGenericFieldChange,
} from './otherHandlers';

// Helper utilities and common functions
export {
  RECENT_VOID_REMARK_WINDOW_MS,
  recentVoidRemarkByKey,
  waitForNextPaint,
  isResultSuccessful,
  isApiResultSuccessful,
  isSkillsFutureInvoiceNumber,
  inferDocumentType,
  getCurrentTimestampLabel,
  appendLocalRemark,
  buildLogPayload,
  updateFinalPaymentMethodIfNeeded,
  autoSetConfirmedSlotRegistrationStatus,
  appendVoidedNumberRemark,
} from './handlerHelpers';
