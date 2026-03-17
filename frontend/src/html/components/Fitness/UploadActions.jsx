import React, { Component } from 'react';
import '../../../css/fftStaff.css';

class UploadActions extends Component {
  render() {
    const { files, uploading, results, onClear, onUpload } = this.props;

    if (!(files.length > 0 && !uploading && !results)) {
      return null;
    }

    return (
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button
          className="fft-staff-reset-btn"
          onClick={onClear}
          style={{ flex: 1 }}
        >
          Clear
        </button>
        <button
          className="fft-staff-upload-btn"
          onClick={onUpload}
          style={{ flex: 1 }}
        >
          Upload Files
        </button>
      </div>
    );
  }
}

export default UploadActions;
