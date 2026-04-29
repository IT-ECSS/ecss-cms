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
    const INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';

    this.setState({ loading: true, error: null });

    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getIndexSheet`);

      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to read index sheet');
      }

      // Sheet columns: A=S/N, B=Event Name, C=Status, D=Time Slots, E=Max Participants, F=Created On, G=File ID, H=Registration Link, I=QR Code
      const todaySGT = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
      todaySGT.setHours(0, 0, 0, 0);

      const rows = res.data.rows || res.data.data || [];
      const events = rows
        .map((row) => {
          if (row && typeof row === 'object' && !Array.isArray(row)) {
            return {
              name: String(row.eventName || '').trim(),
              id: String(row.fileId || '').trim(),
              registrationLink: String(row.registrationLink || '').trim(),
              timeSlots: String(row.timeSlots || '').trim(),
              maxParticipants: String(row.maxParticipants || '').trim(),
            };
          }

          return {
            name: row && row[1] ? String(row[1]).trim() : '',
            id: row && row[6] ? String(row[6]).trim() : '',
            registrationLink: row && row[7] ? String(row[7]).trim() : '',
            timeSlots: row && row[3] ? String(row[3]).trim() : '',
            maxParticipants: row && row[4] ? String(row[4]).trim() : '',
          };
        })
        .filter((event) => {
          if (!event.name || !event.id) return false;
          // Hide events whose date has already passed.
          const m = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(event.name);
          if (m) {
            const eventDate = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+08:00`);
            if (eventDate < todaySGT) return false;
          }
          return true;
        });

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
              <h3 className="fft-participants-section-title">
                {title}
                {this.props.trilingual && (
                  <span style={{ display: 'block', fontWeight: 400, fontSize: '0.78em', color: '#666', marginTop: 2 }}>{texts.zh.title} · {texts.ms.title}</span>
                )}
              </h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                {this.props.trilingual ? (
                  <>
                    <span>{texts.en.description}</span>
                    <span style={{ display: 'block', fontSize: '0.92em', marginTop: 3 }}>{texts.zh.description}</span>
                    <span style={{ display: 'block', fontSize: '0.92em', marginTop: 2 }}>{texts.ms.description}</span>
                  </>
                ) : (
                  description
                )}
              </div>
            </div>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: '#555' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.2rem', color: '#0066cc' }}></i>
                <span>{loadingText}</span>
              </div>
            )}
            {error && (
              <div style={{ color: '#d32f2f', padding: '16px 0' }}>
                {error}
                <button
                  type="button"
                  onClick={this.loadEvents}
                  style={{ marginLeft: 12, padding: '4px 14px', fontSize: '0.9rem', cursor: 'pointer', border: '1px solid #d32f2f', borderRadius: 4, background: 'none', color: '#d32f2f' }}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && events.length === 0 && (
              <div style={{ color: '#888', padding: '16px 0', fontSize: '1em' }}>
                No events found.
              </div>
            )}

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
