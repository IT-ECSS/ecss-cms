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

    const { totalParticipants, maleCount, femaleCount } = data;

    return (
      <div className="fft-dash-kpi-row">
        <ParticipantsTotalCard totalParticipants={totalParticipants} />

        <ParticipantsFemaleCard totalParticipants={totalParticipants} femaleCount={femaleCount} />

        <ParticipantsMaleCard totalParticipants={totalParticipants} maleCount={maleCount} />

        {isMultipleYearsView && (
          <ParticipantsImprovementCard
            data={data}
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
