import React, { Component } from 'react';
import './approvalQueueModal.css';

/**
 * ApprovalQueueModal
 *
 * Displays all queued cell changes awaiting approval, with a button to
 * send an approval email to moses_lee@ecss.org.sg.
 *
 * Props:
 *   queue       {Array}    – list of pending AG-Grid cell change events
 *   onSendEmail {function} – called when the user clicks "Send Approval Email"
 *   onClose     {function} – called when the user clicks "Close"
 */
class ApprovalQueueModal extends Component {
  _formatValue(val, columnName) {
    if (val === null || val === undefined || val === '') return '(empty)';
    if (columnName === 'Confirmation' || columnName === 'Confirmation Status') {
      const v = String(val).toLowerCase();
      if (v === 'true' || v === '1' || v === 'yes') return 'Confirmed';
      if (v === 'false' || v === '0' || v === 'no') return 'Not Confirmed';
    }
    return String(val);
  }

  render() {
    const { queue, onSendEmail, onClose, onRemove, onUpdateReason } = this.props;

    return (
      <div className="appr-queue-overlay" onClick={onClose}>
        <div className="appr-queue-modal" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="appr-queue-modal__header">
            <h3 className="appr-queue-modal__title">
              Approval Request List
            </h3>
          </div>

          {/* Body */}
          <div className="appr-queue-modal__body">
            {queue.length === 0 ? (
              <p className="appr-queue-modal__empty">No pending changes.</p>
            ) : (
              <div className="appr-queue-modal__table-scroll">
                <table className="appr-queue-modal__table">
                  <colgroup>
                    <col className="appr-queue-modal__col appr-queue-modal__col--sn" />
                    <col className="appr-queue-modal__col appr-queue-modal__col--field" />
                    <col className="appr-queue-modal__col appr-queue-modal__col--current" />
                    <col className="appr-queue-modal__col appr-queue-modal__col--new" />
                    <col className="appr-queue-modal__col appr-queue-modal__col--reason" />
                    <col className="appr-queue-modal__col appr-queue-modal__col--action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="appr-queue-modal__th appr-queue-modal__th--sn">S/N</th>
                      <th className="appr-queue-modal__th">Field</th>
                      <th className="appr-queue-modal__th">Current Value</th>
                      <th className="appr-queue-modal__th">New Value</th>
                      <th className="appr-queue-modal__th">Reason</th>
                      <th className="appr-queue-modal__th appr-queue-modal__th--action"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((item, index) => (
                      <React.Fragment key={index}>
                        <tr className="appr-queue-modal__group-row">
                          <td className="appr-queue-modal__group-cell" colSpan={6}>
                            <strong>{item.event.data?.participantInfo?.name || '-'}</strong>
                            {' '}
                            <span>
                              {(item.event.data?.courseInfo?.courseEngName || '-')}
                              {' · '}
                              {(item.event.data?.courseInfo?.courseLocation || '-')}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="appr-queue-modal__td appr-queue-modal__td--sn">
                            {item.event.data?.sn ?? index + 1}
                          </td>
                          <td className="appr-queue-modal__td appr-queue-modal__td--field">
                            <div className="appr-queue-modal__field-content">
                              <span>{item.event.colDef.headerName}</span>
                            </div>
                          </td>
                          <td className="appr-queue-modal__td">
                            {this._formatValue(item.event.oldValue, item.event.colDef.headerName)}
                          </td>
                          <td className="appr-queue-modal__td appr-queue-modal__td--new">
                            {this._formatValue(item.event.newValue ?? item.event.value, item.event.colDef.headerName)}
                          </td>
                          <td className="appr-queue-modal__td appr-queue-modal__td--reason">
                            <input
                              className="appr-queue-modal__reason-input"
                              type="text"
                              placeholder="Enter reason..."
                              value={item.reason || ''}
                              onChange={(e) => onUpdateReason && onUpdateReason(index, e.target.value)}
                            />
                          </td>
                          <td className="appr-queue-modal__td appr-queue-modal__td--action">
                            <button
                              className="appr-queue-modal__btn-row-delete"
                              onClick={() => onRemove && onRemove(index)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="appr-queue-modal__footer">
            <button className="appr-queue-modal__btn appr-queue-modal__btn--close" onClick={onClose}>
              Close
            </button>
            <button
              className="appr-queue-modal__btn appr-queue-modal__btn--email"
              onClick={onSendEmail}
              disabled={queue.length === 0}
            >
              Send Approval Email
            </button>
          </div>

        </div>
      </div>
    );
  }
}

export default ApprovalQueueModal;
