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
  // For NSA rows, finalPaymentMethod (staff-selected) is the source of truth.
  const resolvedMethod = String(
    params.data?.finalPaymentMethod || params.data?.paymentMethod || ''
  ).trim();
  // Check if NSA in-charge styling should be applied through context
  const isNsaInChargeStyling = params.context?.shouldApplyNsaInChargeStyling ? params.context.shouldApplyNsaInChargeStyling() : false;
  if (resolvedMethod !== 'SkillsFuture') return null;

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

  // Determine if the cell is editable
  let isEditable = true;
  if (typeof params.colDef.editable === 'function') {
    isEditable = params.colDef.editable(params);
  } else if (typeof params.colDef.editable === 'boolean') {
    isEditable = params.colDef.editable;
  }

  return (
    <div className="registration-payment-details-toggle-container">
      <input
        type="checkbox"
        className="registration-payment-details-toggle"
        style={
          isNsaInChargeStyling
            ? {
                borderColor: '#000080',
                accentColor: '#000080',
              }
            : {}
        }
        checked={parseConfirmed(params.value)}
        onChange={handleChange}
        disabled={!isEditable}
      />
    </div>
  );
};

export default SlideButtonRenderer;
