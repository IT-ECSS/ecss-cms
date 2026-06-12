import React, { Component } from "react";
import ParticipantsCardsBlock from './section/ParticipantsCardsBlock';
import ParticipantsChartBlock from './section/ParticipantsChartBlock';
import ParticipantsTotalListCard from './section/cards/ParticipantsTotalListCard';
import { 
  getParticipantsWithImprovementUniversal,
  FITNESS_METRICS
} from "../fitnessImprovementAnalysis";

class ParticipantsBlock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedStationCount: 1
    };
  }

  getParticipantNames = (data, isImprovement = false, stationCount = 1) => {
    if (!data || !data.participantMap) return [];
    
    if (isImprovement) {
      // Get all multi-year participants (not just those who improved)
      const names = Object.values(data.participantMap)
        .filter(participant => Object.keys(participant.years || {}).length > 1)
        .map(p => p.displayName)
        .filter(name => typeof name === 'string' && name.trim() !== '')
        .map(name => name.trim())
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      return Array.from(new Set(names));
    }
    
    // Get all participant names
    const names = Object.values(data.participantMap)
      .map(p => p.displayName)
      .filter(name => typeof name === 'string' && name.trim() !== '')
      .map(name => name.trim())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return Array.from(new Set(names));
  };
  getMultiYearParticipants = (data) => {
    if (!data || !data.participantMap) return 0;
    return Object.values(data.participantMap).filter(participant =>
      Object.keys(participant.years || {}).length > 1
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

  getImprovementDataWithStationCounts = (data, stationCount = 1) => {
    if (!data || !data.participantMap || !data.years) return [];

    // Use the universal calculation function
    const result = getParticipantsWithImprovementUniversal(
      data.participantMap,
      data.years,
      stationCount
    );

    // Debug log - Show all participants who attended all years and their station improvements
    console.log('=== ✅ PARTICIPANTS WHO ATTENDED ALL YEARS ===');
    console.log(`Total participants who attended all years: ${result.totalAttendedAllYears}`);
    console.log(`Filtered by station threshold (${stationCount}+): ${result.participants.length}`);
    console.log('');
    console.log('📊 PARTICIPANT DETAILS:');
    result.participants.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.displayName}: ${item.stationsImproved} station${item.stationsImproved !== 1 ? 's' : ''} improved`);
      console.log(`   📍 Improved Stations: ${item.uniqueImprovedMetrics.join(', ')}`);
    });
    console.log('');

    return result.participants;
  };

  render() {
    const {
      data,
      yearlyParticipants = {},
      years = [],
      selectedStationCountParticipants = 1,
      handleStationCountChangeParticipants,
      isMultipleYearsView
    } = this.props;

    const participantNames = this.getParticipantNames(data, false);

    if (!data) {
      return (
        <div className="fft-dash-right-section">
          <h3 className="fft-dash-section-header">Participants</h3>
          <div className="fft-dash-empty">No data available</div>
        </div>
      );
    }

    const improvementRate = this.calculateImprovementRate(data, selectedStationCountParticipants);

    return (
      <div className="fft-dash-right-section">
        <h3 className="fft-dash-section-header">Participants</h3>

        <ParticipantsCardsBlock
          data={data}
          selectedStationCountParticipants={selectedStationCountParticipants}
          handleStationCountChangeParticipants={handleStationCountChangeParticipants}
          isMultipleYearsView={isMultipleYearsView}
        />

        <ParticipantsChartBlock
          years={years}
          yearlyParticipants={yearlyParticipants}
        />

        <ParticipantsTotalListCard
          participantNames={participantNames}
        />
      </div>
    );
  }
}

export default ParticipantsBlock;

