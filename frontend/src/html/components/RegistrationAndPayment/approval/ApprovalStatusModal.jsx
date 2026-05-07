import React, { Component } from 'react';
import './approvalStatusModal.css';

class ApprovalStatusModal extends Component {
  _formatDateTime(val) {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d)) return String(val);
      const date = d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${date} ${time}`;
    } catch {
      return String(val);
    }
  }

  _formatValue(val, columnName) {
    if (val === null || val === undefined || val === '') return '(empty)';
    if (columnName === 'Confirmation Status' || columnName === 'Confirmation') {
      const v = String(val).toLowerCase();
      if (v === 'true' || v === '1' || v === 'yes') return 'Confirmed';
      if (v === 'false' || v === '0' || v === 'no') return 'Not Confirmed';
    }
    return String(val);
  }

  _statusClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'is-approved';
    if (normalized === 'rejected') return 'is-rejected';
    if (normalized === 'expired') return 'is-expired';
    return 'is-pending';
  }

  render() {
    const { isOpen, requests = [], onClose } = this.props;
    if (!isOpen) return null;

    return (
      <div className="approval-status-overlay" onClick={onClose}>
        <div className="approval-status-modal" onClick={(e) => e.stopPropagation()}>
          <div className="approval-status-modal__header">
            <h3 className="approval-status-modal__title">
              Approval Request Status List
            </h3>
          </div>

          <div className="approval-status-modal__body">
            {requests.length === 0 ? (
              <p className="approval-status-modal__empty">No approval requests have been sent yet.</p>
            ) : (
              <div className="approval-status-modal__table-wrap">
                <table className="approval-status-modal__table">
                  <thead>
                    <tr>
                      <th className="col-sn">S/N</th>
                      <th className="col-field">Field</th>
                      <th className="col-value">Current Value</th>
                      <th className="col-value col-new">New Value</th>
                      <th className="col-status">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let lastGroupKey = '';
                      let rowCounter = 0;
                      return requests.map((item, idx) => {
                        const groupKey = `${item.batchId || ''}-${item.registrationId || ''}-${item.participantName || ''}-${item.courseName || ''}-${item.courseLocation || ''}`;
                        const showGroupRow = groupKey !== lastGroupKey;
                        lastGroupKey = groupKey;
                        rowCounter++;
                        const sn = item.sn || rowCounter;
                        const statusLabel = item.status
                          ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
                          : 'Pending';

                        return (
                          <React.Fragment key={item.id || idx}>
                            {showGroupRow && (
                              <tr className="approval-status-modal__group-row">
                                <td colSpan="5">
                                  <span className="group-name">{item.participantName || 'Unknown'}</span>
                                  {item.participantEmail && (
                                    <span className="group-email"> &lt;{item.participantEmail}&gt;</span>
                                  )}
                                  {(item.courseName || item.courseLocation) && (
                                    <span className="group-course">
                                      {' — '}{item.courseName || ''}{item.courseLocation ? ` · ${item.courseLocation}` : ''}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )}
                            <tr className={rowCounter % 2 === 0 ? 'row-even' : 'row-odd'}>
                              <td className="col-sn">{sn}</td>
                              <td className="col-field">{item.columnName}</td>
                              <td className="col-value">{this._formatValue(item.currentValue, item.columnName)}</td>
                              <td className="col-value col-new">{this._formatValue(item.newValue, item.columnName)}</td>
                              <td className="col-status">
                                <span className={`approval-status-pill ${this._statusClass(item.status)}`}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="approval-status-modal__footer">
            <button className="approval-status-modal__btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ApprovalStatusModal;
