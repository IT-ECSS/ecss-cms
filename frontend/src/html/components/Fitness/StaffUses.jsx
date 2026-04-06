import React, { Component } from 'react';
import axios from 'axios';
import ReviewParticipantsResult from './ReviewParticipantsResult';
import EditParticipants from './EditParticipants';
import ParticipantForm from './ParticipantForm';
import MasterDataTable from './MasterDataTable';
import AccessMasterData from './AccessMasterData';
import '../../../css/fftStaff.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const FFT_FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';

// ─────────────────────────────────────────────
// StaffUses Component
// ─────────────────────────────────────────────
class StaffUses extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      view: null,
      formSubmitSuccess: false,
      submittedParticipantNumber: null,
    };
    this.editParticipantsRef = React.createRef();
    this.participantFormRef = React.createRef();
  }

  staffViewStorageKey = 'fftStaffUsesView';
  staffHDStorageKey = 'fftStaffHDData';

  componentDidMount() {
    try {
      const saved = localStorage.getItem(this.staffViewStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.view) this.setState({ view: parsed.view });
      }
    } catch (e) {}
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.view !== this.state.view) {
      try {
        localStorage.setItem(this.staffViewStorageKey, JSON.stringify({ view: this.state.view }));
      } catch (e) {}
    }
  }

  resetAll = () => {
    this.editParticipantsRef.current?.reset?.();
    this._reviewRef?.reset?.();
    localStorage.removeItem(this.staffViewStorageKey);
    localStorage.removeItem(this.staffHDStorageKey);
    localStorage.removeItem('fftParticularsSectionData');
    localStorage.removeItem('fftHealthDeclarationData');
    localStorage.removeItem('fftIndemnityData');
    this.setState({ view: null, formSubmitSuccess: false, submittedParticipantNumber: null });
  };

  handleBack = () => {
    const { view } = this.state;

    if (view === 'reviewResults' || view === 'editParticipants' || view === 'masterData') {
      if (view === 'editParticipants') {
        this.editParticipantsRef.current?.reset?.();
      }
      if (view === 'reviewResults') {
        this._reviewRef?.reset?.();
      }
      this.setState({ view: null, formSubmitSuccess: false, submittedParticipantNumber: null });
      return;
    }

    if (view === 'healthDeclaration') {
      // Delegate to ParticipantForm's own back navigation (step 4→3→2→1.5→menu)
      if (this.participantFormRef.current) {
        this.participantFormRef.current.handleBack();
      } else {
        this.setState({ view: null, formSubmitSuccess: false, submittedParticipantNumber: null });
      }
      return;
    }

    // At Staff Uses home — go back to event selection
    if (!view) {
      this.props.onBack && this.props.onBack();
    }
  };

  handleFormSubmit = async (data) => {
    const { event } = this.props;
    const eventName = event?.name || (typeof event === 'string' ? event : '');
    const eventFileId = event?.id || '';

    try {
      const response = await axios.post(`${BACKEND_URL}/googleDrive/fftSubmit`, {
        folderId: FFT_FOLDER_ID,
        eventName,
        eventFileId,
        participantData: data,
        entryMethod: data.entryMethod,
        participantNumber: data.participantNumber,
      });
      if (response.data.success) {
        const pNum = response.data.participantNumber ?? data.participantNumber ?? null;
        this.setState({ formSubmitSuccess: true, submittedParticipantNumber: pNum });
      }
    } catch (err) {
      console.error('[StaffUses] Form submit error:', err);
    }
  };

  render() {
    const { event, onViewChange, initialEntryNumber } = this.props;
    const { view, formSubmitSuccess, submittedParticipantNumber } = this.state;

    return (
      <>
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

        {/* Health Declaration + Indemnity form — currently disabled */}
        {/* {view === 'healthDeclaration' && !formSubmitSuccess && (
          <ParticipantForm
            ref={this.participantFormRef}
            language="en"
            event={event}
            skipToParticipantNumber={true}
            storageKey={this.staffHDStorageKey}
            showParticipantNumber={true}
            showSingpass={false}
            showManual={false}
            titleOverride="Health Declaration & Indemnity"
            descriptionOverride="Enter the participant number to pre-populate the form."
            onSubmit={this.handleFormSubmit}
            onBack={() => {
              localStorage.removeItem(this.staffHDStorageKey);
              localStorage.removeItem('fftParticularsSectionData');
              localStorage.removeItem('fftHealthDeclarationData');
              localStorage.removeItem('fftIndemnityData');
              this.setState({ view: null, formSubmitSuccess: false, submittedParticipantNumber: null });
            }}
            onHome={this.props.onBack}
          />
        )} */}

        {/* Success screen after health declaration submission — currently disabled */}
        {/* {view === 'healthDeclaration' && formSubmitSuccess && (
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h2 style={{ margin: 0, fontWeight: 700 }}>Health Declaration &amp; Indemnity Form Submitted</h2>
              <hr style={{ margin: '12px 0 12px 0', border: 'none', borderTop: '1px solid #ddd' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0' }}>
              {submittedParticipantNumber != null && (
                <div style={{
                  display: 'inline-block', padding: '24px 56px',
                  borderRadius: '12px', background: '#f5f5f5',
                  border: '2px solid #2e7d32', marginBottom: '24px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.75em', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>
                    Participant Number
                  </div>
                  <div style={{ fontSize: '3.5em', fontWeight: 800, color: '#2e7d32', lineHeight: 1 }}>
                    {submittedParticipantNumber}
                  </div>
                </div>
              )}
              <p style={{ color: '#555', fontSize: '0.95em', marginBottom: '24px', textAlign: 'center' }}>
                After issuing the lanyard to participant, he/she may proceed to waiting area or Measurement Station.
              </p>
              <button
                type="button"
                className="fft-create-event-btn"
                style={{ width: 'fit-content', color: '#2e7d32' }}
                onClick={() => this.props.onHome?.()}
              >
                Finish
              </button>
            </div>
          </div>
        )} */}

        {/* Access Master Data — AG Grid read-only table */}
        {view === 'masterData' && (
          <AccessMasterData mode="staff" initialEvent={event} />
        )}

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
              <button type="button" className="fft-event-btn" onClick={() => {
                this.setState({ view: 'editParticipants' }, () => {
                  this.editParticipantsRef.current?.fetchParticipants?.();
                });
              }}>
                <i className="fas fa-user-edit"></i>
                <div className="fft-event-btn-name">Edit Participants</div>
              </button>
              <button type="button" className="fft-event-btn" onClick={() => this.setState({ view: 'masterData' })}>
                <i className="fas fa-table"></i>
                <div className="fft-event-btn-name">Access Master Data (View Only)</div>
              </button>
              {/* Health Declaration + Indemnity button — currently disabled */}
              {/* <button type="button" className="fft-event-btn" onClick={() => this.setState({ view: 'healthDeclaration', formSubmitSuccess: false })}>
                <i className="fas fa-file-medical"></i>
                <div className="fft-event-btn-name">Health Declaration + Indemnity</div>
              </button> */}
            </div>
          </div>
        )}

      </>
    );
  }
}

export default StaffUses;
