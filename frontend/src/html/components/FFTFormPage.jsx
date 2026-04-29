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
      const rows = res.data.rows || res.data.data || [];

      const events = rows
        .map((row) => {
          // Current API shape: object rows from /getIndexSheet
          if (row && typeof row === 'object' && !Array.isArray(row)) {
            return {
              name: String(row.eventName || '').trim(),
              id: String(row.fileId || '').trim(),
              registrationLink: String(row.registrationLink || '').trim(),
              timeSlots: String(row.timeSlots || '').trim(),
              maxParticipants: String(row.maxParticipants || '').trim(),
              status: String(row.status || '').trim(),
            };
          }

          // Legacy fallback: array rows
          return {
            name: row && row[1] ? String(row[1]).trim() : '',
            id: row && row[6] ? String(row[6]).trim() : '',
            registrationLink: row && row[7] ? String(row[7]).trim() : '',
            timeSlots: row && row[3] ? String(row[3]).trim() : '',
            maxParticipants: row && row[4] ? String(row[4]).trim() : '',
            status: row && row[2] ? String(row[2]).trim() : '',
          };
        })
        .filter((e) => e.name);

      const normalizedTargetName = String(targetName || '').trim();
      const found = events.find((e) => e.name === normalizedTargetName);
      if (found) {
        // Block access only if the event date has strictly passed (before today).
        const dateMatch = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(found.name || '');
        if (dateMatch) {
          const eventDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00+08:00`);
          const todaySGT = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }) + 'T00:00:00+08:00');
          if (eventDate < todaySGT) {
            this.setState({ eventError: 'This event has ended. Registration is no longer available.', loadingEvent: false });
            return;
          }
        } else if (found.status === 'Past') {
          // No parseable date — fall back to status flag only when date cannot be determined.
          this.setState({ eventError: 'This event has ended. Registration is no longer available.', loadingEvent: false });
          return;
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
