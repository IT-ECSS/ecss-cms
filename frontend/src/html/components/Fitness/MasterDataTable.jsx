import React, { Component } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import '../../../css/ag-grid-custom-theme.css';
import '../../../css/fftStaff.css';
import ecssLogoUrl from './En_logo_Final_Large_RGB.png';

ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

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

  exportXlsx = async () => {
    const { rowData } = this.state;
    const { event } = this.props;
    if (!rowData.length) return;

    const eventName = event?.name || 'event';
    const wb = new ExcelJS.Workbook();

    // Load ECSS logo from local asset
    let logoId = null;
    try {
      const r = await fetch(ecssLogoUrl);
      const buf = await r.arrayBuffer();
      const uint8 = new Uint8Array(buf);
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < uint8.length; i += chunk) {
        binary += String.fromCharCode(...uint8.subarray(i, Math.min(i + chunk, uint8.length)));
      }
      const base64 = btoa(binary);
      logoId = wb.addImage({ base64, extension: 'png' });
    } catch (e) { /* logo unavailable, skip */ }

    const EXPORT_COLS = [
      { field: 'Participant Number', header: 'Participant Number' },
      { field: 'Name',               header: 'Name' },
      { field: 'Phone Number',       header: 'Phone Number' },
      { field: '__timeSlot__',       header: 'Time Slot' },
      { field: 'Date of test',       header: 'Date of test' },
      { field: '__signature__',      header: 'Signature' },
    ];

    // Group rows by Start Time
    const groups = {};
    rowData.forEach(row => {
      const start = String(row['Start Time'] || 'Unknown').trim();
      const end = String(row['End Time'] || '').trim();
      const key = end ? `${start}|||${end}` : start;
      if (!groups[key]) groups[key] = { start, end, rows: [] };
      groups[key].rows.push(row);
    });

    Object.entries(groups).forEach(([, { start, end, rows }], idx) => {
      const slotLabel = `${start} - ${end}`;
      // Use modifier letter colon ꞉ (U+A789) — looks like : but allowed in sheet names
      const safeStart = start.replace(/:/g, '\ua789');
      const safeEnd = end.replace(/:/g, '\ua789');
      const rawName = `Time Slot ${idx + 1}\ua789 ${safeStart}-${safeEnd}`;
      const sheetName = rawName.substring(0, 31);
      const ws = wb.addWorksheet(sheetName);

      const numCols = EXPORT_COLS.length;
      const lastCol = String.fromCharCode(64 + numCols);

      // Precompute all column widths so logo can be centered accurately
      const colWidths = EXPORT_COLS.map((c, i) => {
        if (c.field === '__signature__') return 40;
        const headerW = (c.header || '').length * (22 / 11);
        let maxLen = 0;
        rows.forEach(row => {
          const val = c.field === '__timeSlot__'
            ? (() => { const s = String(row['Start Time'] || '').trim(), e = String(row['End Time'] || '').trim(); return s && e ? `${s} - ${e}` : s || e; })()
            : String(row[c.field] ?? '');
          if (val.length > maxLen) maxLen = val.length;
        });
        let w = Math.max(headerW, maxLen * (33 / 11)) + 4;
        if (i === 0 || i === 1) w = Math.max(w, 14);
        return w;
      });

      // Row 1: single merged cell — logo floats left, text centered across full width
      ws.addRow(EXPORT_COLS.map(() => ''));
      ws.mergeCells(`A1:${lastCol}1`);
      ws.getRow(1).height = 75;

      // Apply all column widths before placing the image
      colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

      const infoCell = ws.getCell('A1');
      infoCell.value = `${eventName} (Attendance)\n${slotLabel}`;
      infoCell.font = { bold: true, size: 22 };

      if (logoId !== null) {
        // Fixed position: right 7.04", top 0.19" (as measured in Excel)
        // Convert inches → fractional col: 1" = 96px, 1 char unit ≈ 7px
        const pxPerChar = 7;
        const targetPx = 7.04 * 96; // 675.84px from left edge
        let logoTlCol = 0;
        let remPx = targetPx;
        for (let i = 0; i < colWidths.length; i++) {
          const colPx = colWidths[i] * pxPerChar;
          if (remPx <= colPx) { logoTlCol = i + remPx / colPx; break; }
          remPx -= colPx;
          logoTlCol = i + 1;
        }
        // Convert inches → fractional row: row height 75pt = 75/72 inches
        const logoTlRow = 0.19 / (75 / 72); // ≈ 0.182

        // Text indent: starts right after logo (logo ends at 7.04" + 85px wide)
        const textStartPx = targetPx + 85 + 7; // 7px gap
        const indentUnits = Math.round(textStartPx / pxPerChar);
        infoCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: indentUnits };

        ws.addImage(logoId, {
          tl: { col: logoTlCol, row: logoTlRow },
          ext: { width: 85, height: 87 },
          editAs: 'oneCell',
        });
      } else {
        infoCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }

      // Column headers row
      const colHeaderRow = ws.addRow(EXPORT_COLS.map(c => c.header));
      colHeaderRow.height = 30;
      colHeaderRow.eachCell(cell => {
        cell.font = { bold: true, size: 22 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Data rows
      rows.forEach(row => {
        const dataRow = ws.addRow(EXPORT_COLS.map(c => {
          if (c.field === '__timeSlot__') {
            const s = String(row['Start Time'] || '').trim();
            const e = String(row['End Time'] || '').trim();
            return s && e ? `${s} - ${e}` : s || e;
          }
          if (c.field === '__signature__') return '';
          return row[c.field] ?? '';
        }));
        dataRow.height = 40;
        dataRow.eachCell(cell => {
          cell.font = { bold: false, size: 18 };
          cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
        });
      });

      // Apply outer thick border and inner thin border to all cells
      const totalRows = 2 + rows.length; // header row + col header row + data rows
      for (let r = 1; r <= totalRows; r++) {
        for (let c = 1; c <= numCols; c++) {
          const cell = ws.getCell(r, c);
          const thin   = { style: 'thin' };
          const medium = { style: 'medium' };
          cell.border = {
            top:    r === 1          ? medium : thin,
            bottom: r === totalRows  ? medium : thin,
            left:   c === 1          ? medium : thin,
            right:  c === numCols    ? medium : thin,
          };
        }
      }
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${eventName} Master Data.xlsx`);
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
      const HIDDEN_FROM = ['Age', 'Height', 'Weight', 'BMI', 'Date of test',
        '30 secs Sit & Stand', '30 secs Dumbbell Curl', '2 min On-the-spot Marching',
        'Sit & Reach', 'Back Stretching', '2.44m Speed Walk', 'Grip test',
        'Improvements', 'Remarks', 'DD', 'MM', 'YYYY', 'Start Time', 'End Time'];
      const COL_WIDTHS = {
        'Participant Number': 250,
        'Name': 350,
        'Phone Number': 200,
        'Gender': 150,
        'Date of Birth': 250,
        'Time Slot': 300,
      };
      const columnDefs = Object.keys(raw[0])
        .filter(key => !HIDDEN_FROM.includes(key))
        .map(key => ({
          field: key,
          headerName: key,
          sortable: true,
          width: COL_WIDTHS[key],
        }));

      // Insert Date of Birth column after Gender
      const genderIdx = columnDefs.findIndex(c => c.field === 'Gender');
      const dobCol = {
        headerName: 'Date of Birth',
        field: 'Date of Birth',
        width: COL_WIDTHS['Date of Birth'],
        sortable: true,
        valueGetter: params => {
          const dd = String(params.data?.DD || '').trim().padStart(2, '0');
          const mm = String(params.data?.MM || '').trim().padStart(2, '0');
          const yyyy = String(params.data?.YYYY || '').trim();
          return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : '';
        },
      };
      if (genderIdx !== -1) {
        columnDefs.splice(genderIdx + 1, 0, dobCol);
      } else {
        columnDefs.push(dobCol);
      }

      // Insert Time Slot column after Date of Birth
      const dobIdx = columnDefs.findIndex(c => c.field === 'Date of Birth');
      const timeSlotCol = {
        headerName: 'Time Slot',
        field: 'Time Slot',
        width: COL_WIDTHS['Time Slot'],
        sortable: true,
        valueGetter: params => {
          const start = String(params.data?.['Start Time'] || '').trim();
          const end = String(params.data?.['End Time'] || '').trim();
          return start && end ? `${start} - ${end}` : start || end;
        },
      };
      if (dobIdx !== -1) {
        columnDefs.splice(dobIdx + 1, 0, timeSlotCol);
      } else {
        columnDefs.push(timeSlotCol);
      }

      this.setState({ loading: false, rowData: raw, columnDefs });
    } catch (err) {
      this.setState({ loading: false, error: 'Failed to load data. Please try again.' });
    }
  };

  render() {
    const { event } = this.props;
    const { rowData, columnDefs, loading, error } = this.state;

    return (
      <div className="fft-participants-section">
        <div className="fft-participants-section-header">
          <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#212121', margin: 0, whiteSpace: 'nowrap' }}>Access Master Data (View Only)</h3>
          <hr style={{ margin: '12px 0' }} />
          <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1.5em' }}>
            Viewing read-only participant data for this event.
          </div>
        </div>

        {loading && <p style={{ color: '#555', padding: '16px 0' }}>Loading data…</p>}
        {error   && <p style={{ color: '#d32f2f', padding: '16px 0' }}>{error}</p>}

        {!loading && !error && rowData.length === 0 && (
          <p style={{ color: '#888', padding: '16px 0' }}>No data found for this event.</p>
        )}

        <div style={{ width: 'fit-content', marginLeft: 'auto', marginBottom: '8px' }}>
          <button
            onClick={this.exportXlsx}
            style={{
              padding: '8px 18px',
              backgroundColor: 'transparent',
              color: '#2e7d32',
              border: '3px solid #2e7d32',
              borderRadius: '4px',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Export
          </button>
        </div>

        {!loading && rowData.length > 0 && (
          <div
            className="grid-container fft-upload-grid"
            style={{ width: '100%', maxWidth: '100%', height: '500px', marginLeft: 0 }}
          >
            <AgGridReact
              ref={this.gridRef}
              columnDefs={columnDefs}
              rowData={rowData}
              domLayout="normal"
              pagination={rowData.length}
              paginationPageSize={25, 50, 75, 100, rowData.length}
              suppressCellFocus={true}
            />
          </div>
        )}
      </div>
    );
  }
}

export default MasterDataTable;
