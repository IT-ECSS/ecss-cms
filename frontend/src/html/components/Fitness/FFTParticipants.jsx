import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { QRCodeCanvas } from 'qrcode.react';
import '../../../css/fftParticipants.css';
import SingPassButton from '../sub/SingPassButton';
import fftTranslations from './fftTranslations';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class FFTParticipants extends Component {
  constructor(props) {
    super(props);
    const now = new Date();
    const todayDDMMYYYY = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    this.state = {
      // Language
      language: 'en', // 'en', 'zh', 'ms'
      languageSelected: false,
      // Pre-section
      loginMethod: '', // 'singpass' or 'manual'
      currentStep: 1,
      // Section 1: Particulars
      testDate: todayDDMMYYYY,
      name: '',
      dob: '',
      phoneNo: '',
      gender: '',
      age: '',
      icNumber: '',
      // Section 2: Health Declaration
      healthQ1: '', // Yes/No
      healthQ2: '',
      healthQ3: '',
      healthQ4: '',
      // Programme Indemnity
      indemnityAgreed: false,
      signatureDate: todayDDMMYYYY,
      // Signature
      isDrawing: false,
      hasSignature: false,
      // Validation
      errors: {},
      // SingPass tracking (matches formPage.jsx pattern)
      singPassPopulatedFields: {},
      // Submission
      submitting: false,
      submitted: false,
      submitError: null,
      entryNumber: null,
      successTab: 'qr',
      activeFile: null, // fetched from backend as fallback
      rowData: null,    // fetched row data from spreadsheet
      loadingRow: false,
    };
    this.signatureCanvasRef = React.createRef();
    this.signatureCtxRef = React.createRef();
  }

  // ── Signature pad helpers ──

  initSignatureCanvas = () => {
    const canvas = this.signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    this.signatureCtxRef.current = ctx;
  };

  ensureCanvasReady = () => {
    if (!this.signatureCtxRef.current) {
      this.initSignatureCanvas();
    }
  };

  getPointerPos = (e) => {
    const canvas = this.signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  startDrawing = (e) => {
    e.preventDefault();
    this.ensureCanvasReady();
    const ctx = this.signatureCtxRef.current;
    if (!ctx) return;
    const pos = this.getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    this.setState({ isDrawing: true });
  };

  draw = (e) => {
    e.preventDefault();
    if (!this.state.isDrawing) return;
    const ctx = this.signatureCtxRef.current;
    if (!ctx) return;
    const pos = this.getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  stopDrawing = (e) => {
    if (e) e.preventDefault();
    if (this.state.isDrawing) {
      this.setState(prev => {
        const errors = { ...prev.errors };
        delete errors.signature;
        return { isDrawing: false, hasSignature: true, errors };
      });
    }
  };

  clearSignature = () => {
    const canvas = this.signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = this.signatureCtxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.setState({ hasSignature: false });
  };

  getSignatureDataUrl = () => {
    const canvas = this.signatureCanvasRef.current;
    if (!canvas || !this.state.hasSignature) return null;
    return canvas.toDataURL('image/png');
  };

  // ── SingPass helpers (same pattern as formPage.jsx) ──

  checkSingPassAuthentication = () => {
    try {
      const userDataJson = sessionStorage.getItem('singpass_user_data_json');
      const accessToken = sessionStorage.getItem('singpass_access_token');
      if (userDataJson && accessToken) {
        const userData = JSON.parse(userDataJson);
        return userData && userData.name;
      }
      return false;
    } catch (error) {
      // Error checking SingPass authentication
      return false;
    }
  };

  getSingPassUserData = () => {
    try {
      const userDataJson = sessionStorage.getItem('singpass_user_data_json');
      return userDataJson ? JSON.parse(userDataJson) : null;
    } catch (error) {
      // Error getting SingPass user data
      return null;
    }
  };

  formatGender = (gender) => {
    if (!gender) return '';
    if (typeof gender === 'string' && (gender.includes('男') || gender.includes('女'))) return gender;
    let genderCode = gender;
    if (typeof gender === 'object') {
      genderCode = gender.code || gender.value || gender;
    }
    const genderMap = { 'M': 'M', 'F': 'F' };
    return genderMap[genderCode] || '';
  };

  extractMobileNumber = (mobileData) => {
    if (!mobileData) return '';
    if (typeof mobileData === 'object' && mobileData.nbr) {
      return mobileData.nbr.value || mobileData.nbr;
    }
    if (typeof mobileData === 'string' || typeof mobileData === 'number') {
      let mobile = String(mobileData).trim();
      if (mobile.startsWith('+65')) mobile = mobile.substring(3);
      if (mobile.startsWith('65') && mobile.length === 10) mobile = mobile.substring(2);
      return mobile;
    }
    return '';
  };

  // Populate form fields from SingPass session data
  populateFormWithSingPassData = () => {
    try {
      const userData = this.getSingPassUserData();
      if (!userData) {
        return;
      }

      const genderCode = this.formatGender(userData.sex);
      const phoneNumber = this.extractMobileNumber(userData.mobileno);

      // Parse DOB into yyyy-MM-dd for date input
      let dobValue = '';
      if (userData.dob) {
        const rawDob = userData.dob.formattedDate1 || userData.dob;
        // Attempt to normalise to yyyy-MM-dd
        if (typeof rawDob === 'string') {
          // If already yyyy-MM-dd
          if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
            dobValue = rawDob;
          } else {
            // Try dd/mm/yyyy
            const parts = rawDob.split('/');
            if (parts.length === 3) {
              dobValue = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
      }

      // Calculate age from DOB
      let calculatedAge = '';
      if (dobValue) {
        const today = new Date();
        const birthDate = new Date(dobValue);
        let ageNum = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          ageNum--;
        }
        if (ageNum >= 0) calculatedAge = ageNum.toString();
      }

      // Track which fields were populated by SingPass (locked = true, editable = false)
      // Matches formPage.jsx: name, nric, gender, dob are locked; phone is always editable
      const singPassPopulatedFields = {
        name: !!userData.name,
        icNumber: !!userData.uinfin,
        gender: !!userData.sex,
        dob: !!userData.dob,
        phoneNo: false, // Always editable, same as formPage.jsx cNO: false
      };

      this.setState({
        name: userData.name || '',
        icNumber: userData.uinfin || '',
        gender: genderCode,
        dob: dobValue,
        age: calculatedAge,
        phoneNo: phoneNumber,
        singPassPopulatedFields,
      });

    } catch (error) {
      // Error populating FFT form with SingPass data
    }
  };

  clearSingPassData = () => {
    this.setState({
      name: '',
      dob: '',
      phoneNo: '',
      gender: '',
      age: '',
      icNumber: '',
      singPassPopulatedFields: {},
      loginMethod: 'manual',
    });

  };

  // ── Handlers ──

  handleDateInput = (e) => {
    const { name, value } = e.target;
    // Allow only digits and slashes
    let cleaned = value.replace(/[^\d/]/g, '');
    // Auto-insert slashes after DD and MM
    const digits = cleaned.replace(/\//g, '');
    let formatted = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += '/';
      formatted += digits[i];
    }
    this.setState({ [name]: formatted }, () => {
      // Clear field error on input
      if (this.state.errors[name]) {
        this.setState(prev => { const errors = { ...prev.errors }; delete errors[name]; return { errors }; });
      }
      // Auto-calculate age when DOB is complete (dd/mm/yyyy)
      if (name === 'dob' && formatted.length === 10) {
        const parts = formatted.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
          if (calculatedAge >= 0) {
            this.setState({ age: calculatedAge.toString() });
          }
        }
      }
    });
  };

  handleChange = (e) => {
    const { name, value } = e.target;

    // Block changes to SingPass-locked fields
    if (this.state.singPassPopulatedFields[name]) return;

    this.setState({ [name]: value }, () => {
      // Clear field error on input
      if (this.state.errors[name]) {
        this.setState(prev => { const errors = { ...prev.errors }; delete errors[name]; return { errors }; });
      }
    });
  };

  // Handler for "Next" button (proceed without SingPass / manual)
  handleProceedWithoutSingPass = () => {
    this.setState({
      loginMethod: 'manual',
      singPassPopulatedFields: {},
    });
  };

  // Handler for SingPassButton success callback (same pattern as formPage.jsx)
  handleSingPassSuccess = () => {

    this.setState({ loginMethod: 'singpass' }, () => {
      this.populateFormWithSingPassData();
    });
  };

  // Handler for MyInfo error from SingPassButton
  handleMyInfoError = (errorMessage = 'MyInfo is currently unavailable.') => {

    // Fall back to manual entry
    this.setState({
      loginMethod: 'manual',
      singPassPopulatedFields: {},
    });
  };

  handleHealthAnswer = (question, answer) => {
    this.setState(prev => {
      const errors = { ...prev.errors };
      delete errors[question];
      return { [question]: answer, errors };
    });
  };

  validateStep = (step) => {
    const errors = {};
    const { name, dob, gender, phoneNo, testDate, healthQ1, healthQ2, healthQ3, healthQ4, indemnityAgreed, signatureDate, hasSignature } = this.state;

    if (step === 1) {
      if (!name || !name.trim()) errors.name = this.t('errNameRequired');
      if (!dob || dob.length < 10) errors.dob = this.t('errDobRequired');
      if (!gender) errors.gender = this.t('errGenderRequired');
      if (!phoneNo || !phoneNo.trim()) errors.phoneNo = this.t('errPhoneRequired');
      if (!testDate || testDate.length < 10) errors.testDate = this.t('errTestDateRequired');
    }

    if (step === 2) {
      if (!healthQ1) errors.healthQ1 = this.t('errHealthRequired');
      if (!healthQ2) errors.healthQ2 = this.t('errHealthRequired');
      if (!healthQ3) errors.healthQ3 = this.t('errHealthRequired');
      if (!healthQ4) errors.healthQ4 = this.t('errHealthRequired');
    }

    if (step === 3) {
      if (!indemnityAgreed) errors.indemnityAgreed = this.t('errAgreeRequired');
      if (!signatureDate || signatureDate.length < 10) errors.signatureDate = this.t('errDateRequired');
      if (!hasSignature) errors.signature = this.t('errSignatureRequired');
    }

    return errors;
  };

  goToNextStep = () => {
    const errors = this.validateStep(this.state.currentStep);
    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }
    this.setState(prev => ({ currentStep: prev.currentStep + 1, errors: {} }));
  };

  goToPrevStep = () => {
    if (this.state.currentStep === 1) {
      this.setState({ loginMethod: '', currentStep: 1 });
    } else {
      this.setState(prev => ({ currentStep: prev.currentStep - 1 }));
    }
  };

  handleBackToLanguage = () => {
    this.setState({ languageSelected: false, loginMethod: '', currentStep: 1 });
  };

  // ── Chinese name detection ──
  isChinese = (text) => {
    // Returns true if the text contains CJK characters
    return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const errors = this.validateStep(3);
    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    const { selectedFile } = this.props;
    const { name, dob, phoneNo, gender, age, testDate } = this.state;

    // Determine Name vs Chinese Name
    const isChineseName = this.isChinese(name);
    const nameCol = isChineseName ? '' : name;          // Name
    const chineseNameCol = isChineseName ? name : '';    // Chinese Name

    // Split DOB into DD, MM, YYYY
    // DOB can be dd/mm/yyyy (manual) or yyyy-MM-dd (SingPass)
    let dd = '', mm = '', yyyy = '';
    if (dob) {
      if (dob.includes('/')) {
        // dd/mm/yyyy format
        const parts = dob.split('/');
        if (parts.length === 3) {
          dd = parts[0];
          mm = parts[1];
          yyyy = parts[2];
        }
      } else if (dob.includes('-')) {
        // yyyy-MM-dd format (SingPass)
        const parts = dob.split('-');
        if (parts.length === 3) {
          yyyy = parts[0];
          mm = parts[1];
          dd = parts[2];
        }
      }
    }

    // Map form data to spreadsheet columns:
    // Name | Chinese Name | Phone Number | Gender | DD | MM | YYYY | Age |
    // Height | Weight | BMI | Date of test |
    // 30 secs Sit & Stand | 30 secs Arm Curl | 2 min March on the spot |
    // Sit & Reach | Back Stretch | 2.44m speed walk | Grip Test |
    // Improvements | Remarks
    const rowData = [
      nameCol,          // Name
      chineseNameCol,   // Chinese Name
      phoneNo,          // Phone Number
      gender,           // Gender
      dd,               // DD
      mm,               // MM
      yyyy,             // YYYY
      age,              // Age
      '',               // Height (volunteer fills)
      '',               // Weight (volunteer fills)
      '',               // BMI (volunteer fills)
      testDate,         // Date of test
      '',               // 30 secs Sit & Stand
      '',               // 30 secs Arm Curl
      '',               // 2 min March on the spot
      '',               // Sit & Reach
      '',               // Back Stretch
      '',               // 2.44m speed walk
      '',               // Grip Test
      '',               // Improvements
      '',               // Remarks
    ];

    // Use prop or fallback to fetched active file
    const file = selectedFile || this.state.activeFile;

    if (!file || !file.id) {
      this.setState({ submitError: 'No file selected. Please go to Admin → Choose File first.' });
      return;
    }

    this.setState({ submitting: true, submitError: null });

    axios.post(`${BACKEND_URL}/googleDrive/appendRow`, {
      fileId: file.id,
      rowData: rowData,
    })
    .then((res) => {
      if (res.data.success) {
        const entry = res.data.entryNumber || null;
        // Store in cookie so QR code persists across refresh
        if (entry != null) {
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
          document.cookie = `fft_submission=${encodeURIComponent(JSON.stringify({ entryNumber: entry }))}; expires=${expires}; path=/`;
        }
        this.setState({ submitting: false, submitted: true, entryNumber: entry });
      } else {
        this.setState({ submitting: false, submitError: res.data.error || 'Failed to submit' });
      }
    })
    .catch((err) => {
      this.setState({ submitting: false, submitError: err.response?.data?.error || err.message });
    });
  };

  fetchRowData = () => {
    const { entryNumber, activeFile } = this.state;
    const file = this.props.selectedFile || activeFile;
    if (!file || !file.id || entryNumber == null) return;

    this.setState({ loadingRow: true });
    axios.get(`${BACKEND_URL}/googleDrive/getRow`, {
      params: { fileId: file.id, entryNumber: entryNumber }
    })
    .then((res) => {
      if (res.data.success) {
        this.setState({ rowData: res.data.data, loadingRow: false });
      } else {
        this.setState({ loadingRow: false });
      }
    })
    .catch(() => this.setState({ loadingRow: false }));
  };

  // ── Lifecycle ──

  componentDidMount() {
    // Restore submission state from cookie if present
    try {
      const match = document.cookie.match(/(?:^|;\s*)fft_submission=([^;]*)/);
      if (match) {
        const data = JSON.parse(decodeURIComponent(match[1]));
        if (data && data.entryNumber != null) {
          this.setState({ submitted: true, entryNumber: data.entryNumber });
          return; // Don't init form if showing QR code
        }
      }
    } catch (e) { /* ignore */ }

    // Fetch active file from backend (shared across all devices)
    axios.get(`${BACKEND_URL}/googleDrive/activeFile`)
      .then((res) => {
        if (res.data.success && res.data.file) {
          this.setState({ activeFile: res.data.file });
        }
      })
      .catch(() => {});

    // If user is returning from SingPass login, auto-populate
    const isAuthenticated = this.checkSingPassAuthentication();
    if (isAuthenticated) {
      // SingPass data is in session — populate directly (same as formPage.jsx handleSingPassSuccess)
      this.handleSingPassSuccess();
    }
    // Initialise signature pad canvas
    this.initSignatureCanvas();
    window.addEventListener('resize', this.initSignatureCanvas);

    // Socket.IO: live updates
    this.socket = io(BACKEND_URL);
    this.socket.on('fftActiveFile', (data) => {
      if (data && data.file) {
        this.setState({ activeFile: data.file });
      }
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.currentStep === 3 && prevState.currentStep !== 3) {
      setTimeout(() => this.initSignatureCanvas(), 100);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.initSignatureCanvas);
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // ── Render helpers ──

  isFieldLocked = (fieldName) => {
    return !!this.state.singPassPopulatedFields[fieldName];
  };

  // Helper: get translated string
  t = (key) => {
    const { language } = this.state;
    const entry = fftTranslations[key];
    if (!entry) return key;
    return entry[language] || entry['en'] || key;
  };

  render() {
    const { onBack, onAdmin, selectedFile } = this.props;
    const { language, languageSelected, loginMethod, currentStep, testDate, name, dob, phoneNo, gender, age, icNumber, healthQ1, healthQ2, healthQ3, healthQ4, indemnityAgreed, signatureDate, singPassPopulatedFields, errors, submitting, submitted, submitError } = this.state;

    const hasSingPassData = singPassPopulatedFields && Object.values(singPassPopulatedFields).some(v => v === true);

    // ── Success screen after submission (checked FIRST, before language selection) ──
    if (submitted) {
      const { entryNumber, successTab } = this.state;
      const currentTab = successTab || 'qr';

      return (
        <div className="fft-participants-wrapper">
          <div className="fft-participants-header">
            <div className="fft-participants-header-top-row">
              <button
                className="fft-participants-icon-btn"
                onClick={() => {
                  // Clear cookie and go home
                  document.cookie = 'fft_submission=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  this.setState({ submitted: false, entryNumber: null, successTab: 'qr' });
                  if (this.props.onBack) this.props.onBack();
                }}
                title="Home"
              >
                <i className="fas fa-home"></i>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="fft-participants-form">
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => this.setState({ successTab: 'qr' })}
                style={{
                  flex: 1, padding: '12px 0', fontSize: '1.1rem', fontWeight: currentTab === 'qr' ? 700 : 400,
                  color: currentTab === 'qr' ? '#2563eb' : '#757575', background: 'none', border: 'none',
                  borderBottom: currentTab === 'qr' ? '3px solid #2563eb' : '3px solid transparent', cursor: 'pointer'
                }}
              >
                <i className="fas fa-qrcode" style={{ marginRight: '6px' }}></i> QR Code
              </button>
              <button
                type="button"
                onClick={() => { this.setState({ successTab: 'stations' }); this.fetchRowData(); }}
                style={{
                  flex: 1, padding: '12px 0', fontSize: '1.1rem', fontWeight: currentTab === 'stations' ? 700 : 400,
                  color: currentTab === 'stations' ? '#2563eb' : '#757575', background: 'none', border: 'none',
                  borderBottom: currentTab === 'stations' ? '3px solid #2563eb' : '3px solid transparent', cursor: 'pointer'
                }}
              >
                <i className="fas fa-clipboard-list" style={{ marginRight: '6px' }}></i> Test Stations
              </button>
            </div>

            {/* QR Code Tab */}
            {currentTab === 'qr' && (
              <div className="fft-participants-section" style={{ textAlign: 'center', padding: '48px 20px' }}>
                {entryNumber != null && (
                  <div style={{ marginBottom: '28px' }}>
                    <p style={{ fontSize: '1.35rem', color: '#555', marginBottom: '16px' }}>
                      Please show this QR code to the station in-charge to scan
                    </p>
                    <QRCodeCanvas
                      value={String(entryNumber)}
                      size={200}
                      level="H"
                      style={{ margin: '0 auto', display: 'block' }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Test Stations Tab */}
            {currentTab === 'stations' && (
              <div className="fft-participants-section" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
                    {/* Personal Info Card — column 1 */}
                    {(() => {
                      const rd = this.state.rowData || {};
                      const displayName = rd.name || rd.chineseName || '—';
                      const dob = (rd.dd && rd.mm && rd.yyyy) ? `${rd.dd}/${rd.mm}/${rd.yyyy}` : '—';
                      return (
                        <div style={{
                          background: '#fff', borderRadius: '12px', padding: '18px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                            <div style={{
                              width: '48px', height: '48px', borderRadius: '50%',
                              background: '#f0fdf4', color: '#16a34a', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0
                            }}>
                              <i className="fas fa-user"></i>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1a1a' }}>{displayName}</div>
                              {rd.chineseName && rd.name && <div style={{ fontSize: '0.9rem', color: '#555' }}>{rd.chineseName}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '0.9rem' }}>
                            <div><span style={{ color: '#888' }}>DOB:</span> <strong>{dob}</strong></div>
                            <div><span style={{ color: '#888' }}>Gender:</span> <strong>{rd.gender || '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>Age:</span> <strong>{rd.age || '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>Phone:</span> <strong>{rd.phoneNo || '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>Height:</span> <strong>{rd.height || '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>Weight:</span> <strong>{rd.weight || '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>BMI:</span> <strong>{rd.bmi || '—'}</strong></div>
                            <div><span style={{ color: '#888' }}>Test Date:</span> <strong>{rd.testDate || '—'}</strong></div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Station Cards — fill remaining grid cells */}
                    {(() => {
                      const rd = this.state.rowData || {};
                      const stations = [
                        { num: '1', zh: '30 秒坐立测验', en: '30-Sec Sit and Stand', icon: 'fa-chair', scoreKey: 'sitStand', note: '' },
                        { num: '2', zh: '30 秒手臂卷起', en: '30-Sec Arm Banding', icon: 'fa-dumbbell', scoreKey: 'armCurl', note: '' },
                        { num: '3', zh: '2 分钟抬膝测验', en: '2-Min On-the-spot Marching', icon: 'fa-walking', scoreKey: 'march', note: '' },
                        { num: '4', zh: '坐椅体前弯', en: 'Sit- and Reach Test', icon: 'fa-arrows-alt-h', scoreKey: 'sitReach', note: '左 L / 右 R (直腿 Straight leg)' },
                        { num: '5', zh: '抓背测验', en: 'Back Stretching Test', icon: 'fa-hand-paper', scoreKey: 'backStretch', note: '左 L / 右 R (上面 Hand on top)' },
                        { num: '6', zh: '2.44 公尺起身绕物测验', en: '2.44-Meter Speed Walking', icon: 'fa-stopwatch', scoreKey: 'speedWalk', note: '' },
                        { num: '7', zh: '握力测试', en: 'Hand Griping Test', icon: 'fa-fist-raised', scoreKey: 'gripTest', note: '左 L / 右 R (手 Hand)' },
                      ];
                      return stations.map((station) => {
                        const score = rd[station.scoreKey] || '';
                        const hasScore = score !== '';
                        if (!hasScore) return null;
                        return (
                          <div key={station.num} style={{
                            background: '#fff', borderRadius: '12px', padding: '16px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            border: '1px solid #bbf7d0',
                            display: 'flex', flexDirection: 'column', gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: '#f0fdf4', color: '#16a34a',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, fontSize: '1rem'
                              }}>
                                <i className="fas fa-check"></i>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#888' }}>Station {station.num}</div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a1a' }}>{station.en}</div>
                              <div style={{ fontSize: '0.85rem', color: '#555' }}>{station.zh}</div>
                            </div>
                            {station.note && (
                              <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                                <i className="fas fa-info-circle" style={{ marginRight: '4px' }}></i>{station.note}
                              </div>
                            )}
                            <div style={{
                              padding: '8px 12px', background: '#f0fdf4',
                              borderRadius: '8px', fontSize: '0.9rem'
                            }}>
                              <span style={{ color: '#888' }}>Result:</span>{' '}
                              <strong style={{ color: '#16a34a' }}>{score}</strong>
                            </div>
                          </div>
                        );
                      });
                    })()}

                    {/* Improvements & Remarks — spans full width */}
                    {(() => {
                      const rd = this.state.rowData || {};
                      return (rd.improvements || rd.remarks) ? (
                        <div style={{
                          gridColumn: '1 / -1',
                          background: '#fff', borderRadius: '12px', padding: '16px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{
                              width: '48px', height: '48px', borderRadius: '50%',
                              background: '#fefce8', color: '#ca8a04', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0
                            }}>
                              <i className="fas fa-comment-alt"></i>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a' }}>Improvements & Remarks</div>
                          </div>
                          {rd.improvements && <div style={{ fontSize: '0.95rem', color: '#555', marginBottom: '4px' }}><span style={{ color: '#888' }}>Improvements:</span> {rd.improvements}</div>}
                          {rd.remarks && <div style={{ fontSize: '0.95rem', color: '#555' }}><span style={{ color: '#888' }}>Remarks:</span> {rd.remarks}</div>}
                        </div>
                      ) : null;
                    })()}

                  </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Language selection page ──
    if (!languageSelected) {
      return (
        <div className="fft-participants-wrapper">
          <div className="fft-participants-form">
              <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                <button className="fft-participants-icon-btn" onClick={onBack} title="Home">
                  <i className="fas fa-home"></i>
                </button>
              </div>
              <div className="fft-participants-lang-page-options">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'zh', label: '中文' },
                  { code: 'ms', label: 'Bahasa Melayu' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`fft-participants-lang-page-btn ${language === lang.code ? 'fft-participants-lang-page-btn--active' : ''}`}
                    onClick={() => this.setState({ language: lang.code, languageSelected: true })}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
          </div>
        </div>
      );
    }

    // ── Main form ──

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-header">
          <div className="fft-participants-header-top-row">
            <button className="fft-participants-icon-btn" onClick={() => this.setState({ languageSelected: false, loginMethod: '', currentStep: 1 })} title="Home">
              <i className="fas fa-home"></i>
            </button>
          </div>
          <h2 className="fft-participants-title">{this.t('headerTitle')}</h2>
        </div>

        <form className="fft-participants-form" onSubmit={this.handleSubmit}>
          {/* Pre-Section: App Purpose, MyInfo Consent & Login Method */}
          {!loginMethod && (
            <div className="fft-participants-section fft-participants-presection">
              {/* App Purpose */}
              <div className="fft-participants-consent-intro">
                <h3 className="fft-participants-consent-heading">{this.t('preSectionHeading')}</h3>
              </div>

              {/* Login Method */}
              <div className="fft-participants-consent-action">
                <p className="fft-participants-presection-desc">
                  {this.t('preSectionDesc')}
                </p>
                <div className="fft-participants-flex-button-container">
                  <SingPassButton
                    buttonText={this.t('singPassButtonText')}
                    onAuthenticationSuccess={this.handleSingPassSuccess}
                    onMyInfoError={this.handleMyInfoError}
                    onError={(error) => {
                      if (error.message?.includes('MyInfo') || error.message?.includes('unavailable')) {
                        this.handleMyInfoError(error.message);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="fft-participants-next-button"
                    onClick={this.handleProceedWithoutSingPass}
                  >
                    {this.t('manualButtonLine1')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Only show form sections after login method is selected */}
          {loginMethod && (
            <>
          {currentStep === 1 && (
            <>
          {/* Section 1: Particulars */}
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <span className="fft-participants-section-number">1</span>
              <h3 className="fft-participants-section-title">{this.t('sectionParticulars')}</h3>
            </div>



            <div className="fft-participants-form-grid">
              {/* Name */}
              <div className="fft-participants-field fft-participants-field--full">
                <label className="fft-participants-label" htmlFor="fft-name">
                  {this.t('labelName')}
                </label>
                <input
                  id="fft-name"
                  className={`fft-participants-input ${this.isFieldLocked('name') ? 'fft-participants-input--locked' : ''}`}
                  type="text"
                  name="name"
                  value={name}
                  onChange={this.handleChange}
                  placeholder={this.t('placeholderName')}
                  required
                  disabled={this.isFieldLocked('name')}
                />
                {errors.name && <span className="fft-participants-field-error">{errors.name}</span>}
              </div>

              {/* DOB */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-dob">
                  {this.t('labelDob')}
                </label>
                <input
                  id="fft-dob"
                  className={`fft-participants-input ${this.isFieldLocked('dob') ? 'fft-participants-input--locked' : ''}`}
                  type="text"
                  name="dob"
                  value={dob}
                  onChange={this.handleDateInput}
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  required
                  disabled={this.isFieldLocked('dob')}
                />
                {errors.dob && <span className="fft-participants-field-error">{errors.dob}</span>}
              </div>

              {/* Gender */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-gender">
                  {this.t('labelGender')}
                </label>
                <div className="fft-participants-gender-group">
                  <button
                    type="button"
                    className={`fft-participants-gender-btn ${gender === 'M' ? 'fft-participants-gender-btn--active' : ''} ${this.isFieldLocked('gender') ? 'fft-participants-gender-btn--locked' : ''}`}
                    onClick={() => !this.isFieldLocked('gender') && this.setState(prev => { const errors = { ...prev.errors }; delete errors.gender; return { gender: 'M', errors }; })}
                    disabled={this.isFieldLocked('gender')}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    className={`fft-participants-gender-btn ${gender === 'F' ? 'fft-participants-gender-btn--active' : ''} ${this.isFieldLocked('gender') ? 'fft-participants-gender-btn--locked' : ''}`}
                    onClick={() => !this.isFieldLocked('gender') && this.setState(prev => { const errors = { ...prev.errors }; delete errors.gender; return { gender: 'F', errors }; })}
                    disabled={this.isFieldLocked('gender')}
                  >
                    F
                  </button>
                </div>
                {errors.gender && <span className="fft-participants-field-error">{errors.gender}</span>}
              </div>

              {/* Age */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-age">
                  {this.t('labelAge')}
                </label>
                <input
                  id="fft-age"
                  className="fft-participants-input"
                  type="number"
                  name="age"
                  value={age}
                  onChange={this.handleChange}
                  placeholder={this.t('placeholderAge')}
                  min="0"
                  max="150"
                />
              </div>

              {/* Phone No */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-phone">
                  {this.t('labelPhone')}
                </label>
                <input
                  id="fft-phone"
                  className="fft-participants-input"
                  type="tel"
                  name="phoneNo"
                  value={phoneNo}
                  onChange={this.handleChange}
                  placeholder={this.t('placeholderPhone')}
                  required
                />
                {errors.phoneNo && <span className="fft-participants-field-error">{errors.phoneNo}</span>}
              </div>

              {/* Test Date */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-test-date">
                  {this.t('labelTestDate')}
                </label>
                <input
                  id="fft-test-date"
                  className="fft-participants-input"
                  type="text"
                  name="testDate"
                  value={testDate}
                  onChange={this.handleDateInput}
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                  required
                />
                {errors.testDate && <span className="fft-participants-field-error">{errors.testDate}</span>}
              </div>
            </div>
          </div>

          {/* Step 1 navigation */}
          <div className="fft-participants-nav-buttons">
            <button type="button" className="fft-participants-nav-btn fft-participants-nav-btn--prev" onClick={this.goToPrevStep}>
              <i className="fas fa-arrow-left"></i> {this.t('previous')}
            </button>
            <button type="button" className="fft-participants-nav-btn fft-participants-nav-btn--next" onClick={this.goToNextStep}>
              {this.t('next')} <i className="fas fa-arrow-right"></i>
            </button>
          </div>
            </>
          )}

          {currentStep === 2 && (
            <>
          {/* Section 2: Health Declaration */}
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <span className="fft-participants-section-number">2</span>
              <h3 className="fft-participants-section-title">{this.t('sectionHealth')}</h3>
            </div>

            {/* Health Declaration */}
            <div className="fft-participants-subsection">
              {['healthQ1', 'healthQ2', 'healthQ3', 'healthQ4'].map((qKey) => (
                <div className="fft-participants-health-question" key={qKey}>
                  <div className="fft-participants-health-question-text">
                    <p className="fft-participants-health-text">{this.t(qKey)}</p>
                  </div>
                  <div className="fft-participants-health-answers">
                    <button
                      type="button"
                      className={`fft-participants-health-btn ${this.state[qKey] === 'Yes' ? 'fft-participants-health-btn--yes' : ''}`}
                      onClick={() => this.handleHealthAnswer(qKey, 'Yes')}
                    >
                      {this.t('yes')}
                    </button>
                    <button
                      type="button"
                      className={`fft-participants-health-btn ${this.state[qKey] === 'No' ? 'fft-participants-health-btn--no' : ''}`}
                      onClick={() => this.handleHealthAnswer(qKey, 'No')}
                    >
                      {this.t('no')}
                    </button>
                  </div>
                  {errors[qKey] && <span className="fft-participants-field-error">{errors[qKey]}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Step 2 navigation */}
          <div className="fft-participants-nav-buttons">
            <button type="button" className="fft-participants-nav-btn fft-participants-nav-btn--prev" onClick={this.goToPrevStep}>
              <i className="fas fa-arrow-left"></i> {this.t('previous')}
            </button>
            <button type="button" className="fft-participants-nav-btn fft-participants-nav-btn--next" onClick={this.goToNextStep}>
              {this.t('next')} <i className="fas fa-arrow-right"></i>
            </button>
          </div>
            </>
          )}

          {currentStep === 3 && (
            <>
          {/* Section 3: Programme Indemnity */}
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <span className="fft-participants-section-number">3</span>
              <h3 className="fft-participants-section-title">{this.t('sectionIndemnity')}</h3>
            </div>

            <div className="fft-participants-subsection">
              <div className="fft-participants-indemnity-list">
                {['indemnity1', 'indemnity2', 'indemnity3'].map((key, idx) => (
                  <div className="fft-participants-indemnity-item" key={key}>
                    <span className="fft-participants-indemnity-num">{idx + 1}.</span>
                    <div>
                      <p className="fft-participants-indemnity-text">{this.t(key)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Agreement section */}
              <div className="fft-participants-agreement-layout">
                <div className="fft-participants-agreement-left">
                  <div className="fft-participants-indemnity-agree">
                    <label className="fft-participants-checkbox-label">
                      <input
                        type="checkbox"
                        className="fft-participants-checkbox"
                        checked={indemnityAgreed}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          this.setState(prev => {
                            const errors = { ...prev.errors };
                            if (checked) delete errors.indemnityAgreed;
                            return { indemnityAgreed: checked, errors };
                          });
                        }}
                      />
                      <span>{this.t('agreeTerms')}</span>
                    </label>
                    {errors.indemnityAgreed && <span className="fft-participants-field-error">{errors.indemnityAgreed}</span>}
                  </div>
                  <div className="fft-participants-field">
                    <label className="fft-participants-label" htmlFor="fft-sig-date">
                      {this.t('labelDate')}
                    </label>
                    <input
                      id="fft-sig-date"
                      className="fft-participants-input"
                      type="text"
                      name="signatureDate"
                      value={signatureDate}
                      onChange={this.handleDateInput}
                      placeholder="dd/mm/yyyy"
                      maxLength={10}
                      required
                    />
                    {errors.signatureDate && <span className="fft-participants-field-error">{errors.signatureDate}</span>}
                  </div>
                </div>
                <div className="fft-participants-agreement-right">
                  <div className="fft-participants-field fft-participants-signature-field">
                    <label className="fft-participants-label">
                      {this.t('labelSignature')} <span style={{ color: '#d32f2f' }}>*</span>
                    </label>
                    <div className="fft-participants-signature-pad">
                      <canvas
                        ref={this.signatureCanvasRef}
                        className="fft-participants-signature-canvas"
                        onMouseDown={this.startDrawing}
                        onMouseMove={this.draw}
                        onMouseUp={this.stopDrawing}
                        onMouseLeave={this.stopDrawing}
                        onTouchStart={this.startDrawing}
                        onTouchMove={this.draw}
                        onTouchEnd={this.stopDrawing}
                      />
                      {!this.state.hasSignature && (
                        <div className="fft-participants-signature-placeholder">
                          {this.t('signHere')}
                        </div>
                      )}
                      {this.state.hasSignature && (
                        <button
                          type="button"
                          className="fft-participants-signature-clear-x"
                          onClick={this.clearSignature}
                          aria-label="Clear signature"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {errors.signature && <span className="fft-participants-field-error">{errors.signature}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 navigation */}
          <div className="fft-participants-nav-buttons">
            <button type="button" className="fft-participants-nav-btn fft-participants-nav-btn--prev" onClick={this.goToPrevStep}>
              <i className="fas fa-arrow-left"></i> {this.t('previous')}
            </button>
            <button type="submit" className="fft-participants-nav-btn fft-participants-nav-btn--submit" disabled={!indemnityAgreed || !this.state.hasSignature || submitting}>
              {submitting ? (
                <><i className="fas fa-spinner fa-spin"></i> {this.t('submitting') || 'Submitting...'}</>
              ) : (
                <><i className="fas fa-check"></i> {this.t('submit')}</>
              )}
            </button>
          </div>

          {/* Submit error */}
          {submitError && (
            <div style={{ marginTop: '12px', padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '1.25rem', fontWeight: 600 }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
              {submitError}
            </div>
          )}
            </>
          )}
            </>
          )}
        </form>
      </div>
    );
  }
}

export default FFTParticipants;
