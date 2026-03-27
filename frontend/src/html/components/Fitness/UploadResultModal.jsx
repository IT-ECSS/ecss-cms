import React, { Component } from 'react';
import '../../../css/uploadResultModal.css';

class UploadResultModal extends Component {
  render() {
    const { uploading, results, onOK } = this.props;

    // Don't show modal if no upload in progress and no results
    if (!uploading && !results) {
      return null;
    }

    // If upload in progress
    if (uploading) {
      const { uploadProgress, totalEntries } = this.props;
      const progressText = (uploadProgress && totalEntries) ? `${uploadProgress} out of ${totalEntries}` : '';
      const progressPercentage = (uploadProgress && totalEntries) ? Math.round((uploadProgress / totalEntries) * 100) : 0;
      
      return (
        <div className="modal-overlay">
          <div className="modal-content">
            <i className="fas fa-spinner fa-spin modal-icon"></i>
            <h3 className="modal-title">Uploading Data...</h3>
            <p className="modal-description">Please wait while we process your data</p>
            {progressText && <p className="modal-description" style={{ marginTop: '10px', fontSize: '14px' }}>Entry {progressText}</p>}
            {totalEntries && (
              <div style={{ marginTop: '20px', width: '100%' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: `${progressPercentage}%`,
                    height: '100%',
                    backgroundColor: '#4CAF50',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', margin: 0 }}>{progressPercentage}%</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // If upload completed - handled by footer Done/Try Again button, not modal
    if (results && results.status === 'completed') {
      return null;
    }

    return null;
  }
}

export default UploadResultModal;
