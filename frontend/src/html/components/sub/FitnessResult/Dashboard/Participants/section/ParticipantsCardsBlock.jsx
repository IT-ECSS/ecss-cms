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
        <ParticipantsTotalCard totalParticipants={totalParticipants} onClick={this.props.onTotalParticipantsClick} />

        <ParticipantsFemaleCard totalParticipants={totalParticipants} femaleCount={femaleCount} />

        <ParticipantsMaleCard totalParticipants={totalParticipants} maleCount={maleCount} />

        {isMultipleYearsView && (
          <ParticipantsImprovementCard
            data={data}
            selectedStationCountParticipants={selectedStationCountParticipants}
            handleStationCountChangeParticipants={handleStationCountChangeParticipants}
            isMultipleYearsView={isMultipleYearsView}
            onTotalParticipantsClick={this.props.onTotalParticipantsClick}
            onImprovementTotalParticipantsClick={this.props.onImprovementTotalParticipantsClick}
            onImprovementParticipantsClick={this.props.onImprovementParticipantsClick}
          />
        )}
      </div>
    );
  }
}

export default ParticipantsCardsBlock;
