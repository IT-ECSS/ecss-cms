import React, { Component } from "react";

class ParticipationsBlock extends Component {
  getParticipantName = (row) => {
    const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
    return nameKey ? row[nameKey] || 'Unknown' : 'Unknown';
  };

  getParticipantGender = (row) => {
    const genderKey = Object.keys(row).find(k => k.toLowerCase() === 'gender' || k.toLowerCase() === 'sex');
    const value = genderKey ? String(row[genderKey] || '').toLowerCase() : '';
    return value === 'm' || value === 'male' ? 'Male' : 'Female';
  };

  calculateStats = () => {
    const { filteredData = [] } = this.props;
    
    let totalParticipations = 0;
    let femaleParticipations = 0;
    let maleParticipations = 0;

    filteredData.forEach(row => {
      const name = this.getParticipantName(row);
      if (name.toLowerCase() === 'unknown') return;

      totalParticipations++;
      const gender = this.getParticipantGender(row);
      
      if (gender === 'Female') {
        femaleParticipations++;
      } else {
        maleParticipations++;
      }
    });

    return {
      totalParticipations,
      femaleParticipations,
      maleParticipations
    };
  };

  render() {
    const stats = this.calculateStats();

    return (
      <div className="fitness-participations-block">
        <div className="fitness-block-header">
          <h2 className="fitness-block-title">
            <i className="fas fa-calendar"></i> Block A: Participations
          </h2>
          <p className="fitness-block-description">
            Counts every attendance record. Repeat attendances are included.
          </p>
        </div>
        
        <div className="fitness-block-content">
          <div className="fitness-block-stat">
            <i className="fas fa-list"></i>
            <div className="fitness-block-stat-info">
              <span className="fitness-block-stat-value">{stats.totalParticipations}</span>
              <span className="fitness-block-stat-label">Total<br/>Participations</span>
            </div>
          </div>
          
          <div className="fitness-block-stat">
            <i className="fas fa-venus"></i>
            <div className="fitness-block-stat-info">
              <span className="fitness-block-stat-value">{stats.femaleParticipations}</span>
              <span className="fitness-block-stat-label">Female<br/>{((stats.femaleParticipations / stats.totalParticipations) * 100).toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="fitness-block-stat">
            <i className="fas fa-mars"></i>
            <div className="fitness-block-stat-info">
              <span className="fitness-block-stat-value">{stats.maleParticipations}</span>
              <span className="fitness-block-stat-label">Male<br/>{((stats.maleParticipations / stats.totalParticipations) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ParticipationsBlock;
