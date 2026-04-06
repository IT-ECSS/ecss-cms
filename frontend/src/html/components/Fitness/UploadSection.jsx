import React, { Component } from 'react';
import '../../../css/fftStaff.css';
import UploadSubSection from './UploadSubSection';
import DownloadSubSection from './DownloadSubSection';

class UploadSection extends Component {
  render() {
    const { files, onDragOver, onDrop, onFileSelect, event } = this.props;


    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Upload sub-section */}
        <UploadSubSection
          files={files}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onFileSelect={onFileSelect}
        />

        {/* Download sub-section */}
        <DownloadSubSection
          eventName={event?.name}
        />
      </div>
    );
  }
}

export default UploadSection;
