import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/fftParticipants.css';
import fftTranslations from './fftTranslations';
import SlotFullConfirmModal from './SlotFullConfirmModal';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

// Parses "Slot 1: 09:00-10:00, Slot 2: 10:00-11:00" into an array of slot strings
function parseTimeSlots(timeSlotsStr) {
  if (!timeSlotsStr) return [];
  return timeSlotsStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// Formats and localizes "Slot 1: 09:00-10:00" -> "时间段 1: 09:00 - 10:00" etc.
function formatSlotLabel(slot, slotWord) {
  const normalized = String(slot || '').replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/, '$1 - $2');
  const match = normalized.match(/^Slot\s*(\d+)\s*:\s*(.*)$/i);
  if (!match) return normalized;
  return `${slotWord} ${match[1]}: ${match[2]}`;
}

function extractSlotRange(slot) {
  const match = String(slot || '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return { start: match[1], end: match[2] };
}

function getRowTimeRange(row) {
  const start = (row['Start Time'] || row['Start time'] || row['Start'] || '').toString().trim();
  const end = (row['End Time'] || row['End time'] || row['Time End'] || row['End'] || '').toString().trim();
  return { start, end };
}

function isRegisteredParticipantRow(row) {
  const name = (row['Name'] || '').toString().trim();
  return name.length > 0;
}

class TimeSlotSelection extends Component {
  state = {
    loadingStats: false,
    slotStats: {},
    showFullConfirm: false,
    pendingSlot: null,
  };

  handleSlotClick = (slot, isFull) => {
    const { onSelectSlot } = this.props;
    const { loadingStats } = this.state;

    if (loadingStats) return;

    if (isFull) {
      this.setState({ showFullConfirm: true, pendingSlot: slot });
      return;
    }

    onSelectSlot(slot);
  };

  handleConfirmYes = () => {
    const { onSelectSlot } = this.props;
    const { pendingSlot } = this.state;

    if (pendingSlot) {
      onSelectSlot(pendingSlot);
    }

    this.setState({ showFullConfirm: false, pendingSlot: null });
  };

  handleConfirmNo = () => {
    this.setState({ showFullConfirm: false, pendingSlot: null });
  };

  componentDidMount() {
    this.loadSlotStats();
  }

  componentDidUpdate(prevProps) {
    const prevEventId = prevProps.event?.id;
    const currEventId = this.props.event?.id;
    const prevSlots = prevProps.event?.timeSlots;
    const currSlots = this.props.event?.timeSlots;

    if (prevEventId !== currEventId || prevSlots !== currSlots) {
      this.loadSlotStats();
    }
  }

  loadSlotStats = async () => {
    const { event } = this.props;
    const slots = parseTimeSlots(event?.timeSlots);
    const max = parseInt(event?.maxParticipants, 10);
    const capacity = Number.isFinite(max) && max > 0 ? max : null;

    const initialStats = {};
    slots.forEach((slot) => {
      initialStats[slot] = { registered: 0, capacity };
    });

    if (!event?.id || slots.length === 0) {
      this.setState({ slotStats: initialStats, loadingStats: false });
      return;
    }

    this.setState({ loadingStats: true, slotStats: initialStats });

    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getParticipants`, {
        fileId: event.id,
      });

      const participants = Array.isArray(res.data) ? res.data : [];
      const nextStats = { ...initialStats };

      participants.forEach((row) => {
        if (!isRegisteredParticipantRow(row)) return;

        const rowRange = getRowTimeRange(row);
        if (!rowRange.start || !rowRange.end) return;

        slots.forEach((slot) => {
          const slotRange = extractSlotRange(slot);
          if (!slotRange) return;

          if (slotRange.start === rowRange.start && slotRange.end === rowRange.end) {
            nextStats[slot] = {
              ...nextStats[slot],
              registered: (nextStats[slot]?.registered || 0) + 1,
            };
          }
        });
      });

      this.setState({ slotStats: nextStats, loadingStats: false });
    } catch (_error) {
      this.setState({ loadingStats: false });
    }
  };

  render() {
    const { event, language, onSelectSlot } = this.props;
    const { loadingStats, slotStats, showFullConfirm } = this.state;
    const t = (key) => fftTranslations[key]?.[language] ?? fftTranslations[key]?.en;

    const slots = parseTimeSlots(event?.timeSlots);

    return (
      <div className="fft-create-file-form">
        <div className="fft-participants-wrapper">
          <div className="fft-participants-section">
            <div className="fft-participants-section-header">
              <h3 className="fft-participants-section-title">
                {t('selectTimeSlot')}
                {this.props.trilingual && (
                  <span style={{ display: 'block', fontWeight: 400, fontSize: '0.78em', color: '#666', marginTop: 2 }}>{fftTranslations.selectTimeSlot.zh} · {fftTranslations.selectTimeSlot.ms}</span>
                )}
              </h3>
              <hr style={{ margin: '12px 0' }} />
              <div className="fft-participants-section-desc" style={{ marginBottom: '12px', color: '#555', fontSize: '1em' }}>
                {this.props.trilingual ? (
                  <>
                    <span>{fftTranslations.selectTimeSlotDesc.en}</span>
                    <span style={{ display: 'block', fontSize: '0.92em', marginTop: 3 }}>{fftTranslations.selectTimeSlotDesc.zh}</span>
                    <span style={{ display: 'block', fontSize: '0.92em', marginTop: 2 }}>{fftTranslations.selectTimeSlotDesc.ms}</span>
                  </>
                ) : (
                  t('selectTimeSlotDesc')
                )}
              </div>
            </div>

            {slots.length === 0 && (
              <div style={{ color: '#888', fontSize: '1em' }}>{t('noTimeSlots')}</div>
            )}

            {loadingStats && (
              <div style={{ color: '#666', fontSize: '0.95em', marginTop: '4px' }}>{t('slotStatsLoading')}</div>
            )}

            <div className="fft-events-buttons-container">
              {slots.map((slot, idx) => (
                (() => {
                  const stats = slotStats[slot] || { registered: 0, capacity: null };
                  const remaining = stats.capacity == null ? null : Math.max(stats.capacity - stats.registered, 0);
                  const isFull = stats.capacity != null && remaining === 0;

                  return (
                    <button
                      key={idx}
                      type="button"
                      className="fft-event-btn"
                      onClick={() => this.handleSlotClick(slot, isFull)}
                      disabled={loadingStats}
                    >
                      <div className="fft-event-btn-name">{formatSlotLabel(slot, t('timeSlotLabel'))}</div>
                      <div
                        style={{
                          marginTop: '10px',
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          fontSize: '1.125em',
                          fontWeight: 700,
                          color: loadingStats ? '#455a64' : (isFull ? '#b71c1c' : '#1b5e20'),
                          background: loadingStats ? '#eceff1' : (isFull ? '#ffebee' : '#e8f5e9'),
                          border: `1px solid ${loadingStats ? '#cfd8dc' : (isFull ? '#ef9a9a' : '#a5d6a7')}`,
                        }}
                      >
                        {loadingStats
                          ? t('slotStatusUpdating')
                          : (isFull ? t('slotStatusFull') : (remaining == null ? t('slotStatusOpen') : `${remaining} ${t('slotLeftSuffix')}`))}
                      </div>
                    </button>
                  );
                })()
              ))}
            </div>

            <SlotFullConfirmModal
              visible={showFullConfirm}
              language={language}
              onYes={this.handleConfirmYes}
              onNo={this.handleConfirmNo}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default TimeSlotSelection;
