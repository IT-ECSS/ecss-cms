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
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">Create Event</h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                Please fill in the details below to create a new event.
              </div>
            </div>

            {/* Date Field */}
            <div className="fft-create-event-field">
              <label className="fft-create-event-label">Date (yyyy/mm/dd)</label>
              <input
                type="text"
                placeholder="e.g., 2026/03/10"
                value={eventDate}
                onChange={(e) => {
                  const value = e.target.value;
                  let digitsOnly = value.replace(/\D/g, '');
                  digitsOnly = digitsOnly.slice(0, 8);
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

            {/* Result Message */}
            {eventResult && (
              <div className="fft-create-result-section">
                <div className="fft-admin-result fft-admin-result--success">
                  <i className="fas fa-check-circle"></i>
                  <div>
                    <p className="fft-admin-result-title">Event Created</p>
                    <p className="fft-admin-result-detail">{eventResult}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons Row */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={onCancel}
                className="fft-create-event-btn fft-create-event-btn-clear"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => this.handleEventSubmit()}
                disabled={eventSubmitting}
                className="fft-create-event-btn fft-create-event-btn-create"
              >
                {eventSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CreateEventForm;
