import React, { Component } from "react";
import ParticipationsCardsBlock from './section/ParticipationsCardsBlock';
import ParticipationsChartBlock from './section/ParticipationsChartBlock';
import { 
  getParticipationsWithImprovementUniversal
} from "../fitnessImprovementAnalysis";

class ParticipationsBlock extends Component {
  getQualifiedParticipants = (data) => {
    if (!data || !data.participantMap) {
      return [];
    }

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

  calculateImprovementRate = (data, stationCount = 1) => {
    const total = this.calculateTotalAttendance(data);
    if (!total) return { improved: 0, total: 0, percentage: '—' };
    const improved = this.calculateImprovementCount(data, stationCount);
    return {
      improved,
      total,
      percentage: `${parseFloat(((improved / total) * 100).toFixed(2))}%`
    };
  };

  render() {
    const {
      data,
      yearlyParticipants = {},
      years = [],
      selectedStationCountParticipations = 1,
      handleStationCountChangeParticipations,
      isMultipleYearsView
    } = this.props;

    if (!data) {
      return (
        <div className="fft-dash-left-section">
          <h3 className="fft-dash-section-header">Participations (By attendance)</h3>
          <div className="fft-dash-empty">No data available</div>
        </div>
      );
    }

    const improvementRate = this.calculateImprovementRate(data, selectedStationCountParticipations);

    return (
      <div className="fft-dash-left-section">
        <h3 className="fft-dash-section-header">Participations (By attendance)</h3>

        
        <ParticipationsCardsBlock
          data={data}
          selectedStationCountParticipations={selectedStationCountParticipations}
          handleStationCountChangeParticipations={handleStationCountChangeParticipations}
          isMultipleYearsView={isMultipleYearsView}
        />
        
        <ParticipationsChartBlock
          years={years}
          yearlyParticipants={yearlyParticipants}
        />
      </div>
    );
  }
}

export default ParticipationsBlock;
