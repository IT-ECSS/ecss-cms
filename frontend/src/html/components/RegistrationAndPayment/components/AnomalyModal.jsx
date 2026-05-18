import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import '../../../../css/sub/anomalyModal.css';

// Cell renderer for the Locations column — renders each location as a bullet point
function LocationsRenderer({ value }) {
  if (!value) return null;
  const items = value.split(' and ').map((s) => s.trim()).filter(Boolean);
  if (items.length <= 1) return <span>{value}</span>;
  return (
    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: '1.6' }}>
      {items.map((loc, i) => (
        <li key={i} style={{ listStyleType: 'disc' }}>{loc}</li>
      ))}
    </ul>
  );
}

// Cell renderer for the Anomaly Type column — plain text only (row carries the background)
function AnomalyTypeRenderer({ value }) {
  if (!value) return null;
  return <span>{value}</span>;
}

function getRowStyle({ data }) {
  if (!data?.type) return null;
  const isSameLocation = data.type.toLowerCase().includes('same location');
  return isSameLocation
    ? { background: '#eaf4fb' }
    : { background: '#fdecea' };
}

/**
 * AnomalyModal
 *
 * Props:
 *   anomalies  – array of { name, course, locations, type }
 *   onClose    – callback to close the modal
 */
function AnomalyModal({ anomalies, onClose }) {
  if (!anomalies || anomalies.length === 0) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Derive row data with a sequential S/N field
  const rowData = useMemo(
    () => anomalies.map((a, idx) => ({ ...a, sn: idx + 1 })),
    [anomalies]
  );

  const columnDefs = useMemo(() => [
    {
      headerName: 'S/N',
      field: 'sn',
      width: 100,
      pinned: 'left',
      sortable: false,
    },
    {
      headerName: 'Name',
      field: 'name',
      width: 400,
      pinned: 'left',
    },
    {
      headerName: 'Course',
      field: 'course',
      width: 600,
    },
    {
      headerName: 'Locations',
      field: 'locations',
      width: 600,
      autoHeight: true,
      cellRenderer: LocationsRenderer,
      cellStyle: { paddingTop: 6, paddingBottom: 6 },
    },
    {
      headerName: 'Anomaly Type',
      field: 'type',
      width: 700,
      //pinned: 'right'
    }
  ], []);

  return (
    <div className="anomaly-modal-overlay" onClick={handleOverlayClick}>
      <div className="anomaly-modal-box" role="dialog" aria-modal="true" aria-labelledby="anomaly-modal-heading">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="anomaly-modal-header">
          <h2 className="anomaly-modal-title" id="anomaly-modal-heading">
            Anomalies Detected
          </h2>
          <button
            className="anomaly-modal-close-btn"
            onClick={onClose}
            aria-label="Close anomaly modal"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="anomaly-modal-body">
          <p className="anomaly-modal-description-header">Participants are flagged based on the following detection criteria:</p>
          <ul className="anomaly-modal-description">
            <li style={{ color: '#922b21' }}>Rows highlighted in <strong>red</strong> indicate duplicate registrations across courses.</li>
            <li style={{ color: '#1a5276' }}>Rows highlighted in <strong>blue</strong> indicate registrations at multiple locations for the same course.</li>
          </ul>
          <div className="anomaly-modal-grid-wrapper">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              suppressMovableColumns={true}
              suppressCellFocus={true}
              pagination={false}
              getRowStyle={getRowStyle}
            />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="anomaly-modal-footer" />

      </div>
    </div>
  );
}

export default AnomalyModal;
