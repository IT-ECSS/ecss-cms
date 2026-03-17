import React, { Component } from 'react';
import { io } from 'socket.io-client';
import StaffEntry from './StaffEntry';
import ParticipantResults from './ParticipantResults';
import '../../../css/fftTrainers.css';
import '../../../css/fftParticipants.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class ReviewParticipantsResult extends Component {
  storageKey = 'reviewParticipantsState';

  constructor(props) {
    super(props);
    
    // Try to restore state from localStorage
    let savedState = { event: null, entryNumber: null };
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        savedState = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not restore ReviewParticipantsResult state from localStorage');
    }
    
    this.state = {
      event: props.initialEvent || savedState.event,
      entryNumber: props.initialEntryNumber || savedState.entryNumber,
      hasError: false,
      isLoading: false,
    };
  }

  componentDidUpdate() {
    // Save state to localStorage whenever it changes
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        event: this.state.event,
        entryNumber: this.state.entryNumber,
      }));
    } catch (e) {
      console.warn('Could not save ReviewParticipantsResult state to localStorage');
    }
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
      this.setState({ entryNumber: null, hasError: false });
      this.notifyState(event, null);
    } else {
      this.setState({ event: null, hasError: false });
      this.notifyState(null, null);
    }
  };

  handleError = (hasError) => {
    this.setState({ hasError });
  };

  handleLoading = (isLoading) => {
    this.setState({ isLoading });
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
          <>
            <ParticipantResults
              fileId={event.id}
              entryNumber={entryNumber}
              onReset={this.handleReset}
              onError={this.handleError}
              onLoading={this.handleLoading}
            />
            {/* Back and Try Again buttons - footer style - only show when not loading */}
            {!this.state.isLoading && (
            <div style={{ padding: '16px', display: 'flex', gap: '12px', justifyContent: 'center', borderTop: '1px solid #e0e0e0', marginTop: '20px' }}>
              {this.state.hasError ? (
                <button
                  style={{
                    fontSize: '1.40625em',
                    padding: '12.5px 20px',
                    fontWeight: 'bold',
                    border: '3px solid #dc3545',
                    background: 'transparent',
                    color: '#dc3545',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: 'fit-content'
                  }}
                  onClick={this.handleReset}
                >
                  Try Again
                </button>
              ) : (
                <button
                  style={{
                    fontSize: '1.40625em',
                    fontWeight: 'bold',
                    padding: '12.5px 20px',
                    border: '3px solid #28a745',
                    background: 'transparent',
                    color: '#28a745',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: 'fit-content'
                  }}
                  onClick={this.handleBack}
                >
                  Back to Results
                </button>
              )}
            </div>
            )}
          </>
        )}
      </div>
    );
  }
}

export default ReviewParticipantsResult;
