import React, { Component } from 'react';
import axios from 'axios';
import { getRating } from './fftScoringHelper';
import '../../../css/fftTrainers.css';
import '../../../css/fftVolunteers.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const STATIONS = [
  { label: '30 secs Sit & Stand', key: 'sitStand', remarksKey: 'sitStandRemarks', matchKey: 'Sit & Stand' },
  { label: '30 secs Arm Curl', key: 'armCurl', remarksKey: 'armCurlRemarks', matchKey: 'Arm Curl' },
  { label: '2 min March on the spot', key: 'march', remarksKey: 'marchRemarks', matchKey: 'March' },
  { label: 'Sit & Reach', key: 'sitReach', remarksKey: 'sitReachRemarks', matchKey: 'Sit & Reach' },
  { label: 'Back Stretch', key: 'backStretch', remarksKey: 'backStretchRemarks', matchKey: 'Back Stretch' },
  { label: '2.44m Speed Walk', key: 'speedWalk', remarksKey: 'speedWalkRemarks', matchKey: 'Speed Walk' },
  { label: 'Grip Test', key: 'gripTest', remarksKey: 'gripTestRemarks', matchKey: 'Grip Test' },
];

function parseRemarks(remarksStr) {
  const map = {};
  if (!remarksStr) return map;
  remarksStr.split('|').forEach((part) => {
    const idx = part.indexOf(':');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key && val) map[key] = val;
  });
  return map;
}

class ParticipantResults extends Component {
  // Props:
  //   fileId       – Google Drive file ID to query
  //   entryNumber  – row number (1-based) to look up
  //   onReset      – callback to clear and search again

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      participant: null,
    };
  }

  componentDidMount() {
    this.fetchRow();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.entryNumber !== this.props.entryNumber || prevProps.fileId !== this.props.fileId) {
      this.fetchRow();
    }
  }

  fetchRow = () => {
    const { fileId, entryNumber } = this.props;
    this.setState({ loading: true, error: null, participant: null });
    axios.get(`${BACKEND_URL}/googleDrive/getRow`, { params: { fileId, entryNumber } })
      .then((res) => {
        if (res.data.success) {
          const data = res.data.data;
          if (!data.name && !data.chineseName) {
            this.setState({ loading: false, error: `Entry #${entryNumber} was not found in the spreadsheet.` });
          } else {
            this.setState({ loading: false, participant: data });
          }
        } else {
          this.setState({ loading: false, error: `Entry #${entryNumber} was not found in the spreadsheet.` });
        }
      })
      .catch((err) => {
        console.error('Error fetching row:', err.message);
        this.setState({ loading: false, error: 'Error loading participant info. Please try again.' });
      });
  };

  render() {
    const { entryNumber, onReset } = this.props;
    const { loading, error, participant } = this.state;

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#2c7be5', marginBottom: '16px' }}></i>
          <p style={{ fontSize: '1.3rem', color: '#555' }}>Loading participant data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '24px' }}>
          <div className="fft-trainers-error-msg">
            <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>{error}
          </div>
          <button className="fft-trainers-submit-btn" onClick={onReset} style={{ marginTop: '12px' }}>
            <i className="fas fa-arrow-left"></i>Try Again
          </button>
        </div>
      );
    }

    if (!participant) return null;

    return (
      <>
        {/* Header */}
        <div>
          <h3 className="fft-result-entry-section-title">Participant Results</h3>
        </div>
        <hr style={{ margin: '12px 0' }} />
        <p className="fft-result-entry-section-desc">
          Fitness test results for the selected participant.
        </p>

        {/* Entry number badge */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '0.85em', color: '#888', fontWeight: 600 }}>
            Entry #{entryNumber}
          </span>
        </div>

        {/* Profile card */}
        <div style={{
          border: '1px solid #e2e6ed',
          borderRadius: '10px',
          padding: '16px 20px',
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          marginBottom: '20px',
        }}>
          <h3 style={{ marginBottom: '4px' }}>{participant.name || '—'}</h3>
          {participant.chineseName && (
            <div style={{ color: '#888', fontSize: '1em', marginBottom: '10px' }}>{participant.chineseName}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', fontSize: '0.9em', color: '#555' }}>
            {participant.phoneNo && <span><i className="fas fa-phone" style={{ marginRight: 5 }}></i>{participant.phoneNo}</span>}
            {participant.gender && <span><i className="fas fa-venus-mars" style={{ marginRight: 5 }}></i>{participant.gender}</span>}
            {participant.age && <span>Age: {participant.age}</span>}
            {participant.height && <span>Height: {participant.height} cm</span>}
            {participant.weight && <span>Weight: {participant.weight} kg</span>}
            {participant.bmi && <span>BMI: {participant.bmi}</span>}
            {participant.testDate && <span><i className="fas fa-calendar" style={{ marginRight: 5 }}></i>{participant.testDate}</span>}
          </div>
        </div>

        {/* Incomplete stations warning OR station results — mutually exclusive */}
        {(() => {
          const incomplete = STATIONS.filter(s => !participant[s.key]);
          if (incomplete.length > 0) {
            return (
              <>
                <h4 style={{ marginBottom: '10px', color: '#b45309' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#f59e0b' }}></i>
                  Incomplete Stations
                </h4>
                <div style={{
                  background: '#fff8e1',
                  border: '1px solid #ffe082',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  {incomplete.map(s => (
                    <span key={s.key} style={{
                      fontSize: '0.82em',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fcd34d',
                    }}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </>
            );
          }

          return (
            <>
              <h4 style={{ marginBottom: '14px', color: '#333' }}>Station Results</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {STATIONS.map((station) => {
            const score = participant[station.key];
            const parsedRemarks = parseRemarks(participant.remarks);
            const rawRemark = participant[station.remarksKey] || parsedRemarks[station.matchKey] || '';
            const remarkLines = rawRemark
              .split('|')
              .map(s => s.trim())
              .filter(Boolean);
            const ratingResult = score
              ? getRating(station.key, participant.age, score, participant.gender)
              : null;
            const rating = ratingResult ? ratingResult.rating : null;
            const ratingColor = ratingResult ? ratingResult.color : null;

            return (
              <div key={station.key} style={{
                border: `1px solid ${score ? '#bdd7f5' : '#e0e0e0'}`,
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Header: station name */}
                <div style={{
                  padding: '8px 14px',
                  background: score ? '#e8f0fb' : '#f4f4f4',
                  borderBottom: `1px solid ${score ? '#bdd7f5' : '#e0e0e0'}`,
                  fontSize: '0.78em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: score ? '#2c5fa8' : '#999',
                }}>
                  {station.label}
                </div>

                {/* Body: score + rating badge */}
                <div style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flex: 1,
                }}>
                  <span style={{ fontSize: '1.6em', fontWeight: 700, color: score ? '#2c7be5' : '#ccc' }}>
                    {score || '—'}
                  </span>
                  {rating && (
                    <span style={{
                      fontSize: '0.75em',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: ratingColor.bg,
                      color: ratingColor.text,
                      border: `1px solid ${ratingColor.border}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {rating}
                    </span>
                  )}
                </div>

                {/* Footer: remarks */}
                <div style={{
                  padding: '8px 14px',
                  borderTop: `1px solid ${score ? '#bdd7f5' : '#e0e0e0'}`,
                  background: '#fafafa',
                  minHeight: '34px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}>
                  <div style={{ fontSize: '0.72em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#aaa', marginBottom: '2px' }}>Remarks</div>
                  {remarkLines.length > 0 ? remarkLines.map((line, i) => (
                    <div key={i} style={{ fontSize: '0.82em', color: '#555' }}>{line}</div>
                  )) : (
                    <div style={{ fontSize: '0.82em', color: '#bbb' }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
            </>
          );
        })()}


      </>
    );
  }
}

export default ParticipantResults;
