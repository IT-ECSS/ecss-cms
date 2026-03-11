import React from 'react';
import '../../../css/fftParticipants.css';
import SingPassButton from '../sub/SingPassButton';

const ParticipantEntryMethod = ({ language, onUseSingpass, onUseManual, onBack, onHome }) => {
  const texts = {
    en: {
      title: 'Registration Form',
      description: 'Choose how you would like to fill in your information.',
      manual: 'Fill in the form manually',
      back: 'Back',
      home: 'Home',
    },
    zh: {
      title: '登记表格',
      description: '选择您希望如何填写信息。',
      manual: '手动填写表格',
      back: '返回',
      home: '主页',
    },
    ms: {
      title: 'Borang Pendaftaran',
      description: 'Pilih bagaimana anda ingin mengisi maklumat anda.',
      manual: 'Isi borang secara manual',
      back: 'Kembali',
      home: 'Utama',
    },
  };
  const { title, description, manual, back, home } = texts[language] || texts.en;

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
      </div>
    </div>
  );
};

export default ParticipantEntryMethod;
