import React, { Component } from 'react';

class OrderInformation extends Component {
  getTranslation = (key) => {
    const { selectedLanguage = 'english' } = this.props;
    const translations = {
      orderInformation: {
        english: 'Order Information',
        chinese: '订单信息',
        malay: 'Maklumat Pesanan'
      },
      paymentMethod: {
        english: 'Payment Method',
        chinese: '付款方式',
        malay: 'Kaedah Bayaran'
      },
      collectionMode: {
        english: 'Collection Mode',
        chinese: '收取方式',
        malay: 'Mod Pengumpulan'
      },
      collectionLocation: {
        english: 'Station Location',
        chinese: '站点位置',
        malay: 'Lokasi Stesen'
      },
      deliveryLocation: {
        english: 'Collection Location',
        chinese: '收取地点',
        malay: 'Lokasi Pengumpulan'
      },
      orderDetails: {
        english: 'Order Details',
        chinese: '订单详情',
        malay: 'Butiran Pesanan'
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
        <h4>{this.getTranslation('orderInformation')}</h4>
        <div className="info-grid">
          <div className="info-item">
            <strong>{this.getTranslation('paymentMethod')}:</strong> {activeOrder?.fullOrder?.paymentDetails?.paymentMethod || 'N/A'}
          </div>
          <div className="info-item">
            <strong>{this.getTranslation('collectionMode')}:</strong> {activeOrder?.fullOrder?.collectionDetails?.collectionMode || 'N/A'}
          </div>
          <div className="info-item">
            <strong>{this.getTranslation('deliveryLocation')}:</strong> {activeOrder?.fullOrder?.collectionDetails?.CollectionDeliveryLocation || 'N/A'}
          </div>
          <div className="info-item">
            <strong>{this.getTranslation('orderDetails')}:</strong> {activeOrder?.date} {activeOrder?.fullOrder?.orderDetails?.orderTime || ''}
          </div>
        </div>
      </div>
    );
  }
}

export default OrderInformation;