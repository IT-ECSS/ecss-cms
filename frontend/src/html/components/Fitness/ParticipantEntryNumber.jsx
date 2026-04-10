import React, { Component } from 'react';
import '../../../css/fftParticipants.css';
import fftTranslations from './fftTranslations';

class ParticipantEntryNumber extends Component {
  render() {
    const { entryNumber, language, onHome, onFinish, showParticipantNumber = true } = this.props;

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          {/* Success content section */}
          <div className="fft-participants-section" style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
            {/* Header + divider + description */}
            <div className="fft-participants-section-header" style={{ textAlign: 'left' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>
                {fftTranslations.successTitle[language] || fftTranslations.successTitle.en}
              </h2>
              <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
              <div style={{ margin: '0', color: '#444' }}>
                {fftTranslations.successMessage[language] || fftTranslations.successMessage.en}
              </div>
            </div>

            {/* Entry number card — always shown after successful submission */}
            {entryNumber != null && (
              <div
                style={{
                  display: 'inline-block',
                  marginTop: '32px',
                  padding: '24px 48px',
                  borderRadius: '16px',
                  backgroundColor: '#f5f5f5',
                  border: '2px solid #2e7d32',
                }}
              >
                <div style={{ fontSize: '0.85em', color: '#777', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {fftTranslations.successEntry[language] || fftTranslations.successEntry.en}
                </div>
                <div style={{ fontSize: '3em', fontWeight: 800, color: '#2e7d32', lineHeight: 1 }}>
                  {entryNumber}
                </div>
              </div>
            )}
          </div>

          {/* Finish section */}
          <div className="fft-participants-section" style={{ textAlign: 'center', padding: '24px' }}>
            <button
              type="button"
              className="fft-create-event-btn"
              onClick={() => onFinish?.()}
              style={{ width: 'fit-content', fontSize: '1.05em', padding: '14px 32px' }}
            >
              {language === 'zh' ? '完成' : language === 'ms' ? 'Selesai' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ParticipantEntryNumber;
