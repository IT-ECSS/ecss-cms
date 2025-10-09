import React from 'react';

const ProductInfoSection = ({ product }) => {
  return (
    <div className="modal-right">
      <div className="product-info-content">
        {/* Header - Product Name and Price */}
        <div className="product-info-header">
          <h1 className="product-title" dangerouslySetInnerHTML={{ __html: product.name }}></h1>
          <div className="product-price">
            <span className="price-currency">$</span>
            <span className="price-amount">{parseFloat(product.price).toFixed(2)}</span>
          </div>
        </div>
        
        {/* Body - Description */}
        <div className="product-info-body">
          <div 
            className="description-content"
            dangerouslySetInnerHTML={{ 
              __html: product.short_description || product.description || 'No description available.' 
            }}
          ></div>
        </div>
        
        {/* Footer - Categories */}
        <div className="product-info-footer">
          {product.categories && product.categories.length > 0 && (
            <div className="categories-text">
              <span className="categories-label">Categories: </span>
              <span className="categories-list">
                {product.categories.map((category, index) => (
                  <span key={index}>
                    {category.name}
                    {index < product.categories.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductInfoSection;