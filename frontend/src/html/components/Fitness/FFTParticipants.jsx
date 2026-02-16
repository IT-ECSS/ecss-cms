import React, { Component } from 'react';
import '../../../css/fftParticipants.css';
import SingPassButton from '../sub/SingPassButton';

class FFTParticipants extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Pre-section
      loginMethod: '', // 'singpass' or 'manual'
      // Section 1: Particulars
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
      signatureDate: '',
      // SingPass tracking (matches formPage.jsx pattern)
      singPassPopulatedFields: {},
    };
  }

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
      console.error('Error checking SingPass authentication:', error);
      return false;
    }
  };

  getSingPassUserData = () => {
    try {
      const userDataJson = sessionStorage.getItem('singpass_user_data_json');
      return userDataJson ? JSON.parse(userDataJson) : null;
    } catch (error) {
      console.error('Error getting SingPass user data:', error);
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
        console.log('No SingPass user data available');
        return;
      }

      console.log('SingPass user data:', userData);

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

      console.log('FFT form populated with SingPass data successfully');
    } catch (error) {
      console.error('Error populating FFT form with SingPass data:', error);
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
    console.log('SingPass data cleared, switched to manual entry');
  };

  // ── Handlers ──

  handleChange = (e) => {
    const { name, value } = e.target;

    // Block changes to SingPass-locked fields
    if (this.state.singPassPopulatedFields[name]) return;

    this.setState({ [name]: value }, () => {
      // Auto-calculate age when DOB changes
      if (name === 'dob' && value) {
        const today = new Date();
        const birthDate = new Date(value);
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge >= 0) {
          this.setState({ age: calculatedAge.toString() });
        }
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
    console.log('SingPass authentication successful (FFT)');
    this.setState({ loginMethod: 'singpass' }, () => {
      this.populateFormWithSingPassData();
    });
  };

  // Handler for MyInfo error from SingPassButton
  handleMyInfoError = (errorMessage = 'MyInfo is currently unavailable.') => {
    console.error('MyInfo error occurred (FFT):', errorMessage);
    // Fall back to manual entry
    this.setState({
      loginMethod: 'manual',
      singPassPopulatedFields: {},
    });
  };

  handleHealthAnswer = (question, answer) => {
    this.setState({ [question]: answer });
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { loginMethod, name, dob, phoneNo, gender, age, icNumber, healthQ1, healthQ2, healthQ3, healthQ4, indemnityAgreed, signatureDate } = this.state;
    console.log('FFT Participant Form:', {
      loginMethod,
      particulars: { name, dob, phoneNo, gender, age, icNumber },
      healthDeclaration: { healthQ1, healthQ2, healthQ3, healthQ4 },
      indemnity: { indemnityAgreed, signatureDate },
    });
  };

  // ── Lifecycle ──

  componentDidMount() {
    // If user is returning from SingPass login, auto-populate
    const isAuthenticated = this.checkSingPassAuthentication();
    if (isAuthenticated) {
      // SingPass data is in session — populate directly (same as formPage.jsx handleSingPassSuccess)
      this.handleSingPassSuccess();
    }
  }

  // ── Render helpers ──

  isFieldLocked = (fieldName) => {
    return !!this.state.singPassPopulatedFields[fieldName];
  };

  render() {
    const { onBack } = this.props;
    const { loginMethod, name, dob, phoneNo, gender, age, icNumber, healthQ1, healthQ2, healthQ3, healthQ4, indemnityAgreed, signatureDate, singPassPopulatedFields } = this.state;

    const hasSingPassData = singPassPopulatedFields && Object.values(singPassPopulatedFields).some(v => v === true);

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-header">
          <button className="fft-participants-back-btn" onClick={onBack}>
            <span className="fft-participants-back-icon"><i className="fas fa-arrow-left"></i></span>
            Back
          </button>
          <h2 className="fft-participants-title">ECSS Functional Fitness Test for Elderly</h2>
          <p className="fft-participants-subtitle">恩群社区服务乐龄体适能评估表</p>
        </div>

        <form className="fft-participants-form" onSubmit={this.handleSubmit}>
          {/* Pre-Section: Login Method — same layout as formPage.jsx */}
          {!loginMethod && (
            <div className="fft-participants-section fft-participants-presection">
              <div className="fft-participants-section-header">
                <span className="fft-participants-section-icon"><i className="fas fa-sign-in-alt"></i></span>
                <h3 className="fft-participants-section-title">Login Method 登录方式</h3>
              </div>
              <p className="fft-participants-presection-desc">
                Choose how you would like to fill in your information.
              </p>
              <div className="fft-participants-flex-button-container">
                <SingPassButton
                  buttonText="Retrieve Myinfo with"
                  onAuthenticationSuccess={this.handleSingPassSuccess}
                  onMyInfoError={this.handleMyInfoError}
                  onError={(error) => {
                    console.error('SingPass error (FFT):', error);
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
                  Fill in the form manually 手动填写表格
                </button>
              </div>
            </div>
          )}

          {/* Only show form sections after login method is selected */}
          {loginMethod && (
            <>
          {/* Section 1: Particulars */}
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <span className="fft-participants-section-number">1</span>
              <h3 className="fft-participants-section-title">Particulars 个人资料</h3>
            </div>

            {/* SingPass data banner */}
            {hasSingPassData && (
              <div className="fft-participants-singpass-banner">
                <div className="fft-participants-singpass-banner-info">
                  <i className="fas fa-lock"></i>
                  <span>Fields filled by Singpass are locked. 由Singpass填入的字段已被锁定。</span>
                </div>
                <button
                  type="button"
                  className="fft-participants-clear-singpass-btn"
                  onClick={this.clearSingPassData}
                >
                  <i className="fas fa-trash-alt"></i> Clear Singpass Data
                </button>
              </div>
            )}

            <div className="fft-participants-form-grid">
              {/* Name — locked by SingPass */}
              <div className="fft-participants-field fft-participants-field--full">
                <label className="fft-participants-label" htmlFor="fft-name">
                  姓名 Name
                  {this.isFieldLocked('name') && <span className="fft-participants-lock-icon"><i className="fas fa-lock"></i></span>}
                </label>
                <input
                  id="fft-name"
                  className={`fft-participants-input ${this.isFieldLocked('name') ? 'fft-participants-input--locked' : ''}`}
                  type="text"
                  name="name"
                  value={name}
                  onChange={this.handleChange}
                  placeholder="Enter full name"
                  required
                  disabled={this.isFieldLocked('name')}
                />
              </div>

              {/* DOB — locked by SingPass */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-dob">
                  生日 DOB
                  {this.isFieldLocked('dob') && <span className="fft-participants-lock-icon"><i className="fas fa-lock"></i></span>}
                </label>
                <input
                  id="fft-dob"
                  className={`fft-participants-input ${this.isFieldLocked('dob') ? 'fft-participants-input--locked' : ''}`}
                  type="date"
                  name="dob"
                  value={dob}
                  onChange={this.handleChange}
                  required
                  disabled={this.isFieldLocked('dob')}
                />
              </div>

              {/* Age (always auto-calculated, always read-only) */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-age">
                  年龄 Age
                </label>
                <input
                  id="fft-age"
                  className="fft-participants-input fft-participants-input--locked"
                  type="number"
                  name="age"
                  value={age}
                  placeholder="Auto-calculated"
                  min="0"
                  max="150"
                  readOnly
                />
              </div>

              {/* IC Number — locked by SingPass */}
              <div className="fft-participants-field fft-participants-field--full">
                <label className="fft-participants-label" htmlFor="fft-ic">
                  身份证号 IC Number
                  {this.isFieldLocked('icNumber') && <span className="fft-participants-lock-icon"><i className="fas fa-lock"></i></span>}
                </label>
                <input
                  id="fft-ic"
                  className={`fft-participants-input ${this.isFieldLocked('icNumber') ? 'fft-participants-input--locked' : ''}`}
                  type="text"
                  name="icNumber"
                  value={icNumber}
                  onChange={this.handleChange}
                  placeholder="e.g. S1234567A"
                  required
                  disabled={this.isFieldLocked('icNumber')}
                />
              </div>

              {/* Phone No — always editable (same as formPage.jsx) */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-phone">
                  电话号码 Phone Number
                </label>
                <input
                  id="fft-phone"
                  className="fft-participants-input"
                  type="tel"
                  name="phoneNo"
                  value={phoneNo}
                  onChange={this.handleChange}
                  placeholder="e.g. 91234567"
                  required
                />
              </div>

              {/* Gender — locked by SingPass */}
              <div className="fft-participants-field">
                <label className="fft-participants-label" htmlFor="fft-gender">
                  性别 Gender
                  {this.isFieldLocked('gender') && <span className="fft-participants-lock-icon"><i className="fas fa-lock"></i></span>}
                </label>
                <div className="fft-participants-gender-group">
                  <button
                    type="button"
                    className={`fft-participants-gender-btn ${gender === 'M' ? 'fft-participants-gender-btn--active' : ''} ${this.isFieldLocked('gender') ? 'fft-participants-gender-btn--locked' : ''}`}
                    onClick={() => !this.isFieldLocked('gender') && this.setState({ gender: 'M' })}
                    disabled={this.isFieldLocked('gender')}
                  >
                    M 男
                  </button>
                  <button
                    type="button"
                    className={`fft-participants-gender-btn ${gender === 'F' ? 'fft-participants-gender-btn--active' : ''} ${this.isFieldLocked('gender') ? 'fft-participants-gender-btn--locked' : ''}`}
                    onClick={() => !this.isFieldLocked('gender') && this.setState({ gender: 'F' })}
                    disabled={this.isFieldLocked('gender')}
                  >
                    F 女
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Health Declaration & Programme Indemnity */}
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <span className="fft-participants-section-number">2</span>
              <h3 className="fft-participants-section-title">健康申报与活动免责同意书</h3>
            </div>
            <p className="fft-participants-section-subtitle">Health Declaration & Programme Indemnity Form</p>

            {/* Health Declaration */}
            <div className="fft-participants-subsection">
              <h4 className="fft-participants-subsection-title">健康申报 Health Declaration</h4>

              {[
                {
                  key: 'healthQ1',
                  cn: '1. 因为您的健康因素，医生已建议您不要做任何运动。',
                  en: 'You have been advised by a doctor not to exercise due to health reasons.',
                },
                {
                  key: 'healthQ2',
                  cn: '2. 您曾在运动时发生过心绞痛（胸闷、压力、疼痛）。',
                  en: 'You have experienced heart pain (tightness, pressure, aching) during exercise.',
                },
                {
                  key: 'healthQ3',
                  cn: '3. 您现在有关节疼痛、胸痛或晕眩。',
                  en: 'You are experiencing pain in the joints, chest pain or giddiness now.',
                },
                {
                  key: 'healthQ4',
                  cn: '4. 您有无法控制的高血压问题 (160/100或以上)。',
                  en: 'You have uncontrollable high blood pressure (≥160/100).',
                },
              ].map((q) => (
                <div className="fft-participants-health-question" key={q.key}>
                  <div className="fft-participants-health-question-text">
                    <p className="fft-participants-health-cn">{q.cn}</p>
                    <p className="fft-participants-health-en">{q.en}</p>
                  </div>
                  <div className="fft-participants-health-answers">
                    <button
                      type="button"
                      className={`fft-participants-health-btn ${this.state[q.key] === 'Yes' ? 'fft-participants-health-btn--yes' : ''}`}
                      onClick={() => this.handleHealthAnswer(q.key, 'Yes')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`fft-participants-health-btn ${this.state[q.key] === 'No' ? 'fft-participants-health-btn--no' : ''}`}
                      onClick={() => this.handleHealthAnswer(q.key, 'No')}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Programme Indemnity */}
            <div className="fft-participants-subsection">
              <h4 className="fft-participants-subsection-title">(1) 活动免责同意 Programme Indemnity</h4>

              <div className="fft-participants-indemnity-list">
                <div className="fft-participants-indemnity-item">
                  <span className="fft-participants-indemnity-num">1.</span>
                  <div>
                    <p className="fft-participants-indemnity-cn">我是自愿参加，并被告知检测的目的和可能面临的身体不适与风险。</p>
                    <p className="fft-participants-indemnity-en">I voluntarily participate, and have been told the test objectives and possible physical discomfort and risks.</p>
                  </div>
                </div>
                <div className="fft-participants-indemnity-item">
                  <span className="fft-participants-indemnity-num">2.</span>
                  <div>
                    <p className="fft-participants-indemnity-cn">我同意在执行检测中监控自己的身体状况，也同意当我感到不舒服或有任何不寻常症状时，告知检测员并停止检测。</p>
                    <p className="fft-participants-indemnity-en">I agree to monitor my body condition, and agree to inform the tester and stop the test when I feel ill or have abnormal symptoms.</p>
                  </div>
                </div>
                <div className="fft-participants-indemnity-item">
                  <span className="fft-participants-indemnity-num">3.</span>
                  <div>
                    <p className="fft-participants-indemnity-cn">我对于参与此检测可能造成身体不适、意外等风险，愿意自己承担完全的责任，对主办方不追究任何责任。</p>
                    <p className="fft-participants-indemnity-en">I take full responsibility for any risks of illness and accidents that may arise from this test, and will not hold the organizer responsible.</p>
                  </div>
                </div>
              </div>

              <div className="fft-participants-indemnity-agree">
                <label className="fft-participants-checkbox-label">
                  <input
                    type="checkbox"
                    className="fft-participants-checkbox"
                    checked={indemnityAgreed}
                    onChange={(e) => this.setState({ indemnityAgreed: e.target.checked })}
                  />
                  <span>I agree to the above terms / 我同意以上条款</span>
                </label>
              </div>

              {/* Signature & Date */}
              <div className="fft-participants-form-grid fft-participants-signature-row">
                <div className="fft-participants-field">
                  <label className="fft-participants-label" htmlFor="fft-sig-date">
                    日期 Date
                  </label>
                  <input
                    id="fft-sig-date"
                    className="fft-participants-input"
                    type="date"
                    name="signatureDate"
                    value={signatureDate}
                    onChange={this.handleChange}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="fft-participants-submit-btn" disabled={!indemnityAgreed}>
            <i className="fas fa-check"></i> Submit
          </button>
            </>
          )}
        </form>
      </div>
    );
  }
}

export default FFTParticipants;
