import React, { Component } from 'react';
import '../../css/orderSubmissionModal.css';

class OrderSubmissionModal extends Component {
  getTranslations = () => {
    const translations = {
      processingOrder: {
        english: 'Processing Your Order',
        chinese: '正在处理您的订单',
        malay: 'Memproses Pesanan Anda'
      }
    };
    return translations;
  }

  render() {
    const { isOpen, selectedLanguage = 'english' } = this.props;

    if (!isOpen) return null;

    const translations = this.getTranslations();

    const getText = (key) => {
      return translations[key]?.[selectedLanguage] || translations[key]?.['english'] || '';
    };

    return (
      <div className="order-submission-modal-overlay">
        <div className="order-submission-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <h1 className="order-submission-modal-title">
            {getText('processingOrder')}
          </h1>

          {/* Loading Spinner */}
          <div className="order-submission-modal-icon">
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          </div>

          {/* Bouncing Balls */}
          <div className="bouncing-balls">
            <div className="ball"></div>
            <div className="ball"></div>
            <div className="ball"></div>
          </div>
        </div>
      </div>
    );
  }
}

export default OrderSubmissionModal;
