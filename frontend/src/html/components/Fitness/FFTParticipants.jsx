import React, { Component } from 'react';
import '../../../css/fftParticipants.css';

class FFTParticipants extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { onBack } = this.props;

    return (
      <div className="fft-participants-wrapper">
        <button className="fft-participants-back-btn" onClick={onBack}>
          <span className="fft-participants-back-icon"><i className="fas fa-arrow-left"></i></span>
          Back to Home
        </button>
        
        <div className="fft-participants-header">
          <h2 className="fft-participants-title">Participants</h2>
          <p className="fft-participants-description">Manage and view all participants</p>
        </div>
        
        <div className="fft-participants-content">
          <div className="fft-participants-placeholder-icon"><i className="fas fa-users"></i></div>
          <p className="fft-participants-placeholder-text">This section is under construction</p>
        </div>
      </div>
    );
  }
}

export default FFTParticipants;
