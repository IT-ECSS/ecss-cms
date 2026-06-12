import React, { Component } from "react";

class ParticipantsImprovementNamesModal extends Component {
  render() {
    const { isOpen, improvementData, stationCount, onClose } = this.props;

    if (!isOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
              FFT Participants with Improvement ({stationCount} Station{stationCount > 1 ? 's' : ''})
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#64748b',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
            Participant names ({improvementData.length})
          </div>

          <div>
            {improvementData.length === 0 ? (
              <div style={{ padding: '16px', color: '#64748b', textAlign: 'center' }}>
                No participants found with improvement in {stationCount} station{stationCount > 1 ? 's' : ''}.
              </div>
            ) : (
              improvementData.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 0',
                    borderBottom: index < improvementData.length - 1 ? '1px solid #e2e8f0' : 'none',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>
                      {index + 1}. {item.displayName}
                    </span>
                    <span
                      style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0,
                        marginLeft: '8px'
                      }}
                    >
                      {item.stationsImproved} station{item.stationsImproved > 1 ? 's' : ''}
                    </span>
                  </div>
                  {item.uniqueImprovedMetrics && item.uniqueImprovedMetrics.length > 0 && (
                    <div style={{ fontSize: '13px', color: '#64748b', marginLeft: '0px', lineHeight: '1.4' }}>
                      <span style={{ fontWeight: '500', color: '#475569' }}>Improved: </span>
                      {item.uniqueImprovedMetrics.join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ParticipantsImprovementNamesModal;
