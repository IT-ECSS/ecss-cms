import React from 'react';
import { fallbackToRemoteImage } from '@/utils/imageFallback';

const SuccessPopup = ({ message }) => {
  return (
    <div className="success-popup-notification">
      <img src="/images/ecss/success.png" onError={(event) => fallbackToRemoteImage(event, 'https://ecss.org.sg/wp-content/uploads/2024/10/iqbf2fomkl6f65us70kdcann90.png')} alt="Success" />
      <h2>Success!</h2>
      <p>{message}</p>
    </div>
  );
};

export default SuccessPopup;
