import React, { Component } from "react";
import { 
  getParticipationsWithImprovementUniversal, 
  FITNESS_METRICS 
} from "../../../fitnessImprovementAnalysis";

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
    if (!data || !data.participantMap || !data.years) {
      console.log('getQualifiedParticipants: NO DATA OR NO PARTICIPANTMAP');
      return [];
    }

    const totalYears = data.years.length;
    const qualified = Object.entries(data.participantMap)
      .filter(([key, participant]) => {
        const yearsWithData = Object.keys(participant.years || {}).length;
        return yearsWithData === totalYears;
      })
      .map(([key, participant]) => ({
        key,
        participant,
        yearsWithData: Object.keys(participant.years).length
      }));

    console.log('getQualifiedParticipants: Found', qualified.length, 'qualified participants out of', Object.keys(data.participantMap).length);
    return qualified;
  };

  calculateTotalAttendance = (data) => {
    if (!data || !data.participantMap) {
      return 0;
    }
    const total = this.getQualifiedParticipants(data).length;
    console.log('calculateTotalAttendance:', total);
    return total;
  };

  calculateImprovementRate = (data, stationCount = 1) => {
    const total = this.calculateTotalAttendance(data);
    if (!total) return '—';
    const improved = this.calculateImprovementCount(data, stationCount);
    return `${parseFloat(((improved / total) * 100).toFixed(2))}%`;
  };

  calculateImprovementCount = (data, stationCount = 1) => {
    if (!data || !data.participantMap) return 0;

    // Use the universal calculation function for participations
    const result = getParticipationsWithImprovementUniversal(
      data.participantMap,
      data.years || [],
      stationCount
    );

    return result.count;
  };

  render() {
    const {
      data
    } = this.props;
    
    const { selectedStationCountParticipations } = this.state;

    console.log('ParticipationsImprovementCard RENDER - data:', data ? 'exists' : 'null');

    const totalParticipations = this.calculateTotalAttendance(data);
    const improvedParticipations = this.calculateImprovementCount(data, selectedStationCountParticipations);

    console.log('After calculate - total:', totalParticipations, 'improved:', improvedParticipations);

    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-improvement" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', gridAutoRows: 'auto' }}>
        {/* Top Main Section: Number of Stations */}
        <div>
          <label className="fft-dash-kpi-label" style={{ marginBottom: '0', whiteSpace: 'nowrap' }} htmlFor="station-count-select">Number of Stations</label>
        </div>
        <div style={{ width: 'fit-content', position: 'relative', justifySelf: 'end' }} className="participations-improvement-dropdown" onClick={(e) => e.stopPropagation()}>
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

        {/* Border separator */}
        <div style={{ gridColumn: '1 / 3', height: '2px', backgroundColor: '#94a3b8', margin: '8px -20px' }}></div>

        {/* Participations with Improvement */}
        <div>
          <span className="fft-dash-kpi-label" style={{ marginBottom: '0' }}>Participations with Improvement</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', justifySelf: 'end' }}>
          <span className="fft-dash-kpi-value">{improvedParticipations}</span>
        </div>

        {/* Border separator */}
        <div style={{ gridColumn: '1 / 3', height: '2px', backgroundColor: '#94a3b8', margin: '8px -20px' }}></div>

        {/* Total Participations */}
        <div>
          <span className="fft-dash-kpi-label" style={{ marginBottom: '0' }}>Total Repeated Participations</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', justifySelf: 'end' }}>
          <span className="fft-dash-kpi-value">{totalParticipations}</span>
        </div>

        {/* Border separator */}
        <div style={{ gridColumn: '1 / 3', height: '2px', backgroundColor: '#94a3b8', margin: '8px -20px' }}></div>

        {/* Improvement */}
        <div>
          <span className="fft-dash-kpi-label" style={{ marginBottom: '0' }}>Improvement</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', justifySelf: 'end' }}>
          <span className="fft-dash-kpi-value">
            {this.calculateImprovementRate(data, selectedStationCountParticipations)}
          </span>
        </div>
      </div>
    );
  }
}

export default ParticipationsImprovementCard;
