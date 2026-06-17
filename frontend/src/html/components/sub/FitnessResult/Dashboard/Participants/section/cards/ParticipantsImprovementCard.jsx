import React, { Component } from "react";
import { 
  getParticipantsWithImprovementUniversal,
  FITNESS_METRICS 
} from "../../../fitnessImprovementAnalysis";

class ParticipantsImprovementCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropdownOpen: false,
      buttonWidth: 0
    };
    this.buttonRef = React.createRef();
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
    if (!e.target.closest('.participants-improvement-dropdown')) {
      this.setState({ isDropdownOpen: false });
    }
  };

  handleOptionSelect = (optionNumber) => {
    this.setState({ isDropdownOpen: false });
    const { handleStationCountChangeParticipants } = this.props;
    if (handleStationCountChangeParticipants) {
      handleStationCountChangeParticipants(optionNumber);
    }
  };

  getMultiYearParticipants = (data) => {
    if (!data || !data.participantMap || !data.years) return 0;
    // Count only participants who attended ALL years
    const totalYears = data.years.length;
    return Object.values(data.participantMap).filter(participant =>
      Object.keys(participant.years || {}).length === totalYears
    ).length;
  };

  calculateImprovementCount = (data, stationCount = 1) => {
    if (!data || !data.participantMap) return 0;

    // Use the universal calculation function
    const result = getParticipantsWithImprovementUniversal(
      data.participantMap,
      data.years || [],
      stationCount
    );

    return result.count;
  };

  calculateImprovementRate = (data, stationCount = 1) => {
    const total = this.getMultiYearParticipants(data);
    if (!total) return { improved: 0, total: 0, percentage: '—' };
    const improved = this.calculateImprovementCount(data, stationCount);
    return {
      improved,
      total,
      percentage: `${parseFloat(((improved / total) * 100).toFixed(2))}%`
    };
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
        FITNESS_METRICS.forEach(metric => {
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
    const { data, totalParticipants = 0, selectedStationCountParticipants = 1 } = this.props;

    const stats = this.calculateImprovementRate(data, selectedStationCountParticipants);
    const improvedParticipants = this.calculateImprovementCount(data, selectedStationCountParticipants);
    const multiYearParticipants = this.getMultiYearParticipants(data);

    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-improvement" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', gridAutoRows: 'auto' }}>
        {/* Top Main Section: Number of Stations */}
        <div>
          <label className="fft-dash-kpi-label" style={{ marginBottom: '0', whiteSpace: 'nowrap' }} htmlFor="station-count-select">Number of Stations</label>
        </div>
        <div style={{ width: 'fit-content', position: 'relative', justifySelf: 'end' }} className="participants-improvement-dropdown" onClick={(e) => e.stopPropagation()}>
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
              width: 'fit-content'
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

        {/* Border separator */}
        <div style={{ gridColumn: '1 / 3', height: '2px', backgroundColor: '#94a3b8', margin: '8px -20px' }}></div>

        {/* Participants with Improvement */}
        <div>
          <span className="fft-dash-kpi-label" style={{ marginBottom: '0' }}>Participants with Improvement</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', justifySelf: 'end' }}>
          <span className="fft-dash-kpi-value">{improvedParticipants}</span>
        </div>

        {/* Border separator */}
        <div style={{ gridColumn: '1 / 3', height: '2px', backgroundColor: '#94a3b8', margin: '8px -20px' }}></div>

        {/* Total Participants */}
        <div>
          <span className="fft-dash-kpi-label" style={{ marginBottom: '0' }}>Total Repeated Participants</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', justifySelf: 'end' }}>
          <span className="fft-dash-kpi-value">{multiYearParticipants}</span>
        </div>

        {/* Border separator */}
        <div style={{ gridColumn: '1 / 3', height: '2px', backgroundColor: '#94a3b8', margin: '8px -20px' }}></div>

        {/* Improvement */}
        <div>
          <span className="fft-dash-kpi-label" style={{ marginBottom: '0' }}>Improvement</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', justifySelf: 'end' }}>
          <span className="fft-dash-kpi-value">{stats.percentage}</span>
        </div>
      </div>
    );
  }
}

export default ParticipantsImprovementCard;
