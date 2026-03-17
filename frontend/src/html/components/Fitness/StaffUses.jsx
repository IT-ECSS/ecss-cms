import React, { Component } from 'react';
import BulkUpload from './BulkUpload';
import ReviewParticipantsResult from './ReviewParticipantsResult';
import '../../../css/fftStaff.css';

// ─────────────────────────────────────────────
// StaffUses Component
// ─────────────────────────────────────────────
class StaffUses extends Component {
  storageKey = 'staffUsesView';

  constructor(props) {
    super(props);
    
    // Try to restore view from localStorage
    let savedView = null;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        savedView = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not restore StaffUses view from localStorage');
    }
    
    this.state = {
      view: savedView || null, // Start at Staff Uses home screen to select option
    };
  }

  componentDidUpdate() {
    // Save view to localStorage whenever it changes
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state.view));
    } catch (e) {
      console.warn('Could not save StaffUses view to localStorage');
    }
  }

  handleBack = () => {
    const { view } = this.state;
    
    // If in a sub-section (bulkUpload or reviewResults), go back to Staff Uses home
    if (view === 'bulkUpload' || view === 'reviewResults') {
      this.setState({ view: null });
      return;
    }
    
    // If at Staff Uses home, go back to parent (event selection)
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
          <BulkUpload ref={bulkUploadRef} onFilesChange={onFilesChange} event={event} />
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
            </div>
          </div>
        )}
      </>
    );
  }
}

export default StaffUses;
