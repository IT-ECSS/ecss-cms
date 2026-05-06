import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/fftParticipants.css';
import LanguageSelection from './LanguageSelection';
import EventSelection from './EventSelection';
import TimeSlotSelection from './TimeSlotSelection';
import ParticipantForm from './ParticipantForm';
import ParticipantEntryNumber from './ParticipantEntryNumber';
import fftTranslations from './fftTranslations';
import HomeConfirmModal from './HomeConfirmModal';
import { SelectionBadgesBar } from './SelectionBadges';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const FFT_FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';

class SubmitResultModal extends Component {
  render() {
    const { language, entryNumber, error, onHome, onRetry } = this.props;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#fff', borderRadius: '16px',
          padding: 'clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px)', textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          maxWidth: '360px', width: '90%',
          maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto',
          boxSizing: 'border-box',
        }}>
          {error ? (
            <>
              <div style={{ fontSize: '2.2em', marginBottom: '12px' }}>❌</div>
              <h3 style={{ color: '#d32f2f', marginBottom: '8px', fontWeight: 700 }}>
                {language === 'zh' ? '提交失败' : language === 'ms' ? 'Gagal Dihantar' : 'Submission Failed'}
              </h3>
              <p style={{ color: '#666', fontSize: '0.9em', marginBottom: entryNumber != null ? '16px' : '24px', wordBreak: 'break-word' }}>{error}</p>
              {entryNumber != null && (
                <div style={{
                  display: 'inline-block', padding: '12px 28px',
                  borderRadius: '12px', background: '#fff3e0',
                  border: '2px solid #e65100', marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '0.75em', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>
                    {language === 'zh' ? '已注册编号' : language === 'ms' ? 'Nombor Peserta Sedia Ada' : 'Existing Participant #'}
                  </div>
                  <div style={{ fontSize: '2.5em', fontWeight: 800, color: '#e65100', lineHeight: 1 }}>{entryNumber}</div>
                </div>
              )}
              <button
                type="button"
                className="fft-create-event-btn fft-create-event-btn-clear"
                style={{ width: '100%' }}
                onClick={entryNumber != null ? onHome : onRetry}
              >
                {entryNumber != null
                  ? (language === 'zh' ? '查看编号' : language === 'ms' ? 'Lihat Nombor' : 'View My Number')
                  : (language === 'zh' ? '重试' : language === 'ms' ? 'Cuba semula' : 'Try Again')}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="32" fill="#e8f5e9" />
                  <path d="M18 33L27 43L46 23" stroke="#2e7d32" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: '6px', color: '#222' }}>
                {fftTranslations.successTitle[language] || fftTranslations.successTitle.en}
              </h3>
              <p style={{ color: '#555', fontSize: '0.9em', marginBottom: '20px' }}>
                {fftTranslations.successMessage[language] || fftTranslations.successMessage.en}
              </p>
              {entryNumber != null && (
                <div style={{
                  display: 'inline-block', padding: '16px 32px',
                  borderRadius: '12px', background: '#f5f5f5',
                  border: '2px solid #2e7d32', marginBottom: '24px',
                }}>
                  <div style={{ fontSize: '0.75em', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>
                    {language === 'zh' ? '参与者编号' : language === 'ms' ? 'Nombor Peserta' : 'Entry Number'}
                  </div>
                  <div style={{ fontSize: '2.5em', fontWeight: 800, color: '#2e7d32', lineHeight: 1 }}>{entryNumber}</div>
                </div>
              )}
              <button
                type="button"
                className="fft-create-event-btn fft-create-event-btn-clear"
                style={{ width: '100%' }}
                onClick={onHome}
              >
                {language === 'zh' ? '返回主页' : language === 'ms' ? 'Kembali ke Utama' : 'Back to Home'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
}

class FFTParticipants extends Component {
  constructor(props) {
    super(props);
    this.state = {
      language: props.initialLanguage || null,
      // Pre-select event when coming from Registration section
      event: props.initialEvent || null,
      slot: null,
      formData: {},
      showLoadingModal: false,
      showResultModal: false,
      showEntryNumber: false,
      isAlreadyRegistered: false,
      submitError: null,
      entryNumber: null,
      pendingReturnTo: null,
      reselecting: null,
      showHomeConfirm: false,
    };
  }

  formRef = React.createRef();

  get storageKey() {
    // Stable key scoped only by storageScope so mount and save always resolve to the
    // same string (event name can't be included here — it's null at mount time).
    const prefix = this.props.storageScope ? `${this.props.storageScope}_` : '';
    return `${prefix}fftParticipantsSelection`;
  }

  get particularsStorageKey() {
    // Mirrors ParticipantForm's particularsStorageKey logic
    const base = this.props.storageScope ? `${this.props.storageScope}_fftParticipantFormData` : 'fftParticipantFormData';
    return base.replace('fftParticipantFormData', 'fftParticularsSectionData');
  }

  handleBack = () => {
    const { language, event, slot, showEntryNumber, reselecting } = this.state;
    if (showEntryNumber) {
      this.setState({ showEntryNumber: false });
    } else if (reselecting) {
      this.setState({ reselecting: null });
    } else if (language && event && slot) {
      this.formRef.current?.handleBack();
    } else if (language && event) {
      // At slot selection — if event was pre-selected by parent, go back to parent
      if (this.props.initialEvent) {
        this.props.onBack?.();
      } else {
        this.setState({ event: null });
      }
    } else if (language) {
      if (this.props.initialLanguage) {
        this.props.onBack?.();
      } else {
        this.setState({ language: null });
      }
    } else {
      this.props.onBack?.();
    }
  };

  handleHome = () => {
    this.setState({ showHomeConfirm: true });
  };

  handleHomeYes = () => {
    // Leave — clear all saved data and go home
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('fftParticipantFormData');
    localStorage.removeItem(`${this.props.storageScope ? this.props.storageScope + '_' : ''}fftParticipantFormData`);
    localStorage.removeItem('fftParticularsSectionData');
    localStorage.removeItem(this.particularsStorageKey);
    localStorage.removeItem('fftHealthDeclarationData');
    localStorage.removeItem('fftIndemnityData');
    localStorage.removeItem('fftRegistrationSelection');
    this.setState({ showHomeConfirm: false });
    const goHome = this.props.onHome || this.props.onBack;
    goHome?.();
  };

  handleHomeNo = () => {
    // Stay — go home but preserve localStorage so they can resume when they come back
    this.setState({ showHomeConfirm: false });
    const goHome = this.props.onHome || this.props.onBack;
    goHome?.();
  };

  handleFinish = () => {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('fftParticipantFormData');
    localStorage.removeItem(`${this.props.storageScope ? this.props.storageScope + '_' : ''}fftParticipantFormData`);
    localStorage.removeItem('fftParticularsSectionData');
    localStorage.removeItem(this.particularsStorageKey);
    localStorage.removeItem('fftHealthDeclarationData');
    localStorage.removeItem('fftIndemnityData');
    localStorage.removeItem('fftRegistrationSelection');
    // Public form (kiosk): call onHome (closes tab) if provided, otherwise reset to start
    if (this.props.showParticipantNumber === false) {
      if (this.props.onHome) {
        this.props.onHome();
        return;
      }
      this.setState({ language: null, event: null, slot: null, formData: null, showEntryNumber: false, isAlreadyRegistered: false, entryNumber: null, showLoadingModal: false, showResultModal: false, submitError: null, showHomeConfirm: false });
      return;
    }
    this.setState({ language: null, event: null, slot: null, formData: null, showEntryNumber: false, isAlreadyRegistered: false, entryNumber: null, showLoadingModal: false, showResultModal: false, submitError: null, showHomeConfirm: false });
    const goHome = this.props.onHome || this.props.onBack;
    goHome?.();
  };

  handleFormSubmit = async (data) => {
    this.setState({ showResultModal: false, submitError: null, entryNumber: null, isAlreadyRegistered: false });
    
    // For pre-registered participants, skip backend submission
    if (data.entryMethod === 'participantNumber' && data.participantNumber) {
      this.setState({ showResultModal: false, showEntryNumber: true, entryNumber: data.participantNumber });
      return;
    }

    try {
      const { event, slot } = this.state;
      const eventName = event?.name || '';
      const eventFileId = event?.id || '';

      // Parse selected slot like "Slot 1: 09:00-10:00" to start/end times for sheet columns H/I.
      const slotMatch = String(slot || '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      const startTime = slotMatch ? slotMatch[1] : '';
      const endTime = slotMatch ? slotMatch[2] : '';

      const participantData = {
        ...data,
        startTime,
        endTime,
      };

      const response = await axios.post(`${BACKEND_URL}/googleDrive/fftSubmit`, {
        folderId: FFT_FOLDER_ID,
        eventName,
        eventFileId,
        participantData,
        entryMethod: data.entryMethod,
        participantNumber: data.participantNumber,
      });
      if (response.data?.alreadyRegistered) {
        this.setState({
          showResultModal: false,
          showEntryNumber: true,
          entryNumber: response.data.participantNumber ?? null,
          isAlreadyRegistered: true,
        });
        return;
      }
      if (response.data.success) {
        this.setState({ showResultModal: false, showEntryNumber: true, entryNumber: response.data.entryNumber });
      } else {
        this.setState({ showResultModal: true, submitError: response.data.error || 'Submission failed.' });
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.alreadyRegistered) {
        // Participant already registered — go directly to entry number screen
        this.setState({
          showResultModal: false,
          showEntryNumber: true,
          entryNumber: errData.participantNumber ?? null,
          isAlreadyRegistered: true,
        });
      } else {
        this.setState({ showResultModal: true, submitError: errData?.error || err.message || 'Submission failed.' });
      }
    }
  };

  componentDidMount() {
    // Public form (kiosk): always start fresh — never restore previous session
    // EXCEPTION: if returning from SingPass, restore language + slot so the form reopens at personal particulars
    if (this.props.showParticipantNumber === false) {
      if (sessionStorage.getItem('singpass_user_data_json')) {
        try {
          const saved = sessionStorage.getItem('fft_singpass_return_state');
          if (saved) {
            const { language, slot } = JSON.parse(saved);
            this.setState({ language: language || null, slot: slot || null });
            sessionStorage.removeItem('fft_singpass_return_state');
          }
        } catch (e) {}
      }
      return;
    }
    // If returning from SingPass, restore language + event + slot from sessionStorage.
    // (localStorage can't be reliably read at mount time because storageKey includes the
    // event name, which isn't known until state is set — chicken-and-egg problem.)
    if (sessionStorage.getItem('singpass_user_data_json')) {
      try {
        const saved = sessionStorage.getItem('fft_singpass_return_state');
        if (saved) {
          const { language, event, slot } = JSON.parse(saved);
          this.setState({
            language: this.props.initialLanguage || language || null,
            event: this.props.initialEvent || event || null,
            slot: slot || null,
          });
          sessionStorage.removeItem('fft_singpass_return_state');
          return;
        }
      } catch (e) {}
    }
    // Normal restore from localStorage (non-SingPass navigation)
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.setState({
            // Props override stored language/event (parent pre-selected them),
            // but slot/entryNumber/showEntryNumber are always restored from localStorage
            // so returning from Home picks up exactly where the user left off.
            language: this.props.initialLanguage || parsed.language || null,
            event: this.props.initialEvent || parsed.event || null,
            slot: parsed.slot || null,
            showEntryNumber: parsed.showEntryNumber || false,
            entryNumber: parsed.entryNumber != null ? parsed.entryNumber : null,
          });
        }
      }
    } catch (e) {
      // ignore invalid JSON or storage errors
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { language, event, pendingReturnTo } = this.state;
    if (pendingReturnTo && language && event) {
      if (pendingReturnTo === 'entry') {
        this.setState({ showEntryNumber: true, pendingReturnTo: null });
      } else {
        this.setState({ pendingReturnTo: null }); // form shows automatically
      }
    }
    // Public form (kiosk): never persist state to localStorage
    if (this.props.showParticipantNumber !== false) {
      if (prevState.language !== language || prevState.event !== event || prevState.slot !== this.state.slot || prevState.showEntryNumber !== this.state.showEntryNumber || prevState.entryNumber !== this.state.entryNumber) {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify({ language, event, slot: this.state.slot, showEntryNumber: this.state.showEntryNumber, entryNumber: this.state.entryNumber }));
        } catch (e) {
          // ignore storage errors
        }
        if (prevState.language !== language || prevState.event !== event || prevState.slot !== this.state.slot) {
          this.props.onSelectionChange?.(language, event, this.state.slot);
        }
      }
    }
  }

  render() {
    const { language, event, slot, reselecting, formData, showLoadingModal, showResultModal, showEntryNumber, isAlreadyRegistered, submitError, entryNumber, showHomeConfirm } = this.state;
    const step = reselecting || (!language ? 'language' : !event ? 'event' : !slot ? 'slot' : 'form');
    const backTitle = language === 'zh' ? '返回' : language === 'ms' ? 'Kembali' : 'Back';
    const homeTitle = language === 'zh' ? '主页' : language === 'ms' ? 'Rumah' : 'Home';

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-form">
          {/* Persistent navigation header */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', flexWrap: 'wrap', width: '100%', padding: '16px 16px 12px', gap: 10 }}>
            {/* Left: nav buttons */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              {!(this.props.hideBackOnLanguage && step === 'language') && (
                <button
                  type="button"
                  className="fft-participants-icon-btn"
                  onClick={this.handleBack}
                  title={backTitle}
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
              )}
              {this.props.showParticipantNumber !== false && (
                <button
                  type="button"
                  className="fft-participants-icon-btn"
                  onClick={this.handleHome}
                  title={homeTitle}
                >
                  <i className="fas fa-home"></i>
                </button>
              )}
            </div>

            {/* Right: description + badges stacked */}
            {language && !this.props.hideStatus && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 280px', minWidth: 0 }}>
                <span style={{ fontSize: '1.3125em', color: '#555' }}>
                  {slot
                    ? (fftTranslations.headerDescWithSlot?.[language] ?? fftTranslations.headerDescWithSlot?.en)
                    : (fftTranslations.headerDesc?.[language] ?? fftTranslations.headerDesc?.en)}
                </span>
                <SelectionBadgesBar
                  noBorder
                  sizeMultiplier={1.25}
                  disableContainerFlex
                  badgeVariant="registration"
                  language={language}
                  event={event}
                  slot={slot}
                  onLanguageClick={() => this.setState({ reselecting: 'language', showEntryNumber: false })}
                  onEventClick={this.props.lockEvent ? undefined : () => this.setState({ reselecting: 'event', showEntryNumber: false })}
                  onSlotClick={() => this.setState({ reselecting: 'slot', showEntryNumber: false })}
                  showLanguagePlaceholder={reselecting === 'language'}
                  showEventPlaceholder={reselecting === 'event'}
                  showSlotPlaceholder={reselecting === 'slot'}
                />
              </div>
            )}
          </div>

          {/* Step 1: language selection */}
          {step === 'language' && !showEntryNumber && (
            <LanguageSelection
              selectedLanguage={language}
              onSelectLanguage={(lang) => {
                // Language is just a preference — keep event & slot, return to form
                this.setState({ language: lang, reselecting: null });
              }}
              trilingual={this.props.trilingual}
              pageTitle={this.props.languagePageTitle}
            />
          )}

          {/* Step 2: event selection */}
          {step === 'event' && !showEntryNumber && (
            <EventSelection
              language={language}
              onSelectEvent={(evt) => {
                this.setState({ event: evt, reselecting: null });
              }}
            />
          )}

          {/* Step 3: time slot selection */}
          {step === 'slot' && !showEntryNumber && (
            <TimeSlotSelection
              language={language}
              event={event}
              showSlotStatus={this.props.storageScope !== 'kiosk'}
              onSelectSlot={(s) => {
                // Slot selected — return to form
                this.setState({ slot: s, reselecting: null });
              }}
            />
          )}

          {/* Step 4: participant form */}
          {step === 'form' && !showEntryNumber && (
            <ParticipantForm
              ref={this.formRef}
              language={language}
              event={event}
              slot={slot}
              formData={formData}
              onSubmit={this.handleFormSubmit}
              onBack={() => {
                localStorage.removeItem('fftParticipantFormData');
                localStorage.removeItem(`${this.props.storageScope ? this.props.storageScope + '_' : ''}fftParticipantFormData`);
                localStorage.removeItem('fftParticularsSectionData');
                localStorage.removeItem(this.particularsStorageKey);
                localStorage.removeItem('fftHealthDeclarationData');
                localStorage.removeItem('fftIndemnityData');
                this.setState({ slot: null });
              }}
              onHome={this.props.onBack}
              isLoading={showLoadingModal}
              showParticipantNumber={this.props.showParticipantNumber || false}
              storageKey={this.props.storageScope ? `${this.props.storageScope}_fftParticipantFormData` : undefined}
              onBeforeSingpass={() => {
                const { language, event, slot } = this.state;
                try { sessionStorage.setItem('fft_singpass_return_state', JSON.stringify({ language, event, slot })); } catch (e) {}
              }}
            />
          )}

          {/* Submit result modal — shown after API call completes */}
          {showResultModal && (
            <SubmitResultModal
              language={language}
              entryNumber={entryNumber}
              error={submitError}
              onHome={() => this.setState({ showResultModal: false, showEntryNumber: true })}
              onRetry={() => this.setState({ showResultModal: false, submitError: null })}
            />
          )}

          {/* Entry number screen — shown after success modal is dismissed */}
          {showEntryNumber && (
            <ParticipantEntryNumber
              language={language}
              entryNumber={entryNumber}
              isAlreadyRegistered={isAlreadyRegistered}
              onHome={this.handleHome}
              onFinish={this.handleFinish}
              showParticipantNumber={this.props.showParticipantNumber !== false}
            />
          )}

          <HomeConfirmModal
            visible={showHomeConfirm}
            language={language}
            onYes={this.handleHomeYes}
            onNo={this.handleHomeNo}
            onCancel={() => this.setState({ showHomeConfirm: false })}
          />
        </div>
      </div>
    );
  }
}

export default FFTParticipants;
