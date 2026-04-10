import React, { Component } from 'react';
import EventSelection from './EventSelection';
import ReviewParticipantsResult from './ReviewParticipantsResult';
import HomeConfirmModal from './HomeConfirmModal';
import { SelectionBadgesBar } from './SelectionBadges';
import '../../../css/fftAdmin.css';
import '../../../css/fftStaff.css';

class FFTFitnessTrainers extends Component {
  constructor(props) {
    super(props);
    let restoredEvent = null;
    try {
      const saved = localStorage.getItem('fftFitnessTrainersSelection');
      if (saved) {
        const parsed = JSON.parse(saved);
        restoredEvent = parsed.event || null;
      }
    } catch (e) {}
    this.state = {
      selectedEvent: restoredEvent,
      view: null,
      showHomeConfirm: false,
      reselectingBadge: null,
    };
    this._reviewRef = React.createRef();
  }

  componentDidMount() {
    const { selectedEvent } = this.state;
    if (selectedEvent) {
      this.props.onSelectionChange?.(selectedEvent);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { selectedEvent } = this.state;
    if (prevState.selectedEvent !== selectedEvent) {
      try {
        localStorage.setItem('fftFitnessTrainersSelection', JSON.stringify({ event: selectedEvent }));
      } catch (e) {}
      this.props.onSelectionChange?.(selectedEvent);
    }
    // Clear reselecting badge once a new event arrives back via props
    if (this.state.reselectingBadge === 'event' && !prevProps.badgeEvent && this.props.badgeEvent) {
      this.setState({ reselectingBadge: null });
    }
  }

  // ── Public reset method (called from FFTPage via ref) ──
  resetEvent = () => {
    this._reviewRef.current?.reset?.();
    this.setState({ selectedEvent: null, view: null });
  };

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
    try { localStorage.removeItem('fftFitnessTrainersSelection'); } catch (e) {}
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
            <SelectionBadgesBar
              event={this.props.badgeEvent}
              onEventClick={() => { this.setState({ reselectingBadge: 'event' }); this.props.onBadgeEventClick?.(); }}
              showEventPlaceholder={this.state.reselectingBadge === 'event'}
            />
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
