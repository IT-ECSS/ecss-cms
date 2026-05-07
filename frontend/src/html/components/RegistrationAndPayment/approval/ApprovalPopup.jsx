import React, { Component } from 'react';
import './approvalPopup.css';

class ApprovalPopup extends Component {
  constructor(props) {
    super(props);
    this.state = { reason: '', showError: false };
  }

  _isConfirmationColumn = (columnName) => {
    return columnName === 'Confirmation' || columnName === 'Confirmation Status';
  };

  _normalizeConfirmation = (val) => {
    const v = String(val ?? '').trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'confirmed') return 'Confirmed';
    if (v === 'false' || v === '0' || v === 'no' || v === 'not confirmed') return 'Not Confirmed';
    return 'Not Confirmed';
  };

  _formatVal = (val, col) => {
    if (val === null || val === undefined || val === '') return '(empty)';
    if (this._isConfirmationColumn(col)) {
      return this._normalizeConfirmation(val);
    }
    return String(val);
  };

  render() {
    const { serialNo, columnName, oldValue, newValue, onConfirm, onCancel } = this.props;
    const { reason, showError } = this.state;

    const displayOld = this._formatVal(oldValue, columnName);
    const displayNew = this._formatVal(newValue, columnName);
    const finalReason = reason.trim();

    return (
      <div className="ap-overlay" onClick={onCancel}>
        <div className="ap-modal" onClick={(e) => e.stopPropagation()}>

          <div className="ap-modal__header">
            <h3 className="ap-modal__title">Approval Request</h3>
            <button type="button" className="ap-modal__close-btn" onClick={onCancel} aria-label="Close">
              &times;
            </button>
          </div>

          <div className="ap-modal__body">
            <table className="ap-modal__table">
              <thead>
                <tr>
                  <th className="ap-modal__th ap-modal__th--sn">S/N</th>
                  <th className="ap-modal__th">Field</th>
                  <th className="ap-modal__th">Current Value</th>
                  <th className="ap-modal__th">New Value</th>
                  <th className="ap-modal__th">Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="ap-modal__td ap-modal__td--sn">{serialNo ?? 1}</td>
                  <td className="ap-modal__td ap-modal__td--field">{columnName}</td>
                  <td className="ap-modal__td">{displayOld}</td>
                  <td className="ap-modal__td ap-modal__td--new">{displayNew}</td>
                  <td className="ap-modal__td">
                    <input
                      className={`ap-modal__reason${showError ? ' ap-modal__reason--error' : ''}`}
                      type="text"
                      placeholder="Enter reason..."
                      value={reason}
                      onChange={(e) => this.setState({ reason: e.target.value, showError: false })}
                    />
                    {showError && (
                      <span className="ap-modal__reason-msg">Reason is needed</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ap-modal__footer">
            <button className="ap-modal__btn ap-modal__btn--cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="ap-modal__btn ap-modal__btn--confirm" onClick={() => {
              if (!finalReason) { this.setState({ showError: true }); return; }
              onConfirm(finalReason, newValue);
            }}>
              Confirm
            </button>
          </div>

        </div>
      </div>
    );
  }
}

export default ApprovalPopup;
