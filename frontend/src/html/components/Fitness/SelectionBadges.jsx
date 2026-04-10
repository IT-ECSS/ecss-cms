import React, { Component } from 'react';
import fftTranslations from './fftTranslations';

export { default as SelectedLanguageBadge } from './SelectedLanguageBadge';
export { default as SelectedEventBadge } from './SelectedEventBadge';
export { default as SelectedSlotBadge } from './SelectedSlotBadge';

// ─── Global bar shown across all sections when a selection exists ───
export class SelectionBadgesBar extends Component {
  render() {
    const {
      language, event, slot, station,
      onLanguageClick, onEventClick, onSlotClick, onStationClick,
      showLanguagePlaceholder, showEventPlaceholder, showSlotPlaceholder, showStationPlaceholder,
      noBorder,
    } = this.props;

    const hasLanguage = !!language || !!showLanguagePlaceholder;
    const hasEvent    = !!event    || !!showEventPlaceholder;
    const hasSlot     = !!slot     || !!showSlotPlaceholder;
    const hasStation  = !!station  || !!showStationPlaceholder;

    if (!hasLanguage && !hasEvent && !hasSlot && !hasStation) return null;

    const languageLabels = { en: 'English', zh: '中文', ms: 'Bahasa Melayu' };
    const sectionLabels = { language: { en: 'Language', zh: '语言', ms: 'Bahasa' }, event: { en: 'Event', zh: '活动', ms: 'Acara' } };
    const slotWord = fftTranslations.timeSlotLabel?.[language] || fftTranslations.timeSlotLabel?.en || 'Time Slot';
    let slotLabel = slot || '';
    if (slot) {
      const normalized = slot.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/, '$1 - $2');
      const slotMatch = String(normalized).match(/^Slot\s*(\d+)\s*:\s*(.*)$/i);
      slotLabel = slotMatch ? `${slotWord} ${slotMatch[1]}: ${slotMatch[2]}` : normalized;
    }
    const stationNum = station?.num || (typeof station?.key === 'string' ? station.key.match(/^\d+/)?.[0] : '');
    const stationName = typeof station === 'string' ? station : (station?.title || station?.name || station?.label || '');
    const stationLabel = stationNum ? `${stationNum}: ${stationName}` : stationName;

    return (
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: '1 1 280px', minWidth: 0, width: '100%' }}>
        {hasLanguage && (
          <div
            onClick={onLanguageClick || undefined}
            style={{
              display: 'flex', flexDirection: 'column', gap: 6, padding: 'clamp(10px, 1.3vw, 14px) clamp(12px, 1.8vw, 20px)',
              background: '#e3f0ff', borderBottom: '2px solid #c5d9f5', flex: '1 1 calc(50% - 4px)',
              cursor: onLanguageClick ? 'pointer' : 'default', boxSizing: 'border-box',
              outline: 'none', userSelect: 'none',
            }}
          >
            <span style={{ fontSize: '1.125em', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
              {sectionLabels.language[language] || 'Language'}
            </span>
            <span style={{ fontSize: 'clamp(1.15rem, 1.7vw, 1.625rem)', fontWeight: 700, color: '#1565c0' }}>
              {showLanguagePlaceholder ? '—' : (languageLabels[language] || language)}
            </span>
          </div>
        )}
        {hasEvent && (
          <div
            onClick={onEventClick || undefined}
            style={{
              display: 'flex', flexDirection: 'column', gap: 6, padding: 'clamp(10px, 1.3vw, 14px) clamp(12px, 1.8vw, 20px)',
              background: '#e8f5e9', borderBottom: '2px solid #b2dfcf', flex: '1 1 calc(50% - 4px)', minWidth: 0,
              cursor: onEventClick ? 'pointer' : 'default', boxSizing: 'border-box',
              outline: 'none', userSelect: 'none',
            }}
          >
            <span style={{ fontSize: 'clamp(0.85rem, 0.95vw, 1.125rem)', color: '#2e7d32', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
              {sectionLabels.event[language] || 'Event'}
            </span>
            <span style={{ fontSize: 'clamp(1.15rem, 1.7vw, 1.625rem)', fontWeight: 700, color: '#2e7d32', wordBreak: 'break-word' }}>
              {showEventPlaceholder ? '—' : (typeof event === 'string' ? event : (event?.name || ''))}
            </span>
          </div>
        )}
        {hasStation && (
          <div
            onClick={onStationClick || undefined}
            style={{
              display: 'flex', flexDirection: 'column', gap: 6, padding: 'clamp(10px, 1.3vw, 14px) clamp(12px, 1.8vw, 20px)',
              background: '#e3f0ff', borderBottom: '2px solid #c5d9f5', flex: '1 1 calc(50% - 4px)', minWidth: 0,
              cursor: onStationClick ? 'pointer' : 'default', boxSizing: 'border-box',
              outline: 'none', userSelect: 'none',
            }}
          >
            <span style={{ fontSize: '1.125em', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
              Station
            </span>
            <span style={{ fontSize: 'clamp(1.15rem, 1.7vw, 1.625rem)', fontWeight: 700, color: '#1565c0', wordBreak: 'break-word' }}>
              {showStationPlaceholder ? '—' : stationLabel}
            </span>
          </div>
        )}
        {hasSlot && (
          <div
            onClick={onSlotClick || undefined}
            style={{
              display: 'flex', flexDirection: 'column', gap: 6, padding: 'clamp(10px, 1.3vw, 14px) clamp(12px, 1.8vw, 20px)',
              background: '#fff3e0', borderBottom: '2px solid #ffe0b2', flex: '1 1 calc(50% - 4px)',
              cursor: onSlotClick ? 'pointer' : 'default', boxSizing: 'border-box',
              outline: 'none', userSelect: 'none',
            }}
          >
            <span style={{ fontSize: 'clamp(0.85rem, 0.95vw, 1.125rem)', color: '#e65100', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
              {slotWord}
            </span>
            <span style={{ fontSize: 'clamp(1.15rem, 1.7vw, 1.625rem)', fontWeight: 700, color: '#e65100', wordBreak: 'break-word' }}>
              {showSlotPlaceholder ? '—' : slotLabel}
            </span>
          </div>
        )}
      </div>
    );
  }
}
