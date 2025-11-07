import React, { Component } from 'react';

class CustomerInformation extends Component {
  getTranslation = (key) => {
    const { selectedLanguage = 'english' } = this.props;
    const translations = {
      customerInformation: {
        english: 'Customer Information',
        chinese: '客户信息',
        malay: 'Maklumat Pelanggan'
      },
      name: {
        english: 'Name',
        chinese: '姓名',
        malay: 'Nama'
      },
      email: {
        english: 'Email',
        chinese: '电子邮件',
        malay: 'E-mel'
      },
      phone: {
        english: 'Phone',
        chinese: '电话',
        malay: 'Telefon'
      },
      collectionLocation: {
        english: 'Station Location',
        chinese: '站点位置',
        malay: 'Lokasi Stesen'
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
        <h4>{this.getTranslation('customerInformation')}</h4>
        <div className="customer-info">
          <div className="customer-details">
            <div className="info-item">
              <strong>{this.getTranslation('name')}:</strong> {activeOrder?.fullOrder?.personalInfo ? `${activeOrder.fullOrder.personalInfo.lastName} ${activeOrder.fullOrder.personalInfo.firstName}` : 'N/A'}
            </div>
            <div className="info-item">
              <strong>{this.getTranslation('email')}:</strong> {activeOrder?.fullOrder?.personalInfo?.email || 'N/A'}
            </div>
            <div className="info-item">
              <strong>{this.getTranslation('phone')}:</strong> {activeOrder?.fullOrder?.personalInfo?.phone || 'N/A'}
            </div>
            <div className="info-item">
              <strong>{this.getTranslation('collectionLocation')}:</strong> {activeOrder?.fullOrder?.personalInfo?.location || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CustomerInformation;