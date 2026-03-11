import React from 'react';
import axios from 'axios';
import '../../../css/fftCreateFileForm.css';
import LoadingModal from '../Common/LoadingModal';

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
      copying: false,
      copyResult: null,
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

      console.log('Fetch Events Response:', response.data);

      if (response.data.success && response.data.data) 
    {
        const rows = response.data.data;
        // Map data (no need to skip header since backend returns only data rows)
        const eventList = rows.filter(row => row.length > 0).map((row, index) => ({
          sn: row[0] || '',
          eventName: row[1] || '',
          createdOn: row[2] || '',
        }));
        console.log('Events loaded:', eventList);
        this.setState({ events: eventList, loadingEvents: false });
      } else {
        this.setState({ eventError: 'Unable to load events', loadingEvents: false });
      }
    } catch (err) {
      this.setState({ eventError: err.message, loadingEvents: false });
    }
  }

  handleCopyTemplate = async (event) => {
    this.setState({ copying: true, copyResult: null });
    const TEMPLATE_FILE_ID = '1xaTsyYx8rND25rMz8QUjlRxHO82TRQ8k5M3JIOg5KkQ';
    const FFT_ROOT_FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';
    let destinationFolderId = FFT_ROOT_FOLDER_ID;
    let newFileName = event.eventName;
    const eventYear = event.createdOn ? event.createdOn.slice(0, 4) : null;

    try {
      // Find year folder
      const yearFoldersRes = await axios.post(`${BACKEND_URL}/googleDrive`, {
        folderId: FFT_ROOT_FOLDER_ID,
        purpose: 'listSubfolders',
      });
      if (yearFoldersRes.data.success && yearFoldersRes.data.folders && eventYear) {
        const matchedYear = yearFoldersRes.data.folders.find(f => f.name.includes(eventYear));
        if (matchedYear) {
          // Find event folder inside year folder
          const eventFoldersRes = await axios.post(`${BACKEND_URL}/googleDrive`, {
            folderId: matchedYear.id,
            purpose: 'listSubfolders',
          });
          if (eventFoldersRes.data.success && eventFoldersRes.data.folders && eventFoldersRes.data.folders.length > 0) {
            const matchedEventFolder = eventFoldersRes.data.folders.find(f => f.name === event.eventName);
            if (matchedEventFolder) {
              destinationFolderId = matchedEventFolder.id;
            } else {
              destinationFolderId = matchedYear.id;
            }
          } else {
            destinationFolderId = matchedYear.id;
          }
        }
      }

      // Check if file already exists in destination folder
      const filesRes = await axios.post(`${BACKEND_URL}/googleDrive`, {
        folderId: destinationFolderId,
        purpose: 'listFiles',
      });
      if (filesRes.data.success && filesRes.data.files) {
        const fileExists = filesRes.data.files.some(f => f.name === newFileName);
        if (fileExists) {
          this.setState({ copying: false, copyResult: { error: 'A file with this name already exists. Cannot create a new one.' } });
          return;
        }
      }

      // Create/copy file
      const response = await axios.post(`${BACKEND_URL}/googleDrive/copySpreadsheet`, {
        sourceFileId: TEMPLATE_FILE_ID,
        newFileName,
        destinationFolderId,
      });

      // Only update result section, no alert
      if (response.data.success) {
        this.setState({ copying: false, copyResult: response.data });
      } else {
        this.setState({ copying: false, copyResult: { error: response.data.error } });
      }
    } catch (err) {
      this.setState({ copying: false, copyResult: { error: err.message } });
    }
  };

  render() {
    const { events, loadingEvents, eventError, copying, copyResult } = this.state;

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          {/* ── Step 1: Display Events ── */}
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">Select Event</h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                Please select the event for which you want to create a new file.
              </div>
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
              <div className="fft-events-buttons-container">
                {events.map((event, index) => (
                  <button
                    key={index}
                    className="fft-event-btn"
                    onClick={() => this.handleCopyTemplate(event)}
                  >
                    <div className="fft-event-btn-name">{event.eventName}</div>
                  </button>
                ))}
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
          {/* ── Step 2: Result section ── */}
          {copyResult && (
            <div className="fft-create-result-section">
              {copyResult.error ? (
                <div className="fft-admin-result fft-admin-result--error">
                  <i className="fas fa-exclamation-circle"></i>
                  <div>
                    <p className="fft-admin-result-title">Creation Failed</p>
                    <p className="fft-admin-result-detail">{copyResult.error}</p>
                  </div>
                </div>
              ) : (
                <div className="fft-admin-result fft-admin-result--success">
                  <i className="fas fa-check-circle"></i>
                  <div>
                    <p className="fft-admin-result-title">File Created</p>
                    <p className="fft-admin-result-detail">
                      New file: <a href={copyResult.fileUrl} target="_blank" rel="noopener noreferrer">{copyResult.fileName}</a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <LoadingModal visible={copying} message="Creating file..." />
      </div>
    );
  }
}

export default CreateFileForm;

