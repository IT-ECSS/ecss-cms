import React, { Component } from 'react';
import '../../css/submissionInProgressPopup.css';

class SubmissionInProgressPopup extends Component {
  render() {
    const { isOpen } = this.props;

    if (!isOpen) return null;

    return (
      <div className="submission-in-progress-overlay" role="dialog" aria-modal="true" aria-label="Submission in progress">
        <div className="submission-in-progress-modal" role="status" aria-live="polite">
          {/* Header Section - All Three Languages */}
          <div className="submission-progress-header">
            <div className="submission-progress-titles">
              <h2 className="submission-progress-title">Submission in Progress</h2>
              <h2 className="submission-progress-title">正在提交中</h2>
              <h2 className="submission-progress-title">Sedang Menghantar</h2>
            </div>
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

            {/* Status Messages - All Three Languages */}
            <div className="submission-status-messages">
              <div className="submission-message-group">
                <p className="submission-message-primary">Processing registration...</p>
                <p className="submission-message-secondary">Please wait</p>
              </div>
              <div className="submission-message-group">
                <p className="submission-message-primary">正在处理注册...</p>
                <p className="submission-message-secondary">请稍候</p>
              </div>
              <div className="submission-message-group">
                <p className="submission-message-primary">Memproses pendaftaran...</p>
                <p className="submission-message-secondary">Sila tunggu</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default SubmissionInProgressPopup;
