import React, { Component } from 'react';
import EventSelection from './EventSelection';
import StaffUses from './StaffUses';
import UploadResultModal from './UploadResultModal';
import HomeConfirmModal from './HomeConfirmModal';
import { SelectionBadgesBar } from './SelectionBadges';
import '../../../css/fftParticipants.css';
import '../../../css/fftStaff.css';

// ─────────────────────────────────────────────
// FFTStaff
// ─────────────────────────────────────────────
class FFTStaff extends Component {
  constructor(props) {
    super(props);

    // Restore section+event from localStorage if not provided via props
    let restoredEvent = props.initialEvent || null;
    let restoredSection = props.initialEvent ? 'staffUses' : 'selectEvent';
    if (!props.initialEvent) {
      try {
        const saved = localStorage.getItem('fftStaffSession');
        if (saved) {
          const parsed = JSON.parse(saved);
          restoredEvent = parsed.event || null;
          restoredSection = parsed.section || 'selectEvent';
        }
      } catch (e) {}
    }

    this.state = {
      event: restoredEvent,
      section: restoredSection,
      showHomeConfirm: false,
      staffView: null,
      reselectingBadge: null,
    };
    this.bulkUploadRef = React.createRef();
    this.staffUsesRef = React.createRef();
  }

  componentDidUpdate(prevProps, prevState) {
    const { section, event } = this.state;
    if (prevState.section !== section || prevState.event !== event) {
      try {
        localStorage.setItem('fftStaffSession', JSON.stringify({ section, event }));
      } catch (e) {}
      if (prevState.event !== event) {
        this.props.onSelectionChange?.(event);
      }
    }
    // Clear reselecting badge once a new event arrives back via props
    if (this.state.reselectingBadge === 'event' && !prevProps.badgeEvent && this.props.badgeEvent) {
      this.setState({ reselectingBadge: null });
    }
  }

  // ── Public reset method (called from FFTPage via ref) ──
  resetEvent = () => {
    try {
      const stored = localStorage.getItem('reviewParticipantsState');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem('reviewParticipantsState', JSON.stringify({ ...parsed, entryNumber: null }));
      }
    } catch (e) {}
    this.setState({ section: 'selectEvent', event: null });
  };

  handleBack = () => {
    const { section } = this.state;

    // Delegate sub-navigation to StaffUses when in staffUses section
    if (section === 'staffUses' && this.staffUsesRef.current) {
      const staffUses = this.staffUsesRef.current;
      const currentView = staffUses.state.view;

      // If at Staff Uses home (view: null), go back to event selection
      if (currentView === null) {
        this.setState({ section: 'selectEvent', event: null });
        return;
      }

      // Delegate to StaffUses to handle its own sub-section back navigation
      staffUses.handleBack();
      return;
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
      <div className="fft-staff-wrapper" style={this.state.staffView === 'masterData' ? { maxWidth: '80vw' } : undefined}>
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
              onClick={() => this.setState({ showHomeConfirm: true })}
              title="Home"
            >
              <i className="fas fa-home"></i>
            </button>
            <SelectionBadgesBar
              event={this.props.badgeEvent}
              onEventClick={() => { this.setState({ reselectingBadge: 'event' }); this.props.onBadgeEventClick?.(); }}
              showEventPlaceholder={this.state.reselectingBadge === 'event'}
              sizeMultiplier={1.5625}
            />
          </div>

          {/* Landing - Show sections one at a time */}
          <div className="fft-staff-landing-container">
            {section === 'selectEvent' && (
              <EventSelection
                onSelectEvent={(selectedEvent) => this.setState({ event: selectedEvent, section: 'staffUses' })}
              />
            )}

            {/* Always mounted to preserve EditParticipants state */}
            <div style={{ display: section === 'staffUses' ? 'block' : 'none' }}>
              <StaffUses
                ref={this.staffUsesRef}
                event={event}
                initialEntryNumber={this.props.initialEntryNumber}
                bulkUploadRef={this.bulkUploadRef}
                onFilesChange={() => this.forceUpdate()}
                onViewChange={(v) => this.setState({ staffView: v })}
                onBack={() => this.setState({ section: 'selectEvent', event: null })}
                onHome={() => {
                  localStorage.removeItem('fftStaffSession');
                  this.staffUsesRef.current?.resetAll?.();
                  this.setState({ section: 'selectEvent', event: null });
                  this.props.onBack?.();
                }}
                onUploadDone={() => {
                  this.setState({ section: 'selectEvent', event: null });
                  this.props.onBack?.();
                }}
              />
            </div>
          </div>

          {/* Modal Overlay for Upload Results */}
          {section === 'staffUses' && this.bulkUploadRef.current && this.staffUsesRef?.current?.state?.view === 'bulkUpload' && (
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

          <HomeConfirmModal
            visible={this.state.showHomeConfirm}
            onYes={() => {
              this.staffUsesRef.current?.resetAll?.();
              localStorage.removeItem('fftStaffSession');
              this.setState({ showHomeConfirm: false, event: null, section: 'selectEvent' });
              this.props.onBack && this.props.onBack();
            }}
            onNo={() => {
              // Stay: preserve localStorage, just navigate to FFT home
              this.setState({ showHomeConfirm: false });
              this.props.onBack && this.props.onBack();
            }}
            onCancel={() => this.setState({ showHomeConfirm: false })}
          />
        </div>
      </div>
    );
  }
}

export default FFTStaff;
