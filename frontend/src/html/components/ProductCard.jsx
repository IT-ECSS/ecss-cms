import React, { useState } from 'react';

const ProductCard = ({ product, cartQuantity = 0, onAddToCart, onMoreDetails, onUpdateCartQuantity }) => {
  const [inputValue, setInputValue] = useState();

  const handleAddToCart = () => {
    if (typeof onAddToCart !== 'function') {
      console.error('onAddToCart is not a function');
      return;
    }

    // Get the intended quantity from input or use 1 for new items
    const intendedQuantity = inputValue !== undefined ? parseInt(inputValue) || 0 : (cartQuantity > 0 ? cartQuantity : 1);

    if (cartQuantity > 0) {
      // If item is already in cart, update it with the input quantity
      if (typeof onUpdateCartQuantity === 'function') {
        onUpdateCartQuantity(product.id, intendedQuantity);
        // Clear the input value after updating
        setInputValue(undefined);
      }
    } else {
      // If item is not in cart, add it
      const finalQuantity = intendedQuantity > 0 ? intendedQuantity : 1;
      const cartItem = {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: finalQuantity,
        image: product.images && product.images[0] ? product.images[0].src : '/placeholder-image.jpg'
      };
      onAddToCart(cartItem);
      // Clear the input value after adding
      setInputValue(undefined);
    }
  };

  const handleQuantityChange = (delta) => {
    if (typeof onUpdateCartQuantity === 'function') {
      const newQuantity = cartQuantity + delta;
      onUpdateCartQuantity(product.id, newQuantity);
    } else {
      console.error('onUpdateCartQuantity is not a function');
    }
  };

  const handleMoreDetails = () => {
    if (typeof onMoreDetails === 'function') {
      onMoreDetails(product);
    } else {
      console.log('More details for:', product.name);
    }
  };

  return (
    <div className="product-card">
      {/* Section 1: Image */}
      <div className="product-image-section">
        <img 
          src={product.images && product.images[0] ? product.images[0].src : '/placeholder-image.jpg'} 
          alt={product.images && product.images[0] ? product.images[0].alt : product.name}
          onError={(e) => {
            e.target.src = '/placeholder-image.jpg';
          }}
        />
      </div>
      
      {/* Section 2: Content */}
      <div className="product-content-section">
        {/* Header: Product Name and Price */}
        <div className="product-header">
          <h3 
            className="product-name" 
            dangerouslySetInnerHTML={{ __html: product.name }}
          ></h3>
          <div className="product-price">
            ${parseFloat(product.price).toFixed(2)}
          </div>
        </div>
        
        {/* Body: Quantity Controls (when item is in cart) */}
        <div className="product-body">
          {cartQuantity > 0 && (
            <div className="product-quantity-section">
              <div className="quantity-controls">
                <button 
                  className="quantity-btn minus"
                  onClick={() => handleQuantityChange(-1)}
                >
                  -
                </button>
                <input 
                  type="text"
                  className="quantity-input"
                  value={inputValue !== undefined ? inputValue : cartQuantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    
                    // Only update the display value, don't update cart immediately
                    setInputValue(value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    // When user leaves the field, if it's empty or invalid, restore the original quantity
                    if (value === '' || parseInt(value) < 0 || isNaN(parseInt(value))) {
                      setInputValue(cartQuantity);
                    }
                    // Note: Cart quantity only updates when button is clicked
                  }}
                  onKeyDown={(e) => {
                    // Handle Enter key to confirm input
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                />
                <button 
                  className="quantity-btn plus"
                  onClick={() => handleQuantityChange(1)}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer: Buttons */}
        <div className="product-footer">
          <button 
            className="more-details-btn"
            onClick={handleMoreDetails}
          >
            More Details
          </button>
          
          <button 
            className="add-to-cart-btn-small"
            onClick={handleAddToCart}
          >
            {cartQuantity > 0 ? `Update Cart` : 'Add To Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;