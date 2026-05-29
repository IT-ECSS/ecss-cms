import React, { Component } from 'react';

class ParticipantsNamesModal extends Component {
  render() {
    const { isOpen, names = [], onClose } = this.props;
    if (!isOpen) return null;

    const normalizedNames = Array.isArray(names)
      ? names.filter(Boolean).map(name => String(name).trim())
      : [];

    return (
      <div
        className="fft-participants-modal-overlay"
        style={styles.overlay}
        onClick={onClose}
      >
        <div
          className="fft-participants-modal"
          style={styles.modal}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="FFT Total Participants"
        >
          <div style={styles.header}>
            <div style={styles.title}>FFT Total Participants</div>
            <button type="button" onClick={onClose} style={styles.closeButton}>
              ×
            </button>
          </div>

          <div style={styles.body}>
            <div style={styles.subtitle}>Participant names ({normalizedNames.length})</div>
            {normalizedNames.length === 0 ? (
              <div style={styles.empty}>No participant names available.</div>
            ) : (
              <ol style={styles.list}>
                {normalizedNames.map((name, index) => (
                  <li key={`${name}-${index}`} style={styles.listItem}>
                    {name}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 3000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 24px 72px rgba(0, 0, 0, 0.18)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#212121',
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    fontSize: '24px',
    lineHeight: '1',
    cursor: 'pointer',
    color: '#616161',
  },
  body: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  subtitle: {
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#424242',
  },
  empty: {
    color: '#757575',
    fontSize: '14px',
  },
  list: {
    margin: 0,
    paddingLeft: '20px',
  },
  listItem: {
    marginBottom: '8px',
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#212121',
  },
};

export default ParticipantsNamesModal;
