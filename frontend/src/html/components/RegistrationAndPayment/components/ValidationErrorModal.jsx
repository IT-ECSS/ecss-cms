import React from 'react';
import '../../../../css/sub/validationErrorModal.css';

/**
 * ValidationErrorModal - Displays validation error when trying to select incompatible
 * Payment Status and Registration Status combinations for NSA courses.
 *
 * Props:
 *   isOpen - boolean: whether the modal is visible
 *   errorMessage - string: the error message to display
 *   fieldType - string: 'payment' or 'registration' indicating which status is being changed
 *   attemptedValue - string: the status value user tried to select
 *   currentPaymentStatus - string: current payment status
 *   currentRegistrationStatus - string: current registration status
 *   onClose - function: callback to close the modal
 *   onRetry - function (optional): callback to retry the action
 */
function ValidationErrorModal({
  isOpen,
  errorMessage,
  fieldType,
  attemptedValue,
  currentPaymentStatus,
  currentRegistrationStatus,
  onClose,
  onRetry,
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="validation-error-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-error-title"
    >
      <div className="validation-error-modal-box">
        {/* Header */}
        <div className="validation-error-modal-header">
          <div className="validation-error-modal-icon-container">
            <span className="validation-error-modal-icon">⚠️</span>
          </div>
          <h2 className="validation-error-modal-title" id="validation-error-title">
            Invalid Status Selection
          </h2>
        </div>

        {/* Error Message */}
        <div className="validation-error-modal-body">
          <p className="validation-error-modal-message">{errorMessage}</p>

          {/* Current Status Summary */}
          <div className="validation-error-modal-status-summary">
            <h3 className="validation-error-modal-summary-title">Current Status:</h3>
            <div className="validation-error-modal-status-grid">
              <div className="validation-error-modal-status-item">
                <span className="validation-error-modal-status-label">Payment Status:</span>
                <span className="validation-error-modal-status-value">{currentPaymentStatus || 'N/A'}</span>
              </div>
              <div className="validation-error-modal-status-item">
                <span className="validation-error-modal-status-label">Registration Status:</span>
                <span className="validation-error-modal-status-value">{currentRegistrationStatus || 'N/A'}</span>
              </div>
              {attemptedValue && (
                <div className="validation-error-modal-status-item">
                  <span className="validation-error-modal-status-label">Attempted to change:</span>
                  <span className="validation-error-modal-status-value validation-error-modal-attempted">
                    {attemptedValue}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="validation-error-modal-help">
            <h3 className="validation-error-modal-help-title">Valid Status Combinations (NSA Courses):</h3>
            <ul className="validation-error-modal-help-list">
              <li>
                <strong>Paid</strong> or <strong>SkillsFuture Done</strong> (Payment) 
                → <strong>Confirmed Slot</strong> (Registration)
              </li>
              <li>
                <strong>To Refund</strong> (Payment) 
                → <strong>Cancelled (before payment)</strong> or <strong>Cancelled (after payment)</strong> or <strong>Withdrawn</strong> (Registration)
              </li>
              <li>
                <strong>Class Full</strong> (Registration) 
                → <strong>Cancelled - No payment received</strong> (Payment)
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="validation-error-modal-footer">
          <button
            className="validation-error-modal-btn validation-error-modal-btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
          {onRetry && (
            <button
              className="validation-error-modal-btn validation-error-modal-btn--primary"
              onClick={handleRetry}
            >
              Modify Selection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ValidationErrorModal;
