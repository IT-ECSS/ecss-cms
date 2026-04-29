import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import LoadingModal from '../Common/LoadingModal';
import '../../../css/ag-grid-custom-theme.css';
import '../../../css/fftAdmin.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const MASTER_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';

const CheckboxHeader = ({ api }) => {
  const toggle = () => {
    const total = api.getDisplayedRowCount();
    const selected = api.getSelectedRows().length;
    if (selected === total) {
      api.deselectAll();
    } else {
      api.selectAll();
    }
  };
  return (
    <div
      onClick={toggle}
      style={{ width: '100%', height: '100%', cursor: 'pointer' }}
    />
  );
};

const CheckboxCell = ({ node }) => {
  const [checked, setChecked] = React.useState(node.isSelected());
  React.useEffect(() => {
    const listener = () => setChecked(node.isSelected());
    node.addEventListener('rowSelected', listener);
    return () => node.removeEventListener('rowSelected', listener);
  }, [node]);
  return (
    <input
      type="checkbox"
      checked={checked}
      onClick={(e) => e.stopPropagation()}
      onChange={() => node.setSelected(!node.isSelected())}
      style={{ cursor: 'pointer', width: 18, height: 18 }}
    />
  );
};

class DeleteEventForm extends Component {
  constructor(props) {
    super(props);
    this.gridRef = React.createRef();
    this.state = {
      rowData: [],
      loading: true,
      error: null,
      selectedRows: [],
      deleting: false,
      deleteError: null,
      deleteSuccess: false,
      confirmDelete: false,
    };

    this.columnDefs = [
      { field: 'sn',        headerName: 'S/N',        width: 80,   sortable: true },
      { field: 'name',      headerName: 'Event Name', flex: 1,     sortable: true },
      { field: 'createdOn', headerName: 'Created On', width: 200,  sortable: true },
      {
        headerName: '',
        width: 60,
        sortable: false,
        suppressHeaderMenuButton: true,
        suppressMovable: true,
        resizable: false,
        headerComponent: CheckboxHeader,
        cellRenderer: CheckboxCell,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      },
    ];

    this.defaultColDef = {
      resizable: true,
    };
  }

  componentDidMount() {
    this.loadEvents();
  }

  loadEvents = async () => {
    this.setState({ loading: true, error: null, selectedRows: [] });
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getIndexSheet`);

      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to load events');
      }

      const rowData = (res.data.rows || []).map(row => ({
        sn:        row.serialNumber,
        name:      row.eventName,
        createdOn: row.createdOn,
        fileId:    row.fileId,
        qrCodeUrl: row.qrCodeUrl,
      }));

      this.setState({ rowData, loading: false });
    } catch (err) {
      this.setState({ error: err.message || 'Failed to load events', loading: false });
    }
  };

  handleSelectionChanged = () => {
    const selected = this.gridRef.current?.api?.getSelectedRows() || [];
    this.setState({ selectedRows: selected, deleteError: null, deleteSuccess: false });
  };

  handleDeleteClick = () => {
    this.setState({ confirmDelete: true });
  };

  handleCancelDelete = () => {
    this.setState({ confirmDelete: false });
  };

  handleConfirmDelete = async () => {
    const { selectedRows } = this.state;
    if (!selectedRows.length) return;

    this.setState({ deleting: true, deleteError: null, confirmDelete: false });

    const errors = [];

    for (const event of selectedRows) {
      try {
        // Step 1: Delete the Drive spreadsheet file
        if (event.fileId) {
          const deleteResult = await axios.post(`${BACKEND_URL}/googleDrive/deleteEvent`, {
            fileId: event.fileId,
          });
          if (!deleteResult.data.success) {
            errors.push(`"${event.name}": ${deleteResult.data.error || 'Failed to delete file'}`);
            continue;
          }
        }

        // Step 1b: Delete the QR code file from Drive (extract file ID from URL)
        if (event.qrCodeUrl) {
          const qrMatch = event.qrCodeUrl.match(/[-\w]{25,}/);
          if (qrMatch) {
            try {
              await axios.post(`${BACKEND_URL}/googleDrive/deleteEvent`, { fileId: qrMatch[0] });
            } catch (e) {
              console.warn('[DeleteEventForm] Could not delete QR code file:', e.message);
            }
          }
        }

        // Step 2: Delete master sheet row
        try {
          const masterData = await axios.post(`${BACKEND_URL}/googleDrive/getIndexSheet`);
          if (masterData.data.success) {
            const rows = masterData.data.rows || masterData.data.data || [];
            const eventRowIndex = rows.findIndex((row) => {
              if (row && typeof row === 'object' && !Array.isArray(row)) {
                return String(row.eventName || '').trim() === event.name.trim();
              }
              return row && row[1] && row[1].toString().trim() === event.name.trim();
            });
            if (eventRowIndex !== -1) {
              await axios.post(`${BACKEND_URL}/googleDrive/deleteEventEntry`, {
                spreadsheetId: MASTER_SHEET_ID,
                rowIndex: eventRowIndex,
                eventName: event.name,
              });
            }
          }
        } catch (e) {
          console.warn('[DeleteEventForm] Could not delete master sheet entry:', e.message);
        }
      } catch (err) {
        errors.push(`"${event.name}": ${err.message}`);
      }
    }

    if (errors.length) {
      this.setState({ deleting: false, deleteError: errors.join('\n'), selectedRows: [] });
    } else {
      const deletedNames = new Set(selectedRows.map(e => e.name));
      this.setState(prev => ({
        deleting: false,
        deleteSuccess: true,
        selectedRows: [],
        rowData: prev.rowData.filter(r => !deletedNames.has(r.name)),
      }));
      setTimeout(() => this.setState({ deleteSuccess: false }), 2000);
    }
  };

  render() {
    const { rowData, loading, error, selectedRows, deleting, deleteError, deleteSuccess, confirmDelete } = this.state;

    return (
      <div className="fft-participants-form">
        <div className="fft-participants-section">
          <div className="fft-participants-section-header">
            <h3 className="fft-participants-section-title" style={{ color: '#d32f2f' }}>Delete FFT Events</h3>
            <hr style={{ margin: '12px 0' }} />
            <div className="fft-participants-section-desc" style={{ marginBottom: '16px', color: '#555', fontSize: '1em' }}>
              Select events to delete by clicking their rows or using the checkbox column. Click the checkbox header to select all.
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#ffebee', border: '1px solid #ef5350', borderRadius: 8, marginBottom: 16, color: '#c62828', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {deleteError && (
            <div style={{ padding: '12px 16px', backgroundColor: '#ffebee', border: '1px solid #ef5350', borderRadius: 8, marginBottom: 16, color: '#c62828', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
              {deleteError}
            </div>
          )}

          {deleteSuccess && (
            <div style={{ padding: '12px 16px', backgroundColor: '#e8f5e9', border: '1px solid #66bb6a', borderRadius: 8, marginBottom: 16, color: '#2e7d32', fontSize: '0.9rem' }}>
              ✓ Event(s) deleted successfully!
            </div>
          )}

          {!loading && rowData.length === 0 && !error && (
            <p style={{ color: '#888', padding: '16px 0' }}>No events found.</p>
          )}

          {!loading && rowData.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                type="button"
                disabled={deleting}
                onClick={this.handleDeleteClick}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: '#2e7d32',
                  border: '1.5px solid #2e7d32',
                  borderRadius: 6,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  width: 'fit-content',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}

          {!loading && rowData.length > 0 && (
            <div className="grid-container fft-upload-grid" style={{ width: '100%', height: 420, marginLeft: 0, marginBottom: 16 }}>
              <AgGridReact
                ref={this.gridRef}
                columnDefs={this.columnDefs}
                rowData={rowData}
                defaultColDef={this.defaultColDef}
                rowSelection={{ mode: 'multiRow', checkboxes: false, headerCheckbox: false, enableClickSelection: false }}
                onRowClicked={(e) => { if (e.event.target.type !== 'checkbox') e.node.setSelected(!e.node.isSelected()); }}
                onSelectionChanged={this.handleSelectionChanged}
                domLayout="normal"
                pagination={true}
                paginationPageSize={rowData.length}
                paginationPageSizeSelector={[10, 20, 50, 100, rowData.length]}
                suppressCellFocus={true}
              />
            </div>
          )}


        </div>

        {/* Confirmation Modal */}
        {confirmDelete && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12, color: '#d32f2f' }}>⚠️</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 12, color: '#333' }}>Confirm Delete</h3>
              <p style={{ color: '#666', marginBottom: 8, fontSize: '0.95rem' }}>
                You are about to permanently delete <strong>{selectedRows.length} event{selectedRows.length > 1 ? 's' : ''}</strong>:
              </p>
              <ul style={{ textAlign: 'left', marginBottom: 20, paddingLeft: 20, color: '#444', fontSize: '0.9rem' }}>
                {selectedRows.map(e => <li key={e.fileId}>{e.name}</li>)}
              </ul>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button type="button" onClick={this.handleCancelDelete} style={{ padding: '10px 20px', backgroundColor: '#f0f0f0', color: '#333', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="button" onClick={this.handleConfirmDelete} disabled={deleting} style={{ padding: '10px 20px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: 6, cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.95rem', fontWeight: 600, opacity: deleting ? 0.6 : 1 }}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <LoadingModal visible={loading} message="Loading events..." />
      </div>
    );
  }
}

export default DeleteEventForm;


