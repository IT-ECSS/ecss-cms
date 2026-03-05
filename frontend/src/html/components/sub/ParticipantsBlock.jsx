import React, { Component } from "react";

class ParticipantsBlock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'participations', // 'participations' or 'participants'
      participationsViewMode: 'cards', // 'cards' or 'chart'
      participantsViewMode: 'cards' // 'cards' or 'chart'
    };
    this.participationsChartRef = React.createRef();
    this.participantsChartRef = React.createRef();
  }

  componentDidUpdate() {
    if (this.state.activeTab === 'participations' && this.state.participationsViewMode === 'chart') {
      this.drawParticipationsChart();
    } else if (this.state.activeTab === 'participants' && this.state.participantsViewMode === 'chart') {
      this.drawParticipantsChart();
    }
  }

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
    
    const uniqueParticipants = new Set();
    const participantMap = {};
    let femaleParticipants = 0;
    let maleParticipants = 0;

    filteredData.forEach(row => {
      const name = this.getParticipantName(row);
      if (name.toLowerCase() === 'unknown') return;

      uniqueParticipants.add(name.toLowerCase());

      if (!participantMap[name.toLowerCase()]) {
        participantMap[name.toLowerCase()] = this.getParticipantGender(row);
      }
    });

    Object.values(participantMap).forEach(gender => {
      if (gender === 'Female') {
        femaleParticipants++;
      } else {
        maleParticipants++;
      }
    });

    return {
      totalParticipants: uniqueParticipants.size,
      femaleParticipants,
      maleParticipants,
      totalParticipations: filteredData.length
    };
  };

  switchTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const stats = this.calculateStats();
    const { activeTab } = this.state;

    return (
      <div className="fitness-participants-block-tabbed">
        <div className="fitness-block-header">
          <h2 className="fitness-block-title">
            <i className="fas fa-chart-area"></i> Block B: Participations & Participants
          </h2>
          <p className="fitness-block-description">
            View participation and participant statistics.
          </p>
        </div>

        <div className="fitness-block-tabs-wrapper">
          <button 
            className={`fitness-block-tab-btn ${activeTab === 'participations' ? 'active' : ''}`}
            onClick={() => this.switchTab('participations')}
          >
            <i className="fas fa-chart-bar"></i> Participations
          </button>
          <button 
            className={`fitness-block-tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => this.switchTab('participants')}
          >
            <i className="fas fa-users"></i> Participants
          </button>
        </div>

        {/* Participations Tab Content */}
        {activeTab === 'participations' && (
          <div className="fitness-block-tab-content">
            <h3 className="fitness-block-section-title">Participations</h3>
            <div className="fitness-block-stats-row">
              <div className="fitness-block-stat">
                <i className="fas fa-chart-bar"></i>
                <div className="fitness-block-stat-info">
                  <span className="fitness-block-stat-value">{stats.totalParticipations}</span>
                  <span className="fitness-block-stat-label">Total</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Participants Tab Content */}
        {activeTab === 'participants' && (
          <div className="fitness-block-tab-content">
            <h3 className="fitness-block-section-title">Participants</h3>
            <div className="fitness-block-stats-row">
              <div className="fitness-block-stat">
                <i className="fas fa-user"></i>
                <div className="fitness-block-stat-info">
                  <span className="fitness-block-stat-value">{stats.totalParticipants}</span>
                  <span className="fitness-block-stat-label">Total</span>
                </div>
              </div>
              
              <div className="fitness-block-stat">
                <i className="fas fa-venus"></i>
                <div className="fitness-block-stat-info">
                  <span className="fitness-block-stat-value">{stats.femaleParticipants}</span>
                  <span className="fitness-block-stat-label">Female<br/>{stats.totalParticipants > 0 ? ((stats.femaleParticipants / stats.totalParticipants) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
              
              <div className="fitness-block-stat">
                <i className="fas fa-mars"></i>
                <div className="fitness-block-stat-info">
                  <span className="fitness-block-stat-value">{stats.maleParticipants}</span>
                  <span className="fitness-block-stat-label">Male<br/>{stats.totalParticipants > 0 ? ((stats.maleParticipants / stats.totalParticipants) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default ParticipantsBlock;
