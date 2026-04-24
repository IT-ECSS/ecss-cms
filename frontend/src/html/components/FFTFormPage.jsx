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
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getIndexSheet`);
      if (!res.data.success) throw new Error(res.data.error || 'Failed to load events');
      const events = (res.data.data || [])
        .filter(row => row[1] && row[6])
        .map(row => ({
          name: row[1].trim(),
          id: row[6].trim(),
          timeSlots: row[3] ? row[3].trim() : '',
          maxParticipants: row[4] ? row[4].trim() : '',
          status: row[2] ? String(row[2]).trim() : '',
        }));
      const found = events.find(e => e.name === targetName);
      if (found) {
        // Block access if the event is marked Past in the sheet.
        if (found.status === 'Past') {
          this.setState({ eventError: 'This event has ended. Registration is no longer available.', loadingEvent: false });
          return;
        }
        // Fallback date check for events not yet processed by the expiry job.
        const dateMatch = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(found.name || '');
        if (dateMatch) {
          const eventDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00+08:00`);
          const todaySGT = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }) + 'T00:00:00+08:00');
          if (eventDate < todaySGT) {
            this.setState({ eventError: 'This event has ended. Registration is no longer available.', loadingEvent: false });
            return;
          }
        }
        this.setState({ initialEvent: found, loadingEvent: false });
      } else {
        this.setState({ eventError: `Event "${targetName}" not found or registration is no longer available.`, loadingEvent: false });
      }
    } catch (err) {
      this.setState({ eventError: err.message, loadingEvent: false });
    }
  };

  handleReset = () => {
    this.setState(s => ({ resetKey: s.resetKey + 1 }));
  };

  handleFinished = () => {
    window.close();
    // Fallback for mobile/tablet browsers that block window.close()
    setTimeout(() => {
      if (!window.closed) {
        window.location.replace('https://ecss.org.sg/');
      }
    }, 100);
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
          onHome={this.handleFinished}
          onAdmin={() => this.props.history.push('/fft')}
          trilingual
          showParticipantNumber={false}
          hideBackOnLanguage
          lockEvent
          initialEvent={initialEvent || undefined}
          storageScope="kiosk"
        />
      </div>
    );
  }
}

export default withRouter(FFTFormPage);
