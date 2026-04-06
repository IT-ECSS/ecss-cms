import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import axios from 'axios';
import '../../css/fftPage.css';
import FFTParticipants from './Fitness/FFTParticipants';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';

class FFTFormPage extends Component {
  constructor(props) {
    super(props);
    const params = new URLSearchParams(props.location.search);
    const eventName = params.get('event');
    this.state = { resetKey: 0, initialEvent: null, loadingEvent: !!eventName, eventError: null };
  }

  componentDidMount() {
    document.title = 'ECSS FFT Registration';
    const params = new URLSearchParams(this.props.location.search);
    const eventName = params.get('event');
    if (eventName) {
      this.loadEvent(eventName);
    }
  }

  loadEvent = async (targetName) => {
    this.setState({ loadingEvent: true, eventError: null });
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/readSpreadsheet`, {
        fileId: INDEX_SHEET_ID,
        sheetName: 'Sheet1',
      });
      if (!res.data.success) throw new Error(res.data.error || 'Failed to load events');
      const events = (res.data.data || [])
        .filter(row => row[1] && row[5])
        .map(row => ({
          name: row[1].trim(),
          id: row[5].trim(),
          timeSlots: row[2] ? row[2].trim() : '',
          maxParticipants: row[3] ? row[3].trim() : '',
        }));
      const found = events.find(e => e.name === targetName);
      if (found) {
        this.setState({ initialEvent: found, loadingEvent: false });
      } else {
        this.setState({ eventError: `Event "${targetName}" not found or Google Sheet not yet created.`, loadingEvent: false });
      }
    } catch (err) {
      this.setState({ eventError: err.message, loadingEvent: false });
    }
  };

  handleReset = () => {
    this.setState(s => ({ resetKey: s.resetKey + 1 }));
  };

  render() {
    const { resetKey, initialEvent, loadingEvent, eventError } = this.state;
    const params = new URLSearchParams(this.props.location.search);
    const eventName = params.get('event');

    if (eventName && loadingEvent) {
      return (
        <div className="fft-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#555', padding: '40px' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: 16 }}></i>
            <div>Loading event...</div>
          </div>
        </div>
      );
    }

    if (eventName && eventError) {
      return (
        <div className="fft-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#d32f2f', padding: '40px' }}>
            <i className="fas fa-exclamation-circle" style={{ fontSize: '2rem', marginBottom: 12 }}></i>
            <div>{eventError}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="fft-page-container">
        <FFTParticipants
          key={resetKey}
          onBack={this.handleReset}
          onAdmin={() => this.props.history.push('/fft')}
          trilingual
          showParticipantNumber={false}
          hideBackOnLanguage
          initialEvent={initialEvent || undefined}
          storageScope="kiosk"
        />
      </div>
    );
  }
}

export default withRouter(FFTFormPage);
