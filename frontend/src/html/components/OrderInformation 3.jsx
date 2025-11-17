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
      },
      collectionDetails: {
        english: 'Collection Details',
        chinese: '收取详情',
        malay: 'Butiran Pengumpulan'
      }
    };
    return translations[key] && translations[key][selectedLanguage] 
      ? translations[key][selectedLanguage] 
      : translations[key] && translations[key]['english'] 
        ? translations[key]['english'] 
        : key;
  }

  // Helper function to format time to 12-hour format
  formatTo12Hour = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      // If the time is already in 12-hour format, return as is
      if (timeString.toLowerCase().includes('am') || timeString.toLowerCase().includes('pm')) {
        return this.translateTimeString(timeString);
      }
      
      // Check if it's a time range (contains dash)
      if (timeString.includes('-')) {
        const timeParts = timeString.split('-');
        if (timeParts.length === 2) {
          const startTime = this.formatSingleTime(timeParts[0].trim());
          const endTime = this.formatSingleTime(timeParts[1].trim());
          return `${startTime} - ${endTime}`;
        }
      }
      
      // Single time format
      return this.formatSingleTime(timeString);
    } catch (error) {
      return timeString; // Return original if parsing fails
    }
  }

  // Helper function to translate AM/PM in existing time strings
  translateTimeString = (timeString) => {
    const { selectedLanguage = 'english' } = this.props;
    
    if (selectedLanguage === 'chinese') {
      // For existing time strings, we need to parse the time to determine the correct period
      const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const isPM = timeMatch[3].toUpperCase() === 'PM';
        const hour24 = isPM ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours);
        
        const chinesePeriod = this.getChineseTimePeriod(hour24);
        return `${hours}:${minutes} ${chinesePeriod}`;
      }
      return timeString.replace(/AM/gi, '上午').replace(/PM/gi, '下午');
    } else if (selectedLanguage === 'malay') {
      return timeString.replace(/AM/gi, 'PG').replace(/PM/gi, 'PTG');
    }
    
    return timeString; // Default to English
  }

  // Helper function to get Chinese time period
  getChineseTimePeriod = (hour24) => {
    if (hour24 >= 6 && hour24 < 12) {
      return '早上'; // Morning (6 AM - 12 PM)
    } else if (hour24 >= 12 && hour24 < 18) {
      return '下午'; // Afternoon (12 PM - 6 PM)
    } else if (hour24 >= 18 && hour24 < 24) {
      return '晚上'; // Evening/Night (6 PM - 12 AM)
    } else {
      return '凌晨'; // Early morning/Late night (12 AM - 6 AM)
    }
  }

  // Helper function to format a single time
  formatSingleTime = (timeString) => {
    if (!timeString) return '';
    
    const { selectedLanguage = 'english' } = this.props;
    
    // Parse 24-hour format (HH:MM or HH:MM:SS or just HH)
    const timeParts = timeString.split(':');
    if (timeParts.length === 0) return timeString;
    
    let hours = parseInt(timeParts[0]);
    let minutes = timeParts[1] || '00';
    
    if (isNaN(hours)) return timeString;
    
    const hour24 = hours; // Store 24-hour format for Chinese time periods
    const isAfternoon = hours >= 12;
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    // Get localized AM/PM
    let ampm;
    if (selectedLanguage === 'chinese') {
      ampm = this.getChineseTimePeriod(hour24);
    } else if (selectedLanguage === 'malay') {
      ampm = isAfternoon ? 'PTG' : 'PG';
    } else {
      ampm = isAfternoon ? 'PM' : 'AM';
    }
    
    return `${hours}:${minutes} ${ampm}`;
  }

  // Helper function to format date to dd/mm/yyyy format
  formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid date
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  }

  render() {
    const { activeOrder } = this.props;
    const collectionDetails = activeOrder?.fullOrder?.collectionDetails;
    
    return (
      <div className="order-section">
        <h4>{this.getTranslation('orderInformation')}</h4>
        <div className="info-grid">
          <div className="info-item">
            <strong>{this.getTranslation('paymentMethod')}:</strong> {activeOrder?.fullOrder?.paymentDetails?.paymentMethod || 'N/A'}
          </div>
          <div className="info-item">
            <strong>{this.getTranslation('collectionMode')}:</strong> {collectionDetails?.collectionMode || 'N/A'}
          </div>
          <div className="info-item">
            <strong>{this.getTranslation('deliveryLocation')}:</strong> {collectionDetails?.CollectionDeliveryLocation || 'N/A'}
          </div>
          <div className="info-item">
            <strong>{this.getTranslation('orderDetails')}:</strong> {activeOrder?.date} {activeOrder?.fullOrder?.orderDetails?.orderTime ? this.formatTo12Hour(activeOrder.fullOrder.orderDetails.orderTime) : ''}
          </div>
          
          {/* Collection Details Section */}
          {(collectionDetails?.collectionDate || collectionDetails?.collectionTime) && (
            <div className="info-item">
              <strong>{this.getTranslation('collectionDetails')}:</strong> {collectionDetails?.collectionDate ? this.formatDate(collectionDetails.collectionDate) : ''} {collectionDetails?.collectionTime ? this.formatTo12Hour(collectionDetails.collectionTime) : ''}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default OrderInformation;