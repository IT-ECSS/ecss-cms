import React from 'react';
import axios from 'axios';
import '../../../css/fftCreateEvent.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class CreateEventForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      eventDate: '',
      eventLocation: '',
      eventSessionNumber: '',
      eventLocationDropdownOpen: false,
      eventError: null,
      eventResult: null,
      eventSubmitting: false
    };
  }

  handleEventSubmit = async () => {
    const { eventDate, eventLocation, eventSessionNumber } = this.state;

    // Validation
    if (!eventDate || !eventLocation || !eventSessionNumber) {
      this.setState({ eventError: 'Please fill in all fields' });
      return;
    }

    // Validate date format (yyyy/mm/dd)
    const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
    if (!dateRegex.test(eventDate)) {
      this.setState({ eventError: 'Date must be in format yyyy/mm/dd' });
      return;
    }

    const eventName = `${eventDate} ${eventLocation} FFT Session ${eventSessionNumber}`;
    console.log('Create Event Submitted:', eventName);

    this.setState({ eventSubmitting: true, eventError: null, eventResult: null });

    try {
      // Get current date and time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const createdOn = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;

      // Call backend to insert into Google Sheets
      const response = await axios.post(`${BACKEND_URL}/googleDrive/appendEventRow`, {
        fileId: '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo',
        eventName: eventName,
        createdOn: createdOn,
        sheetName: 'Sheet1'
      });

      const result = response.data;

      this.setState({
        eventSubmitting: false,
        eventResult: `Event created: ${eventName} (S/N: ${result.serialNumber})`,
        eventDate: '',
        eventLocation: '',
        eventSessionNumber: '',
      });
    } catch (error) {
      console.error('Error creating event:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save to Google Sheets';
      this.setState({
        eventSubmitting: false,
        eventError: `Error: ${errorMessage}`
      });
    }
  };

  render() {
    const {
      eventDate,
      eventLocation,
      eventSessionNumber,
      eventLocationDropdownOpen,
      eventError,
      eventResult,
      eventSubmitting
    } = this.state;

    const { onCancel } = this.props;

    return (
      <div className="fft-create-event-container">
        <h2 className="fft-create-event-title">Create Event</h2>

        {/* Date Field */}
        <div className="fft-create-event-field">
          <label className="fft-create-event-label">Date (yyyy/mm/dd)</label>
          <input
            type="text"
            placeholder="e.g., 2026/03/10"
            value={eventDate}
            onChange={(e) => {
              const value = e.target.value;
              // Remove all non-digit characters
              let digitsOnly = value.replace(/\D/g, '');
              // Limit to 8 digits (yyyymmdd)
              digitsOnly = digitsOnly.slice(0, 8);
              // Re-format with slashes
              let formatted = '';
              if (digitsOnly.length > 0) {
                formatted = digitsOnly.slice(0, 4);
                if (digitsOnly.length >= 5) {
                  formatted += '/' + digitsOnly.slice(4, 6);
                }
                if (digitsOnly.length >= 7) {
                  formatted += '/' + digitsOnly.slice(6, 8);
                }
              }
              this.setState({ eventDate: formatted });
            }}
            className="fft-create-event-input"
          />
        </div>

        {/* Location Dropdown (Custom) */}
        <div className="fft-create-event-field">
          <label className="fft-create-event-label">Location</label>
          <div className="fft-create-event-location-wrapper">
            <div
              onClick={() => this.setState({ eventLocationDropdownOpen: !eventLocationDropdownOpen })}
              className="fft-create-event-location-trigger"
            >
              <span>{eventLocation || 'Select a location'}</span>
              <i className={`fas fa-chevron-${eventLocationDropdownOpen ? 'up' : 'down'}`} style={{ color: '#666' }}></i>
            </div>
            
            {eventLocationDropdownOpen && (
              <div className="fft-create-event-location-dropdown">
                {['CTH', 'PRW', 'TNC'].map((location) => (
                  <div
                    key={location}
                    onClick={() => this.setState({ eventLocation: location, eventLocationDropdownOpen: false })}
                    className={`fft-create-event-location-item ${eventLocation === location ? 'active' : ''}`}
                  >
                    {location}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session Number Field */}
        <div className="fft-create-event-field-last">
          <label className="fft-create-event-label">Session Number</label>
          <input
            type="text"
            placeholder="e.g., 1"
            value={eventSessionNumber}
            onChange={(e) => this.setState({ eventSessionNumber: e.target.value })}
            className="fft-create-event-input"
          />
        </div>

        {/* Error Message */}
        {eventError && (
          <div className="fft-create-event-error">
            {eventError}
          </div>
        )}

        {/* Buttons Row */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ 
              flex: 1,
              padding: '16px 28px', 
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#e0e0e0')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => this.handleEventSubmit()}
            disabled={eventSubmitting}
            style={{ 
              flex: 1,
              padding: '16px 28px', 
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'background-color 0.3s',
              opacity: eventSubmitting ? 0.6 : 1
            }}
            onMouseOver={(e) => !eventSubmitting && (e.target.style.backgroundColor = '#45a049')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#4CAF50')}
          >
            {eventSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    );
  }
}

export default CreateEventForm;
