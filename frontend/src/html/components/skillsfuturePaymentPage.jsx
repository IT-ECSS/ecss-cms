import React, { useState } from 'react';
import skillsfutureService from '../../services/skillsfutureService';
import './skillsfuturePaymentPage.css';

/**
 * SkillsFuture Payment Request Page
 * Allows users to create a payment request and redirect to SkillsFuture
 */
function SkillsFuturePaymentPage() {
  const [courseId, setCourseId] = useState('');
  const [userId, setUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validate inputs
      if (!courseId.trim()) throw new Error('Course ID is required');
      if (!userId.trim()) throw new Error('User ID is required');
      if (!creditAmount || parseFloat(creditAmount) <= 0) throw new Error('Credit amount must be greater than 0');

      const paymentData = {
        courseId: courseId.trim(),
        userId: userId.trim(),
        creditAmount: parseFloat(creditAmount)
      };

      console.log('[SkillsFuture] Creating payment request:', paymentData);

      // Create payment request on backend
      const response = await skillsfutureService.createPaymentRequest(paymentData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create payment request');
      }

      setSuccess({
        requestId: response.requestId,
        message: 'Payment request created successfully!'
      });

      // Optional: Auto-redirect to SkillsFuture if redirectUrl is provided
      if (response.redirectUrl) {
        console.log('[SkillsFuture] Redirecting to SkillsFuture:', response.redirectUrl);
        setTimeout(() => {
          window.location.href = response.redirectUrl;
        }, 2000);
      }

    } catch (err) {
      console.error('[SkillsFuture] Payment request error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="skillsfuture-payment-container">
      <div className="payment-card">
        <div className="payment-header">
          <h1>SkillsFuture Payment</h1>
          <p>Apply SkillsFuture Credit to your course registration</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            <span>{success.message}</span>
            {success.requestId && (
              <small>Request ID: {success.requestId}</small>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-group">
            <label htmlFor="courseId">Course ID *</label>
            <input
              id="courseId"
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="e.g., COURSE-001"
              disabled={loading}
              required
            />
            <small>The ID of the course you're registering for</small>
          </div>

          <div className="form-group">
            <label htmlFor="userId">User ID *</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g., USER-123"
              disabled={loading}
              required
            />
            <small>Your unique user identifier</small>
          </div>

          <div className="form-group">
            <label htmlFor="creditAmount">Credit Amount ($) *</label>
            <input
              id="creditAmount"
              type="number"
              min="0"
              step="0.01"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="e.g., 500"
              disabled={loading}
              required
            />
            <small>Amount of SkillsFuture credits to use</small>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-mini"></span> Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right"></i> Proceed to SkillsFuture
                </>
              )}
            </button>
          </div>
        </form>

        <div className="payment-info">
          <h3>How it works:</h3>
          <ol>
            <li>Enter your course details and credit amount</li>
            <li>Click "Proceed to SkillsFuture"</li>
            <li>Complete the payment on SSG SkillsFuture platform</li>
            <li>You'll be redirected back with confirmation</li>
          </ol>
        </div>

        <div className="payment-terms">
          <small>
            By proceeding, you agree to the SkillsFuture Terms and Conditions.
            Your data will be transmitted securely via RSA-SHA256 digital signature.
          </small>
        </div>
      </div>
    </div>
  );
}

export default SkillsFuturePaymentPage;
