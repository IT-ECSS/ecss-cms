import React, { Component } from 'react';
import '../../../css/fftAdmin.css';

class FFTAdmin extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { onBack } = this.props;

    return (
      <div className="fft-admin-wrapper">
        <button className="fft-admin-back-btn" onClick={onBack}>
          <span className="fft-admin-back-icon"><i className="fas fa-arrow-left"></i></span>
          Back to Home
        </button>
        
        <div className="fft-admin-header">
          <h2 className="fft-admin-title">Admin</h2>
          <p className="fft-admin-description">Administrative controls and settings</p>
        </div>
        
        <div className="fft-admin-content">
          <div className="fft-admin-placeholder-icon"><i className="fas fa-user-shield"></i></div>
          <p className="fft-admin-placeholder-text">This section is under construction</p>
        </div>
      </div>
    );
  }
}

export default FFTAdmin;
