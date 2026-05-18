import React from 'react';

function BulkUpdateReasonModal({
  selectedRows,
  bulkUpdateField,
  onReasonSubmit,
  onCancel,
}) {
  const [reason, setReason] = React.useState('');
  const rows = Array.isArray(selectedRows) ? selectedRows : [];

  const fieldLabelMap = {
    paymentStatus: 'Payment Status',
    paymentMethod: 'Payment Method',
    confirmationStatus: 'Confirmation Status',
    paymentDate: 'Payment Date',
    refundedDate: 'Refunded Date',
    remarks: 'Remarks',
    contactNo: 'Contact Number',
    name: 'Name',
  };

  const fieldLabel = fieldLabelMap[bulkUpdateField] || bulkUpdateField;

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Please enter a reason for this bulk update.');
      return;
    }
    onReasonSubmit(reason.trim());
  };

  return (
    <div className="registration-payment-details-modal-overlay" onClick={onCancel}>
      <div
        className="registration-payment-details-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="registration-payment-details-modal-header">
          <div>
            <h3>Bulk Update Reason</h3>
            <p className="registration-payment-bulk-modal-subtitle">
              Please provide a reason for updating {rows.length} record{rows.length !== 1 ? 's' : ''} ({fieldLabel})
            </p>
          </div>
        </div>

        <div className="registration-payment-details-modal-body">
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="bulkUpdateReason"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 'bold',
                fontSize: '1rem',
                color: '#000',
              }}
            >
              Reason <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              id="bulkUpdateReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for this bulk update..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                fontSize: '1rem',
                fontFamily: 'Arial, sans-serif',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>


        </div>

        <div className="registration-payment-details-modal-footer">
          <button
            className="registration-payment-details-modal-btn registration-payment-details-modal-btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="registration-payment-details-modal-btn registration-payment-details-modal-btn-primary"
            onClick={handleSubmit}
          >
            Proceed with Update
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkUpdateReasonModal;
