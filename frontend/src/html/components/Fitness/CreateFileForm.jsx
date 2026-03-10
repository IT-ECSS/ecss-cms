import React from 'react';
import axios from 'axios';
import '../../../css/fftCreateFileForm.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const SPREADSHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';

class CreateFileForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      events: [],
      loadingEvents: false,
      eventError: null,
    };
  }

  componentDidMount() {
    this.fetchEvents();
  }

  fetchEvents = async () => {
    this.setState({ loadingEvents: true, eventError: null });
    try {
      const response = await axios.post(`${BACKEND_URL}/googleDrive/readSpreadsheet`, {
        fileId: SPREADSHEET_ID,
        sheetName: 'Sheet1',
      });

      if (response.data.success && response.data.values) {
        const rows = response.data.values;
        // Skip header row and map data
        const eventList = rows.slice(1).filter(row => row.length > 0).map((row, index) => ({
          sn: row[0] || '',
          eventName: row[1] || '',
          createdOn: row[2] || '',
        }));
        this.setState({ events: eventList, loadingEvents: false });
      } else {
        this.setState({ eventError: 'Unable to load events', loadingEvents: false });
      }
    } catch (err) {
      this.setState({ eventError: err.message, loadingEvents: false });
    }
  }

  render() {
    const { events, loadingEvents, eventError } = this.state;

    return (
      <div className="fft-create-file-form">
        {/* ── Step 1: Display Events ── */}
        <div className="fft-participants-section">
          <div className="fft-participants-section-header">
            <span className="fft-participants-section-number">1</span>
            <h3 className="fft-participants-section-title">Events List</h3>
          </div>

          {loadingEvents && (
            <div className="fft-admin-loading">
              <i className="fas fa-spinner fa-spin"></i> Loading events...
            </div>
          )}

          {eventError && (
            <div className="fft-admin-result fft-admin-result--error">
              <i className="fas fa-exclamation-circle"></i>
              <div>
                <p className="fft-admin-result-title">Error</p>
                <p className="fft-admin-result-detail">{eventError}</p>
              </div>
            </div>
          )}

          {!loadingEvents && events.length > 0 && (
            <div className="fft-events-table-container">
              <table className="fft-events-table">
                <thead>
                  <tr>
                    <th>S/N</th>
                    <th>Event Name</th>
                    <th>Created On</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={index}>
                      <td>{event.sn}</td>
                      <td>{event.eventName}</td>
                      <td>{event.createdOn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadingEvents && events.length === 0 && !eventError && (
            <div className="fft-admin-result fft-admin-result--warning">
              <i className="fas fa-info-circle"></i>
              <div>
                <p className="fft-admin-result-title">No Events</p>
                <p className="fft-admin-result-detail">No events found in the spreadsheet</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default CreateFileForm;

