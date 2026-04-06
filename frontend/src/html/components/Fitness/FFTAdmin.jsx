import React, { Component } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import '../../../css/fftAdmin.css';
import CreateEventForm from './CreateEventForm';
import CreateFFTEventTimeSlots from './CreateFFTEventTimeSlots';
import CreateFileForm from './CreateFileForm';
import ChooseFileForm from './ChooseFileForm';
import HomeConfirmModal from './HomeConfirmModal';
import AccessMasterData from './AccessMasterData';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class FFTAdmin extends Component {
  constructor(props) {
    super(props);
    // Restore previous section from localStorage if available
    const savedView = localStorage.getItem('fftAdminLastView');
    const savedEventStep = parseInt(localStorage.getItem('fftAdminEventStep'), 10) || 1;
    const savedEventData = (() => { try { const d = localStorage.getItem('fftAdminEventData'); return d ? JSON.parse(d) : null; } catch { return null; } })();
    this.state = {
      activeView: savedView || null, // restore or show menu
      eventFormKey: 0,
      previousView: null, // Track last section
      showHomeConfirm: false,
      eventStep: savedEventStep,
      eventData: savedEventData,
    };
  }

  componentDidMount() {
    // Socket.IO: live updates
    this.socket = io(BACKEND_URL);
    this.socket.on('fftActiveFile', (data) => {
      // Another admin changed the active file
      // Components will refresh on their own
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // ── Menu navigation ––

  handleMenuSelect = (view) => {
    // Track previous section for navigation
    if (view !== null) {
      this.setState((prev) => ({ previousView: prev.activeView }));
      localStorage.setItem('fftAdminLastView', view);
    }
    // Just change the view without resetting form
    this.setState({ activeView: view });
  };

  // ── Layered Back Navigation (like FFTParticipants) ––

  handleBack = () => {
    const { activeView, previousView, eventStep } = this.state;
    if (activeView === 'event' && eventStep === 2) {
      // Back from time slots → step 1 (CreateEventForm)
      this.setState({ eventStep: 1 });
    } else if (activeView) {
      // Back from event/create form → menu
      this.handleMenuSelect(null);
    } else if (previousView) {
      // Back from menu → restore previous view
      this.handleMenuSelect(previousView);
    } else {
      // Back from menu (no previous view) → home
      this.props.onBack?.();
    }
  };

  handleHome = () => {
    this.setState({ showHomeConfirm: true });
  };

  handleHomeYes = () => {
    localStorage.removeItem('fftAdminLastView');
    localStorage.removeItem('fftEventFormData');
    localStorage.removeItem('fftAdminEventStep');
    localStorage.removeItem('fftAdminEventData');
    this.setState({ showHomeConfirm: false });
    this.props.onBack?.();
  };

  handleHomeNo = () => {
    // Go home WITHOUT clearing saved data — persist step and form data
    const { activeView, eventStep, eventData } = this.state;
    if (activeView) {
      localStorage.setItem('fftAdminLastView', activeView);
    }
    localStorage.setItem('fftAdminEventStep', String(eventStep));
    if (eventData) {
      localStorage.setItem('fftAdminEventData', JSON.stringify(eventData));
    }
    this.setState({ showHomeConfirm: false });
    this.props.onBack?.();
  };

  handleFinish = () => {
    // Finish button clears ALL data and exits (fresh start when returning)
    localStorage.removeItem('fftAdminLastView');
    localStorage.removeItem('fftEventFormData');
    localStorage.removeItem('fftAdminEventStep');
    localStorage.removeItem('fftAdminEventData');
    this.props.onBack?.();
  };

  // ── Render ––

  render() {
    const { onBack } = this.props;
    const { activeView, previousView } = this.state;


    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-header">
          <div className="fft-participants-header-top-row" style={{ display: 'flex', gap: '12px' }}>
            <button
              className="fft-participants-icon-btn"
              onClick={this.handleBack}
              title="Back"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <button
              className="fft-participants-icon-btn"
              onClick={this.handleHome}
              title="Home"
            >
              <i className="fas fa-home"></i>
            </button>
          </div>
        </div>

        {/* ════════════ MENU VIEW ════════════ */}
        {!activeView && (
          <div className="fft-participants-form">
            <div style={{ margin: '0 0 32px 0', textAlign: 'center' }}>
              <h2 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: 8 }}>FFT Admin Panel</h2>
              <div style={{ color: '#555', fontSize: '1.1rem', maxWidth: 520, margin: '0 auto' }}>
                Use this panel to create a new FFT event or a Google Sheet file to store FFT participants results.
              </div>
            </div>
            <div className="fft-admin-menu-grid">
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('event')}
              >
                <div className="fft-admin-menu-btn-icon">
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Create A FFT Event</span>
              </button>
              {/* <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('create')}
              >
                <div className="fft-admin-menu-btn-icon">
                  <i className="fas fa-file-medical"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Create A Google Sheet File</span>
              </button> */}
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('masterData')}
              >
                <div className="fft-admin-menu-btn-icon" style={{ background: '#1a73e8' }}>
                  <i className="fas fa-table"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Access Master Data</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════ CREATE FILE VIEW ════════════ */}
        {activeView === 'create' && (
          <CreateFileForm onCancel={() => this.handleMenuSelect(null)} onFinish={this.handleFinish} />
        )}

        {/* ════════════ CHOOSE FILE VIEW ════════════ */}
        {activeView === 'choose' && (
          <ChooseFileForm 
            onCancel={() => this.handleMenuSelect(null)}
            onFileSelected={this.props.onFileSelected}
          />
        )}

        {/* ════════════ MASTER DATA VIEW ════════════ */}
        {activeView === 'masterData' && (
          <AccessMasterData mode="admin" />
        )}

        {/* ════════════ EVENT VIEW ════════════ */}
        {activeView === 'event' && (
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'fit-content',
            width: '100%',
            backgroundColor: '#f5f5f5',
            padding: '40px 0',
            margin: '0',
            boxSizing: 'border-box',
          }}>
            {this.state.eventStep === 1 ? (
              <CreateEventForm
                key={this.state.eventFormKey}
                onCancel={() => this.handleMenuSelect(null)}
                onFinish={() => this.handleFinish()}
                onNext={(data) => this.setState({ eventStep: 2, eventData: data })}
              />
            ) : (
              <CreateFFTEventTimeSlots
                eventDate={this.state.eventData?.eventDate}
                eventLocation={this.state.eventData?.eventLocation}
                eventSessionNumber={this.state.eventData?.eventSessionNumber}
                onBack={() => this.setState({ eventStep: 1 })}
                onFinish={() => this.handleFinish()}
              />
            )}
          </div>
        )}

        <HomeConfirmModal
          visible={this.state.showHomeConfirm}
          onYes={this.handleHomeYes}
          onNo={this.handleHomeNo}
          onCancel={() => this.setState({ showHomeConfirm: false })}
        />
      </div>
    );
  }
}

export default FFTAdmin;
