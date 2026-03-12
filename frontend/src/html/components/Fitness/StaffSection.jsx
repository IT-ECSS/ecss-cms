import React, { Component } from 'react';
import BulkUpload from './BulkUpload';
import ReviewParticipantsResult from './ReviewParticipantsResult';

// ─────────────────────────────────────────────
// StaffSection (section container)
// ─────────────────────────────────────────────
class StaffSection extends Component {
  constructor(props) {
    super(props);
    this.state = { view: null };
  }

  render() {
    const { view } = this.state;

    return (
      <>
        {view && (
          <div style={{ padding: '8px 16px' }}>
            <button
              className="fft-trainers-icon-btn"
              onClick={() => this.setState({ view: null })}
              title="Back"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
          </div>
        )}

        {!view && (
          <div className="fft-trainers-form">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '32px 16px' }}>
              <button
                className="fft-trainers-submit-btn"
                style={{ fontSize: '1.1rem', padding: '18px 24px' }}
                onClick={() => this.setState({ view: 'bulkUpload' })}
              >
                <i className="fas fa-upload"></i>Bulk Upload
              </button>
              <button
                className="fft-trainers-submit-btn"
                style={{ fontSize: '1.1rem', padding: '18px 24px' }}
                onClick={() => this.setState({ view: 'reviewResults' })}
              >
                <i className="fas fa-table"></i>Review Results
              </button>
            </div>
          </div>
        )}

        {view === 'bulkUpload' && <BulkUpload />}
        {view === 'reviewResults' && <ReviewParticipantsResult />}
      </>
    );
  }
}

export default StaffSection;
