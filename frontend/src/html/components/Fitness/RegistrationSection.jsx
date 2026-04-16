import React, { Component } from 'react';
import fftTranslations from './fftTranslations';
import '../../../css/fftStaff.css';

class RegistrationSection extends Component {
  render() {
    const { onBulkRegistration, onIndividualRegistration, role, language } = this.props;
    const isVolunteer = role === 'Volunteer';

    const titleText = fftTranslations.participantRegistration?.[language] || fftTranslations.participantRegistration?.en || 'Participant Registration';
    const descText = fftTranslations.registrationMethodDesc?.[language] || fftTranslations.registrationMethodDesc?.en || 'Select a registration method to register participants for this event.';
    const bulkText = fftTranslations.bulkRegistration?.[language] || fftTranslations.bulkRegistration?.en || 'Bulk Registration';
    const individualText = fftTranslations.individualRegistration?.[language] || fftTranslations.individualRegistration?.en || 'Individual Registration';

    return (
      <div className="fft-participants-section">
        <div className="fft-participants-section-header">
          <h2 style={{ margin: 0, fontWeight: 700 }}>{titleText}</h2>
          <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
          <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
            {descText}
          </div>
        </div>
        <div className="fft-events-buttons-container">
          {!isVolunteer && (
            <button type="button" className="fft-event-btn" onClick={onBulkRegistration}>
              <i className="fas fa-file-upload"></i>
              <div className="fft-event-btn-name">{bulkText}</div>
            </button>
          )}
          <button type="button" className="fft-event-btn" onClick={onIndividualRegistration}>
            <i className="fas fa-user-plus"></i>
            <div className="fft-event-btn-name" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{individualText}</div>
          </button>
        </div>
      </div>
    );
  }
}

export default RegistrationSection;
