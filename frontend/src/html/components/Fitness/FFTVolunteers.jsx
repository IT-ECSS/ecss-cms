import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../../../css/fftVolunteers.css';
import LanguageSelection from './LanguageSelection';
import EventSelection from './EventSelection';
import StationSelection from './StationSelection';
import ResultEntry from './ResultEntry';
import VolunteerEntry from './VolunteerEntry';
import LoadingSpinner from './LoadingSpinner';
import LoadingParticipant from './LoadingParticipant';
import fftTranslations from './fftTranslations';
import HomeConfirmModal from './HomeConfirmModal';
import { SelectionBadgesBar } from './SelectionBadges';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class FFTVolunteers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      language: null,
      selectedEvent: null,
      selectedStation: null,
      activeFile: null,
      participantData: null,
      loadingParticipant: false,
      entryError: null,
      lookupError: null,
      entryNumber: null,
      showHomeConfirm: false,
      reselectingBadge: null,
      reselectingLanguage: false,
      savedStation: null,
    };
  }

  storageKey = 'fftVolunteersSelection';

  componentDidMount() {
    // Restore previously selected event/station from localStorage
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.setState({
            selectedEvent: parsed.selectedEvent || null,
            selectedStation: parsed.selectedStation || null,
          }, () => {
            if (parsed.entryNumber != null && parsed.selectedStation) {
              this.handleEntryLookup(parsed.entryNumber);
            }
          });
        }
      }
    } catch (e) {
      // ignore
    }

    // Socket.IO: live updates
    this.socket = io(BACKEND_URL);
    this.socket.on('fftActiveFile', (data) => {
      if (data && data.file) {
        this.setState({ activeFile: data.file });
      }
    });
    this.socket.on('fftUpdate', () => {
      // ResultEntry handles its own live-refresh via its own instance
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { selectedEvent, selectedStation } = this.state;
    if (prevState.selectedEvent !== selectedEvent || prevState.selectedStation !== selectedStation || prevState.entryNumber !== this.state.entryNumber) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({ selectedEvent, selectedStation, entryNumber: this.state.entryNumber }));
      } catch (e) {
        // ignore
      }
      if (prevState.selectedEvent !== selectedEvent || prevState.selectedStation !== selectedStation) {
        this.props.onSelectionChange?.(selectedEvent, selectedStation);
      }
    }
    // Clear reselecting badge once a new event arrives back via props
    if (this.state.reselectingBadge === 'event' && !prevProps.badgeEvent && this.props.badgeEvent) {
      this.setState({ reselectingBadge: null, savedStation: null });
    }
    if (this.state.reselectingBadge === 'station' && !prevProps.badgeStation && this.props.badgeStation) {
      this.setState({ reselectingBadge: null });
    }
  }

  // ── Station Selection ──
  handleSelectStation = (station) => {
    this.setState({ selectedStation: station || null, participantData: null, entryNumber: null, entryError: null, lookupError: null });
  };

  // ── Event Selection ──
  handleSelectEvent = (eventObj) => {
    this.setState((prevState) => ({
      selectedEvent: eventObj || null,
      selectedStation: prevState.savedStation || null,
    }));
  };

  // ── Participant Lookup ──
  handleEntryLookup = async (valueStr) => {
    const entryNumber = parseInt(String(valueStr), 10);
    if (isNaN(entryNumber)) {
      this.setState({ entryError: `Invalid entry number: "${valueStr}"` });
      return;
    }
    const { activeFile, selectedEvent, selectedStation } = this.state;
    const { selectedFile } = this.props;
    const fileId = (selectedEvent && selectedEvent.id) ||
                   (selectedFile && selectedFile.id) ||
                   (activeFile && activeFile.id);
    if (!fileId) {
      this.setState({ entryError: 'No active file selected.' });
      return;
    }
    this.setState({ entryNumber, loadingParticipant: true, entryError: null, lookupError: null });
    
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getRow`, { fileId, entryNumber });
      
      if (res.data.success) {
        const data = res.data.data;

        // Treat empty rows (no name) as not found
        if (!data.Name && !data['Chinese Name']) {
          this.setState({ loadingParticipant: false, lookupError: `Participant #${entryNumber} was not found in the spreadsheet.`, entryNumber });
          return;
        }

        if (selectedStation.id !== 'measurement') {
          const hasHeight = data.Height && String(data.Height).trim() !== '';
          const hasWeight = data.Weight && String(data.Weight).trim() !== '';
          const hasBmi = data.BMI && String(data.BMI).trim() !== '';
          if (!hasHeight || !hasWeight || !hasBmi) {
            this.setState({
              loadingParticipant: false,
              lookupError: 'Measurement Station (Height, Weight, BMI) must be completed first before recording results for this station.',
              entryNumber,
            });
            return;
          }
        }
        this.setState({ participantData: data, loadingParticipant: false });
      } else {
        this.setState({ loadingParticipant: false, lookupError: `Participant #${entryNumber} was not found in the spreadsheet.`, entryNumber });
      }
    } catch (err) {
      console.error('Error fetching participant data:', err.message);
      this.setState({ loadingParticipant: false, lookupError: 'Error loading participant info. Please try again.', entryNumber });
    }
  };

  handleNextParticipant = () => {
    this.setState({ participantData: null, entryNumber: null, entryError: null, lookupError: null });
  };

  // ── Public reset methods (called from FFTPage via ref) ──
  resetEvent = () => {
    this.setState({ selectedEvent: null, selectedStation: null, participantData: null, entryNumber: null, entryError: null, lookupError: null });
  };

  resetStation = () => {
    this.setState({ selectedStation: null, participantData: null, entryNumber: null, entryError: null, lookupError: null });
  };

  // ── Navigation ──
  handleBack = () => {
    const { language, selectedEvent, selectedStation, participantData, lookupError } = this.state;
    if (participantData || lookupError) {
      this.setState({ participantData: null, entryNumber: null, entryError: null, lookupError: null });
    } else if (selectedStation) {
      this.setState({ selectedStation: null });
    } else if (selectedEvent) {
      this.setState({ selectedEvent: null });
    } else if (language) {
      this.setState({ language: null });
    } else {
      this.props.onBack();
    }
  };

  // ── Render ──
  render() {
    const { onBack, selectedFile } = this.props;
    const { language, selectedStation, selectedEvent, activeFile, participantData, loadingParticipant, lookupError, entryNumber } = this.state;
    const fileId = (selectedEvent && selectedEvent.id) ||
                   (selectedFile && selectedFile.id) ||
                   (activeFile && activeFile.id);

    return (
      <div className="fft-volunteers-wrapper">
        {/* Header with home and back buttons */}
        <div className="fft-volunteers-header">
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', flexWrap: 'wrap', width: '100%', padding: '16px 16px 12px', gap: 10 }}>
            {/* Left: nav buttons */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <button className="fft-volunteers-icon-btn" onClick={this.handleBack} title="Back">
                <i className="fas fa-arrow-left"></i>
              </button>
              <button className="fft-volunteers-icon-btn" onClick={() => this.setState({ showHomeConfirm: true })} title="Home">
                <i className="fas fa-home"></i>
              </button>
            </div>
            <SelectionBadgesBar
              language={language}
              event={this.props.badgeEvent}
              station={this.state.reselectingBadge === 'event' ? this.state.savedStation : this.props.badgeStation}
              sizeMultiplier={1.5625}
              stationBadgeClassName="fft-vol-station-header-badge"
              onLanguageClick={() => this.setState({ reselectingLanguage: true })}
              onEventClick={() => { const currentStation = this.state.selectedStation; this.setState({ reselectingBadge: 'event', savedStation: currentStation }); this.props.onBadgeEventClick?.(); }}
              onStationClick={() => { this.setState({ reselectingBadge: 'station' }); this.props.onBadgeStationClick?.(); }}
              showLanguagePlaceholder={this.state.reselectingLanguage}
              showEventPlaceholder={this.state.reselectingBadge === 'event'}
              showStationPlaceholder={this.state.reselectingBadge === 'station'}
            />
          </div>
        </div>

        {/* Content area */}
        <div className="fft-volunteers-form">

          {/* ──── Language Selection Section ──── */}
          {(!language || this.state.reselectingLanguage) && !this.state.reselectingBadge && (
            <LanguageSelection
              selectedLanguage={language}
              onSelectLanguage={(lang) => this.setState({ language: lang, reselectingLanguage: false })}
            />
          )}

          {/* ──── Event Selection Section ──── */}
          {language && !selectedEvent && !this.state.reselectingLanguage && (
            <EventSelection
              language={language}
              onSelectEvent={this.handleSelectEvent}
            />
          )}

          {/* ──── Station Selection Section ──── */}
          {language && selectedEvent && !selectedStation && !this.state.reselectingLanguage && (
            <StationSelection
              onSelectStation={this.handleSelectStation}
            />
          )}

          {selectedEvent && selectedStation && !participantData && !lookupError && !loadingParticipant && !this.state.reselectingLanguage && (
            <VolunteerEntry
              language={language}
              onLookup={this.handleEntryLookup}
            />
          )}

          {selectedEvent && selectedStation && (loadingParticipant || participantData || lookupError) && !this.state.reselectingLanguage && (
            <ResultEntry
              selectedStation={selectedStation}
              fileId={fileId}
              participantData={participantData}
              entryNumber={entryNumber}
              lookupError={lookupError}
              loading={loadingParticipant}
              onNextParticipant={this.handleNextParticipant}
              onBack={() => this.setState({ selectedStation: null, participantData: null, entryNumber: null, lookupError: null })}
              allStations={fftTranslations.stations}
            />
          )}
        </div>

        <HomeConfirmModal
          visible={this.state.showHomeConfirm}
          onYes={() => {
            localStorage.removeItem(this.storageKey);
            this.setState({ showHomeConfirm: false });
            this.props.onBack();
          }}
          onNo={() => {
            this.setState({ showHomeConfirm: false });
            this.props.onBack();
          }}
          onCancel={() => this.setState({ showHomeConfirm: false })}
        />
      </div>
    );
  }
}

export default FFTVolunteers;
