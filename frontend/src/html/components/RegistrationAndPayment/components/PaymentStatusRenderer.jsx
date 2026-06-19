import React from 'react';
import { PAYMENT_STATUS_COLORS } from '../constants/paymentStatusColors';

/**
 * AG-Grid cell renderer for the payment status columns.
 * Renders the status value as a coloured pill badge.
 *
 * Props (AG-Grid params object):
 *   params.value – the current status string
 */
const PaymentStatusRenderer = (params) => {
  const statusText = String(params.value || '').trim();
  // Check if NSA in-charge styling should be applied through context
  // Only apply styling for Payment Status (SkillsFuture) column, not Cash/PayNow
  const colId = params.colDef?.colId || params.column?.colId;
  const isSkillsFutureColumn = colId === 'paymentStatusSkillsFuture';
  const isNsaInChargeStyling = isSkillsFutureColumn && params.context?.shouldApplyNsaInChargeStyling ? params.context.shouldApplyNsaInChargeStyling() : false;
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
        }}
      >
        {statusText}
      </span>
    );
  }

  const backgroundColor = PAYMENT_STATUS_COLORS[statusText];

  return (
    <span
      style={{
        display: 'block',
        padding: '0.25em 1.2em',
        borderRadius: '999px',
        fontWeight: 'bold',
        color: isNsaInChargeStyling ? '#87CEEB' : '#FFD700',
        fontSize: '0.85em',
        textAlign: 'center',
        width: '100%',
        backgroundColor: backgroundColor,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        letterSpacing: '0.02em',
        lineHeight: '1.8',
      }}
    >
      {statusText}
    </span>
  );
};

export default PaymentStatusRenderer;
