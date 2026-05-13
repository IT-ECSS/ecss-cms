import React, { Component } from 'react';
import { getClaimDetails } from '../../services/skillsfutureService';
import './sfClaimLookup.css';

class SkillsFutureCallbackPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      nric: '',
      claimRequestCode: '',
      claim: null,
      loading: false,
      error: null,
    };
  }

  handleSearch = async () => {
    const { nric, claimRequestCode } = this.state;
    if (!nric.trim() || !claimRequestCode.trim()) return;
    this.setState({ loading: true, error: null, claim: null });
    try {
      const result = await getClaimDetails(claimRequestCode.trim());
      if (result.success) {
        this.setState({ claim: { ...result.claim, _enteredNric: nric.trim().toUpperCase() }, loading: false });
      } else {
        this.setState({ error: result.error || 'Claim not found.', loading: false });
      }
    } catch (err) {
      this.setState({ error: err.message, loading: false });
    }
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') this.handleSearch();
  };

  getBadgeClass(status = '') {
    const s = status.toLowerCase();
    if (s === 'approved')  return 'sf-lookup-badge--approved';
    if (s === 'pending')   return 'sf-lookup-badge--pending';
    if (s === 'submitted') return 'sf-lookup-badge--submitted';
    if (s === 'rejected')  return 'sf-lookup-badge--rejected';
    if (s === 'cancelled') return 'sf-lookup-badge--cancelled';
    return 'sf-lookup-badge--default';
  }

  renderRow(label, value) {
    if (value == null || value === '') return null;
    return (
      <div className="sf-lookup-row" key={label}>
        <span className="sf-lookup-row-label">{label}</span>
        <span className="sf-lookup-row-value">{value}</span>
      </div>
    );
  }

  render() {
    const { nric, claimRequestCode, claim, loading, error } = this.state;
    const showResults = !!claim;

    return (
      <div className="sf-lookup-page">
        <div className="sf-lookup-card">

          {/* ── Header ── */}
          <div className="sf-lookup-header">
            <div className="sf-lookup-header-icon">
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <h1 className="sf-lookup-title">SkillsFuture Claim Lookup</h1>
          </div>
          <p className="sf-lookup-subtitle">
            Enter the member's NRIC and Claim ID to retrieve the current status from SSG.
          </p>

          <hr className="sf-lookup-divider" />

          {/* ══ FORM VIEW ══ */}
          {!showResults && (
            <>
              <div className="sf-lookup-fields">
                <div className="sf-lookup-field">
                  <label className="sf-lookup-label" htmlFor="nric">NRIC</label>
                  <input
                    id="nric"
                    type="text"
                    className="sf-lookup-input"
                    value={nric}
                    onChange={(e) => this.setState({ nric: e.target.value, error: null })}
                    onKeyDown={this.handleKeyDown}
                    placeholder="Please enter NRIC"
                    autoComplete="off"
                    maxLength={9}
                  />
                </div>
                <div className="sf-lookup-field">
                  <label className="sf-lookup-label" htmlFor="claimCode">Claim ID</label>
                  <input
                    id="claimCode"
                    type="text"
                    className="sf-lookup-input"
                    value={claimRequestCode}
                    onChange={(e) => this.setState({ claimRequestCode: e.target.value, error: null })}
                    onKeyDown={this.handleKeyDown}
                    placeholder="Please enter Claim ID"
                    autoComplete="off"
                  />
                </div>
              </div>

              {error && (
                <div className="sf-lookup-error">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              )}

              <div className="sf-lookup-search-row">
                <button
                  className="sf-lookup-btn"
                  onClick={this.handleSearch}
                  disabled={loading || !claimRequestCode.trim() || !nric.trim()}
                >
                  {loading
                    ? <><i className="fas fa-spinner fa-spin"></i> Looking up…</>
                    : <><i className="fas fa-search"></i> Look Up</>
                  }
                </button>
              </div>
            </>
          )}

          {/* ══ RESULTS VIEW ══ */}
          {showResults && (
            <>
              <div className="sf-lookup-results">
                <div className="sf-lookup-results-header">
                  <span className="sf-lookup-results-title">Claim Details</span>
                  <span className={`sf-lookup-badge ${this.getBadgeClass(claim.claimStatus)}`}>
                    {claim.claimStatus || 'N/A'}
                  </span>
                </div>

                {this.renderRow('Claim ID', claim.claimRequestCode || claimRequestCode)}
                {this.renderRow('NRIC', claim.nric || claim._enteredNric)}
                {this.renderRow('Credits Used', claim.creditUsed != null ? `SGD ${Number(claim.creditUsed).toFixed(2)}` : null)}
                {this.renderRow('Course Run ID', claim.courseRunId)}
                {this.renderRow('Course Start Date', claim.courseStartDate)}
                {this.renderRow('Course End Date', claim.courseEndDate)}
                {this.renderRow('Registration ID', claim.registrationId)}
              </div>

              <div className="sf-lookup-search-row" style={{ marginTop: '1rem', marginBottom: 0 }}>
                <button
                  className="sf-lookup-btn-outline"
                  onClick={() => this.setState({ claim: null, error: null })}
                >
                  <i className="fas fa-arrow-left"></i> New Search
                </button>
              </div>
            </>
          )}

          <hr className="sf-lookup-divider" />

          {/* ── Footer ── */}
          <div className="sf-lookup-footer">
            <button className="sf-lookup-btn-ghost" onClick={() => window.location.href = '/home'}>
              <i className="fas fa-arrow-left"></i> Back to Home
            </button>
          </div>

        </div>
      </div>
    );
  }
}

export default SkillsFutureCallbackPage;

