import React, { Component } from 'react';
import EventSelection from './EventSelection';
import MasterDataTable from './MasterDataTable';
import '../../../css/fftAdmin.css';
import '../../../css/fftStaff.css';

// ─────────────────────────────────────────────────────────────────────────────
// AccessMasterData
//
// Props:
//   mode          'admin'  → EventSelection → "Open Google Sheet" button
//                 'staff'  → EventSelection (or skip if initialEvent given) → AG Grid table
//   initialEvent  { id, name } — if provided, skips EventSelection step
// ─────────────────────────────────────────────────────────────────────────────
class AccessMasterData extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedEvent: props.initialEvent || null,
    };
  }

  handleOpenSheet = () => {
    const { selectedEvent } = this.state;
    if (!selectedEvent?.id) return;
    window.open(
      `https://docs.google.com/spreadsheets/d/${selectedEvent.id}/edit`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  render() {
    const { mode = 'staff' } = this.props;
    const { selectedEvent } = this.state;

    // ── Step 1: no event chosen yet ──────────────────────────────────────────
    if (!selectedEvent) {
      return (
        <EventSelection
          onSelectEvent={evt => this.setState({ selectedEvent: evt })}
        />
      );
    }

    // ── Step 2a: Admin mode – event chosen, show Open Sheet action ────────────
    if (mode === 'admin') {
      return (
        <div className="fft-participants-form">
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">Access Master Data</h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                Select an option to continue.
              </div>
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                Selected event: <strong>{selectedEvent.name}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                style={{
                  padding: '16px 28px',
                  border: '2px solid #4CAF50',
                  borderRadius: 8,
                  background: 'transparent',
                  color: '#4CAF50',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600,
                  width: 'fit-content',
                  transition: 'border-color 0.3s, color 0.3s',
                }}
                onClick={this.handleOpenSheet}
              >
                <i className="fas fa-external-link-alt" style={{ marginRight: 8 }}></i>
                Open Google Sheet
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Step 2b: Staff mode – event chosen, show read-only AG Grid table ──────
    return (
      <MasterDataTable event={selectedEvent} />
    );
  }
}

export default AccessMasterData;
