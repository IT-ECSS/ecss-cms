import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/fftHome.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const ROLES = ['Admin', 'Programme Staff', 'Station Master', 'Fitness Trainer'];

class FFTLoginModal extends Component {
  /**
   * Props:
   *   visible    {boolean}   – whether the modal is shown
   *   onSuccess  {function}  – called with (accountRole) after successful login
   */
  constructor(props) {
    super(props);
    this.state = {
      selectedRole: '',
      passwordInput: '',
      error: '',
      isValidating: false,
    };
  }

  handleRoleChange = (e) => {
    this.setState({ selectedRole: e.target.value, error: '' });
  };

  handlePasswordChange = (e) => {
    this.setState({ passwordInput: e.target.value, error: '' });
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') this.handleSubmit();
  };

  handleSubmit = async () => {
    const { selectedRole, passwordInput } = this.state;

    if (!selectedRole) {
      this.setState({ error: 'Please select an account role.' });
      return;
    }
    if (!passwordInput) {
      this.setState({ error: 'Please enter your password.' });
      return;
    }

    this.setState({ isValidating: true, error: '' });

    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/validateAccessRights`, {
        accountRole: selectedRole,
        password: passwordInput,
      });

      if (!res.data.success) {
        this.setState({ error: 'Incorrect password. Please try again.', isValidating: false });
        return;
      }

      this.setState({ selectedRole: '', passwordInput: '', error: '', isValidating: false });
      this.props.onSuccess(selectedRole);
    } catch (err) {
      this.setState({ error: 'Error validating credentials. Please try again.', isValidating: false });
    }
  };

  render() {
    const { visible } = this.props;
    if (!visible) return null;

    const { selectedRole, passwordInput, error, isValidating } = this.state;

    return (
      <div className="fft-password-overlay">
        <div className="fft-password-modal" onClick={(e) => e.stopPropagation()}>
          <div className="fft-password-modal-icon">
            <i className="fas fa-lock"></i>
          </div>

          <div className="fft-password-modal-header">
            <h3 className="fft-password-modal-title">Sign In to ECSS FFT</h3>
            <p className="fft-password-modal-subtitle">Select your role and enter your password to continue.</p>
          </div>

          <div className="fft-password-field">
            <label className="fft-password-label">Account Role</label>
            <div className="fft-password-select-wrapper">
              <select
                className="fft-password-input fft-password-select"
                value={selectedRole}
                onChange={this.handleRoleChange}
              >
                <option value="">Select account role...</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <i className="fas fa-chevron-down fft-password-select-icon"></i>
            </div>
          </div>

          <div className="fft-password-field">
            <label className="fft-password-label">Password</label>
            <input
              type="password"
              className={`fft-password-input${error ? ' fft-password-input--error' : ''}`}
              placeholder="Enter password"
              value={passwordInput}
              onChange={this.handlePasswordChange}
              onKeyDown={this.handleKeyDown}
              autoFocus
            />
          </div>

          {error && (
            <div className="fft-password-error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <div className="fft-password-modal-actions">
            <button
              className="fft-password-btn fft-password-btn--submit"
              onClick={this.handleSubmit}
              disabled={isValidating}
            >
              {isValidating ? (
                <><i className="fas fa-spinner fa-spin"></i> Checking...</>
              ) : (
                <><i className="fas fa-sign-in-alt"></i> Sign In</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default FFTLoginModal;
