import React, { Component } from "react";

class ParticipationsMaleCard extends Component {
  render() {
    const { maleParticipations } = this.props;

    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-male">
        <div className="fft-dash-kpi-label">
          <div style={{ whiteSpace: 'nowrap' }}>Participations</div>
          <div style={{ whiteSpace: 'nowrap' }}>(Male)</div>
        </div>
        <div className="fft-dash-kpi-value">{maleParticipations}</div>
      </div>
    );
  }
}

export default ParticipationsMaleCard;
