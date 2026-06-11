import React from 'react';
import '../../../../css/sub/paymentRegistrationStatusModal.css';

/**
 * PaymentRegistrationStatusModal - Displays validation error when trying to select 
 * incompatible Payment Status and Registration Status combinations for NSA courses.
 *
 * Prerequisite Validation Rules:
 * 1. "Paid" or "SkillsFuture Done" → requires "Confirmed Slot" (Registration Status)
 * 2. "To Refund" → requires "Cancellation before Payment", "Cancellation after Payment", or "Withdrawn" (Registration Status)
 * 3. "Not Successful" (Registration Status) → requires "Cancelled - No payment received" (Payment Status)
 *
 * Props:
 *   isOpen - boolean: whether the modal is visible
 *   errorType - string: 'payment_status_change' | 'registration_status_change'
 *   attemptedValue - string: the status value user tried to select
 *   currentPaymentStatus - string: current payment status
 *   currentRegistrationStatus - string: current registration status
 *   onClose - function: callback to close the modal
 */
function PaymentRegistrationStatusModal({
  isOpen,
  errorType = 'payment_status_change',
  attemptedValue,
  currentPaymentStatus,
  currentRegistrationStatus,
  onClose,
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Determine error message based on what the user tried to do
  let errorMessage = '';
  let prerequisiteMessage = '';
  let suggestedAction = '';

  if (errorType === 'payment_status_change') {
    // User tried to change Payment Status
    if (attemptedValue === 'Paid' || attemptedValue === 'SkillsFuture Done') {
      errorMessage = `Cannot change Payment Status to "${attemptedValue}"`;
      prerequisiteMessage = 'Registration Status must be "Confirmed Slot"';
      suggestedAction = `Change the Registration Status to "Confirmed Slot" first, then retry the Payment Status change.`;
    } else if (attemptedValue === 'To refund') {
      errorMessage = `Cannot change Payment Status to "To Refund"`;
      // prerequisiteMessage = 'Registration Status must be "Cancelled (before payment)", "Cancelled (after payment)", OR "Withdrawn"';
      prerequisiteMessage = 'Registration Status must be "Cancelled", OR "Withdrawn"';
      suggestedAction = `Change the Registration Status to "Cancelled", or "Withdrawn" first, then retry the Payment Status change.`;
      //suggestedAction = `Change the Registration Status to "Cancelled (before payment)", "Cancelled (after payment)", or "Withdrawn" first, then retry the Payment Status change.`;
    } else if (attemptedValue === 'Cancelled - No payment received') {
      errorMessage = `Cannot change Payment Status to "Cancelled - No payment received"`;
      prerequisiteMessage = 'Registration Status must be "Not Successful"';
      suggestedAction = `Change the Registration Status to "Not Successful" first, then retry the Payment Status change.`;
    }
  } else if (errorType === 'registration_status_change') {
    // User tried to change Registration Status
    if (attemptedValue === 'Confirmed Slot') {
      errorMessage = `Cannot change Registration Status to "Confirmed Slot"`;
      prerequisiteMessage = 'Payment Status must be "Paid" or "SkillsFuture Done"';
      suggestedAction = `Change the Payment Status to "Paid" or "SkillsFuture Done" first, then retry the Registration Status change.`;
    }else if (attemptedValue === 'Cancelled' || attemptedValue === 'Withdrawn') { 
    //else if (attemptedValue === 'Cancelled (before payment)' || attemptedValue === 'Cancelled (after payment)' || attemptedValue === 'Withdrawn') {
      errorMessage = `Cannot change Registration Status to "${attemptedValue}"`;
      prerequisiteMessage = 'Payment Status must be "To Refund"';
      suggestedAction = `Change the Payment Status to "To Refund" first, then retry the Registration Status change.`;
    } else if (attemptedValue === 'Not Successful') {
      errorMessage = `Cannot change Registration Status to "Not Successful"`;
      prerequisiteMessage = 'Payment Status must be "Cancelled - No payment received"';
      suggestedAction = `Change the Payment Status to "Cancelled - No payment received" first, then retry the Registration Status change.`;
    }
  }

  return (
    <div
      className="payment-registration-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-registration-title"
    >
      <div className="payment-registration-modal-container">
        {/* Header Section */}
        <div className="payment-registration-modal-header">
          <div className="payment-registration-modal-icon-wrapper">
            <span className="payment-registration-modal-icon">⚠️</span>
          </div>
          <div className="payment-registration-modal-header-content">
            <h2 className="payment-registration-modal-title" id="payment-registration-title">
              {errorMessage}
            </h2>
            <p className="payment-registration-modal-subtitle">
              Prerequisite validation rule for NSA courses
            </p>
          </div>
        </div>

        {/* Body Section */}
        <div className="payment-registration-modal-body">
          {/* Prerequisite Box with Arrow Format */}
          <div className="payment-registration-modal-requirement-box">
            <h3 className="payment-registration-modal-requirement-title">
              ✓ Prerequisite Requirement:
            </h3>
            <div className="payment-registration-modal-prerequisite-item">
              {errorType === 'payment_status_change' ? (
                <>
                  <span className="payment-registration-modal-registration-status">{prerequisiteMessage.replace('Registration Status must be ', 'Registration Status: ')}</span>
                  <span className="payment-registration-modal-arrow">←</span>
                  <span className="payment-registration-modal-payment-status">{`Payment Status: "${attemptedValue}"`}</span>
                </>
              ) : (
                <>
                  <span className="payment-registration-modal-payment-status">{prerequisiteMessage.replace('Payment Status must be ', 'Payment Status: ')}</span>
                  <span className="payment-registration-modal-arrow">←</span>
                  <span className="payment-registration-modal-registration-status">{`Registration Status: "${attemptedValue}"`}</span>
                </>
              )}
            </div>
          </div>

          {/* Current Status Display */}
          <div className="payment-registration-modal-current-status">
            <h3 className="payment-registration-modal-status-title">
              Current Status:
            </h3>
            <div className="payment-registration-modal-status-grid">
              <div className="payment-registration-modal-status-row">
                <span className="payment-registration-modal-status-label">
                  Payment Status:
                </span>
                <span className="payment-registration-modal-status-value payment-registration-modal-current">
                  {currentPaymentStatus || 'N/A'}
                </span>
              </div>
              <div className="payment-registration-modal-status-row">
                <span className="payment-registration-modal-status-label">
                  Registration Status:
                </span>
                <span className="payment-registration-modal-status-value payment-registration-modal-current">
                  {currentRegistrationStatus || 'N/A'}
                </span>
              </div>
              <div className="payment-registration-modal-status-row">
                <span className="payment-registration-modal-status-label">
                  Attempted to change to:
                </span>
                <span className="payment-registration-modal-status-value payment-registration-modal-attempted">
                  {attemptedValue || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Guidance */}
          <div className="payment-registration-modal-action-guidance">
            <h3 className="payment-registration-modal-action-title">
              📋 What to do next:
            </h3>
            <p className="payment-registration-modal-action-text">
              {suggestedAction}
            </p>
          </div>

          {/* Valid Combinations Reference */}
          <div className="payment-registration-modal-reference-section">
            <h3 className="payment-registration-modal-reference-title">
              📖 Valid Status Combinations (NSA Courses Only):
            </h3>
            <ul className="payment-registration-modal-reference-list">
              <li className="payment-registration-modal-reference-item">
                <span className="payment-registration-modal-registration-status">Registration Status: "Confirmed Slot"</span>
                <span className="payment-registration-modal-arrow">←</span>
                <span className="payment-registration-modal-payment-status">Payment Status: "Paid"</span>
              </li>
              <li className="payment-registration-modal-reference-item">
                <span className="payment-registration-modal-registration-status">Registration Status: "Confirmed Slot"</span>
                <span className="payment-registration-modal-arrow">←</span>
                <span className="payment-registration-modal-payment-status">Payment Status: "SkillsFuture Done"</span>
              </li>
              <li className="payment-registration-modal-reference-item">
                {/*<span className="payment-registration-modal-registration-status">Registration Status: "Cancelled (before payment)" OR "Cancelled (after payment)" OR "Withdrawn"</span>*/}
                <span className="payment-registration-modal-registration-status">Registration Status: "Cancelled" OR "Withdrawn"</span>
                <span className="payment-registration-modal-arrow">←</span>
                <span className="payment-registration-modal-payment-status">Payment Status: "To Refund"</span>
              </li>
              <li className="payment-registration-modal-reference-item">
                <span className="payment-registration-modal-registration-status">Registration Status: "Not Successful"</span>
                <span className="payment-registration-modal-arrow">←</span>
                <span className="payment-registration-modal-payment-status">Payment Status: "Cancelled - No payment received"</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Section */}
        <div className="payment-registration-modal-footer">
          <button
            className="payment-registration-modal-btn payment-registration-modal-btn-primary"
            onClick={onClose}
          >
            Got it, close this modal
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentRegistrationStatusModal;
