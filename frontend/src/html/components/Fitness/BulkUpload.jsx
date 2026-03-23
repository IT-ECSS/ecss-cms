import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/fftStaff.css';
import UploadSection from './UploadSection';
import UploadStatus from './UploadStatus';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class BulkUpload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      files: [],
      reviewing: false,
      uploading: false,
      uploadProgress: 0,
      results: null,
      validationPassed: false, // Track if validation has passed
    };
    this.uploadStatusRef = React.createRef();
  }

  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };


  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    this.setState({ files }, () => this.props.onFilesChange?.());
  };

  handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    this.setState({ files }, () => this.props.onFilesChange?.());
  };

  handleReview = () => {
    const { files } = this.state;
    if (files.length === 0) return;
    this.setState({ reviewing: true, validationPassed: false }, () => this.props.onFilesChange?.());
  };

  handleConfirmUpload = () => {
    const { files, validationPassed } = this.state;
    if (files.length === 0) return;

    // Skip confirmation stage - go straight to upload
    this.handleFinalUpload();
  };

  handleFinalUpload = async () => {
    const { files } = this.state;
    const { event } = this.props;
    const excelData = this.uploadStatusRef.current?.state?.excelData || [];

    if (!event) {
      console.error('Event not selected');
      return;
    }

    // Start actual upload process
    this.setState({ uploading: true, uploadProgress: 0 }, () => this.props.onFilesChange?.());

    // Prepare data for backend
    const uploadPayload = {
      event: event,
      data: excelData,
      timestamp: new Date().toISOString()
    };

    try {
      // Make API calls to backend using /googleDrive/fftSubmit for each participant
      const { event, data } = uploadPayload;
      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;

      for (let index = 0; index < data.length; index++) {
        const row = data[index];
        const currentEntry = index + 1;
        const totalEntries = data.length;

        // Update progress state
        this.setState({ uploadProgress: currentEntry, totalEntries }, () => this.props.onFilesChange?.());

        try {
          const participantData = {
            name: row.Name || '',
            phone: row['Phone Number'] || '',
            gender: row.Gender || '',
            dateOfBirth: `${row.DD}/${row.MM}/${row.YYYY}`,
            age: row.Age || ''
          };

          const response = await axios.post(`${BACKEND_URL}/googleDrive/fftSubmit`, {
            eventName: event.name,
            eventFileId: event.id,
            participantData
          });

          console.log('Participant uploaded:', response.data);
          successCount++;
        } catch (error) {
          // 409 means duplicate — skip silently
          if (error.response && error.response.status === 409 && error.response.data?.alreadyRegistered) {
            console.log('Duplicate participant skipped:', error.response.data.message);
            skipCount++;
          } else {
            console.error('Failed to upload participant:', error);
            failCount++;
          }
        }
      }

      // Upload complete
      this.setState({
        uploading: false,
        uploadProgress: 100,
        results: {
          total: data.length,
          successful: successCount,
          skipped: skipCount,
          failed: failCount,
          status: 'completed',
          uploadSuccess: failCount === 0
        },
      }, () => this.props.onFilesChange?.());
    } catch (error) {
      console.error('Upload failed:', error);
      
      // Upload failed
      this.setState({
        uploading: false,
        uploadProgress: 0,
        results: {
          total: excelData.length,
          successful: 0,
          failed: excelData.length,
          status: 'completed',
          uploadSuccess: false
        },
      }, () => this.props.onFilesChange?.());
    }
  };

  handleClear = () => {
    this.setState({ files: [], reviewing: false, validationPassed: false }, () => this.props.onFilesChange?.());
  };

  handleReset = () => {
    this.setState({
      files: [],
      uploading: false,
      uploadProgress: 0,
      results: null,
      validationPassed: false,
    });
  };

  render() {
    const { files, reviewing, uploading, uploadProgress, results } = this.state;

    return (
      <div className="fft-staff-bulk-upload-wrapper">
        {/* Section 1: Upload Section */}
        {!results && !reviewing && !uploading && (
          <UploadSection
            files={files}
            uploading={uploading}
            results={results}
            event={this.props.event}
            onDragOver={this.handleDragOver}
            onDrop={this.handleDrop}
            onFileSelect={this.handleFileSelect}
          />
        )}

        {/* Section 2: Upload Status - Show when reviewing, and stay visible during upload */}
        {reviewing && (
          <UploadStatus
            ref={this.uploadStatusRef}
            reviewing={reviewing}
            uploading={uploading}
            uploadProgress={uploadProgress}
            results={results}
            files={files}
            onConfirmUpload={this.handleConfirmUpload}
            onValidationComplete={() => this.props.onFilesChange?.()}
          />
        )}
      </div>
    );
  }
}

export default BulkUpload;
