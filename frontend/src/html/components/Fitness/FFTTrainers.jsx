import React, { Component } from 'react';
import BulkUpload from './BulkUpload';
import ReviewParticipantsResult from './ReviewParticipantsResult';
import '../../../css/fftParticipants.css';
import '../../../css/fftTrainers.css';

// ─────────────────────────────────────────────
// FFTTrainers
// ─────────────────────────────────────────────
class FFTTrainers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      view: props.initialView || null,
      event: props.initialEvent || null,
    };
  }

  setTrainersState = (view, event, entryNumber = null) => {
    this.setState({ view, event });
    this.props.onStateChange && this.props.onStateChange(view, event, entryNumber);
  };

  handleBack = () => {
    const { view } = this.state;
    if (view === 'reviewResults' && this._reviewRef && this._reviewRef.canGoBack()) {
      this._reviewRef.handleBack();
    } else if (view) {
      this.setTrainersState(null, null, null);
    } else {
      this.props.onBack && this.props.onBack();
    }
  };

  render() {
    const { onBack } = this.props;
    const { view, event } = this.state;

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-form">

          {/* Nav row: back + home + event badge (when event selected) */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center', padding: '16px 16px 12px' }}>
            <button
              type="button"
              className="fft-participants-icon-btn"
              onClick={this.handleBack}
              title="Back"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <button
              type="button"
              className="fft-participants-icon-btn"
              onClick={() => this.props.onBack && this.props.onBack()}
              title="Home"
            >
              <i className="fas fa-home"></i>
            </button>
            {view === 'reviewResults' && event && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '1.3125em', color: '#555' }}>Click on the badge below to re-select your event</span>
                <button
                  type="button"
                  onClick={() => {
                    this.setTrainersState('reviewResults', null, this.props.initialEntryNumber);
                    this._reviewRef && this._reviewRef.resetEventSilent();
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 6,
                    padding: '14px 20px', flex: 1, textAlign: 'left',
                    background: '#e8f5e9', border: 'none', borderBottom: '2px solid #b2dfcf',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '1.125em', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Event</span>
                  <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#2e7d32', wordBreak: 'break-word' }}>{event.name}</span>
                </button>
              </div>
            )}
          </div>

          {/* Landing */}
          {!view && (
            <div className="fft-create-file-form">
              <div className="fft-participants-wrapper">
                <div className="fft-participants-section">
                  <div className="fft-participants-section-header">
                    <h3 className="fft-participants-section-title">Staff Uses</h3>
                    <hr style={{ margin: '12px 0' }} />
                    <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                      Please select an option to continue.
                    </div>
                  </div>
                  <div className="fft-events-buttons-container">
                    <button type="button" className="fft-event-btn" onClick={() => this.setTrainersState('bulkUpload', null)}>
                      <div className="fft-event-btn-name">Bulk Upload</div>
                    </button>
                    <button type="button" className="fft-event-btn" onClick={() => this.setTrainersState('reviewResults', null)}>
                      <div className="fft-event-btn-name">Review Results</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'bulkUpload' && <BulkUpload />}
          {view === 'reviewResults' && (
            <ReviewParticipantsResult
              ref={(r) => { this._reviewRef = r; }}
              initialEvent={event}
              initialEntryNumber={this.props.initialEntryNumber}
              onStateChange={(evt, num) => this.setTrainersState('reviewResults', evt, num)}
            />
          )}

        </div>
      </div>
    );
  }
}

export default FFTTrainers;
