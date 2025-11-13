import React, { Component } from 'react';
import '../../css/submissionProgressPopup.css';

class SubmissionProgressPopup extends Component {
  getTranslations = () => {
    const { selectedLanguage = 'english' } = this.props;
    
    const translations = {
      submittingInProgress: {
        english: 'Submitting in progress... Generating invoice',
        chinese: '正在提交中... 正在生成发票',
        malay: 'Sedang menghantar... Menjana invois'
      }
    };

    return translations;
  }

  render() {
    const { isOpen, onClose, selectedLanguage = 'english' } = this.props;
    
    if (!isOpen) return null;

    const translations = this.getTranslations();
    
    const modal = {
      type: 'progress',
      title: translations.submittingInProgress[selectedLanguage] || translations.submittingInProgress['english'],
      message: ''
    };

    return (
      <div className="progress-modal-overlay" onClick={onClose}>
        <div className="progress-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className={`progress-modal-icon ${modal.type}`}>
            {modal.title}
          </div>
          <div className="progress-modal-message">
            <div className="bouncing-balls">
              <div className="progress-ball progress-ball1"></div>
              <div className="progress-ball progress-ball2"></div>
              <div className="progress-ball progress-ball3"></div>
              <div className="progress-ball progress-ball4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default SubmissionProgressPopup;