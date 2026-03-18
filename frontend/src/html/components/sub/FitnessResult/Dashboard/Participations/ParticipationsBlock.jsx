import React, { Component } from "react";
import ParticipationsCardsBlock from './section/ParticipationsCardsBlock';
import ParticipationsChartBlock from './section/ParticipationsChartBlock';

class ParticipationsBlock extends Component {
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
          <h3 className="fft-dash-section-header">Participations</h3>
          <div className="fft-dash-empty">No data available</div>
        </div>
      );
    }

    return (
      <div className="fft-dash-left-section">
        <h3 className="fft-dash-section-header">Participations</h3>
        
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
