import React from 'react';

/**
 * AG-Grid cell renderer for date/time fields (Payment Date, Payment Time, Refunded Date, Refunded Time)
 * Renders the text value with brown color when NSA in-charge styling is applied
 *
 * Props (AG-Grid params object):
 *   params.value – the current value string
 */
const DateTimeFieldRenderer = (params) => {
  const value = String(params.value || '').trim();
  // Check if NSA in-charge styling should be applied through context
  const isNsaInChargeStyling = params.context?.shouldApplyNsaInChargeStyling ? params.context.shouldApplyNsaInChargeStyling() : false;

  if (!value) {
    return null;
  }

  return (
    <span
      style={{
        display: 'block',
        textAlign: 'center',
        width: '100%',
        color: isNsaInChargeStyling ? '#A0522D' : 'inherit',
        fontSize: '0.95em',
        lineHeight: '1.6',
      }}
    >
      {value}
    </span>
  );
};

export default DateTimeFieldRenderer;
