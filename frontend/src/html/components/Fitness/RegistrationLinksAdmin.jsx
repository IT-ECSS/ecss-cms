import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import LoadingModal from '../Common/LoadingModal';
import LinkCellRenderer from './LinkCellRenderer';
import QRCellRenderer from './QRCellRenderer';
import '../../../css/ag-grid-custom-theme.css';
import '../../../css/fftAdmin.css';
import '../../../css/fftStaff.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';

// ─────────────────────────────────────────────────────────────────────────────
// RegistrationLinksAdmin
//
// Fetches the master FFT spreadsheet and displays Registration Link + QR Code
// for every event row using AgGrid.
// ─────────────────────────────────────────────────────────────────────────────
class RegistrationLinksAdmin extends Component {
  constructor(props) {
    super(props);
    this.gridRef = React.createRef();
    this.state = {
      rowData: [],
      loading: true,
      error: null,
      qrModal: null, // { value, eventName }
      fileIdModal: null, // { eventName }
      fileIdInput: '',
      fileIdSaving: false,
      fileIdError: null,
      fileIdSuccess: null,
    };

    this.columnDefs = [
      { field: 'sn',               
        headerName: 'S/N',               
        width: 80,  
        sortable: true,
        pinned: 'left'
    },
      { field: 'name',             
        headerName: 'Event Name',         
        width: 250, 
        sortable: true,
        pinned: 'left'
    },
      {
        field: 'registrationLink',
        headerName: 'Registration Link',
        width: 500,
        sortable: false,
        wrapText: true,
        autoHeight: true,
        cellRenderer: LinkCellRenderer
      },
      {
        field: 'qrCode',
        headerName: 'QR Code',
        width: 420,
        sortable: false,
        wrapText: true,
        autoHeight: true,
        cellRenderer: QRCellRenderer
      },
    ];
  }

  componentDidMount() {
    this.loadEvents();
  }

  loadEvents = async () => {
    this.setState({ loading: true, error: null });
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getIndexSheet`);

      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to read index sheet');
      }

      // Sheet columns: A=S/N, B=Event Name, C=Status, D=Time Slots, E=Max Participants,
      //                F=Created On, G=File ID, H=Registration Link, I=QR Code
      const rows = res.data.rows || res.data.data || [];
      const rowData = rows
        .map((row, idx) => {
          if (row && typeof row === 'object' && !Array.isArray(row)) {
            return {
              sn: row.serialNumber || idx + 1,
              name: String(row.eventName || '').trim(),
              fileId: String(row.fileId || '').trim(),
              registrationLink: String(row.registrationLink || '').trim(),
              qrCode: String(row.qrCodeUrl || '').trim(),
            };
          }

          return {
            sn: row && row[0] ? row[0] : idx + 1,
            name: row && row[1] ? String(row[1]).trim() : '',
            fileId: row && row[6] ? String(row[6]).trim() : '',
            registrationLink: row && row[7] ? String(row[7]).trim() : '',
            qrCode: row && row[8] ? String(row[8]).trim() : '',
          };
        })
        .filter((row) => row.name);

      this.setState({ rowData, loading: false });
    } catch (err) {
      this.setState({ error: err.message || 'Error loading events', loading: false });
    }
  };

  handleViewQR = (value, eventName) => {
    this.setState({ qrModal: { value, eventName } });
  };

  handleCloseQR = () => {
    this.setState({ qrModal: null });
  };

  handleSetFileId = (eventName) => {
    this.setState({ fileIdModal: { eventName }, fileIdInput: '', fileIdError: null, fileIdSuccess: null });
  };

  handleCloseFileIdModal = () => {
    this.setState({ fileIdModal: null, fileIdInput: '', fileIdError: null, fileIdSuccess: null });
  };

  handleSaveFileId = async () => {
    const { fileIdModal, fileIdInput } = this.state;
    if (!fileIdInput.trim()) {
      this.setState({ fileIdError: 'Please enter a Google Sheets URL or File ID.' });
      return;
    }
    this.setState({ fileIdSaving: true, fileIdError: null, fileIdSuccess: null });
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/setEventFileId`, {
        eventName: fileIdModal.eventName,
        sheetsUrl: fileIdInput.trim(),
        fileId: fileIdInput.trim(),
      });
      if (res.data.success) {
        this.setState({ fileIdSuccess: `File ID set to: ${res.data.fileId}`, fileIdSaving: false });
        // Refresh the grid
        await this.loadEvents();
      } else {
        this.setState({ fileIdError: res.data.error || 'Failed to set file ID.', fileIdSaving: false });
      }
    } catch (err) {
      this.setState({ fileIdError: err.response?.data?.error || err.message || 'Error saving file ID.', fileIdSaving: false });
    }
  };

  render() {
    const { rowData, loading, error, qrModal, fileIdModal, fileIdInput, fileIdSaving, fileIdError, fileIdSuccess } = this.state;

    const isImageUrl = (v) =>
      v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image');

    return (
      <div className="fft-participants-form">
        <div className="fft-participants-section">
          <div className="fft-participants-section-header">
            <h3 className="fft-participants-section-title">Registration Links &amp; QR Codes</h3>
            <hr style={{ margin: '12px 0' }} />
            <div className="fft-participants-section-desc" style={{ marginBottom: '16px', color: '#555', fontSize: '1em' }}>
              Click any registration link or QR code URL to open it in a new tab. Use the copy icon to copy the link to your clipboard.
            </div>
          </div>

          {error && <p style={{ color: '#d32f2f', padding: '16px 0' }}>{error}</p>}

          {!loading && !error && rowData.length === 0 && (
            <p style={{ color: '#888', padding: '16px 0' }}>No events found.</p>
          )}

          {!loading && rowData.length > 0 && (
            <div
              className="grid-container fft-upload-grid"
              style={{ width: '100%', height: '500px', marginLeft: 0 }}
            >
              <AgGridReact
                ref={this.gridRef}
                columnDefs={this.columnDefs}
                rowData={rowData}
                defaultColDef={this.defaultColDef}
                domLayout="normal"
                pagination={true}
                paginationPageSize={rowData.length}
                paginationPageSizeSelector={[25, 50, 75, 100, rowData.length]}
                suppressCellFocus={true}
                context={{ onViewQR: this.handleViewQR, onSetFileId: this.handleSetFileId }}
              />
            </div>
          )}
        </div>

        {/* ── Set File ID Modal ── */}
        {fileIdModal && (
          <div
            onClick={this.handleCloseFileIdModal}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 12, padding: 32,
                maxWidth: 480, width: '90%',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}
            >
              <h4 style={{ marginBottom: 8, fontSize: '1.05rem', fontWeight: 700, color: '#222' }}>
                Set File ID
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: 16 }}>
                <strong>{fileIdModal.eventName}</strong><br />
                Paste the Google Sheets URL (e.g. <em>https://docs.google.com/spreadsheets/d/…/edit</em>) or just the File ID.
              </p>
              <input
                type="text"
                value={fileIdInput}
                onChange={e => this.setState({ fileIdInput: e.target.value, fileIdError: null, fileIdSuccess: null })}
                placeholder="Google Sheets URL or File ID"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.9rem', marginBottom: 10, boxSizing: 'border-box' }}
                onKeyDown={e => { if (e.key === 'Enter') this.handleSaveFileId(); }}
              />
              {fileIdError && <p style={{ color: '#d32f2f', fontSize: '0.85rem', marginBottom: 8 }}>{fileIdError}</p>}
              {fileIdSuccess && <p style={{ color: '#2e7d32', fontSize: '0.85rem', marginBottom: 8 }}>{fileIdSuccess}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={this.handleCloseFileIdModal}
                  style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  {fileIdSuccess ? 'Close' : 'Cancel'}
                </button>
                {!fileIdSuccess && (
                  <button
                    type="button"
                    onClick={this.handleSaveFileId}
                    disabled={fileIdSaving}
                    style={{ padding: '8px 20px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, cursor: fileIdSaving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    {fileIdSaving ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── QR Code Modal ── */}
        {qrModal && (
          <div
            onClick={this.handleCloseQR}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 12, padding: 32,
                maxWidth: 360, width: '90%', textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}
            >
              <h4 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 700, color: '#222' }}>
                {qrModal.eventName}
              </h4>
              {isImageUrl(qrModal.value) ? (
                <img
                  src={qrModal.value}
                  alt={`QR Code for ${qrModal.eventName}`}
                  style={{ maxWidth: 220, maxHeight: 220, display: 'block', margin: '0 auto 16px' }}
                />
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: '0.82rem', color: '#555', wordBreak: 'break-all', marginBottom: 8 }}>
                    {qrModal.value}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(qrModal.value)}
                    style={{
                      background: 'none', border: '1px solid #ccc', borderRadius: 4,
                      padding: '4px 14px', fontSize: '0.82rem', cursor: 'pointer',
                    }}
                  >
                    <i className="fas fa-copy" style={{ marginRight: 5 }}></i>Copy
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={this.handleCloseQR}
                style={{
                  marginTop: 4, padding: '8px 28px', background: '#d32f2f',
                  color: '#fff', border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <LoadingModal visible={loading} message="Loading events..." />
      </div>
    );
  }
}

export default RegistrationLinksAdmin;
