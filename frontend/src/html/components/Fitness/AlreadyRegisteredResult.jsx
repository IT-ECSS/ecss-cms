import React, { Component } from 'react';
import PropTypes from 'prop-types';
import fftTranslations from './fftTranslations';

class AlreadyRegisteredResult extends Component {
  static propTypes = {
    language: PropTypes.string,
    errorMessage: PropTypes.string,
    onFinish: PropTypes.func,
    onResetForm: PropTypes.func,
  };

  handleFinish = () => {
    this.props.onResetForm?.();
    this.props.onFinish?.();
  }

  render() {
    const { language, errorMessage } = this.props;
    const displayMessage = errorMessage || (fftTranslations.errorAlreadyRegistered?.[language] || fftTranslations.errorAlreadyRegistered?.en);

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section" style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
            {/* Header section */}
            <div className="fft-participants-section-header" style={{ textAlign: 'left' }}>
              <h2 style={{ margin: 0, fontWeight: 700 }}>
                {language === 'zh' ? '注册未成功' : language === 'ms' ? 'Pendaftaran Tidak Berjaya' : 'Registration Not Successful'}
              </h2>
              <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
            </div>

            {/* Error message display */}
            <div
              style={{
                display: 'inline-block',
                marginTop: '32px',
                padding: '24px 48px',
                borderRadius: '16px',
                backgroundColor: '#fff3cd',
                border: '2px solid #ffc107',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.25em', fontWeight: 700, color: '#856404', lineHeight: 1.6 }}>
                {displayMessage}
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

export default AlreadyRegisteredResult;
