import React, { Component } from 'react';
import '../../css/submissionSuccessPopup.css';

class SubmissionSuccessPopup extends Component {
  getTranslations = () => {
    const { selectedLanguage = 'english' } = this.props;
    
    const translations = {
      orderSuccessfullyPlaced: {
        english: 'Order Successfully Placed!',
        chinese: '订单下单成功！',
        malay: 'Pesanan Berjaya Dibuat!'
      },
      orderFailed: {
        english: 'Order Failed!',
        chinese: '订单失败！',
        malay: 'Pesanan Gagal!'
      },
      ok: {
        english: 'OK',
        chinese: '好的',
        malay: 'Baik'
      },
      tryAgain: {
        english: 'Try Again',
        chinese: '重试',
        malay: 'Cuba Lagi'
      }
    };

    return translations;
  }

  render() {
    const { isOpen, onClose, orderDetails, selectedLanguage = 'english', isSuccess = true } = this.props;
    
    if (!isOpen) return null;

    const translations = this.getTranslations();
    
    const modal = {
      type: isSuccess ? 'success' : 'error',
      title: isSuccess ? '✓' : '✗',
      message: isSuccess 
        ? (translations.orderSuccessfullyPlaced[selectedLanguage] || translations.orderSuccessfullyPlaced['english'])
        : (translations.orderFailed[selectedLanguage] || translations.orderFailed['english'])
    };

    const buttonText = isSuccess 
      ? (translations.ok[selectedLanguage] || translations.ok['english'])
      : (translations.tryAgain[selectedLanguage] || translations.tryAgain['english']);

    return (
      <div className="result-modal-overlay" onClick={onClose}>
        <div className="result-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className={`result-modal-icon ${modal.type}`}>
            {modal.title}
          </div>
          <div className="result-modal-message">
            <p className={modal.type}>{modal.message}</p>
          </div>
          <div className="result-modal-footer">
            <button className="result-modal-button" onClick={onClose}>
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default SubmissionSuccessPopup;