import React, { Component } from 'react';
import '../../../css/fftStaff.css';

class UploadSubSection extends Component {
  render() {
    const { files, onDragOver, onDrop, onFileSelect } = this.props;

    return (
      <div>
        {/* Step 1 Header */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '1.71875rem', fontWeight: '600', margin: '0 0 12px 0', color: files.length > 0 ? '#166534' : '#212121' }}>
            {files.length === 0 ? 'Select Files' : 'File Selected'}
          </h4>
          <hr style={{ border: 'none', borderTop: files.length > 0 ? '2px solid #22c55e' : '2px solid #e2e6ed', marginBottom: '12px' }} />
          <p style={{ fontSize: '1.25rem', color: files.length > 0 ? '#166534' : '#212121' }}>
            {files.length === 0
              ? 'Upload The Excel File'
              : 'Click the upload button below to process your file. Click Clear if you want to select a different file.'}
          </p>
        </div>

        <label
          className="fft-staff-drag-drop"
          style={{
            cursor: 'pointer',
            ...(files.length > 0 && {
              borderColor: '#166534',
              borderStyle: 'dotted',
            }),
          }}
        >
          <input
            type="file"
            multiple
            onChange={onFileSelect}
            style={{ display: 'none' }}
            accept=".xlsx,.xls,.csv"
          />
          {files.length === 0 && (
            <div
              onDragOver={onDragOver}
              onDrop={onDrop}
              style={{ pointerEvents: 'none' }}
            >
              <i className="fas fa-file-upload"></i>
              <p className="fft-staff-drag-text" style={{ fontSize: '1.4375rem' }}>Drag and drop your files here</p>
              <p className="fft-staff-drag-text" style={{ fontSize: '1.4375rem' }}>or click to browse</p>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <p className="fft-staff-drag-text" style={{ color: '#166534' }}>Selected File</p>
              {files.map((file, idx) => (
                <p key={idx} className="fft-staff-drag-text" style={{ color: '#166534', fontSize: '1.4375rem' }}>
                  {file.name}
                </p>
              ))}
            </div>
          )}
        </label>
      </div>
    );
  }
}

export default UploadSubSection;
