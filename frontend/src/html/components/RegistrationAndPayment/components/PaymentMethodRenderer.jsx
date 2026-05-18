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

  const colDefEditable = params.colDef?.editable ?? params.column?.getColDef?.()?.editable;
  const isEditable = colDefEditable !== false;
  const buttonDisabled = !isEditable;

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
            .replace(/\s+/g, '-')} ${method === currentMethod ? 'active' : ''}`}
          onClick={(event) => handleClick(event, method)}
        >
          {method}
        </button>
      ))}
    </div>
  );
};

export default PaymentMethodRenderer;
