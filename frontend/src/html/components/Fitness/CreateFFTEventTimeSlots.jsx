import React from 'react';
import axios from 'axios';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class CreateFFTEventTimeSlots extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      numberOfTimeslots: '',
      participantsPerTimeslot: '',
      timeslotTimes: [],
      submitted: false,
      submitting: false,
      verifyingLinks: false,
      submitResult: null,
      submitError: null,
    };
  }

  sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  isOpenableHttpUrl = (value) => {
    if (!value) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  buildQrPreviewUrl = (fileId, fallbackUrl = '') => {
    if (fileId) return `https://drive.google.com/uc?export=view&id=${fileId}`;
    return fallbackUrl || '';
  };

  verifyUrlCanOpen = async (url, { expectImage = false } = {}) => {
    if (!this.isOpenableHttpUrl(url)) return false;

    if (expectImage) {
      return new Promise((resolve) => {
        const img = new Image();
        const separator = url.includes('?') ? '&' : '?';
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.referrerPolicy = 'no-referrer';
        img.src = `${url}${separator}ts=${Date.now()}`;
      });
    }

    try {
      await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
      return true;
    } catch {
      return false;
    }
  };

  waitForRequiredLinks = async ({ fileUrl, registrationLink, qrCodeImageUrl }) => {
    let finalStatus = { fileUrl: false, registrationLink: false, qrCodeImageUrl: false };

    for (let attempt = 0; attempt < 4; attempt++) {
      const [fileOk, registrationOk, qrOk] = await Promise.all([
        this.verifyUrlCanOpen(fileUrl),
        this.verifyUrlCanOpen(registrationLink),
        this.verifyUrlCanOpen(qrCodeImageUrl, { expectImage: true }),
      ]);

      finalStatus = {
        fileUrl: fileOk,
        registrationLink: registrationOk,
        qrCodeImageUrl: qrOk,
      };

      if (fileOk && registrationOk && qrOk) {
        return finalStatus;
      }

      if (attempt < 3) {
        await this.sleep(1200);
      }
    }

    return finalStatus;
  };

  handleTimeslotsChange = (value) => {
    const count = parseInt(value, 10);
    this.setState((prev) => {
      const existing = prev.timeslotTimes;
      let updated;
      if (!isNaN(count) && count > 0) {
        updated = Array.from({ length: count }, (_, i) => existing[i] || { start: '', end: '' });
      } else {
        updated = [];
      }
      return { numberOfTimeslots: value, timeslotTimes: updated };
    });
  };

  handleTimeChange = (index, field, value) => {
    this.setState((prev) => {
      const updated = prev.timeslotTimes.map((slot, i) => {
        if (i !== index) return slot;
        const newSlot = { ...slot, [field]: value };
        if (field === 'start' && value) {
          const [h, m] = value.split(':').map(Number);
          const endH = (h + 1) % 24;
          newSlot.end = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        return newSlot;
      });

      // Determine the end time of the changed slot, then cascade through all subsequent slots
      const changedEnd = updated[index].end;
      if (changedEnd) {
        let prevEnd = changedEnd;
        for (let i = index + 1; i < updated.length; i++) {
          const [h, m] = prevEnd.split(':').map(Number);
          const endH = (h + 1) % 24;
          const nextEnd = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          updated[i] = { ...updated[i], start: prevEnd, end: nextEnd };
          prevEnd = nextEnd;
        }
      }

      return { timeslotTimes: updated };
    });
  };

  handleSubmit = async () => {
    const { numberOfTimeslots, participantsPerTimeslot, timeslotTimes } = this.state;
    const { eventDate, eventLocation, eventSessionNumber } = this.props;

    this.setState({ submitted: true, submitResult: null, submitError: null });

    // Validate top-level fields
    const parsedParticipants = parseInt(participantsPerTimeslot, 10);
    const parsedSlots = parseInt(numberOfTimeslots, 10);
    if (
      participantsPerTimeslot.trim() === '' || isNaN(parsedParticipants) || parsedParticipants < 1 ||
      numberOfTimeslots.trim() === '' || isNaN(parsedSlots) || parsedSlots < 1
    ) return;

    // Validate each time slot
    const hasSlotErrors = timeslotTimes.some(
      slot => !slot.start || !slot.end || slot.end <= slot.start
    );
    if (hasSlotErrors) return;

    this.setState({ submitting: true, verifyingLinks: false });

    try {
      const eventName = `${eventDate} ${eventLocation} FFT Session ${eventSessionNumber}`;
      const timeSlotsStr = timeslotTimes
        .map((slot, i) => `Slot ${i + 1}: ${slot.start}-${slot.end}`)
        .join(', ');

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const createdOn = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const response = await axios.post(`${BACKEND_URL}/googleDrive/createFFTEvent`, {
        eventName,
        timeSlots: timeSlotsStr,
        maxParticipants: parsedParticipants,
        createdOn,
      });

      const { serialNumber } = response.data;

      // Automatically create the Google Sheet file for this event
      const TEMPLATE_FILE_ID = '1xaTsyYx8rND25rMz8QUjlRxHO82TRQ8k5M3JIOg5KkQ';
      const FFT_ROOT_FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';

      const yearMatch = String(eventName).match(/^(\d{4})[\/\-]/) ||
                        String(eventName).match(/[\/\-](\d{4})(?:[\s\/\-]|$)/) ||
                        String(eventName).match(/\b(20\d{2})\b/);
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

      const copyResponse = await axios.post(`${BACKEND_URL}/googleDrive/copySpreadsheet`, {
        sourceFileId: TEMPLATE_FILE_ID,
        newFileName: eventName,
        destinationFolderId,
      });

      if (!copyResponse.data?.success || !copyResponse.data?.fileId || !copyResponse.data?.fileUrl) {
        throw new Error('The FFT event sheet was created, but the file link is not ready yet. Please try again in a moment.');
      }

      const FRONTEND_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://salmon-wave-09f02b100.6.azurestaticapps.net';
      const registrationLink = `${FRONTEND_URL}/fft/form?event=${encodeURIComponent(eventName)}`;

      if (!this.isOpenableHttpUrl(registrationLink)) {
        throw new Error('The registration link could not be generated correctly.');
      }

      // Generate & upload QR code PNG to the dedicated QR code Drive folder
      const QR_FOLDER_ID = '1pYiCfYdCKGFoAmoQ64IDx05Mf8Omj88R';
      let qrCodeUrl = '';
      let qrCodeImageUrl = '';
      try {
        const qrRes = await axios.post(`${BACKEND_URL}/qrcode`, {
          purpose: eventName,
          registrationLink,
          folderId: QR_FOLDER_ID,
        });
        if (qrRes.data.success) {
          qrCodeUrl = qrRes.data.fileUrl || '';
          qrCodeImageUrl = qrRes.data.previewUrl || this.buildQrPreviewUrl(qrRes.data.fileId, qrCodeUrl);
        }
      } catch (qrErr) {
        console.warn('[FFT] Failed to upload QR code:', qrErr.message);
      }

      if (copyResponse.data.success && serialNumber && copyResponse.data.fileId) {
        try {
          await axios.post(`${BACKEND_URL}/googleDrive/updateEventFileId`, {
            serialNumber,
            fileId: copyResponse.data.fileId,
            registrationLink,
            qrCodeUrl,
          });
        } catch (updateErr) {
          console.warn('[FFT] Failed to update index sheet with file ID:', updateErr.message);
        }
      }

      this.setState({ verifyingLinks: true });

      const linkStatus = await this.waitForRequiredLinks({
        fileUrl: copyResponse.data.fileUrl,
        registrationLink,
        qrCodeImageUrl,
      });

      const linksVerified = linkStatus.fileUrl && linkStatus.registrationLink && linkStatus.qrCodeImageUrl;

      this.setState({
        submitting: false,
        verifyingLinks: false,
        submitResult: {
          ...response.data,
          registrationLink,
          fileUrl: copyResponse.data.fileUrl || null,
          fileName: copyResponse.data.fileName || eventName,
          qrCodeUrl,
          qrCodeImageUrl,
          linksVerified,
        },
      });
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Failed to create event';
      this.setState({ submitting: false, verifyingLinks: false, submitError: msg });
    }
  };

  render() {
    const { eventDate, eventLocation, eventSessionNumber, onBack } = this.props;
    const { numberOfTimeslots, participantsPerTimeslot, timeslotTimes, submitted, submitting, verifyingLinks, submitResult, submitError } = this.state;

    const parsedParticipants = parseInt(participantsPerTimeslot, 10);
    const parsedSlots = parseInt(numberOfTimeslots, 10);

    const participantsInvalid = participantsPerTimeslot.trim() === '' || isNaN(parsedParticipants) || parsedParticipants < 1;
    const slotsInvalid = numberOfTimeslots.trim() === '' || isNaN(parsedSlots) || parsedSlots < 1;
    const fieldRowStyle = { display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px 16px' };
    const fieldLabelStyle = { flex: '1 1 240px', minWidth: 0, margin: 0, display: 'flex', alignItems: 'center' };
    const fieldInputStyle = { flex: '1 1 220px', minWidth: 0, width: '100%' };
    const fieldErrorStyle = { color: '#d32f2f', fontSize: '0.9em', marginTop: '6px', paddingLeft: 0 };

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-section">
          <div className="fft-participants-section-header">
            <h3 className="fft-participants-section-title">Create FFT Time Slots</h3>
            <hr style={{ margin: '12px 0' }} />
            <p style={{ color: '#555', fontSize: '0.95rem', margin: '6px 0 0' }}>
              Define the number of time slots and the maximum participants allowed per slot for this FFT event.
            </p>
          </div>

          {/* Participants Per Time Slot */}
          <div style={{ marginTop: '20px' }}>
            <div style={fieldRowStyle}>
              <label className="fft-create-event-label" style={fieldLabelStyle}>Number of Participants per Time Slot</label>
              <input
                type="text"
                placeholder="e.g., 10"
                value={participantsPerTimeslot}
                onChange={(e) => this.setState({ participantsPerTimeslot: e.target.value })}
                className="fft-create-event-input"
                style={{ ...fieldInputStyle, borderColor: submitted && participantsInvalid ? '#d32f2f' : undefined }}
              />
            </div>
            {submitted && participantsInvalid && (
              <div style={fieldErrorStyle}>
                Please enter a valid number of participants (minimum 1).
              </div>
            )}
          </div>

          {/* Number of Time Slots */}
          {(participantsPerTimeslot.trim() !== '' || numberOfTimeslots.trim() !== '') && (
            <div style={{ marginTop: '16px' }}>
              <div style={fieldRowStyle}>
                <label className="fft-create-event-label" style={fieldLabelStyle}>Number of Time Slots</label>
                <input
                  type="text"
                  placeholder="e.g., 5"
                  value={numberOfTimeslots}
                  onChange={(e) => this.handleTimeslotsChange(e.target.value)}
                  className="fft-create-event-input"
                  style={{ ...fieldInputStyle, borderColor: submitted && slotsInvalid ? '#d32f2f' : undefined }}
                />
              </div>
              {submitted && slotsInvalid && (
                <div style={fieldErrorStyle}>
                  Please enter a valid number of time slots (minimum 1).
                </div>
              )}
            </div>
          )}

          {/* Time Slot List */}
          {timeslotTimes.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#333', marginBottom: '12px' }}>Time Slot Schedule</div>
              <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                {timeslotTimes.map((slot, i) => {
                  const startInvalid = submitted && slot.start.trim() === '';
                  const endInvalid = submitted && slot.end.trim() === '';
                  const endBeforeStart = submitted && slot.start && slot.end && slot.end <= slot.start;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                        background: '#f9f9f9', border: `1px solid ${(startInvalid || endInvalid || endBeforeStart) ? '#d32f2f' : '#e0e0e0'}`,
                        borderRadius: '8px', padding: '12px 16px',
                      }}>
                        {/* Slot number badge */}
                        <div style={{
                          minWidth: '36px', height: '36px', borderRadius: '50%',
                          color: '#1565c0', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.95rem', flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>

                        {/* Start time */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <label style={{ fontSize: '0.9rem', color: '#555', whiteSpace: 'nowrap' }}>Start</label>
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => this.handleTimeChange(i, 'start', e.target.value)}
                            className="fft-create-event-input"
                            style={{ flex: 1, padding: '10px 12px', borderColor: startInvalid ? '#d32f2f' : undefined }}
                          />
                        </div>

                        <span style={{ color: '#999', fontWeight: 600 }}>–</span>

                        {/* End time */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px', minWidth: 0 }}>
                          <label style={{ fontSize: '0.9rem', color: '#555', whiteSpace: 'nowrap' }}>End</label>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => this.handleTimeChange(i, 'end', e.target.value)}
                            className="fft-create-event-input"
                            style={{ flex: 1, padding: '10px 12px', borderColor: (endInvalid || endBeforeStart) ? '#d32f2f' : undefined }}
                          />
                        </div>
                      </div>
                      {startInvalid && (
                        <div style={{ color: '#d32f2f', fontSize: '0.85em', paddingLeft: '8px' }}>Slot {i + 1}: Start time is required.</div>
                      )}
                      {endInvalid && (
                        <div style={{ color: '#d32f2f', fontSize: '0.85em', paddingLeft: '8px' }}>Slot {i + 1}: End time is required.</div>
                      )}
                      {endBeforeStart && (
                        <div style={{ color: '#d32f2f', fontSize: '0.85em', paddingLeft: '8px' }}>Slot {i + 1}: End time must be after start time.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result / Error */}
          {submitResult && (
            <div className="fft-create-result-section">
              <div className={`fft-admin-result ${submitResult.linksVerified ? 'fft-admin-result--success' : 'fft-admin-result--warning'}`}>
                <i className={submitResult.linksVerified ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'}></i>
                <div style={{ minWidth: 0, width: '100%' }}>
                  <p className="fft-admin-result-title">
                    {submitResult.linksVerified ? 'FFT Event Created Successfully!' : 'FFT Event Created — waiting for link verification'}
                  </p>
                  {!submitResult.linksVerified && (
                    <p className="fft-admin-result-detail">
                      The event file was created, but the file, registration link, or QR code image is not fully openable yet.
                    </p>
                  )}
                  {submitResult.fileUrl ? (
                    <p className="fft-admin-result-detail">
                      File name: <a href={submitResult.fileUrl} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>{submitResult.fileName}</a>
                    </p>
                  ) : (
                    <p className="fft-admin-result-detail">File name: {submitResult.fileName}</p>
                  )}
                  {submitResult.registrationLink && (
                    <p className="fft-admin-result-detail" style={{ marginTop: '4px', overflowWrap: 'anywhere' }}>
                      Registration link: <a href={submitResult.registrationLink} target="_blank" rel="noopener noreferrer">{submitResult.registrationLink}</a>
                    </p>
                  )}
                  {(submitResult.qrCodeUrl || submitResult.qrCodeImageUrl) && (
                    <div style={{ marginTop: '12px' }}>
                      <p className="fft-admin-result-detail" style={{ marginBottom: '8px' }}>
                        QR code: <a href={submitResult.qrCodeUrl || submitResult.qrCodeImageUrl} target="_blank" rel="noopener noreferrer">Open QR code image</a>
                      </p>
                      {submitResult.qrCodeImageUrl && (
                        <a
                          href={submitResult.qrCodeUrl || submitResult.qrCodeImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', border: '1px solid #d9e2db', borderRadius: '10px', background: '#fff', padding: '8px' }}
                        >
                          <img
                            src={submitResult.qrCodeImageUrl}
                            alt={`QR code for ${submitResult.fileName}`}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            style={{ width: '160px', maxWidth: '100%', height: '160px', objectFit: 'contain', display: 'block' }}
                          />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {submitError && (
            <div style={{
              marginTop: '24px', padding: '16px 20px', borderRadius: '8px',
              background: '#fff0f0', border: '1px solid #d32f2f', color: '#d32f2f',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <i className="fas fa-times-circle" style={{ fontSize: '1.3rem' }}></i>
              <span>{submitError}</span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {submitResult ? (
              <button
                type="button"
                onClick={this.props.onFinish}
                className="fft-create-event-btn fft-create-event-btn-finish"
                style={{ flex: '1 1 180px' }}
              >
                Finish
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onBack}
                  disabled={submitting}
                  className="fft-create-event-btn fft-create-event-btn-clear"
                  style={{ flex: '1 1 180px' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={this.handleSubmit}
                  disabled={submitting}
                  className="fft-create-event-btn fft-create-event-btn-create"
                  style={{ flex: '1 1 180px' }}
                >
                  {submitting ? (verifyingLinks ? 'Verifying links...' : 'Submitting...') : 'Submit'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default CreateFFTEventTimeSlots;
