import React, { Component } from 'react';
import '../../../css/fftParticipants.css';

class ParticipantEntryNumber extends Component {
  render() {
    const { entryNumber, language, onHome, onFinish } = this.props;

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          {/* Success content section */}
          <div className="fft-participants-section" style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
            {/* Tick icon */}
            <div style={{ marginBottom: '20px' }}>
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="36" cy="36" r="36" fill="#e8f5e9" />
                <path d="M20 37L31 48L52 26" stroke="#2e7d32" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Title */}
            <h2 style={{ fontWeight: 700, fontSize: '1.4em', marginBottom: '8px', color: '#222' }}>
              {language === 'zh' ? '提交成功！' : language === 'ms' ? 'Berjaya Dihantar!' : 'Submitted Successfully!'}
            </h2>

            {/* Subtitle */}
            <p style={{ color: '#555', marginBottom: '32px', fontSize: '0.95em' }}>
              {language === 'zh'
                ? '您的参与者资料已成功登记。'
                : language === 'ms'
                ? 'Maklumat peserta anda telah berjaya didaftarkan.'
                : 'Your participant details have been registered.'}
            </p>

            {/* Entry number card */}
            {entryNumber != null && (
              <div
                style={{
                  display: 'inline-block',
                  padding: '24px 48px',
                  borderRadius: '16px',
                  backgroundColor: '#f5f5f5',
                  border: '2px solid #2e7d32',
                }}
              >
                <div style={{ fontSize: '0.85em', color: '#777', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {language === 'zh' ? '参与者编号' : language === 'ms' ? 'Nombor Peserta' : 'Entry Number'}
                </div>
                <div style={{ fontSize: '3em', fontWeight: 800, color: '#2e7d32', lineHeight: 1 }}>
                  {entryNumber}
                </div>
              </div>
            )}
          </div>

          {/* Finish section */}
          <div className="fft-participants-section" style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #e0e0e0' }}>
            <p style={{ color: '#888', fontSize: '0.9em', marginBottom: '12px' }}>
              {language === 'zh'
                ? '点击完成以登记下一位参与者。'
                : language === 'ms'
                ? 'Klik Selesai untuk mendaftarkan peserta seterusnya.'
                : 'Click Finish to register the next participant.'}
            </p>
            <button
              type="button"
              className="fft-create-event-btn"
              onClick={() => onFinish?.()}
              style={{ minWidth: '180px', fontSize: '1.05em', padding: '14px 32px' }}
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
