import React from 'react';
import '../../../../css/sub/bulkUpdateCustomDropdown.css';
import { validateStatusCombination } from '../utils/statusValidation';

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  menuClassName = '',
  disabled = false,
  size = 'md',
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);

  React.useEffect(() => {
    const handleOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selected = (options || []).find((opt) => opt.value === value);

  return (
    <div ref={rootRef} className={`bulk-update-custom-dropdown bulk-update-custom-dropdown--${size} ${className}`.trim()}>
      <button
        type="button"
        className="bulk-update-custom-dropdown__trigger"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
      >
        <span className="bulk-update-custom-dropdown__label">
          {selected ? selected.label : (placeholder || 'Select')}
        </span>
        <span className={`bulk-update-custom-dropdown__caret ${open ? 'is-open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className={`bulk-update-custom-dropdown__menu ${menuClassName}`.trim()}>
          {(options || []).map((opt) => (
            <button
              key={opt.value || '__empty'}
              type="button"
              className={`bulk-update-custom-dropdown__option ${opt.value === value ? 'is-active' : ''}`.trim()}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getStatusOptionsForRow(row) {
  const paymentMethod = row?.paymentMethod || row?.courseInfo?.payment || '';
  const courseType = row?.courseInfo?.courseType || '';
  const rawPrice = row?.courseInfo?.coursePrice || '0';
  const price = parseFloat(String(rawPrice).replace('$', '')) || 0;
  const current = row?.paymentStatus || row?.status || '';

  let base;
  if (courseType === 'NSA') {
    base = paymentMethod === 'SkillsFuture'
      ? ['Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Done', 'Cancelled', 'Withdrawn', 'Refunded']
      : ['Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Not Successful'];
  } else if (
    courseType === 'ILP' ||
    (courseType === 'Talks And Seminar' && price <= 0) ||
    (courseType === 'Others' && price <= 0)
  ) {
    base = ['Pending', 'Confirmed', 'Withdrawn', 'Not Successful'];
  } else if ((courseType === 'Talks And Seminar' || courseType === 'Others') && price > 0) {
    base = ['Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Not Successful'];
  } else {
    base = ['Pending', 'Paid', 'Withdrawn', 'Refunded', 'Not Successful'];
  }

  return [
    ...base,
    ...(current && !base.includes(current) ? [current] : []),
  ];
};

function BulkUpdateModal({
    selectedRows,
    bulkUpdateField,
    bulkUpdateStatus,
    bulkUpdateMethod,
    bulkUpdateValue,
    bulkUpdateRowValues,
    onFieldChange,
    onStatusChange,
    onMethodChange,
    onValueChange,
    onRowValueChange,
    onUpdate,
    onUpdateClick,
    onClose,
    onValidationError,
  }) {
    const rows = Array.isArray(selectedRows) ? selectedRows : [];
    const previewRows = rows;
    const selectedField = bulkUpdateField || '';
    const rowValues = bulkUpdateRowValues || {};
    const rowRefs = React.useRef({});
    const [activeRowId, setActiveRowId] = React.useState(null);
    const [rowReasons, setRowReasons] = React.useState({});
    const [reasonErrors, setReasonErrors] = React.useState({});

    const safeOnRowValueChange = typeof onRowValueChange === 'function'
      ? onRowValueChange
      : () => {};

    const fieldLabelMap = {
      paymentStatus: 'Payment Status',
      confirmationStatus: 'Confirmation Status',
      paymentDate: 'Payment Date',
      refundedDate: 'Refunded Date',
      remarks: 'Remarks',
      contactNo: 'Contact Number',
      name: 'Name',
    };

    const statusCounts = rows.reduce((acc, row) => {
      const key = row?.paymentStatus || row?.status || row?.courseInfo?.paymentStatus || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const getStatusOptionsForRow = (row) => {
      const paymentMethod = row?.paymentMethod || row?.courseInfo?.payment || '';
      const courseType = row?.courseInfo?.courseType || '';
      const rawPrice = row?.courseInfo?.coursePrice || '0';
      const price = parseFloat(String(rawPrice).replace('$', '')) || 0;
      const current = row?.paymentStatus || row?.status || '';

      let base;
      if (courseType === 'NSA') {
        base = paymentMethod === 'SkillsFuture'
          ? ['Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Done', 'Cancelled', 'Withdrawn', 'Refunded']
          : ['Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Not Successful'];
      } else if (
        courseType === 'ILP' ||
        (courseType === 'Talks And Seminar' && price <= 0) ||
        (courseType === 'Others' && price <= 0)
      ) {
        base = ['Pending', 'Confirmed', 'Withdrawn', 'Not Successful'];
      } else if ((courseType === 'Talks And Seminar' || courseType === 'Others') && price > 0) {
        base = ['Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Not Successful'];
      } else {
        base = ['Pending', 'Paid', 'Withdrawn', 'Refunded', 'Not Successful'];
      }

      if (current && !base.includes(current)) base = [current, ...base];
      return base;
    };

    const getCurrentFieldValue = (row) => {
      switch (selectedField) {
        case 'paymentStatus':
          return row?.paymentStatus || row?.status || '';
        case 'paymentMethod':
          return row?.paymentMethod || row?.courseInfo?.payment || '';
        case 'confirmationStatus': {
          const raw = row?.confirmed;
          if (raw === true) return 'Confirmed';
          if (raw === false) return 'Not Confirmed';
          return String(raw || 'Not Confirmed');
        }
        case 'paymentDate':
          return row?.paymentDate || '';
        case 'refundedDate':
          return row?.refundedDate || '';
        case 'remarks':
          return row?.remarks || '';
        case 'contactNo':
          return row?.contactNo || row?.participantInfo?.contactNumber || '';
        case 'name':
          return row?.participantInfo?.name || row?.name || '';
        default:
          return '';
      }
    };

    const getTableSn = (row) => row?.sn ?? row?.SN ?? row?.serialNo ?? '-';
    const getRowKey = (row, idx) => String(row?.id || `row-${idx}`);
    const isStatusOrMethodField = selectedField === 'paymentStatus';

    const getCurrentPaymentStatus = (row) => row?.paymentStatus || row?.status || 'N/A';
    const getCurrentPaymentMethod = (row) => row?.paymentMethod || row?.courseInfo?.payment || 'N/A';

    const getRowNewValue = (row, idx) => {
      const key = getRowKey(row, idx);
      const fromRow = rowValues[key];
      if (selectedField === 'paymentStatus') return fromRow || bulkUpdateStatus || '';
      if (selectedField === 'paymentMethod') return fromRow || bulkUpdateMethod || '';
      if (fromRow !== undefined && fromRow !== null) return fromRow;
      return bulkUpdateValue || '';
    };

    const normalize = (v) => String(v ?? '').trim().toLowerCase();

    const affectedRows = previewRows
      .map((row, idx) => ({ row, idx, key: getRowKey(row, idx) }))
      .filter(({ row, idx }) => {
        const nextValue = getRowNewValue(row, idx);
        if (!String(nextValue ?? '').trim()) return false;
        return normalize(getCurrentFieldValue(row)) !== normalize(nextValue);
      });

    React.useEffect(() => {
      if (!affectedRows.length) {
        setActiveRowId(null);
        return;
      }
      if (!activeRowId || !affectedRows.some((item) => item.key === activeRowId)) {
        setActiveRowId(affectedRows[0].key);
      }
    }, [affectedRows, activeRowId]);

    const jumpToAffectedRow = (rowKey) => {
      setActiveRowId(rowKey);
      const node = rowRefs.current[rowKey];
      if (node && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const renderRowEditor = (row, idx) => {
      const rowKey = getRowKey(row, idx);
      const value = getRowNewValue(row, idx);

      if (selectedField === 'paymentStatus') {
        const options = getStatusOptionsForRow(row);
        return (
          <select
            className="registration-payment-bulk-modal-row-select"
            value={value}
            onChange={(e) => safeOnRowValueChange(rowKey, e.target.value)}
          >
            <option value="">-- No Change --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }

      if (selectedField === 'confirmationStatus') {
        return (
          <select
            className="registration-payment-bulk-modal-row-select"
            value={value}
            onChange={(e) => safeOnRowValueChange(rowKey, e.target.value)}
          >
            <option value="">-- No Change --</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Not Confirmed">Not Confirmed</option>
          </select>
        );
      }

      if (selectedField === 'refundedDate') {
        return (
          <input
            className="registration-payment-bulk-modal-row-input"
            type="date"
            value={value}
            onChange={(e) => safeOnRowValueChange(rowKey, e.target.value)}
            placeholder="Select refunded date"
          />
        );
      }

      if (selectedField === 'remarks') {
        return (
          <input
            className="registration-payment-bulk-modal-row-input"
            type="text"
            value={value}
            onChange={(e) => safeOnRowValueChange(rowKey, e.target.value)}
            placeholder="Enter remarks"
          />
        );
      }

      return (
        <input
          className="registration-payment-bulk-modal-row-input"
          type={selectedField === 'paymentDate' ? 'date' : 'text'}
          value={value}
          onChange={(e) => safeOnRowValueChange(rowKey, e.target.value)}
          placeholder="Enter new value"
        />
      );
    };

    const targetValueMap = {
      paymentStatus: affectedRows.length ? 'Multiple Values (Per Row)' : (bulkUpdateStatus || 'No Change'),
      confirmationStatus: 'Multiple Values (Per Row)',
      paymentDate: 'Multiple Values (Per Row)',
      refundedDate: 'Multiple Values (Per Row)',
      remarks: 'Multiple Values (Per Row)',
      contactNo: 'Multiple Values (Per Row)',
      name: 'Multiple Values (Per Row)',
    };

    const targetValueLabel = targetValueMap[selectedField] || 'No Change';

    const handleUpdateClick = () => {
      const requiredReasonRows = affectedRows.length ? affectedRows : previewRows.map((row, idx) => ({ row, idx, key: getRowKey(row, idx) }));

      const nextReasonErrors = {};
      requiredReasonRows.forEach(({ key }) => {
        if (!String(rowReasons[key] || '').trim()) {
          nextReasonErrors[key] = 'Reason cannot be empty';
        }
      });

      setReasonErrors(nextReasonErrors);
      if (Object.keys(nextReasonErrors).length > 0) {
        return;
      }

      // Validation for NSA course payment/registration status combinations
      if (selectedField === 'paymentStatus') {
        const validationErrors = [];
        
        requiredReasonRows.forEach(({ row, idx }) => {
          const courseType = row?.courseInfo?.courseType || '';
          const newPaymentStatus = getRowNewValue(row, idx);
          const currentRegistrationStatus = row?.confirmationStatus || row?.confirmed || 'N/A';
          
          // Only validate for NSA courses
          if (courseType === 'NSA' && newPaymentStatus) {
            const validation = validateStatusCombination(newPaymentStatus, currentRegistrationStatus);
            if (!validation.isValid) {
              validationErrors.push({
                rowId: row?.id || '',
                sn: getTableSn(row),
                participantName: row?.participantInfo?.name || row?.name || 'N/A',
                courseName: row?.courseInfo?.courseEngName || row?.course || 'N/A',
                newPaymentStatus,
                currentRegistrationStatus,
                errorMessage: validation.reason,
              });
            }
          }
        });

        // If validation errors exist, show them in the error modal
        if (validationErrors.length > 0) {
          if (typeof onValidationError === 'function') {
            onValidationError(validationErrors);
          }
          return;
        }
      }

      const reasonsByRow = requiredReasonRows.reduce((acc, { row, key }) => {
        acc[key] = {
          rowId: row?.id || '',
          sn: getTableSn(row),
          reason: String(rowReasons[key] || '').trim(),
        };
        return acc;
      }, {});

      onUpdate({
        reasonsByRow,
      });
      onClose();
    };

    return (
      <div className="registration-payment-details-modal-overlay" onClick={onClose}>
        <div
          className="registration-payment-details-modal-content registration-payment-bulk-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="registration-payment-details-modal-header registration-payment-bulk-modal-header">
            <div>
              <h3>Bulk Update</h3>
              <p className="registration-payment-bulk-modal-subtitle">
                Review impacted records before applying the update.
              </p>
            </div>
          </div>

          <div className="registration-payment-details-modal-body registration-payment-bulk-modal-body">
            <div className="registration-payment-bulk-modal-panel">
              <h4 className="registration-payment-bulk-modal-panel-title">Update Settings</h4>

              <div className="registration-payment-bulk-modal-form-row">
                <label htmlFor="bulkField" className="registration-payment-bulk-modal-label">Field To Update</label>
                <p className="registration-payment-bulk-modal-help">Choose which field should be changed for all selected records.</p>
              </div>
              <select
                className="registration-payment-bulk-modal-select"
                id="bulkField"
                value={selectedField}
                onChange={(e) => onFieldChange(e.target.value)}
              >
                <option value="" disabled>-- Select a field to update --</option>
                <option value="paymentStatus">Payment Status</option>
                <option value="confirmationStatus">Confirmation Status</option>
                <option value="paymentDate">Payment Date</option>
                <option value="refundedDate">Refunded Date</option>
                <option value="remarks">Remarks</option>
                <option value="contactNo">Contact Number</option>
                <option value="name">Name</option>
              </select>

              {selectedField === 'paymentStatus' && (
                <>
                  <div className="registration-payment-bulk-modal-form-row">
                    <label htmlFor="bulkStatus" className="registration-payment-bulk-modal-label">New Payment Status Value</label>
                  </div>
                  <select
                    className="registration-payment-bulk-modal-select"
                    id="bulkStatus"
                    value={bulkUpdateStatus}
                    onChange={(e) => onStatusChange(e.target.value)}
                  >
                    <option value="">-- Select a value --</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Refunded">Refunded</option>
                    <option value="SkillsFuture Done">SkillsFuture Done</option>
                    <option value="Generating SkillsFuture Invoice">Generating SkillsFuture Invoice</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Not Successful">Not Successful</option>
                  </select>

                </>
              )}

              {selectedField === 'confirmationStatus' && (
                <>
                  <div className="registration-payment-bulk-modal-form-row">
                    <label htmlFor="bulkConfirmation" className="registration-payment-bulk-modal-label">New Confirmation Status Value</label>
                  </div>
                  <select
                    className="registration-payment-bulk-modal-select"
                    id="bulkConfirmation"
                    value={bulkUpdateValue}
                    onChange={(e) => onValueChange(e.target.value)}
                  >
                    <option value="">-- Select a value --</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Not Confirmed">Not Confirmed</option>
                  </select>
                </>
              )}

              {selectedField === 'refundedDate' && (
                <>
                  <div className="registration-payment-bulk-modal-form-row">
                    <label htmlFor="bulkRefundedDate" className="registration-payment-bulk-modal-label">New Refunded Date Value</label>
                  </div>
                  <input
                    id="bulkRefundedDate"
                    className="registration-payment-bulk-modal-input"
                    type="date"
                    value={bulkUpdateValue}
                    onChange={(e) => onValueChange(e.target.value)}
                    placeholder="Select refunded date"
                  />
                </>
              )}

              {selectedField === 'remarks' && (
                <>
                  <div className="registration-payment-bulk-modal-form-row">
                    <label htmlFor="bulkRemarks" className="registration-payment-bulk-modal-label">New Remarks Value</label>
                  </div>
                  <input
                    id="bulkRemarks"
                    className="registration-payment-bulk-modal-input"
                    type="text"
                    value={bulkUpdateValue}
                    onChange={(e) => onValueChange(e.target.value)}
                    placeholder="Enter remarks to apply to all selected records"
                  />
                </>
              )}

              {(selectedField === 'paymentDate' || selectedField === 'contactNo' || selectedField === 'name') && (
                <>
                  <div className="registration-payment-bulk-modal-form-row">
                    <label htmlFor="bulkValueInput" className="registration-payment-bulk-modal-label">New {fieldLabelMap[selectedField]} Value</label>
                  </div>
                  <input
                    id="bulkValueInput"
                    className="registration-payment-bulk-modal-input"
                    type={selectedField === 'paymentDate' ? 'date' : 'text'}
                    value={bulkUpdateValue}
                    onChange={(e) => onValueChange(e.target.value)}
                    placeholder={`Enter new ${fieldLabelMap[selectedField]}`}
                  />
                </>
              )}
            </div>

            {selectedField && (
              <div className="registration-payment-bulk-modal-panel">
                <h4 className="registration-payment-bulk-modal-panel-title">Record Preview</h4>

                <div className="registration-payment-bulk-modal-table-wrap">
                  <table className="registration-payment-bulk-modal-table">
                    <thead>
                      <tr>
                        <th>S/N</th>
                        <th>Participant</th>
                        <th>Course</th>
                        <th>Location</th>
                        {isStatusOrMethodField ? (
                          <>
                            <th>Current Payment Status</th>
                            <th>Current Payment Method</th>
                          </>
                        ) : (
                          <th>Current {fieldLabelMap[selectedField] || 'Value'}</th>
                        )}
                        <th className="registration-payment-bulk-modal-col-new">New {fieldLabelMap[selectedField] || 'Value'}</th>
                        <th className="registration-payment-bulk-modal-col-reason">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.length === 0 ? (
                        <tr>
                          <td colSpan={isStatusOrMethodField ? 8 : 7} className="registration-payment-bulk-modal-empty">No selected rows.</td>
                        </tr>
                      ) : (
                        previewRows.map((row, idx) => (
                          <tr
                            key={getRowKey(row, idx)}
                            ref={(node) => {
                              rowRefs.current[getRowKey(row, idx)] = node;
                            }}
                            className={activeRowId === getRowKey(row, idx) ? 'registration-payment-bulk-modal-row-active' : ''}
                          >
                            <td>{getTableSn(row)}</td>
                            <td>{row?.participantInfo?.name || row?.name || 'N/A'}</td>
                            <td>{row?.courseInfo?.courseEngName || row?.course || 'N/A'}</td>
                            <td>{row?.courseInfo?.courseLocation || row?.location || 'N/A'}</td>
                            {isStatusOrMethodField ? (
                              <>
                                <td>{getCurrentPaymentStatus(row)}</td>
                                <td>{getCurrentPaymentMethod(row)}</td>
                              </>
                            ) : (
                              <td>{getCurrentFieldValue(row) || 'N/A'}</td>
                            )}
                            <td className="registration-payment-bulk-modal-col-new">{renderRowEditor(row, idx)}</td>
                            <td className="registration-payment-bulk-modal-col-reason">
                              {(() => {
                                const rowKey = getRowKey(row, idx);
                                return (
                                  <>
                              <input
                                type="text"
                                className={`registration-payment-bulk-modal-row-input ${reasonErrors[rowKey] ? 'registration-payment-bulk-modal-row-input-error' : ''}`}
                                placeholder="Enter reason for this change"
                                value={rowReasons[rowKey] || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setRowReasons((prev) => ({
                                    ...prev,
                                    [rowKey]: value,
                                  }));
                                  setReasonErrors((prev) => {
                                    if (!prev[rowKey]) return prev;
                                    const next = { ...prev };
                                    if (String(value || '').trim()) {
                                      delete next[rowKey];
                                    }
                                    return next;
                                  });
                                }}
                                style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem' }}
                              />
                              {reasonErrors[rowKey] && (
                                <div className="registration-payment-bulk-modal-row-error">{reasonErrors[rowKey]}</div>
                              )}
                                  </>
                                );
                              })()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="registration-payment-details-modal-footer registration-payment-bulk-modal-footer">
            <button
              className="registration-payment-details-modal-btn registration-payment-details-modal-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="registration-payment-details-modal-btn registration-payment-details-modal-btn-primary"
              onClick={handleUpdateClick}
            >
              Update
            </button>
          </div>
        </div>
      </div>
    );
  }

  export default BulkUpdateModal;
