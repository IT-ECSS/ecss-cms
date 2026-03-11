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

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

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
    };
  }

  componentDidMount() {
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
  handleEntryLookup = (valueStr) => {
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
    axios.get(`${BACKEND_URL}/googleDrive/getRow`, { params: { fileId, entryNumber } })
      .then((res) => {
        if (res.data.success) {
          const data = res.data.data;

          // Treat empty rows (no name) as not found
          if (!data.name && !data.chineseName) {
            this.setState({ loadingParticipant: false, lookupError: `Entry #${entryNumber} was not found in the spreadsheet.`, entryNumber });
            return;
          }

          if (selectedStation.id !== 'measurement') {
            const hasHeight = data.height && String(data.height).trim() !== '';
            const hasWeight = data.weight && String(data.weight).trim() !== '';
            const hasBmi = data.bmi && String(data.bmi).trim() !== '';
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
          this.setState({ loadingParticipant: false, lookupError: `Entry #${entryNumber} was not found in the spreadsheet.`, entryNumber });
        }
      })
      .catch((err) => {
        console.error('Error fetching participant data:', err.message);
        this.setState({ loadingParticipant: false, lookupError: 'Error loading participant info. Please try again.', entryNumber });
      });
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
          <div className="fft-volunteers-header-top-row">
            <button className="fft-volunteers-icon-btn" onClick={this.handleBack} title="Back">
              <i className="fas fa-arrow-left"></i>
            </button>
            <button className="fft-volunteers-icon-btn" onClick={onBack} title="Home">
              <i className="fas fa-home"></i>
            </button>
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

          {selectedEvent && selectedStation && !participantData && !lookupError && (
            <VolunteerEntry
              onLookup={this.handleEntryLookup}
            />
          )}

          <LoadingParticipant visible={!!(selectedEvent && selectedStation && loadingParticipant)} />

          {selectedEvent && selectedStation && (participantData || lookupError) && (
            <ResultEntry
              selectedStation={selectedStation}
              fileId={fileId}
              participantData={participantData}
              entryNumber={entryNumber}
              lookupError={lookupError}
              onNextParticipant={this.handleNextParticipant}
              onBack={() => this.setState({ selectedStation: null, participantData: null, entryNumber: null, lookupError: null })}
            />
          )}
        </div>
      </div>
    );
  }
}

export default FFTVolunteers;
