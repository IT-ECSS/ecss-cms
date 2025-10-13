import React, { Component } from 'react';

class CheckoutActions extends Component {
  render() {
    const { cartItems, onClearForm, onGoBack, onPlaceOrder, showTopOnly = false } = this.props;

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
              Clear Form
            </button>
            
            <button 
              className="place-order-btn"
              onClick={onPlaceOrder}
            >
              Place Order
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default CheckoutActions;