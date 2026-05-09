import React, { Component } from 'react';
import { saveAs } from 'file-saver';
import { sendExportNotification } from '../services/registrationApi';

/**
 * SupervisorExportModal
 *
 * Shown when moses_lee, peipei_low, or rosalind_ong clicks Export LOP / Export Attendance.
 * On "Download & Notify":
 *   1. Saves the Excel file directly to the user's machine.
 *   2. Sends a notification email to all 3 supervisors.
 *
 * Props:
 *   isOpen            {boolean}
 *   pendingExport     { excelBase64, exportType, courseType, recordCount, fileName }
 *   exporterName      {string}
 *   exporterEmail     {string}
 *   onClose           {function}
 *   onSuccess         {function(message)}
 *   warningPopUpMessage {function(message)}
 */
class SupervisorExportModal extends Component {
    constructor(props) {
        super(props);
        this.state = { isSending: false };
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.isOpen && this.props.isOpen) {
            this.setState({ isSending: false });
        }
    }

    handleConfirm = async () => {
        const { pendingExport, exporterName, exporterEmail, onClose, onSuccess, warningPopUpMessage } = this.props;
        if (!pendingExport) return;

        this.setState({ isSending: true });

        try {
            // 1. Download file
            const binaryStr = atob(pendingExport.excelBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            saveAs(
                new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                pendingExport.fileName
            );

            // 2. Send notification email
            await sendExportNotification({
                exporterName:  exporterName || exporterEmail,
                exporterEmail: exporterEmail,
                exportType:    pendingExport.exportType,
                courseType:    pendingExport.courseType,
                recordCount:   pendingExport.recordCount,
                fileName:      pendingExport.fileName,
            });

            onClose();
            if (onSuccess) {
                onSuccess(`File downloaded and notification sent to supervisors.`);
            }
        } catch (err) {
            console.error('[SupervisorExportModal] error:', err);
            this.setState({ isSending: false });
            if (warningPopUpMessage) {
                warningPopUpMessage('Export notification failed: ' + (err?.response?.data?.message || err.message));
            }
        }
    };

    render() {
        const { isOpen, pendingExport, exporterName, onClose } = this.props;
        if (!isOpen || !pendingExport) return null;

        const { isSending } = this.state;
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
                        width: 500,
                        maxWidth: '94vw',
                        fontFamily: 'Arial, sans-serif',
                        overflow: 'hidden',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ background: '#1a3a6b', padding: '18px 24px' }}>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: 17 }}>Download & Notify Export</h3>
                        <p style={{ margin: '4px 0 0', color: '#ccd9f0', fontSize: 12 }}>
                            The file will be saved to your device and all supervisors will be notified by email.
                        </p>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '20px 24px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                            <tbody>
                                <tr style={{ background: '#f2f5fb' }}>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444', width: '38%' }}>Exported By</td>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', color: '#333' }}>{exporterName || '—'}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444' }}>Export Type</td>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', color: '#1a3a6b', fontWeight: 'bold' }}>{typeLabel}</td>
                                </tr>
                                <tr style={{ background: '#f2f5fb' }}>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444' }}>Course Type</td>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef' }}>{pendingExport.courseType}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444' }}>Records</td>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef' }}>{pendingExport.recordCount}</td>
                                </tr>
                                <tr style={{ background: '#f2f5fb' }}>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontWeight: 'bold', color: '#444' }}>File Name</td>
                                    <td style={{ padding: '8px 12px', border: '1px solid #dde3ef', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>{pendingExport.fileName}</td>
                                </tr>
                            </tbody>
                        </table>

                        <p style={{ margin: '0 0 8px', color: '#555', fontSize: 12 }}>
                            Clicking <strong>Download &amp; Notify</strong> will immediately save the Excel file to your device
                            and send an email notification to all supervisors (Moses Lee, Peipei Low, Rosalind Ong).
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
                            onClick={this.handleConfirm}
                            disabled={isSending}
                            style={{
                                padding: '9px 22px', border: 'none',
                                background: isSending ? '#5a85c8' : '#1a3a6b',
                                color: '#fff', borderRadius: 5,
                                cursor: isSending ? 'not-allowed' : 'pointer',
                                fontSize: 13, fontWeight: 'bold',
                            }}
                        >
                            {isSending ? 'Processing…' : 'Download & Notify'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default SupervisorExportModal;
