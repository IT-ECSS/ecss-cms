import React, { Component } from 'react';
import { io } from 'socket.io-client';
import EventSelection from './EventSelection';
import StaffEntry from './StaffEntry';
import ParticipantResults from './ParticipantResults';
import '../../../css/fftTrainers.css';
import '../../../css/fftParticipants.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class ReviewParticipantsResult extends Component {
  constructor(props) {
    super(props);
    this.state = {
      event: props.initialEvent || null,
      entryNumber: props.initialEntryNumber || null,
    };
  }

  notifyState = (event, entryNumber) => {
    this.props.onStateChange && this.props.onStateChange(event, entryNumber);
  };

  handleSelectEvent = (evt) => {
    const { entryNumber } = this.state;
    this.setState({ event: evt });
    this.notifyState(evt, entryNumber);
  };

  handleLookup = (val) => {
    const num = parseInt(val, 10);
    if (!num || num < 1) return;
    this.setState({ entryNumber: num });
    this.notifyState(this.state.event, num);
  };

  handleReset = () => {
    this.setState({ entryNumber: null });
    this.notifyState(this.state.event, null);
  };

  resetEvent = () => {
    this.setState({ event: null, entryNumber: null });
    this.notifyState(null, null);
  };

  // Silent version: called when parent already updated state, just reset local UI (keeps entryNumber)
  resetEventSilent = () => {
    this.setState({ event: null });
  };

  canGoBack = () => {
    return !!(this.state.event || this.state.entryNumber);
  };

  handleBack = () => {
    const { event, entryNumber } = this.state;
    if (entryNumber) {
      this.setState({ entryNumber: null });
      this.notifyState(event, null);
    } else {
      this.setState({ event: null });
      this.notifyState(null, null);
    }
  };

  render() {
    const { event, entryNumber } = this.state;

    if (!event) {
      return (
        <EventSelection
          language="en"
          onSelectEvent={this.handleSelectEvent}
        />
      );
    }

    return (
      <div className="fft-trainers-form">

        {/* Entry search or results */}
        {!entryNumber ? (
          <StaffEntry onLookup={this.handleLookup} />
        ) : (
          <ParticipantResults
            fileId={event.id}
            entryNumber={entryNumber}
            onReset={this.handleReset}
          />
        )}
      </div>
    );
  }
}

export default ReviewParticipantsResult;
