import React, { Component } from 'react';

class OrderSummarySection extends Component {
  handleQuantityChange = (index, newQuantity) => {
    const { onUpdateQuantity, onRemoveItem } = this.props;
    
    console.log('handleQuantityChange called:', { index, newQuantity, hasOnUpdateQuantity: !!onUpdateQuantity });
    
    if (newQuantity < 1) {
      // Remove item if quantity goes below 1
      if (onRemoveItem) {
        onRemoveItem(index);
      }
    } else if (onUpdateQuantity) {
      onUpdateQuantity(index, newQuantity);
    }
  }

  handleDirectQuantityChange = (index, event) => {
    const newQuantity = parseInt(event.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      this.handleQuantityChange(index, newQuantity);
    }
  }

  handleRemoveItem = (index) => {
    const { onRemoveItem } = this.props;
    if (onRemoveItem) {
      onRemoveItem(index);
    }
  }

  render() {
    const { cartItems, expandedSections, onToggleSection, calculateTotal, getTotalItems } = this.props;

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.orderSummary ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('orderSummary')}
        >
          <h2 className="section-title">Order Summary ({getTotalItems()} items)</h2>
          <span className="section-toggle-icon">
            {expandedSections.orderSummary ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.orderSummary ? 'expanded' : 'collapsed'}`}>
          <div className="order-summary-container">
            <div className="cart-items-list scrollable">
              {cartItems.length === 0 ? (
                <div className="empty-cart-message">
                  <p>No items in cart</p>
                </div>
              ) : (
                cartItems.map((item, index) => (
                  <div key={index} className="checkout-cart-item">
                    <div className="item-image">
                      <img 
                        src={item.image || '/placeholder-image.jpg'} 
                        alt={item.name}
                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                      />
                    </div>
                    <div className="item-details">
                      <div className="item-name" dangerouslySetInnerHTML={{ __html: item.name }}></div>
                      <div className="item-price">${item.price}</div>
                    </div>
                    <div className="item-quantity-controls">
                      <button 
                        className="quantity-btn decrease"
                        onClick={() => this.handleQuantityChange(index, item.quantity - 1)}
                      >
                        -
                      </button>
                      <input
                        type="text"
                        className="quantity-input"
                        value={item.quantity}
                        onChange={(e) => this.handleDirectQuantityChange(index, e)}
                        onBlur={(e) => {
                          // Ensure minimum value of 1
                          if (parseInt(e.target.value, 10) < 1) {
                            e.target.value = 1;
                            this.handleQuantityChange(index, 1);
                          }
                        }}
                      />
                      <button 
                        className="quantity-btn increase"
                        onClick={() => this.handleQuantityChange(index, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="item-total">
                      ${(item.price * (item.quantity || 0)).toFixed(2)}
                    </div>
                    <button 
                      className="remove-item-btn"
                      onClick={() => this.handleRemoveItem(index)}
                      title="Remove item"
                    >
                      <i className="fa-solid fa-trash-can cart-trash-icon"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {cartItems.length > 0 && (
              <div className="order-total sticky">
                <div className="total-row">
                  <span className="total-label">Subtotal:</span>
                  <span className="total-amount">${calculateTotal()}</span>
                </div>
                <div className="total-row">
                  <span className="total-label">Shipping:</span>
                  <span className="total-amount">Free</span>
                </div>
                <div className="total-row final-total">
                  <span className="total-label">Total:</span>
                  <span className="total-amount">${calculateTotal()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default OrderSummarySection;