import React from 'react';

/** Colour map matching the original status badge colours. */
const STATUS_COLORS = {
  Pending: '#FFA500',
  'Generating SkillsFuture Invoice': '#00CED1',
  'SkillsFuture Done': '#008000',
  Cancelled: '#FF0000',
  Withdrawn: '#800000',
  Paid: '#008000',
  Confirmed: '#008000',
  Refunded: '#D2691E',
  'Not Successful': '#A9A9A9',
};

/**
 * AG-Grid cell renderer for the "Registration and Payment Status" column.
 * Renders the status value as a coloured pill badge.
 *
 * Props (AG-Grid params object):
 *   params.value – the current status string
 */
const PaymentStatusRenderer = (params) => {
  const statusText      = params.value;
  const backgroundColor = STATUS_COLORS[statusText] || '#D3D3D3';

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
