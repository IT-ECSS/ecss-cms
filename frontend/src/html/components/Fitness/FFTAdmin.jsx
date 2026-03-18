import React, { Component } from 'react';
import { io } from 'socket.io-client';
import '../../../css/fftAdmin.css';
import CreateEventForm from './CreateEventForm';
import CreateFileForm from './CreateFileForm';
import ChooseFileForm from './ChooseFileForm';
import HomeConfirmModal from './HomeConfirmModal';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class FFTAdmin extends Component {
  constructor(props) {
    super(props);
    // Restore previous section from localStorage if available
    const savedView = localStorage.getItem('fftAdminLastView');
    this.state = {
      activeView: savedView || null, // restore or show menu
      eventFormKey: 0,
      previousView: null, // Track last section
      showHomeConfirm: false,
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
    const { activeView, previousView } = this.state;
    if (activeView) {
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
    this.setState({ showHomeConfirm: false });
    this.props.onBack?.();
  };

  handleHomeNo = () => {
    // Save current view and go home
    if (this.state.activeView) {
      localStorage.setItem('fftAdminLastView', this.state.activeView);
    }
    this.setState({ showHomeConfirm: false });
    this.props.onBack?.();
  };

  handleFinish = () => {
    // Finish button clears ALL data and exits (fresh start when returning)
    localStorage.removeItem('fftAdminLastView');
    localStorage.removeItem('fftEventFormData');
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
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('create')}
              >
                <div className="fft-admin-menu-btn-icon">
                  <i className="fas fa-file-medical"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Create A Google Sheet File</span>
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
            <CreateEventForm
              key={this.state.eventFormKey}
              onCancel={() => this.handleMenuSelect(null)}
              onFinish={() => this.handleFinish()}
            />
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
