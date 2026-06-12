import React, { Component } from "react";

class ParticipantsTotalListCard extends Component {
  render() {
    const { participantNames = [] } = this.props;

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
          Total Participants ({participantNames.length})
        </h3>
        
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          borderRadius: '4px',
          border: '1px solid #e2e8f0'
        }}>
          {participantNames.length === 0 ? (
            <div style={{
              padding: '16px',
              color: '#64748b',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              No participants found
            </div>
          ) : (
            <div>
              {participantNames.map((name, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderBottom: index < participantNames.length - 1 ? '1px solid #e2e8f0' : 'none',
                    fontSize: '14px',
                    color: '#1e293b',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
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
                    marginRight: '10px',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default ParticipantsTotalListCard;
