import React, { Component } from 'react';

class SelectedLanguageBadge extends Component {
  render() {
    const { language, onClick, showPlaceholder } = this.props;
    const labels = { en: 'English', zh: '中文', ms: 'Bahasa Melayu' };
    const sectionLabel = { en: 'Language', zh: '语言', ms: 'Bahasa' };
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseUp={(e) => e.currentTarget.blur()}
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '14px 20px', flex: '0 0 calc(50% - 4px)', textAlign: 'left',
          background: '#e3f0ff',
          border: 'none',
          borderBottom: '2px solid #c5d9f5',
          cursor: 'pointer',
          boxSizing: 'border-box',
          outline: 'none',
          boxShadow: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      >
        <span style={{ fontSize: '1.125em', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
          {sectionLabel[language] || 'Language'}
        </span>
        <span style={{ fontSize: '1.625em', fontWeight: 700, color: '#1565c0' }}>
          {showPlaceholder ? '—' : (labels[language] || language)}
        </span>
      </button>
    );
  }
}

export default SelectedLanguageBadge;
