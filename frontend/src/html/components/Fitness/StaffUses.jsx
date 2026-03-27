import React, { Component } from 'react';
import BulkUpload from './BulkUpload';
import ReviewParticipantsResult from './ReviewParticipantsResult';
import EditParticipants from './EditParticipants';
import '../../../css/fftStaff.css';

// ─────────────────────────────────────────────
// StaffUses Component
// ─────────────────────────────────────────────
class StaffUses extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      view: null,
    };
    this.editParticipantsRef = React.createRef();
  }

  resetAll = () => {
    this.props.bulkUploadRef?.current?.handleReset?.();
    this.editParticipantsRef.current?.reset?.();
    this._reviewRef?.reset?.();
    this.setState({ view: null });
  };

  handleBack = () => {
    const { view } = this.state;

    if (view === 'bulkUpload') {
      const bulkUpload = this.props.bulkUploadRef?.current;
      if (bulkUpload) {
        const { reviewing, files } = bulkUpload.state;
        if (reviewing) {
          // Step 1: Back from Review → go back to file selection
          bulkUpload.setState({ reviewing: false });
          return;
        }
        if (files && files.length > 0) {
          // Step 2: File selected → clear file, stay on upload screen
          bulkUpload.handleClear();
          return;
        }
        // Step 3: Empty upload screen → go to Staff Uses menu
        bulkUpload.handleReset();
      }
      this.setState({ view: null });
      return;
    }

    if (view === 'reviewResults' || view === 'editParticipants') {
      if (view === 'editParticipants') {
        this.editParticipantsRef.current?.reset?.();
      }
      if (view === 'reviewResults') {
        this._reviewRef?.reset?.();
      }
      this.setState({ view: null });
      return;
    }

    // At Staff Uses home — go back to event selection
    if (!view) {
      this.props.onBack && this.props.onBack();
    }
  };

  render() {
    const { event, onViewChange, initialEntryNumber, bulkUploadRef, onFilesChange } = this.props;
    const { view } = this.state;

    return (
      <>
        {/* Always render both components, but only show the active one */}
        {/* BulkUpload is always mounted to preserve file state */}
        <div style={{ display: view === 'bulkUpload' ? 'block' : 'none' }}>
          <BulkUpload ref={bulkUploadRef} onFilesChange={onFilesChange} event={event} onUploadComplete={() => { this.setState({ view: null }); this.props.onUploadDone?.(); }} />
        </div>

        {/* ReviewParticipantsResult is always mounted to preserve review state */}
        <div style={{ display: view === 'reviewResults' ? 'block' : 'none' }}>
          <ReviewParticipantsResult
            ref={(r) => { this._reviewRef = r; }}
            initialEvent={event}
            initialEntryNumber={initialEntryNumber}
            onStateChange={(evt, num) => {
              // Handle state changes from ReviewParticipantsResult
            }}
          />
        </div>

        {/* EditParticipants is always mounted to preserve state */}
        <div style={{ display: view === 'editParticipants' ? 'block' : 'none' }}>
          <EditParticipants ref={this.editParticipantsRef} event={event} />
        </div>

        {/* Staff Uses home screen */}
        {view === null && (
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h2 style={{ margin: 0, fontWeight: 700 }}>Staff Uses</h2>
              <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
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
              <button type="button" className="fft-event-btn" onClick={() => {
                this.setState({ view: 'editParticipants' }, () => {
                  this.editParticipantsRef.current?.fetchParticipants?.();
                });
              }}>
                <i className="fas fa-user-edit"></i>
                <div className="fft-event-btn-name">Edit Participants</div>
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
}

export default StaffUses;
