import React, { Component } from 'react';
import '../../../css/fftStaffOptions.css';

class StaffOptions extends Component {
  // Props:
  //   event              – selected event object
  //   onSelectBulkUpload – callback when Bulk Upload is clicked
  //   onSelectReviewResults – callback when Review Results is clicked

  render() {
    const { event, onSelectBulkUpload, onSelectReviewResults } = this.props;

    return (
      <div className="fft-staff-options-container">
        <div className="fft-staff-options-wrapper">
          <div className="fft-staff-options-section">
            <div className="fft-staff-options-header">
              <h3 className="fft-staff-options-title">Staff Uses</h3>
              <hr className="fft-staff-options-divider" />
              <div className="fft-staff-options-description">
                Please select an option to continue.
              </div>
            </div>
            <div className="fft-staff-options-buttons">
              <button type="button" className="fft-staff-option-btn" onClick={onSelectBulkUpload}>
                <div className="fft-staff-option-btn-name">Bulk Upload</div>
              </button>
              <button type="button" className="fft-staff-option-btn" onClick={onSelectReviewResults}>
                <div className="fft-staff-option-btn-name">Review Results</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default StaffOptions;
