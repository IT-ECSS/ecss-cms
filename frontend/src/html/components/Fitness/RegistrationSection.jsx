import React, { Component } from 'react';
import '../../../css/fftStaff.css';

class RegistrationSection extends Component {
  render() {
    const { onBulkRegistration, onIndividualRegistration } = this.props;

    return (
      <div className="fft-participants-section">
        <div className="fft-participants-section-header">
          <h2 style={{ margin: 0, fontWeight: 700 }}>Participant Registration</h2>
          <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
          <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
            Select a registration method to register participants for this event.
          </div>
        </div>
        <div className="fft-events-buttons-container">
          <button type="button" className="fft-event-btn" onClick={onBulkRegistration}>
            <i className="fas fa-file-upload"></i>
            <div className="fft-event-btn-name">Bulk Registration</div>
          </button>
          <button type="button" className="fft-event-btn" onClick={onIndividualRegistration}>
            <i className="fas fa-user-plus"></i>
            <div className="fft-event-btn-name" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Individual Registration</div>
          </button>
        </div>
      </div>
    );
  }
}

export default RegistrationSection;
