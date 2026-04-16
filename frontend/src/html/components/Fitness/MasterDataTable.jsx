import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import * as XLSX from 'xlsx';
import LoadingModal from '../Common/LoadingModal';
import '../../../css/ag-grid-custom-theme.css';
import '../../../css/fftStaff.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

// Cell renderer: Registration Link → opens URL in new tab
class LinkCellRenderer extends Component {
  render() {
    const value = this.props.value;
    if (!value) return <span style={{ color: '#aaa' }}>—</span>;
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#1a73e8', textDecoration: 'underline' }}
      >
        <i className="fas fa-external-link-alt" style={{ marginRight: 6 }}></i>
        Open Link
      </a>
    );
  }
}

// Cell renderer: QR Code → opens image/URL in new tab
class QRLinkCellRenderer extends Component {
  render() {
    const value = this.props.value;
    if (!value) return <span style={{ color: '#aaa' }}>—</span>;
    const isUrl = value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image');
    if (isUrl) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1a73e8', textDecoration: 'underline' }}
        >
          <i className="fas fa-qrcode" style={{ marginRight: 6 }}></i>
          View QR
        </a>
      );
    }
    return (
      <span
        title={value}
        style={{ color: '#555', fontSize: '0.82rem', wordBreak: 'break-all' }}
      >
        {value}
      </span>
    );
  }
}

class MasterDataTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rowData: [],
      columnDefs: [],
      loading: false,
      error: null,
    };
    this.gridRef = React.createRef();
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.event?.id !== this.props.event?.id) {
      this.fetchData();
    }
  }

  exportToExcel = () => {
    const { event } = this.props;
    const { rowData, columnDefs } = this.state;
    const gridApi = this.gridRef.current?.api;
    const exportRows = [];

    if (gridApi) {
      gridApi.forEachNodeAfterFilterAndSort(node => {
        if (node.data) exportRows.push(node.data);
      });
    }

    const rowsToExport = exportRows.length > 0 ? exportRows : rowData;
    if (!rowsToExport.length || !columnDefs.length) return;

    const safeFilename = (name) => name
      .replace(/[\/\?%*:|"<>]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    const timeSlotKey = (row) => {
      const start = String(row['Start Time'] || row['start time'] || '').trim();
      const end = String(row['End Time'] || row['end time'] || '').trim();
      if (start && end) {
        return `${start} - ${end}`;
      }
      if (start) {
        return `${start} -`;
      }
      if (end) {
        return `- ${end}`;
      }
      return 'Unspecified Slot';
    };

    const headers = columnDefs.map(col => col.headerName || col.field);
    const slotOrder = [];
    const groupedRows = rowsToExport.reduce((groups, row) => {
      const slot = timeSlotKey(row);
      if (!groups[slot]) {
        groups[slot] = [];
        slotOrder.push(slot);
      }
      const exportedRow = {};
      columnDefs.forEach(col => {
        const key = col.field;
        const header = col.headerName || key;
        exportedRow[header] = row[key] != null ? row[key] : '';
      });
      groups[slot].push(exportedRow);
      return groups;
    }, {});

    const safeSheetName = (name, usedNames = new Set()) => {
      const clean = String(name)
        .replace(/[\:\/\\\?\*\[\]]/g, '-')
        .replace(/\s+/g, ' ')
        .trim() || 'Sheet';
      let finalName = clean.slice(0, 31);
      let suffix = 1;
      while (usedNames.has(finalName)) {
        suffix += 1;
        const base = clean.slice(0, Math.max(0, 31 - (` (${suffix})`.length)));
        finalName = `${base} (${suffix})`;
      }
      usedNames.add(finalName);
      return finalName;
    };

    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set();
    slotOrder.forEach((slot, index) => {
      const label = `Slot ${index + 1}: ${slot}`;
      const sheetName = safeSheetName(label, usedSheetNames);
      const worksheet = XLSX.utils.json_to_sheet(groupedRows[slot], { header: headers });
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const eventName = event?.name ? safeFilename(event.name) : 'Master Data';
    const filename = `${eventName} Master Data.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  fetchData = async () => {
    const { event } = this.props;
    const fileId = event?.id || '';
    if (!fileId) return;

    this.setState({ loading: true, error: null, rowData: [], columnDefs: [] });
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getParticipants`, { fileId });
      const raw = Array.isArray(res.data) ? res.data : [];
      if (raw.length === 0) {
        this.setState({ loading: false, rowData: [], columnDefs: [] });
        return;
      }
      // Combine DD / MM / YYYY columns into a single Date Of Birth column
      const dobDD   = Object.keys(raw[0]).find(k => k.toLowerCase().trim() === 'dd')   || '';
      const dobMM   = Object.keys(raw[0]).find(k => k.toLowerCase().trim() === 'mm')   || '';
      const dobYYYY = Object.keys(raw[0]).find(k => k.toLowerCase().trim() === 'yyyy') || '';
      const processedRaw = (dobDD && dobMM && dobYYYY)
        ? raw.map(row => ({
            ...row,
            'Date Of Birth': [row[dobDD], row[dobMM], row[dobYYYY]].every(v => v)
              ? `${row[dobDD]}/${row[dobMM]}/${row[dobYYYY]}`
              : '',
          }))
        : raw;

      // ── Column widths – set each manually here ──────────────────────────────
      const columnDefs = [
        { field: 'Participant Number', headerName: 'Participant Number', width: 250 },
        { field: 'Name',               headerName: 'Name',               width: 200},
        { field: 'Phone Number',       headerName: 'Phone Number',       width: 200 },
        { field: 'Date Of Birth',      headerName: 'Date Of Birth',      width: 200 },
        { field: 'Start Time',         headerName: 'Start Time',         width: 150 },
        { field: 'End Time',           headerName: 'End Time',           width: 150 },
      ];
      this.setState({ loading: false, rowData: processedRaw, columnDefs });
    } catch (err) {
      this.setState({ loading: false, error: 'Failed to load data. Please try again.' });
    }
  };

  render() {
    const { event } = this.props;
    const { rowData, columnDefs, loading, error } = this.state;

    return (
      <>
        <div className="fft-participants-section">
          <div className="fft-participants-section-header">
            <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#212121', margin: 0, whiteSpace: 'nowrap' }}>Access Master Data (View Only)</h3>
            <hr style={{ margin: '12px 0' }} />
            <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
              Viewing read-only participant data. No edits can be made from this view.
            </div>
          </div>

          {loading && <p style={{ color: '#555', padding: '16px 0' }}>Loading data…</p>}
          {error   && <p style={{ color: '#d32f2f', padding: '16px 0' }}>{error}</p>}

          {!loading && !error && rowData.length === 0 && (
            <p style={{ color: '#888', padding: '16px 0' }}>No data found for this event.</p>
          )}

          {!loading && rowData.length > 0 && (
            <>
              <div
                className="grid-container fft-upload-grid"
                style={{ width: '100%', maxWidth: '100%', height: '500px', marginLeft: 0 }}
              >
                <AgGridReact
                  ref={this.gridRef}
                  columnDefs={columnDefs}
                  rowData={rowData}
                  domLayout="normal"
                  pagination={true}
                  paginationPageSize={rowData.length}
                  paginationPageSizeSelector={[25, 50, 75, 100, rowData.length]}
                  defaultColDef={{ sortable: true, resizable: true, minWidth: 80 }}
                  suppressCellFocus={true}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    color: '#43a047',
                    border: '3px solid #43a047',
                    borderRadius: 6,
                    padding: '9px 15px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.94rem',
                    width: 'fit-content',
                    display: 'inline-flex',
                    justifyContent: 'center',
                    textAlign: 'center',
                  }}
                  onClick={this.exportToExcel}
                >
                  Export Data
                </button>
              </div>
            </>
          )}
        </div>
        <LoadingModal visible={loading} message="Loading data..." />
      </>
    );
  }
}

export default MasterDataTable;
