import React, { Component } from 'react';

class FilterSidebar extends Component {
  constructor(props) {
    super(props);
    
    // Calculate dynamic max price from products
    const maxProductPrice = props.products && props.products.length > 0 
      ? Math.max(...props.products.map(product => parseFloat(product.price || 0)))
      : 200;
    
    const dynamicMaxPrice = Math.ceil(maxProductPrice); // Round up to nearest whole number
    
    this.state = {
      priceRange: { min: 0, max: dynamicMaxPrice },
      displayValues: { min: '0', max: dynamicMaxPrice.toString() },
      selectedCategories: ['All Categories'],
      dynamicMaxPrice: dynamicMaxPrice
    };
  }

  componentDidMount() {
    // Auto-filter when component mounts
    this.props.onPriceFilter(this.state.priceRange);
    if (this.props.onCategoryFilter) {
      this.props.onCategoryFilter(this.state.selectedCategories);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // Update max price when products change
    if (prevProps.products !== this.props.products && this.props.products.length > 0) {
      const newMaxPrice = Math.ceil(Math.max(...this.props.products.map(product => parseFloat(product.price || 0))));
      this.setState(prevState => ({
        priceRange: { 
          ...prevState.priceRange, 
          max: Math.max(prevState.priceRange.max, newMaxPrice) // Don't reduce if user has set a lower max
        },
        displayValues: {
          ...prevState.displayValues,
          max: Math.max(parseInt(prevState.displayValues.max), newMaxPrice).toString()
        },
        dynamicMaxPrice: newMaxPrice
      }));
    }

    // Auto-filter when price range changes
    if (JSON.stringify(prevState.priceRange) !== JSON.stringify(this.state.priceRange)) {
      this.props.onPriceFilter(this.state.priceRange);
    }

    // Auto-filter when categories change
    if (JSON.stringify(prevState.selectedCategories) !== JSON.stringify(this.state.selectedCategories)) {
      if (this.props.onCategoryFilter) {
        this.props.onCategoryFilter(this.state.selectedCategories);
      }
    }
  }

  // Extract unique categories from products (excluding "Support Us")
  getUniqueCategories = () => {
    const { products = [] } = this.props;
    const allCategories = products.flatMap(product => 
      product.categories ? product.categories.map(cat => cat.name) : []
    );
    
    // Filter out "Support Us" category and get unique categories
    const uniqueCategories = [...new Set(allCategories)].filter(cat => cat !== 'Support Us');
    return ['All Categories', ...uniqueCategories];
  };

  handleCategoryToggle = (category) => {
    if (category === 'All Categories') {
      this.setState({ selectedCategories: ['All Categories'] });
    } else {
      this.setState(prevState => {
        const filtered = prevState.selectedCategories.filter(cat => cat !== 'All Categories');
        if (filtered.includes(category)) {
          // Remove the category
          const newCategories = filtered.filter(cat => cat !== category);
          return { selectedCategories: newCategories.length === 0 ? ['All Categories'] : newCategories };
        } else {
          // Add the category
          return { selectedCategories: [...filtered, category] };
        }
      });
    }
  };

  handleMinPriceChange = (e) => {
    const newMin = parseInt(e.target.value);
    if (newMin <= this.state.priceRange.max && newMin >= 0) {
      this.setState(prevState => ({
        priceRange: { ...prevState.priceRange, min: newMin }
      }));
    }
  };

  handleMaxPriceChange = (e) => {
    const newMax = parseInt(e.target.value);
    if (newMax >= this.state.priceRange.min) {
      this.setState(prevState => ({
        priceRange: { ...prevState.priceRange, max: newMax }
      }));
    }
  };

  handleMinInputChange = (e) => {
    const value = e.target.value;
    this.setState(prevState => ({
      displayValues: { ...prevState.displayValues, min: value }
    }));
    
    // Handle empty string (when user clears input)
    if (value === '') {
      this.setState(prevState => ({
        priceRange: { ...prevState.priceRange, min: 0 }
      }));
      console.log('Min input cleared - Filter set to 0');
      return;
    }
    
    // Parse number from text input (handles text input)
    const newMin = parseFloat(value);
    if (!isNaN(newMin) && newMin <= this.state.priceRange.max && newMin >= 0) {
      this.setState(prevState => ({
        priceRange: { ...prevState.priceRange, min: newMin }
      }));
      console.log('Min input changed - Value:', newMin);
    }
    // If it's not a valid number, we don't update the filter but allow the text to be typed
  };

  handleMaxInputChange = (e) => {
    const value = e.target.value;
    this.setState(prevState => ({
      displayValues: { ...prevState.displayValues, max: value }
    }));
    
    // Handle empty string (when user clears input)
    if (value === '') {
      this.setState(prevState => ({
        priceRange: { ...prevState.priceRange, max: prevState.dynamicMaxPrice }
      }));
      console.log('Max input cleared - Filter set to', this.state.dynamicMaxPrice);
      return;
    }
    
    // Parse number from text input (handles text input)
    const newMax = parseFloat(value);
    if (!isNaN(newMax) && newMax >= this.state.priceRange.min) {
      this.setState(prevState => ({
        priceRange: { ...prevState.priceRange, max: newMax }
      }));
      console.log('Max input changed - Value:', newMax);
    }
    // If it's not a valid number, we don't update the state but allow the text to be typed
  };

  render() {
    const { searchTerm, onSearchChange } = this.props;
    const { priceRange, displayValues, selectedCategories, dynamicMaxPrice } = this.state;
    const availableCategories = this.getUniqueCategories();

    return (
    <div className="sidebar1">
      {/* Search Filter */}
      <div className="filter-section">
        <h3 className="search-filter-title">SEARCH</h3>
        <div className="search-input-container">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={onSearchChange}
            className="sidebar-search-input"
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              width: '120%',
              minHeight: '20px'
            }}
          />
        </div>
      </div>

      {/* Categories Filter */}
      {availableCategories.length > 1 && (
        <div className="filter-section">
          <h3 className="search-filter-title">CATEGORY</h3>
          <div className="filter-options">
            {availableCategories.map((category, index) => (
              <div 
                key={index}
                className={`filter-option ${selectedCategories.includes(category) ? 'active' : ''}`}
                onClick={() => this.handleCategoryToggle(category)}
                style={{ fontWeight: 'bold' }}
              >
                {category}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Filter */}
      <div className="filter-section">
        <h3 className="price-filter-title">PRICE</h3>
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
                onChange={this.handleMinInputChange}
                className="price-text-input"
              />
            </div>
            <div className="price-separator">-</div>
            <div className="price-input-group">
              <input
                id="max-price-input"
                type="text"
                value={displayValues.max}
                onChange={this.handleMaxInputChange}
                className="price-text-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }
}

export default FilterSidebar;