import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/fftParticipants.css';
import LanguageSelection from './LanguageSelection';
import EventSelection from './EventSelection';
import ParticipantForm from './ParticipantForm';
import ParticipantEntryNumber from './ParticipantEntryNumber';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const FFT_FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';

class SubmitLoadingModal extends Component {
  render() {
    const { language } = this.props;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
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
    );
  }
}

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
              <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '24px', wordBreak: 'break-word' }}>{error}</p>
              <button
                type="button"
                className="fft-create-event-btn fft-create-event-btn-clear"
                style={{ width: '100%' }}
                onClick={onRetry}
              >
                {language === 'zh' ? '重试' : language === 'ms' ? 'Cuba semula' : 'Try Again'}
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
                {language === 'zh' ? '提交成功！' : language === 'ms' ? 'Berjaya Dihantar!' : 'Submitted Successfully!'}
              </h3>
              <p style={{ color: '#555', fontSize: '0.9em', marginBottom: '20px' }}>
                {language === 'zh' ? '您的参与者资料已成功登记。' : language === 'ms' ? 'Maklumat peserta anda telah berjaya didaftarkan.' : 'Your participant details have been registered.'}
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
  state = {
    language: null,
    event: null,
    formData: {},
    showLoadingModal: false,
    showResultModal: false,
    showEntryNumber: false,
    submitError: null,
    entryNumber: null,
  };

  storageKey = 'fftParticipantsSelection';
  formRef = React.createRef();

  handleBack = () => {
    const { language, event } = this.state;
    if (language && event) {
      this.formRef.current?.handleBack();
    } else if (language) {
      this.setState({ language: null });
    } else {
      this.props.onBack?.();
    }
  };

  handleHome = () => {
    this.props.onBack?.();
  };

  handleFormSubmit = async (data) => {
    const { event } = this.state;
    const eventName = typeof event === 'string' ? event : (event?.name || '');
    const eventFileId = typeof event === 'object' ? (event?.id || null) : null;
    this.setState({ showLoadingModal: true, showResultModal: false, submitError: null, entryNumber: null });
    try {
      const response = await axios.post(`${BACKEND_URL}/googleDrive/fftSubmit`, {
        folderId: FFT_FOLDER_ID,
        eventName,
        eventFileId,
        participantData: data,
      });
      if (response.data.success) {
        this.setState({ showLoadingModal: false, showResultModal: false, showEntryNumber: true, entryNumber: response.data.entryNumber });
      } else {
        this.setState({ showLoadingModal: false, showResultModal: true, submitError: response.data.error || 'Submission failed.' });
      }
    } catch (err) {
      this.setState({ showLoadingModal: false, showResultModal: true, submitError: err.response?.data?.error || err.message || 'Submission failed.' });
    }
  };

  componentDidMount() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.setState({
            language: parsed.language || null,
            event: parsed.event || null,
          });
        }
      }
    } catch (e) {
      // ignore invalid JSON or storage errors
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.language !== this.state.language || prevState.event !== this.state.event) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({
          language: this.state.language,
          event: this.state.event,
        }));
      } catch (e) {
        // ignore storage errors
      }
    }
  }

  render() {
    const { language, event, formData, showLoadingModal, showResultModal, showEntryNumber, submitError, entryNumber } = this.state;
    const backTitle = language === 'zh' ? '返回' : language === 'ms' ? 'Kembali' : 'Back';
    const homeTitle = language === 'zh' ? '主页' : language === 'ms' ? 'Rumah' : 'Home';

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-form">
          {/* Persistent navigation header */}
          <div className="fft-participants-header-top-row" style={{ padding: '16px 16px 0', gap: 10 }}>
            <button
              type="button"
              className="fft-participants-icon-btn"
              onClick={this.handleBack}
              title={backTitle}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <button
              type="button"
              className="fft-participants-icon-btn"
              onClick={this.handleHome}
              title={homeTitle}
            >
              <i className="fas fa-home"></i>
            </button>
          </div>

          {/* Step 1: language selection */}
          {!language && (
            <LanguageSelection
              selectedLanguage={language}
              onSelectLanguage={(lang) => this.setState({ language: lang })}
            />
          )}

          {/* Step 2: event selection */}
          {language && !event && (
            <EventSelection
              language={language}
              onSelectEvent={(evt) => this.setState({ event: evt })}
            />
          )}

          {/* Step 3: participant form */}
          {language && event && !showEntryNumber && (
            <ParticipantForm
              ref={this.formRef}
              language={language}
              event={event}
              formData={formData}
              onSubmit={this.handleFormSubmit}
              onBack={() => this.setState({ event: null })}
              onHome={this.props.onBack}
            />
          )}

          {/* Submit loading modal — shown while API call is in progress */}
          {showLoadingModal && (
            <SubmitLoadingModal language={language} />
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
            />
          )}
        </div>
      </div>
    );
  }
}

export default FFTParticipants;
