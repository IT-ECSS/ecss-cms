import React, { Component } from 'react';

class PaymentMethodSection extends Component {
  render() {
    const { paymentMethod, expandedSections, fieldErrors = {}, onPaymentMethodChange, onToggleSection } = this.props;

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.paymentMethod ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('paymentMethod')}
        >
          <h2 className="section-title">Payment Method</h2>
          <span className="section-toggle-icon">
            {expandedSections.paymentMethod ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.paymentMethod ? 'expanded' : 'collapsed'}`}>
          <div className="payment-method-form">
            <div className="form-group">
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash"
                    checked={paymentMethod === 'Cash'}
                    onChange={(e) => onPaymentMethodChange(e.target.value)}
                  />
                  <span className="radio-label">Cash</span>
                </label>
                
                <label className="radio-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paynow"
                    checked={paymentMethod === 'paynow'}
                    onChange={(e) => onPaymentMethodChange(e.target.value)}
                  />
                  <span className="radio-label">PayNow</span>
                </label>
              </div>
              {fieldErrors.paymentMethod && <div className="field-error-message">{fieldErrors.paymentMethod}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PaymentMethodSection;