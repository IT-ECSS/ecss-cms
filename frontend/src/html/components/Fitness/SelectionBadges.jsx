import React, { Component } from 'react';
import fftTranslations from './fftTranslations';

export { default as SelectedLanguageBadge } from './SelectedLanguageBadge';
export { default as SelectedEventBadge } from './SelectedEventBadge';
export { default as SelectedSlotBadge } from './SelectedSlotBadge';

const languageLabels = {
  localized: { en: 'English', zh: '中文', ms: 'Bahasa Melayu' },
  english: { en: 'English', zh: 'Chinese', ms: 'Malay' },
};
const sectionLabels = {
  language: { en: 'Language', zh: '语言', ms: 'Bahasa' },
  event: { en: 'Event', zh: '活动', ms: 'Acara' },
  station: { en: 'Station', zh: '站点', ms: 'Stesen' },
};

const getBadgeBoxStyle = (sizeMultiplier = 1) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: Math.max(2, 4 * sizeMultiplier),
  padding: `${Math.max(4, 7 * sizeMultiplier)}px ${Math.max(6, 10 * sizeMultiplier)}px`,
  minHeight: Math.max(36, 72 * sizeMultiplier),
  boxSizing: 'border-box',
  outline: 'none',
  userSelect: 'none',
});

const getBadgeHeadingStyle = () => ({
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 700,
  lineHeight: 1.15,
});

const getBadgeValueStyle = () => ({
  fontSize: '1rem',
  fontWeight: 700,
  lineHeight: 1.25,
  wordBreak: 'break-word',
});

function getEnglishEventName(event) {
  const name = typeof event === 'string' ? event : (event?.name || '');
  return name || '';
}

function getEnglishStationLabel(station) {
  if (!station) return '';
  if (typeof station === 'string') return station;

  const stationNum = station?.num || (typeof station?.key === 'string' ? station.key.match(/^\d+/)?.[0] : '');
  const title = station?.title || station?.name || station?.label || '';

  if (station?.id === 'measurement') {
    return `📏 ${title}`;
  }

  return stationNum ? `${stationNum}: ${title}` : title;
}

// ─── Global bar shown across all sections when a selection exists ───
export class SelectionBadgesBar extends Component {
  render() {
    const {
      language, event, slot, station,
      onLanguageClick, onEventClick, onSlotClick, onStationClick,
      showLanguagePlaceholder, showEventPlaceholder, showSlotPlaceholder, showStationPlaceholder,
      noBorder, forceEnglishText, sizeMultiplier, disableContainerFlex, badgeVariant,
    } = this.props;

    const hasLanguage = !!language || !!showLanguagePlaceholder;
    const hasEvent    = !!event    || !!showEventPlaceholder;
    const hasSlot     = !!slot     || !!showSlotPlaceholder;
    const hasStation  = !!station  || !!showStationPlaceholder;

    if (!hasLanguage && !hasEvent && !hasSlot && !hasStation) return null;

    const isRegistrationVariant = badgeVariant === 'registration';
    const displayLanguage = forceEnglishText ? 'en' : language;
    const languageValueLabels = forceEnglishText ? languageLabels.english : languageLabels.localized;
    const badgeBoxStyle = getBadgeBoxStyle(sizeMultiplier);
    // For registration variant: lock badge height so all badges (including time slot) match
    if (isRegistrationVariant) {
      badgeBoxStyle.height = badgeBoxStyle.minHeight;
      badgeBoxStyle.overflow = 'hidden';
    }
    // For registration variant: strip fontSize from inline styles — use CSS class instead
    const rawHeadingStyle = getBadgeHeadingStyle();
    const rawValueStyle = getBadgeValueStyle();
    const badgeHeadingStyle = isRegistrationVariant ? { ...rawHeadingStyle, fontSize: undefined } : rawHeadingStyle;
    const badgeValueStyle = isRegistrationVariant ? { ...rawValueStyle, fontSize: undefined } : rawValueStyle;
    const headingClassName = isRegistrationVariant ? 'fft-reg-badge-heading' : undefined;
    const valueClassName = isRegistrationVariant ? 'fft-reg-badge-value' : undefined;
    const badgeFlexBase = isRegistrationVariant
      ? { flex: '0 1 calc(50% - 4px)', maxWidth: 'calc(50% - 4px)' }
      : { flex: '1 1 calc(50% - 4px)' };
    const containerStyle = disableContainerFlex
      ? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, minWidth: 0, width: '100%' }
      : { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: '1 1 280px', minWidth: 0, width: '100%' };
    const slotWord = fftTranslations.timeSlotLabel?.[displayLanguage] || fftTranslations.timeSlotLabel?.en || 'Time Slot';
    const englishSlotWord = fftTranslations.timeSlotLabel?.en || 'Time Slot';
    let slotLabel = slot || '';
    if (slot) {
      const normalized = slot.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/, '$1 - $2');
      const slotMatch = String(normalized).match(/^Slot\s*(\d+)\s*:\s*(.*)$/i);
      slotLabel = slotMatch ? `${englishSlotWord} ${slotMatch[1]}: ${slotMatch[2]}` : normalized;
    }
    const stationLabel = getEnglishStationLabel(station);
    const eventLabel = getEnglishEventName(event);

    return (
      <div style={containerStyle}>
        {hasLanguage && (
          <div
            onClick={onLanguageClick || undefined}
            style={{
              ...badgeBoxStyle,
              background: '#e3f0ff', borderBottom: '2px solid #c5d9f5', ...badgeFlexBase,
              cursor: onLanguageClick ? 'pointer' : 'default',
            }}
          >
            <span className={headingClassName} style={{ ...badgeHeadingStyle, color: '#1565c0' }}>
              {sectionLabels.language[displayLanguage] || 'Language'}
            </span>
            <span className={valueClassName} style={{ ...badgeValueStyle, color: '#1565c0' }}>
              {showLanguagePlaceholder ? '—' : (languageValueLabels[language] || language)}
            </span>
          </div>
        )}
        {hasEvent && (
          <div
            onClick={onEventClick || undefined}
            style={{
              ...badgeBoxStyle,
              background: '#e8f5e9', borderBottom: '2px solid #b2dfcf', ...badgeFlexBase, minWidth: 0,
              cursor: onEventClick ? 'pointer' : 'default',
            }}
          >
            <span className={headingClassName} style={{ ...badgeHeadingStyle, color: '#2e7d32' }}>
              {sectionLabels.event[displayLanguage] || 'Event'}
            </span>
            <span className={valueClassName} style={{ ...badgeValueStyle, color: '#2e7d32' }}>
              {showEventPlaceholder ? '—' : eventLabel}
            </span>
          </div>
        )}
        {hasStation && (
          <div
            onClick={onStationClick || undefined}
            style={{
              ...badgeBoxStyle,
              background: '#e3f0ff', borderBottom: '2px solid #c5d9f5', ...badgeFlexBase, minWidth: 0,
              cursor: onStationClick ? 'pointer' : 'default',
            }}
          >
            <span className={headingClassName} style={{ ...badgeHeadingStyle, color: '#1565c0' }}>
              {sectionLabels.station[displayLanguage] || sectionLabels.station.en}
            </span>
            <span className={valueClassName} style={{ ...badgeValueStyle, color: '#1565c0' }}>
              {showStationPlaceholder ? '—' : stationLabel}
            </span>
          </div>
        )}
        {hasSlot && (
          <div
            onClick={onSlotClick || undefined}
            style={{
              ...badgeBoxStyle,
              background: '#fff3e0', borderBottom: '2px solid #ffe0b2', ...badgeFlexBase,
              cursor: onSlotClick ? 'pointer' : 'default',
            }}
          >
            <span className={headingClassName} style={{ ...badgeHeadingStyle, color: '#e65100' }}>
              {slotWord}
            </span>
            <span className={valueClassName} style={{ ...badgeValueStyle, color: '#e65100' }}>
              {showSlotPlaceholder ? '—' : slotLabel}
            </span>
          </div>
        )}
      </div>
    );
  }
}
