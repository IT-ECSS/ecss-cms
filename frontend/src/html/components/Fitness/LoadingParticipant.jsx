import React, { Component } from 'react';
import LoadingModal from '../Common/LoadingModal';

class LoadingParticipant extends Component {
  render() {
    const { visible } = this.props;
    return <LoadingModal visible={visible} message="Loading participant data..." />;
  }
}

export default LoadingParticipant;
