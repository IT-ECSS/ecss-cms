import React, { Component } from 'react';
import '../../../css/fftVolunteers.css';

class FFTVolunteers extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { onBack } = this.props;

    return (
      <div className="fft-volunteers-wrapper">
        <button className="fft-volunteers-back-btn" onClick={onBack}>
          <span className="fft-volunteers-back-icon"><i className="fas fa-arrow-left"></i></span>
          Back to Home
        </button>
        
        <div className="fft-volunteers-header">
          <h2 className="fft-volunteers-title">Volunteers</h2>
          <p className="fft-volunteers-description">Manage and view all volunteers</p>
        </div>
        
        <div className="fft-volunteers-content">
          <div className="fft-volunteers-placeholder-icon"><i className="fas fa-hand-holding-heart"></i></div>
          <p className="fft-volunteers-placeholder-text">This section is under construction</p>
        </div>
      </div>
    );
  }
}

export default FFTVolunteers;
