import React, { useState } from 'react';

const SelectionPopup = ({ title, message, options, onSubmit }) => {
  const [selectedValue, setSelectedValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!selectedValue) {
      setError('Please select an option');
      return;
    }

    onSubmit(selectedValue);
  };

  return (
    <div className="selection-popup">
      <div className="popup-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <select
          value={selectedValue}
          onChange={(e) => {
            setSelectedValue(e.target.value);
            setError('');
          }}
          className={error ? 'select-error' : ''}
        >
          <option value="">-- Select --</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="error-message">{error}</p>}
        <div className="selection-actions">
          <button className="submit-btn" onClick={handleSubmit}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionPopup;
