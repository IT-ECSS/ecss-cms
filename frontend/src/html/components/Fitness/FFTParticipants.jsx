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
          padding: '40px 32px', textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          minWidth: '280px', maxWidth: '360px', width: '90%',
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

class SelectedLanguageBadge extends Component {
  render() {
    const { language, onClick, showPlaceholder } = this.props;
    const labels = { en: 'English', zh: '中文', ms: 'Bahasa Melayu' };
    const sectionLabel = { en: 'Language', zh: '语言', ms: 'Bahasa' };
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseUp={(e) => e.currentTarget.blur()}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '14px 20px', flex: '0 0 calc(50% - 4px)', textAlign: 'left',
          background: '#e3f0ff',
          border: 'none',
          borderBottom: '2px solid #c5d9f5',
          cursor: 'pointer',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <span style={{ fontSize: '1.125em', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
          {sectionLabel[language] || 'Language'}
        </span>
        <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#1565c0' }}>
          {showPlaceholder ? '-' : (labels[language] || language)}
        </span>
      </button>
    );
  }
}

class SelectedEventBadge extends Component {
  render() {
    const { event, language, onClick, showPlaceholder } = this.props;
    const name = typeof event === 'string' ? event : (event?.name || '');
    const sectionLabel = { en: 'Event', zh: '活动', ms: 'Acara' };
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseUp={(e) => e.currentTarget.blur()}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '14px 20px', flex: '0 0 calc(50% - 4px)', textAlign: 'left',
          background: '#e8f5e9',
          border: 'none',
          borderBottom: '2px solid #b2dfcf',
          cursor: 'pointer',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <span style={{ fontSize: '1.125em', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
          {sectionLabel[language] || 'Event'}
        </span>
        <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#2e7d32', wordBreak: 'break-word' }}>
          {showPlaceholder ? '-' : name}
        </span>
      </button>
    );
  }
}

class SelectedSlotBadge extends Component {
  render() {
    const { slot, language, onClick, showPlaceholder } = this.props;
    const slotWord = fftTranslations.timeSlotLabel?.[language] || fftTranslations.timeSlotLabel?.en || 'Time Slot';
    // Format + localize: "Slot 1: 09:00-10:00" → "时间段 1: 09:00 - 10:00"
    const normalized = slot ? slot.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/, '$1 - $2') : slot;
    const slotMatch = String(normalized || '').match(/^Slot\s*(\d+)\s*:\s*(.*)$/i);
    const slotLabel = slotMatch ? `${slotWord} ${slotMatch[1]}: ${slotMatch[2]}` : normalized;
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseUp={(e) => e.currentTarget.blur()}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '14px 20px', flex: '0 0 calc(50% - 4px)', textAlign: 'left',
          background: '#fff3e0',
          border: 'none',
          borderBottom: '2px solid #ffe0b2',
          cursor: 'pointer',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <span style={{ fontSize: '1.125em', color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
          {slotWord}
        </span>
        <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#e65100', wordBreak: 'break-word' }}>
          {showPlaceholder ? '-' : slotLabel}
        </span>
      </button>
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
      submitError: null,
      entryNumber: null,
      pendingReturnTo: null,
      reselecting: null,
      showHomeConfirm: false,
    };
  }

  storageKey = 'fftParticipantsSelection';
  formRef = React.createRef();

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
    localStorage.removeItem('fftParticularsSectionData');
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
    this.setState({ showHomeConfirm: false });
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('fftParticipantFormData');
    localStorage.removeItem('fftParticularsSectionData');
    localStorage.removeItem('fftHealthDeclarationData');
    localStorage.removeItem('fftIndemnityData');
    localStorage.removeItem('fftRegistrationSelection');
    this.setState({ language: null, event: null, slot: null, formData: null, showEntryNumber: false, entryNumber: null, showLoadingModal: false, showResultModal: false, submitError: null });
    const goHome = this.props.onHome || this.props.onBack;
    goHome?.();
  };

  handleFormSubmit = async (data) => {
    this.setState({ showResultModal: false, submitError: null, entryNumber: null });
    
    // For pre-registered participants, skip backend submission
    if (data.entryMethod === 'participantNumber' && data.participantNumber) {
      console.log('[FFT] Pre-registered participant - skipping backend submission');
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
        });
      } else {
        this.setState({ showResultModal: true, submitError: errData?.error || err.message || 'Submission failed.' });
      }
    }
  };

  componentDidMount() {
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
    if (prevState.language !== language || prevState.event !== event || prevState.slot !== this.state.slot || prevState.showEntryNumber !== this.state.showEntryNumber || prevState.entryNumber !== this.state.entryNumber) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({ language, event, slot: this.state.slot, showEntryNumber: this.state.showEntryNumber, entryNumber: this.state.entryNumber }));
      } catch (e) {
        // ignore storage errors
      }
    }
  }

  render() {
    const { language, event, slot, reselecting, formData, showLoadingModal, showResultModal, showEntryNumber, submitError, entryNumber, showHomeConfirm } = this.state;
    const step = reselecting || (!language ? 'language' : !event ? 'event' : !slot ? 'slot' : 'form');
    const backTitle = language === 'zh' ? '返回' : language === 'ms' ? 'Kembali' : 'Back';
    const homeTitle = language === 'zh' ? '主页' : language === 'ms' ? 'Rumah' : 'Home';

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-form">
          {/* Persistent navigation header */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', padding: '16px 16px 12px', gap: 10 }}>
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
              <button
                type="button"
                className="fft-participants-icon-btn"
                onClick={this.handleHome}
                title={homeTitle}
              >
                <i className="fas fa-home"></i>
              </button>
            </div>

            {/* Right: description + badges stacked */}
            {language && !this.props.hideStatus && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '1.3125em', color: '#555' }}>
                  {slot
                    ? (fftTranslations.headerDescWithSlot?.[language] ?? fftTranslations.headerDescWithSlot?.en)
                    : (fftTranslations.headerDesc?.[language] ?? fftTranslations.headerDesc?.en)}
                </span>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <SelectedLanguageBadge
                    language={language}
                    showPlaceholder={reselecting === 'language'}
                    onClick={() => this.setState({ reselecting: 'language', showEntryNumber: false })}
                  />
                  {event && (
                    <SelectedEventBadge
                      event={event}
                      language={language}
                      showPlaceholder={reselecting === 'event'}
                      onClick={() => this.setState({ reselecting: 'event', showEntryNumber: false })}
                    />
                  )}
                  {event && slot && (
                    <SelectedSlotBadge
                      slot={slot}
                      language={language}
                      showPlaceholder={reselecting === 'slot'}
                      onClick={() => this.setState({ reselecting: 'slot', showEntryNumber: false })}
                    />
                  )}
                </div>
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
                localStorage.removeItem('fftParticularsSectionData');
                localStorage.removeItem('fftHealthDeclarationData');
                localStorage.removeItem('fftIndemnityData');
                this.setState({ slot: null });
              }}
              onHome={this.props.onBack}
              isLoading={showLoadingModal}
              showParticipantNumber={this.props.showParticipantNumber || false}
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
              onHome={this.handleHome}
              onFinish={this.handleFinish}
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
