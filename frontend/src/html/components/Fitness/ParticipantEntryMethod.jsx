import React from 'react';
import '../../../css/fftParticipants.css';
import SingPassButton from '../sub/SingPassButton';
import fftTranslations from './fftTranslations';

const ParticipantEntryMethod = ({ language, onUseSingpass, onUseManual, onUseParticipantNumber, onBack, onHome, showParticipantNumber, showSingpass = true, showManual = true, titleOverride, descriptionOverride, trilingual = false, onBeforeRedirect }) => {
  const title = titleOverride || fftTranslations.registrationFormTitle[language] || fftTranslations.registrationFormTitle.en;
  const description = descriptionOverride || fftTranslations.registrationFormDescription[language] || fftTranslations.registrationFormDescription.en;
  const manual = fftTranslations.registrationFormManual[language] || fftTranslations.registrationFormManual.en;
  const enterParticipantNumber = fftTranslations.enterParticipantNumber[language] || fftTranslations.enterParticipantNumber.en;

  return (
    <div className="fft-participants-section">
      <div className="fft-participants-section-header">
        <h2 style={{ margin: 0, fontWeight: 700 }}>
          {title}
          {trilingual && (
            <span style={{ display: 'block', fontWeight: 400, fontSize: '0.72em', color: '#666', marginTop: 2 }}>
              {fftTranslations.registrationFormTitle.zh} · {fftTranslations.registrationFormTitle.ms}
            </span>
          )}
        </h2>
        <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd' }} />
        <div style={{ margin: '0', color: '#444' }}>
          {trilingual ? (
            <>
              <span>{fftTranslations.registrationFormDescription.en}</span>
              <span style={{ display: 'block', fontSize: '0.92em', marginTop: 3 }}>{fftTranslations.registrationFormDescription.zh}</span>
              <span style={{ display: 'block', fontSize: '0.92em', marginTop: 2 }}>{fftTranslations.registrationFormDescription.ms}</span>
            </>
          ) : description}
        </div>
      </div>
      <div className="fft-participants-flex-button-container" style={{ marginTop: '32px' }}>
        {showSingpass && (
          <SingPassButton
            onAuthenticationSuccess={onUseSingpass}
            onMyInfoError={(error) => {
              console.error('MyInfo error:', error);
            }}
            onBeforeRedirect={onBeforeRedirect}
            className="fft-participants-next-button"
          />
        )}
        {showManual && (
          <button
            type="button"
            className="fft-participants-next-button"
            onClick={onUseManual}
          >
            {trilingual ? (
              <>
                <span>{fftTranslations.registrationFormManual.en}</span>
                <span style={{ display: 'block', fontWeight: 400, fontSize: '0.82em', marginTop: 2, opacity: 0.85 }}>{fftTranslations.registrationFormManual.zh} · {fftTranslations.registrationFormManual.ms}</span>
              </>
            ) : manual}
          </button>
        )}
          {showParticipantNumber && (
            <button
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
            </button>
          )}
      </div>
    </div>
  );
};

export default ParticipantEntryMethod;
