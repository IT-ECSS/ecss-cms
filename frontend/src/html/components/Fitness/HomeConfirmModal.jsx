import React, { Component } from 'react';
import fftTranslations from './fftTranslations';
import '../../../css/uploadResultModal.css';

/**
 * Modal that asks the user whether to clear saved details when pressing Home.
 * Props:
 *   visible  {boolean}  – whether to show the modal
 *   onYes    {function} – called when user chooses to clear data and go home
 *   onNo     {function} – called when user chooses to go home WITHOUT clearing data
 *   onCancel {function} – called when user dismisses the modal (stay on page)
 */
class HomeConfirmModal extends Component {
  render() {
    const { visible, onYes, onNo, onCancel, language } = this.props;
    if (!visible) return null;
    const t = (key) => fftTranslations[key]?.[language] || fftTranslations[key]?.en || '';

    return (
      <div className="modal-overlay" onClick={onCancel}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 12, width: 'fit-content',
            maxWidth: '90vw', minWidth: 320,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '12px 16px',
          }}>
            <button
              onClick={onCancel}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '2rem', color: '#000000', lineHeight: 1, padding: 0,
                right: 0, fontWeight: 'bold', width: "fit-content",
              }}
              title="Close"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 40px', textAlign: 'center' }}>
            <i className="fas fa-home" style={{ fontSize: '2.5rem', color: '#1565c0', marginBottom: 16 }}></i>
            <h3 style={{ color: '#1565c0', fontWeight: 700, fontSize: '1.5rem', margin: '0 0 12px' }}>{t('homeModalTitle')}</h3>
            <p style={{ color: '#555', fontSize: '1rem', margin: 0 }}>
              {t('homeModalDesc')}
            </p>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center',
            padding: '16px 24px 24px',
          }}>
            <button
              onClick={onYes}
              style={{
                padding: '12px 20px', borderRadius: 8, border: 'none',
                background: '#ef5350', color: '#fff', fontWeight: 700,
                fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {t('homeModalYes')}
            </button>
            <button
              onClick={onNo}
              style={{
                padding: '12px 20px', borderRadius: 8, border: 'none',
                background: '#1565c0', color: '#fff', fontWeight: 700,
                fontSize: '1rem', cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {t('homeModalNo')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default HomeConfirmModal;
