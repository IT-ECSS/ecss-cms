import React, { Component } from 'react';
import BulkUpload from './BulkUpload';
import ReviewParticipantsResult from './ReviewParticipantsResult';
import '../../../css/fftStaff.css';

// ─────────────────────────────────────────────
// StaffUses Component
// ─────────────────────────────────────────────
class StaffUses extends Component {
  constructor(props) {
    super(props);
    this.state = {
      view: 'bulkUpload', // Default to bulk upload view
    };
  }

  handleBack = () => {
    const { view } = this.state;
    if (view === 'reviewResults' && this._reviewRef && this._reviewRef.canGoBack()) {
      this._reviewRef.handleBack();
    } else if (view) {
      this.setState({ view: null });
    } else {
      this.props.onBack && this.props.onBack();
    }
  };

  render() {
    const { event, onViewChange, initialEntryNumber, bulkUploadRef, onFilesChange } = this.props;
    const { view } = this.state;

    if (view === 'bulkUpload') {
      return <BulkUpload ref={bulkUploadRef} onFilesChange={onFilesChange} event={event} />;
    }

    if (view === 'reviewResults') {
      return (
        <ReviewParticipantsResult
          ref={(r) => { this._reviewRef = r; }}
          initialEvent={event}
          initialEntryNumber={initialEntryNumber}
          onStateChange={(evt, num) => {
            // Handle state changes from ReviewParticipantsResult
          }}
        />
      );
    }

    return (
      <div className="fft-participants-section">
        <div className="fft-participants-section-header">
          <h3 className="fft-participants-section-title">Staff Uses</h3>
          <hr style={{ margin: '12px 0' }} />
          <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1.25em' }}>
            Please select an option to continue.
          </div>
        </div>
        <div className="fft-events-buttons-container">
          <button type="button" className="fft-event-btn" onClick={() => this.setState({ view: 'bulkUpload' })}>
            <i className="fas fa-file-upload"></i>
            <div className="fft-event-btn-name">Bulk Upload</div>
          </button>
          <button type="button" className="fft-event-btn" onClick={() => this.setState({ view: 'reviewResults' })}>
            <i className="fas fa-chart-bar"></i>
            <div className="fft-event-btn-name">Review Results</div>
          </button>
        </div>
      </div>
    );
  }
}

export default StaffUses;
