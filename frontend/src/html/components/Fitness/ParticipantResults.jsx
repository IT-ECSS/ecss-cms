import React, { Component } from 'react';
import axios from 'axios';
import { getRating } from './fftScoringHelper';
import fftTranslations from './fftTranslations';
import '../../../css/fftTrainers.css';
import '../../../css/fftVolunteers.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

// Build STATIONS from fftTranslations with mapped keys for field lookups
const STATIONS = fftTranslations.stations
  .filter(s => ['station1', 'station2', 'station3', 'station4', 'station5', 'station6', 'station7'].includes(s.id))
  .map(s => ({
    num: s.num,
    title: s.title,
    label: `${s.num}: ${s.title}`,
    key: s.resultKey || s.fields[0].key,
    fieldLabel: s.fields[0].label,
    unit: s.unit,
    remarksKey: s.remarksKey,
    matchKey: s.title,
  }));

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

  fetchRow = async () => {
    const { fileId, entryNumber } = this.props;
    this.setState({ loading: true, error: null, participant: null });
    this.props.onLoading && this.props.onLoading(true);
    
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getRow`, { fileId, entryNumber });
      
      if (res.data.success) {
        const data = res.data.data;
        if (!data.Name && !data['Chinese Name']) {
          const errorMsg = `Participant ${entryNumber} cannot be found.`;
          this.setState({ loading: false, error: errorMsg });
          this.props.onLoading && this.props.onLoading(false);
          this.props.onError && this.props.onError(true);
        } else {
          this.setState({ loading: false, participant: data });
          this.props.onLoading && this.props.onLoading(false);
          this.props.onError && this.props.onError(false);
        }
      } else {
        const errorMsg = `Participant ${entryNumber} cannot be found.`;
        this.setState({ loading: false, error: errorMsg });
        this.props.onLoading && this.props.onLoading(false);
        this.props.onError && this.props.onError(true);
      }
    } catch (err) {
      console.error('Error fetching row:', err.message);
      this.setState({ loading: false, error: 'Error loading participant info. Please try again.' });
      this.props.onLoading && this.props.onLoading(false);
      this.props.onError && this.props.onError(true);
    }
  };

  render() {
    const { entryNumber, onReset } = this.props;
    const { loading, error, participant } = this.state;

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '3.125rem', color: '#2c7be5', marginBottom: '16px' }}></i>
          <p style={{ fontSize: '1.625rem', color: '#555' }}>Loading participant data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '24px' }}>
          <div className="fft-trainers-error-msg">
            <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>{error}
          </div>
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
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '1.5em', color: '#333', fontWeight: 700 }}>
            Participant {entryNumber}
          </span>
        </div>

        {/* Profile card */}
        <div style={{
          border: '1px solid #e2e6ed',
          borderRadius: '10px',
          padding: '8px 20px',
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          marginBottom: '20px',
        }}>
          <div style={{ margin: '0 0 2px 0', color: '#333', fontSize: '1.5em', fontWeight: 700 }}>Personal Particulars</div>
          <div style={{ margin: '0 0 3px 0', fontSize: '1.3em', fontWeight: 700 }}>{participant.Name || ''}</div>
          {participant['Chinese Name'] && (
            <div style={{ color: '#888', fontSize: '1em', marginBottom: '5px' }}>{participant['Chinese Name']}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '1.125em', color: '#555' }}>
            {participant['Phone Number'] && <span><i className="fas fa-phone" style={{ marginRight: 5 }}></i>Contact Number: {participant['Phone Number']}</span>}
            {participant.Gender && <span><i className={`fas fa-${participant.Gender === 'M' || participant.Gender === 'Male' ? 'mars' : 'venus'}`} style={{ marginRight: 5 }}></i>Gender: {participant.Gender}</span>}
            {participant.Age && <span>Age: {participant.Age}</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '1.125em', color: '#555', marginTop: '6px' }}>
            {(participant['DD'] || participant['MM'] || participant['YYYY']) && (
              <span><i className="fas fa-cake-candles" style={{ marginRight: 5 }}></i>Date of Birth: {participant['DD']}/{participant['MM']}/{participant['YYYY']}</span>
            )}
            {participant.Height && <span>Height: {participant.Height} cm</span>}
            {participant.Weight && <span>Weight: {participant.Weight} kg</span>}
            {participant.BMI && <span>BMI: {participant.BMI}</span>}
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
                      fontSize: '1.025em',
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
              <h4 style={{ marginBottom: '14px', color: '#333', fontSize: '1.5em', fontWeight: 700 }}>Station Results</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {STATIONS.map((station) => {
            const score = participant[station.key];
            const allRemarks = participant['Remarks'] || '';
            const ratingResult = score
              ? getRating(station.key, participant.Age, score, participant.Gender)
              : null;
            const rating = ratingResult ? ratingResult.rating : null;
            const ratingColor = ratingResult ? ratingResult.color : null;
            
            // Clean up label by removing "Number of" prefix, "Result", and parentheses
            const cleanLabel = station.fieldLabel
              .replace(/^Number\s+of\s+/i, '')
              .replace(/^Result\s+/i, '')
              .replace(/[()]/g, '')
              .trim();

            // Check if this is station 3 (full width)
            const isStation3 = station.key === '2 min On-the-spot Marching';

            return (
              <div key={station.key} style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: '#ffffff',
                height: '160px',
                gridColumn: isStation3 ? '1 / -1' : 'auto',
              }}>
                {/* Header: Station Name */}
                <div style={{
                  background: score ? '#e8f0fb' : '#f4f4f4',
                  borderBottom: `1px solid ${score ? '#bdd7f5' : '#e0e0e0'}`,
                  fontSize: '0.975em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: score ? '#2c5fa8' : '#999',
                  padding: '10px 14px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}>
                  {station.label}
                </div>

                {/* Body: Result Section */}
                <div style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  borderBottom: '1px solid #e0e0e0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'nowrap' }}>
                    <span style={{ fontSize: '2.25em', fontWeight: 700, color: score ? '#2c7be5' : '#ccc' }}>
                      {score}
                    </span>
                    <span style={{ fontSize: '1.0625em', fontWeight: 600, color: '#666' }}>
                      {cleanLabel.toLowerCase()}
                    </span>
                  </div>
                  {rating && (
                    <span style={{
                      fontSize: '1.171875em',
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

                {/* Footer: Remarks Section */}
                <div style={{
                  paddingTop: '8px',
                  paddingRight: '14px',
                  paddingBottom: '8px',
                  paddingLeft: '14px',
                  background: '#f8f9fa',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  flex: 1,
                }}>
                  {(() => {
                    const stationRemarks = allRemarks
                      .split('|')
                      .map(r => r.trim())
                      .filter(r => r.startsWith(`${station.title}:`))
                      .map(r => r.substring(`${station.title}: `.length));
                    
                    return (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '1em', color: '#666', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Remarks:</div>
                        {stationRemarks.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {stationRemarks.map((remark, idx) => (
                              <span key={idx} style={{ fontSize: '1em', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>
                                {remark}{idx < stationRemarks.length - 1 ? ',' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
