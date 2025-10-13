import React, { Component } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import axios from 'axios';
import '../../css/productDetailsPage.css';

class ProductDetailsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      product: null,
      isLoading: true,
      selectedImageIndex: 0,
      quantity: 1,
      error: null
    };
  }

  componentDidMount = async () => {
    const { productId } = this.props.match.params;
    
    if (this.props.location.state && this.props.location.state.product) {
      // Product data passed from previous page
      this.setState({
        product: this.props.location.state.product,
        isLoading: false
      });
    } else {
      // Fetch product data from API
      await this.fetchProductData(productId);
    }
  }

  fetchProductData = async (productId) => {
    try {
      const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/fundraising/`);
      const fundraisingItems = response.data.fundraising || response.data || [];
      const product = fundraisingItems.find(item => item.id === parseInt(productId));
      
      if (product) {
        this.setState({ 
          product,
          isLoading: false
        });
      } else {
        this.setState({ 
          error: 'Product not found',
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      this.setState({ 
        error: 'Failed to load product',
        isLoading: false
      });
    }
  }

  handleImageSelect = (index) => {
    this.setState({ selectedImageIndex: index });
  }

  handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1) {
      this.setState({ quantity: newQuantity });
    }
  }

  handleAddToCart = () => {
    const { product, quantity } = this.state;
    
    // Add to cart logic here
    const cartItem = {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity: quantity,
      image: product.images && product.images[0] ? product.images[0].src : '/placeholder-image.jpg'
    };
    
    // Store in localStorage or send to parent component
    const existingCart = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const existingItemIndex = existingCart.findIndex(item => item.id === cartItem.id);
    
    if (existingItemIndex !== -1) {
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      existingCart.push(cartItem);
    }
    
    localStorage.setItem('cartItems', JSON.stringify(existingCart));
    
    // Show success message or redirect
    alert('Product added to cart!');
  }

  handleGoBack = () => {
    this.props.history.goBack();
  }

  render() {
    const { product, isLoading, selectedImageIndex, quantity, error } = this.state;

    if (isLoading) {
      return (
        <div className="product-details-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading product details...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="product-details-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={this.handleGoBack} className="back-button">
            Go Back
          </button>
        </div>
      );
    }

    if (!product) {
      return (
        <div className="product-details-error">
          <h2>Product Not Found</h2>
          <button onClick={this.handleGoBack} className="back-button">
            Go Back
          </button>
        </div>
      );
    }

    return (
      <div className="product-details-page">
        {/* Back Button */}
        <div className="back-button-container">
          <button onClick={this.handleGoBack} className="back-button">
            <i className="fa-solid fa-arrow-left"></i>
            Back to Products
          </button>
        </div>

        <div className="product-details-container">
          {/* Product Images */}
          <div className="product-images-section">
            <div className="main-image-container">
              <img 
                src={product.images && product.images[selectedImageIndex] ? 
                     product.images[selectedImageIndex].src : '/placeholder-image.jpg'}
                alt={product.images && product.images[selectedImageIndex] ? 
                     product.images[selectedImageIndex].alt : product.name}
                className="main-product-image"
                onError={(e) => {
                  e.target.src = '/placeholder-image.jpg';
                }}
              />
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="thumbnail-container">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={image.src}
                    alt={image.alt}
                    className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                    onClick={() => this.handleImageSelect(index)}
                    onError={(e) => {
                      e.target.src = '/placeholder-image.jpg';
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="product-info-section">
            <h1 
              className="product-title"
              dangerouslySetInnerHTML={{ __html: product.name }}
            ></h1>
            
            <div className="product-price">
              ${parseFloat(product.price).toFixed(2)}
            </div>

            {product.short_description && (
              <div className="product-short-description">
                <div dangerouslySetInnerHTML={{ __html: product.short_description }}></div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="quantity-section">
              <label className="quantity-label">Quantity:</label>
              <div className="quantity-controls">
                <button 
                  className="quantity-btn minus"
                  onClick={() => this.handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input 
                  type="number"
                  className="quantity-input"
                  value={quantity}
                  onChange={(e) => this.handleQuantityChange(parseInt(e.target.value) || 1)}
                  min="1"
                />
                <button 
                  className="quantity-btn plus"
                  onClick={() => this.handleQuantityChange(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button 
              className="add-to-cart-btn-large"
              onClick={this.handleAddToCart}
            >
              Add to Cart - ${(parseFloat(product.price) * quantity).toFixed(2)}
            </button>

            {/* Product Description */}
            {product.description && (
              <div className="product-description">
                <h3>Description</h3>
                <div dangerouslySetInnerHTML={{ __html: product.description }}></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ProductDetailsPage;