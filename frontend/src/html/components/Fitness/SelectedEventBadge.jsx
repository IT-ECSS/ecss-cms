import React, { Component } from 'react';

class SelectedEventBadge extends Component {
  render() {
    const { event, language, onClick, showPlaceholder } = this.props;
    const name = typeof event === 'string' ? event : (event?.name || '');
    const sectionLabel = { en: 'Event', zh: '活动', ms: 'Acara' };
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseUp={(e) => e.currentTarget.blur()}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '14px 20px', flex: '0 0 calc(50% - 4px)', textAlign: 'left',
          background: '#e8f5e9',
          border: 'none',
          borderBottom: '2px solid #b2dfcf',
          cursor: onClick ? 'pointer' : 'default',
          pointerEvents: onClick ? undefined : 'none',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <span style={{ fontSize: '1.125em', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
          {sectionLabel[language] || 'Event'}
        </span>
        <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#2e7d32', wordBreak: 'break-word' }}>
          {showPlaceholder ? '—' : name}
        </span>
      </button>
    );
  }
}

export default SelectedEventBadge;
