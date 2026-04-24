import React, { Component } from 'react';
import { decryptPaymentResponse, uploadSupportingDocuments, getClaimDetails } from '../../services/skillsfutureService';
import './skillsfutureCallbackPage.css';

/**
 * SkillsFuture Credit Pay — Callback Page  (SSG Steps 4-7)
 *
 * Step 4  SSG redirects here with ?encryptedPayload=... after user completes claim
 * Step 5  This page calls backend → backend calls SSG Decryption API
 * Step 6  Backend uploads supporting documents (triggered automatically)
 * Step 7  Claim status displayed; user can view details or cancel pending claims
 */
class SkillsFutureCallbackPage extends Component {
  constructor(props) {
    super(props);
    const params        = new URLSearchParams(window.location.search);
    const encryptedPayload = params.get('encryptedPayload');

    this.state = {
      encryptedPayload,
      claim: null,
      loading: !!encryptedPayload,   // start processing only if payload present
      error: null,
    };
  }

  componentDidMount() {
    if (this.state.encryptedPayload) {
      this.processCallback(this.state.encryptedPayload);
    }
  }

  // Step 5 — decrypt response via backend → SSG API
  processCallback = async (encryptedPayload) => {
    try {
      const result = await decryptPaymentResponse(encryptedPayload);
      if (!result.success) throw new Error(result.error || 'Decryption failed');
      this.setState({ claim: result.claim, loading: false });
    } catch (err) {
      console.error('[SkillsFuture Callback] Processing error:', err.message);
      this.setState({ error: err.message, loading: false });
    }
  };

  handleViewClaim = async () => {
    const { claim } = this.state;
    if (!claim?.claimRequestCode) return;
    try {
      const result = await getClaimDetails(claim.claimRequestCode);
      if (result.success) this.setState({ claim: { ...claim, ...result.claim } });
    } catch (err) {
      console.error('[SkillsFuture] getClaimDetails error:', err.message);
    }
  };

  handleContinue = () => {
    window.location.href = '/coursesSelection';
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  renderLoading() {
    return (
      <div className="skillsfuture-callback-container loading">
        <div className="skillsfuture-callback-card">
          <div className="spinner"></div>
          <h1 className="callback-title">Processing Your SkillsFuture Claim…</h1>
          <p className="callback-message">Please wait while we verify your claim with SSG.</p>
        </div>
      </div>
    );
  }

  renderNoPayload() {
    return (
      <div className="skillsfuture-callback-container">
        <div className="skillsfuture-callback-card">
          <div className="callback-icon">
            <i className="fas fa-info-circle" style={{ color: '#666' }}></i>
          </div>
          <h1 className="callback-title">SkillsFuture Credit Pay</h1>
          <p className="callback-message">
            This page is the return destination after you complete your SkillsFuture
            Credit claim. Please initiate a claim from your course registration page.
          </p>
          <button className="btn-primary" onClick={() => window.location.href = '/coursesSelection'}>
            <i className="fas fa-list"></i> Go to Courses
          </button>
        </div>
      </div>
    );
  }

  renderSuccess() {
    const { claim } = this.state;
    return (
      <div className="skillsfuture-callback-container success">
        <div className="skillsfuture-callback-card">
          <div className="callback-icon success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <h1 className="callback-title">SkillsFuture Claim Submitted!</h1>

          <div className="claim-details">
            <p className="detail-item">
              <strong>Claim Reference:</strong>
              <span>{claim.claimRequestCode || 'N/A'}</span>
            </p>
            <p className="detail-item">
              <strong>Status:</strong>
              <span className={`claim-status claim-status--${(claim.claimStatus || '').toLowerCase()}`}>
                {claim.claimStatus || 'SUBMITTED'}
              </span>
            </p>
            {claim.creditUsed != null && (
              <p className="detail-item">
                <strong>Credits Used:</strong>
                <span>SGD {Number(claim.creditUsed).toFixed(2)}</span>
              </p>
            )}
            {claim.courseRunId && (
              <p className="detail-item">
                <strong>Course Run ID:</strong>
                <span>{claim.courseRunId}</span>
              </p>
            )}
          </div>

          <p className="callback-message">
            Your SkillsFuture Credit claim has been submitted to SSG for processing.
            You will receive an update once it is approved.
          </p>

          <div className="button-group">
            <button className="btn-secondary" onClick={this.handleViewClaim}>
              <i className="fas fa-sync-alt"></i> Refresh Status
            </button>
            <button className="btn-primary" onClick={this.handleContinue}>
              <i className="fas fa-arrow-right"></i> Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderError() {
    return (
      <div className="skillsfuture-callback-container error">
        <div className="skillsfuture-callback-card">
          <div className="callback-icon error-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h1 className="callback-title">Claim Could Not Be Processed</h1>
          <div className="error-details">
            <p className="error-message">{this.state.error}</p>
          </div>
          <div className="button-group">
            <button className="btn-primary" onClick={() => window.history.back()}>
              <i className="fas fa-redo"></i> Try Again
            </button>
            <button className="btn-secondary" onClick={() => window.location.href = '/home'}>
              <i className="fas fa-home"></i> Go Home
            </button>
          </div>
          <p className="callback-help-text">
            If the problem persists, please contact our support team.
          </p>
        </div>
      </div>
    );
  }

  render() {
    const { loading, error, claim, encryptedPayload } = this.state;

    if (loading)          return this.renderLoading();
    if (error)            return this.renderError();
    if (claim)            return this.renderSuccess();
    if (!encryptedPayload) return this.renderNoPayload();

    return this.renderLoading();
  }
}

export default SkillsFutureCallbackPage;

