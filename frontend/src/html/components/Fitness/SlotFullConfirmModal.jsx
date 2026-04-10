import React, { Component } from 'react';
import fftTranslations from './fftTranslations';
import '../../../css/uploadResultModal.css';

class SlotFullConfirmModal extends Component {
  render() {
    const { visible, language, onYes, onNo } = this.props;
    if (!visible) return null;

    const t = (key) => fftTranslations[key]?.[language] || fftTranslations[key]?.en || '';
    const modalCardStyle = {
      background: '#fff',
      borderRadius: 12,
      width: 'min(92vw, 520px)',
      maxWidth: '92vw',
      maxHeight: 'calc(100dvh - 24px)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
    };
    const modalActionStyle = (borderColor, textColor) => ({
      flex: '1 1 180px',
      minWidth: 0,
      width: '100%',
      padding: '15px 20px',
      borderRadius: 8,
      border: `2px solid ${borderColor}`,
      background: 'transparent',
      color: textColor,
      fontWeight: 700,
      fontSize: '1.1rem',
      cursor: 'pointer',
      whiteSpace: 'normal',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1.3,
    });

    return (
      <div className="modal-overlay" onClick={onNo}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={modalCardStyle}
        >
          <div style={{ padding: 'clamp(20px, 4vw, 28px) clamp(18px, 5vw, 40px)', textAlign: 'center' }}>
            <i className="fas fa-circle-question" style={{ fontSize: '2.5rem', color: '#222', marginBottom: 16 }}></i>
            <h3 style={{ color: '#111', fontWeight: 700, fontSize: '1.875rem', margin: '0 0 12px' }}>
              {t('slotFullModalTitle')}
            </h3>
            <p style={{ color: '#111', fontSize: '1.25rem', margin: 0 }}>
              {t('slotFullModalDesc')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'stretch', flexWrap: 'wrap', padding: '0 24px 24px' }}>
            <button
              type="button"
              onClick={onYes}
              style={modalActionStyle('#2e7d32', '#2e7d32')}
            >
              {t('slotFullModalYes')}
            </button>
            <button
              type="button"
              onClick={onNo}
              style={modalActionStyle('#d32f2f', '#d32f2f')}
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
