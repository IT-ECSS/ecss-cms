import React, { Component } from 'react';
import axios from 'axios';
import ProductCatalog from './ProductCatalog';
import FilterSidebar from './FilterSidebar';
import Header from './Header';
import ProductDetailsModal from './ProductDetailsModal';
import CheckoutPage from './CheckoutPage';
import '../../css/fundraisingPage.css';

class FundraisingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fundraisingItems: [],
      filteredItems: [],
      searchTerm: '',
      priceRange: [0, 100],
      sortBy: 'default',
      isLoading: true,
      cartItems: [],
      selectedProduct: null,
      isModalOpen: false,
      showCheckoutPage: false
    };
  }

  componentDidMount = async () => {
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

  filterItems = () => {
    const { fundraisingItems, searchTerm, priceRange, sortBy } = this.state;
    
    let filtered = fundraisingItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const price = parseFloat(item.price);
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
      
      return matchesSearch && matchesPrice;
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
    const { filteredItems, searchTerm, isLoading, fundraisingItems, cartItems, selectedProduct, isModalOpen, sortBy, showCheckoutPage } = this.state;

    // Show checkout page if user clicked "Proceed to Checkout"
    if (showCheckoutPage) {
      return (
        <CheckoutPage 
          cartItems={cartItems} 
          onGoBack={this.handleBackFromCheckout}
          onUpdateCartItemQuantity={this.handleUpdateCartQuantity}
          onRemoveCartItem={this.handleRemoveFromCart}
          onClearCart={this.handleClearCart}
        />
      );
    }

    // Show loading state
    if (isLoading) {
      return (
        <div className="loading-container">
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading products...</div>
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
        />
        <div className="fundraising-page fade-in">
          {/* Left Sidebar - Filters */}
          <div className="sidebar-container">
            <FilterSidebar 
              onPriceFilter={this.handlePriceFilter}
              searchTerm={searchTerm}
              onSearchChange={this.handleSearch}
              products={fundraisingItems}
            />
          </div>

          {/* Right Content - Products */}
          <div className="content-area">
            {/* Results Header */}
            <div className="results-header">
              <div className="results-count">
                SHOWING {filteredItems.length > 0 ? '1-' + Math.min(9, filteredItems.length) : '0'} OF {filteredItems.length} RESULTS
              </div>
              <select 
                className="sort-dropdown" 
                value={sortBy} 
                onChange={this.handleSortChange}
              >
                <option value="default">Default sorting</option>
                <option value="popularity">Sort by popularity</option>
                <option value="latest">Sort by latest</option>
                <option value="price-low">Sort by price: low to high</option>
                <option value="price-high">Sort by price: high to low</option>
              </select>
            </div>
            
            <ProductCatalog 
              products={filteredItems} 
              cartItems={cartItems}
              onAddToCart={this.handleAddToCart}
              onMoreDetails={this.handleMoreDetails}
              onUpdateCartQuantity={this.handleUpdateCartQuantityById}
            />
          </div>
        </div>
        
        <ProductDetailsModal
          isOpen={isModalOpen}
          product={selectedProduct}
          cartItems={cartItems}
          onClose={this.handleCloseModal}
          onAddToCart={this.handleAddToCart}
          onUpdateCartQuantity={this.handleUpdateCartQuantityById}
        />
      </>
    );
  }
}

export default FundraisingPage;