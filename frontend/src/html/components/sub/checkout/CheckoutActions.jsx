import React, { Component } from 'react';

class CheckoutActions extends Component {
  
  // Function to get translated button text
  getButtonTranslations = () => {
    const { selectedLanguage = 'english' } = this.props;
    
    const translations = {
      clearForm: {
        english: 'Clear Form',
        chinese: '清除表单',
        malay: 'Kosongkan Borang'
      },
      placeOrder: {
        english: 'Place Order',
        chinese: '下订单',
        malay: 'Buat Pesanan'
      }
    };

    return {
      clearForm: translations.clearForm[selectedLanguage] || translations.clearForm['english'],
      placeOrder: translations.placeOrder[selectedLanguage] || translations.placeOrder['english']
    };
  }

  render() {
    const { cartItems, onClearForm, onGoBack, onPlaceOrder, showTopOnly = false } = this.props;
    const buttonTranslations = this.getButtonTranslations();

    // If showTopOnly is true, only show the back button
    if (showTopOnly) {
      return (
        <div className="checkout-top-actions">
          <button 
            className="back-btn"
            onClick={onGoBack}
          >
          </button>
        </div>
      );
    }

    return (
      <div className="checkout-actions">
        {/* Action buttons at the bottom */}
        {cartItems.length > 0 && (
          <div className="action-buttons-container">
            <button 
              className="clear-form-btn"
              onClick={onClearForm}
            >
              {buttonTranslations.clearForm}
            </button>
            
            <button 
              className="place-order-btn"
              onClick={onPlaceOrder}
            >
              {buttonTranslations.placeOrder}
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default CheckoutActions;