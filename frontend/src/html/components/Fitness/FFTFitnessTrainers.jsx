import React, { Component } from 'react';
import EventSelection from './EventSelection';
import ReviewParticipantsResult from './ReviewParticipantsResult';
import HomeConfirmModal from './HomeConfirmModal';
import '../../../css/fftAdmin.css';
import '../../../css/fftStaff.css';

class FFTFitnessTrainers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedEvent: null,
      view: null, // null = menu, 'reviewResults' = review
      showHomeConfirm: false,
    };
    this._reviewRef = React.createRef();
  }

  handleBack = () => {
    const { selectedEvent, view } = this.state;
    if (view) {
      this._reviewRef.current?.reset?.();
      this.setState({ view: null });
    } else if (selectedEvent) {
      this.setState({ selectedEvent: null });
    } else {
      this.props.onBack?.();
    }
  };

  handleHome = () => {
    this.setState({ showHomeConfirm: true });
  };

  handleHomeYes = () => {
    this._reviewRef.current?.reset?.();
    this.setState({ showHomeConfirm: false, selectedEvent: null, view: null });
    this.props.onBack?.();
  };

  handleHomeNo = () => {
    this.setState({ showHomeConfirm: false });
    this.props.onBack?.();
  };

  render() {
    const { selectedEvent, view, showHomeConfirm } = this.state;

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-staff-form">
          {/* Nav row */}
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
              onClick={this.handleHome}
              title="Home"
            >
              <i className="fas fa-home"></i>
            </button>
            {selectedEvent && (
              <div style={{ marginLeft: '20px', flex: 1 }}>
                <div
                  className="fft-staff-event-badge"
                  onClick={() => this.setState({ selectedEvent: null, view: null })}
                  style={{ cursor: 'pointer' }}
                  title="Change event"
                >
                  <span className="fft-staff-event-badge-label">EVENT</span>
                  <span className="fft-staff-event-badge-name">{selectedEvent.name}</span>
                </div>
              </div>
            )}
          </div>

          <div className="fft-staff-landing-container">
            {/* Step 1: Event Selection */}
            {!selectedEvent && (
              <EventSelection
                onSelectEvent={evt => this.setState({ selectedEvent: evt, view: null })}
              />
            )}

            {/* Step 2: Menu */}
            {selectedEvent && view === null && (
              <div className="fft-participants-section">
                <div className="fft-participants-section-header">
                  <h2 style={{ margin: 0, fontWeight: 700 }}>Fitness Trainers</h2>
                  <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                  <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                    Please select an option to continue.
                  </div>
                </div>
                <div className="fft-events-buttons-container">
                  <button
                    type="button"
                    className="fft-event-btn"
                    onClick={() => this.setState({ view: 'reviewResults' })}
                  >
                    <i className="fas fa-chart-bar"></i>
                    <div className="fft-event-btn-name">Review Results</div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review Results — always mounted to preserve state */}
            <div style={{ display: selectedEvent && view === 'reviewResults' ? 'block' : 'none' }}>
              <ReviewParticipantsResult
                ref={this._reviewRef}
                initialEvent={selectedEvent}
              />
            </div>
          </div>

          <HomeConfirmModal
            visible={showHomeConfirm}
            onYes={this.handleHomeYes}
            onNo={this.handleHomeNo}
          />
        </div>
      </div>
    );
  }
}

export default FFTFitnessTrainers;
