import React, { Component } from "react";

class ParticipantsFemaleCard extends Component {
  render() {
    const { totalParticipants, femaleCount } = this.props;
    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-female">
        <div className="fft-dash-kpi-label">
          <div style={{ whiteSpace: 'nowrap' }}>Female</div>
          <div style={{ whiteSpace: 'nowrap' }}>Participants</div>
        </div>
        <div className="fft-dash-kpi-value">
          {femaleCount}
        </div>
      </div>
    );
  }
}

export default ParticipantsFemaleCard;
