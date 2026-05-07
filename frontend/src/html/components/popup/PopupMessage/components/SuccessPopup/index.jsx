import React from 'react';

const SuccessPopup = ({ message }) => {
  return (
    <div className="success-popup-notification">
      <img src="https://ecss.org.sg/wp-content/uploads/2024/10/iqbf2fomkl6f65us70kdcann90.png" alt="Success" />
      <h2>Success!</h2>
      <p>{message}</p>
    </div>
  );
};

export default SuccessPopup;
