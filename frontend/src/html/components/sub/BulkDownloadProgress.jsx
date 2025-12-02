import React, { Component } from 'react';
import '../../../css/sub/BulkDownloadProgress.css';

class BulkDownloadProgress extends Component {
  componentDidUpdate(prevProps) {
    // Auto-close modal 2 seconds after completion
    if (prevProps.status !== 'completed' && this.props.status === 'completed') {
      setTimeout(() => {
        this.props.onClose();
      }, 2000);
    }
  }

  render() {
    const { isOpen, status, error, onClose, onRetry } = this.props;

    if (!isOpen) return null;

    return (
      <div className="bulk-download-modal-overlay">
        <div className="bulk-download-modal">
          <div className="bulk-download-modal-body">
            {status === 'downloading' && (
              <>
                <h2 className="bulk-download-title">Bulk Download In Progress</h2>
                <div className="bouncing-balls-container">
                  <div className="bouncing-ball"></div>
                  <div className="bouncing-ball"></div>
                  <div className="bouncing-ball"></div>
                  <div className="bouncing-ball"></div>
                </div>
              </>
            )}

            {status === 'completed' && (
              <div className="completed-message">
                <p>✓ Download completed successfully!</p>
              </div>
            )}

            {error && status === 'error' && (
              <div className="error-message">
                <p><strong>Download Failed</strong></p>
                <p>{error}</p>
              </div>
            )}
          </div>

          {status === 'error' && (
            <div className="bulk-download-modal-footer">
              <button 
                className="cancel-btn" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                className="retry-btn" 
                onClick={onRetry}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default BulkDownloadProgress;
