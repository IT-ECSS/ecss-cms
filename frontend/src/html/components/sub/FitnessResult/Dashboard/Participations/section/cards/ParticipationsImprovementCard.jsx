import React, { Component } from "react";

class ParticipationsImprovementCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropdownOpen: false,
      selectedStationCountParticipations: 1,
      selectedStationCountParticipants: 1,
      improvementBasis: 'count',
      buttonWidth: 0
    };
    this.buttonRef = React.createRef();
    this.fitnessMetrics = [
      { key: '30 secs Sit & Stand', label: '30 Secs Sit & Stand', unit: 'reps', higherIsBetter: true },
      { key: '30 secs Arm Curl', label: '30 Secs Arm Curl', unit: 'reps', higherIsBetter: true },
      { key: '2 min March on the spot', label: '2 Min March On The Spot', unit: 'steps', higherIsBetter: true },
      { key: 'Sit & Reach', label: 'Sit & Reach', unit: 'cm', higherIsBetter: true },
      { key: 'Back Stretch', label: 'Back Stretch', unit: 'cm', higherIsBetter: true },
      { key: '2.44m speed walk', label: '2.44m Speed Walk', unit: 'sec', higherIsBetter: false },
      { key: 'Grip Test', label: 'Grip Test', unit: 'kg', higherIsBetter: true }
    ];
  }

  toggleDropdown = () => {
    const newState = !this.state.isDropdownOpen;
    if (newState && this.buttonRef.current) {
      const width = this.buttonRef.current.offsetWidth;
      this.setState({ isDropdownOpen: newState, buttonWidth: width });
    } else {
      this.setState({ isDropdownOpen: newState });
    }
  };

  componentDidMount() {
    document.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  handleClickOutside = (e) => {
    if (!e.target.closest('.participations-improvement-dropdown')) {
      this.setState({ isDropdownOpen: false });
    }
  };

  handleOptionSelect = (optionNumber) => {
    this.setState({ isDropdownOpen: false, selectedStationCountParticipations: optionNumber });
  };

  getQualifiedParticipants = (data) => {
    if (!data || !data.participantMap) {
      return [];
    }

    // Get all participants who attended more than once
    return Object.entries(data.participantMap)
      .filter(([name, participant]) => {
        const yearsWithData = Object.keys(participant.years || {}).length;
        return yearsWithData > 1;
      })
      .map(([name, participant]) => ({
        name,
        participant,
        yearsWithData: Object.keys(participant.years).length
      }));
  };

  calculateTotalAttendance = (data) => {
    if (!data || !data.participantMap) {
      return 0;
    }
    return this.getQualifiedParticipants(data).length;
  };

  calculateImprovementRate = (data, stationCount = 1) => {
    const total = this.calculateTotalAttendance(data);
    if (!total) return '—';
    const improved = this.calculateImprovementCount(data, stationCount);
    return `${parseFloat(((improved / total) * 100).toFixed(2))}%`;
  };

  calculateImprovementCount = (data, stationCount = 1) => {
    if (!data || !data.participantMap) return 0;

    const qualifiedParticipants = this.getQualifiedParticipants(data);
    const years = (data.years || []).slice().sort();
    if (years.length < 2) return 0;

    let count = 0;
    qualifiedParticipants.forEach(({ participant }) => {
      for (let i = 0; i < years.length - 1; i++) {
        const curr = participant.years[years[i]];
        const next = participant.years[years[i + 1]];
        if (!curr || !next) continue;
        let improvedCount = 0;
        this.fitnessMetrics.forEach(metric => {
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

  render() {
    const {
      data
    } = this.props;
    
    const { selectedStationCountParticipations } = this.state;

    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-improvement" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Main Section: Number of Stations */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label className="fft-dash-kpi-label" style={{ marginBottom: '0', whiteSpace: 'nowrap' }} htmlFor="station-count-select">Number of Stations</label>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', position: 'relative' }} className="participations-improvement-dropdown" onClick={(e) => e.stopPropagation()}>
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
              {selectedStationCountParticipations}
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
                {this.fitnessMetrics.map((m, idx) => {
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
                        backgroundColor: selectedStationCountParticipations === optionNumber ? '#e2e8f0' : '#ffffff',
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
            <span className="fft-dash-kpi-value">
              {this.calculateImprovementRate(data, selectedStationCountParticipations)}
            </span>
          </div>
        </div>
      </div>
    );
  }
}

export default ParticipationsImprovementCard;
