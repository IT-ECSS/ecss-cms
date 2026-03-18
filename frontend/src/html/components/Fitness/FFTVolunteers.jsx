import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../../../css/fftVolunteers.css';
import EventSelection from './EventSelection';
import StationSelection from './StationSelection';
import ResultEntry from './ResultEntry';
import VolunteerEntry from './VolunteerEntry';
import LoadingSpinner from './LoadingSpinner';
import LoadingParticipant from './LoadingParticipant';
import fftTranslations from './fftTranslations';
import HomeConfirmModal from './HomeConfirmModal';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class SelectedEventBadge extends Component {
  render() {
    const { event, onClick } = this.props;
    const name = typeof event === 'string' ? event : (event?.name || '');
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '14px 20px', flex: 2, textAlign: 'left',
          background: '#e8f5e9', border: 'none', borderBottom: '2px solid #b2dfcf',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '1.406em', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Event</span>
        <span style={{ fontSize: '2.031em', fontWeight: 700, color: '#2e7d32' }}>{name}</span>
      </button>
    );
  }
}

class SelectedStationBadge extends Component {
  render() {
    const { station, onClick } = this.props;
    const num = station?.num || station?.key?.match(/^\d+/) || '';
    const name = typeof station === 'string' ? station : (station?.title || station?.name || station?.label || '');
    const displayText = num ? `${num}: ${name}` : name;
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '14px 20px', flex: 2, textAlign: 'left',
          background: '#e3f0ff', border: 'none', borderBottom: '2px solid #c5d9f5',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '1.406em', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Station</span>
        <span style={{ fontSize: '2.031em', fontWeight: 700, color: '#1565c0' }}>{displayText}</span>
      </button>
    );
  }
}

class FFTVolunteers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedEvent: null,
      selectedStation: null,
      activeFile: null,
      participantData: null,
      loadingParticipant: false,
      entryError: null,
      lookupError: null,
      entryNumber: null,
      showHomeConfirm: false,
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

    // Fetch the active file from backend
    axios.get(`${BACKEND_URL}/googleDrive/activeFile`)
      .then((res) => {
        if (res.data.success && res.data.file) {
          this.setState({ activeFile: res.data.file });
        }
      })
      .catch((err) => console.error('Failed to fetch active file:', err.message));

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
    }
  }

  // ── Station Selection ──
  handleSelectStation = (station) => {
    this.setState({ selectedStation: station || null, participantData: null, entryNumber: null, entryError: null, lookupError: null });
  };

  // ── Event Selection ──
  handleSelectEvent = (eventObj) => {
    this.setState({
      selectedEvent: eventObj || null,
      selectedStation: null,
    });
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
        console.log('Participant data:', data);

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

  // ── Navigation ──
  handleBack = () => {
    const { selectedEvent, selectedStation, participantData, lookupError } = this.state;
    if (participantData || lookupError) {
      this.setState({ participantData: null, entryNumber: null, entryError: null, lookupError: null });
    } else if (selectedStation) {
      this.setState({ selectedStation: null });
    } else if (selectedEvent) {
      this.setState({ selectedEvent: null });
    } else {
      this.props.onBack();
    }
  };

  // ── Render ──
  render() {
    const { onBack, selectedFile } = this.props;
    const { selectedStation, selectedEvent, activeFile, participantData, loadingParticipant, lookupError, entryNumber } = this.state;
    const fileId = (selectedEvent && selectedEvent.id) ||
                   (selectedFile && selectedFile.id) ||
                   (activeFile && activeFile.id);

    return (
      <div className="fft-volunteers-wrapper">
        {/* Header with home and back buttons */}
        <div className="fft-volunteers-header">
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', padding: '16px 16px 12px', gap: 10 }}>
            {/* Left: nav buttons */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <button className="fft-volunteers-icon-btn" onClick={this.handleBack} title="Back">
                <i className="fas fa-arrow-left"></i>
              </button>
              <button className="fft-volunteers-icon-btn" onClick={() => this.setState({ showHomeConfirm: true })} title="Home">
                <i className="fas fa-home"></i>
              </button>
            </div>

            {/* Right: description + badges */}
            {(selectedEvent || selectedStation) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '1.3125em', color: '#555' }}>Click on a badge below to re-select your event or station</span>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                  {selectedEvent && (
                    <SelectedEventBadge
                      event={selectedEvent}
                      onClick={() => this.setState({ selectedEvent: null, selectedStation: null, participantData: null, entryNumber: null, entryError: null, lookupError: null })}
                    />
                  )}
                  {selectedStation && (
                    <SelectedStationBadge
                      station={selectedStation}
                      onClick={() => this.setState({ selectedStation: null, participantData: null, entryNumber: null, entryError: null, lookupError: null })}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="fft-volunteers-form">

          {/* ──── Event Selection Section ──── */}
          {!selectedEvent && (
            <EventSelection
              onSelectEvent={this.handleSelectEvent}
            />
          )}

          {/* ──── Station Selection Section ──── */}
          {selectedEvent && !selectedStation && (
            <StationSelection
              onSelectStation={this.handleSelectStation}
            />
          )}

          {selectedEvent && selectedStation && !participantData && !lookupError && !loadingParticipant && (
            <VolunteerEntry
              onLookup={this.handleEntryLookup}
            />
          )}

          {selectedEvent && selectedStation && (loadingParticipant || participantData || lookupError) && (
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
