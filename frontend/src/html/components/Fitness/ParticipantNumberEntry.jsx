import React, { Component } from 'react';
import axios from 'axios';
import LoadingModal from '../Common/LoadingModal';
import fftTranslations from './fftTranslations';
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
    const { language, eventFileId, onSubmit } = this.props;

    if (!participantNumber.trim()) {
      this.setState({ error: fftTranslations.errorParticipantRequired[language] || fftTranslations.errorParticipantRequired.en });
      return;
    }

    this.setState({ loading: true, error: '' });

    try {
      // Use the file ID passed directly from the parent (already resolved in EventSelection)
      const fileId = eventFileId;
      if (!fileId) {
        this.setState({ 
          error: fftTranslations.errorEventDetails[language] || fftTranslations.errorEventDetails.en,
          loading: false 
        });
        return;
      }

      // Fetch participant data from backend using axios POST
      const response = await axios.post(`${BACKEND_URL}/googleDrive/participant/${participantNumber}`, { fileId });
      const participantData = response.data.data;

      // If the row exists but has no name, the participant hasn't registered yet
      if (!participantData || (!participantData.name && !participantData.chineseName)) {
        this.setState({
          error: fftTranslations.errorNotRegistered[language] || fftTranslations.errorNotRegistered.en,
          loading: false,
        });
        return;
      }
      
      // Call the parent handler with the participant number and retrieved data
      if (onSubmit) {
        onSubmit(participantNumber, participantData);
      }
      this.setState({ loading: false });
    } catch (err) {
      console.error('Error fetching participant data:', err);
      if (err.response?.status === 404) {
        this.setState({ 
          error: fftTranslations.errorParticipantNotFound[language] || fftTranslations.errorParticipantNotFound.en,
          loading: false 
        });
      } else {
        this.setState({ 
          error: fftTranslations.errorParticipantFetch[language] || fftTranslations.errorParticipantFetch.en,
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
          <h2 style={{ margin: 0, fontWeight: 700, width: '100%', textAlign: 'left' }}>{fftTranslations.participantNumberTitle[language] || fftTranslations.participantNumberTitle.en}</h2>
          <hr style={{ margin: '12px 0 12px 0', borderColor: '#ddd', border: 'none', borderTop: '1px solid #ddd', width: '100%' }} />
          <div style={{ margin: '0', color: '#444', width: '100%', textAlign: 'left' }}>{fftTranslations.participantNumberDesc[language] || fftTranslations.participantNumberDesc.en}</div>

          <div className="fft-participant-entry-manual-row" style={{ marginTop: '16px', width: '100%' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder={fftTranslations.participantNumberPlaceholder[language] || fftTranslations.participantNumberPlaceholder.en}
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
              {loading ? (fftTranslations.searching[language] || fftTranslations.searching.en) : (fftTranslations.submit[language] || fftTranslations.submit.en)}
            </button>
          </div>

          {error && (
            error === (fftTranslations.errorNotRegistered[language] || fftTranslations.errorNotRegistered.en) ? (
              <div style={{ marginTop: '8px', color: '#c0392b', fontWeight: 'bold', fontSize: '1.25rem', lineHeight: '1.6', whiteSpace: 'pre-line', width: '100%', textAlign: 'left' }}>
                {error}
              </div>
            ) : (
              <p style={{ marginTop: '8px', color: '#c0392b', fontSize: '1rem', width: '100%', textAlign: 'left' }}>
                {error}
              </p>
            )
          )}
        </div>
        <LoadingModal visible={loading} message={fftTranslations.searching?.[this.props.language] || 'Searching...'} />
      </>
    );
  }
}

export default ParticipantNumberEntry;
