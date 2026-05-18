import React from 'react';
import '../../../../css/sub/updateProgressModal.css';

function StepIcon({ status }) {
  if (status === 'done') {
    return (
      <div className="upm-step-icon">
        <div className="upm-tick" />
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="upm-step-icon">
        <div className="upm-spinner" />
      </div>
    );
  }
  // pending
  return (
    <div className="upm-step-icon">
      <div className="upm-dot" />
    </div>
  );
}

/**
 * Multi-step progress modal for Registration & Payment table updates.
 *
 * Props:
 *   isOpen   {boolean} – whether to render
 *   steps    {Array}   – [{ label: string, status: 'pending'|'running'|'done' }]
 */
function UpdateProgressModal({ isOpen, steps }) {
  const hasSteps = Array.isArray(steps) && steps.length > 0;
  const allDone  = hasSteps && steps.every(s => s.status === 'done');

  if (!isOpen || !hasSteps) return null;

  return (
    <div className="upm-overlay">
      <div className="upm-modal">
        <h3 className="upm-title">
          {allDone ? '✓ Record Updated' : 'Updating record…'}
        </h3>
        <div className="upm-steps">
          {steps.map((step, i) => (
            <div key={i} className={`upm-step upm-step--${step.status}`}>
              <StepIcon status={step.status} />
              <span className="upm-step-label">{step.label}</span>
            </div>
          ))}
        </div>
        

      </div>
    </div>
  );
}

export default UpdateProgressModal;
