import React, { Component } from 'react';
import { sendExportApprovalRequest } from '../services/registrationApi';

/**
 * ExportApprovalModal
 * Shown when testingA / testingB clicks Export LOP or Export Attendance.
 * Lets them confirm before sending the approval request email to supervisors.
 *
 * Props:
 *   isOpen              {boolean}
 *   pendingExport       {object}  – { excelBase64, fileName, exportType, courseType, recordCount }
 *   requesterName       {string}
 *   requesterEmail      {string}
 *   onClose             {function}
 *   onSuccess           {function(message)}  – called after successful send
 *   warningPopUpMessage {function(message)}
 */
class ExportApprovalModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isSending: false,
      note: '',
    };
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.isOpen && this.props.isOpen) {
      this.setState({ isSending: false, note: '' });
    }
  }

  resolveRequesterEmail = (requesterName, requesterEmail) => {
    const normalizedEmail = String(requesterEmail || '').trim().toLowerCase();
    if (normalizedEmail) return normalizedEmail;

    const normalizedName = String(requesterName || '').trim().toLowerCase();

    const knownRequesterEmails = {
      'testing a': 'testinga@ecss.org.sg',
      'testinga': 'testinga@ecss.org.sg',
      'testing b': 'testingb@ecss.org.sg',
      'testingb': 'testingb@ecss.org.sg',
      'lee xuan yao moses': 'mossleegermany@gmail.com',
      'lee xuan yao moseds': 'mossleegermany@gmail.com',
    };

    return knownRequesterEmails[normalizedName] || '';
  };

  handleSend = async () => {
    const { pendingExport, requesterName, requesterEmail, onClose, warningPopUpMessage, onSuccess } = this.props;
    if (!pendingExport) return;

    const resolvedRequesterEmail = this.resolveRequesterEmail(requesterName, requesterEmail);
    if (!resolvedRequesterEmail) {
      warningPopUpMessage('Unable to send approval: requester email is missing. Please re-login and try again.');
      return;
    }

    this.setState({ isSending: true });
    try {
      const response = await sendExportApprovalRequest({
        requesterName:  requesterName || resolvedRequesterEmail,
        requesterEmail: resolvedRequesterEmail,
        exportType:     pendingExport.exportType,
        courseType:     pendingExport.courseType,
        recordCount:    pendingExport.recordCount,
        fileName:       pendingExport.fileName,
        excelBase64:    pendingExport.excelBase64,
      });

      if (!response?.data?.result) {
        throw new Error(response?.data?.message || 'Approval request was not accepted by the server.');
      }

      onClose();
      if (onSuccess) {
        onSuccess(`Your ${pendingExport.exportType} export has been sent for approval. You will receive an email once it is reviewed.`);
      }
    } catch (err) {
      console.error('Export approval send error:', err);
      warningPopUpMessage('Failed to send the approval request. Please try again.');
    } finally {
      this.setState({ isSending: false });
    }
  };

  render() {
    const { isOpen, pendingExport, onClose } = this.props;
    const { isSending } = this.state;

    if (!isOpen || !pendingExport) return null;

    const typeLabel = pendingExport.exportType === 'LOP' ? 'List of Participants (LOP)' : 'Attendance';

    return (
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={isSending ? undefined : onClose}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 10,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            width: 480,
            maxWidth: '94vw',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ background: '#1a3a6b', padding: '18px 24px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: 17 }}>Send Export for Approval</h3>
            <p style={{ margin: '4px 0 0', color: '#ccd9f0', fontSize: 12 }}>
              The file will be emailed to the supervisors for review.
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <tbody>
                <tr style={{ background: '#f2f5fb' }}>
                  <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444', width: '40%' }}>Export Type</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', color: '#1a3a6b', fontWeight: 'bold' }}>{typeLabel}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444' }}>Course Type</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #dde3ef' }}>{pendingExport.courseType}</td>
                </tr>
                <tr style={{ background: '#f2f5fb' }}>
                  <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444' }}>Records</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #dde3ef' }}>{pendingExport.recordCount}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444' }}>File Name</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>{pendingExport.fileName}</td>
                </tr>
              </tbody>
            </table>

            <p style={{ margin: '0 0 8px', color: '#555', fontSize: 12 }}>
              Supervisors will receive this file by email and can Approve or Reject your request.
              You will be notified by email once a decision is made.
            </p>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', background: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
            <button
              onClick={onClose}
              disabled={isSending}
              style={{
                padding: '9px 22px', border: '1.5px solid #bbb', background: '#fff',
                color: '#555', borderRadius: 5, cursor: isSending ? 'not-allowed' : 'pointer', fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              onClick={this.handleSend}
              disabled={isSending}
              style={{
                padding: '9px 22px', border: 'none', background: isSending ? '#6c9e6c' : '#28a745',
                color: '#fff', borderRadius: 5, cursor: isSending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 'bold',
              }}
            >
              {isSending ? 'Sending...' : 'Send for Approval'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ExportApprovalModal;
