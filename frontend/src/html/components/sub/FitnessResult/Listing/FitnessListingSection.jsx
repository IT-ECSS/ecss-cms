import React, { Component } from "react";
import '../../../../../css/sub/FitnessResult/Listing/fitnessListingSection.css';

class FitnessListingSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      yearFrom: '2024',
      yearTo: '2025',
      centre: 'CT Hub',
      activeTab: 'dashboard', // 'dashboard' or 'participants'
      selectedStation: null // Will be set to first available station
    };
  }

  // Calculate Statistics
  calculateStats = () => {
    const { filteredData = [] } = this.props;
    
    let totalParticipations = 0;
    let femaleParticipations = 0;
    let maleParticipations = 0;
    const uniqueParticipants = new Set();
    let femaleParticipants = 0;
    let maleParticipants = 0;

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

      uniqueParticipants.add(name.toLowerCase());
    });

    // Calculate unique participant gender distribution
    const participantMap = {};
    filteredData.forEach(row => {
      const name = this.getParticipantName(row).toLowerCase().trim();
      if (!name || name === 'unknown') return;

      if (!participantMap[name]) {
        participantMap[name] = this.getParticipantGender(row);
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
      totalParticipations,
      femaleParticipations,
      maleParticipations,
      totalParticipants: uniqueParticipants.size,
      femaleParticipants,
      maleParticipants
    };
  };

  // Calculate Year-on-Year Performance
  calculateYearOnYearPerformance = () => {
    const { filteredData = [] } = this.props;
    const yearData = {};

    filteredData.forEach(row => {
      const name = this.getParticipantName(row);
      if (name.toLowerCase() === 'unknown') return;

      const year = this.getYearFromRow(row);
      if (!year) return;

      if (!yearData[year]) {
        yearData[year] = {
          year,
          totalParticipations: 0,
          femaleParticipations: 0,
          maleParticipations: 0,
          uniqueParticipants: new Set(),
          participantsByGender: {}
        };
      }

      yearData[year].totalParticipations++;
      const gender = this.getParticipantGender(row);

      if (gender === 'Female') {
        yearData[year].femaleParticipations++;
      } else {
        yearData[year].maleParticipations++;
      }

      yearData[year].uniqueParticipants.add(name.toLowerCase());

      // Track unique participants by gender
      const nameLower = name.toLowerCase();
      if (!yearData[year].participantsByGender[nameLower]) {
        yearData[year].participantsByGender[nameLower] = gender;
      }
    });

    // Convert unique participants to final counts and sort by year
    const yoyData = Object.keys(yearData)
      .sort()
      .map(year => {
        const data = yearData[year];
        const femaleParticipants = Object.values(data.participantsByGender).filter(g => g === 'Female').length;
        const maleParticipants = data.uniqueParticipants.size - femaleParticipants;

        return {
          year,
          totalParticipations: data.totalParticipations,
          femaleParticipations: data.femaleParticipations,
          maleParticipations: data.maleParticipations,
          totalParticipants: data.uniqueParticipants.size,
          femaleParticipants,
          maleParticipants
        };
      });

    return yoyData;
  };

  getParticipantName = (row) => {
    const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
    return nameKey ? row[nameKey] || 'Unknown' : 'Unknown';
  };

  getParticipantGender = (row) => {
    const genderKey = Object.keys(row).find(k => k.toLowerCase() === 'gender' || k.toLowerCase() === 'sex');
    const value = genderKey ? String(row[genderKey] || '').toLowerCase() : '';
    return value === 'm' || value === 'male' ? 'Male' : 'Female';
  };

  getYearFromRow = (row) => {
    const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
    return yearKey ? row[yearKey] : null;
  };

  // Get Station from Row
  getStationFromRow = (row) => {
    const stationKey = Object.keys(row).find(k => k.toLowerCase() === 'station' || k.toLowerCase() === 'centre' || k.toLowerCase() === 'center');
    return stationKey ? row[stationKey] : 'Unknown Station';
  };

  // Get all unique stations
  getUniqueStations = () => {
    const { filteredData = [] } = this.props;
    const stations = new Set();
    
    filteredData.forEach(row => {
      const station = this.getStationFromRow(row);
      if (station && station.toLowerCase() !== 'unknown') {
        stations.add(station);
      }
    });
    
    return Array.from(stations).sort();
  };

  // Calculate Year-on-Year Performance by Station
  calculateYearOnYearByStation = (stationName) => {
    const { filteredData = [] } = this.props;
    const yearData = {};

    filteredData.forEach(row => {
      const station = this.getStationFromRow(row);
      if (station !== stationName) return;

      const name = this.getParticipantName(row);
      if (name.toLowerCase() === 'unknown') return;

      const year = this.getYearFromRow(row);
      if (!year) return;

      if (!yearData[year]) {
        yearData[year] = {
          year,
          totalParticipations: 0,
          femaleParticipations: 0,
          maleParticipations: 0,
          uniqueParticipants: new Set(),
          participantsByGender: {}
        };
      }

      yearData[year].totalParticipations++;
      const gender = this.getParticipantGender(row);

      if (gender === 'Female') {
        yearData[year].femaleParticipations++;
      } else {
        yearData[year].maleParticipations++;
      }

      yearData[year].uniqueParticipants.add(name.toLowerCase());

      const nameLower = name.toLowerCase();
      if (!yearData[year].participantsByGender[nameLower]) {
        yearData[year].participantsByGender[nameLower] = gender;
      }
    });

    const yoyData = Object.keys(yearData)
      .sort()
      .map(year => {
        const data = yearData[year];
        const femaleParticipants = Object.values(data.participantsByGender).filter(g => g === 'Female').length;
        const maleParticipants = data.uniqueParticipants.size - femaleParticipants;

        return {
          year,
          totalParticipations: data.totalParticipations,
          femaleParticipations: data.femaleParticipations,
          maleParticipations: data.maleParticipations,
          totalParticipants: data.uniqueParticipants.size,
          femaleParticipants,
          maleParticipants
        };
      });

    return yoyData;
  };

  render() {
    return (
      <div className="fitness-dashboard-container">
      </div>
    );
  }
}

export default FitnessListingSection;
