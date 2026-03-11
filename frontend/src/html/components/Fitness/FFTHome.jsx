import React, { Component } from 'react';
import '../../../css/fftHome.css';

class FFTHome extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showPasswordModal: false,
      pendingSection: null,
      passwordInput: '',
      passwordError: false,
    };
  }

  // Password map for protected sections
  sectionPasswords = {
    admin: 'fftAdmin',
    volunteers: 'fftVol',
    trainers: 'fftStaffs',
  };

  handleProtectedNav = (section) => {
    this.setState({ showPasswordModal: true, pendingSection: section, passwordInput: '', passwordError: false });
  };

  handlePasswordSubmit = () => {
    const { pendingSection, passwordInput } = this.state;
    const { onNavigate } = this.props;
    if (passwordInput === this.sectionPasswords[pendingSection]) {
      this.setState({ showPasswordModal: false, pendingSection: null, passwordInput: '', passwordError: false });
      onNavigate(pendingSection);
    } else {
      this.setState({ passwordError: true });
    }
  };

  handlePasswordCancel = () => {
    this.setState({ showPasswordModal: false, pendingSection: null, passwordInput: '', passwordError: false });
  };

  handlePasswordKeyDown = (e) => {
    if (e.key === 'Enter') this.handlePasswordSubmit();
  };

  render() {
    const { onNavigate } = this.props;
    const { showPasswordModal, pendingSection, passwordInput, passwordError } = this.state;

    const sectionLabels = { admin: 'Admin', volunteers: 'Volunteers', trainers: 'Staff' };

    return (
      <div className="fft-home-wrapper">
        <div className="fft-home-header">
          <h2 className="fft-home-title">ECSS FFT</h2>
        </div>
        
        <div className="fft-home-navigation">
          {/* Admin - Password disabled for testing */}
          <button
            className="fft-home-nav-card fft-home-nav-card--admin"
            onClick={() => this.props.onNavigate('admin')}
          >
            <span className="fft-home-nav-icon">💼</span>
            <span className="fft-home-nav-text">Admin</span>
          </button>
          <button
            className="fft-home-nav-card fft-home-nav-card--registration"
            onClick={() => onNavigate('participants')}
          >
            <span className="fft-home-nav-icon">🏃</span>
            <span className="fft-home-nav-text">Registration</span>
          </button>
          {/* Volunteers - Password disabled for testing */}
          <button
            className="fft-home-nav-card fft-home-nav-card--volunteers"
            onClick={() => this.props.onNavigate('volunteers')}
          >
            <span className="fft-home-nav-icon">🤝</span>
            <span className="fft-home-nav-text">Volunteers</span>
          </button>
          {/* Staff - Password disabled for testing */}
          <button
            className="fft-home-nav-card fft-home-nav-card--trainers"
            onClick={() => this.props.onNavigate('trainers')}
          >
            <span className="fft-home-nav-icon">🏋️</span>
            <span className="fft-home-nav-text">Staff</span>
          </button>
        </div>

        {/* Password Modal - Disabled for testing */}
        {/* {showPasswordModal && (
          <div className="fft-password-overlay" onClick={this.handlePasswordCancel}>
            <div className="fft-password-modal" onClick={(e) => e.stopPropagation()}>
              <div className="fft-password-modal-icon">
                <i className="fas fa-lock"></i>
              </div>
              <h3 className="fft-password-modal-title">
                Enter Password for {sectionLabels[pendingSection]}
              </h3>
              <input
                type="password"
                className={`fft-password-input ${passwordError ? 'fft-password-input--error' : ''}`}
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => this.setState({ passwordInput: e.target.value, passwordError: false })}
                onKeyDown={this.handlePasswordKeyDown}
                autoFocus
              />
              {passwordError && (
                <p className="fft-password-error">Incorrect password. Please try again.</p>
              )}
              <div className="fft-password-modal-actions">
                <button className="fft-password-btn fft-password-btn--cancel" onClick={this.handlePasswordCancel}>
                  Cancel
                </button>
                <button className="fft-password-btn fft-password-btn--submit" onClick={this.handlePasswordSubmit}>
                  Enter
                </button>
              </div>
            </div>
          </div>
        )} */}
      </div>
    );
  }
}

export default FFTHome;
