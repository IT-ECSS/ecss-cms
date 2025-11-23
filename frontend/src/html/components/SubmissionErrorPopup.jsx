import React, { Component } from 'react';
import '../../css/submissionErrorPopup.css';

class SubmissionErrorPopup extends Component {
  getTranslations = () => {
    const translations = {
      english: {
        title: 'Order Failed!',
        message: 'Something went wrong while processing your order. Please try again.',
        button: 'Try Again'
      },
      chinese: {
        title: '订单失败！',
        message: '处理您的订单时出了问题。请重试。',
        button: '重试'
      },
      malay: {
        title: 'Pesanan Gagal!',
        message: 'Sesuatu telah salah semasa memproses pesanan anda. Sila cuba lagi.',
        button: 'Cuba Lagi'
      }
    };
    return translations;
  }

  render() {
    const { isOpen, selectedLanguage = 'english', onClose } = this.props;

    if (!isOpen) return null;

    const translations = this.getTranslations();
    const lang = translations[selectedLanguage] || translations['english'];

    return (
      <div className="submission-error-modal-overlay">
        <div className="submission-error-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Error Icon */}
          <div className="submission-error-modal-icon">
            <div className="error-icon">
              <svg
                viewBox="0 0 52 52"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="26" cy="26" r="25" fill="none" stroke="#ef4444" strokeWidth="2" />
                <line x1="16" y1="16" x2="36" y2="36" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                <line x1="36" y1="16" x2="16" y2="36" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Header */}
          <h1 className="submission-error-modal-title">
            {lang.title}
          </h1>

          {/* Error Message */}
          <p className="submission-error-modal-message">
            {lang.message}
          </p>

          {/* Action Button */}
          <div className="submission-error-modal-actions">
            <button
              className="submission-error-modal-button"
              onClick={onClose}
            >
              {lang.button}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default SubmissionErrorPopup;
