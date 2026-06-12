import React, { Component } from "react";
import ParticipantsTotalCard from './cards/ParticipantsTotalCard';
import ParticipantsFemaleCard from './cards/ParticipantsFemaleCard';
import ParticipantsMaleCard from './cards/ParticipantsMaleCard';
import ParticipantsImprovementCard from './cards/ParticipantsImprovementCard';

class ParticipantsCardsBlock extends Component {
  render() {
    const {
      data,
      selectedStationCountParticipants = 1,
      handleStationCountChangeParticipants,
      isMultipleYearsView
    } = this.props;

    if (!data) {
      return <div className="fft-dash-empty">No data available</div>;
    }

    const { totalParticipants, maleCount, femaleCount } = data;

    return (
      <div className="fft-dash-kpi-row">
        <ParticipantsTotalCard totalParticipants={totalParticipants} />

        <ParticipantsFemaleCard totalParticipants={totalParticipants} femaleCount={femaleCount} />

        <ParticipantsMaleCard totalParticipants={totalParticipants} maleCount={maleCount} />

        {isMultipleYearsView && (
          <ParticipantsImprovementCard
            data={data}
            totalParticipants={totalParticipants}
            selectedStationCountParticipants={selectedStationCountParticipants}
            handleStationCountChangeParticipants={handleStationCountChangeParticipants}
            isMultipleYearsView={isMultipleYearsView}
          />
        )}
      </div>
    );
  }
}

export default ParticipantsCardsBlock;
