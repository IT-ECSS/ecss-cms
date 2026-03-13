import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';
import '../../../css/fftCreateEvent.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class CreateEventForm extends React.Component {
    handleClear = () => {
      this.setState({
        eventDate: '',
        eventDateObj: null,
        eventLocation: '',
        eventSessionNumber: '',
        eventError: null,
        eventResult: null,
        eventSubmitting: false,
        eventLocationDropdownOpen: false,
        submitted: false
      });
      localStorage.removeItem('fftEventFormData');
    };
  constructor(props) {
    super(props);
    // Restore form data from localStorage if available
    const savedFormData = localStorage.getItem('fftEventFormData');
    let initialState = {
      eventDate: '', // yyyy/mm/dd string
      eventDateObj: null, // Date object for react-datepicker
      eventLocation: '',
      eventSessionNumber: '',
      eventLocationDropdownOpen: false,
      eventError: null,
      eventResult: null,
      eventSubmitting: false,
      submitted: false
    };
    
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        initialState = {
          ...initialState,
          eventDate: parsed.eventDate || '',
          eventLocation: parsed.eventLocation || '',
          eventSessionNumber: parsed.eventSessionNumber || ''
        };
      } catch (e) {
        console.warn('Failed to restore form data:', e);
      }
    }
    
    this.state = initialState;
  }

  componentDidMount() {
    // Restore eventDateObj when component mounts (DatePicker needs a Date object)
    if (this.state.eventDate) {
      const parts = this.state.eventDate.split('/');
      if (parts.length === 3) {
        const dateObj = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
        this.setState({ eventDateObj: dateObj });
      }
    }
  }

  saveFormToLocalStorage = () => {
    const { eventDate, eventLocation, eventSessionNumber } = this.state;
    localStorage.setItem('fftEventFormData', JSON.stringify({
      eventDate,
      eventLocation,
      eventSessionNumber
    }));
  };

  handleEventSubmit = async () => {
    const { eventDate, eventLocation, eventSessionNumber } = this.state;

    this.setState({ submitted: true });

    // Validation
    if (!eventDate || !eventLocation || !eventSessionNumber) {
      // Do not show a general error message, only field-level messages
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

      // Success: reset form fields immediately
      this.setState({
        eventSubmitting: false,
        eventResult: eventName,
        eventDate: '',
        eventDateObj: null,
        eventLocation: '',
        eventSessionNumber: '',
        eventLocationDropdownOpen: false,
        submitted: false
      });
      localStorage.removeItem('fftEventFormData');
    } catch (error) {
      console.error('Error creating event:', error);
      let errorMessage = error.response?.data?.error || error.message || 'Failed to save to Google Sheets';
      // Custom error for duplicate event name
      if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('duplicate')) {
        errorMessage = 'FFT results file is not created. An event with the same details already exists. Please indicate a different session.';
      }
      // Error: keep form fields, show error message
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
      eventSubmitting,
      submitted
    } = this.state;

    const { onCancel } = this.props;

    const dateInvalid = eventDate === '' || !/^\d{4}\/\d{2}\/\d{2}$/.test(eventDate);
    const locationInvalid = eventLocation === '';
    const sessionInvalid = eventSessionNumber === '' || isNaN(Number(eventSessionNumber));

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">Create A FFT Event</h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                Please fill in the details on the FFT event. 
              </div>
            </div>

            {/* Date Field */}
            <div className="fft-create-event-field">
              <label className="fft-create-event-label">Date (yyyy/mm/dd)</label>
              <DatePicker
                selected={this.state.eventDateObj}
                onChange={(date) => {
                  if (eventSubmitting || !!eventResult) return;
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const formatted = `${year}/${month}/${day}`;
                    this.setState({ eventDateObj: date, eventDate: formatted }, this.saveFormToLocalStorage);
                  } else {
                    this.setState({ eventDateObj: null, eventDate: '' }, this.saveFormToLocalStorage);
                  }
                }}
                disabled={eventSubmitting || !!eventResult}
                customInput={
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g., 2026/03/10"
                    value={eventDate}
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      const paste = (e.clipboardData || window.clipboardData).getData('text');
                      if (/[^0-9]/.test(paste)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9]/g, '');
                      value = value.slice(0, 8);
                      let formatted = '';
                      if (value.length > 0) {
                        formatted = value.slice(0, 4);
                        if (value.length >= 5) {
                          formatted += '/' + value.slice(4, 6);
                        }
                        if (value.length >= 7) {
                          formatted += '/' + value.slice(6, 8);
                        }
                      }
                      let dateObj = null;
                      if (/^\d{4}\/\d{2}\/\d{2}$/.test(formatted)) {
                        const [y, m, d] = formatted.split('/');
                        dateObj = new Date(`${y}-${m}-${d}`);
                      }
                      this.setState({ eventDate: formatted, eventDateObj: dateObj }, this.saveFormToLocalStorage);
                    }}
                    className="fft-create-event-input"
                    disabled={eventSubmitting || !!eventResult}
                  />
                }
                dateFormat="yyyy/MM/dd"
                showPopperArrow={false}
                shouldCloseOnSelect={true}
                closeOnScroll={true}
                showMonthDropdown={true}
                showYearDropdown={true}
                dropdownMode="select"
                placeholderText="e.g., 2026/03/10"
                className="fft-create-event-input"
                style={{ width: '100%' }}
              />
              {submitted && dateInvalid && (
                <div style={{ color: '#d32f2f', fontSize: '0.95em', marginTop: '4px' }}>
                  Please enter a valid date in yyyy/mm/dd format.
                </div>
              )}
            </div>

            {/* Location Dropdown (Custom) */}
            <div className="fft-create-event-field">
              <label className="fft-create-event-label">Select A Site</label>
              <div className="fft-create-event-location-wrapper">
                <div
                  onClick={() => !eventSubmitting && !eventResult && this.setState({ eventLocationDropdownOpen: !eventLocationDropdownOpen })}
                  className="fft-create-event-location-trigger"
                  style={{ pointerEvents: eventSubmitting || !!eventResult ? 'none' : 'auto', opacity: eventSubmitting || !!eventResult ? 0.6 : 1 }}
                >
                  <span>{eventLocation || 'Select a site'}</span>
                  <i className={`fas fa-chevron-${eventLocationDropdownOpen ? 'up' : 'down'}`} style={{ color: '#666' }}></i>
                </div>
                {eventLocationDropdownOpen && (
                  <div className="fft-create-event-location-dropdown">
                    {['CTH', 'PRW', 'TNC'].map((location) => (
                      <div
                        key={location}
                        onClick={() => !eventSubmitting && !eventResult && this.setState({ eventLocation: location, eventLocationDropdownOpen: false }, this.saveFormToLocalStorage)}
                        className={`fft-create-event-location-item ${eventLocation === location ? 'active' : ''}`}
                        style={{ pointerEvents: eventSubmitting || !!eventResult ? 'none' : 'auto', opacity: eventSubmitting || !!eventResult ? 0.6 : 1 }}
                      >
                        {location}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {submitted && locationInvalid && (
                <div style={{ color: '#d32f2f', fontSize: '0.95em', marginTop: '4px' }}>
                  Please select a location.
                </div>
              )}
            </div>

            {/* Session Number Field */}
            <div className="fft-create-event-field-last">
              <label className="fft-create-event-label">Session Number</label>
              <div style={{ color: '#888', fontSize: '0.95em', marginBottom: '4px' }}>
                If a site conducts more than one FFT event on the same day, use a different session number for each event (e.g., 1, 2, 3).
              </div>
              <input
                type="text"
                placeholder="e.g., 1"
                value={eventSessionNumber}
                onChange={(e) => this.setState({ eventSessionNumber: e.target.value }, this.saveFormToLocalStorage)}
                className="fft-create-event-input"
                disabled={eventSubmitting || !!eventResult}
              />
              {submitted && sessionInvalid && (
                <div style={{ color: '#d32f2f', fontSize: '0.95em', marginTop: '4px' }}>
                  Please enter a valid session number.
                </div>
              )}
            </div>

            {/* Result/Error Message */}
            {(eventResult || (eventError && typeof eventError === 'string' && eventError.includes('FFT results file is not created'))) && (
              <div className="fft-create-result-section">
                {eventResult ? (
                  <div className="fft-admin-result fft-admin-result--success">
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <p className="fft-admin-result-title">FFT Event Created!</p>
                      <p className="fft-admin-result-detail">Event name: {eventResult}</p>
                    </div>
                  </div>
                ) : (
                  <div className="fft-admin-result fft-admin-result--error" style={{ border: '1px solid #d32f2f', background: '#fff0f0', color: '#d32f2f', display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '6px' }}>
                    <i className="fas fa-times-circle" style={{ marginRight: '12px', fontSize: '1.5em' }}></i>
                    <div>
                      <p className="fft-admin-result-detail" style={{ color: '#d32f2f', marginBottom: '4px', fontWeight: 'bold' }}>FFT results file is not created</p>
                      <p className="fft-admin-result-detail" style={{ color: '#d32f2f' }}>An event with the same details already exists. Please select indicate a different session number if there are more than one FFT event occurring on the same day.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Other Error Message */}
            {eventError && !(typeof eventError === 'string' && eventError.includes('FFT results file is not created')) && (
              <div className="fft-create-event-error">
                {eventError}
              </div>
            )}

            {/* Buttons Row */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              {eventResult ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('fftEventFormData');
                      this.props.onFinish?.();
                    }}
                    className="fft-create-event-btn fft-create-event-btn-finish"
                    disabled={eventSubmitting}
                  >
                    Finish
                  </button>
                  <button
                    type="button"
                    onClick={() => this.setState({
                      eventError: null,
                      eventResult: null,
                      eventSubmitting: false,
                    })}
                    className="fft-create-event-btn fft-create-event-btn-clear"
                    disabled={eventSubmitting}
                  >
                    Create New FFT Event
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={this.handleClear}
                    className="fft-create-event-btn fft-create-event-btn-clear"
                    disabled={eventSubmitting || !!eventResult}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => this.handleEventSubmit()}
                    disabled={eventSubmitting || !!eventResult}
                    className="fft-create-event-btn fft-create-event-btn-create"
                  >
                    {eventSubmitting ? 'Creating...' : 'Create'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CreateEventForm;
