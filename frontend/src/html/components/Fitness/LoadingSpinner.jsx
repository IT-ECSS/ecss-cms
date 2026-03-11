import React, { Component } from 'react';

class LoadingSpinner extends Component {
  // Props:
  //   message – optional string (default: 'Loading...')
  //   size    – optional font-size string (default: '2rem')

  render() {
    const { message = 'Loading...', size = '2rem' } = this.props;

    return (
      <div className="fft-result-entry-loading">
        <i className="fas fa-spinner fa-spin" style={{ fontSize: size }}></i>
        <p>{message}</p>
      </div>
    );
  }
}

export default LoadingSpinner;
