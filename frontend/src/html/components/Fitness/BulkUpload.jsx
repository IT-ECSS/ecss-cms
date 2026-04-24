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
      validationPassed: false,
      existingParticipants: [],
      existingLoaded: false,
    };
    this.uploadStatusRef = React.createRef();
  }

  componentDidMount() {
    if (this.props.event) this.fetchExistingParticipants();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.event !== this.props.event && this.props.event) {
      this.fetchExistingParticipants();
    }
  }

  fetchExistingParticipants = async () => {
    const { event } = this.props;
    if (!event?.id) return;
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getParticipants`, { fileId: event.id });
      if (res.data && Array.isArray(res.data)) {
        this.setState({ existingParticipants: res.data, existingLoaded: true }, () => this.props.onFilesChange?.());
      } else {
        this.setState({ existingLoaded: true }, () => this.props.onFilesChange?.());
      }
    } catch (err) {
      console.warn('Could not fetch existing participants:', err.message);
      this.setState({ existingLoaded: true }, () => this.props.onFilesChange?.());
    }
  };

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
    // Use only rows not already registered; fall back to all rows if check hasn't completed
    const excelData = this.uploadStatusRef.current?.getNewOnlyData?.()
      ?? this.uploadStatusRef.current?.state?.excelData
      ?? [];

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

      // Build a start→end lookup map from the event's time slots string
      // e.g. "Slot 1: 08:00-09:00, Slot 2: 09:00-10:00" → { "08:00": "09:00", "09:00": "10:00" }
      const slotMap = {};
      if (event?.timeSlots) {
        String(event.timeSlots).split(',').map(s => s.trim()).filter(Boolean).forEach(part => {
          const m = part.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
          if (m) {
            const pad = t => t.length === 4 ? '0' + t : t;
            slotMap[pad(m[1])] = pad(m[2]);
          }
        });
      }

      for (let index = 0; index < data.length; index++) {
        const row = data[index];
        const currentEntry = index + 1;
        const totalEntries = data.length;

        // Update progress state
        this.setState({ uploadProgress: currentEntry, totalEntries }, () => this.props.onFilesChange?.());

        try {
          const nameRaw = String(row['Full Name (as Per NRIC)'] || row.Name || '').trim();
          if (!nameRaw) {
            // Row has no name — skip silently (shouldn't reach here after frontend filtering)
            skipCount++;
            continue;
          }
          const nameVal = nameRaw.toLowerCase().replace(/(^\w|\s\w)/g, c => c.toUpperCase());
          const startTime = row['Start Time (HH:MM - 24 hrs format)'] || row['Start Time'] || '';
          const endTime = row['End Time (HH:MM - 24 hrs format)'] || row['End Time'] || row['Time End'] || (startTime ? slotMap[startTime] : '') || '';
          const participantData = {
            entryMethod: 'Bulk Registration',
            name: nameVal,
            phone: row['Phone Number (No country code)'] || row['Phone Number'] || '',
            gender: row['Gender (M/F)'] || row.Gender || '',
            dateOfBirth: `${row.DD}/${row.MM}/${row.YYYY}`,
            startTime,
            endTime,
            age: row.Age || '',
            height: row.Height || '',
            weight: row.Weight || '',
            bmi: row.BMI || '',
            dateOfTest: row['Date of test'] || '',
            '30 secs Sit & Stand': row['30 secs Sit & Stand'] || '',
            '30 secs Dumbbell Curl': row['30 secs Dumbbell Curl'] || '',
            '2 min On-the-spot Marching': row['2 min On-the-spot Marching'] || '',
            'Sit & Reach': row['Sit & Reach'] || '',
            'Back Stretching': row['Back Stretching'] || '',
            '2.44m Speed Walk': row['2.44m Speed Walk'] || '',
            'Grip test': row['Grip test'] || '',
            Improvements: row.Improvements || '',
            Remarks: row.Remarks || '',
          };

          const response = await axios.post(`${BACKEND_URL}/googleDrive/fftSubmit`, {
            eventName: event.name,
            eventFileId: event.id,
            entryMethod: 'Bulk Registration',
            participantData
          });

          if (response.data?.alreadyRegistered) {
            skipCount++;
            continue;
          }

          if (!response.data?.success) {
            console.error('Failed to upload participant:', response.data?.error || response.data);
            failCount++;
            continue;
          }

          successCount++;
        } catch (error) {
          if (error.response && error.response.status === 409 && error.response.data?.alreadyRegistered) {
            skipCount++;
          } else {
            console.error('Failed to upload participant:', error);
            failCount++;
          }
        }
      }

      // Upload complete — auto-reset after a short delay
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
      }, () => {
        this.props.onFilesChange?.();
      });
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
      reviewing: false,
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

        {/* Section 2: Upload Status - Always mounted so it can manage action buttons */}
        <UploadStatus
          ref={this.uploadStatusRef}
          reviewing={reviewing}
          uploading={uploading}
          uploadProgress={uploadProgress}
          results={results}
          files={files}
          event={this.props.event}
          existingParticipants={this.state.existingParticipants}
          existingLoaded={this.state.existingLoaded}
          onConfirmUpload={this.handleConfirmUpload}
          onValidationComplete={() => this.props.onFilesChange?.()}
          onExistingLoaded={() => this.props.onFilesChange?.()}
          onClear={this.handleClear}
          onReview={this.handleReview}
          onReset={this.handleReset}
          onDone={() => { this.handleReset(); this.props.onUploadComplete?.(); }}
        />
      </div>
    );
  }
}

export default BulkUpload;
