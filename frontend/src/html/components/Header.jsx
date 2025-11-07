import React, { useState, useEffect, useRef } from 'react';
import CartPopup from './CartPopup';
import LanguagePopup from './LanguagePopup';

const Header = ({ cartItems = [], onRemoveFromCart, onUpdateCartQuantity, onProceedToCheckout, activeTab, onTabChange, selectedLanguage = 'english', onLanguageChange }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const cartRef = useRef(null);
  const languageRef = useRef(null);

  const getTabText = (tab) => {
    const translations = {
      'products': {
        english: 'Product Catalogue',
        chinese: '产品目录',
        malay: 'Katalog Produk'
      },
      'orders': {
        english: 'Check Orders',
        chinese: '查看订单',
        malay: 'Semak Pesanan'
      }
    };
    return translations[tab][selectedLanguage] || translations[tab]['english'];
  };

  const getLanguageDisplay = () => {
    const languages = {
      english: { short: 'EN', full: 'English' },
      chinese: { short: '中', full: '中文' },
      malay: { short: 'MY', full: 'Bahasa Melayu' }
    };
    return languages[selectedLanguage] || languages.english;
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
    setIsLanguageDropdownOpen(false); // Close language dropdown when cart opens
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
    setIsCartOpen(false); // Close cart when language dropdown opens
  };

  const handleLanguageSelect = (language) => {
    if (onLanguageChange) {
      onLanguageChange(language);
    }
    setIsLanguageDropdownOpen(false);
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        closeCart();
      }
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setIsLanguageDropdownOpen(false);
      }
    };

    if (isCartOpen || isLanguageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCartOpen, isLanguageDropdownOpen]);

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
                  className={`tab-button1 ${activeTab === 'products' ? 'active' : ''}`}
                  onClick={() => {
                    console.log('Products tab clicked');
                    onTabChange('products');
                  }}
                >
                  {getTabText('products')}
                </button>
                <button 
                  className={`tab-button1 ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => {
                    console.log('Orders tab clicked');
                    onTabChange('orders');
                  }}
                >
                  {getTabText('orders')}
                </button>
              </div>
            )}
          </div>
          <div className="header-right1">
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
                selectedLanguage={selectedLanguage}
              />
            </div>
            
            {/* Language Selection Dropdown */}
            <div className="language-container" ref={languageRef}>
              <div className="language-selector" onClick={toggleLanguageDropdown}>
                <span className="language-text">{getLanguageDisplay().short}</span>
                <span className="language-arrow">▼</span>
              </div>
              
              <LanguagePopup 
                isOpen={isLanguageDropdownOpen}
                selectedLanguage={selectedLanguage}
                onLanguageSelect={handleLanguageSelect}
                onClose={() => setIsLanguageDropdownOpen(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;