import React, { Component } from "react";

const FITNESS_METRICS = [
  { key: '30 secs Sit & Stand', label: '30 Secs Sit & Stand', unit: 'reps', higherIsBetter: true },
  { key: '30 secs Arm Curl', label: '30 Secs Arm Curl', unit: 'reps', higherIsBetter: true },
  { key: '2 min March on the spot', label: '2 Min March On The Spot', unit: 'steps', higherIsBetter: true },
  { key: 'Sit & Reach', label: 'Sit & Reach', unit: 'cm', higherIsBetter: true },
  { key: 'Back Stretch', label: 'Back Stretch', unit: 'cm', higherIsBetter: true },
  { key: '2.44m speed walk', label: '2.44m Speed Walk', unit: 'sec', higherIsBetter: false },
  { key: 'Grip Test', label: 'Grip Test', unit: 'kg', higherIsBetter: true }
];

class ParticipantsImprovementCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropdownOpen: false,
      selectedStationCountParticipants: 1,
      buttonWidth: 0
    };
    this.buttonRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  handleClickOutside = (e) => {
    if (!e.target.closest('.participants-improvement-dropdown')) {
      this.setState({ isDropdownOpen: false });
    }
  };

  toggleDropdown = () => {
    const newState = !this.state.isDropdownOpen;
    if (newState && this.buttonRef.current) {
      this.setState({ isDropdownOpen: newState, buttonWidth: this.buttonRef.current.offsetWidth });
    } else {
      this.setState({ isDropdownOpen: newState });
    }
  };

  handleOptionSelect = (optionNumber) => {
    this.setState({ isDropdownOpen: false, selectedStationCountParticipants: optionNumber });
  };

  getMultiYearParticipants = (data) => {
    if (!data || !data.participantMap) return 0;
    return Object.values(data.participantMap).filter(participant =>
      Object.keys(participant.years || {}).length > 1
    ).length;
  };

  calculateImprovementCount = (data, stationCount = 1) => {
    if (!data || !data.participantMap) return 0;

    const years = (data.years || []).slice().sort();
    if (years.length < 2) return 0;

    const qualifiedParticipants = Object.values(data.participantMap).filter(
      participant => Object.keys(participant.years || {}).length > 1
    );

    let count = 0;
    qualifiedParticipants.forEach(participant => {
      for (let i = 0; i < years.length - 1; i++) {
        const curr = participant.years[years[i]];
        const next = participant.years[years[i + 1]];
        if (!curr || !next) continue;
        let improvedCount = 0;
        FITNESS_METRICS.forEach(metric => {
          const a = curr[metric.key];
          const b = next[metric.key];
          if (a === undefined || b === undefined || isNaN(a) || isNaN(b)) return;
          if (metric.higherIsBetter ? b > a : b < a) improvedCount++;
        });
        if (improvedCount >= stationCount) { count++; break; }
      }
    });
    return count;
  };

  calculateImprovementRate = (data, stationCount = 1) => {
    const total = this.getMultiYearParticipants(data);
    if (!total) return '—';
    const improved = this.calculateImprovementCount(data, stationCount);
    return `${parseFloat(((improved / total) * 100).toFixed(2))}%`;
  };

  calculateParticipantsImprovementUnique = (data, stationCount = 1) => {
    const { isMultipleYearsView } = this.props;

    if (!isMultipleYearsView) return null;
    if (!data || data.years.length < 2 || !data.participantMap) return null;

    const years = data.years.slice().sort();
    const improvements = [];

    for (let i = 0; i < years.length - 1; i++) {
      const currentYear = years[i];
      const nextYear = years[i + 1];
      let participantsWithData = 0;
      let participantsImproved = 0;

      Object.values(data.participantMap).forEach(participant => {
        const currentYearData = participant.years[currentYear];
        const nextYearData = participant.years[nextYear];
        if (!currentYearData || !nextYearData) return;
        participantsWithData++;
        let improvedCount = 0;
        FITNESS_METRICS.slice(0, stationCount).forEach(metric => {
          const currentValue = currentYearData[metric.key];
          const nextValue = nextYearData[metric.key];
          if (currentValue !== undefined && nextValue !== undefined && !isNaN(currentValue) && !isNaN(nextValue)) {
            const diff = nextValue - currentValue;
            if (metric.higherIsBetter ? diff > 0 : diff < 0) improvedCount++;
          }
        });
        if (improvedCount >= stationCount) participantsImproved++;
      });

      if (participantsWithData > 0) {
        improvements.push({
          from: currentYear,
          to: nextYear,
          value: (participantsImproved / participantsWithData) * 100
        });
      }
    }

    return improvements.length > 0 ? improvements : null;
  };

  render() {
    const { data } = this.props;
    const { selectedStationCountParticipants } = this.state;

    const displayValue = this.calculateImprovementRate(data, selectedStationCountParticipants);

    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-improvement" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Main Section: Number of Stations */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label className="fft-dash-kpi-label" style={{ marginBottom: '0', whiteSpace: 'nowrap' }}>Number of Stations</label>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', position: 'relative' }} className="participants-improvement-dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              ref={this.buttonRef}
              onClick={(e) => {
                e.stopPropagation();
                this.toggleDropdown();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#000000',
              }}
            >
              {selectedStationCountParticipants}
              <span style={{ fontSize: '12px' }}>▼</span>
            </button>

            {this.state.isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 10,
                width: `${this.state.buttonWidth}px`
              }}>
                {FITNESS_METRICS.map((m, idx) => {
                  const optionNumber = idx + 1;
                  return (
                    <div
                      key={optionNumber}
                      onClick={(e) => {
                        e.stopPropagation();
                        this.handleOptionSelect(optionNumber);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: selectedStationCountParticipants === optionNumber ? '#e2e8f0' : '#ffffff',
                        fontSize: '14px',
                        color: '#000000',
                        fontWeight: '500'
                      }}
                    >
                      {optionNumber}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Improvement by Year */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1 }}>
            <span className="fft-dash-kpi-label" style={{ marginBottom: '0' }}>Improvement by Year</span>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <span className="fft-dash-kpi-value">{displayValue}</span>
          </div>
        </div>
      </div>
    );
  }
}

export default ParticipantsImprovementCard;
