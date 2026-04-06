import React, { Component } from 'react';
import '../../../css/fftHome.css';

// Which sections each role is allowed to access
const ACCESS_MAP = {
  'Admin':           ['admin', 'registration', 'volunteers', 'trainers', 'fitnessTrainers'],
  'Programme Staff': ['registration', 'trainers'],
  'Station Master':  ['volunteers'],
  'Fitness Trainer': ['fitnessTrainers'],
};

const ALL_BUTTONS = [
  { section: 'admin',          icon: '👨‍💼', label: 'Admin',           cardClass: 'fft-home-nav-card--admin' },
  { section: 'registration',   icon: '🏃',  label: 'Registration',    cardClass: 'fft-home-nav-card--registration' },
  { section: 'volunteers',     icon: '🚩',  label: 'Station Masters', cardClass: 'fft-home-nav-card--volunteers' },
  { section: 'trainers',       icon: '💼',  label: 'Staff',           cardClass: 'fft-home-nav-card--trainers' },
  { section: 'fitnessTrainers',icon: '🏋️', label: 'Fitness Trainers',cardClass: 'fft-home-nav-card--trainers' },
];

class FFTHome extends Component {
  render() {
    const { role, onNavigate, onLogout } = this.props;
    const allowed = ACCESS_MAP[role] || [];
    const visibleButtons = ALL_BUTTONS.filter(b => allowed.includes(b.section));

    return (
      <div className="fft-home-wrapper">
        <div className="fft-home-header" style={{ position: 'relative' }}>
          <h2 className="fft-home-title">ECSS FFT</h2>
          <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85em', color: '#666', fontWeight: 500 }}>{role}</span>
            <button
              onClick={onLogout}
              style={{
                background: 'none', border: '1px solid #ccc', borderRadius: 8,
                padding: '6px 14px', cursor: 'pointer', fontSize: '0.85em',
                color: '#555', fontWeight: 600,
              }}
              title="Sign out"
            >
              <i className="fas fa-sign-out-alt" style={{ marginRight: 6 }}></i>Sign Out
            </button>
          </div>
        </div>

        <div className="fft-home-navigation">
          {visibleButtons.map(({ section, icon, label, cardClass }) => (
            <button
              key={section}
              className={`fft-home-nav-card ${cardClass}`}
              onClick={() => onNavigate(section)}
            >
              <span className="fft-home-nav-icon">{icon}</span>
              <span className="fft-home-nav-text">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
}

export default FFTHome;
