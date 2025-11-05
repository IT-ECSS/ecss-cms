import React, { useState } from 'react';

const CartPopup = ({ isOpen, cartItems, onClose, onRemoveItem, onUpdateQuantity, onProceedToCheckout }) => {
  const [inputValues, setInputValues] = useState({});

  if (!isOpen) return null;

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * (item.quantity || 0)), 0).toFixed(2);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  return (
    <div className="cart-popup-container">
      <div className="cart-header">
        <h3>Shopping Cart ({getTotalItems()} items)</h3>
        <button className="close-cart" onClick={onClose}>×</button>
      </div>
        
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty</p>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div key={index} className="cart-item1">
                <div className="item-image">
                  <img 
                    src={item.image || '/placeholder-image.jpg'} 
                    alt={item.name}
                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                  />
                </div>
                <div className="item-details1">
                  <div className="item-name-container1">
                    <div className="item-name1" dangerouslySetInnerHTML={{ __html: item.name }}></div>
                    <i 
                      className="fa-solid fa-trash-can cart-trash-icon"
                      onClick={() => onRemoveItem(index)}
                      title="Remove item"
                    ></i>
                  </div>
                  <div className="item-price1">${item.price}</div>
                </div>
                <div className="item-quantity">
                  <button 
                    className="quantity-btn"
                    onClick={() => {
                      const currentQuantity = item.quantity || 0;
                      if (currentQuantity <= 1) {
                        onRemoveItem(index);
                      } else {
                        onUpdateQuantity(index, currentQuantity - 1);
                      }
                    }}
                  >
                    -
                  </button>
                  <input 
                    type="text"
                    className="quantity-input"
                    value={inputValues[index] !== undefined ? inputValues[index] : item.quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      
                      // Update the display value immediately
                      setInputValues(prev => ({
                        ...prev,
                        [index]: value
                      }));
                      
                      // If empty, don't update the actual quantity yet
                      if (value === '') {
                        return;
                      }
                      
                      // Only allow positive integers and zero
                      const numericValue = value.replace(/[^0-9]/g, '');
                      if (numericValue === '') {
                        return;
                      }
                      
                      const newQuantity = parseInt(numericValue, 10);
                      
                      // Check if parsing was successful and number is valid
                      if (isNaN(newQuantity) || newQuantity < 0) {
                        return;
                      }
                      
                      // Update the actual quantity (including 0)
                      onUpdateQuantity(index, newQuantity);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      // When user leaves the field, if it's empty or invalid, restore the original quantity
                      if (value === '' || parseInt(value) < 0 || isNaN(parseInt(value))) {
                        setInputValues(prev => ({
                          ...prev,
                          [index]: item.quantity
                        }));
                      }
                      // Note: Removed the auto-removal of items when quantity is 0
                      // Users can manually remove items using the trash icon
                    }}
                    onKeyDown={(e) => {
                      // Handle Enter key to confirm input
                      if (e.key === 'Enter') {
                        e.target.blur();
                      }
                    }}
                  />
                  <button 
                    className="quantity-btn"
                    onClick={() => onUpdateQuantity(index, (item.quantity || 0) + 1)}
                  >
                    +
                  </button>
                </div>
                <div className="item-total1">
                  ${(item.price * (item.quantity || 0)).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <strong>Total: ${calculateTotal()}</strong>
            </div>
            <button 
              className="checkout-btn"
              onClick={onProceedToCheckout}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
    </div>
  );
};

export default CartPopup;