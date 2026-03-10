import React, { Component } from 'react';
import { io } from 'socket.io-client';
import '../../../css/fftAdmin.css';
import CreateEventForm from './CreateEventForm';
import CreateFileForm from './CreateFileForm';
import ChooseFileForm from './ChooseFileForm';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class FFTAdmin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeView: null, // null = menu, 'create' = Create File, 'choose' = Choose File, 'event' = Event
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
    this.setState({ activeView: view });
  };

  // ── Render ––

  render() {
    const { onBack } = this.props;
    const { activeView } = this.state;

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-header">
          <div className="fft-participants-header-top-row" style={{ display: 'flex', gap: '12px' }}>
            {activeView && (
              <button
                className="fft-participants-icon-btn"
                onClick={() => this.handleMenuSelect(null)}
                title="Back"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
            )}
            <button
              className="fft-participants-icon-btn"
              onClick={onBack}
              title="Home"
            >
              <i className="fas fa-home"></i>
            </button>
          </div>
        </div>

        {/* ════════════ MENU VIEW ════════════ */}
        {!activeView && (
          <div className="fft-participants-form">
            {/* Current active file indicator */}
            {this.props.selectedFile && (
              <div className="fft-admin-result fft-admin-result--success" style={{ marginBottom: '16px' }}>
                <i className="fas fa-file-alt"></i>
                <div>
                  <p className="fft-admin-result-title">Active File</p>
                  <p className="fft-admin-result-detail">{this.props.selectedFile.name}</p>
                </div>
              </div>
            )}
            <div className="fft-admin-menu-grid">
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('event')}
              >
                <div className="fft-admin-menu-btn-icon">
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Create Events</span>
              </button>
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('create')}
              >
                <div className="fft-admin-menu-btn-icon">
                  <i className="fas fa-file-medical"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Create File</span>
              </button>
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('choose')}
              >
                <div className="fft-admin-menu-btn-icon">
                  <i className="fas fa-folder-open"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Choose File</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════ CREATE FILE VIEW ════════════ */}
        {activeView === 'create' && (
          <CreateFileForm onCancel={() => this.handleMenuSelect(null)} />
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
              onCancel={() => this.handleMenuSelect(null)}
            />
          </div>
        )}
      </div>
    );
  }
}

export default FFTAdmin;
