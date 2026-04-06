import React, { Component } from 'react';

class QRCellRenderer extends Component {
  render() {
    const { value, context } = this.props;
    if (!value) return <span style={{ color: '#aaa' }}>—</span>;
    const isUrl =
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('data:image');
    if (isUrl) {
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
    return (
      <button
        type="button"
        onClick={() => context.onViewQR(value, this.props.data.name)}
        style={{
          background: 'none',
          border: '1.5px solid #1a73e8',
          borderRadius: 6,
          padding: '3px 12px',
          color: '#1a73e8',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <i className="fas fa-qrcode" style={{ marginRight: 6 }}></i>View
      </button>
    );
  }
}

export default QRCellRenderer;
