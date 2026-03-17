import React, { Component } from 'react';
import '../../../css/fftStaff.css';

class ResultSection extends Component {
  render() {
    const { results, excelData, onConfirmUpload, onReset } = this.props;

    if (!results) {
      return null;
    }

    // Confirmation stage - before upload
    if (results.status === 'ready') {
      return (
        <div>
          <div style={{ marginBottom: '20px', marginTop: '20px' }}>
            <h4 style={{ fontSize: '1.71875rem', fontWeight: '700', color: '#212121', margin: '0 0 12px' }}>
              Upload Confirmation
            </h4>
            <hr style={{ border: 'none', borderTop: '2px solid #e2e6ed', margin: '0 0 12px' }} />
            <p style={{ fontSize: '1.25rem', color: '#555', margin: '0' }}>
              Click "Upload" to submit for pre-registration
            </p>
          </div>
        </div>
      );
    }

    // Completed stage - after upload
    const { uploadSuccess, failed } = results;
    
    // If upload was successful
    if (uploadSuccess && failed === 0) {
      return (
        <div>
          <div style={{ marginBottom: '20px', marginTop: '20px' }}>
            <h4 style={{ fontSize: '1.71875rem', fontWeight: '700', color: '#212121', margin: '0 0 12px' }}>
              Upload Successful
            </h4>
            <hr style={{ border: 'none', borderTop: '2px solid #e2e6ed', margin: '0 0 12px' }} />
            <p style={{ fontSize: '1.25rem', color: '#16a34a', margin: '0', fontWeight: '600' }}>
              ✓ Your participant details have been submitted successfully for pre-registration
            </p>
          </div>
        </div>
      );
    }

    // If upload failed or has errors
    return (
      <div>
        <div style={{ marginBottom: '20px', marginTop: '20px' }}>
          <h4 style={{ fontSize: '1.71875rem', fontWeight: '700', color: '#212121', margin: '0 0 12px' }}>
            Upload Results
          </h4>
          <hr style={{ border: 'none', borderTop: '2px solid #e2e6ed', margin: '0 0 12px' }} />
          <p style={{ fontSize: '1.25rem', color: '#dc2626', margin: '0', fontWeight: '600' }}>
            ✗ Some records failed to upload. Please review and try again.
          </p>
        </div>

        <div className="fft-staff-results-grid">
          <div className="fft-staff-result-card">
            <div className="fft-staff-result-icon success">
              <i className="fas fa-check"></i>
            </div>
            <div className="fft-staff-result-content">
              <p className="fft-staff-result-label">Successful</p>
              <p className="fft-staff-result-value">{results.successful}</p>
            </div>
          </div>
          {results.failed > 0 && (
            <div className="fft-staff-result-card">
              <div className="fft-staff-result-icon failed">
                <i className="fas fa-times"></i>
              </div>
              <div className="fft-staff-result-content">
                <p className="fft-staff-result-label">Failed</p>
                <p className="fft-staff-result-value">{results.failed}</p>
              </div>
            </div>
          )}
          <div className="fft-staff-result-card">
            <div className="fft-staff-result-icon total">
              <i className="fas fa-list"></i>
            </div>
            <div className="fft-staff-result-content">
              <p className="fft-staff-result-label">Total</p>
              <p className="fft-staff-result-value">{results.total}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ResultSection;
