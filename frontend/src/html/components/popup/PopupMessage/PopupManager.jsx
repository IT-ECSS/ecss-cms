import React from 'react';
import LoadingPopup from '../components/LoadingPopup';
import SuccessPopup from '../components/SuccessPopup';
import ErrorPopup from '../components/ErrorPopup';
import ConfirmationPopup from '../components/ConfirmationPopup';
import InputPopup from '../components/InputPopup';
import SelectionPopup from '../components/SelectionPopup';
import './PopupManager.css';

const PopupManager = ({ popup, onClose }) => {
  if (!popup) return null;

  const handleBackdropClick = (e) => {
    if (e.target.className === 'popup-backdrop') {
      onClose();
    }
  };

  const handleConfirm = (result) => {
    if (popup.onConfirm) {
      popup.onConfirm(result);
    }
    onClose();
  };

  return (
    <div className="popup-backdrop" onClick={handleBackdropClick}>
      <div className="popup-container">
        {popup.type === 'loading' && <LoadingPopup message={popup.message} />}
        {popup.type === 'success' && <SuccessPopup message={popup.message} />}
        {popup.type === 'error' && <ErrorPopup message={popup.message} />}
        {popup.type === 'confirmation' && (
          <ConfirmationPopup
            title={popup.title}
            message={popup.message}
            buttonText={popup.buttonText}
            isDangerous={popup.isDangerous}
            onConfirm={() => handleConfirm(true)}
          />
        )}
        {popup.type === 'input' && (
          <InputPopup
            title={popup.title}
            message={popup.message}
            inputType={popup.inputType}
            placeholder={popup.placeholder}
            isPassword={popup.isPassword}
            onSubmit={handleConfirm}
          />
        )}
        {popup.type === 'selection' && (
          <SelectionPopup
            title={popup.title}
            message={popup.message}
            options={popup.options}
            onSubmit={handleConfirm}
          />
        )}
      </div>
    </div>
  );
};

export default PopupManager;
