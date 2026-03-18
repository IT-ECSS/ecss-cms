import React, { Component } from "react";
import ParticipantsCardsBlock from './section/ParticipantsCardsBlock';
import ParticipantsChartBlock from './section/ParticipantsChartBlock';

class ParticipantsBlock extends Component {
  render() {
    const {
      data,
      yearlyParticipants = {},
      years = [],
      selectedStationCountParticipants = 1,
      handleStationCountChangeParticipants,
      isMultipleYearsView
    } = this.props;

    if (!data) {
      return (
        <div className="fft-dash-right-section">
          <h3 className="fft-dash-section-header">Participants</h3>
          <div className="fft-dash-empty">No data available</div>
        </div>
      );
    }

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
      </div>
    );
  }
}

export default ParticipantsBlock;

