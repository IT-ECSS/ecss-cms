import React from 'react';

/**
 * Modal for applying a single status / method update to multiple selected rows.
 *
 * Props:
 *  selectedRows      {Array}    - currently selected grid rows
 *  bulkUpdateStatus  {string}   - controlled value for Payment Status select
 *  onStatusChange    {Function} - called with (newStatusString)
 *  onUpdate          {Function} - called when user confirms the update
 *  onClose           {Function} - called when the modal should close
 */
function BulkUpdateModal({
  selectedRows,
  bulkUpdateStatus,
  onStatusChange,
  onUpdate,
  onClose,
}) {
  return (
    <div
      className="registration-payment-details-modal-overlay"
      onClick={onClose}
    >
      <div
        className="registration-payment-details-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="registration-payment-details-modal-header">
          <h3>Bulk Update Selected Records</h3>
        </div>

        <div className="registration-payment-details-modal-body">
          <div>
            <label htmlFor="bulkStatus">Payment Status:</label>
            <select
              id="bulkStatus"
              value={bulkUpdateStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="">-- No Change --</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Withdrawn">Withdrawn</option>
              <option value="Refunded">Refunded</option>
              <option value="SkillsFuture Done">SkillsFuture Done</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>
        </div>

        <div className="registration-payment-details-modal-footer">
          <button
            className="registration-payment-details-modal-btn registration-payment-details-modal-btn-primary"
            onClick={onUpdate}
          >
            Update {selectedRows.length} Record{selectedRows.length !== 1 ? 's' : ''}
          </button>
          <button
            className="registration-payment-details-modal-btn registration-payment-details-modal-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkUpdateModal;
