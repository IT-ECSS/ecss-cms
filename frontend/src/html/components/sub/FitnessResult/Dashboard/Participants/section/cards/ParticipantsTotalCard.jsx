import React, { Component } from "react";

class ParticipantsTotalCard extends Component {
  handleKeyDown = (event) => {
    const { onClick } = this.props;
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }

  render() {
    const { totalParticipants, onClick } = this.props;
    return (
      <div
        className="fft-dash-kpi-card"
        onClick={onClick}
        onKeyDown={this.handleKeyDown}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
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
