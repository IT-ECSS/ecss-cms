import React, { useState, useEffect, useRef } from 'react';
import CartPopup from './CartPopup';

const Header = ({ cartItems = [], onRemoveFromCart, onUpdateCartQuantity, onProceedToCheckout, activeTab, onTabChange }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartRef = useRef(null);

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  // Handle click outside to close cart
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        closeCart();
      }
    };

    if (isCartOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCartOpen]);

  const getTotalItems = () => {
    return cartItems.length;
  };

  return (
    <header className="page-header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            {/* Tab Navigation */}
            {activeTab && onTabChange && (
              <div className="tab-navigation">
                <button 
                  className="tab-button1"
                  onClick={() => onTabChange('products')}
                >
                  Product Catalogue
                </button>
                <button 
                  className="tab-button1"
                  onClick={() => onTabChange('orders')}
                >
                  Check Orders
                </button>
              </div>
            )}
          </div>
          <div className="header-right">
            <div className="cart-container" ref={cartRef}>
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
                onProceedToCheckout={onProceedToCheckout}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;