import React from 'react';
import '../../../css/fftParticipants.css';
import SingPassButton from '../sub/SingPassButton';
import fftTranslations from './fftTranslations';

const ParticipantEntryMethod = ({ language, onUseSingpass, onUseManual, onUseParticipantNumber, onBack, onHome }) => {
  const title = fftTranslations.registrationFormTitle[language] || fftTranslations.registrationFormTitle.en;
  const description = fftTranslations.registrationFormDescription[language] || fftTranslations.registrationFormDescription.en;
  const manual = fftTranslations.registrationFormManual[language] || fftTranslations.registrationFormManual.en;
  const enterParticipantNumber = fftTranslations.enterParticipantNumber[language] || fftTranslations.enterParticipantNumber.en;

  return (
    <div className="fft-participants-section">
      <div className="fft-participants-section-header">
        <h2 style={{ margin: 0, fontWeight: 700 }}>{title}</h2>
        <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
        <div style={{ margin: '0', color: '#444' }}>{description}</div>
      </div>
      <div className="fft-participants-flex-button-container" style={{ marginTop: '32px' }}>
        <SingPassButton
          onAuthenticationSuccess={onUseSingpass}
          onMyInfoError={(error) => {
            console.error('MyInfo error:', error);
          }}
          className="fft-participants-next-button"
        />
        <button
          type="button"
          className="fft-participants-next-button"
          onClick={onUseManual}
        >
          {manual}
        </button>
        {/*<button
          type="button"
          className="fft-participants-next-button"
          onClick={onUseParticipantNumber}
          style={{
            backgroundColor: '#4CAF50',
            color: '#fff',
            border: 'none'
          }}
        >
          {enterParticipantNumber}
        </button>*/}
      </div>
    </div>
  );
};

export default ParticipantEntryMethod;
