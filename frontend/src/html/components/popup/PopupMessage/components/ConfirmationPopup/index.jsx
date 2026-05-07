import React from 'react';

const ConfirmationPopup = ({ title, message, buttonText, onConfirm, isDangerous }) => {
  return (
    <div className="confirmation-popup">
      <div className="popup-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirmation-actions">
          <button 
            className={`confirm-btn ${isDangerous ? 'danger' : ''}`}
            onClick={onConfirm}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopup;
