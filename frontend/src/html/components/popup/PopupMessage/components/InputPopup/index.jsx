import React, { useState } from 'react';

const InputPopup = ({ title, message, inputType, placeholder, onSubmit, isPassword }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!inputValue.trim()) {
      setError('This field is required');
      return;
    }

    if (isPassword && inputValue.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    onSubmit(inputValue);
  };

  return (
    <div className="input-popup">
      <div className="popup-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <input
          type={inputType || 'text'}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError('');
          }}
          className={error ? 'input-error' : ''}
        />
        {error && <p className="error-message">{error}</p>}
        <div className="input-actions">
          <button className="submit-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputPopup;
