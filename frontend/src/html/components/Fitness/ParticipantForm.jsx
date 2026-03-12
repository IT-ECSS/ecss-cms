import React, { Component } from 'react';
import '../../../css/fftParticipants.css';
import ParticipantEntryMethod from './ParticipantEntryMethod';
import ParticularsSection from './ParticularsSection';
import HealthDeclarationSection from './HealthDeclarationSection';
import IndemnitySection from './IndemnitySection';
import { getSingPassUserDataJSON } from '../../../utils/singpassData';

class ParticipantForm extends Component {
  state = {
    entryMethod: null,
    currentStep: 1,
    particularsData: null,
    healthData: null,
    indemnityData: null,
    singpassFormData: null,
  };

  particularsRef = React.createRef();
  healthRef = React.createRef();
  indemnityRef = React.createRef();

  resetForm = () => {
    this.setState({ entryMethod: null, currentStep: 1, singpassFormData: null });
  };

  // Extract mobile number from SingPass mobileno field
  extractMobile = (mobileData) => {
    if (!mobileData) return '';
    if (typeof mobileData === 'object' && mobileData.nbr) {
      return mobileData.nbr.value || mobileData.nbr || '';
    }
    if (typeof mobileData === 'string' || typeof mobileData === 'number') {
      let m = String(mobileData).trim();
      if (m.startsWith('+65')) m = m.substring(3);
      if (m.startsWith('65') && m.length === 10) m = m.substring(2);
      return m;
    }
    return '';
  };

  // Calculate age from dd/mm/yyyy
  calcAge = (dob) => {
    if (!dob) return '';
    const parts = dob.split('/');
    if (parts.length !== 3) return '';
    const [dd, mm, yyyy] = parts;
    const birth = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return String(age);
  };

  handleUseSingpass = () => {
    const userData = getSingPassUserDataJSON();
    console.log('Retrieved SingPass user data from sessionStorage:', userData);
    let singpassFormData = null;
    if (userData) {
      const dob = userData.dob?.formattedDate1 || (typeof userData.dob === 'string' ? userData.dob : '');
      let gender = '';
      if (typeof userData.sex === 'string') gender = userData.sex.charAt(0).toUpperCase();
      else if (userData.sex?.value) gender = String(userData.sex.value).charAt(0).toUpperCase();
      else if (userData.sex?.code) gender = String(userData.sex.code).charAt(0).toUpperCase();
      singpassFormData = {
        name: userData.name ? userData.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '',
        dateOfBirth: dob,
        gender: gender === 'M' || gender === 'F' ? gender : '',
        age: this.calcAge(dob),
        phone: this.extractMobile(userData.mobileno),
      };
    }
    this.setState({
      entryMethod: 'singpass',
      currentStep: 2,
      singpassFormData,
    });
  };

  handleBack = () => {
    const { currentStep } = this.state;
    const { onBack } = this.props;
    if (currentStep === 1) {
      onBack?.();
    } else if (currentStep === 2) {
      this.resetForm();
    } else if (currentStep === 3) {
      this.setState({ currentStep: 2 });
    } else if (currentStep === 4) {
      const indemnityData = this.indemnityRef.current?.getCurrentData?.() || null;
      this.setState({ currentStep: 3, indemnityData });
    }
  };

  componentDidMount() {
    // If SingPass data is already in sessionStorage (returning from SingPass redirect),
    // auto-advance past the choice screen and pre-fill with SingPass data.
    const userData = getSingPassUserDataJSON();
    if (userData && userData.source === 'singpass' && userData.name) {
      this.handleUseSingpass();
      // Clear SingPass session data so it isn't re-used for the next participant
      sessionStorage.removeItem('singpass_user_data_json');
      sessionStorage.removeItem('singpass_access_token');
      sessionStorage.removeItem('singpass_user_uuid');
      sessionStorage.removeItem('singpass_user_profile');
    }
  }

  handleFinalSubmit = (indemnityData) => {
    this.setState({ indemnityData });
    const { particularsData, healthData } = this.state;
    this.props.onSubmit?.({ ...particularsData, ...healthData });
  };

  render() {
    const { currentStep, entryMethod, singpassFormData } = this.state;
    const { language, event, onBack, onHome } = this.props;
    const eventName = event ? (typeof event === 'string' ? event : event.name) : '';

    // Get translations for button titles
    const getTrans = (key) => {
      const translations = {
        back: {
          en: 'Back',
          zh: '返回',
          ms: 'Kembali',
        },
        home: {
          en: 'Home',
          zh: '主页',
          ms: 'Rumah',
        },
      };
      if (!translations[key]) return key;
      return translations[key][language] || translations[key].en || key;
    };

    const headerContent = (
      <>
        {/* Step 1: Entry method selection */}
        {currentStep === 1 && (
          <ParticipantEntryMethod
            language={language}
            eventName={eventName}
            onUseSingpass={this.handleUseSingpass}
            onUseManual={() => this.setState({ entryMethod: 'manual', currentStep: 2 })}
            onBack={() => onBack?.()}
            onHome={() => onHome?.()}
          />
        )}

        {/* Step 2: Particulars section (manual or SingPass pre-filled) */}
        {currentStep === 2 && (entryMethod === 'manual' || entryMethod === 'singpass') && (
          <ParticularsSection
            ref={this.particularsRef}
            language={language}
            formData={this.state.particularsData || singpassFormData || this.props.formData}
            singpassLocked={entryMethod === 'singpass'}
            onSubmit={(data) => {
              this.setState({ particularsData: data, currentStep: 3 });
            }}
            onBack={() => this.resetForm()}
            onHome={() => onHome?.()}
          />
        )}

        {/* Step 3: Health Declaration */}
        {currentStep === 3 && (
          <HealthDeclarationSection
            ref={this.healthRef}
            language={language}
            initialData={this.state.healthData}
            onSubmit={(healthData) => {
              this.setState({ healthData, currentStep: 4 });
            }}
            onBack={() => this.setState({ currentStep: 2 })}
            onHome={() => onHome?.()}
          />
        )}

        {/* Step 4: Programme Indemnity */}
        {currentStep === 4 && (
          <IndemnitySection
            ref={this.indemnityRef}
            language={language}
            initialData={this.state.indemnityData}
            onSubmit={this.handleFinalSubmit}
            onBack={() => this.setState({ currentStep: 3 })}
            onHome={() => onHome?.()}
          />
        )}




      </>
    );

      const showFooter = currentStep >= 2;

      return (
        <div className="fft-create-file-form">
          <div className="fft-participants-wrapper">
            {/* Form content */}
            {headerContent}

            {/* Centralized footer buttons */}
            {showFooter && (
              <div className="fft-form-footer">
                {currentStep === 2 && (
                  <>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.particularsRef.current?.handleClear()}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.particularsRef.current?.handleSubmit()}
                    >
                      {language === 'zh' ? '下一步' : language === 'ms' ? 'Seterusnya' : 'Next'}
                    </button>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.healthRef.current?.handleClear()}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.healthRef.current?.handleSubmit()}
                    >
                      {language === 'zh' ? '下一步' : language === 'ms' ? 'Seterusnya' : 'Next'}
                    </button>
                  </>
                )}
                {currentStep === 4 && (
                  <>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.indemnityRef.current?.handleClear()}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.indemnityRef.current?.handleSubmit()}
                    >
                      {language === 'zh' ? '提交' : language === 'ms' ? 'Hantar' : 'Submit'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      );
  }
}

export default ParticipantForm;
