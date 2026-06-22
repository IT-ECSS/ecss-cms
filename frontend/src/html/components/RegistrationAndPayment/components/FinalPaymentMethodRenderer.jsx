import React from 'react';

const FinalPaymentMethodRenderer = (params) => {
  const currentMethod =
    params.data?.finalPaymentMethod ||
    params.value ||
    params.data?.paymentMethod ||
    '';

  const { location } = params.data;

  const isPRWW = location === 'Pasir Ris West Wellness Centre';

  const finalPaymentOptions = isPRWW
    ? ['PayNow', 'SkillsFuture']
    : ['Cash', 'PayNow', 'SkillsFuture'];

  const isNsaInChargeStyling =
    params.context?.shouldApplyNsaInChargeStyling
      ? params.context.shouldApplyNsaInChargeStyling()
      : false;

  const component = params.context?.componentInstance;

  const role = String(component?.props?.role || '').toLowerCase();

  const courseType =
    params.data?.courseInfo?.courseType ||
    params.data?.courseType ||
    '';

  const restrictedForNsa = [
    'nsa in-charge',
    'fitness trainer',
    'site in-charge',
    'social worker',
  ];

  const isRestrictedRole = restrictedForNsa.some((k) =>
    role.includes(k)
  );

  const isNsaCourse =
    String(courseType || '').trim() === 'NSA';

  const isAdminOrSubAdmin =
    role.includes('admin') || role.includes('sub admin');

  const handleClick = async (event, method) => {
    event.stopPropagation();
    event.preventDefault();

    const rowNode = params.api.getRowNode(params.node.id);
    if (!rowNode) return;

    const oldValue = String(
      params.value ||
        params.data?.finalPaymentMethod ||
        ''
    ).trim();

    const newValue = String(method || '').trim();

    if (oldValue === newValue) return;

    rowNode.data.finalPaymentMethod = newValue;

    params.api.refreshCells({
      rowNodes: [params.node],
      columns: [
        'finalPaymentMethod',
        'paymentStatusCashPayNow',
        'paymentStatusSkillsFuture',
      ],
      force: true,
    });

    const component = params.context?.componentInstance;

    if (
      component &&
      typeof component.onCellValueChanged === 'function'
    ) {
      try {
        await component.onCellValueChanged({
          api: params.api,
          node: params.node,
          data: rowNode.data,
          colDef: params.colDef,
          field: 'finalPaymentMethod',
          value: newValue,
          newValue,
          oldValue,
          rowIndex: params.rowIndex,
          source: 'finalPaymentMethodRenderer',
        });
      } catch (error) {
        console.error(
          'Final payment method update failed:',
          error
        );
      }
    }
  };

  const hasPaymentDate = !!(
    params.data?.paymentDate &&
    String(params.data.paymentDate).trim() !== ''
  );

  const hasPaymentTime = !!(
    params.data?.paymentTime &&
    String(params.data.paymentTime).trim() !== ''
  );

  const hasRefundedDate = !!(
    params.data?.refundedDate &&
    String(params.data.refundedDate).trim() !== ''
  );

  const hasRefundedTime = !!(
    params.data?.refundedTime &&
    String(params.data.refundedTime).trim() !== ''
  );

  const isLockedByPaymentData =
    hasPaymentDate ||
    hasPaymentTime ||
    hasRefundedDate ||
    hasRefundedTime;

  const isCurrentMethodSkillsFuture =
    currentMethod === 'SkillsFuture';

  const shouldDisableSkillsFuture =
    isCurrentMethodSkillsFuture && !isAdminOrSubAdmin;

  // ✅ PER-METHOD DISABLE LOGIC (FIX APPLIED HERE)
  const isDisabledForMethod = (method) => {
    if (isLockedByPaymentData) return true;

    if (isNsaCourse && isRestrictedRole) return true;

    if (
      method === 'SkillsFuture' &&
      isCurrentMethodSkillsFuture &&
      !isAdminOrSubAdmin
    ) {
      return true;
    }

    return false;
  };

  return (
    <div className="payment-method-group">
      {finalPaymentOptions.map((method) => {
        const isDisabled = isDisabledForMethod(method);

        return (
          <button
            key={method}
            type="button"
            className={`payment-method-btn payment-method-btn--${method
              .toLowerCase()
              .replace(/\s+/g, '-')}${
              method === currentMethod ? ' active' : ''
            }`}
            style={
              isNsaInChargeStyling
                ? {
                    border: '3px solid #766006',
                    color: '#766006',
                    backgroundColor:
                      method === currentMethod
                        ? '#fff'
                        : 'transparent',
                  }
                : {}
            }
            disabled={isDisabled}
            onClick={
              isDisabled
                ? undefined
                : (event) => handleClick(event, method)
            }
          >
            {method}
          </button>
        );
      })}
    </div>
  );
};

export default FinalPaymentMethodRenderer;