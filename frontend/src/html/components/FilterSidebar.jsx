import React, { useState, useEffect } from 'react';

const FilterSidebar = ({ onPriceFilter, searchTerm, onSearchChange, products = [] }) => {
  // Calculate dynamic max price from products
  const maxProductPrice = products.length > 0 
    ? Math.max(...products.map(product => parseFloat(product.price || 0)))
    : 200;
  
  const dynamicMaxPrice = Math.ceil(maxProductPrice); // Round up to nearest whole number
  
  const [priceRange, setPriceRange] = useState({ min: 0, max: dynamicMaxPrice });
  const [displayValues, setDisplayValues] = useState({ min: '0', max: dynamicMaxPrice.toString() });

  // Update max price when products change
  useEffect(() => {
    if (products.length > 0) {
      const newMaxPrice = Math.ceil(Math.max(...products.map(product => parseFloat(product.price || 0))));
      setPriceRange(prev => ({ 
        ...prev, 
        max: Math.max(prev.max, newMaxPrice) // Don't reduce if user has set a lower max
      }));
      setDisplayValues(prev => ({
        ...prev,
        max: Math.max(prev.max, newMaxPrice).toString()
      }));
    }
  }, [products]);

  // Auto-filter when price range changes
  useEffect(() => {
    onPriceFilter(priceRange);
  }, [priceRange, onPriceFilter]);

  const handleMinPriceChange = (e) => {
    const newMin = parseInt(e.target.value);
    if (newMin <= priceRange.max && newMin >= 0) {
      setPriceRange(prev => ({ ...prev, min: newMin }));
    }
  };

  const handleMaxPriceChange = (e) => {
    const newMax = parseInt(e.target.value);
    if (newMax >= priceRange.min) {
      setPriceRange(prev => ({ ...prev, max: newMax }));
    }
  };

  const handleMinInputChange = (e) => {
    const value = e.target.value;
    setDisplayValues(prev => ({ ...prev, min: value }));
    
    // Handle empty string (when user clears input)
    if (value === '') {
      setPriceRange(prev => ({ ...prev, min: 0 }));
      console.log('Min input cleared - Filter set to 0');
      return;
    }
    
    // Parse number from text input (handles text input)
    const newMin = parseFloat(value);
    if (!isNaN(newMin) && newMin <= priceRange.max && newMin >= 0) {
      setPriceRange(prev => ({ ...prev, min: newMin }));
      console.log('Min input changed - Value:', newMin);
    }
    // If it's not a valid number, we don't update the filter but allow the text to be typed
  };

  const handleMaxInputChange = (e) => {
    const value = e.target.value;
    setDisplayValues(prev => ({ ...prev, max: value }));
    
    // Handle empty string (when user clears input)
    if (value === '') {
      setPriceRange(prev => ({ ...prev, max: dynamicMaxPrice }));
      console.log('Max input cleared - Filter set to', dynamicMaxPrice);
      return;
    }
    
    // Parse number from text input (handles text input)
    const newMax = parseFloat(value);
    if (!isNaN(newMax) && newMax >= priceRange.min) {
      setPriceRange(prev => ({ ...prev, max: newMax }));
      console.log('Max input changed - Value:', newMax);
    }
    // If it's not a valid number, we don't update the state but allow the text to be typed
  };

  return (
    <div className="sidebar1">
      {/* Search Filter */}
      <div className="filter-section">
        <h3 className="filter-title">SEARCH</h3>
        <div className="search-input-container">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={onSearchChange}
            className="sidebar-search-input"
          />
        </div>
      </div>

      {/* Price Filter */}
      <div className="filter-section">
        <h3 className="filter-title">PRICE</h3>
        <div className="price-range">
          <div className="price-slider-container">
            <div className="slider-track"></div>
            <div 
              className="slider-range" 
              style={{
                left: `${(priceRange.min / Math.max(dynamicMaxPrice, priceRange.max)) * 100}%`,
                width: `${((Math.min(priceRange.max, dynamicMaxPrice) - priceRange.min) / Math.max(dynamicMaxPrice, priceRange.max)) * 100}%`
              }}
            ></div>
          </div>
          
          {/* Text input controls */}
          <div className="price-input-controls">
            <div className="price-input-group">
              <input
                id="min-price-input"
                type="text"
                value={displayValues.min}
                onChange={handleMinInputChange}
                className="price-text-input"
              />
            </div>
            <div className="price-separator">-</div>
            <div className="price-input-group">
              <input
                id="max-price-input"
                type="text"
                value={displayValues.max}
                onChange={handleMaxInputChange}
                className="price-text-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;