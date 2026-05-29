import React, { Component } from 'react';
import '../../../../../../css/sub/FitnessResult/Participants/actionButtonRow.css';

class ActionButtonRow extends Component {
  render() {
    const { onExport } = this.props;

    return (
      <div className="action-button-row-container">
        <div className="action-button-row">
          <button
            className="action-button-row-export"
            onClick={onExport}
            title="Export data to Excel"
          >
            Export to Excel
          </button>
        </div>
      </div>
    );
  }
}

export default ActionButtonRow;
