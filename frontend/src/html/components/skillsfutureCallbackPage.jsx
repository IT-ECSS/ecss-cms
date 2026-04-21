import React, { Component } from 'react';
import './skillsfutureCallbackPage.css';

/**
 * SkillsFuture Callback Page
 * 
 * Handles redirect from SkillsFuture after backend processes the claim
 * - Receives status (success/error)
 * - Displays claim confirmation
 * - Redirects to appropriate page
 */
class SkillsFutureCallbackPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: new URLSearchParams(window.location.search).get('status'),
      claimId: new URLSearchParams(window.location.search).get('claimId'),
      courseId: new URLSearchParams(window.location.search).get('courseId'),
      error: new URLSearchParams(window.location.search).get('error'),
      loading: false
    };
  }

  componentDidMount() {
    console.log('[SkillsFuture Callback] Received params:', {
      status: this.state.status,
      claimId: this.state.claimId,
      courseId: this.state.courseId,
      error: this.state.error
    });

    // Auto-redirect after 5 seconds on success
    if (this.state.status === 'success') {
      setTimeout(() => {
        this.handleContinue();
      }, 5000);
    }
  }

  handleContinue = () => {
    // Redirect to home or course page
    if (this.state.courseId) {
      window.location.href = `/coursesSelection?selected=${this.state.courseId}`;
    } else {
      window.location.href = '/home';
    }
  };

  handleRetry = () => {
    window.location.href = '/coursesSelection';
  };

  renderSuccess = () => {
    return (
      <div className="skillsfuture-callback-container success">
        <div className="skillsfuture-callback-card">
          <div className="callback-icon success-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          
          <h1 className="callback-title">SkillsFuture Claim Successful!</h1>
          
          <div className="claim-details">
            <p className="detail-item">
              <strong>Claim ID:</strong>
              <span>{this.state.claimId}</span>
            </p>
            <p className="detail-item">
              <strong>Course ID:</strong>
              <span>{this.state.courseId || 'N/A'}</span>
            </p>
          </div>

          <p className="callback-message">
            Your SkillsFuture Credit has been successfully applied to this course. 
            You will be redirected shortly...
          </p>

          <button 
            className="btn-primary" 
            onClick={this.handleContinue}
          >
            Continue to Course
          </button>
        </div>
      </div>
    );
  };

  renderError = () => {
    return (
      <div className="skillsfuture-callback-container error">
        <div className="skillsfuture-callback-card">
          <div className="callback-icon error-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          
          <h1 className="callback-title">SkillsFuture Claim Failed</h1>
          
          <div className="error-details">
            <p className="error-message">
              {this.state.error || 'An error occurred while processing your SkillsFuture claim.'}
            </p>
          </div>

          <div className="button-group">
            <button 
              className="btn-primary" 
              onClick={this.handleRetry}
            >
              <i className="fas fa-redo"></i> Retry Claim
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => window.location.href = '/home'}
            >
              <i className="fas fa-home"></i> Go Home
            </button>
          </div>

          <p className="callback-help-text">
            If the problem persists, please contact our support team.
          </p>
        </div>
      </div>
    );
  };

  renderLoading = () => {
    return (
      <div className="skillsfuture-callback-container loading">
        <div className="skillsfuture-callback-card">
          <div className="spinner"></div>
          <h1 className="callback-title">Processing Your SkillsFuture Claim...</h1>
          <p className="callback-message">Please wait while we process your claim.</p>
        </div>
      </div>
    );
  };

  render() {
    const { status } = this.state;

    if (!status) {
      return this.renderLoading();
    }

    if (status === 'success') {
      return this.renderSuccess();
    }

    if (status === 'error') {
      return this.renderError();
    }

    return this.renderLoading();
  }
}

export default SkillsFutureCallbackPage;
