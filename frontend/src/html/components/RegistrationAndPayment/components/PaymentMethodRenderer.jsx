import React from 'react';

/**
 * AG-Grid cell renderer for the "Payment Method" column.
 * Renders a row of clickable buttons for each valid payment method.
 *
 * Props (AG-Grid params object):
 *   params.value             – currently selected payment method string
 *   params.data.courseInfo   – course info object ({ courseType, coursePrice, … })
 *   params.data.course       – course English name string
 *   params.data.location     – course location string
 *
 * The component derives the available payment methods from courseType /
 * coursePrice / location — matching the original business rules exactly.
 *
 * On click it calls setDataValue so AG-Grid fires onCellValueChanged on
 * the parent.
 */
const PaymentMethodRenderer = (params) => {
  const currentMethod = params.value;
  const { courseInfo, course: courseName, location } = params.data;
  const type = courseInfo?.courseType;
  // Check if NSA in-charge styling should be applied through context
  const isNsaInChargeStyling = params.context?.shouldApplyNsaInChargeStyling ? params.context.shouldApplyNsaInChargeStyling() : false;

  const coursePrice = parseFloat((courseInfo?.coursePrice || '0').replace(/[^0-9.]/g, ''));

  let paymentMethods = [];

  if (type === 'NSA') {
    const isPRWW = location === 'Pasir Ris West Wellness Centre';
    const sfBlocked =
      courseName === 'Community Ukulele – Mandarin' ||
      courseName === 'My Story – Mandarin';

    if (sfBlocked) {
      paymentMethods = isPRWW ? ['PayNow'] : ['Cash', 'PayNow'];
    } else {
      paymentMethods = isPRWW
        ? ['PayNow', 'SkillsFuture']
        : ['Cash', 'PayNow', 'SkillsFuture'];
    }
  } else if (type === 'Marriage Preparation Programme') {
    paymentMethods = ['Cash', 'PayNow'];
  } else if (type === 'Talks And Seminar') {
    paymentMethods = coursePrice > 0 ? ['Cash', 'PayNow'] : [];
  }
  // ILP / Others / unknown → no payment method buttons

  // Get component instance and user role from context
  const component = params.context?.componentInstance;
  const role = String(component?.props?.role || '').toLowerCase();

  // Check if user is Finance role (restricted from editing Payment Method)
  const isFinanceRole = role.includes('finance');

  // Determine if buttons should be disabled
  // Disable if: Finance role OR payment/refund date/time fields exist
  const hasPaymentDate = !!(params.data?.paymentDate && String(params.data.paymentDate).trim() !== '');
  const hasPaymentTime = !!(params.data?.paymentTime && String(params.data.paymentTime).trim() !== '');
  const hasRefundedDate = !!(params.data?.refundedDate && String(params.data.refundedDate).trim() !== '');
  const hasRefundedTime = !!(params.data?.refundedTime && String(params.data.refundedTime).trim() !== '');
  
  const buttonDisabled = isFinanceRole || hasPaymentDate || hasPaymentTime || hasRefundedDate || hasRefundedTime;

  const handleClick = (event, method) => {
    event.stopPropagation();
    if (buttonDisabled) return;
    params.api.getRowNode(params.node.id).setDataValue('paymentMethod', method);
  };

  if (paymentMethods.length === 0) {
    return (
      <div className="payment-method-group">
        <span>{currentMethod || params.data?.paymentMethod || '-'}</span>
      </div>
    );
  }

  return (
    <div className="payment-method-group">
      {paymentMethods.map((method) => (
        <button
          key={method}
          type="button"
          className={`payment-method-btn payment-method-btn--${method
            .toLowerCase()
            .replace(/\s+/g, '-')} ${method === currentMethod ? 'active' : ''}${buttonDisabled ? ' disabled' : ''}`}
          style={
            isNsaInChargeStyling
              ? {
                  border: '2px solid #000080',
                  color: '#000080',
                  backgroundColor: method === currentMethod ? '#fff' : 'transparent',
                  cursor: buttonDisabled ? 'not-allowed' : 'pointer',
                  pointerEvents: buttonDisabled ? 'none' : 'auto',
                }
              : {
                  cursor: buttonDisabled ? 'not-allowed' : 'pointer',
                  pointerEvents: buttonDisabled ? 'none' : 'auto',
                }
          }
          onClick={(event) => handleClick(event, method)}
        >
          {method}
        </button>
      ))}
    </div>
  );
};

export default PaymentMethodRenderer;
