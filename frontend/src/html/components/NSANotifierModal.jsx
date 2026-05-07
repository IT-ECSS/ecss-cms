import React from 'react';
import axios from 'axios';

class NSANotifierModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSending: false,
      reasons: {}, // Track reason for each change by index
      reasonErrors: {},
      noticeOpen: false,
      noticeTitle: '',
      noticeMessage: '',
      noticeCloseMain: false,
    };
  }

  openNotice = (title, message, closeMain = false) => {
    this.setState({
      noticeOpen: true,
      noticeTitle: title,
      noticeMessage: message,
      noticeCloseMain: closeMain,
    });
  };

  closeNotice = () => {
    const { onClose, onClearAll } = this.props;
    const { noticeCloseMain } = this.state;

    this.setState({
      noticeOpen: false,
      noticeTitle: '',
      noticeMessage: '',
      noticeCloseMain: false,
    });

    if (noticeCloseMain) {
      onClearAll();
      onClose();
    }
  };

  handleReasonChange = (idx, value) => {
    this.setState(prevState => ({
      reasons: { ...prevState.reasons, [idx]: value },
      reasonErrors: { ...prevState.reasonErrors, [idx]: false },
    }));
  };

  handleSend = async () => {
    const { changes, userName, userEmail, onClose, onClearAll, onApplyChanges } = this.props;
    const { reasons } = this.state;

    if (!changes || changes.length === 0) {
      this.openNotice('No Changes', 'No changes to send.');
      return;
    }

    const selectedChanges = changes
      .map((change, idx) => ({ change, idx }))
      .map(item => ({
        ...item.change,
        reason: reasons[item.idx] || '',
      }));

    const missingReasons = selectedChanges
      .map((item, idx) => ({
        idx,
        sn: item.sn,
        reason: String(item.reason || '').trim(),
      }))
      .filter(item => !item.reason);

    if (missingReasons.length > 0) {
      const errorMap = {};
      missingReasons.forEach(item => {
        errorMap[item.idx] = true;
      });
      this.setState({ reasonErrors: errorMap });
      const rows = missingReasons
        .map(item => item.sn || `${item.idx + 1}`)
        .join(', ');
      this.openNotice('Missing Reason', `Reason is required for all rows. Missing reason at S/N: ${rows}`);
      return;
    }

    this.setState({ isSending: true });

    const baseUrl =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : 'https://ecss-backend-node.azurewebsites.net';

    try {
      if (onApplyChanges) {
        await onApplyChanges(selectedChanges);
      }

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');

      await axios.post(`${baseUrl}/nsaNotifier`, {
        purpose: 'sendNotifierEmail',
        fromName: userName,
        fromEmail: userEmail || '',
        currentDate: `${dd}/${mm}/${yyyy}`,
        currentTime: `${hh}:${min}`,
        changes: selectedChanges.map(c => ({
          registrationId: c.registrationId,
          sn: c.sn,
          participantName: c.participantName,
          participantEmail: c.participantEmail || '',
          courseName: c.courseName,
          courseLocation: c.courseLocation,
          columnName: c.columnName,
          oldValue: c.oldValue || '',
          newValue: c.newValue,
          reason: c.reason || '',
        })),
      });

      this.setState({ isSending: false, reasons: {}, reasonErrors: {} });
      onClearAll();
      onClose();
    } catch (err) {
      console.error('Error sending notifier email:', err);
      this.setState({ isSending: false });
      this.openNotice('Send Failed', 'Failed to send notifier email. Please try again.');
    }
  };

  render() {
    const { isOpen, changes, onClose } = this.props;
    const { isSending, reasons, reasonErrors, noticeOpen, noticeTitle, noticeMessage } = this.state;

    if (!isOpen) return null;

    const hasChanges = changes && changes.length > 0;
    const th = { padding: '8px 10px', border: '1px solid #ccc', textAlign: 'left', background: '#f2f2f2', fontWeight: '600' };
    const td = { padding: '8px 10px', border: '1px solid #ddd', fontSize: '14px' };

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '10px',
            width: '96%',
            maxWidth: '1300px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderRadius: '10px 10px 0 0',
            }}
          >
            <div>
              <div style={{ fontSize: '23px', fontWeight: '700', color: '#000', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                NSA Notifier Queue
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#333',
                fontSize: '28px',
                lineHeight: 1,
                padding: '0 2px',
                width: 'fit-content',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
            {!hasChanges ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 20px',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '36px', opacity: 0.25 }}>📋</div>
                <div style={{ fontSize: '21px', color: '#000', textAlign: 'center' }}>
                  No changes queued yet.
                </div>
                <div style={{ fontSize: '18px', color: '#000', textAlign: 'center' }}>
                  Click any editable field in a Registration & Payment row to add a change to this queue.
                </div>
              </div>
            ) : (
              <>
                {/* Table with vertical scroll */}
                <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', minWidth: '760px' }}>
                    <thead>
                      <tr style={{ background: '#f2f2f2', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ ...th, width: '40px' }}>S/N</th>
                        <th style={{ ...th, width: '110px' }}>Field</th>
                        <th style={{ ...th, width: '120px' }}>Old Value</th>
                        <th style={{ ...th, width: '120px' }}>New Value</th>
                        <th style={{ ...th, width: '360px' }}>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((change, idx) => (
                        <React.Fragment key={idx}>
                          <tr>
                            <td
                              colSpan={5}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #d6deed',
                                background: '#eef3fb',
                                color: '#1f3f75',
                                fontSize: '15px',
                                fontWeight: '600',
                              }}
                            >
                              {`${change.participantName || '-'} <${change.participantEmail || '-'}> ${change.courseName || '-'}${change.courseLocation ? ` · ${change.courseLocation}` : ''}`}
                            </td>
                          </tr>
                          <tr
                            style={{
                              background: idx % 2 === 0 ? '#fff' : '#fafafa',
                              transition: 'background 0.2s',
                            }}
                          >
                            <td style={{ ...td, textAlign: 'center', color: '#888' }}>
                              {change.sn || '—'}
                            </td>
                            <td style={{ ...td, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: '#fff3cd', fontWeight: '600', color: '#8a5a00' }} title={change.columnName || ''}>
                              {change.columnName}
                            </td>
                            <td style={{ ...td, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={change.oldValue || '—'}>{change.oldValue || '—'}</td>
                            <td
                              style={{ ...td, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: '#e8f5e9', fontWeight: '600', color: '#2e7d32' }}
                              title={
                                (String(change.columnField || '').toLowerCase() === 'remarks' || String(change.columnName || '').toLowerCase() === 'remarks')
                                  ? '—'
                                  : (change.newValue || '—')
                              }
                            >
                              {(String(change.columnField || '').toLowerCase() === 'remarks' || String(change.columnName || '').toLowerCase() === 'remarks')
                                ? '—'
                                : (change.newValue || '—')}
                            </td>
                            <td style={td}>
                              <input
                                type="text"
                                value={reasons[idx] || ''}
                                onChange={e => this.handleReasonChange(idx, e.target.value)}
                                placeholder="Enter reason..."
                                style={{
                                  width: '100%',
                                  minWidth: '240px',
                                  padding: '6px 10px',
                                  border: reasonErrors[idx] ? '1px solid #f5c6cb' : '1px solid #ccc',
                                  borderRadius: '4px',
                                  fontSize: '17px',
                                  boxSizing: 'border-box',
                                  background: reasonErrors[idx] ? '#fff5f5' : '#fff',
                                }}
                              />
                              {reasonErrors[idx] && (
                                <span style={{ display: 'block', marginTop: '4px', color: '#dc3545', fontSize: '12px' }}>
                                  Reason is needed
                                </span>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p style={{ marginTop: '12px', fontSize: '14px', color: '#666', flexShrink: 0 }}>
                  All queued changes will be notified to the NSA approval team.
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '0 0 10px 10px',
            }}
          >
            <button
              onClick={onClose}
              disabled={isSending}
              style={{
                padding: '8px 20px',
                border: '2px solid #dc3545',
                borderRadius: '6px',
                background: 'transparent',
                color: '#dc3545',
                fontSize: '24px',
                fontWeight: 700,
                width: 'fit-content',
                cursor: isSending ? 'not-allowed' : 'pointer',
                opacity: isSending ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={this.handleSend}
              disabled={isSending || !hasChanges}
              style={{
                padding: '8px 22px',
                border: `2px solid ${isSending || !hasChanges ? '#999' : '#28a745'}`,
                borderRadius: '6px',
                background: 'transparent',
                color: isSending || !hasChanges ? '#999' : '#28a745',
                fontSize: '24px',
                fontWeight: 700,
                width: 'fit-content',
                cursor: isSending || !hasChanges ? 'not-allowed' : 'pointer',
              }}
            >
              {isSending ? 'Sending...' : 'Send Notifier'}
            </button>
          </div>
        </div>

        {noticeOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              zIndex: 20,
            }}
          >
            <div
              style={{
                width: '90%',
                maxWidth: '460px',
                background: '#fff',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                padding: '18px 20px',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111' }}>{noticeTitle}</div>
              <div style={{ marginTop: '10px', fontSize: '16px', color: '#333', lineHeight: 1.4 }}>{noticeMessage}</div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={this.closeNotice}
                  style={{
                    padding: '8px 20px',
                    border: '2px solid #0d47a1',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#0d47a1',
                    fontSize: '16px',
                    fontWeight: 700,
                    width: 'fit-content',
                    cursor: 'pointer',
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default NSANotifierModal;
