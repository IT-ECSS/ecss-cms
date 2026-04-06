import React, { Component } from 'react';

class LinkCellRenderer extends Component {
  render() {
    const value = this.props.value;
    if (!value) return <span style={{ color: '#aaa' }}>—</span>;
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#1a73e8', textDecoration: 'underline', flex: 1 }}
        >
          {value}
        </a>
        <button
          type="button"
          title="Copy link"
          onClick={() => navigator.clipboard?.writeText(value)}
          style={{
            flexShrink: 0,
            width: 'fit-content',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#888', padding: '0 2px', fontSize: '0.9rem',
          }}
        >
          <i className="fas fa-copy"></i>
        </button>
      </div>
    );
  }
}

export default LinkCellRenderer;
