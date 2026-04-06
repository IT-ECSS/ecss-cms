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
    this.state = { resetKey: 0, initialEvent: null, loadingEvent: !!eventName, eventError: null, finished: false };
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
    this.setState(s => ({ resetKey: s.resetKey + 1, finished: false }));
  };

  handleFinished = () => {
    window.close();
    // Fallback for mobile browsers that block window.close()
    this.setState({ finished: true });
  };

  render() {
    const { resetKey, initialEvent, loadingEvent, eventError, finished } = this.state;
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

    if (finished) {
      return (
        <div className="fft-page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            textAlign: 'center',
            padding: '48px 32px',
            maxWidth: 480,
            width: '100%',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#e8f5e9', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 24px',
            }}>
              <i className="fas fa-check" style={{ fontSize: '2rem', color: '#2e7d32' }}></i>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px' }}>
              Registration Complete
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#555', margin: '0 0 8px', lineHeight: 1.5 }}>
              注册已完成 · Pendaftaran Selesai
            </p>
            <p style={{ fontSize: '1.1rem', color: '#777', margin: '0 0 32px', lineHeight: 1.6 }}>
              You may now close this tab.<br />
              您可以关闭此页面。<br />
              Anda boleh menutup tab ini.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 28px', border: '1.5px solid #bdbdbd', borderRadius: 8,
                background: 'transparent', color: '#555', fontSize: '1rem',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Register another participant
            </button>
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
          initialEvent={initialEvent || undefined}
          storageScope="kiosk"
        />
      </div>
    );
  }
}

export default withRouter(FFTFormPage);
