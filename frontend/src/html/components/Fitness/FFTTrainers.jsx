import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import '../../../css/fftTrainers.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

// Column mapping matching the spreadsheet structure (from getRow)
const COLUMN_MAP = [
  { key: 'name', label: 'Name', labelZh: '姓名' },
  { key: 'chineseName', label: 'Chinese Name', labelZh: '中文名' },
  { key: 'phoneNo', label: 'Phone Number', labelZh: '电话号码' },
  { key: 'gender', label: 'Gender', labelZh: '性别' },
  { key: 'dd', label: 'DD', labelZh: '日' },
  { key: 'mm', label: 'MM', labelZh: '月' },
  { key: 'yyyy', label: 'YYYY', labelZh: '年' },
  { key: 'age', label: 'Age', labelZh: '年龄' },
  { key: 'height', label: 'Height (cm)', labelZh: '身高' },
  { key: 'weight', label: 'Weight (kg)', labelZh: '体重' },
  { key: 'bmi', label: 'BMI', labelZh: 'BMI' },
  { key: 'testDate', label: 'Test Date', labelZh: '测试日期' },
  { key: 'sitStand', label: 'Sit & Stand', labelZh: '坐立' },
  { key: 'armCurl', label: 'Arm Curl', labelZh: '手臂卷起' },
  { key: 'march', label: 'March', labelZh: '抬膝' },
  { key: 'sitReach', label: 'Sit & Reach', labelZh: '坐姿前伸' },
  { key: 'backStretch', label: 'Back Stretch', labelZh: '背部伸展' },
  { key: 'speedWalk', label: 'Speed Walk', labelZh: '速走' },
  { key: 'gripTest', label: 'Grip Test', labelZh: '握力' },
  { key: 'improvements', label: 'Improvements', labelZh: '改进' },
  { key: 'remarks', label: 'Remarks', labelZh: '备注' },
  { key: 'sitStandRemarks', label: 'Sit & Stand Remarks', labelZh: '坐立备注' },
  { key: 'armCurlRemarks', label: 'Arm Curl Remarks', labelZh: '手臂卷起备注' },
  { key: 'marchRemarks', label: 'March Remarks', labelZh: '抬膝备注' },
  { key: 'sitReachRemarks', label: 'Sit & Reach Remarks', labelZh: '坐姿前伸备注' },
  { key: 'backStretchRemarks', label: 'Back Stretch Remarks', labelZh: '背部伸展备注' },
  { key: 'speedWalkRemarks', label: 'Speed Walk Remarks', labelZh: '速走备注' },
  { key: 'gripTestRemarks', label: 'Grip Test Remarks', labelZh: '握力备注' },
];



class FFTTrainers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeFile: null,
      loading: true,
      error: null,
      columns: [],
      rows: [],
      searchQuery: '',
    };
    this.gridRef = React.createRef();

    // AG Grid column definitions — matches Google Sheets columns only
    this.columnDefs = [
      { headerName: 'Name', field: 'name', width: 350, sortable: true, pinned: 'left',
        cellRenderer: (params) => {
          const name = params.data.name || '';
          const cn = params.data.chineseName || '';
          if (!cn) return name;
          return `<div style="line-height:1.3">${name}<br/><span style="color:#888;font-size:0.85em">${cn}</span></div>`;
        },
        valueGetter: (params) => {
          const name = params.data.name || '';
          const cn = params.data.chineseName || '';
          return cn ? `${name} ${cn}` : name;
        },
        autoHeight: true,
      },
      { headerName: 'Phone Number', field: 'phoneNo', width: 250},
      { headerName: 'Gender', field: 'gender', width: 150},
      { headerName: 'DD', field: 'dd', width: 100},
      { headerName: 'MM', field: 'mm', width: 100},
      { headerName: 'YYYY', field: 'yyyy', width: 100},
      { headerName: 'Age', field: 'age', width: 100},
      { headerName: 'Height (cm)', field: 'height', width: 200},
      { headerName: 'Weight (kg)', field: 'weight', width: 200},
      { headerName: 'BMI', field: 'bmi', width: 150},
      { headerName: 'Test Date', field: 'testDate', width: 200 },
      { headerName: '30 secs Sit & Stand', field: 'sitStand', width: 300},
      { headerName: '30 secs Arm Curl', field: 'armCurl', width: 300},
      { headerName: '2 min March on the spot', field: 'march', width: 300},
      { headerName: 'Sit & Reach', field: 'sitReach', width: 300},
      { headerName: 'Back Stretch', field: 'backStretch', width: 300},
      { headerName: '2.44m speed walk', field: 'speedWalk', width: 300},
      { headerName: 'Grip Test', field: 'gripTest', width: 300},
      { headerName: 'Improvements', field: 'improvements', width: 500},
      { headerName: 'Remarks', field: 'remarks', width: 500 },
      { headerName: 'Sit & Stand Remarks', field: 'sitStandRemarks', width: 300 },
      { headerName: 'Arm Curl Remarks', field: 'armCurlRemarks', width: 300 },
      { headerName: 'March Remarks', field: 'marchRemarks', width: 300 },
      { headerName: 'Sit & Reach Remarks', field: 'sitReachRemarks', width: 300 },
      { headerName: 'Back Stretch Remarks', field: 'backStretchRemarks', width: 300 },
      { headerName: 'Speed Walk Remarks', field: 'speedWalkRemarks', width: 300 },
      { headerName: 'Grip Test Remarks', field: 'gripTestRemarks', width: 300 },
    ];
  }

  componentDidMount() {
    this.fetchData();

    // Socket.IO: live updates
    this.socket = io(BACKEND_URL);
    this.socket.on('fftUpdate', (data) => {
      // Re-fetch spreadsheet data when any row is added/updated
      const { activeFile } = this.state;
      if (activeFile && activeFile.id) {
        this.loadSpreadsheet(activeFile.id);
      }
    });
    this.socket.on('fftActiveFile', (data) => {
      // Active file changed — update and reload
      if (data && data.file) {
        this.setState({ activeFile: data.file });
        this.loadSpreadsheet(data.file.id);
      }
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  fetchData = () => {
    this.setState({ loading: true, error: null });

    const fileFromProps = this.props.selectedFile;
    if (fileFromProps && fileFromProps.id) {
      this.setState({ activeFile: fileFromProps });
      this.loadSpreadsheet(fileFromProps.id);
    } else {
      axios.get(`${BACKEND_URL}/googleDrive/activeFile`)
        .then((res) => {
          if (res.data.success && res.data.file) {
            this.setState({ activeFile: res.data.file });
            this.loadSpreadsheet(res.data.file.id);
          } else {
            this.setState({ loading: false, error: 'no-file' });
          }
        })
        .catch(() => {
          this.setState({ loading: false, error: 'no-file' });
        });
    }
  };

  loadSpreadsheet = (fileId) => {
    axios.post(`${BACKEND_URL}/googleDrive/readSpreadsheet`, { fileId })
      .then((res) => {
        if (res.data.success) {
          const columns = res.data.columns || [];
          const rawData = res.data.data || [];

          const rows = rawData.map((row, idx) => {
            const obj = {};
            COLUMN_MAP.forEach((col, colIdx) => {
              obj[col.key] = row[colIdx] || '';
            });
            return obj;
          });

          this.setState({ columns, rows, loading: false });
        } else {
          this.setState({ loading: false, error: res.data.error || 'Failed to read data.' });
        }
      })
      .catch((err) => {
        console.error('Error reading spreadsheet:', err.message);
        this.setState({ loading: false, error: 'Network error loading data.' });
      });
  };

  applySearch = (rows) => {
    const query = this.state.searchQuery.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((r) => {
      const combined = `${r.name || ''} ${r.chineseName || ''}`.toLowerCase();
      return combined.includes(query) ||
        (r.phoneNo && r.phoneNo.includes(query));
    });
  };

  onGridReady = (params) => {
    this.gridApi = params.api;
  };

  getRowStyle = (params) => {
    if (params.node.rowIndex % 2 === 0) {
      return { background: '#fafbfd' };
    }
    return null;
  };

  render() {
    const { onBack } = this.props;
    const { activeFile, loading, error, rows, searchQuery } = this.state;

    const hasFile = activeFile && activeFile.id;

    // Apply search
    const filtered = this.applySearch(rows);

    return (
      <div className="fft-trainers-wrapper">
        {/* Header */}
        <div className="fft-trainers-header">
          <div className="fft-trainers-header-top-row">
            <button className="fft-trainers-icon-btn" onClick={onBack} title="Home">
              <i className="fas fa-home"></i>
            </button>
          </div>
        </div>

        <div className="fft-trainers-form">
          {/* No file state */}
          {!loading && error === 'no-file' && (
            <div className="fft-trainers-section fft-trainers-no-file">
              <div className="fft-trainers-no-file-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3 className="fft-trainers-no-file-title">No Active File Selected</h3>
              <p className="fft-trainers-no-file-text">
                An admin needs to select a file first before trainers can view data.
              </p>
              <button className="fft-trainers-submit-btn" onClick={onBack} style={{ marginTop: '8px' }}>
                <i className="fas fa-arrow-left"></i>
                Go Back
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="fft-trainers-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#2c7be5', marginBottom: '16px' }}></i>
              <p style={{ fontSize: '1.3rem', color: '#555' }}>Loading spreadsheet data...</p>
            </div>
          )}

          {/* Error state (non no-file) */}
          {!loading && error && error !== 'no-file' && (
            <div className="fft-trainers-section">
              <div className="fft-trainers-error-msg">
                <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                {error}
              </div>
              <button className="fft-trainers-submit-btn" onClick={this.fetchData} style={{ marginTop: '12px' }}>
                <i className="fas fa-redo"></i>
                Retry
              </button>
            </div>
          )}

          {/* Data loaded — AG Grid view */}
          {!loading && !error && hasFile && (
            <>
              {/* Active file bar */}
              {activeFile.name && (
                <div className="fft-trainers-active-file-bar">
                  <i className="fas fa-file-spreadsheet" style={{ marginRight: '8px', color: '#16a34a' }}></i>
                  <span className="fft-trainers-active-file-name">{activeFile.name}</span>
                </div>
              )}

              {/* Search row */}
              <div className="fft-trainers-controls-row">
                <div className="fft-trainers-search-field">
                  <i className="fas fa-search fft-trainers-field-icon"></i>
                  <input
                    type="text"
                    className="fft-trainers-input"
                    placeholder="Search by name, phone..."
                    value={searchQuery}
                    onChange={(e) => this.setState({ searchQuery: e.target.value })}
                  />
                  {searchQuery && (
                    <button
                      className="fft-trainers-field-clear"
                      onClick={() => this.setState({ searchQuery: '' })}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Result count */}
              <div className="fft-trainers-result-count">
                Showing {filtered.length} of {rows.length} participants
              </div>

              {/* AG Grid */}
              <div className="fft-trainers-grid-container">
                <AgGridReact
                  ref={this.gridRef}
                  rowData={filtered}
                  columnDefs={this.columnDefs}
                  onGridReady={this.onGridReady}
                  pagination={true}
                  paginationPageSize={filtered.length}
                  domLayout="normal"
                  suppressHorizontalScroll={false}
                  getRowStyle={this.getRowStyle}
                  overlayNoRowsTemplate='<span style="padding: 16px; font-size: 1.15rem; color: #888;">No participants found.</span>'
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
}

export default FFTTrainers;
