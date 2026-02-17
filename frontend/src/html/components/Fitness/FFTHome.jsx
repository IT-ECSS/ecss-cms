import React, { Component } from 'react';
import '../../../css/fftHome.css';

class FFTHome extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { onNavigate } = this.props;

    return (
      <div className="fft-home-wrapper">
        <div className="fft-home-header">
          <h2 className="fft-home-title">FFT Test</h2>
        </div>
        
        <div className="fft-home-navigation">
          <button
            className="fft-home-nav-card fft-home-nav-card--admin"
            onClick={() => onNavigate('admin')}
          >
            <span className="fft-home-nav-icon">💼</span>
            <span className="fft-home-nav-text">Admin</span>
          </button>
          <button
            className="fft-home-nav-card fft-home-nav-card--participants"
            onClick={() => onNavigate('participants')}
          >
            <span className="fft-home-nav-icon">🏃</span>
            <span className="fft-home-nav-text">Participants</span>
          </button>
          <button
            className="fft-home-nav-card fft-home-nav-card--volunteers"
            onClick={() => onNavigate('volunteers')}
          >
            <span className="fft-home-nav-icon">🤝</span>
            <span className="fft-home-nav-text">Volunteers</span>
          </button>
          <button
            className="fft-home-nav-card fft-home-nav-card--trainers"
            onClick={() => onNavigate('trainers')}
          >
            <span className="fft-home-nav-icon">🏋️</span>
            <span className="fft-home-nav-text">Trainers</span>
          </button>
        </div>
      </div>
    );
  }
}

export default FFTHome;
