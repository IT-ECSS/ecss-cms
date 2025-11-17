import React, { useState, useEffect } from 'react';

const ProductModalFooter = ({ product, cartQuantity = 0, onAddToCart, onUpdateCartQuantity, onClose, selectedLanguage = 'english' }) => {
  const [displayQuantity, setDisplayQuantity] = useState(1); // Display quantity (separate from cart quantity)
  const [inputValue, setInputValue] = useState();

  const getButtonTranslation = (cartQuantity, quantityToUse) => {
    const translations = {
      updateCart: {
        english: 'UPDATE CART',
        chinese: '更新购物车',
        malay: 'KEMAS KINI TROLI'
      },
      addToCart: {
        english: 'ADD TO CART',
        chinese: '添加到购物车',
        malay: 'TAMBAH KE TROLI'
      },
      selectQuantity: {
        english: 'SELECT QUANTITY',
        chinese: '选择数量',
        malay: 'PILIH KUANTITI'
      }
    };

    let key;
    if (cartQuantity > 0) {
      key = 'updateCart';
    } else if (quantityToUse === 0) {
      key = 'selectQuantity';
    } else {
      key = 'addToCart';
    }

    return translations[key][selectedLanguage] || translations[key]['english'];
  };

  // Set initial display quantity based on cart quantity or default to 1
  useEffect(() => {
    setDisplayQuantity(cartQuantity > 0 ? cartQuantity : 1);
  }, [cartQuantity]);

  const handleQuantityChange = (delta) => {
    // Only update display quantity, not the cart
    const newQuantity = Math.max(0, displayQuantity + delta);
    setDisplayQuantity(newQuantity);
    setInputValue(undefined); // Clear input value when using buttons
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // Only update the input value, don't change displayQuantity or cart
    setInputValue(value);
  };

  const handleInputBlur = (e) => {
    // Do nothing when leaving the textbox - preserve whatever value is typed
    // The input value will remain exactly as the user typed it
  };

  const handleInputKeyDown = (e) => {
    // Handle Enter key to confirm input
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleAddToCart = () => {
    // Use inputValue if it exists and is valid, otherwise use displayQuantity
    let quantityToUse = displayQuantity;
    if (inputValue !== undefined && inputValue !== '') {
      const numericValue = parseInt(inputValue, 10);
      if (!isNaN(numericValue) && numericValue >= 0) {
        quantityToUse = numericValue;
      }
    }

    if (cartQuantity > 0) {
      // If item is already in cart, update it with the selected quantity
      if (typeof onUpdateCartQuantity === 'function') {
        onUpdateCartQuantity(product.id, quantityToUse);
      }
    } else {
      // If item is not in cart, add it with the selected quantity
      if (quantityToUse > 0) {
        const cartItem = {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: quantityToUse,
          image: product.images && product.images[0] ? product.images[0].src : '/placeholder-image.jpg'
        };
        onAddToCart(cartItem);
      }
    }
    
    // Close the modal after cart action
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleCartQuantityChange = (delta) => {
    // This method is no longer needed since we don't update cart directly from controls
    console.warn('handleCartQuantityChange is deprecated in the new flow');
  };

  // Calculate the quantity that will be used when button is clicked
  let quantityToUse = displayQuantity;
  if (inputValue !== undefined && inputValue !== '') {
    const numericValue = parseInt(inputValue, 10);
    if (!isNaN(numericValue) && numericValue >= 0) {
      quantityToUse = numericValue;
    }
  }

  return (
    <div className="modal-footer1">
      <div className="footer-content">
        {/* Single row with one quantity control and Add to Cart button */}
        <div className="modal-footer-row">
          <div className="quantity-selector-rounded">
            <button 
              className="quantity-btn1"
              onClick={() => handleQuantityChange(-1)}
              disabled={displayQuantity <= 0}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input 
              type="text"
              className="quantity-input1"
              value={inputValue !== undefined ? inputValue : displayQuantity}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
            />
            <button 
              className="quantity-btn1"
              onClick={() => handleQuantityChange(1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button className="btn-add-to-cart-rounded" onClick={handleAddToCart}>
            {getButtonTranslation(cartQuantity, quantityToUse)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModalFooter;