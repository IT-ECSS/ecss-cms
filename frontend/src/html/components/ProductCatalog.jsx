import React from 'react';
import ProductCard from './ProductCard';

const ProductCatalog = ({ products, cartItems = [], onAddToCart, onMoreDetails, onUpdateCartQuantity, selectedLanguage = 'english' }) => {
  return (
    <div className="product-catalog">
      <div className="products-grid">
        {products.map((product) => {
          // Find cart item for this product
          const cartItem = cartItems.find(item => item.id === product.id);
          const cartQuantity = cartItem ? cartItem.quantity : 0;
          
          return (
            <ProductCard 
              key={product.id} 
              product={product} 
              cartQuantity={cartQuantity}
              onAddToCart={onAddToCart}
              onMoreDetails={onMoreDetails}
              onUpdateCartQuantity={onUpdateCartQuantity}
              selectedLanguage={selectedLanguage}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProductCatalog;