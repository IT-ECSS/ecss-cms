import React, { Component } from "react";
import { 
  analyzeParticipantImprovementAllCases, 
  FITNESS_METRICS 
} from "../../../fitnessImprovementAnalysis";

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

  handleImprovementClick = () => {
    const { selectedStationCountParticipants } = this.state;
    // First, try to call the parent callback if it exists
    if (this.props.onImprovementParticipantsClick) {
      this.props.onImprovementParticipantsClick(selectedStationCountParticipants);
    } else {
      // If no parent callback, try to call parent's method directly
      if (this.props.onOpenImprovementModal) {
        this.props.onOpenImprovementModal(selectedStationCountParticipants);
      }
    }
  };

  getMultiYearParticipants = (data) => {
    if (!data || !data.participantMap) return 0;
    // Count only participants with more than 1 year of attendance
    return Object.values(data.participantMap).filter(participant =>
      Object.keys(participant.years || {}).length > 1
    ).length;
  };

  calculateImprovementCount = (data, stationCount = 1) => {
    if (!data || !data.participantMap) return 0;

    // Use the centralized analysis function
    const analysis = analyzeParticipantImprovementAllCases(
      data.participantMap,
      data.years || [],
      stationCount
    );

    return analysis.uniqueCount;
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
    const { data } = this.props;
    const { selectedStationCountParticipants } = this.state;

    // Log if callback is missing
    if (!this.props.onImprovementParticipantsClick) {
      console.warn('ParticipantsImprovementCard: onImprovementParticipantsClick callback is missing!');
    }

    const stats = this.calculateImprovementRate(data, selectedStationCountParticipants);
    const totalParticipants = (data && data.totalParticipants) ? data.totalParticipants : 0;
    const improvedParticipants = this.calculateImprovementCount(data, selectedStationCountParticipants);
    
    // DEBUG: Log the multi-year participant count
    console.log('[ParticipantsImprovementCard] data.totalParticipants:', data?.totalParticipants);
    console.log('[ParticipantsImprovementCard] Displayed totalParticipants:', totalParticipants);
    console.log('[ParticipantsImprovementCard] Improved participants:', improvedParticipants);
    console.log('[ParticipantsImprovementCard] Improvement rate:', stats.percentage);

    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-improvement" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', gridAutoRows: 'auto' }}>
        {/* Top Main Section: Number of Stations */}
        <div>
          <label className="fft-dash-kpi-label" style={{ marginBottom: '0', whiteSpace: 'nowrap' }}>Number of Stations</label>
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

        {/* Participants with Improvement - Entire row clickable */}
        <div
          onClick={() => {
            console.log('Participants with Improvement clicked');
            this.handleImprovementClick();
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              console.log('Participants with Improvement key pressed');
              this.handleImprovementClick();
            }
          }}
          role={this.props.onImprovementParticipantsClick || this.props.onOpenImprovementModal ? 'button' : undefined}
          tabIndex={this.props.onImprovementParticipantsClick || this.props.onOpenImprovementModal ? 0 : undefined}
          style={{ 
            gridColumn: '1 / 3',
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 8px',
            borderRadius: '4px',
            cursor: (this.props.onImprovementParticipantsClick || this.props.onOpenImprovementModal) ? 'pointer' : 'default',
            transition: 'background-color 0.2s ease, transform 0.2s ease',
            backgroundColor: (this.props.onImprovementParticipantsClick || this.props.onOpenImprovementModal) ? 'transparent' : undefined,
            transform: (this.props.onImprovementParticipantsClick || this.props.onOpenImprovementModal) ? 'scale(1)' : 'scale(1)'
          }}
          onMouseEnter={(e) => {
            if (this.props.onImprovementParticipantsClick || this.props.onOpenImprovementModal) {
              e.currentTarget.style.backgroundColor = '#f0f9ff';
              e.currentTarget.style.transform = 'scale(1.01)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span className="fft-dash-kpi-label" style={{ marginBottom: '0', cursor: 'inherit' }}>Participants with Improvement</span>
          <span className="fft-dash-kpi-value" style={{ cursor: 'inherit' }}>{improvedParticipants}</span>
        </div>

        {/* Border separator */}
        <div style={{ gridColumn: '1 / 3', height: '2px', backgroundColor: '#94a3b8', margin: '8px -20px' }}></div>

        {/* Total Participants */}
        <div
          onClick={() => {
            if (this.props.onImprovementTotalParticipantsClick) {
              this.props.onImprovementTotalParticipantsClick(selectedStationCountParticipants);
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && this.props.onImprovementTotalParticipantsClick) {
              e.preventDefault();
              this.props.onImprovementTotalParticipantsClick(selectedStationCountParticipants);
            }
          }}
          role={this.props.onImprovementTotalParticipantsClick ? 'button' : undefined}
          tabIndex={this.props.onImprovementTotalParticipantsClick ? 0 : undefined}
          style={{ 
            cursor: this.props.onImprovementTotalParticipantsClick ? 'pointer' : 'default',
            transition: 'opacity 0.2s ease'
          }}
        >
          <span className="fft-dash-kpi-label" style={{ marginBottom: '0' }}>Total Participants</span>
        </div>
        <div
          onClick={() => {
            if (this.props.onImprovementTotalParticipantsClick) {
              this.props.onImprovementTotalParticipantsClick(selectedStationCountParticipants);
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && this.props.onImprovementTotalParticipantsClick) {
              e.preventDefault();
              this.props.onImprovementTotalParticipantsClick(selectedStationCountParticipants);
            }
          }}
          role={this.props.onImprovementTotalParticipantsClick ? 'button' : undefined}
          tabIndex={this.props.onImprovementTotalParticipantsClick ? 0 : undefined}
          style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            justifySelf: 'end',
            width: '100%',
            padding: '8px',
            cursor: this.props.onImprovementTotalParticipantsClick ? 'pointer' : 'default',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease',
            backgroundColor: this.props.onImprovementTotalParticipantsClick ? 'transparent' : undefined
          }}
          onMouseEnter={(e) => {
            if (this.props.onImprovementTotalParticipantsClick) {
              e.currentTarget.style.backgroundColor = '#f0f9ff';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="fft-dash-kpi-value">{totalParticipants}</span>
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
