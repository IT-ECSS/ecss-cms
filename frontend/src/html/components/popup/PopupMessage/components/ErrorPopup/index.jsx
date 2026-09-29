import React from 'react';
import { fallbackToRemoteImage } from '@/utils/imageFallback';

const ErrorPopup = ({ message }) => {
  return (
    <div className="login-error-notification">
      <img src="/images/ecss/error.png" onError={(event) => fallbackToRemoteImage(event, 'https://ecss.org.sg/wp-content/uploads/2024/10/error-10376-2.png')} alt="Error" />
      <h2 className="error-title">Error!</h2>
      <p>{message}</p>
    </div>
  );
};

export default ErrorPopup;
