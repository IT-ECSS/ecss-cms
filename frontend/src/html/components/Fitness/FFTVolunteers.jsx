import React, { Component } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import '../../../css/fftVolunteers.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

// Station definitions with their field mappings
const STATIONS = [
  {
    id: 'measurement',
    num: '📏',
    title: 'Measurement Station',
    titleZh: '测量站',
    icon: 'fa-ruler-combined',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    fields: [
      { key: 'height', label: 'Height (cm)', labelZh: '身高', type: 'number', placeholder: 'e.g. 165' },
      { key: 'weight', label: 'Weight (kg)', labelZh: '体重', type: 'number', placeholder: 'e.g. 60' },
    ],
  },
  {
    id: 'station1',
    num: '1',
    title: '30-Sec Sit and Stand',
    titleZh: '30 秒坐立测验',
    icon: 'fa-chair',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'sitStand', label: 'Number of reps', labelZh: '次数', type: 'number', placeholder: 'e.g. 12' },
    ],
  },
  {
    id: 'station2',
    num: '2',
    title: '30-Sec Arm Curl',
    titleZh: '30 秒手臂卷起',
    icon: 'fa-dumbbell',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'armCurl', label: 'Number of reps', labelZh: '次数', type: 'number', placeholder: 'e.g. 15' },
    ],
  },
  {
    id: 'station3',
    num: '3',
    title: '2-Min On-the-spot Marching',
    titleZh: '2 分钟抬膝测验',
    icon: 'fa-walking',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'march', label: 'Number of steps', labelZh: '步数', type: 'number', placeholder: 'e.g. 80' },
    ],
  },
  {
    id: 'station4',
    num: '4',
    title: 'Sit and Reach Test',
    titleZh: '坐椅体前弯',
    icon: 'fa-arrows-alt-h',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'sitReach', label: 'Distance (cm)', labelZh: '距离', type: 'text', placeholder: 'e.g. L+5 / R+3' },
    ],
    note: '左 L / 右 R (直腿 Straight leg)',
  },
  {
    id: 'station5',
    num: '5',
    title: 'Back Stretching Test',
    titleZh: '抓背测验',
    icon: 'fa-hand-paper',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'backStretch', label: 'Distance (cm)', labelZh: '距离', type: 'text', placeholder: 'e.g. L-2 / R+1' },
    ],
    note: '左 L / 右 R (上面 Hand on top)',
  },
  {
    id: 'station6',
    num: '6',
    title: '2.44m Speed Walk',
    titleZh: '2.44 公尺起身绕物测验',
    icon: 'fa-stopwatch',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'speedWalk', label: 'Time (seconds)', labelZh: '时间（秒）', type: 'number', placeholder: 'e.g. 5.2' },
    ],
  },
  {
    id: 'station7',
    num: '7',
    title: 'Hand Grip Test',
    titleZh: '握力测试',
    icon: 'fa-fist-raised',
    color: '#2563eb',
    bg: '#eff6ff',
    fields: [
      { key: 'gripTest', label: 'Grip strength (kg)', labelZh: '握力', type: 'text', placeholder: 'e.g. L25 / R28' },
    ],
    note: '左 L / 右 R (手 Hand)',
  },
];

class FFTVolunteers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Single-page flow: dropdown → QR scanner → input fields
      selectedStation: null,
      // QR scanner
      scannerActive: false,
      scannerReady: false,
      scanError: null,
      // Participant data
      entryNumber: null,
      participantData: null,
      loadingParticipant: false,
      // Form data
      formData: {},
      // Submission
      submitting: false,
      submitSuccess: false,
      submitError: null,
      // Active file
      activeFile: null,
    };
    this.html5QrCode = null;
  }

  componentDidMount() {
    // Fetch the active file from backend
    axios.get(`${BACKEND_URL}/googleDrive/activeFile`)
      .then((res) => {
        if (res.data.success && res.data.file) {
          this.setState({ activeFile: res.data.file });
        }
      })
      .catch((err) => console.error('Failed to fetch active file:', err.message));
  }

  componentWillUnmount() {
    this.stopScanner();
  }

  // ── Station Selection (dropdown) ──
  handleSelectStation = (e) => {
    const stationId = e.target.value;
    if (!stationId) {
      this.stopScanner();
      this.setState({
        selectedStation: null,
        scannerActive: false,
        formData: {},
        entryNumber: null,
        participantData: null,
        submitSuccess: false,
        submitError: null,
        scanError: null,
      });
      return;
    }
    const station = STATIONS.find((s) => s.id === stationId);
    this.stopScanner();
    this.setState({
      selectedStation: station,
      scannerActive: true,
      formData: {},
      entryNumber: null,
      participantData: null,
      submitSuccess: false,
      submitError: null,
      scanError: null,
    }, () => {
      setTimeout(() => this.startScanner(), 300);
    });
  };

  // ── QR Scanner ──
  startScanner = () => {
    const scannerElement = document.getElementById('fft-vol-qr-reader');
    if (!scannerElement) return;

    this.html5QrCode = new Html5Qrcode('fft-vol-qr-reader');
    this.html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        this.handleQRScan(decodedText);
      },
      () => { /* ignore errors during scanning */ }
    ).then(() => {
      this.setState({ scannerReady: true, scanError: null });
    }).catch((err) => {
      console.error('Scanner start error:', err);
      this.setState({ scanError: 'Could not access camera. Please allow camera permissions.' });
    });
  };

  stopScanner = () => {
    if (this.html5QrCode) {
      this.html5QrCode.stop().then(() => {
        this.html5QrCode.clear();
        this.html5QrCode = null;
      }).catch(() => {
        this.html5QrCode = null;
      });
    }
  };

  handleQRScan = (decodedText) => {
    // QR code contains the entry number
    const entryNumber = parseInt(decodedText, 10);
    if (isNaN(entryNumber)) {
      this.setState({ scanError: `Invalid QR code: "${decodedText}"` });
      return;
    }

    this.stopScanner();
    this.setState({ entryNumber, loadingParticipant: true, scanError: null });

    // Fetch participant data
    const fileId = (this.props.selectedFile && this.props.selectedFile.id) ||
                   (this.state.activeFile && this.state.activeFile.id);
    if (!fileId) {
      this.setState({ loadingParticipant: false, scanError: 'No active file selected.' });
      return;
    }

    axios.get(`${BACKEND_URL}/googleDrive/getRow`, { params: { fileId, entryNumber } })
      .then((res) => {
        if (res.data.success) {
          // Pre-fill formData with existing values for this station's fields
          const station = this.state.selectedStation;
          const existingData = {};
          station.fields.forEach((f) => {
            existingData[f.key] = res.data.data[f.key] || '';
          });
          this.setState({
            participantData: res.data.data,
            formData: existingData,
            loadingParticipant: false,
            scannerActive: false,
          });
        } else {
          this.setState({ loadingParticipant: false, scanError: 'Could not find participant data.' });
        }
      })
      .catch((err) => {
        console.error('Error fetching participant data:', err.message);
        this.setState({ loadingParticipant: false, scanError: 'Error loading participant info.' });
      });
  };

  // ── Form Input ──
  handleFieldChange = (key, value) => {
    this.setState((prev) => ({
      formData: { ...prev.formData, [key]: value },
    }));
  };

  handleSubmit = () => {
    const { selectedStation, entryNumber, formData } = this.state;
    const fileId = (this.props.selectedFile && this.props.selectedFile.id) ||
                   (this.state.activeFile && this.state.activeFile.id);

    if (!fileId || entryNumber == null) return;

    // Build updates — for measurement station, also compute BMI
    const updates = { ...formData };
    if (selectedStation.id === 'measurement' && updates.height && updates.weight) {
      const h = parseFloat(updates.height) / 100; // cm → m
      const w = parseFloat(updates.weight);
      if (h > 0 && w > 0) {
        updates.bmi = (w / (h * h)).toFixed(1);
      }
    }

    this.setState({ submitting: true, submitError: null });

    axios.post(`${BACKEND_URL}/googleDrive/updateRow`, { fileId, entryNumber, updates })
      .then((res) => {
        if (res.data.success) {
          this.setState({ submitting: false, submitSuccess: true });
        } else {
          this.setState({ submitting: false, submitError: res.data.error || 'Failed to update.' });
        }
      })
      .catch((err) => {
        console.error('Error updating row:', err.message);
        this.setState({ submitting: false, submitError: 'Network error. Please try again.' });
      });
  };

  // ── Navigation ──
  handleBackToStations = () => {
    this.stopScanner();
    this.setState({
      selectedStation: null,
      scannerActive: false,
      entryNumber: null,
      participantData: null,
      formData: {},
      submitSuccess: false,
      submitError: null,
      scanError: null,
    });
  };

  handleScanAnother = () => {
    this.setState({
      scannerActive: true,
      entryNumber: null,
      participantData: null,
      formData: {},
      submitSuccess: false,
      submitError: null,
      scanError: null,
    }, () => {
      setTimeout(() => this.startScanner(), 300);
    });
  };

  // ── Render ──
  render() {
    const { onBack, selectedFile } = this.props;
    const { selectedStation, scannerActive, scanError, loadingParticipant, participantData,
            formData, submitting, submitSuccess, submitError, entryNumber, activeFile } = this.state;

    const hasFile = (selectedFile && selectedFile.id) || (activeFile && activeFile.id);
    const fileName = (selectedFile && selectedFile.name) || (activeFile && activeFile.name) || null;

    return (
      <div className="fft-volunteers-wrapper">
        {/* Header with back button */}
        <div className="fft-volunteers-header">
          <div className="fft-volunteers-header-top-row">
            <button className="fft-volunteers-icon-btn" onClick={onBack} title="Home">
              <i className="fas fa-home"></i>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="fft-volunteers-form">

          {/* ──── No active file warning ──── */}
          {!hasFile && (
            <div className="fft-volunteers-section fft-vol-no-file-banner">
              <div className="fft-vol-no-file-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3 className="fft-vol-no-file-title">No Active File Selected</h3>
              <p className="fft-vol-no-file-text">
                An admin needs to select a file first before volunteers can start recording data.
              </p>
              <button className="fft-volunteers-submit-btn" onClick={onBack} style={{ marginTop: '8px' }}>
                <i className="fas fa-arrow-left"></i>
                Go Back
              </button>
            </div>
          )}

          {/* ──── Active file indicator ──── */}
          {hasFile && fileName && (
            <div className="fft-vol-active-file-bar">
              <i className="fas fa-file-spreadsheet" style={{ marginRight: '8px', color: '#16a34a' }}></i>
              <span className="fft-vol-active-file-name">{fileName}</span>
            </div>
          )}

          {/* ──── Station Dropdown Section ──── */}
          {hasFile && (
            <>
            <div className="fft-volunteers-section">
              <div className="fft-volunteers-section-header">
                <span className="fft-volunteers-section-number">1</span>
                <h3 className="fft-volunteers-section-title">Select Station</h3>
              </div>
              <div className="fft-volunteers-field fft-volunteers-field--full">
                <label className="fft-volunteers-label">
                  <i className="fas fa-map-pin" style={{ marginRight: '6px', color: '#2c7be5' }}></i>
                  Station
                </label>
                <select
                  className="fft-volunteers-input fft-vol-select"
                  value={selectedStation ? selectedStation.id : ''}
                  onChange={this.handleSelectStation}
                >
                  <option value="">-- Choose a station --</option>
                  {STATIONS.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.id === 'measurement' ? '📏' : `${station.num}.`} {station.title} ({station.titleZh})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ──── QR Code Scanner Section ──── */}
            {selectedStation && scannerActive && (
              <div className="fft-volunteers-section">
                <div className="fft-volunteers-section-header">
                  <span className="fft-volunteers-section-number">2</span>
                  <h3 className="fft-volunteers-section-title">Scan Participant QR</h3>
                </div>

                {/* Station badge */}
                <div className="fft-vol-station-badge" style={{ background: selectedStation.bg, color: selectedStation.color }}>
                  <i className={`fas ${selectedStation.icon}`}></i>
                  {selectedStation.title}
                </div>

                <p className="fft-vol-scan-hint">Point camera at the participant's QR code</p>

                {/* QR reader container */}
                <div className="fft-vol-qr-container">
                  <div id="fft-vol-qr-reader" style={{ width: '100%' }}></div>
                  {loadingParticipant && (
                    <div className="fft-vol-qr-loading">
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '12px' }}></i>
                      <p>Loading participant data...</p>
                    </div>
                  )}
                </div>

                {scanError && (
                  <div className="fft-vol-error-msg">
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                    {scanError}
                  </div>
                )}

                {/* Manual entry fallback */}
                <div className="fft-vol-manual-entry">
                  <p className="fft-vol-manual-label">Or enter entry number manually:</p>
                  <div className="fft-vol-manual-row">
                    <input
                      type="number"
                      placeholder="Entry #"
                      id="fft-vol-manual-entry"
                      className="fft-volunteers-input fft-vol-manual-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          this.handleQRScan(e.target.value);
                        }
                      }}
                    />
                    <button
                      className="fft-vol-go-btn"
                      onClick={() => {
                        const val = document.getElementById('fft-vol-manual-entry').value;
                        if (val) this.handleQRScan(val);
                      }}
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ──── Participant Info + Data Input (shown after QR scan) ──── */}
            {selectedStation && participantData && (
              <>
                {/* Participant Info Card */}
                <div className="fft-volunteers-section fft-vol-participant-card">
                  <div className="fft-vol-participant-row">
                    <div className="fft-vol-participant-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="fft-vol-participant-info">
                      <div className="fft-vol-participant-name">
                        {participantData.name || participantData.chineseName || '—'}
                      </div>
                      {participantData.chineseName && participantData.name && (
                        <div className="fft-vol-participant-chinese">{participantData.chineseName}</div>
                      )}
                      <div className="fft-vol-participant-meta">
                        Entry #{entryNumber} &nbsp;·&nbsp; {participantData.gender || '—'} &nbsp;·&nbsp; Age: {participantData.age || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success state */}
                {submitSuccess && (
                  <div className="fft-volunteers-section fft-vol-success-card">
                    <div className="fft-vol-success-icon">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <h3 className="fft-vol-success-title">Results Submitted!</h3>
                    <p className="fft-vol-success-text">Data has been saved to the spreadsheet.</p>
                    <button className="fft-volunteers-submit-btn" onClick={this.handleScanAnother}>
                      <i className="fas fa-qrcode"></i>
                      Scan Next Participant
                    </button>
                  </div>
                )}

                {/* Input form (hidden after submit success) */}
                {!submitSuccess && (
                  <div className="fft-volunteers-section">
                    <div className="fft-volunteers-section-header">
                      <span className="fft-volunteers-section-number">3</span>
                      <h3 className="fft-volunteers-section-title">
                        Enter Results — {selectedStation.title}
                      </h3>
                    </div>

                    {selectedStation.note && (
                      <div className="fft-vol-note-banner">
                        <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                        {selectedStation.note}
                      </div>
                    )}

                    <div className="fft-volunteers-form-grid">
                      {selectedStation.fields.map((field) => (
                        <div key={field.key} className="fft-volunteers-field fft-volunteers-field--full">
                          <label className="fft-volunteers-label">
                            {field.label} <span style={{ color: '#9e9e9e', fontWeight: 400 }}>({field.labelZh})</span>
                          </label>
                          <input
                            type={field.type}
                            step={field.type === 'number' ? 'any' : undefined}
                            value={formData[field.key] || ''}
                            placeholder={field.placeholder}
                            onChange={(e) => this.handleFieldChange(field.key, e.target.value)}
                            className="fft-volunteers-input"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Auto-computed BMI for measurement station */}
                    {selectedStation.id === 'measurement' && formData.height && formData.weight && (
                      <div className="fft-vol-bmi-display">
                        <span style={{ color: '#888' }}>BMI (auto):</span>{' '}
                        <strong style={{ color: '#16a34a' }}>
                          {(() => {
                            const h = parseFloat(formData.height) / 100;
                            const w = parseFloat(formData.weight);
                            return (h > 0 && w > 0) ? (w / (h * h)).toFixed(1) : '—';
                          })()}
                        </strong>
                      </div>
                    )}

                    {submitError && (
                      <div className="fft-vol-error-msg" style={{ marginTop: '16px' }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                        {submitError}
                      </div>
                    )}

                    <button
                      className="fft-volunteers-submit-btn"
                      onClick={this.handleSubmit}
                      disabled={submitting || selectedStation.fields.some((f) => !formData[f.key])}
                      style={{ marginTop: '20px' }}
                    >
                      {submitting ? (
                        <><i className="fas fa-spinner fa-spin"></i>Submitting...</>
                      ) : (
                        <><i className="fas fa-paper-plane"></i>Submit Results</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
            </>
          )}
        </div>
      </div>
    );
  }
}

export default FFTVolunteers;
