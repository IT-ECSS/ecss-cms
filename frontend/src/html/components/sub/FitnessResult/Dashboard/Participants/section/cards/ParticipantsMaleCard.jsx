import React, { Component } from "react";

class ParticipantsMaleCard extends Component {
  render() {
    const { totalParticipants, maleCount } = this.props;
    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-male">
        <div className="fft-dash-kpi-label">
          <div style={{ whiteSpace: 'nowrap' }}>Male</div>
          <div style={{ whiteSpace: 'nowrap' }}>Participants</div>
        </div>
        <div className="fft-dash-kpi-value">
          {maleCount}
        </div>
      </div>
    );
  }
}

export default ParticipantsMaleCard;
