import React, { Component } from 'react';
import axios from 'axios';
import ProductCatalog from './ProductCatalog';
import FilterSidebar from './FilterSidebar';
import Header from './Header';
import ProductDetailsModal from './ProductDetailsModal';
import '../../css/fundraisingPage.css';

class FundraisingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fundraisingItems: [],
      filteredItems: [],
      searchTerm: '',
      priceRange: [0, 100],
      isLoading: true,
      cartItems: [],
      selectedProduct: null,
      isModalOpen: false
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

  handleSearch = (e) => {
    const searchTerm = e.target.value;
    this.setState({ searchTerm }, this.filterItems);
  }

  handlePriceFilter = (priceRange) => {
    this.setState({ priceRange: [priceRange.min, priceRange.max] }, this.filterItems);
  }

  handleAddToCart = (newItem) => {
    this.setState(prevState => {
      const existingItemIndex = prevState.cartItems.findIndex(item => item.id === newItem.id);
      
      if (existingItemIndex !== -1) {
        // Item already exists, increase quantity
        const updatedCartItems = [...prevState.cartItems];
        updatedCartItems[existingItemIndex].quantity += newItem.quantity;
        return { cartItems: updatedCartItems };
      } else {
        // New item, add to cart
        return { cartItems: [...prevState.cartItems, newItem] };
      }
    });
  }

  handleRemoveFromCart = (index) => {
    this.setState(prevState => ({
      cartItems: prevState.cartItems.filter((_, i) => i !== index)
    }));
  }

  handleUpdateCartQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      this.handleRemoveFromCart(index);
      return;
    }
    
    this.setState(prevState => {
      const updatedCartItems = [...prevState.cartItems];
      updatedCartItems[index].quantity = newQuantity;
      return { cartItems: updatedCartItems };
    });
  }

  handleUpdateCartQuantityById = (productId, newQuantity) => {
    this.setState(prevState => {
      if (newQuantity <= 0) {
        // Remove item from cart
        return {
          cartItems: prevState.cartItems.filter(item => item.id !== productId)
        };
      }
      
      const existingItemIndex = prevState.cartItems.findIndex(item => item.id === productId);
      if (existingItemIndex !== -1) {
        // Update existing item
        const updatedCartItems = [...prevState.cartItems];
        updatedCartItems[existingItemIndex].quantity = newQuantity;
        return { cartItems: updatedCartItems };
      }
      
      return prevState; // No change if item not found
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

  filterItems = () => {
    const { fundraisingItems, searchTerm, priceRange } = this.state;
    
    let filtered = fundraisingItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const price = parseFloat(item.price);
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
      
      return matchesSearch && matchesPrice;
    });

    this.setState({ filteredItems: filtered });
  }

  render() {
    const { filteredItems, searchTerm, isLoading, fundraisingItems, cartItems, selectedProduct, isModalOpen } = this.state;

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
