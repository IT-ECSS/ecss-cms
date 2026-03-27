import React, { Component } from 'react';
import fftTranslations from './fftTranslations';
import '../../../css/uploadResultModal.css';

class SlotFullConfirmModal extends Component {
  render() {
    const { visible, language, onYes, onNo } = this.props;
    if (!visible) return null;

    const t = (key) => fftTranslations[key]?.[language] || fftTranslations[key]?.en || '';

    return (
      <div className="modal-overlay" onClick={onNo}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 12, width: 'fit-content',
            maxWidth: '90vw', minWidth: 320,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '28px 40px', textAlign: 'center' }}>
            <i className="fas fa-circle-question" style={{ fontSize: '2.5rem', color: '#222', marginBottom: 16 }}></i>
            <h3 style={{ color: '#111', fontWeight: 700, fontSize: '1.875rem', margin: '0 0 12px' }}>
              {t('slotFullModalTitle')}
            </h3>
            <p style={{ color: '#111', fontSize: '1.25rem', margin: 0 }}>
              {t('slotFullModalDesc')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', padding: '0 24px 24px' }}>
            <button
              type="button"
              onClick={onYes}
              style={{
                minWidth: 220,
                padding: '15px 20px', borderRadius: 8, border: '2px solid #2e7d32',
                background: 'transparent', color: '#2e7d32', fontWeight: 700,
                fontSize: '1.25rem', cursor: 'pointer',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {t('slotFullModalYes')}
            </button>
            <button
              type="button"
              onClick={onNo}
              style={{
                minWidth: 220,
                padding: '15px 20px', borderRadius: 8, border: '2px solid #d32f2f',
                background: 'transparent', color: '#d32f2f', fontWeight: 700,
                fontSize: '1.25rem', cursor: 'pointer',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {t('slotFullModalNo')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default SlotFullConfirmModal;
