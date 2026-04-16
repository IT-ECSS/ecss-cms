import React, { Component } from 'react';
import '../../../css/fftVolunteers.css';
import '../../../css/fftResultEntry.css';
import fftTranslations from './fftTranslations';

class VolunteerEntry extends Component {
  // Props:
  //   onLookup          – callback(valueStr): trigger participant lookup
  //   language          – 'en' | 'zh' | 'ms'

  constructor(props) {
    super(props);
    this.state = { validationMsg: null };
  }

  t = (key) => {
    const lang = this.props.language || 'en';
    return fftTranslations[key]?.[lang] ?? fftTranslations[key]?.en;
  };

  handleSubmit = () => {
    const val = document.getElementById('fft-result-entry-manual-input').value.trim();
    if (!val) {
      this.setState({ validationMsg: this.t('errorParticipantRequired') });
      return;
    }
    if (!/^\d+$/.test(val)) {
      this.setState({ validationMsg: this.t('errorParticipantDigitsOnly') });
      return;
    }
    this.setState({ validationMsg: null });
    this.props.onLookup(val);
  };

  render() {
    const { validationMsg } = this.state;

    return (
      <>
        <div>
          <h3 className="fft-result-entry-section-title">{this.t('participantNumberTitle')}</h3>
        </div>
        <hr style={{ margin: '12px 0' }} />

        <p className="fft-result-entry-section-desc">
          {this.t('participantNumberDesc')}
        </p>

        <div className="fft-result-entry-manual-row" style={{ marginTop: '16px' }}>
          <input
            type="text"
            inputMode="numeric"
            placeholder={this.t('participantNumberPlaceholder')}
            id="fft-result-entry-manual-input"
            className="fft-result-entry-input fft-result-entry-manual-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') this.handleSubmit();
            }}
          />
          <button
            className="fft-result-entry-go-btn"
            style={{ marginLeft: '12px' }}
            onClick={this.handleSubmit}
          >
            {this.t('submit')}
          </button>
        </div>

        {validationMsg && (
          <p style={{ marginTop: '8px', color: '#c0392b', fontSize: '1rem' }}>
            {validationMsg}
          </p>
        )}


      </>
    );
  }
}

export default VolunteerEntry;
