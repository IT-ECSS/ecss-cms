import React, { useRef, useState } from 'react';
import { encryptPaymentRequest } from '../../services/skillsfutureService';
import './skillsfuturePaymentPage.css';

/**
 * SkillsFuture Credit Pay — Payment Request Page  (SSG 7-step flow)
 *
 * Step 1  User fills in course + learner details
 * Step 2  Backend calls SSG Payment Request Encryption API
 * Step 3  This page auto-submits an HTML form POST to SSG's endpoint
 *         → user is redirected to SSG, logs in with SingPass, selects credit
 * (Steps 4-7 handled by skillsfutureCallbackPage after SSG redirects back)
 */
function SkillsFuturePaymentPage() {
  const [nric, setNric]                         = useState('');
  const [courseRunId, setCourseRunId]           = useState('');
  const [courseFee, setCourseFee]               = useState('');
  const [courseStartDate, setCourseStartDate]   = useState('');
  const [courseEndDate, setCourseEndDate]       = useState('');
  const [trainingPartnerUen, setTrainingPartnerUen] = useState('');
  const [supportingDocId, setSupportingDocId]   = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Hidden form used to POST encrypted payload to SSG
  const formRef             = useRef(null);
  const encryptedInputRef   = useRef(null);
  const formActionRef       = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!nric.trim() || !courseRunId.trim() || !courseFee || !courseStartDate || !courseEndDate || !trainingPartnerUen.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);

      // Step 2 — ask backend to call SSG's Encryption API
      const result = await encryptPaymentRequest({
        nric: nric.trim().toUpperCase(),
        courseRunId: courseRunId.trim(),
        courseFee: parseFloat(courseFee),
        courseStartDate,
        courseEndDate,
        trainingPartnerUen: trainingPartnerUen.trim(),
        supportingDocId: supportingDocId.trim(),
      });

      if (!result.success) throw new Error(result.error || 'Encryption failed');

      // Step 3 — form POST to SSG's SkillsFuture Credit Pay URL
      encryptedInputRef.current.value = result.encryptedPayload;
      formRef.current.action          = result.formUrl;
      formRef.current.submit();

    } catch (err) {
      console.error('[SkillsFuture] Payment initiation error:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="skillsfuture-payment-container">
      <div className="payment-card">
        <div className="payment-header">
          <h1>SkillsFuture Credit Pay</h1>
          <p>Apply your SkillsFuture Credit toward this course</p>
        </div>

        {/* How it works */}
        <div className="payment-info">
          <h3>How it works</h3>
          <ol>
            <li>Fill in the course and learner details below</li>
            <li>Click <strong>Proceed to SkillsFuture</strong></li>
            <li>Log in with SingPass on the SkillsFuture portal and select your credit amount</li>
            <li>You will be redirected back here with your claim confirmation</li>
          </ol>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-group">
            <label htmlFor="nric">NRIC *</label>
            <input
              id="nric"
              type="text"
              value={nric}
              onChange={(e) => setNric(e.target.value)}
              placeholder="e.g. S1234567A"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="courseRunId">Course Run ID *</label>
            <input
              id="courseRunId"
              type="text"
              value={courseRunId}
              onChange={(e) => setCourseRunId(e.target.value)}
              placeholder="SSG course run ID"
              disabled={loading}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="courseStartDate">Course Start Date *</label>
              <input
                id="courseStartDate"
                type="date"
                value={courseStartDate}
                onChange={(e) => setCourseStartDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="courseEndDate">Course End Date *</label>
              <input
                id="courseEndDate"
                type="date"
                value={courseEndDate}
                onChange={(e) => setCourseEndDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="courseFee">Course Fee (SGD) *</label>
            <input
              id="courseFee"
              type="number"
              min="0.01"
              step="0.01"
              value={courseFee}
              onChange={(e) => setCourseFee(e.target.value)}
              placeholder="e.g. 500"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="trainingPartnerUen">Training Partner UEN *</label>
            <input
              id="trainingPartnerUen"
              type="text"
              value={trainingPartnerUen}
              onChange={(e) => setTrainingPartnerUen(e.target.value)}
              placeholder="Your organisation's UEN"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="supportingDocId">Supporting Document Reference</label>
            <input
              id="supportingDocId"
              type="text"
              value={supportingDocId}
              onChange={(e) => setSupportingDocId(e.target.value)}
              placeholder="Internal reference number (optional)"
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner-mini"></span> Preparing…</>
              ) : (
                <><i className="fas fa-arrow-right"></i> Proceed to SkillsFuture</>
              )}
            </button>
          </div>
        </form>

        {/* Hidden form — auto-submitted to SSG after encryption (Step 3) */}
        <form ref={formRef} method="POST" style={{ display: 'none' }}>
          <input ref={encryptedInputRef} name="encryptedPayload" type="hidden" />
        </form>
      </div>
    </div>
  );
}

export default SkillsFuturePaymentPage;
