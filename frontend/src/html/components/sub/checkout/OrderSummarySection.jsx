import React, { Component } from 'react';

class OrderSummarySection extends Component {
  getTranslation = (key, count = 0) => {
    const { selectedLanguage = 'english' } = this.props;
    const translations = {
      orderSummary: {
        english: 'Order Summary',
        chinese: '订单摘要',
        malay: 'Ringkasan Pesanan'
      },
      items: {
        english: (count) => count === 1 ? 'item' : 'items',
        chinese: (count) => '个商品',
        malay: (count) => count === 1 ? 'item' : 'items'
      },
      noItems: {
        english: 'No items in cart',
        chinese: '购物车中没有商品',
        malay: 'Tiada item dalam troli'
      },
      subtotal: {
        english: 'Subtotal:',
        chinese: '小计:',
        malay: 'Jumlah Kecil:'
      },
      shipping: {
        english: 'Shipping:',
        chinese: '运费:',
        malay: 'Penghantaran:'
      },
      free: {
        english: 'Free',
        chinese: '免费',
        malay: 'Percuma'
      },
      total: {
        english: 'Total:',
        chinese: '总计:',
        malay: 'Jumlah:'
      }
    };
    
    if (key === 'items') {
      return translations[key][selectedLanguage] ? translations[key][selectedLanguage](count) : translations[key]['english'](count);
    }
    
    return translations[key][selectedLanguage] || translations[key]['english'];
  };

  handleQuantityChange = (index, newQuantity) => {
    const { onUpdateQuantity, onRemoveItem } = this.props;
    
    console.log('handleQuantityChange called:', { index, newQuantity, hasOnUpdateQuantity: !!onUpdateQuantity });
    
    if (newQuantity < 1) {
      // Remove item if quantity goes below 1
      if (onRemoveItem) {
        onRemoveItem(index);
      }
    } else if (onUpdateQuantity) {
      onUpdateQuantity(index, newQuantity);
    }
  }

  handleDirectQuantityChange = (index, event) => {
    const newQuantity = parseInt(event.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      this.handleQuantityChange(index, newQuantity);
    }
  }

  handleRemoveItem = (index) => {
    const { onRemoveItem } = this.props;
    if (onRemoveItem) {
      onRemoveItem(index);
    }
  }

  render() {
    const { cartItems, expandedSections, onToggleSection, calculateTotal, getTotalItems } = this.props;

    return (
      <div className="checkout-section">
        <div 
          className={`section-header ${expandedSections.orderSummary ? 'expanded' : 'collapsed'}`}
          onClick={() => onToggleSection('orderSummary')}
        >
          <h2 className="section-title">{this.getTranslation('orderSummary')} ({getTotalItems()} {this.getTranslation('items', getTotalItems())})</h2>
          <span className="section-toggle-icon">
            {expandedSections.orderSummary ? '▼' : '▶'}
          </span>
        </div>
        <div className={`section-content ${expandedSections.orderSummary ? 'expanded' : 'collapsed'}`}>
          <div className="order-summary-container">
            <div className="cart-items-list scrollable">
              {cartItems.length === 0 ? (
                <div className="empty-cart-message">
                  <p>{this.getTranslation('noItems')}</p>
                </div>
              ) : (
                cartItems.map((item, index) => (
                  <div key={index} className="checkout-cart-item">
                    <div className="item-image">
                      <img 
                        src={item.image || '/placeholder-image.jpg'} 
                        alt={item.name}
                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                      />
                    </div>
                    <div className="item-details1">
                      <div className="item-name1" dangerouslySetInnerHTML={{ __html: item.name }}></div>
                      <div className="item-price1">${item.price}</div>
                    </div>
                    <div className="item-quantity-controls1">
                      <button 
                        className="quantity-btn1 decrease"
                        onClick={() => this.handleQuantityChange(index, item.quantity - 1)}
                      >
                        -
                      </button>
                      <input
                        type="text"
                        className="quantity-input1"
                        value={item.quantity}
                        onChange={(e) => this.handleDirectQuantityChange(index, e)}
                        onBlur={(e) => {
                          // Ensure minimum value of 1
                          if (parseInt(e.target.value, 10) < 1) {
                            e.target.value = 1;
                            this.handleQuantityChange(index, 1);
                          }
                        }}
                      />
                      <button 
                        className="quantity-btn1 increase"
                        onClick={() => this.handleQuantityChange(index, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="item-total1">
                      ${(item.price * (item.quantity || 0)).toFixed(2)}
                    </div>
                    <button 
                      className="remove-item-btn"
                      onClick={() => this.handleRemoveItem(index)}
                      title="Remove item"
                    >
                      <i className="fas fa-trash cart-trash-icon1"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {cartItems.length > 0 && (
              <div className="order-total sticky">
                <div className="total-row">
                  <span className="total-label1">{this.getTranslation('subtotal')}</span>
                  <span className="total-amount1">${calculateTotal()}</span>
                </div>
                {/* <div className="total-row">
                  <span className="total-label1">{this.getTranslation('shipping')}</span>
                  <span className="total-amount1">{this.getTranslation('free')}</span>
                </div> */}
                <div className="total-row final-total">
                  <span className="total-label1">{this.getTranslation('total')}</span>
                  <span className="total-amount1">${calculateTotal()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default OrderSummarySection;