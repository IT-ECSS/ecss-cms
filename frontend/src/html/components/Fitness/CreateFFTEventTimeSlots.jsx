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
      submitResult: null,
      submitError: null,
    };
  }

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
      const updated = prev.timeslotTimes.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      );
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

    this.setState({ submitting: true });

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

      this.setState({ submitting: false, submitResult: response.data }, () => {
        this.props.onFinish?.();
      });
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Failed to create event';
      this.setState({ submitting: false, submitError: msg });
    }
  };

  render() {
    const { eventDate, eventLocation, eventSessionNumber, onBack } = this.props;
    const { numberOfTimeslots, participantsPerTimeslot, timeslotTimes, submitted, submitting, submitResult, submitError } = this.state;

    const parsedParticipants = parseInt(participantsPerTimeslot, 10);
    const parsedSlots = parseInt(numberOfTimeslots, 10);

    const participantsInvalid = participantsPerTimeslot.trim() === '' || isNaN(parsedParticipants) || parsedParticipants < 1;
    const slotsInvalid = numberOfTimeslots.trim() === '' || isNaN(parsedSlots) || parsedSlots < 1;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label className="fft-create-event-label" style={{ width: '300px', flexShrink: 0, margin: 0, display: 'flex', alignItems: 'center' }}>Number of Participants per Time Slot</label>
              <input
                type="text"
                placeholder="e.g., 10"
                value={participantsPerTimeslot}
                onChange={(e) => this.setState({ participantsPerTimeslot: e.target.value })}
                className="fft-create-event-input"
                style={{ flex: 1, borderColor: submitted && participantsInvalid ? '#d32f2f' : undefined }}
              />
            </div>
            {submitted && participantsInvalid && (
              <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: '4px', paddingLeft: '316px' }}>
                Please enter a valid number of participants (minimum 1).
              </div>
            )}
          </div>

          {/* Number of Time Slots */}
          {(participantsPerTimeslot.trim() !== '' || numberOfTimeslots.trim() !== '') && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label className="fft-create-event-label" style={{ width: '300px', flexShrink: 0, margin: 0, display: 'flex', alignItems: 'center' }}>Number of Time Slots</label>
                <input
                  type="text"
                  placeholder="e.g., 5"
                  value={numberOfTimeslots}
                  onChange={(e) => this.handleTimeslotsChange(e.target.value)}
                  className="fft-create-event-input"
                  style={{ flex: 1, borderColor: submitted && slotsInvalid ? '#d32f2f' : undefined }}
                />
              </div>
              {submitted && slotsInvalid && (
                <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: '4px', paddingLeft: '316px' }}>
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
                        display: 'flex', alignItems: 'center', gap: '12px',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
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
            <div style={{
              marginTop: '24px', padding: '16px 20px', borderRadius: '8px',
              background: '#e8f5e9', border: '1px solid #4caf50', color: '#2e7d32',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '1.3rem' }}></i>
                <strong style={{ fontSize: '1rem' }}>FFT Event Created Successfully!</strong>
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
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onBack}
              disabled={submitting}
              className="fft-create-event-btn fft-create-event-btn-clear"
            >
              Back
            </button>
            <button
              type="button"
              onClick={this.handleSubmit}
              disabled={submitting || !!submitResult}
              className="fft-create-event-btn fft-create-event-btn-create"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default CreateFFTEventTimeSlots;
