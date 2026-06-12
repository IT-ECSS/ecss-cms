import React, { Component } from "react";
import '../../../../../css/sub/FitnessResult/Dashboard/fitnessDashboardSection.css';
import { ParticipationsBlock, ParticipantsBlock, GenderBlock } from '../../index';
import { calculateDashboardData as calculateAllDashboardData } from './fitnessDashboardCalculations';
import FitnessImprovementAnalysisPanel from './FitnessImprovementAnalysisPanel';

class FitnessDashboardSection extends Component {
  componentDidMount() {
    // Set the first selected centre as default
    this.updateSelectedCentreIfNeeded(this.props);
  }

  componentDidUpdate(prevProps) {
    // Update selected centre if selectedLocations changed
    if (JSON.stringify(prevProps.selectedLocations) !== JSON.stringify(this.props.selectedLocations)) {
      this.updateSelectedCentreIfNeeded(this.props);
    }
  }

  updateSelectedCentreIfNeeded = (props) => {
    const { selectedLocations = [] } = props;
    const { selectedCentre } = this.state;

    // If no centre is selected, or the current selection is not in the list, select all by default
    if (!selectedCentre || (Array.isArray(selectedCentre)
      ? selectedCentre.some(c => !selectedLocations.includes(c))
      : !selectedLocations.includes(selectedCentre))) {
      if (selectedLocations.length > 0) {
        this.setState({ selectedCentre: [...selectedLocations] });
      }
    }
  }

  handleCentreSelect = (centre) => {
    // Support both single and multiple centre selection
    this.setState({ selectedCentre: centre });
    console.log('Centre(s) selected:', centre);
  }
  constructor(props) {
    super(props);
    this.state = {
      selectedCentre: null, // Will be set to first centre if available
      selectedStationCountParticipations: 1, // For Participations section
      selectedStationCountParticipants: 1, // For Participants section
      improvementBasis: 'entries' // 'entries' or 'participants'
    };
    // Fitness metrics
    this.fitnessMetrics = [
      { key: '30 secs Sit & Stand', label: '30 Secs Sit & Stand', unit: 'reps', higherIsBetter: true },
      { key: '30 secs Arm Curl', label: '30 Secs Arm Curl', unit: 'reps', higherIsBetter: true },
      { key: '2 min March on the spot', label: '2 Min March On The Spot', unit: 'steps', higherIsBetter: true },
      { key: 'Sit & Reach', label: 'Sit & Reach', unit: 'cm', higherIsBetter: true },
      { key: 'Back Stretch', label: 'Back Stretch', unit: 'cm', higherIsBetter: true },
      { key: '2.44m speed walk', label: '2.44m Speed Walk', unit: 'sec', higherIsBetter: false },
      { key: 'Grip Test', label: 'Grip Test', unit: 'kg', higherIsBetter: true }
    ];
  } 

  getFilteredDataByCentre = () => {
    const { filteredData = [], yearFrom, yearTo } = this.props;
    const { selectedCentre } = this.state;

    console.log('Filtering data for centre(s):', selectedCentre, 'years:', yearFrom, '-', yearTo);
    console.log('Original data count:', filteredData.length);
    
    let filtered = filteredData;
    
    // Filter by centre - support multiple selected centres (selectedCentre can be array or string)
    if (selectedCentre && (Array.isArray(selectedCentre) ? selectedCentre.length > 0 : true)) {
      if (Array.isArray(selectedCentre)) {
        filtered = filtered.filter(item => selectedCentre.includes(item.location));
      } else {
        filtered = filtered.filter(item => item.location === selectedCentre);
      }
    }
    
    // Filter by year range
    if (yearFrom || yearTo) {
      filtered = filtered.filter(item => {
        const yearKey = Object.keys(item).find(k => k.toLowerCase() === 'year');
        if (!yearKey) return true; // Include rows without year info
        const itemYear = item[yearKey]?.toString();
        if (!itemYear) return true;
        
        if (yearFrom && yearTo) {
          return itemYear >= yearFrom && itemYear <= yearTo;
        } else if (yearFrom) {
          return itemYear >= yearFrom;
        } else if (yearTo) {
          return itemYear <= yearTo;
        }
        return true;
      });
    }
    
    console.log('Filtered data count:', filtered.length);
    return filtered;
  }

  isSingleYearView = () => {
    const { yearFrom, yearTo } = this.props;
    return yearFrom && (!yearTo || yearTo === yearFrom);
  }

  isMultipleYearsView = () => {
    const { yearFrom, yearTo } = this.props;
    return yearFrom && yearTo && yearFrom !== yearTo;
  }

  // Find the first key in the row that matches the predicate (case-insensitive)
  findKey = (row, predicate) => {
    return Object.keys(row).find((k) => predicate(k.trim().toLowerCase()));
  };

  getParticipantName = (row) => {
    const matchName = (k) => {
      // Avoid picking username / system name columns
      if (k.includes('user')) return false;
      return k === 'name' || k.includes(' name') || k.startsWith('name');
    };

    const matchChinese = (k) => k.includes('chinese') && k.includes('name');

    const nameKey = this.findKey(row, matchName);
    const cnKey = this.findKey(row, matchChinese);

    const name = nameKey ? row[nameKey] : '';
    const chineseName = cnKey ? row[cnKey] : '';

    const defaultName = name || chineseName;
    if (!defaultName) return 'Unknown';
    if (name && chineseName) return `${name} / ${chineseName}`;
    return defaultName;
  };

  findMetricKey = (row, metricKey) => {
    const exactMatch = Object.keys(row).find(k => k.toLowerCase() === metricKey.toLowerCase());
    return exactMatch || null;
  };

  getParticipantGender = (row) => {
    const genderKey = Object.keys(row).find(k => k.toLowerCase() === 'gender' || k.toLowerCase() === 'sex');
    const value = genderKey ? String(row[genderKey] || '').toLowerCase().trim() : '';
    
    // Check for Female values
    if (value === 'f' || value === 'female') {
      return 'Female';
    }
    
    // Check for Male values
    if (value === 'm' || value === 'male') {
      return 'Male';
    }
    
    // Default to Female if empty or unrecognized
    return 'Female';
  };

  handleStationCountChangeParticipations = (e) => {
    // Handle both event objects and direct number values
    const value = typeof e === 'number' ? e : parseInt(e.target.value, 10);
    this.setState({ selectedStationCountParticipations: value });
  };

  handleStationCountChangeParticipants = (e) => {
    // Handle both event objects and direct number values
    const value = typeof e === 'number' ? e : parseInt(e.target.value, 10);
    this.setState({ selectedStationCountParticipants: value });
  };

  // Calculate all dashboard data - Main orchestrator
  calculateDashboardData = () => {
    const mapData = this.getFilteredDataByCentre();
    return calculateAllDashboardData(
      mapData,
      this.fitnessMetrics,
      this.getParticipantGender,
      this.getParticipantName,
      this.findKey,
      this.findMetricKey
    );
  };

  render() {
    const { yearFrom, yearTo, loading = false, selectedLocations = [] } = this.props;
    const { selectedCentre } = this.state;
    const isSingleYear = this.isSingleYearView();
    const data = this.calculateDashboardData();

    if (loading) {
      return (
        <div className="fft-dash-loading">
          <div className="fft-dash-spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="fft-dash-empty">
          <p>No data available</p>
        </div>
      );
    }

    const {
      years,
      yearlyParticipants,
      yearlyGender,
      participantMap
    } = data;

    return (
      <>
        {/* Centre Selection Tabs */}
        {/* Removed centre selection sub-tabs for Dashboard. Only consolidated view is shown. */}

        {/* Two-column layout: Participations (left) + Participants (right) */}
        <div className="fft-dash-sections-wrapper">
          <ParticipationsBlock
            data={data}
            yearlyParticipants={yearlyParticipants}
            years={years}
            selectedStationCountParticipations={this.state.selectedStationCountParticipations}
            handleStationCountChangeParticipations={this.handleStationCountChangeParticipations}
            isMultipleYearsView={this.isMultipleYearsView()}
          />

          <ParticipantsBlock
            data={data}
            yearlyParticipants={yearlyParticipants}
            years={years}
            selectedStationCountParticipants={this.state.selectedStationCountParticipants}
            handleStationCountChangeParticipants={this.handleStationCountChangeParticipants}
            isMultipleYearsView={this.isMultipleYearsView()}
          />
        </div>

        <GenderBlock
          years={years}
          yearlyGender={yearlyGender}
        />

        {/* Fitness Improvement Analysis Panel - Shows improvement across consecutive and skipped years */}
        {this.isMultipleYearsView() && participantMap && years && years.length >= 2 && (
          <FitnessImprovementAnalysisPanel
            data={{
              participantMap,
              years
            }}
          />
        )}
      </>
    );
  }
}

export default FitnessDashboardSection;
