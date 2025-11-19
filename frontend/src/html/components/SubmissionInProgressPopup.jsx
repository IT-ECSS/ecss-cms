import React, { Component } from 'react';
import '../../css/submissionInProgressPopup.css';

class SubmissionInProgressPopup extends Component {
  /**
   * Component that displays a responsive submission progress modal
   * Features:
   * - Multilingual support (English, Chinese, Malay)
   * - Fully responsive design for all screen sizes
   * - Loading animation with bouncing balls
   * - Prevents background interaction
   * - Accessibility compliant
   */

  getTranslations = () => {
    const translations = {
      submissionInProgress: {
        english: 'Submission in Progress',
        chinese: '正在提交中',
        malay: 'Sedang Menghantar'
      },
      generatingInvoice: {
        english: 'Generating invoice...',
        chinese: '正在生成发票...',
        malay: 'Menjana invois...'
      },
      pleaseWait: {
        english: 'Please wait',
        chinese: '请稍候',
        malay: 'Sila tunggu'
      }
    };

    return translations;
  };

  render() {
    const { isOpen, selectedLanguage = 'english' } = this.props;

    if (!isOpen) return null;

    const translations = this.getTranslations();

    return (
      <div className="submission-in-progress-overlay" role="dialog" aria-modal="true" aria-label="Submission in progress">
        <div className="submission-in-progress-modal" role="status" aria-live="polite">
          {/* Header Section */}
          <div className="submission-progress-header">
            <h2 className="submission-progress-title">
              {translations.submissionInProgress[selectedLanguage] || translations.submissionInProgress['english']}
            </h2>
          </div>

          {/* Content Section with Loading Animation */}
          <div className="submission-progress-content">
            {/* Bouncing Balls Loader */}
            <div className="submission-loader">
              <div className="submission-ball submission-ball-1"></div>
              <div className="submission-ball submission-ball-2"></div>
              <div className="submission-ball submission-ball-3"></div>
              <div className="submission-ball submission-ball-4"></div>
            </div>

            {/* Status Messages */}
            <div className="submission-status-messages">
              <p className="submission-message-primary">
                {translations.generatingInvoice[selectedLanguage] || translations.generatingInvoice['english']}
              </p>
              <p className="submission-message-secondary">
                {translations.pleaseWait[selectedLanguage] || translations.pleaseWait['english']}
              </p>
            </div>
          </div>

          {/* Footer Section with Progress Indicator */}
          <div className="submission-progress-footer">
            <div className="submission-progress-bar">
              <div className="submission-progress-fill"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default SubmissionInProgressPopup;
