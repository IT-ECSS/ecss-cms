import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/fftParticipants.css';

// Determine backend URL based on environment
const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class ParticipantNumberEntry extends Component {
  constructor(props) {
    super(props);
    this.state = {
      participantNumber: '',
      error: '',
      loading: false
    };
  }

  handleInputChange = (e) => {
    this.setState({ participantNumber: e.target.value, error: '' });
  };

  handleSubmit = async () => {
    const { participantNumber } = this.state;
    const { language, eventName, eventFileId, onSubmit } = this.props;
    
    console.log('Submitting participant number:', participantNumber);
    console.log('Event name:', eventName);
    
    if (!participantNumber.trim()) {
      this.setState({ error: 'Participant number is required.' });
      return;
    }

    this.setState({ loading: true, error: '' });

    try {
      // Use the file ID passed directly from the parent (already resolved in EventSelection)
      const fileId = eventFileId;
      if (!fileId) {
        this.setState({ 
          error: 'Failed to retrieve event details. Please try again.',
          loading: false 
        });
        return;
      }

      console.log('Retrieved fileId:', fileId);

      // Fetch participant data from backend using axios POST
      const response = await axios.post(`${BACKEND_URL}/googleDrive/participant/${participantNumber}`, { fileId });
      
      console.log('Full backend response:', response.data);
      const participantData = response.data.data;
      console.log('Retrieved participant data:', participantData);
      
      // Call the parent handler with the participant number and retrieved data
      if (onSubmit) {
        onSubmit(participantNumber, participantData);
      }
      this.setState({ loading: false });
    } catch (err) {
      console.error('Error fetching participant data:', err);
      if (err.response?.status === 404) {
        this.setState({ 
          error: 'Participant not found. Please check the participant number.',
          loading: false 
        });
      } else {
        this.setState({ 
          error: 'Error retrieving participant data. Please try again.',
          loading: false 
        });
      }
    }
  };

  handleKeyPress = (e) => {
    if (e.key === 'Enter' && !this.state.loading) {
      this.handleSubmit();
    }
  };

  render() {
    const { participantNumber, error, loading } = this.state;
    const { language, eventName } = this.props;

    return (
      <>
        <div className="fft-participants-section">
          <h2 style={{ margin: 0, fontWeight: 700, width: '100%', textAlign: 'left' }}>Participant Number</h2>
          <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd', width: '100%' }} />
          <div style={{ margin: '0', color: '#444', width: '100%', textAlign: 'left' }}>Enter your participant's number which was provided to you to continue.</div>

          <div className="fft-participant-entry-manual-row" style={{ marginTop: '16px', width: '100%' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Participant #"
              id="fft-participant-entry-manual-input"
              className="fft-participant-entry-input fft-participant-entry-manual-input"
              value={participantNumber}
              onChange={this.handleInputChange}
              onKeyPress={this.handleKeyPress}
              disabled={loading}
            />
            <button
              className="fft-participant-entry-go-btn"
              onClick={this.handleSubmit}
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Submit'}
            </button>
          </div>

          {error && (
            <p style={{ marginTop: '8px', color: '#c0392b', fontSize: '1rem', width: '100%', textAlign: 'left' }}>
              {error}
            </p>
          )}
        </div>
      </>
    );
  }
}

export default ParticipantNumberEntry;
