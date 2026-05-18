import React from 'react';

const FinalPaymentMethodRenderer = (params) => {
  const currentMethod = params.data?.finalPaymentMethod || params.value || params.data?.paymentMethod || '';
  const { location } = params.data;
  const isPRWW = location === 'Pasir Ris West Wellness Centre';
  const finalPaymentOptions = isPRWW
    ? ['PayNow', 'SkillsFuture']
    : ['Cash', 'PayNow', 'SkillsFuture'];

  // Determine if current user should be allowed to change final payment for NSA course type
  const component = params.context?.componentInstance;
  const role = String(component?.props?.role || '').toLowerCase();
  const courseType = params.data?.courseInfo?.courseType || params.data?.courseType || '';
  const restrictedForNsa = [
    'nsa in-charge',
    'fitness trainer',
    'site in-charge',
    'social worker',
  ];
  const isRestrictedRole = restrictedForNsa.some(k => role.includes(k));
  const isNsaCourse = String(courseType || '').trim() === 'NSA';

  const handleClick = async (event, method) => {
    event.stopPropagation();
    event.preventDefault();

    const rowNode = params.api.getRowNode(params.node.id);
    if (!rowNode) return;

    const oldValue = String(params.value || params.data?.finalPaymentMethod || '').trim();
    const newValue = String(method || '').trim();
    if (oldValue === newValue) return;

    // Write directly to row data and invoke the handler once manually.
    // Using setDataValue here can be inconsistent with custom renderer button clicks
    // (and may cause duplicate or missing onCellValueChanged in this column path).
    rowNode.data.finalPaymentMethod = newValue;

    // Do NOT optimistically set paymentStatus here — the handler (simple or full path)
    // determines the correct status and calls refreshCells with the right value.
    // Pre-setting to 'Paid' was incorrect for Pending+Submitted records (simple path)
    // where payment status must stay 'Pending'.

    params.api.refreshCells({
      rowNodes: [params.node],
      columns: ['finalPaymentMethod', 'paymentStatusCashPayNow', 'paymentStatusSkillsFuture'],
      force: true,
    });

    const component = params.context?.componentInstance;
    if (component && typeof component.onCellValueChanged === 'function') {
      try {
        await component.onCellValueChanged({
          api: params.api,
          node: params.node,
          data: rowNode.data,
          colDef: params.colDef,
          field: 'finalPaymentMethod',
          value: newValue,
          newValue: newValue,
          oldValue: oldValue,
          rowIndex: params.rowIndex,
          source: 'finalPaymentMethodRenderer',
        });
      } catch (error) {
        // Keep renderer resilient; detailed handling already exists in parent handler.
        console.error('Final payment method update failed:', error);
      }
    }
  };

  return (
    <div className="payment-method-group">
      {finalPaymentOptions.map((method) => {
        const isDisabled = isNsaCourse && isRestrictedRole;

        return (
          <button
            key={method}
            type="button"
            className={`payment-method-btn payment-method-btn--${method
              .toLowerCase()
              .replace(/\s+/g, '-')} ${method === currentMethod ? 'active' : ''}`}
            onClick={isDisabled ? undefined : (event) => handleClick(event, method)}
          >
            {method}
          </button>
        );
      })}
    </div>
  );
};

export default FinalPaymentMethodRenderer;
