import React, { Component } from 'react';
import '../../../css/fftParticipants.css';

class LanguageSelection extends Component {
  render() {
    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">Select Language</h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                Please select your preferred language to continue.
              </div>
            </div>
            <div className="fft-events-buttons-container">
              {[
                { code: 'en', label: 'English', flag: '🇬🇧' },
                { code: 'zh', label: '中文', flag: '🇨🇳' },
                { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`fft-event-btn ${this.props.selectedLanguage === lang.code ? 'fft-participants-lang-page-btn--active' : ''}`}
                  onClick={() => this.props.onSelectLanguage(lang.code)}
                >
                  <div style={{ fontSize: 40, marginBottom: 4 }}>{lang.flag}</div>
                  <div className="fft-event-btn-name" style={{ fontSize: 24 }}>{lang.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default LanguageSelection;
