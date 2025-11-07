import React, { Component } from 'react';

class PaymentMethodSection extends Component {
  getTranslation = (key) => {
    const { selectedLanguage = 'english' } = this.props;
    const translations = {
      paymentMethod: {
        english: 'Payment Method',
        chinese: '付款方式',
        malay: 'Cara Bayaran'
      }
    };
    return translations[key][selectedLanguage] || translations[key]['english'];
  };

  render() {
    const { paymentMethod, expandedSections, fieldErrors = {}, onPaymentMethodChange, onToggleSection } = this.props;

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.paymentMethod ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('paymentMethod')}
        >
          <h2 className="section-title">{this.getTranslation('paymentMethod')}</h2>
          <span className="section-toggle-icon">
            {expandedSections.paymentMethod ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.paymentMethod ? 'expanded' : 'collapsed'}`}>
          <div className="payment-method-form">
            <div className="form-group">
              <div className="payment-method-buttons1">
                <button
                  type="button"
                  className={`payment-method-button1 ${paymentMethod === 'Cash' ? 'selected' : ''}`}
                  onClick={() => onPaymentMethodChange('Cash')}
                >
                  Cash
                </button>
                
                <button
                  type="button"
                  className={`payment-method-button1 ${paymentMethod === 'PayNow' ? 'selected' : ''}`}
                  onClick={() => onPaymentMethodChange('PayNow')}
                >
                  PayNow
                </button>
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