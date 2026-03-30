import React, { Component } from 'react';
import EventSelection from './EventSelection';
import LanguageSelection from './LanguageSelection';
import RegistrationSection from './RegistrationSection';
import BulkUpload from './BulkUpload';
import FFTParticipants from './FFTParticipants';
import HomeConfirmModal from './HomeConfirmModal';
import '../../../css/fftParticipants.css';
import '../../../css/fftStaff.css';

class FFTRegistration extends Component {
  constructor(props) {
    super(props);
    this.state = {
      view: 'selectLanguage',
      language: null,
      event: null,
      reselecting: null,
      previousView: null,
      showHomeConfirm: false,
    };
    this.bulkUploadRef = React.createRef();
  }

  storageKey = 'fftRegistrationSelection';

  componentDidMount() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.setState({
            view: parsed.view || 'selectLanguage',
            language: parsed.language || null,
            event: parsed.event || null,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { view, language, event } = this.state;
    if (prevState.view !== view || prevState.language !== language || prevState.event !== event) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({ view, language, event }));
      } catch (e) {
        // ignore
      }
    }
  }

  handleHomeYes = () => {
    // Leave — clear saved state and go home
    localStorage.removeItem(this.storageKey);
    this.bulkUploadRef?.current?.handleReset?.();
    this.setState({ showHomeConfirm: false, view: 'selectLanguage', language: null, event: null });
    this.props.onBack?.();
  };

  handleHomeNo = () => {
    // Stay — go home but preserve localStorage so they can resume when they come back
    this.setState({ showHomeConfirm: false });
    this.props.onBack?.();
  };

  handleBack = () => {
    const { view } = this.state;

    if (view === 'bulkUpload') {
      const bulkUpload = this.bulkUploadRef?.current;
      if (bulkUpload) {
        const { reviewing, files } = bulkUpload.state;
        if (reviewing) {
          bulkUpload.setState({ reviewing: false });
          return;
        }
        if (files && files.length > 0) {
          bulkUpload.handleClear();
          return;
        }
        bulkUpload.handleReset();
      }
      this.setState({ view: 'registrationMenu' });
      return;
    }

    if (view === 'registrationMenu') {
      this.setState({ view: 'selectEvent' });
      return;
    }

    if (view === 'selectEvent') {
      this.setState({ view: 'selectLanguage' });
      return;
    }

    if (view === 'selectLanguage') {
      this.props.onBack?.();
    }
  };

  render() {
    const { onBack } = this.props;
    const { view, language, event, reselecting, previousView, showHomeConfirm } = this.state;

    // Individual Registration: let FFTParticipants manage its own full UI and navigation
    if (view === 'individualRegistration') {
      return (
        <FFTParticipants
          onBack={() => this.setState({ view: 'registrationMenu' })}
          onHome={this.props.onBack}
          initialEvent={event}
          initialLanguage={language}
        />
      );
    }

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-form">

          {/* Persistent navigation header — matches FFTParticipants layout */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', padding: '16px 16px 12px', gap: 10 }}>
            {/* Left: nav buttons */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                className="fft-participants-icon-btn"
                onClick={this.handleBack}
                title="Back"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <button
                type="button"
                className="fft-participants-icon-btn"
                onClick={() => this.setState({ showHomeConfirm: true })}
                title="Home"
              >
                <i className="fas fa-home"></i>
              </button>
            </div>

            {/* Right: description + badges stacked */}
            {language && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '1.3125em', color: '#555' }}>
                  Click on a badge below to re-select your language{event ? ' or event' : ''}
                </span>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {/* Language badge */}
                  <button
                    type="button"
                    onClick={() => this.setState({ view: 'selectLanguage', reselecting: 'language', previousView: view })}
                    onMouseUp={(e) => e.currentTarget.blur()}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 6,
                      padding: '14px 20px', flex: '0 0 calc(50% - 4px)', textAlign: 'left',
                      background: '#e3f0ff', border: 'none', borderBottom: '2px solid #c5d9f5',
                      cursor: 'pointer', boxSizing: 'border-box', outline: 'none',
                      boxShadow: 'none', appearance: 'none', WebkitAppearance: 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.125em', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Language</span>
                    <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#1565c0' }}>
                      {reselecting === 'language' ? '-' : ({ en: 'English', zh: '中文', ms: 'Bahasa Melayu' }[language] || language)}
                    </span>
                  </button>
                  {/* Event badge */}
                  {event && (
                    <button
                      type="button"
                      onClick={() => this.setState({ view: 'selectEvent', reselecting: 'event', previousView: view })}
                      onMouseUp={(e) => e.currentTarget.blur()}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        padding: '14px 20px', flex: '0 0 calc(50% - 4px)', textAlign: 'left',
                        background: '#e8f5e9', border: 'none', borderBottom: '2px solid #b2dfcf',
                        cursor: 'pointer', boxSizing: 'border-box', outline: 'none',
                        boxShadow: 'none', appearance: 'none', WebkitAppearance: 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.125em', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Event</span>
                      <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#2e7d32', wordBreak: 'break-word' }}>{reselecting === 'event' ? '-' : event.name}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="fft-staff-landing-container">
            {view === 'selectLanguage' && (
              <LanguageSelection
                selectedLanguage={language}
                onSelectLanguage={(lang) =>
                  this.setState({ language: lang, view: previousView || 'selectEvent', reselecting: null, previousView: null })
                }
              />
            )}

            {view === 'selectEvent' && (
              <EventSelection
                onSelectEvent={(selectedEvent) =>
                  this.setState({ event: selectedEvent, view: previousView || 'registrationMenu', reselecting: null, previousView: null })
                }
              />
            )}

            {view === 'registrationMenu' && (
              <RegistrationSection
                onBulkRegistration={() => this.setState({ view: 'bulkUpload' })}
                onIndividualRegistration={() => this.setState({ view: 'individualRegistration' })}
              />
            )}

            {/* BulkUpload always mounted to preserve file state while in bulkUpload view */}
            <div style={{ display: view === 'bulkUpload' ? 'block' : 'none' }}>
              <BulkUpload
                ref={this.bulkUploadRef}
                event={event}
                onUploadComplete={() => this.setState({ view: 'registrationMenu' })}
              />
            </div>
          </div>

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

export default FFTRegistration;
