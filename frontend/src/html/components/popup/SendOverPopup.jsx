import React, { Component } from "react";

class SendOverPopup extends Component {
  render() {
    const { isOpen, message, onConfirm, onCancel } = this.props;
    if (!isOpen) return null;
    return (
      <div className="sendOver-popup-overlay" onClick={onCancel}>
        <div className="sendOver-popup-content" onClick={e => e.stopPropagation()}>
          <p>{message || "Are you sure you have send this participant the payment advice?"}</p>
          <div className="sendOver-popup-buttons">
            <button className="sendOver-confirm-btn" onClick={onConfirm}>Confirm</button>
            <button className="sendOver-cancel-btn" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }
}

export default SendOverPopup;
