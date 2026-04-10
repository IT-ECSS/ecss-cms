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

      if (response.data.success && response.data.data) 
    {
        const rows = response.data.data;
        // Sheet columns: A=S/N, B=Event Name, C=Time Slots, D=Max Participants, E=Created On, F=File ID
        // "Created" = column F has a File ID
        const eventList = rows.filter(row => row.length > 0).map((row) => ({
          sn: row[0] || '',
          eventName: row[1] || '',
          timeSlots: row[2] || '',
          maxParticipants: row[3] || '',
          createdOn: row[4] || '',
          participantFileId: row[5] || '',
          status: row[5] ? 'Created' : 'Not Created',
        }));

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
    const newFileName = event.eventName;

    try {
      // Extract year — supports YYYY/MM/DD (year first) and DD/MM/YYYY (year last)
      const yearMatch = String(newFileName).match(/^(\d{4})[\/\-]/) ||
                        String(newFileName).match(/[\/\-](\d{4})(?:[\s\/\-]|$)/) ||
                        String(newFileName).match(/\b(20\d{2})\b/);
      let destinationFolderId = FFT_ROOT_FOLDER_ID;

      if (yearMatch) {
        const year = yearMatch[1];
        try {
          const yearFolderRes = await axios.post(`${BACKEND_URL}/googleDrive/getOrCreateYearFolder`, {
            parentFolderId: FFT_ROOT_FOLDER_ID,
            year,
          });
          if (yearFolderRes.data.success) {
            destinationFolderId = yearFolderRes.data.folderId;
          }
        } catch (yearErr) {
          console.warn('[FFT] Failed to get/create year folder, using root folder:', yearErr.message);
        }
      }

      // Copy template to the year (or root) folder
      const response = await axios.post(`${BACKEND_URL}/googleDrive/copySpreadsheet`, {
        sourceFileId: TEMPLATE_FILE_ID,
        newFileName,
        destinationFolderId,
      });

      // Only update result section, no alert
      if (response.data.success) {
        // Write File ID back to index sheet column E
        if (event.sn && response.data.fileId) {
          try {
            await axios.post(`${BACKEND_URL}/googleDrive/updateEventFileId`, {
              serialNumber: event.sn,
              fileId: response.data.fileId,
            });
          } catch (updateErr) {
            console.warn('Failed to update index sheet with file ID:', updateErr.message);
          }
        }
        // Mark event as created
        this.setState(prev => ({
          copying: false,
          copyResult: response.data,
          events: prev.events.map(ev =>
            ev.eventName === event.eventName ? { ...ev, status: 'Created', participantFileId: response.data.fileId } : ev
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
              <h3 className="fft-participants-section-title">Select A FFT Event</h3>
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
                {events.map((event, index) => {
                  const isCreated = event.status === 'Created';
                  return (
                    <button
                      key={index}
                      className={`fft-event-btn${isCreated ? ' fft-event-btn-created' : ''}`}
                      onClick={isCreated ? undefined : () => this.handleCopyTemplate(event)}
                      disabled={isCreated}
                      style={isCreated ? { cursor: 'not-allowed' } : {}}
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
                        {isCreated ? (
                          <>
                            {/* FontAwesome v5 check-square (grey) */}
                            <i className="fas fa-check-square" style={{ color: '#bbb', fontSize: '1.4em' }}></i>
                            <span style={{ color: '#bbb', fontSize: '1.15em' }}>Created</span>
                          </>
                        ) : (
                          <>
                            {/* FontAwesome v5 check-empty (green) */}
                            <i className="far fa-square" style={{ color: '#388e3c', fontSize: '1.4em' }}></i>
                            <span style={{ color: '#388e3c', fontSize: '1em' }}>Not Created</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
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

