import React, { Component } from 'react';
import '../../../css/fftParticipants.css';
import ParticipantEntryMethod from './ParticipantEntryMethod';
import ParticipantNumberEntry from './ParticipantNumberEntry';
import ParticularsSection from './ParticularsSection';
import HealthDeclarationSection from './HealthDeclarationSection';
import IndemnitySection from './IndemnitySection';
import RegistrationSuccessResult from './RegistrationSuccessResult';
import AlreadyRegisteredResult from './AlreadyRegisteredResult';
import { getSingPassUserDataJSON } from '../../../utils/singpassData';

class ParticipantForm extends Component {
  state = {
    entryMethod: null,
    currentStep: 1,
    particularsData: null,
    healthData: null,
    indemnityData: null,
    singpassFormData: null,
    participantNumber: null,
    isSubmitting: false,
    submissionError: null,
    alreadyRegisteredNumber: null,
    showRegistrationSuccess: false,
    showAlreadyRegisteredMessage: false,
    successEntryNumber: null,
  };

  constructor(props) {
    super(props);
    if (props.skipToParticipantNumber) {
      this.state = {
        ...this.state,
        entryMethod: 'participantNumber',
        currentStep: 1.5,
      };
    }
    // Allow caller to provide a custom storage key (e.g. staff health declaration flow)
    this.storageKey = props.storageKey || 'fftParticipantFormData';
    this.particularsStorageKey = this.storageKey.replace('fftParticipantFormData', 'fftParticularsSectionData');
    if (this.particularsStorageKey === this.storageKey) this.particularsStorageKey = `${this.storageKey}_particulars`;
  }

  particularsRef = React.createRef();
  healthRef = React.createRef();
  indemnityRef = React.createRef();

  resetForm = () => {
    if (this.props.skipToParticipantNumber) {
      this.setState({ entryMethod: 'participantNumber', currentStep: 1.5, singpassFormData: null });
    } else {
      this.setState({ entryMethod: null, currentStep: 1, singpassFormData: null });
    }
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

  handleUseParticipantNumber = (participantNumber, participantData) => {
    const prefillData = participantData ? {
      name: participantData.name ? participantData.name.trim().toLowerCase().replace(/(^\w|\s\w)/g, c => c.toUpperCase()) : '',
      dateOfBirth: participantData.dateOfBirth || '',
      age: participantData.age || '',
      gender: participantData.gender || '',
      phone: participantData.phone || participantData.phoneNumber || ''
    } : null;

    // Clear stale particulars so prefilled data is not overridden by localStorage
    localStorage.removeItem('fftParticularsSectionData');
    localStorage.removeItem(this.particularsStorageKey);

    this.setState({ 
      entryMethod: 'participantNumber', 
      currentStep: 2,
      participantNumber,
      particularsData: prefillData
    });
  };

  handleBack = () => {
    const { currentStep } = this.state;
    const { onBack } = this.props;
    if (currentStep === 1) {
      onBack?.();
    } else if (currentStep === 1.5) {
      if (this.props.skipToParticipantNumber) {
        onBack?.();
      } else {
        this.setState({ currentStep: 1, entryMethod: null });
      }
    } else if (currentStep === 2) {
      if (this.state.entryMethod === 'participantNumber') {
        this.setState({ currentStep: 1.5 });
      } else {
        this.setState({ currentStep: 1, entryMethod: null });
      }
    // Steps 3 (Health Declaration) and 4 (Indemnity) are currently disabled
    }
  };

  componentDidMount() {
    // Skip storage only if skipToParticipantNumber AND no custom storageKey was provided
    if (this.props.skipToParticipantNumber && !this.props.storageKey) return;
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.setState({
          particularsData: parsed.particularsData || null,
          healthData: parsed.healthData || null,
          indemnityData: parsed.indemnityData || null,
          currentStep: parsed.currentStep || 1,
          entryMethod: parsed.entryMethod || null,
          singpassFormData: parsed.singpassFormData || null,
          participantNumber: parsed.participantNumber || null,
        });
      }
    } catch (e) {}
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

  componentDidUpdate(prevProps, prevState) {
    const { particularsData, healthData, indemnityData, currentStep, entryMethod, singpassFormData, participantNumber } = this.state;
    if (prevState.particularsData !== particularsData || prevState.healthData !== healthData || prevState.indemnityData !== indemnityData || prevState.currentStep !== currentStep || prevState.entryMethod !== entryMethod || prevState.singpassFormData !== singpassFormData || prevState.participantNumber !== participantNumber) {
      if (!this.props.skipToParticipantNumber || this.props.storageKey) {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify({
            particularsData,
            healthData,
            indemnityData,
            currentStep,
            entryMethod,
            singpassFormData,
            participantNumber,
          }));
        } catch (e) {}
      }
    }
  }

  handleFinalSubmit = async (indemnityData) => {
    this.setState({ indemnityData, isSubmitting: true });
    const { particularsData, healthData, entryMethod, participantNumber } = this.state;
    const { event } = this.props;
    const eventName = event ? (typeof event === 'string' ? event : event.name) : '';
    // Map internal entryMethod values to display-friendly names for the backend
    const submittedEntryMethod = (entryMethod === 'manual' || entryMethod === 'singpass')
      ? 'Individual Registration'
      : entryMethod;
    // Don't await - let FFTParticipants handle the response and manage isSubmitting state
    this.props.onSubmit({ 
      ...particularsData, 
      ...healthData, 
      ...indemnityData, 
      eventName,
      entryMethod: submittedEntryMethod,
      participantNumber
    });
    // isSubmitting will be managed by FFTParticipants via ref when response is received
    // Clear saved data after successful submission
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('fftParticularsSectionData');
  }

  handleResetForm = () => {
    // Reset to initial state - clears everything
    this.setState({
      entryMethod: null,
      currentStep: 1,
      particularsData: null,
      healthData: null,
      indemnityData: null,
      singpassFormData: null,
      participantNumber: null,
      isSubmitting: false,
      submissionError: null,
      showRegistrationSuccess: false,
      showAlreadyRegisteredMessage: false,
      successEntryNumber: null,
      alreadyRegisteredNumber: null,
    });
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('fftParticularsSectionData');
    localStorage.removeItem(this.particularsStorageKey);
    localStorage.removeItem('fftHealthDeclarationData');
    localStorage.removeItem('fftIndemnityData');
    this.setState({
      entryMethod: null,
      currentStep: 1,
      particularsData: null,
      healthData: null,
      indemnityData: null,
      singpassFormData: null,
      participantNumber: null,
    });
  };

  render() {
    const { currentStep, entryMethod, singpassFormData, isSubmitting, showRegistrationSuccess, showAlreadyRegisteredMessage, successEntryNumber, submissionError, alreadyRegisteredNumber } = this.state;
    const { language, event, onBack, onHome, isLoading } = this.props;
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

    const isParticularsStep = currentStep === 2 || (currentStep === 1 && entryMethod && entryMethod !== 'participantNumber');

    const headerContent = (
      <>
        {/* Step 1: Entry method selection */}
        {currentStep === 1 && !entryMethod && (
          <ParticipantEntryMethod
            language={language}
            eventName={eventName}
            onUseSingpass={this.handleUseSingpass}
            onUseManual={() => this.setState({ entryMethod: 'manual', currentStep: 2 })}
            onUseParticipantNumber={() => this.setState({ entryMethod: 'participantNumber', currentStep: 1.5 })}
            onBack={() => onBack?.()}
            onHome={() => onHome?.()}
            showParticipantNumber={this.props.showParticipantNumber || false}
            showSingpass={this.props.showSingpass !== undefined ? this.props.showSingpass : true}
            showManual={this.props.showManual !== undefined ? this.props.showManual : true}
            titleOverride={this.props.titleOverride}
            descriptionOverride={this.props.descriptionOverride}
            trilingual={this.props.trilingual}
            onBeforeRedirect={this.props.onBeforeSingpass}
          />
        )}

        {/* Step 1.5: Participant Number Entry */}
        {currentStep === 1.5 && entryMethod === 'participantNumber' && (
          <ParticipantNumberEntry
            language={language}
            eventName={eventName}
            eventFileId={event && typeof event === 'object' ? event.id : null}
            onSubmit={this.handleUseParticipantNumber}
            onBack={() => this.setState({ entryMethod: null, currentStep: 1 })}
            onHome={() => onHome?.()}
          />
        )}

        {/* Step 2: Particulars section (manual or SingPass pre-filled) */}
        {isParticularsStep && !showRegistrationSuccess && !showAlreadyRegisteredMessage && (
          <>
            {/* Error display removed — shown in dedicated section */}
            
            <ParticularsSection
              ref={this.particularsRef}
              language={language}
              formData={this.state.particularsData || singpassFormData || this.props.formData}
              singpassLocked={entryMethod === 'singpass'}
              participantNumberLocked={entryMethod === 'participantNumber'}
              storageKey={this.particularsStorageKey}
              onSubmit={(data) => {
                this.setState({ particularsData: data }, () => {
                  this.handleFinalSubmit({});
                });
              }}
              onBack={() => this.setState(
                entryMethod === 'participantNumber'
                  ? { currentStep: 1.5 }
                  : { currentStep: 1, entryMethod: null }
              )}
              onHome={() => onHome?.()}
              trilingual={this.props.trilingual}
            />
          </>
        )}

        {/* Show success result inline */}
        {isParticularsStep && showRegistrationSuccess && successEntryNumber != null && (
          <RegistrationSuccessResult
            language={language}
            entryNumber={successEntryNumber}
            onResetForm={this.handleResetForm}
            onFinish={() => onHome?.()}
          />
        )}

        {/* Show already registered result inline */}
        {isParticularsStep && showAlreadyRegisteredMessage && (
          <AlreadyRegisteredResult
            language={language}
            errorMessage={submissionError}
            onResetForm={this.handleResetForm}
            onFinish={() => onHome?.()}
          />
        )}

        {/* Step 3: Health Declaration — currently disabled */}
        {/* {currentStep === 3 && (
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
        )} */}

        {/* Step 4: Programme Indemnity — currently disabled */}
        {/* {currentStep === 4 && (
          <IndemnitySection
            ref={this.indemnityRef}
            language={language}
            initialData={this.state.indemnityData}
            onSubmit={this.handleFinalSubmit}
            onBack={() => this.setState({ currentStep: 3 })}
            onHome={() => onHome?.()}
          />
        )} */}
      </>
    );

      const showFooter = (currentStep >= 2 || isParticularsStep) && !showRegistrationSuccess && !showAlreadyRegisteredMessage;

      return (
        <div className="fft-create-file-form">
          <div className="fft-participants-wrapper">
            {/* Form content */}
            {headerContent}

            {/* Loading modal during submission */}
            {isSubmitting && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  background: '#fff', borderRadius: '16px',
                  padding: '40px 48px', textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  minWidth: '240px',
                }}>
                  <div style={{
                    width: '44px', height: '44px', margin: '0 auto 20px',
                    border: '4px solid #e0e0e0', borderTopColor: '#1565c0',
                    borderRadius: '50%',
                    animation: 'fftSpin 0.8s linear infinite',
                  }} />
                  <div style={{ fontSize: '1.05em', color: '#333', fontWeight: 600 }}>
                    {language === 'zh' ? '提交中...' : language === 'ms' ? 'Menghantar...' : 'Submitting...'}
                  </div>
                </div>
              </div>
            )}

            {/* Centralized footer buttons */}
            {showFooter && (
              <div className="fft-form-footer">
                {isParticularsStep && !showRegistrationSuccess && !showAlreadyRegisteredMessage && (
                  <>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.particularsRef.current?.handleClear()}
                      disabled={isLoading || entryMethod === 'participantNumber'}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.particularsRef.current?.handleSubmit()}
                      disabled={isLoading || isSubmitting}
                      style={{
                        background: 'transparent',
                        borderColor: '#2e7d32',
                        color: '#2e7d32',
                      }}
                    >
                      {language === 'zh' ? '提交' : language === 'ms' ? 'Hantar' : 'Submit'}
                    </button>
                  </>
                )}
                {currentStep === 3 && (
                  <>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.healthRef.current?.handleClear()}
                      disabled={isLoading}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.healthRef.current?.handleSubmit()}
                      disabled={isLoading}
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
                      disabled={isLoading}
                    >
                      {language === 'zh' ? '清空' : language === 'ms' ? 'Kosongkan' : 'Clear'}
                    </button>
                    <button
                      type="button"
                      className="fft-create-event-btn fft-create-event-btn-clear"
                      onClick={() => this.indemnityRef.current?.handleSubmit()}
                      disabled={isSubmitting}
                      style={{
                        background: 'transparent',
                        borderColor: '#2e7d32',
                        color: '#2e7d32',
                      }}
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
