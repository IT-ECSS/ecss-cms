import React from 'react';

/** Colour map matching the original status badge colours. */
const STATUS_COLORS = {
  Pending: '#B26A00',
  'Generating SkillsFuture Invoice': '#006D77',
  'SkillsFuture Done': '#2E7D32',
  'Cancelled for duplication': '#455123',
  'To refund': '#8D4F12',
  Withdrawn: '#7A6F00',
  Paid: '#00796B',
  Confirmed: '#1565C0',
  Refunded: '#AD3F00',
  'Not Successful': '#5D4037',
  Submitted: '#0277BD',
  'Confirmed Slot': '#4E7D1A',
  'Cancelled - No payment received': '#455A64',
};

/**
 * AG-Grid cell renderer for the "Registration and Payment Status" column.
 * Renders the status value as a coloured pill badge.
 *
 * Props (AG-Grid params object):
 *   params.value – the current status string
 */
const PaymentStatusRenderer = (params) => {
  const statusText = String(params.value || '').trim();
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

  const backgroundColor = STATUS_COLORS[statusText];

  return (
    <span
      style={{
        display: 'block',
        padding: '0.25em 1.2em',
        borderRadius: '999px',
        fontWeight: 'bold',
        color: '#fff',
        fontSize: '0.85em',
        textAlign: 'center',
        width: '100%',
        backgroundColor,
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
