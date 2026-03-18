import React, { Component } from "react";
import ParticipationsTotalCard from './ParticipationsTotalCard';
import ParticipationsFemaleCard from './ParticipationsFemaleCard';
import ParticipationsMaleCard from './ParticipationsMaleCard';
import ParticipationsImprovementCard from './ParticipationsImprovementCard';

class ParticipationsCardsBlock extends Component {
  render() {
    const {
      data,
      selectedStationCountParticipations = 1,
      handleStationCountChangeParticipations,
      isMultipleYearsView
    } = this.props;

    if (!data) {
      return <div className="fft-dash-empty">No data available</div>;
    }

    const {
      totalParticipations,
      maleParticipations,
      femaleParticipations
    } = data;

    return (
      <div className="fft-dash-kpi-row">
        <ParticipationsTotalCard
          totalParticipations={totalParticipations}
        />
        
        <ParticipationsFemaleCard
          femaleParticipations={femaleParticipations}
        />
        
        <ParticipationsMaleCard
          maleParticipations={maleParticipations}
        />
        
        {isMultipleYearsView && (
          <ParticipationsImprovementCard
            data={data}
            selectedStationCountParticipations={selectedStationCountParticipations}
            handleStationCountChangeParticipations={handleStationCountChangeParticipations}
            isMultipleYearsView={isMultipleYearsView}
          />
        )}
      </div>
    );
  }
}

export default ParticipationsCardsBlock;
