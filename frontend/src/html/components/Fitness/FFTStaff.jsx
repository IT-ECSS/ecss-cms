import React, { Component } from 'react';
import EventSelection from './EventSelection';
import StaffUses from './StaffUses';
import UploadResultModal from './UploadResultModal';
import '../../../css/fftParticipants.css';
import '../../../css/fftStaff.css';

// ─────────────────────────────────────────────
// FFTStaff
// ─────────────────────────────────────────────
class FFTStaff extends Component {
  storageKey = 'fftStaffState';

  constructor(props) {
    super(props);
    
    // Try to restore state from localStorage
    let savedState = { event: null, section: 'selectEvent' };
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        savedState = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not restore FFTStaff state from localStorage');
    }
    
    this.state = {
      event: props.initialEvent || savedState.event,
      section: props.initialEvent ? 'staffUses' : (savedState.section || 'selectEvent'),
    };
    this.bulkUploadRef = React.createRef();
    this.staffUsesRef = React.createRef();
  }

  componentDidUpdate() {
    // Save state to localStorage whenever it changes
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        event: this.state.event,
        section: this.state.section,
      }));
    } catch (e) {
      console.warn('Could not save FFTStaff state to localStorage');
    }
  }

  handleBack = () => {
    const { section } = this.state;
    
    // If in Staff Uses section, handle navigation within Staff Uses first
    if (section === 'staffUses' && this.staffUsesRef.current) {
      const staffUses = this.staffUsesRef.current;
      const currentView = staffUses.state.view;
      
      // If in a sub-section (bulkUpload or reviewResults), go back to Staff Uses home
      if (currentView === 'bulkUpload' || currentView === 'reviewResults') {
        staffUses.setState({ view: null });
        return;
      }
      
      // If at Staff Uses home (view: null), go back to event selection
      if (currentView === null) {
        this.setState({ section: 'selectEvent', event: null });
        return;
      }
    }
    
    // If in event selection, go to parent
    if (section === 'selectEvent') {
      this.props.onBack && this.props.onBack();
    }
  };

  render() {
    const { onBack } = this.props;
    const { event, section } = this.state;

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-staff-form">

          {/* Nav row: back + home buttons + event badge */}
          <div className="fft-staff-header-top-row">
            <button
              type="button"
              className="fft-staff-icon-btn"
              onClick={this.handleBack}
              title="Back"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <button
              type="button"
              className="fft-staff-icon-btn"
              onClick={() => this.props.onBack && this.props.onBack()}
              title="Home"
            >
              <i className="fas fa-home"></i>
            </button>
            
            {/* Event Badge - Show when event is selected */}
            {event && (
              <div style={{ marginLeft: '20px', flex: 1 }}>
                <div className="fft-staff-event-badge">
                  <span className="fft-staff-event-badge-label">Event</span>
                  <span className="fft-staff-event-badge-name">{event.name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Landing - Show sections one at a time */}
          <div className="fft-staff-landing-container">
            {section === 'selectEvent' && (
              <EventSelection
                onSelectEvent={(selectedEvent) => this.setState({ event: selectedEvent, section: 'staffUses' })}
              />
            )}

            {section === 'staffUses' && (
              <StaffUses
                ref={this.staffUsesRef}
                event={event}
                initialEntryNumber={this.props.initialEntryNumber}
                bulkUploadRef={this.bulkUploadRef}
                onFilesChange={() => this.forceUpdate()}
                onBack={() => this.setState({ section: 'selectEvent', event: null })}
              />
            )}
          </div>

          {/* Footer: Action Buttons */}
          {section === 'staffUses' && this.bulkUploadRef.current && (() => {
            const bulkUpload = this.bulkUploadRef.current;
            const { files, reviewing, uploading, results } = bulkUpload.state;
            
            // Don't show footer buttons if upload is completed (show modal instead)
            if (results && results.status === 'completed') {
              return null;
            }
            
            // Show Clear/Review buttons (file selection only with files selected)
            if (files.length > 0 && !reviewing && !uploading && !results) {
              return (
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', padding: '0 20px' }}>
                  <button
                    className="fft-staff-reset-btn"
                    onClick={() => bulkUpload.handleClear()}
                    style={{ flex: 1 }}
                  >
                    Clear
                  </button>
                  <button
                    className="fft-staff-upload-btn"
                    onClick={() => bulkUpload.handleReview()}
                    style={{ flex: 1 }}
                  >
                    Review
                  </button>
                </div>
              );
            }

            // Show buttons during review (based on validation state)
            if (reviewing && !results) {
              const uploadStatus = bulkUpload.uploadStatusRef?.current;
              const showValidation = uploadStatus?.state?.showValidation;
              const rowsWithErrors = uploadStatus?.state?.rowsWithErrors || [];
              const hasErrors = rowsWithErrors.length > 0;
              
              // Stage 1: No validation started yet
              if (!showValidation) {
                return (
                  <div style={{ marginTop: '20px', padding: '0 20px' }}>
                    <button
                      onClick={() => uploadStatus?.handleValidateAll()}
                      className="fft-staff-upload-btn"
                      style={{ 
                        width: '100%',
                        color: '#999999',
                        borderColor: '#999999'
                      }}
                    >
                      Validate
                    </button>
                  </div>
                );
              }

              // Stage 2: Validation has errors - Show Try Again
              if (hasErrors) {
                return (
                  <div style={{ marginTop: '20px', padding: '0 20px' }}>
                    <button
                      className="fft-staff-reset-btn"
                      onClick={() => {
                        // Reset UploadStatus validation state
                        uploadStatus.setState({ validationComplete: false, validationResults: {}, showValidation: false, rowsWithErrors: [] });
                        // Reset BulkUpload to go back to Upload Section
                        bulkUpload.setState({ files: [], reviewing: false, validationPassed: false }, () => {
                          // Trigger parent re-render after state is updated
                          this.forceUpdate();
                        });
                      }}
                      style={{ width: '100%' }}
                    >
                      Try Again
                    </button>
                  </div>
                );
              }

              // Stage 3: Validation passed - Show Upload button
              if (showValidation && !hasErrors) {
                return (
                  <div style={{ marginTop: '20px', padding: '0 20px' }}>
                    <button
                      onClick={() => bulkUpload.handleConfirmUpload()}
                      className="fft-staff-upload-btn"
                      style={{ width: '100%' }}
                    >
                      Upload
                    </button>
                  </div>
                );
              }
            }
          })()}

          {/* Modal Overlay for Upload Results */}
          {section === 'staffUses' && this.bulkUploadRef.current && (
            <UploadResultModal
              uploading={this.bulkUploadRef.current.state.uploading}
              uploadProgress={this.bulkUploadRef.current.state.uploadProgress}
              totalEntries={this.bulkUploadRef.current.state.totalEntries}
              results={this.bulkUploadRef.current.state.results}
              onOK={() => {
                const bulkUpload = this.bulkUploadRef.current;
                bulkUpload.handleReset();
                this.props.onBack && this.props.onBack();
              }}
            />
          )}
        </div>
      </div>
    );
  }
}

export default FFTStaff;
