import React from 'react';
import '../../../../../../css/sub/FitnessResult/Participants/actionButtons.css';

const ActionButtons = ({ onExport }) => {
  return (
    <div className="fft-action-buttons-container">
      <div className="fft-action-buttons-row">
        <button
          className="fft-action-button fft-action-button-export"
          onClick={onExport}
          title="Export data to Excel"
        >
          <i className="fas fa-download"></i>
          Export to Excel
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
