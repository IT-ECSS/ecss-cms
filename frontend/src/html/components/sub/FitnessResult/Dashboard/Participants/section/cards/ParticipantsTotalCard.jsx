import React, { Component } from "react";

class ParticipantsTotalCard extends Component {
  render() {
    const { totalParticipants } = this.props;
    return (
      <div className="fft-dash-kpi-card">
        <div className="fft-dash-kpi-label">
          <div style={{ whiteSpace: 'nowrap' }}>Total Participants</div>
          <div style={{ whiteSpace: 'nowrap' }}>(Unique Individuals)</div>
        </div>
        <div className="fft-dash-kpi-value">{totalParticipants}</div>
      </div>
    );
  }
}

export default ParticipantsTotalCard;
