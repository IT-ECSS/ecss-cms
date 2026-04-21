import React, { Component } from 'react';
import PropTypes from 'prop-types';

class RegistrationSuccessResult extends Component {
  static propTypes = {
    language: PropTypes.string,
    entryNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onFinish: PropTypes.func,
    onResetForm: PropTypes.func,
  };

  handleFinish = () => {
    this.props.onResetForm?.();
    this.props.onFinish?.();
  }

  render() {
    const { language, entryNumber } = this.props;

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section" style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
            {/* Header section */}
            <div className="fft-participants-section-header" style={{ textAlign: 'left' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>
                {language === 'zh' ? '注册完成' : language === 'ms' ? 'Pendaftaran Selesai' : 'Registration Completed'}
              </h2>
              <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
            </div>

            {/* Entry number display */}
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
                {language === 'zh' ? '参与者编号' : language === 'ms' ? 'Nombor Peserta' : 'Participant Number'}
              </div>
              <div style={{ fontSize: '3em', fontWeight: 800, color: '#2e7d32', lineHeight: 1 }}>
                {entryNumber}
              </div>
            </div>

            {/* Finish button */}
            <div style={{ marginTop: '32px' }}>
              <button
                type="button"
                className="fft-create-event-btn"
                onClick={this.handleFinish}
                style={{ width: 'fit-content', fontSize: '1.05em', padding: '14px 32px' }}
              >
                {language === 'zh' ? '完成' : language === 'ms' ? 'Selesai' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default RegistrationSuccessResult;
