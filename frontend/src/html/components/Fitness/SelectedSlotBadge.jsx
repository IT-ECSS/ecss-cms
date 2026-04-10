import React, { Component } from 'react';
import fftTranslations from './fftTranslations';

class SelectedSlotBadge extends Component {
  render() {
    const { slot, language, onClick, showPlaceholder } = this.props;
    const slotWord = fftTranslations.timeSlotLabel?.[language] || fftTranslations.timeSlotLabel?.en || 'Time Slot';
    const normalized = slot ? slot.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/, '$1 - $2') : slot;
    const slotMatch = String(normalized || '').match(/^Slot\s*(\d+)\s*:\s*(.*)$/i);
    const slotLabel = slotMatch ? `${slotWord} ${slotMatch[1]}: ${slotMatch[2]}` : normalized;
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseUp={(e) => e.currentTarget.blur()}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '14px 20px', flex: '0 0 calc(50% - 4px)', textAlign: 'left',
          background: '#fff3e0',
          border: 'none',
          borderBottom: '2px solid #ffe0b2',
          cursor: 'pointer',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <span style={{ fontSize: '1.125em', color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
          {slotWord}
        </span>
        <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#e65100', wordBreak: 'break-word' }}>
          {showPlaceholder ? '—' : slotLabel}
        </span>
      </button>
    );
  }
}

export default SelectedSlotBadge;
