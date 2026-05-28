import React, { Component } from "react";

class ParticipationsTotalCard extends Component {
  render() {
    const { totalParticipations } = this.props;

    return (
      <div className="fft-dash-kpi-card">
        <div className="fft-dash-kpi-label">
          <div style={{ whiteSpace: 'nowrap' }}>Participations</div>
          <div style={{ whiteSpace: 'nowrap' }}>(Attendance)</div>
        </div>
        <div className="fft-dash-kpi-value">{totalParticipations}</div>
      </div>
    );
  }
}

export default ParticipationsTotalCard;
