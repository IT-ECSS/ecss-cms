import React, { Component } from 'react';
import BulkUpload from './BulkUpload';
import ReviewParticipantsResult from './ReviewParticipantsResult';
import '../../../css/fftParticipants.css';

// ─────────────────────────────────────────────
// StaffUsesSection
// ─────────────────────────────────────────────
class StaffUsesSection extends Component {
  constructor(props) {
    super(props);
    this.state = { view: null };
  }

  handleBack = () => {
    const { view } = this.state;
    if (view) {
      this.setState({ view: null });
    } else {
      this.props.onBack && this.props.onBack();
    }
  };

  render() {
    const { onBack } = this.props;
    const { view } = this.state;

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-form">
          {/* Nav buttons handled by FFTTrainers */}

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
                    <button type="button" className="fft-event-btn" onClick={() => this.setState({ view: 'bulkUpload' })}>
                      <div className="fft-event-btn-name">Bulk Upload</div>
                    </button>
                    <button type="button" className="fft-event-btn" onClick={() => this.setState({ view: 'reviewResults' })}>
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
              onBack={() => this.setState({ view: null })}
              onHome={onBack}
            />
          )}
        </div>
      </div>
    );
  }
}

export default StaffUsesSection;
