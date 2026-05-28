import React, { Component } from "react";

class ParticipationsFemaleCard extends Component {
  render() {
    const { femaleParticipations } = this.props;

    return (
      <div className="fft-dash-kpi-card fft-dash-kpi-female">
        <div className="fft-dash-kpi-label">
          <div style={{ whiteSpace: 'nowrap' }}>Participations</div>
          <div style={{ whiteSpace: 'nowrap' }}>(Female)</div>
        </div>
        <div className="fft-dash-kpi-value">{femaleParticipations}</div>
      </div>
    );
  }
}

export default ParticipationsFemaleCard;
