import React, { Component } from 'react';
import './approvalQueueDecisionPopup.css';

/**
 * ApprovalQueueDecisionPopup
 * 
 * Displays a modal asking user whether to keep or clear the approval queue before logout.
 * 
 * Props:
 *   isOpen {boolean}        - whether to show the popup
 *   onContinueStore {fn}    - called when user clicks "Continue Store Queue"
 *   onClearLogout {fn}      - called when user clicks "Clear Queue & Logout"
 *   queueCount {number}     - number of pending items in queue (for display)
 */
class ApprovalQueueDecisionPopup extends Component {
  render() {
    const { isOpen, onContinueStore, onClearLogout, queueCount = 0 } = this.props;

    if (!isOpen) return null;

    return (
      <div className="aqd-popup-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="aqd-popup-container">
          
          {/* Header */}
          <div className="aqd-popup__header">
            <h2 className="aqd-popup__title">
              Pending Changes
            </h2>
            <button 
              className="aqd-popup__close-btn"
              onClick={onClearLogout}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="aqd-popup__body">
            <p className="aqd-popup__message">
              You have <strong>{queueCount}</strong> pending approval change{queueCount !== 1 ? 's' : ''}.
            </p>
            <p className="aqd-popup__question">
              Do you want to continue storing queue data or clear it before logout?
            </p>
          </div>

          {/* Footer */}
          <div className="aqd-popup__footer">
            <button 
              className="aqd-popup__btn aqd-popup__btn--continue"
              onClick={onContinueStore}
            >
              Continue Store Queue
            </button>
            <button 
              className="aqd-popup__btn aqd-popup__btn--clear"
              onClick={onClearLogout}
            >
              Clear Queue & Logout
            </button>
          </div>

        </div>
      </div>
    );
  }
}

export default ApprovalQueueDecisionPopup;
