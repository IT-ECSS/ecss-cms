import React, { Component } from "react";
import ParticipantsCardsBlock from './section/ParticipantsCardsBlock';
import ParticipantsChartBlock from './section/ParticipantsChartBlock';
import ParticipantsNamesModal from './section/ParticipantsNamesModal';
import ParticipantsImprovementNamesModal from './section/ParticipantsImprovementNamesModal';
import { 
  analyzeParticipantImprovementAllCases,
  FITNESS_METRICS
} from "../fitnessImprovementAnalysis";

class ParticipantsBlock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showNamesModal: false,
      modalSource: 'total', // 'total' or 'improvement'
      improvementStationCount: 1,
      showImprovementNamesModal: false,
      improvementStationCountForModal: 1
    };
  }

  openNamesModal = (source = 'total', stationCount = 1) => {
    this.setState({ 
      showNamesModal: true,
      modalSource: source,
      improvementStationCount: stationCount
    });
  };

  closeNamesModal = () => {
    this.setState({ showNamesModal: false });
  };

  openImprovementNamesModal = (stationCount = 1) => {
    console.log('openImprovementNamesModal called with stationCount:', stationCount);
    this.setState({ 
      showImprovementNamesModal: true,
      improvementStationCountForModal: stationCount
    }, () => {
      console.log('State updated, showImprovementNamesModal is now:', this.state.showImprovementNamesModal);
    });
  };

  closeImprovementNamesModal = () => {
    this.setState({ showImprovementNamesModal: false });
  };

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

  getImprovementDataWithStationCounts = (data, stationCount = 1) => {
    if (!data || !data.participantMap || !data.years) return [];

    const participantMap = data.participantMap;
    const years = data.years.slice().sort();
    
    console.log('=== getImprovementDataWithStationCounts Debug ===');
    console.log('Years:', years);
    console.log('Station threshold:', stationCount);
    console.log('Total participants:', Object.keys(participantMap).length);
    console.log('FITNESS_METRICS count:', FITNESS_METRICS.length);

    // Calculate max improvement count for each participant
    const participantImprovements = {};

    Object.entries(participantMap).forEach(([key, participant]) => {
      // Only consider participants with 2+ years of data
      const participantYears = Object.keys(participant.years || {});
      if (participantYears.length < 2) return;

      participantImprovements[key] = {
        displayName: participant.displayName,
        maxStationsImproved: 0,
        improvements: [],
        participantKey: key
      };

      // Check all year pairs (consecutive and skipped)
      for (let i = 0; i < years.length; i++) {
        for (let j = i + 1; j < years.length; j++) {
          const currYear = years[i];
          const nextYear = years[j];

          const currData = participant.years[currYear];
          const nextData = participant.years[nextYear];
          
          if (!currData || !nextData) continue;

          // Count how many metrics improved
          let improvedCount = 0;
          const improvedMetrics = [];

          FITNESS_METRICS.forEach(metric => {
            const a = parseFloat(currData[metric.key]);
            const b = parseFloat(nextData[metric.key]);
            
            if (isNaN(a) || isNaN(b)) return;

            const improved = metric.higherIsBetter ? b > a : b < a;
            if (improved) {
              improvedCount++;
              improvedMetrics.push(metric.key);
            }
          });

          // Track the maximum improvement count
          if (improvedCount > participantImprovements[key].maxStationsImproved) {
            participantImprovements[key].maxStationsImproved = improvedCount;
            participantImprovements[key].improvements = [{
              comparison: `${currYear}→${nextYear}`,
              count: improvedCount,
              metrics: improvedMetrics
            }];
          }
        }
      }
    });

    // Filter and sort
    const result = Object.values(participantImprovements)
      .filter(item => item.maxStationsImproved >= stationCount)
      .map(item => ({
        displayName: item.displayName,
        stationsImproved: item.maxStationsImproved,
        participantKey: item.participantKey,
        improvements: item.improvements
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));

    // Debug log
    console.log('=== Sample Results ===');
    result.slice(0, 5).forEach(item => {
      console.log(`${item.displayName}: ${item.stationsImproved} stations`, item.improvements);
    });
    console.log(`Total filtered: ${result.length}/${Object.keys(participantImprovements).length}`);

    return result;
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

    const { showNamesModal, modalSource, improvementStationCount, showImprovementNamesModal, improvementStationCountForModal } = this.state;
    
    // Debug logging
    console.log('ParticipantsBlock render:', {
      showImprovementNamesModal,
      improvementStationCountForModal,
      hasData: !!data,
      isMultipleYearsView
    });

    const isImprovementModal = modalSource === 'improvement';
    const participantNames = this.getParticipantNames(data, isImprovementModal, improvementStationCount);
    const improvementDataWithCounts = this.getImprovementDataWithStationCounts(data, improvementStationCountForModal);

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
          onTotalParticipantsClick={() => this.openNamesModal('total')}
          onImprovementTotalParticipantsClick={(stationCount) => this.openNamesModal('improvement', stationCount)}
          onImprovementParticipantsClick={(stationCount) => this.openImprovementNamesModal(stationCount)}
        />

        <ParticipantsChartBlock
          years={years}
          yearlyParticipants={yearlyParticipants}
        />

        <ParticipantsNamesModal
          isOpen={showNamesModal}
          names={participantNames}
          onClose={this.closeNamesModal}
        />

        <ParticipantsImprovementNamesModal
          isOpen={showImprovementNamesModal}
          improvementData={improvementDataWithCounts}
          stationCount={improvementStationCountForModal}
          onClose={this.closeImprovementNamesModal}
        />
      </div>
    );
  }
}

export default ParticipantsBlock;

