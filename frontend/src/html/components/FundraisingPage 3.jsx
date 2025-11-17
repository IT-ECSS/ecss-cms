import React, { Component } from 'react';
import axios from 'axios';
import ProductCatalog from './ProductCatalog';
import FilterSidebar from './FilterSidebar';
import Header from './Header';
import ProductDetailsModal from './ProductDetailsModal';
import CheckoutPage from './CheckoutPage';
import OrderTabs from './OrderTabs';
import '../../css/fundraisingPage.css';

class FundraisingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fundraisingItems: [],
      filteredItems: [],
      searchTerm: '',
      priceRange: [0, 100],
      selectedCategories: ['All Categories'],
      sortBy: 'default',
      isLoading: true,
      cartItems: [],
      selectedProduct: null,
      isModalOpen: false,
      showCheckoutPage: false,
      activeTab: 'products', // Track which tab is active: 'products' or 'orders'
      selectedLanguage: null, // Track selected language: 'english', 'chinese', 'malay'
      languageSelected: false // Track if language has been selected
    };
  }

  componentDidMount = async () => {
    // Set the page title
    document.title = 'ECSS Fundraising Page';
    
    // Set CSS custom property for accurate viewport height
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial value
    setVH();

    // Check if user was in checkout mode before refresh
    const wasInCheckoutMode = localStorage.getItem('isInCheckoutMode') === 'true';

    // Load cart items from localStorage
    const savedCartItems = localStorage.getItem('cartItems');
    if (savedCartItems) {
      try {
        const parsedCartItems = JSON.parse(savedCartItems);
        this.setState({ 
          cartItems: parsedCartItems,
          showCheckoutPage: wasInCheckoutMode // Restore checkout page if user was there
        });
      } catch (error) {
        console.error('Error parsing saved cart items:', error);
        localStorage.removeItem('cartItems');
        this.setState({ showCheckoutPage: wasInCheckoutMode });
      }
    } else {
      this.setState({ showCheckoutPage: wasInCheckoutMode });
    }

    try {
      console.log('Fetching fundraising items...');
      var response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/fundraising/`);
      console.log('API Response:', response.data);
      
      var fundraisingItems = response.data.fundraising || response.data || [];
      console.log('Fundraising items:', fundraisingItems);
      
      this.setState({ 
        fundraisingItems,
        filteredItems: fundraisingItems,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching fundraising items:', error);
      this.setState({ isLoading: false });
    }

    // Update on resize and orientation change
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // Cleanup function
    this.cleanup = () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }

  componentWillUnmount() {
    if (this.cleanup) {
      this.cleanup();
    }
  }

  saveCartToLocalStorage = (cartItems) => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  handleSearch = (e) => {
    const searchTerm = e.target.value;
    this.setState({ searchTerm }, this.filterItems);
  }

  handlePriceFilter = (priceRange) => {
    this.setState({ priceRange: [priceRange.min, priceRange.max] }, this.filterItems);
  }

  handleCategoryFilter = (selectedCategories) => {
    this.setState({ selectedCategories }, this.filterItems);
  }

  handleSortChange = (e) => {
    const sortBy = e.target.value;
    this.setState({ sortBy }, this.filterItems);
  }

  handleAddToCart = (newItem) => {
    this.setState(prevState => {
      const existingItemIndex = prevState.cartItems.findIndex(item => item.id === newItem.id);
      
      let updatedCartItems;
      if (existingItemIndex !== -1) {
        // Item already exists, increase quantity
        updatedCartItems = [...prevState.cartItems];
        updatedCartItems[existingItemIndex].quantity += newItem.quantity;
      } else {
        // New item, add to cart
        updatedCartItems = [...prevState.cartItems, newItem];
      }
      
      // Save to localStorage
      this.saveCartToLocalStorage(updatedCartItems);
      
      return { cartItems: updatedCartItems };
    });
  }

  handleRemoveFromCart = (index) => {
    this.setState(prevState => {
      const updatedCartItems = prevState.cartItems.filter((_, i) => i !== index);
      
      // Save to localStorage
      this.saveCartToLocalStorage(updatedCartItems);
      
      return { cartItems: updatedCartItems };
    });
  }

  handleUpdateCartQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      this.handleRemoveFromCart(index);
      return;
    }
    
    this.setState(prevState => {
      const updatedCartItems = [...prevState.cartItems];
      updatedCartItems[index].quantity = newQuantity;
      
      // Save to localStorage
      this.saveCartToLocalStorage(updatedCartItems);
      
      return { cartItems: updatedCartItems };
    });
  }

  handleUpdateCartQuantityById = (productId, newQuantity) => {
    this.setState(prevState => {
      let updatedCartItems;
      
      if (newQuantity <= 0) {
        // Remove item from cart
        updatedCartItems = prevState.cartItems.filter(item => item.id !== productId);
      } else {
        const existingItemIndex = prevState.cartItems.findIndex(item => item.id === productId);
        if (existingItemIndex !== -1) {
          // Update existing item
          updatedCartItems = [...prevState.cartItems];
          updatedCartItems[existingItemIndex].quantity = newQuantity;
        } else {
          // Item not found, return unchanged state
          return prevState;
        }
      }
      
      // Save to localStorage
      this.saveCartToLocalStorage(updatedCartItems);
      
      return { cartItems: updatedCartItems };
    });
  }

  handleMoreDetails = (product) => {
    console.log('More details for product:', product);
    this.setState({
      selectedProduct: product,
      isModalOpen: true
    });
  }

  handleCloseModal = () => {
    this.setState({
      selectedProduct: null,
      isModalOpen: false
    });
  }

  handleProceedToCheckout = () => {
    this.setState({
      showCheckoutPage: true
    });
  }

  handleBackFromCheckout = () => {
    this.setState({
      showCheckoutPage: false
    });
  }

  handleClearCart = () => {
    this.setState({
      cartItems: []
    });
    // Also clear from localStorage
    this.saveCartToLocalStorage([]);
  }

  handleTabChange = (tabName) => {
    this.setState({
      activeTab: tabName
    });
  }

  handleLanguageChange = (language) => {
    this.setState({
      selectedLanguage: language,
      languageSelected: true
    });
  }

  filterItems = () => {
    const { fundraisingItems, searchTerm, priceRange, selectedCategories, sortBy } = this.state;
    
    let filtered = fundraisingItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const price = parseFloat(item.price);
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
      
      // Category filtering
      let matchesCategory = false;
      if (selectedCategories.includes('All Categories')) {
        matchesCategory = true;
      } else {
        // Check if item has any of the selected categories
        matchesCategory = item.categories && item.categories.some(category => 
          selectedCategories.includes(category.name)
        );
      }
      
      return matchesSearch && matchesPrice && matchesCategory;
    });

    // Apply sorting
    switch (sortBy) {
      case 'popularity':
        // Sort by popularity (assuming higher ratings/reviews = more popular)
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'latest':
        // Sort by latest (assuming there's a date field or use ID as proxy)
        filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
        break;
      case 'price-low':
        // Sort by price: low to high
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price-high':
        // Sort by price: high to low
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case 'default':
      default:
        // Keep original order
        break;
    }

    this.setState({ filteredItems: filtered });
  }

  render() {
    const { filteredItems, searchTerm, isLoading, fundraisingItems, cartItems, selectedProduct, isModalOpen, sortBy, showCheckoutPage, activeTab, selectedLanguage, languageSelected } = this.state;

    // Show checkout page if user clicked "Proceed to Checkout"
    if (showCheckoutPage) {
      return (
        <CheckoutPage 
          cartItems={cartItems} 
          onGoBack={this.handleBackFromCheckout}
          onUpdateCartItemQuantity={this.handleUpdateCartQuantity}
          onRemoveCartItem={this.handleRemoveFromCart}
          onClearCart={this.handleClearCart}
          selectedLanguage={selectedLanguage}
          onLanguageChange={this.handleLanguageChange}
        />
      );
    }

    const getLoadingText = () => {
      switch (selectedLanguage) {
        case 'chinese':
          return '正在加载产品...';
        case 'malay':
          return 'Memuatkan produk...';
        default:
          return 'Loading products...';
      }
    };

    // Show language selection first if no language selected
    if (!languageSelected) {
      return (
        <div className="loading-container" style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f8f9fa'
        }}>
          <div style={{ 
            textAlign: 'center', 
            background: '#ffffff', 
            padding: '40px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            maxWidth: '500px',
            width: '90%'
          }}>
            {/* Language Selection Header */}
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: '#2c3e50', 
                marginBottom: '15px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                Please select your language
              </h2>
              <p style={{ 
                fontSize: '16px', 
                color: '#7f8c8d', 
                marginBottom: '5px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                请选择您的语言
              </p>
              <p style={{ 
                fontSize: '16px', 
                color: '#7f8c8d', 
                marginBottom: '0',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                Sila pilih bahasa anda
              </p>
            </div>

            {/* Language Selection Buttons */}
            <div className="language-selector" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px'
            }}>
              <button 
                onClick={() => this.handleLanguageChange('english')}
                style={{ 
                  width: '100%',
                  padding: '15px 24px', 
                  border: '2px solid #e9ecef',
                  background: '#ffffff',
                  color: '#2c3e50',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.borderColor = '#3498db';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.borderColor = '#e9ecef';
                }}
              >
                English
              </button>
              <button 
                onClick={() => this.handleLanguageChange('chinese')}
                style={{ 
                  width: '100%',
                  padding: '15px 24px', 
                  border: '2px solid #e9ecef',
                  background: '#ffffff',
                  color: '#2c3e50',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.borderColor = '#3498db';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.borderColor = '#e9ecef';
                }}
              >
                中文
              </button>
              <button 
                onClick={() => this.handleLanguageChange('malay')}
                style={{ 
                  width: '100%',
                  padding: '15px 24px', 
                  border: '2px solid #e9ecef',
                  background: '#ffffff',
                  color: '#2c3e50',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.borderColor = '#3498db';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#ffffff';
                  e.target.style.borderColor = '#e9ecef';
                }}
              >
                Bahasa Melayu
              </button>
            </div>
          </div>
        </div>
      );
    }

    const getResultsText = () => {
      const showing = filteredItems.length > 0 ? '1-' + Math.min(9, filteredItems.length) : '0';
      const total = filteredItems.length;
      
      switch (selectedLanguage) {
        case 'chinese':
          return `显示第 ${showing} 个，共 ${total} 个结果`;
        case 'malay':
          return `MENUNJUKKAN ${showing} DARIPADA ${total} HASIL`;
        default:
          return `SHOWING ${showing} OF ${total} RESULTS`;
      }
    };

    const getSortOptions = () => {
      const options = {
        english: {
          default: 'Default sorting',
          popularity: 'Sort by popularity',
          latest: 'Sort by latest',
          priceLow: 'Sort by price: low to high',
          priceHigh: 'Sort by price: high to low'
        },
        chinese: {
          default: '默认排序',
          popularity: '按热度排序',
          latest: '按最新排序',
          priceLow: '按价格排序：从低到高',
          priceHigh: '按价格排序：从高到低'
        },
        malay: {
          default: 'Susunan lalai',
          popularity: 'Susun mengikut populariti',
          latest: 'Susun mengikut terkini',
          priceLow: 'Susun mengikut harga: rendah ke tinggi',
          priceHigh: 'Susun mengikut harga: tinggi ke rendah'
        }
      };
      return options[selectedLanguage] || options.english;
    };

    // Show loading state after language is selected
    if (isLoading && languageSelected) {
      return (
        <div className="loading-container" style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f8f9fa'
        }}>
          <div style={{ 
            textAlign: 'center', 
            background: '#ffffff', 
            padding: '40px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            maxWidth: '400px',
            width: '90%'
          }}>
            {/* Loading Spinner and Text */}
            <div>
              <div className="loading-spinner" style={{
                width: '50px',
                height: '50px',
                border: '4px solid #e9ecef',
                borderTop: '4px solid #3498db',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <div className="loading-text" style={{
                fontSize: '18px',
                color: '#2c3e50',
                fontWeight: '500',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                {getLoadingText()}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <Header 
          cartItems={cartItems}
          onRemoveFromCart={this.handleRemoveFromCart}
          onUpdateCartQuantity={this.handleUpdateCartQuantity}
          onProceedToCheckout={this.handleProceedToCheckout}
          activeTab={activeTab}
          onTabChange={this.handleTabChange}
          selectedLanguage={selectedLanguage}
          onLanguageChange={this.handleLanguageChange}
        />

        {/* Tab Content */}
        {activeTab === 'products' ? (
          <div className="fundraising-page fade-in">
          {/* Left Sidebar - Filters */}
          <div className="sidebar-container">
            <FilterSidebar 
              onPriceFilter={this.handlePriceFilter}
              onCategoryFilter={this.handleCategoryFilter}
              searchTerm={searchTerm}
              onSearchChange={this.handleSearch}
              products={fundraisingItems}
              selectedLanguage={selectedLanguage}
            />
          </div>

          {/* Right Content - Products */}
          <div className="content-area">
            {/* Results Header */}
            <div className="results-header">
              <div className="results-count">
                {getResultsText()}
              </div>
              <select 
                className="sort-dropdown" 
                value={sortBy} 
                onChange={this.handleSortChange}
              >
                <option value="default">{getSortOptions().default}</option>
                <option value="popularity">{getSortOptions().popularity}</option>
                <option value="latest">{getSortOptions().latest}</option>
                <option value="price-low">{getSortOptions().priceLow}</option>
                <option value="price-high">{getSortOptions().priceHigh}</option>
              </select>
            </div>
            
            <ProductCatalog 
              products={filteredItems} 
              cartItems={cartItems}
              onAddToCart={this.handleAddToCart}
              onMoreDetails={this.handleMoreDetails}
              onUpdateCartQuantity={this.handleUpdateCartQuantityById}
              selectedLanguage={selectedLanguage}
            />
          </div>
        </div>
        ) : (
          // Orders Tab Content
          <div className="orders-page fade-in">
            <OrderTabs selectedLanguage={selectedLanguage} />
          </div>
        )}
        
        <ProductDetailsModal
          isOpen={isModalOpen}
          product={selectedProduct}
          cartItems={cartItems}
          onClose={this.handleCloseModal}
          onAddToCart={this.handleAddToCart}
          onUpdateCartQuantity={this.handleUpdateCartQuantityById}
          selectedLanguage={selectedLanguage}
        />
      </>
    );
  }
}

export default FundraisingPage;