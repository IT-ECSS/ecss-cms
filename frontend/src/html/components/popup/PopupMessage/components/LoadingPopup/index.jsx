import React from 'react';

const LoadingPopup = ({ message }) => {
  return (
    <div className="loading-popup">
      <h2>{message}</h2>
      <div className="bouncing-circles">
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
      </div>
    </div>
  );
};

export default LoadingPopup;
