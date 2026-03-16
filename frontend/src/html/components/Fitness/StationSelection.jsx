import React, { Component } from 'react';
import '../../../css/fftParticipants.css';
import fftTranslations from './fftTranslations';

class StationSelection extends Component {
  getTrans = (key) => {
    const { language = 'en' } = this.props;
    const translations = fftTranslations[key];
    if (!translations) return key;
    return translations[language] || translations.en || key;
  };

  renderStationButton = (station) => {
    const label = station.id === 'measurement'
      ? `📏 ${station.title}`
      : `${station.num}: ${station.title}`;

    return (
      <button
        key={station.id}
        type="button"
        className="fft-event-btn"
        style={{ borderLeft: `4px solid ${station.color}` }}
        onClick={() => this.props.onSelectStation(station)}
      >
        <div className="fft-event-btn-name">{label}</div>
      </button>
    );
  };

  render() {
    const stations = this.props.stations || fftTranslations.stations;

    return (
      <>
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">{this.getTrans('selectStation')}</h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                {this.getTrans('selectStationDesc')}
              </div>
            </div>
            <div className="fft-events-buttons-container">
              {stations.map(this.renderStationButton)}
            </div>
      </>
    );
  }
}

export default StationSelection;
