import React from 'react';

const FinalPaymentMethodRenderer = (params) => {
  const currentMethod = params.data?.finalPaymentMethod || params.value || params.data?.paymentMethod || '';
  const { location } = params.data;
  const isPRWW = location === 'Pasir Ris West Wellness Centre';
  const finalPaymentOptions = isPRWW
    ? ['PayNow', 'SkillsFuture']
    : ['Cash', 'PayNow', 'SkillsFuture'];

  // Check if NSA in-charge styling should be applied through context
  const isNsaInChargeStyling = params.context?.shouldApplyNsaInChargeStyling ? params.context.shouldApplyNsaInChargeStyling() : false;
  
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
  
  // Check if user is Admin or Sub Admin - they can edit SkillsFuture
  const isAdminOrSubAdmin = role.includes('admin') || role.includes('sub admin');

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

  // Lock buttons if any payment/refund fields have values (completely read-only)
  const hasPaymentDate = !!(params.data?.paymentDate && String(params.data.paymentDate).trim() !== '');
  const hasPaymentTime = !!(params.data?.paymentTime && String(params.data.paymentTime).trim() !== '');
  const hasRefundedDate = !!(params.data?.refundedDate && String(params.data.refundedDate).trim() !== '');
  const hasRefundedTime = !!(params.data?.refundedTime && String(params.data.refundedTime).trim() !== '');
  const isLockedByPaymentData = hasPaymentDate || hasPaymentTime || hasRefundedDate || hasRefundedTime;
  
  // Disable editing if current method is SkillsFuture (except for Admin/Sub Admin)
  const isCurrentMethodSkillsFuture = currentMethod === 'SkillsFuture';
  const shouldDisableSkillsFuture = isCurrentMethodSkillsFuture && !isAdminOrSubAdmin;

  return (
    <div className="payment-method-group">
      {finalPaymentOptions.map((method) => {
        const isDisabled = (isNsaCourse && isRestrictedRole) || isLockedByPaymentData || shouldDisableSkillsFuture;

        return (
          <button
            key={method}
            type="button"
            className={`payment-method-btn payment-method-btn--${method
              .toLowerCase()
              .replace(/\s+/g, '-')} ${method === currentMethod ? 'active' : ''}`}
            style={
              isNsaInChargeStyling
                ? {
                    border: '2px solid #654321',
                    color: '#654321',
                    backgroundColor: method === currentMethod ? '#fff' : 'transparent',
                  }
                : {}
            }
            onClick={isDisabled ? undefined : (event) => handleClick(event, method)}
            disabled={isDisabled}
          >
            {method}
          </button>
        );
      })}
    </div>
  );
};

export default FinalPaymentMethodRenderer;
