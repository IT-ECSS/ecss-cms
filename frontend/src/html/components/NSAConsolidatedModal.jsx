import React from 'react';
import axios from 'axios';

const PAYMENT_STATUS_OPTIONS_SF = [
  'Pending', 'Generating SkillsFuture Invoice', 'SkillsFuture Done',
  'Cancelled', 'Withdrawn', 'Refunded',
];
const PAYMENT_STATUS_OPTIONS = [
  'Pending', 'Paid', 'Cancelled', 'Withdrawn', 'Refunded', 'Not Successful',
];
const CONFIRMATION_OPTIONS = ['Yes', 'No'];
const PAYMENT_METHOD_OPTIONS = ['Cash', 'PayNow', 'SkillsFuture'];
const NSA_EDITABLE_COLUMNS = [
  'Name', 'Contact Number', 'Payment Date', 'Refunded Date', 'Remarks',
  'Registration and Payment Status', 'Confirmation', 'Payment Method',
];

function ButtonPills({ options, value, onChange }) {
  // Chunk into rows of max 3
  const rows = [];
  for (let i = 0; i < options.length; i += 3) {
    rows.push(options.slice(i, i + 3));
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {rows.map((rowOpts, ri) => (
        <div key={ri} style={{ display: 'flex', gap: '4px' }}>
          {rowOpts.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                width: 'fit-content',
                minWidth: '60px',
                padding: '4px 10px',
                borderRadius: '4px',
                border: `1px solid ${value === opt ? '#28a745' : '#ddd'}`,
                background: value === opt ? '#28a745' : '#fff',
                color: value === opt ? '#fff' : '#000',
                fontSize: '17px',
                cursor: 'pointer',
                fontWeight: value === opt ? '600' : 'normal',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function ValueCell({ item, onChange }) {
  const { columnName, newValue, paymentMethod } = item;
  const isSF = (paymentMethod || '') === 'SkillsFuture';
  if (
    columnName === 'Registration and Payment Status' ||
    columnName === 'Payment Status' ||
    columnName === 'Registration Status'
  ) {
    return (
      <ButtonPills
        options={isSF ? PAYMENT_STATUS_OPTIONS_SF : PAYMENT_STATUS_OPTIONS}
        value={newValue}
        onChange={v => onChange('newValue', v)}
      />
    );
  }
  if (columnName === 'Confirmation') {
    return <ButtonPills options={CONFIRMATION_OPTIONS} value={newValue} onChange={v => onChange('newValue', v)} />;
  }
  if (columnName === 'Payment Method') {
    return <ButtonPills options={PAYMENT_METHOD_OPTIONS} value={newValue} onChange={v => onChange('newValue', v)} />;
  }
  return (
    <input
      type="text"
      value={newValue}
      onChange={e => onChange('newValue', e.target.value)}
      style={{
        width: '100%', padding: '3px 6px', border: '1px solid #ccc',
        borderRadius: '3px', fontSize: '18px', boxSizing: 'border-box',
      }}
    />
  );
}

class NSAConsolidatedModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSending: false,
      additionalNotes: '',
    };
  }

  handleSend = async () => {
    const { changes, userName, userEmail, onClose, onClearAll } = this.props;
    const { additionalNotes } = this.state;

    if (!changes || changes.length === 0) {
      alert('No changes in the list. Please add changes first.');
      return;
    }

    // Validate
    for (let i = 0; i < changes.length; i++) {
      const c = changes[i];
      if (!c.newValue || !String(c.newValue).trim()) {
        alert(`Change ${i + 1} (${c.columnName} for ${c.participantName}) is missing a new value.`);
        return;
      }
      if (!c.reason || !c.reason.trim()) {
        alert(`Change ${i + 1} (${c.columnName} for ${c.participantName}) is missing a reason.`);
        return;
      }
    }

    this.setState({ isSending: true });

    const baseUrl =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : 'https://ecss-backend-node.azurewebsites.net';

    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');

      // Send a single email containing all changes across all participants
      await axios.post(`${baseUrl}/accountDetails`, {
        purpose: 'sendApprovalEmail',
        fromName: userName,
        fromEmail: userEmail || '',
        currentDate: `${dd}/${mm}/${yyyy}`,
        currentTime: `${hh}:${min}`,
        allChanges: changes.map(c => ({
          registrationId: c.registrationId,
          sn: c.sn,
          participantName: c.participantName,
          contactNo: c.contactNo,
          courseName: c.courseName,
          courseLocation: c.courseLocation,
          courseType: c.courseType,
          paymentStatus: c.paymentStatus,
          paymentMethod: c.paymentMethod,
          columnName: c.columnName,
          currentValue: c.currentValue || '',
          newValue: c.newValue,
          reason: c.reason,
        })),
        additionalNotes: additionalNotes || '',
      });

      alert(`Approval request sent — ${changes.length} change${changes.length !== 1 ? 's' : ''} in one email.`);
      this.setState({ isSending: false, additionalNotes: '' });
      onClearAll();
      onClose();
    } catch (err) {
      console.error('Error sending approval email:', err);
      alert('Failed to send approval email. Please try again.');
      this.setState({ isSending: false });
    }
  };

  render() {
    const { isOpen, changes, onClose, onRemove, onUpdate, onClearAll } = this.props;
    const { isSending, additionalNotes } = this.state;

    if (!isOpen) return null;

    const hasChanges = changes && changes.length > 0;

    return (
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#fff', borderRadius: '10px', width: '92%', maxWidth: '960px',
            maxHeight: '88vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header — no close button */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#fafafa',
            borderRadius: '10px 10px 0 0',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px',
              background: '#fff3e0', color: '#e65100', fontSize: '24px',
            }}>
              ✉
            </span>
            <div>
              <div style={{ fontSize: '23px', fontWeight: '700', color: '#000', lineHeight: 1.2 }}>
                  Pending Approval Requests
                </div>
                <div style={{ fontSize: '26px', color: '#000', marginTop: '1px' }}>
                {hasChanges
                  ? `${changes.length} change${changes.length !== 1 ? 's' : ''} queued — review before sending`
                  : 'No changes queued yet'}
              </div>
            </div>
            {hasChanges && (
              <span style={{
                background: '#e65100', color: '#fff',
                borderRadius: '99px', padding: '2px 9px',
                fontSize: '18px', fontWeight: 'bold',
              }}>
                {changes.length}
              </span>
            )}
          </div>

          {/* Body */}
          <div style={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
            {!hasChanges ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '48px 20px', gap: '10px',
              }}>
                <div style={{ fontSize: '36px', opacity: 0.25 }}>📋</div>
                <div style={{ fontSize: '21px', color: '#000', textAlign: 'center' }}>
                  No changes queued yet.
                </div>
                <div style={{ fontSize: '18px', color: '#000', textAlign: 'center' }}>
                  Click any editable field in an NSA row to add a change to this list.
                </div>
              </div>
            ) : (
              <>
                {/* Clear All above table */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button
                    onClick={onClearAll}
                    style={{
                      padding: '0', border: 'none', background: 'none',
                      color: '#000', fontSize: '18px', cursor: 'pointer',
                      textDecoration: 'underline', textUnderlineOffset: '2px',
                      width: 'fit-content',
                    }}
                  >
                    Clear All
                  </button>
                </div>

                <div style={{ flex: 1, overflow: 'auto' }}>
                {(() => {
                  const groups = {};
                  changes.forEach(item => {
                    const key = item.registrationId || '_unknown';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(item);
                  });
                  const groupEntries = Object.entries(groups);
                  let globalIdx = 0;
                  return groupEntries.map(([regId, groupItems], groupI) => {
                    const first = groupItems[0];
                    return (
                      <div key={regId} style={{ marginBottom: '12px', border: '1px solid #c8d8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        {/* Changes table */}
                        <div style={{ overflowX: 'auto' }}>
                        <table style={{ minWidth: '620px', width: '100%', borderCollapse: 'collapse', fontSize: '18px' }}>
                          <thead>
                            <tr style={{ background: '#f7f7f7' }}>
                              <th style={th}>#</th>
                              <th style={th}>Field</th>
                              <th style={{ ...th, color: '#000' }}>Current Value</th>
                              <th style={th}>New Value</th>
                              <th style={th}>Reason</th>
                              <th style={{ ...th, width: 32, padding: '7px 4px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupItems.map((item, localIdx) => {
                              globalIdx++;
                              return (
                                <tr
                                  key={item._tempId}
                                  style={{
                                    borderBottom: '1px solid #f0f0f0',
                                    background: localIdx % 2 === 0 ? '#fff' : '#fafafa',
                                  }}
                                >
                                  <td style={{ ...td, width: 32, color: '#000', textAlign: 'center', fontWeight: '600' }}>
                                    {item.sn || globalIdx}
                                  </td>
                                  <td style={{ ...td, width: '140px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      background: '#fff8ec',
                                      border: '1px solid #f0ad4e',
                                      color: '#8a5a00',
                                      fontWeight: '600',
                                      fontSize: '17px',
                                      whiteSpace: 'nowrap',
                                    }}>
                                      {item.columnName}
                                    </span>
                                  </td>
                                  <td style={{ ...td, color: '#000', fontStyle: 'italic', maxWidth: '100px' }}>
                                    {item.currentValue || '—'}
                                  </td>
                                  <td style={{ ...td, minWidth: '160px' }}>
                                    <ValueCell
                                      item={item}
                                      onChange={(field, val) => onUpdate(item._tempId, field, val)}
                                    />
                                  </td>
                                  <td style={{ ...td, minWidth: '150px' }}>
                                    <textarea
                                      value={item.reason}
                                      onChange={e => onUpdate(item._tempId, 'reason', e.target.value)}
                                      rows={2}
                                      placeholder="Enter reason..."
                                      style={{
                                        width: '100%', padding: '4px 6px',
                                        border: item.reason ? '1px solid #ccc' : '1px solid #f5c6cb',
                                        borderRadius: '4px', fontSize: '17px', resize: 'vertical',
                                        boxSizing: 'border-box', background: item.reason ? '#fff' : '#fff5f5',
                                      }}
                                    />
                                  </td>
                                  <td style={{ ...td, textAlign: 'center', padding: '6px 4px' }}>
                                    <button
                                      onClick={() => onRemove(item._tempId)}
                                      title="Remove this change"
                                      style={{
                                        background: 'none', border: '1px solid transparent',
                                        color: '#ccc', fontSize: '16px', cursor: 'pointer',
                                        lineHeight: 1, padding: '3px 6px', borderRadius: '4px',
                                        transition: 'all 0.15s',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.color = '#dc3545'; e.currentTarget.style.borderColor = '#dc3545'; e.currentTarget.style.background = '#fff5f5'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    );
                  });
                })()}
                </div>

                <div style={{ marginTop: '16px', flexShrink: 0, padding: '12px 14px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '18px', color: '#000', marginBottom: '5px' }}>
                    Additional Notes
                    <span style={{ fontWeight: 'normal', color: '#000', marginLeft: '5px' }}>(optional — shared with all recipients)</span>
                  </label>
                  <textarea
                    value={additionalNotes}
                    onChange={e => this.setState({ additionalNotes: e.target.value })}
                    rows={2}
                    placeholder="Any extra context for the approver..."
                    style={{
                      width: '100%', padding: '7px 9px', borderRadius: '5px',
                      border: '1px solid #e0e0e0', fontSize: '18px', resize: 'vertical',
                      boxSizing: 'border-box', background: '#fff',
                    }}
                  />
                </div>

                <p style={{ marginTop: '8px', fontSize: '17px', color: '#000', flexShrink: 0 }}>
                  One email per participant will be sent with individual <strong>Approve</strong> buttons for each change.
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #e8e8e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            background: '#fafafa',
            borderRadius: '0 0 10px 10px',
          }}>
            <button
              onClick={onClose}
              disabled={isSending}
              style={{
                padding: '8px 20px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#fff',
                color: '#000',
                fontSize: '20px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={this.handleSend}
              disabled={isSending || !hasChanges}
              style={{
                padding: '8px 22px',
                border: 'none',
                borderRadius: '6px',
                background: isSending || !hasChanges ? '#ccc' : '#28a745',
                color: '#fff',
                fontSize: '20px',
                fontWeight: '600',
                cursor: isSending || !hasChanges ? 'default' : 'pointer',
                minWidth: '100px',
              }}
            >
              {isSending ? 'Sending…' : `Send${hasChanges ? ` (${changes.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const th = {
  padding: '7px 10px',
  borderBottom: '2px solid #e8e8e8',
  textAlign: 'left',
  fontWeight: '600',
  fontSize: '17px',
  color: '#000',
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const td = {
  padding: '8px 10px',
  verticalAlign: 'middle',
};

export default NSAConsolidatedModal;
