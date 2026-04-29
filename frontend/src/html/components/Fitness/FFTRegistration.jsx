import React, { Component } from 'react';
import axios from 'axios';
import EventSelection from './EventSelection';
import LanguageSelection from './LanguageSelection';
import RegistrationSection from './RegistrationSection';
import BulkUpload from './BulkUpload';
import FFTParticipants from './FFTParticipants';
import HomeConfirmModal from './HomeConfirmModal';
import UploadResultModal from './UploadResultModal';
import { SelectionBadgesBar } from './SelectionBadges';
import fftTranslations from './fftTranslations';
import '../../../css/fftParticipants.css';
import '../../../css/fftStaff.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

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

  componentDidMount = async () => {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          let restoredEvent = parsed.event || null;

          // Backward compatibility: older saved state may store registrationLink in event.id.
          if (restoredEvent && /^https?:\/\//i.test(String(restoredEvent.id || '')) && restoredEvent.name) {
            try {
              const resolveRes = await axios.post(`${BACKEND_URL}/googleDrive/getEventFileId`, {
                eventName: restoredEvent.name,
              });
              if (resolveRes.data?.success && resolveRes.data?.fileId) {
                restoredEvent = { ...restoredEvent, id: resolveRes.data.fileId };
              } else {
                restoredEvent = null;
              }
            } catch (e) {
              restoredEvent = null;
            }
          }

          this.setState({
            view: parsed.view || 'selectLanguage',
            language: parsed.language || null,
            event: restoredEvent,
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
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', flexWrap: 'wrap', width: '100%', padding: '16px 16px 12px', gap: 10 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 280px', minWidth: 0 }}>
                <span style={{ fontSize: '1.3125em', color: '#555' }}>
                  {event
                    ? (fftTranslations.headerDescLanguageEvent?.[language] || fftTranslations.headerDescLanguageEvent?.en)
                    : (fftTranslations.headerDescLanguageOnly?.[language] || fftTranslations.headerDescLanguageOnly?.en)}
                </span>
                <SelectionBadgesBar
                  noBorder
                  sizeMultiplier={1.5625}
                  disableContainerFlex
                  badgeVariant="registration"
                  language={language}
                  event={event}
                  onLanguageClick={() => this.setState({ view: 'selectLanguage', reselecting: 'language', previousView: view })}
                  onEventClick={event ? () => this.setState({ view: 'selectEvent', reselecting: 'event', previousView: view }) : undefined}
                  showLanguagePlaceholder={reselecting === 'language'}
                  showEventPlaceholder={reselecting === 'event'}
                />
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
                language={language}
                onSelectEvent={(selectedEvent) =>
                  this.setState({ event: selectedEvent, view: previousView || 'registrationMenu', reselecting: null, previousView: null })
                }
              />
            )}

            {view === 'registrationMenu' && (
              <RegistrationSection
                language={language}
                onBulkRegistration={() => this.setState({ view: 'bulkUpload' })}
                onIndividualRegistration={() => this.setState({ view: 'individualRegistration' })}
                role={this.props.role}
              />
            )}

            {/* BulkUpload — conditionally rendered so state always resets on entry */}
            {view === 'bulkUpload' && (
              <BulkUpload
                ref={this.bulkUploadRef}
                event={event}
                onFilesChange={() => this.forceUpdate()}
                onUploadComplete={() => {
                  localStorage.removeItem(this.storageKey);
                  this.setState({ view: 'selectLanguage', language: null, event: null });
                  this.props.onBack?.();
                }}
              />
            )}
          </div>

          {/* Upload loading modal — shown when bulk upload is in progress */}
          {view === 'bulkUpload' && this.bulkUploadRef.current && (
            <UploadResultModal
              uploading={this.bulkUploadRef.current.state.uploading}
              uploadProgress={this.bulkUploadRef.current.state.uploadProgress}
              totalEntries={this.bulkUploadRef.current.state.totalEntries}
              results={this.bulkUploadRef.current.state.results}
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

export default FFTRegistration;
