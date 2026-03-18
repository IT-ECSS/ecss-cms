import React, { Component } from 'react';
import axios from 'axios';
import LoadingModal from '../Common/LoadingModal';
import '../../../css/fftParticipants.css';

class EventSelection extends Component {
  state = {
    events: [],
    loading: true,
    error: null,
  };

  componentDidMount() {
    this.loadEvents();
  }

  renderEventButton = (evt, idx) => {
    // evt is always {name, id} after loadEvents; support legacy string shape too
    const name = typeof evt === 'string' ? evt : evt.name || '';
    return (
      <button
        key={name || idx}
        type="button"
        className="fft-event-btn"
        onClick={() => this.props.onSelectEvent(evt)}
      >
        <div className="fft-event-btn-name">{name}</div>
      </button>
    );
  };

  loadEvents = async () => {
    const BACKEND_URL = window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://ecss-backend-node.azurewebsites.net';
    const FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';

    this.setState({ loading: true, error: null });

    try {
      const [eventsRes, filesRes] = await Promise.all([
        axios.post(`${BACKEND_URL}/googleDrive/listEvents`, {}),
        axios.post(`${BACKEND_URL}/googleDrive/`, { folderId: FOLDER_ID, purpose: 'listFiles' }),
      ]);

      const eventNames = (eventsRes.data.events || []).filter(Boolean);
      const driveFolders = (filesRes.data.folders || []).filter(
        f => typeof f === 'object' && /^\d{4}$/.test(f.name?.trim())
      );

      console.log('Loaded event names:', eventNames);
      console.log('Loaded drive folders:', driveFolders);

      const nestedFiles = await Promise.all(
        driveFolders.map(async (folder) => {
          const folderRes = await axios.post(`${BACKEND_URL}/googleDrive/`, {
            folderId: folder.id,
            purpose: 'listFiles',
          });
          const sheets = (folderRes.data.files || []).filter(
            f => typeof f === 'object' && f.mimeType === 'application/vnd.google-apps.spreadsheet'
          );
          return sheets
            .filter(f => eventNames.some(n => n.trim().toLowerCase() === f.name.trim().toLowerCase()))
            .map(f => ({ name: f.name, id: f.id }));
        })
      );
      const events = nestedFiles.flat();

      this.setState({ events, loading: false });
    } catch (err) {
      this.setState({ error: err.message || 'Error loading events', loading: false });
    }
  };

  render() {
    const { events, loading, error } = this.state;
    const { language } = this.props;

    const texts = {
      en: {
        title: 'Select A FFT Event',
        description: 'Please select a FFT event to continue.',
        loading: 'Loading events...',
        back: 'Back',
        home: 'Home',
      },
      zh: {
        title: '选择 FFT 活动',
        description: '请选择一个 FFT 活动继续。',
        loading: '正在加载活动...',
        back: '返回',
        home: '主页',
      },
      ms: {
        title: 'Pilih Acara FFT',
        description: 'Sila pilih acara FFT untuk meneruskan.',
        loading: 'Memuatkan acara...',
        back: 'Kembali',
        home: 'Utama',
      },
    };

    const { title, description, loading: loadingText, back, home } = texts[language] || texts.en;

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">{title}</h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                {description}
              </div>
            </div>

            {loading && <div>{loadingText}</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            <div className="fft-events-buttons-container">
              {events.map(this.renderEventButton)}
            </div>
          </div>
        </div>
        <LoadingModal visible={loading} message={loadingText} />
      </div>
    );
  }
}

export default EventSelection;
