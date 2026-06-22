import React from 'react';
import { REGISTRATION_STATUS_COLORS } from '../constants/registrationStatusColors';

/**
 * AG-Grid cell renderer for the registration status column.
 * Renders the status value as a coloured pill badge.
 *
 * Props (AG-Grid params object):
 *   params.value – the current status string
 */
const RegistrationStatusRenderer = (params) => {
  const statusText = String(params.value || '').trim();
  // Check if NSA in-charge styling should be applied through context
  const isNsaInChargeStyling = params.context?.shouldApplyNsaInChargeStyling ? params.context.shouldApplyNsaInChargeStyling() : false;
  
  // Get component instance and user role from context
  const component = params.context?.componentInstance;
  const role = String(component?.props?.role || '').toLowerCase();
  
  // Check if user is Finance role (restricted from editing Registration Status)
  const isFinanceRole = role.includes('finance');
  
  if (!statusText) {
    return null;
  }

  if (statusText === 'Not Available') {
    return (
      <span
        style={{
          display: 'block',
          textAlign: 'center',
          width: '100%',
          color: '#555',
          fontStyle: 'italic',
          fontWeight: '600',
          fontSize: '0.85em',
          lineHeight: '1.8',
          cursor: isFinanceRole ? 'not-allowed' : 'pointer',
          pointerEvents: isFinanceRole ? 'none' : 'auto',
        }}
      >
        {statusText}
      </span>
    );
  }

  const backgroundColor = REGISTRATION_STATUS_COLORS[statusText];

  return (
    <span
      style={{
        display: 'block',
        padding: '0.25em 1.2em',
        borderRadius: '999px',
        fontWeight: 'bold',
        color: isNsaInChargeStyling ? '#87CEEB' : '#fff',
        fontSize: '0.85em',
        textAlign: 'center',
        width: '100%',
        backgroundColor: backgroundColor,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        letterSpacing: '0.02em',
        lineHeight: '1.8',
        cursor: isFinanceRole ? 'not-allowed' : 'pointer',
        pointerEvents: isFinanceRole ? 'none' : 'auto',
      }}
    >
      {statusText}
    </span>
  );
};

export default RegistrationStatusRenderer;
