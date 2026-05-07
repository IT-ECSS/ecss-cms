import React from 'react';
import axios from 'axios';

const NSA_EDITABLE_COLUMNS = [
  'Name',
  'Contact Number',
  'Payment Date',
  'Refunded Date',
  'Remarks',
  'Registration and Payment Status',
  'Confirmation',
  'Payment Method',
];

const PAYMENT_STATUS_OPTIONS_SF = [
  'Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Done',
  'Cancelled', 'Withdrawn', 'Refunded',
];
const PAYMENT_STATUS_OPTIONS = [
  'Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Not Successful',
];
const CONFIRMATION_OPTIONS = ['Not Confirmed', 'Confirmed'];
const PAYMENT_METHOD_OPTIONS = ['Cash', 'PayNow', 'SkillsFuture'];

function getCurrentValueForColumn(columnName, data) {
  if (!data) return '';
  const map = {
    'Name': data.participantName || '',
    'Contact Number': data.contactNo || '',
    'Payment Date': data.paymentDate || '',
    'Refunded Date': data.refundedDate || '',
    'Remarks': data.remarks || '',
    'Registration and Payment Status': data.paymentStatus || '',
    'Payment Status': data.paymentStatus || '',
    'Registration Status': data.paymentStatus || '',
    'Confirmation': data.confirmed != null ? (data.confirmed ? 'Confirmed' : 'Not Confirmed') : '',
    'Confirmation Status': data.confirmed != null ? (data.confirmed ? 'Confirmed' : 'Not Confirmed') : '',
    'Payment Method': data.paymentMethod || '',
  };
  return map[columnName] || '';
}

function ButtonPills({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: '4px 10px',
            borderRadius: '4px',
            border: `1px solid ${value === opt ? '#28a745' : '#ccc'}`,
            background: value === opt ? '#28a745' : '#fff',
            color: value === opt ? '#fff' : '#000',
            fontSize: '18px',
            cursor: 'pointer',
            fontWeight: value === opt ? 'bold' : 'normal',
            whiteSpace: 'nowrap',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ValueInput({ columnName, value, onChange, paymentMethod }) {
  const isSF = (paymentMethod || '') === 'SkillsFuture';
  if (columnName === 'Registration and Payment Status' || columnName === 'Payment Status' || columnName === 'Registration Status') {
    return <ButtonPills options={isSF ? PAYMENT_STATUS_OPTIONS_SF : PAYMENT_STATUS_OPTIONS} value={value} onChange={onChange} />;
  }
  if (columnName === 'Confirmation' || columnName === 'Confirmation Status') {
    let normalized = value;
    if (value === true || value === 'true' || value === 1 || value === '1' || String(value || '').toLowerCase() === 'confirmed' || String(value || '').toLowerCase() === 'yes') normalized = 'Confirmed';
    else if (value === false || value === 'false' || value === 0 || value === '0' || String(value || '').toLowerCase() === 'not confirmed' || String(value || '').toLowerCase() === 'no') normalized = 'Not Confirmed';
    return <ButtonPills options={CONFIRMATION_OPTIONS} value={normalized} onChange={onChange} />;
  }
  if (columnName === 'Payment Method') {
    return <ButtonPills options={PAYMENT_METHOD_OPTIONS} value={value} onChange={onChange} />;
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Enter new value"
      style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '20px', boxSizing: 'border-box' }}
    />
  );
}

class NSAApprovalModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      changes: [],
      additionalNotes: '',
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data && this.props.data) {
      const { data } = this.props;
      const firstColumn = data.columnName || NSA_EDITABLE_COLUMNS[0];
      this.setState({
        changes: [{
          columnName: firstColumn,
          currentValue: data.columnName ? (data.currentValue ?? '') : getCurrentValueForColumn(firstColumn, data),
          newValue: '',
          reason: '',
          isFirst: !!data.columnName, // fixed label only when a column was pre-selected (per-row); dropdown when opened from toolbar
        }],
        additionalNotes: '',
      });
    }
  }

  updateChange = (index, field, value) => {
    const changes = [...this.state.changes];
    changes[index] = { ...changes[index], [field]: value };
    if (field === 'columnName') {
      changes[index].newValue = '';
      changes[index].currentValue = getCurrentValueForColumn(value, this.props.data);
    }
    this.setState({ changes });
  };

  addChange = () => {
    const usedCols = this.state.changes.map(c => c.columnName);
    const nextCol = NSA_EDITABLE_COLUMNS.find(col => !usedCols.includes(col)) || NSA_EDITABLE_COLUMNS[0];
    this.setState(prev => ({
      changes: [...prev.changes, {
        columnName: nextCol,
        currentValue: getCurrentValueForColumn(nextCol, this.props.data),
        newValue: '',
        reason: '',
        isFirst: false,
      }],
    }));
  };

  removeChange = (index) => {
    const changes = [...this.state.changes];
    changes.splice(index, 1);
    this.setState({ changes });
  };

  handleAddToList = () => {
    const { data, onAddToList } = this.props;
    const { changes, additionalNotes } = this.state;
    for (let i = 0; i < changes.length; i++) {
      const c = changes[i];
      const isMissingNewValue =
        c.newValue === null ||
        c.newValue === undefined ||
        (typeof c.newValue === 'string' && !c.newValue.trim());
      if (isMissingNewValue) {
        alert(`Please enter a new value for change ${i + 1}: "${c.columnName}".`);
        return;
      }
      if (!c.reason || !c.reason.trim()) {
        alert(`Please enter a reason for change ${i + 1}: "${c.columnName}".`);
        return;
      }
    }
    onAddToList(changes, additionalNotes, data);
    this.setState({ changes: [], additionalNotes: '' });
  };

  _formatValueForTable = (val, columnName) => {
    if (val === null || val === undefined || val === '') return '—';
    if (columnName === 'Confirmation' || columnName === 'Confirmation Status') {
      const v = String(val).toLowerCase();
      if (v === 'true' || v === '1' || v === 'yes' || v === 'confirmed') return 'Confirmed';
      if (v === 'false' || v === '0' || v === 'no' || v === 'not confirmed') return 'Not Confirmed';
    }
    return String(val);
  };

  handleClose = () => {
    this.setState({ changes: [], additionalNotes: '' });
    this.props.onClose();
  };

  render() {
    const { data } = this.props;
    const { changes, additionalNotes } = this.state;
    if (!data) return null;

    return (
      <div className="registration-payment-details-modal-overlay" onClick={this.handleClose}>
        <div
          className="registration-payment-details-modal-content"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '600px' }}
        >
          <div className="registration-payment-details-modal-header">
            <h3>Add Change to Approval List</h3>
          </div>
          <div className="registration-payment-details-modal-body">

            {/* One card per change */}
            {changes.map((change, i) => (
              <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  {change.isFirst ? (
                    <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#856404', background: '#fff3cd', padding: '3px 10px', borderRadius: '4px' }}>
                      {change.columnName}
                    </span>
                  ) : (
                    <select
                      value={change.columnName}
                      onChange={e => this.updateChange(i, 'columnName', e.target.value)}
                      style={{ padding: '3px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '20px', fontWeight: 'bold', color: '#856404', background: '#fff3cd', cursor: 'pointer' }}
                    >
                      {NSA_EDITABLE_COLUMNS.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  )}
                  {changes.length > 1 && (
                    <button type="button" onClick={() => this.removeChange(i)}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '27px', lineHeight: 1, padding: '0 4px' }}>
                      ×
                    </button>
                  )}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '20px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 10px', border: '1px solid #ddd', color: '#000', width: '36%', whiteSpace: 'nowrap' }}>Current Value</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #ddd', color: '#000' }}>{this._formatValueForTable(change.currentValue, change.columnName)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 10px', border: '1px solid #ddd', color: '#000' }}>New Value <span style={{ color: 'red' }}>*</span></td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                        <ValueInput
                          columnName={change.columnName}
                          value={change.newValue}
                          onChange={v => this.updateChange(i, 'newValue', v)}
                          paymentMethod={data.paymentMethod}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 10px', border: '1px solid #ddd', color: '#000' }}>Reason <span style={{ color: 'red' }}>*</span></td>
                      <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>
                        <textarea
                          value={change.reason}
                          onChange={e => this.updateChange(i, 'reason', e.target.value)}
                          rows={1}
                          placeholder="Why is this change needed?"
                          style={{ width: '100%', padding: '4px 6px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '18px', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            {/* Additional notes */}
            <div>
              <label htmlFor="nsaAdditionalNotes" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '20px', color: '#000' }}>
                Additional Notes <span style={{ fontWeight: 'normal', color: '#000' }}>(optional)</span>
              </label>
              <textarea
                id="nsaAdditionalNotes"
                value={additionalNotes}
                onChange={e => this.setState({ additionalNotes: e.target.value })}
                rows={2}
                placeholder="Any extra context for the approver..."
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '20px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <p style={{ marginTop: '10px', fontSize: '18px', color: '#000' }}>
              An email with <strong>individual Approve buttons</strong> per change will be sent to the approver.
            </p>
          </div>
          <div className="registration-payment-details-modal-footer">
            <button
              className="registration-payment-details-modal-btn registration-payment-details-modal-btn-secondary"
              onClick={this.handleClose}
            >
              Cancel
            </button>
            <button
              className="registration-payment-details-modal-btn registration-payment-details-modal-btn-primary"
              onClick={this.handleAddToList}
            >
              Add to List
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default NSAApprovalModal;
