import React, { Component } from "react";

class ParticipantsImprovementListCard extends Component {
  render() {
    const { improvementData = [], stationCount = 1 } = this.props;

    return (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        marginTop: '16px'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#1e293b'
        }}>
          Participants with Improvement ({stationCount} Station{stationCount > 1 ? 's' : ''}) ({improvementData.length})
        </h3>
        
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          borderRadius: '4px',
          border: '1px solid #e2e8f0'
        }}>
          {improvementData.length === 0 ? (
            <div style={{
              padding: '16px',
              color: '#64748b',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              No participants found with improvement in {stationCount} station{stationCount > 1 ? 's' : ''}.
            </div>
          ) : (
            <div>
              {improvementData.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    borderBottom: index < improvementData.length - 1 ? '1px solid #e2e8f0' : 'none',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: item.uniqueImprovedMetrics && item.uniqueImprovedMetrics.length > 0 ? '8px' : '0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: '#1e293b',
                        fontWeight: '500'
                      }}>
                        {item.displayName}
                      </span>
                    </div>
                    <span
                      style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0,
                        marginLeft: '8px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.stationsImproved} station{item.stationsImproved > 1 ? 's' : ''}
                    </span>
                  </div>
                  {item.uniqueImprovedMetrics && item.uniqueImprovedMetrics.length > 0 && (
                    <div style={{
                      fontSize: '12px',
                      color: '#64748b',
                      marginLeft: '34px',
                      lineHeight: '1.4',
                      fontStyle: 'italic'
                    }}>
                      <span style={{ fontWeight: '500', color: '#475569' }}>Improved: </span>
                      {item.uniqueImprovedMetrics.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default ParticipantsImprovementListCard;
