import React from 'react';
import ProductImageSection from './ProductImageSection';
import ProductInfoSection from './ProductInfoSection';
import ProductModalFooter from './ProductModalFooter';

const ProductDetailsModal = ({ isOpen, product, cartItems = [], onClose, onAddToCart, onUpdateCartQuantity, selectedLanguage = 'english' }) => {
  if (!isOpen || !product) return null;

  // Find cart item for this product
  const cartItem = cartItems ? cartItems.find(item => item.id === product.id) : null;
  const cartQuantity = cartItem ? cartItem.quantity : 0;

  const getStockTranslation = () => {
    const translations = {
      outOfStock: {
        english: 'Out of Stock',
        chinese: '缺货',
        malay: 'Kehabisan Stok'
      },
      inStock: {
        english: 'In Stock',
        chinese: '有库存',
        malay: 'Ada Stok'
      },
      nonHalalNotice: {
        english: 'Please note that the product is non-halal.',
        chinese: '请注意此产品不是halal。',
        malay: 'Sila ambil perhatian bahawa produk ini bukan halal.'
      }
    };
    
    const key = product.stock_quantity === 0 ? 'outOfStock' : 'inStock';
    return translations[key][selectedLanguage] || translations[key]['english'];
  };

  const getHalalNoticeTranslation = () => {
    const translations = {
      nonHalalNotice: {
        english: 'Please note that the product is non-halal.',
        chinese: '请注意此产品不是halal。',
        malay: 'Sila ambil perhatian bahawa produk ini bukan halal.'
      }
    };
    return translations['nonHalalNotice'][selectedLanguage] || translations['nonHalalNotice']['english'];
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Check if product name contains "Panettone"
  const isPanettoneProduct = product && product.name && product.name.toLowerCase().includes('panettone');

  return (
    <div 
      className="modal-overlay" 
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header1">
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        
        {/* Body - Two Sections */}
        <div className="modal-body">
          {/* Left Section - Image */}
          <ProductImageSection product={product} />
          
          {/* Right Section - Product Info */}
          <ProductInfoSection product={product} />
        </div>
        
        {/* Stock Status Section */}
        <div className="modal-stock-section">
          <div className="modal-stock-info">
            {
              <span className={`modal-stock-status ${product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
                {getStockTranslation()}
              </span>
            }
          </div>
          
          {/* Halal Notice for Panettone products */}
          {isPanettoneProduct && (
            <div className="modal-halal-notice">
              <span className="modal-halal-notice-text">
                {getHalalNoticeTranslation()}
              </span>
            </div>
          )}
        </div>
        
        {/* Footer - Add to Cart and Quantity */}
        {product.stock_quantity !== 0 && (
          <ProductModalFooter 
            product={product} 
            cartQuantity={cartQuantity}
            onAddToCart={onAddToCart}
            onUpdateCartQuantity={onUpdateCartQuantity}
            onClose={onClose}
            selectedLanguage={selectedLanguage}
          />
        )}
      </div>
    </div>
  );
};

export default ProductDetailsModal;