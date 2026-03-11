import React from 'react';
import '../../../css/fftLoadingModal.css';

class LoadingModal extends React.Component {
  render() {
    const { visible, message } = this.props;
    if (!visible) return null;
    return (
      <div className="fft-loading-modal-overlay">
        <div className="fft-loading-modal-content">
          <i className="fas fa-spinner fa-spin fft-loading-modal-spinner"></i>
          <div className="fft-loading-modal-message">{message || 'Loading...'}</div>
        </div>
      </div>
    );
  }
}

export default LoadingModal;
