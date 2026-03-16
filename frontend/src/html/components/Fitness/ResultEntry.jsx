import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/fftVolunteers.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class ResultEntry extends Component {
  // Props:
  //   selectedStation  – station config object
  //   fileId           – Google Sheet file ID
  //   onBack           – callback: user pressed back (returns to station list)

  constructor(props) {
    super(props);
    const { selectedStation, participantData } = props;
    const existingData = {};
    if (selectedStation && participantData) {
      selectedStation.fields.forEach((f) => {
        // For stations with resultKey, check both the field key and the resultKey
        if (selectedStation.resultKey) {
          existingData[f.key] = participantData[selectedStation.resultKey] || participantData[f.key] || '';
        } else {
          existingData[f.key] = participantData[f.key] || '';
        }
      });
      // Load remarks if they exist - extract only remarks for this station
      if (selectedStation.remarksKey) {
        const remarksColumnName = selectedStation.remarksColumnName || 'Remarks';
        const allRemarks = participantData[remarksColumnName] || '';
        const stationName = selectedStation.title;
        const stationRemark = this.extractRemarkForStation(allRemarks, stationName);
        existingData[selectedStation.remarksKey] = stationRemark;
      }
    }
    this.state = {
      formData: existingData,
      submitting: false,
      submitSuccess: false,
      submitError: null,
      fieldErrors: {},
      updatedRemarksValue: null,
    };
  }

  // ── Populate form when participantData arrives ──
  componentDidUpdate(prevProps) {
    const { selectedStation, participantData } = this.props;
    if (participantData && prevProps.participantData !== participantData && selectedStation) {
      const existingData = {};
      selectedStation.fields.forEach((f) => {
        // For stations with resultKey, check both the field key and the resultKey
        if (selectedStation.resultKey) {
          existingData[f.key] = participantData[selectedStation.resultKey] || participantData[f.key] || '';
        } else {
          existingData[f.key] = participantData[f.key] || '';
        }
      });
      // Load remarks if they exist - extract only remarks for this station
      if (selectedStation.remarksKey) {
        const remarksColumnName = selectedStation.remarksColumnName;
        const allRemarks = participantData[remarksColumnName] || '';
        const stationName = selectedStation.title;
        const stationRemark = this.extractRemarkForStation(allRemarks, stationName);
        existingData[selectedStation.remarksKey] = stationRemark;
      }
      this.setState({ formData: existingData, fieldErrors: {} });
    }
  }

  // ── Form Input ──
  handleFieldChange = (key, value) => {
    const errors = { [key]: null };
    
    // Validate Height field for decimal places
    if (key === 'Height' && value && value.includes('.')) {
      errors[key] = 'Enter measurement in cm.';
    }
    
    // Validate Number Of Squats for decimal places
    if (key === '30 secs Sit & Stand' && value && value.includes('.')) {
      errors[key] = 'Enter measurement in number of squats.';
    }
    
    // Validate 30 sec Arm Banding for decimal places
    if (key === '30 secs Arm Banding' && value && value.includes('.')) {
      errors[key] = 'Enter measurement in number of bicep curls.';
    }
    
    // Validate 2 min On-the-spot Marching for decimal places
    if (key === '2 min On-the-spot Marching' && value && value.includes('.')) {
      errors[key] = 'Enter measurement in sets of steps.';
    }
    
    // Validate 2.44m Speed Walk minimum value
    if (key === '2.44m Speed Walk' && value && parseFloat(value) < 1) {
      errors[key] = 'Value should be greater than 1 second.';
    }
    
    this.setState((prev) => ({
      formData: { ...prev.formData, [key]: value },
      fieldErrors: { ...prev.fieldErrors, ...errors },
    }));
  };

  // ── Extract remark for current station ──
  extractRemarkForStation = (allRemarks, stationName) => {
    if (!allRemarks) return '';
    const remarks = allRemarks.split(' | ');
    for (const remark of remarks) {
      if (remark.startsWith(`${stationName}:`)) {
        return remark.substring(`${stationName}: `.length);
      }
    }
    return '';
  };

  // ── Get ordered remarks by station ──
  getOrderedRemarks = (allRemarks) => {
    const remarksMap = {};
    if (allRemarks) {
      allRemarks.split(' | ').forEach((r) => {
        const colonIndex = r.indexOf(':');
        if (colonIndex > -1) {
          const name = r.substring(0, colonIndex).trim();
          const remark = r.substring(colonIndex + 1).trim();
          remarksMap[name] = remark;
        }
      });
    }
    
    let orderedRemarks = '';
    if (this.props.allStations && Array.isArray(this.props.allStations)) {
      const ordered = [];
      this.props.allStations.forEach((station) => {
        if (remarksMap[station.title]) {
          ordered.push(`${station.title}: ${remarksMap[station.title]}`);
        }
      });
      orderedRemarks = ordered.join(' | ');
    } else {
      orderedRemarks = Object.entries(remarksMap)
        .map(([name, remark]) => `${name}: ${remark}`)
        .join(' | ');
    }
    return orderedRemarks;
  };

  // ── Reset ──
  handleReset = () => {
    const { selectedStation } = this.props;
    const emptyData = {};
    if (selectedStation) {
      selectedStation.fields.forEach((f) => { emptyData[f.key] = ''; });
      if (selectedStation.remarksKey) emptyData[selectedStation.remarksKey] = '';
    }
    this.setState({ formData: emptyData, fieldErrors: {}, submitError: null, updatedRemarksValue: null });
  };

  // ── Submit ──
  handleSubmit = () => {
    const { fileId, selectedStation, entryNumber, participantData } = this.props;
    const { formData } = this.state;

    if (!fileId || entryNumber == null) return;

    // Field-level validation (remarks excluded)
    const fieldErrors = {};
    selectedStation.fields.forEach((f) => {
      if (f.required !== false && !formData[f.key]) {
        fieldErrors[f.key] = f.validationMessage || 'This field is required.';
      }
    });
    
    // Check Height field for decimal places
    if (formData.Height && formData.Height.includes('.')) {
      fieldErrors.Height = 'Enter measurement in cm.';
    }
    
    // Check Number Of Squats for decimal places
    if (formData['30 secs Sit & Stand'] && formData['30 secs Sit & Stand'].includes('.')) {
      fieldErrors['30 secs Sit & Stand'] = 'Enter measurement in number of squats.';
    }
    
    // Check 30 sec Arm Banding for decimal places
    if (formData['30 secs Arm Banding'] && formData['30 secs Arm Banding'].includes('.')) {
      fieldErrors['30 secs Arm Banding'] = 'Enter measurement in number of bicep curls.';
    }
    
    // Check 2 min On-the-spot Marching for decimal places
    if (formData['2 min On-the-spot Marching'] && formData['2 min On-the-spot Marching'].includes('.')) {
      fieldErrors['2 min On-the-spot Marching'] = 'Enter measurement in sets of steps.';
    }
    
    // Check 2.44m Speed Walk minimum value
    if (formData['2.44m Speed Walk'] && parseFloat(formData['2.44m Speed Walk']) < 1) {
      fieldErrors['2.44m Speed Walk'] = 'Value should be greater than 1 second.';
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      this.setState({ fieldErrors });
      return;
    }

    const updates = {};

    if (selectedStation.resultKey) {
      // resultKey station: single attempt → use the field key (which is now exact column name)
      const val = formData[selectedStation.fields[0].key] || '';
      updates[selectedStation.fields[0].key] = val;
    } else {
      // Single-attempt station: use field keys directly (they are now exact column names)
      selectedStation.fields.forEach((f) => {
        if (formData[f.key] !== undefined && formData[f.key] !== '') {
          updates[f.key] = formData[f.key];
        }
      });
    }
    
    let updatedRemarksValue = null;
    
    // Store remarks in the configured remarks column, appending to existing remarks with station prefix
    if (selectedStation.remarksKey) {
      const remarksColumnName = selectedStation.remarksColumnName || 'Remarks';
      const stationName = selectedStation.title;
      const newRemark = formData[selectedStation.remarksKey] || '';
      const existingRemarks = participantData[remarksColumnName] || '';
      
      // Parse existing remarks into a map: { stationName: remark }
      const remarksMap = {};
      if (existingRemarks) {
        existingRemarks.split(' | ').forEach((r) => {
          const colonIndex = r.indexOf(':');
          if (colonIndex > -1) {
            const name = r.substring(0, colonIndex).trim();
            const remark = r.substring(colonIndex + 1).trim();
            remarksMap[name] = remark;
          }
        });
      }
      
      // Update the remarks map with the new remark (or remove if empty)
      if (newRemark && newRemark.trim()) {
        remarksMap[stationName] = newRemark;
      } else {
        delete remarksMap[stationName];
      }
      
      // Get ordered remarks using the helper method
      const remarksValue = this.getOrderedRemarks(
        Object.entries(remarksMap)
          .map(([name, remark]) => `${name}: ${remark}`)
          .join(' | ')
      );
      
      // Store the updated remarks value to display in success screen
      updatedRemarksValue = remarksValue;
      
      // Always update remarks column to sync changes (including deletions)
      updates[remarksColumnName] = remarksValue;
    }

    console.log('[FFT] Updates to submit:', updates);
    this.setState({ submitting: true, submitError: null, updatedRemarksValue });

    axios.post(`${BACKEND_URL}/googleDrive/updateRow`, { fileId, entryNumber, updates })
      .then((res) => {
        console.log('[FFT] Response from backend:', res.data);
        if (res.data.success) {
          this.setState({ submitting: false, submitSuccess: true });
        } else {
          this.setState({ submitting: false, submitError: res.data.error || 'Failed to update.' });
        }
      })
      .catch((err) => {
        console.error('[FFT] Error updating row:', err.message);
        this.setState({ submitting: false, submitError: 'Network error. Please try again.' });
      });
  };

  // ── Next Participant ──
  handleNextParticipant = () => {
    this.setState({ formData: {}, submitSuccess: false, submitError: null, updatedRemarksValue: null });
    this.props.onNextParticipant();
  };

  render() {
    const { selectedStation, participantData, entryNumber, lookupError, onNextParticipant, loading } = this.props;
    const { formData, submitting, submitSuccess, submitError, fieldErrors, updatedRemarksValue } = this.state;

    if (loading) {
      return (
        <>
          <div>
            <h3 className="fft-result-entry-section-title">Enter Results</h3>
          </div>
          <hr style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px', gap: 12 }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#1565c0' }}></i>
            <span style={{ color: '#555', fontSize: '1em' }}>Loading participant data...</span>
          </div>
        </>
      );
    }

    if (lookupError) {
      return (
        <div className="fft-result-entry-success-card" style={{ borderColor: '#e74c3c' }}>
          <div className="fft-result-entry-success-icon" style={{ color: '#e74c3c' }}>
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h3 className="fft-result-entry-success-title" style={{ color: '#e74c3c' }}>Participant Not Found</h3>
          <p className="fft-result-entry-success-text">{lookupError}</p>
          <button className="fft-result-entry-submit-btn" style={{ padding: '14px 48px', fontSize: '1.1rem', width: 'auto', margin: '0 auto', display: 'block' }} onClick={onNextParticipant}>
            Try Again
          </button>
        </div>
      );
    }

    return (
      <>
        {/* Title + divider + description */}
        <div>
          <h3 className="fft-result-entry-section-title" style={submitSuccess ? { color: '#27ae60', display: 'flex', alignItems: 'center', gap: '8px' } : {}}>
            {submitSuccess && <i className="fas fa-check-circle" style={{ fontSize: '1.2em' }}></i>}
            {submitSuccess ? 'Results Submitted!' : 'Enter Results'}
          </h3>
        </div>
        {!submitSuccess && <hr style={{ margin: '12px 0' }} />}
        {!submitSuccess && (
          <p className="fft-result-entry-section-desc">Key in the participant's result and tap Submit to save.</p>
        )}

        {/* Participant Info Card */}
        <div className="fft-result-entry-participant-card">
          <div className="fft-result-entry-participant-row">
            <div className="fft-result-entry-participant-avatar">
              <i className="fas fa-user"></i>
            </div>
            <div style={{ flex: 1 }}>
              <div className="fft-result-entry-participant-name">
                {participantData.Name || participantData['Chinese Name'] || '—'}
              </div>
              {participantData['Chinese Name'] && participantData.Name && (
                <div className="fft-result-entry-participant-chinese">{participantData['Chinese Name']}</div>
              )}
              <div style={{ fontSize: '1.125em', color: '#555', marginTop: '4px' }}>
                Participant {entryNumber}
              </div>
            </div>
          </div>
        </div>

            {/* Success state */}
            {submitSuccess && (
              <div className="fft-result-entry-success-card">
                <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1.65em', fontWeight: 700, color: '#333' }}>Results Entered:</h4>
                  <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                    {selectedStation.fields.map((field) => {
                      const value = formData[field.key] || participantData[field.key] || '—';
                      const unit = field.unit ? ` ${field.unit}` : '';
                      return (
                        <div key={field.key} style={{ marginBottom: '12px', fontSize: '1.5em', color: '#333', textAlign: 'left' }}>
                          <span style={{ fontWeight: 600 }}>{field.label}:</span> <span style={{ marginLeft: '8px' }}>{value}{unit}</span>
                        </div>
                      );
                    })}
                    {selectedStation.remarksKey && (
                      <div style={{ marginTop: '12px', paddingTop: '12px' }}>
                        <div style={{ fontSize: '1.5em', color: '#333', textAlign: 'left' }}>
                          <span style={{ fontWeight: 600 }}>Remarks:</span> 
                          <span style={{ marginLeft: '8px' }}>
                            {formData[selectedStation.remarksKey] || ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button className="fft-result-entry-submit-btn" onClick={this.handleNextParticipant}>
                  <i className="fas fa-user-plus"></i>
                  Next Participant
                </button>
              </div>
            )}

            {/* Input form (hidden after submit success) */}
            {!submitSuccess && (
              <div>
                {selectedStation.note && (
                  <div className="fft-result-entry-note-banner">
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                    {selectedStation.note}
                  </div>
                )}

                <div className="fft-result-entry-form-grid">
                  {selectedStation.fields.map((field) => (
                    <div key={field.key} className="fft-result-entry-field fft-result-entry-field--full">
                      <label className="fft-result-entry-label">
                        {field.label}{' '}
                        {/* <span style={{ color: '#9e9e9e', fontWeight: 400 }}>({field.labelZh})</span> */}
                      </label>
                      <input
                        type="text"
                        inputMode={field.type === 'number' ? 'decimal' : 'text'}
                        value={formData[field.key] || ''}
                        placeholder={field.placeholder}
                        onChange={(e) => this.handleFieldChange(field.key, e.target.value)}
                        className="fft-result-entry-input"
                        style={fieldErrors[field.key] ? { borderColor: '#d32f2f' } : {}}
                      />
                      {fieldErrors[field.key] && (
                        <div style={{ color: '#d32f2f', fontSize: '1.23em', marginTop: '4px', fontWeight: 700 }}>
                          {fieldErrors[field.key]}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Per-station remarks */}
                  {selectedStation.remarksKey && (
                    <div className="fft-result-entry-field fft-result-entry-field--full">
                      <label className="fft-result-entry-label">
                        Remarks{' '}
                        {/*<span style={{ color: '#9e9e9e', fontWeight: 400 }}>(备注)</span> */}
                      </label>
                      <textarea
                        value={formData[selectedStation.remarksKey] || ''}
                        placeholder="Optional remarks for this station"
                        onChange={(e) =>
                          this.handleFieldChange(selectedStation.remarksKey, e.target.value)
                        }
                        className="fft-result-entry-input"
                        rows={2}
                        style={{ resize: 'vertical', minHeight: '48px' }}
                      />
                    </div>
                  )}
                </div>

                {submitError && (
                  <div className="fft-result-entry-error" style={{ marginTop: '16px' }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                    {submitError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button
                    className="fft-result-entry-submit-btn"
                    onClick={this.handleReset}
                    disabled={submitting}
                    style={{ flex: 1, background: 'none', border: '1.5px solid #9e9e9e', color: '#555', boxShadow: 'none' }}
                  >
                    <i className="fas fa-undo"></i>Clear
                  </button>
                  <button
                    className="fft-result-entry-submit-btn"
                    onClick={this.handleSubmit}
                    disabled={submitting}
                    style={{ flex: 1 }}
                  >
                    {submitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>Submit
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
      </>
    );
  }
}

export default ResultEntry;
