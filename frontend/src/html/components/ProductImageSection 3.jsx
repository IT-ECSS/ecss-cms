import React, { useState } from 'react';

const ProductImageSection = ({ product }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = product.images || [];
  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) {
    return (
      <div className="modal-left">
        <div className="modal-image-container">
          <div className="modal-image-placeholder">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>No image available</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-left">
      <div className="modal-image-container">
        <img 
          src={images[currentImageIndex]?.src || '/placeholder-image.jpg'} 
          alt={images[currentImageIndex]?.alt || product.name}
          className="modal-image"
          onError={(e) => {
            e.target.src = '/placeholder-image.jpg';
          }}
        />
        
        {hasMultipleImages && (
          <>
            <button className="image-nav image-nav-prev" onClick={prevImage}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="image-nav image-nav-next" onClick={nextImage}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="image-indicators">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`image-indicator ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductImageSection;