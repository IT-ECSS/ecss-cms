import React, { Component } from 'react';
import '../../../css/fftParticipants.css';

class LanguageSelection extends Component {
  render() {
    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              {this.props.pageTitle && (
                <>
                  <h2 style={{ margin: 0, fontWeight: 700 }}>{this.props.pageTitle}</h2>
                  <hr style={{ margin: '12px 0' }} />
                </>
              )}
              <h3 className="fft-participants-section-title">
                Select Language
                {this.props.trilingual && (
                  <span style={{ display: 'block', fontWeight: 400, fontSize: '0.78em', color: '#666', marginTop: 2 }}>选择语言 · Pilih Bahasa</span>
                )}
              </h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                {this.props.trilingual ? (
                  <>
                    <span>Please select your preferred language to continue.</span>
                    <span style={{ display: 'block', fontSize: '0.92em', marginTop: 3 }}>请选择您的首选语言继续。</span>
                    <span style={{ display: 'block', fontSize: '0.92em', marginTop: 2 }}>Sila pilih bahasa pilihan anda untuk meneruskan.</span>
                  </>
                ) : (
                  'Please select your preferred language to continue.'
                )}
              </div>
            </div>
            <div className="fft-events-buttons-container">
              {[
                { code: 'en', label: 'English' },
                { code: 'zh', label: '中文' },
                { code: 'ms', label: 'Bahasa Melayu' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`fft-event-btn ${this.props.selectedLanguage === lang.code ? 'fft-participants-lang-page-btn--active' : ''}`}
                  onClick={() => this.props.onSelectLanguage(lang.code)}
                >
                  <div className="fft-event-btn-name" style={{ fontSize: 24, fontWeight: 700 }}>{lang.label}</div>
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
