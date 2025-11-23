import React, { Component } from 'react';
import '../../css/submissionSuccessPopup.css';

class SubmissionSuccessPopup extends Component {
  getTranslations = () => {
    const translations = {
      english: {
        title: 'Order Successfully Placed!',
        message: 'Invoice saved to your device. Payment details sent via WhatsApp.',
        button: 'Done'
      },
      chinese: {
        title: '订单下单成功！',
        message: '发票已保存到您的设备。付款详情已通过WhatsApp发送。',
        button: '完成'
      },
      malay: {
        title: 'Pesanan Berjaya Dibuat!',
        message: 'Invois telah disimpan ke peranti anda. Butiran pembayaran telah dihantar melalui WhatsApp.',
        button: 'Selesai'
      }
    };
    return translations;
  }

  render() {
    const { isOpen, onClose, selectedLanguage = 'english' } = this.props;
    
    if (!isOpen) return null;

    const translations = this.getTranslations();
    const lang = translations[selectedLanguage] || translations['english'];

    return (
      <div className="submission-success-modal-overlay" onClick={onClose}>
        <div className="submission-success-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Success Icon */}
          <div className="submission-success-modal-icon">
            <div className="success-icon">
              <svg
                viewBox="0 0 52 52"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="26" cy="26" r="25" fill="none" stroke="#22c55e" strokeWidth="2" />
                <polyline points="16,26 23,33 36,20" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Header */}
          <h1 className="submission-success-modal-title">
            {lang.title}
          </h1>

          {/* Success Message */}
          <p className="submission-success-modal-message">
            {lang.message}
          </p>

          {/* Action Button */}
          <div className="submission-success-modal-actions">
            <button
              className="submission-success-modal-button"
              onClick={onClose}
            >
              {lang.button}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default SubmissionSuccessPopup;