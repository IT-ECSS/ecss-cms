import React from 'react';

/**
 * AG-Grid cell renderer for the "Confirmation" column.
 * Renders a checkbox toggle and fires onCellValueChanged on the parent
 * class when toggled.
 *
 * Props (AG-Grid params object):
 *   params.value            – current boolean value (checked state)
 *   params.colDef           – column definition
 *   params.node             – row node
 *   params.data             – row data
 *   params.context.componentInstance – ref to the parent class component
 */
const SlideButtonRenderer = (params) => {
  // Only render the toggle for SkillsFuture payment method
  if (params.data?.paymentMethod !== 'SkillsFuture') return null;

  const parseConfirmed = (value) => {
    if (value === true || value === false) return value;
    const v = String(value ?? '').trim().toLowerCase();
    if (v === 'confirmed' || v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'not confirmed' || v === 'false' || v === '0' || v === 'no' || v === '') return false;
    return false;
  };

  const handleChange = (e) => {
    const instance = params.context?.componentInstance;
    if (!instance) return;
    instance.onCellValueChanged({
      colDef: params.colDef,
      node: params.node,
      data: params.data,
      value: e.target.checked,
      newValue: e.target.checked,
      oldValue: parseConfirmed(params.data.confirmed),
    });
  };

  return (
    <div className="registration-payment-details-toggle-container">
      <input
        type="checkbox"
        className="registration-payment-details-toggle"
        checked={parseConfirmed(params.value)}
        onChange={handleChange}
      />
    </div>
  );
};

export default SlideButtonRenderer;
