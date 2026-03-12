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
        existingData[f.key] = participantData[f.key] || '';
      });
    }
    this.state = {
      formData: existingData,
      submitting: false,
      submitSuccess: false,
      submitError: null,
      fieldErrors: {},
    };
  }

  // ── Populate form when participantData arrives ──
  componentDidUpdate(prevProps) {
    const { selectedStation, participantData } = this.props;
    if (participantData && prevProps.participantData !== participantData && selectedStation) {
      const existingData = {};
      selectedStation.fields.forEach((f) => {
        existingData[f.key] = participantData[f.key] || '';
      });
      this.setState({ formData: existingData, fieldErrors: {} });
    }
  }

  // ── Form Input ──
  handleFieldChange = (key, value) => {
    this.setState((prev) => ({
      formData: { ...prev.formData, [key]: value },
      fieldErrors: { ...prev.fieldErrors, [key]: null },
    }));
  };

  // ── Reset ──
  handleReset = () => {
    const { selectedStation } = this.props;
    const emptyData = {};
    if (selectedStation) {
      selectedStation.fields.forEach((f) => { emptyData[f.key] = ''; });
      if (selectedStation.remarksKey) emptyData[selectedStation.remarksKey] = '';
    }
    this.setState({ formData: emptyData, fieldErrors: {}, submitError: null });
  };

  // ── Submit ──
  handleSubmit = () => {
    const { fileId, selectedStation, entryNumber } = this.props;
    const { formData } = this.state;

    if (!fileId || entryNumber == null) return;

    // Field-level validation (remarks excluded)
    const fieldErrors = {};
    selectedStation.fields.forEach((f) => {
      if (f.required !== false && !formData[f.key]) {
        fieldErrors[f.key] = f.validationMessage || 'This field is required.';
      }
    });
    if (Object.keys(fieldErrors).length > 0) {
      this.setState({ fieldErrors });
      return;
    }

    const updates = {};

    if (selectedStation.resultKey) {
      // resultKey station: single attempt → use directly as result
      const val = formData[selectedStation.fields[0].key] || '';
      updates[selectedStation.resultKey] = val;
      updates[selectedStation.fields[0].key] = val;
      if (selectedStation.remarksKey && formData[selectedStation.remarksKey]) {
        updates[selectedStation.remarksKey] = formData[selectedStation.remarksKey];
      }
    } else {
      // Single-attempt station (measurement, 1-3)
      selectedStation.fields.forEach((f) => {
        if (formData[f.key] !== undefined) updates[f.key] = formData[f.key];
      });
      if (selectedStation.remarksKey && formData[selectedStation.remarksKey]) {
        updates[selectedStation.remarksKey] = formData[selectedStation.remarksKey];
      }
    }

    this.setState({ submitting: true, submitError: null });

    axios.post(`${BACKEND_URL}/googleDrive/updateRow`, { fileId, entryNumber, updates })
      .then((res) => {
        if (res.data.success) {
          this.setState({ submitting: false, submitSuccess: true });
        } else {
          this.setState({ submitting: false, submitError: res.data.error || 'Failed to update.' });
        }
      })
      .catch((err) => {
        console.error('Error updating row:', err.message);
        this.setState({ submitting: false, submitError: 'Network error. Please try again.' });
      });
  };

  // ── Next Participant ──
  handleNextParticipant = () => {
    this.setState({ formData: {}, submitSuccess: false, submitError: null });
    this.props.onNextParticipant();
  };

  render() {
    const { selectedStation, participantData, entryNumber, lookupError, onNextParticipant, loading } = this.props;
    const { formData, submitting, submitSuccess, submitError, fieldErrors } = this.state;

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
          <h3 className="fft-result-entry-section-title">Enter Results</h3>
        </div>
        <hr style={{ margin: '12px 0' }} />
        <p className="fft-result-entry-section-desc">Key in the participant's result and tap Submit to save.</p>

        {/* Participant Info Card */}
        <div className="fft-result-entry-participant-card">
              <div className="fft-result-entry-participant-row">
                <div className="fft-result-entry-participant-avatar">
                  <i className="fas fa-user"></i>
                </div>
                <div>
                  <div className="fft-result-entry-participant-name">
                    {participantData.name || participantData.chineseName || '—'}
                  </div>
                  {participantData.chineseName && participantData.name && (
                    <div className="fft-result-entry-participant-chinese">{participantData.chineseName}</div>
                  )}
                  <div className="fft-result-entry-participant-meta">Entry #{entryNumber}</div>
                  <div className="fft-result-entry-participant-meta">
                    <i className="fas fa-phone" style={{ marginRight: '4px', fontSize: '0.85em' }}></i>
                    {participantData.phoneNo || '—'}
                  </div>
                  <div className="fft-result-entry-participant-meta">
                    <i className="fas fa-birthday-cake" style={{ marginRight: '4px', fontSize: '0.85em' }}></i>
                    DOB:{' '}
                    {participantData.dd && participantData.mm && participantData.yyyy
                      ? `${participantData.dd}/${participantData.mm}/${participantData.yyyy}`
                      : '—'}
                    &nbsp;·&nbsp; Age: {participantData.age || '—'}
                  </div>
                  <div className="fft-result-entry-participant-meta">
                    <i className="fas fa-venus-mars" style={{ marginRight: '4px', fontSize: '0.85em' }}></i>
                    Gender: {participantData.gender || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Success state */}
            {submitSuccess && (
              <div className="fft-result-entry-success-card">
                <div className="fft-result-entry-success-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <h3 className="fft-result-entry-success-title">Results Submitted!</h3>
                <p className="fft-result-entry-success-text">Data has been saved to the spreadsheet.</p>
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
                        <span style={{ color: '#9e9e9e', fontWeight: 400 }}>({field.labelZh})</span>
                      </label>
                      <input
                        type="text"
                        inputMode="text"
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
                        <span style={{ color: '#9e9e9e', fontWeight: 400 }}>(备注)</span>
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
