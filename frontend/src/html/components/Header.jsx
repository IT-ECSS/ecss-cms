import React, { useState } from 'react';
import CartPopup from './CartPopup';

const Header = ({ cartItems = [], onRemoveFromCart, onUpdateCartQuantity }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const getTotalItems = () => {
    return cartItems.length;
  };
  return (
    <header className="page-header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
          </div>
          <div className="header-right">
            <div className="cart-icon" onClick={toggleCart}>
              <i className="fa-solid fa-cart-shopping"></i>
              {getTotalItems() > 0 && (
                <span className="cart-count">{getTotalItems()}</span>
              )}
            </div>
            
            <CartPopup 
              isOpen={isCartOpen}
              cartItems={cartItems}
              onClose={closeCart}
              onRemoveItem={onRemoveFromCart}
              onUpdateQuantity={onUpdateCartQuantity}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;