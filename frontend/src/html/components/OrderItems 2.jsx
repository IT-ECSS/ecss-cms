import React, { Component } from 'react';

class OrderItems extends Component {
  getTranslation = (key) => {
    const { selectedLanguage = 'english' } = this.props;
    const translations = {
      orderItems: {
        english: 'Order Items',
        chinese: '订单项目',
        malay: 'Item Pesanan'
      },
      item: {
        english: 'Item',
        chinese: '项目',
        malay: 'Item'
      },
      quantity: {
        english: 'Quantity',
        chinese: '数量',
        malay: 'Kuantiti'
      },
      price: {
        english: 'Price',
        chinese: '价格',
        malay: 'Harga'
      },
      subtotal: {
        english: 'Subtotal',
        chinese: '小计',
        malay: 'Subjumlah'
      },
      noItems: {
        english: 'No items found',
        chinese: '未找到项目',
        malay: 'Tiada item dijumpai'
      },
      orderTotal: {
        english: 'Order Total',
        chinese: '订单总额',
        malay: 'Jumlah Pesanan'
      },
      total: {
        english: 'Total',
        chinese: '总计',
        malay: 'Jumlah'
      }
    };
    return translations[key] && translations[key][selectedLanguage] 
      ? translations[key][selectedLanguage] 
      : translations[key] && translations[key]['english'] 
        ? translations[key]['english'] 
        : key;
  }

  render() {
    const { activeOrder } = this.props;
    
    return (
      <div className="order-section">
        <h4>{this.getTranslation('orderItems')}</h4>
        
        {/* Desktop Table View */}
        <div className="items-table desktop-only">
          <div className="items-header">
            <span>{this.getTranslation('item')}</span>
            <span>{this.getTranslation('quantity')}</span>
            <span>{this.getTranslation('price')}</span>
            <span>{this.getTranslation('subtotal')}</span>
          </div>
          {activeOrder?.fullOrder?.orderDetails?.items?.map((item, index) => (
            <div key={index} className="items-row">
              <span>{item.productName}</span>
              <span>{item.quantity}</span>
              <span>${item.price?.toFixed(2) || '0.00'}</span>
              <span>${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</span>
            </div>
          )) || (
            <div className="items-row">
              <span colSpan="4">{this.getTranslation('noItems')}</span>
            </div>
          )}
          <div className="items-total">
            <span></span>
            <span></span>
            <span><strong>{this.getTranslation('total')}:</strong></span>
            <span><strong>${activeOrder?.fullOrder?.orderDetails?.totalPrice?.toFixed(2) || '0.00'}</strong></span>
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="items-cards mobile-only">
          {activeOrder?.fullOrder?.orderDetails?.items?.length > 0 ? (
            <>
              {activeOrder.fullOrder.orderDetails.items.map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-card-header">
                    <h5 className="item-name">{item.productName}</h5>
                  </div>
                  <div className="item-card-body">
                    <div className="item-detail">
                      <span className="detail-label">{this.getTranslation('quantity')}:</span>
                      <span className="detail-value">{item.quantity}</span>
                    </div>
                    <div className="item-detail">
                      <span className="detail-label">{this.getTranslation('price')}:</span>
                      <span className="detail-value">${item.price?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="item-detail subtotal">
                      <span className="detail-label">{this.getTranslation('subtotal')}:</span>
                      <span className="detail-value">${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="items-total-card">
                <div className="total-label">{this.getTranslation('orderTotal')}:</div>
                <div className="total-value">${activeOrder?.fullOrder?.orderDetails?.totalPrice?.toFixed(2) || '0.00'}</div>
              </div>
            </>
          ) : (
            <div className="no-items-card">
              <p>{this.getTranslation('noItems')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default OrderItems;