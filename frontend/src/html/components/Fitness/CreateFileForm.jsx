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
          status: 'Not Created', // default status
        }));

        // Check file existence for each event
        const FFT_ROOT_FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';
        const updatedEvents = await Promise.all(eventList.map(async (event) => {
          const eventYear = event.createdOn ? event.createdOn.slice(0, 4) : null;
          let destinationFolderId = FFT_ROOT_FOLDER_ID;
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
            // Check if file exists
            const filesRes = await axios.post(`${BACKEND_URL}/googleDrive`, {
              folderId: destinationFolderId,
              purpose: 'listFiles',
            });
            if (filesRes.data.success && filesRes.data.files) {
              const fileExists = filesRes.data.files.some(f => f.name === event.eventName);
              return { ...event, status: fileExists ? 'Created' : 'Not Created' };
            }
          } catch (err) {
            console.warn('Error checking file existence for event:', event.eventName, err);
          }
          return event; // default to 'Not Created'
        }));

        console.log('Events loaded:', updatedEvents);
        this.setState({ events: updatedEvents, loadingEvents: false });
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
          // Mark event as created
          this.setState(prev => ({
            copying: false,
            copyResult: { error: 'A file with this name already exists. Cannot create a new one.' },
            events: prev.events.map(ev =>
              ev.eventName === event.eventName ? { ...ev, status: 'Created' } : ev
            )
          }));
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
        // Mark event as created
        this.setState(prev => ({
          copying: false,
          copyResult: response.data,
          events: prev.events.map(ev =>
            ev.eventName === event.eventName ? { ...ev, status: 'Created' } : ev
          )
        }));
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
              <h3 className="fft-participants-section-title">Select A FFT Event </h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                 Please select the FFT event to create a new Google Sheet file (to track participants results). 
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
                    className={`fft-event-btn${event.status === 'Created' ? ' fft-event-btn-created' : ''}`}
                    onClick={() => this.handleCopyTemplate(event)}
                  >
                   <div className="fft-event-btn-name">{event.eventName}</div>
                   <hr style={{ border: 0, borderTop: '1px solid rgba(0,0,0,0.25)', margin: '10px 0', width: '100%' }} />
                    <div
                      className="fft-event-btn-status"
                      style={{
                        marginTop: '10px',
                        fontSize: '1.15em',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}
                    >
                      {event.status === 'Created' ? (
                        <>
                          <i className="fas fa-check-circle" style={{ color: '#388e3c', fontSize: '1.15em' }}></i>
                          <span style={{ color: '#388e3c', fontSize: '1.15em' }}>Created</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-times-circle" style={{ color: '#d32f2f', fontSize: '1.15em' }}></i>
                          <span style={{ color: '#d32f2f', fontSize: '1em' }}>Not Created</span>
                        </>
                      )}
                    </div>
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
                  <i className="fas fa-times-circle" style={{ marginRight: '12px', fontSize: '1.5em' }}></i>
                  <div>
                    <p className="fft-admin-result-title" style={{ color: '#d32f2f', marginBottom: '4px', fontWeight: 'bold' }}>FFT results file is not created</p>
                    <p className="fft-admin-result-detail" style={{ color: '#d32f2f' }}>
                      A file with this name already exists. Please select another FFT event.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="fft-admin-result fft-admin-result--success">
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <p className="fft-admin-result-title">FFT results file created!</p>
                      <p className="fft-admin-result-detail">
                        File name: <a href={copyResult.fileUrl} target="_blank" rel="noopener noreferrer">{copyResult.fileName}</a>
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={this.props.onFinish}
                      className="fft-create-event-btn fft-create-event-btn-finish"
                    >
                      Finish
                    </button>
                  </div>
                </>
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

