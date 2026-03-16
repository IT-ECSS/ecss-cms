import React, { Component } from "react";
import '../../../css/sub/fitnessDashboardSection.css';
import ParticipationsBlock from './ParticipationsBlock';
import ParticipantsBlock from './ParticipantsBlock';
import {
  extractYearsFromData,
  createNormalizationHelpers,
  createParticipantKeyResolver,
  buildParticipantMap,
  getPreviousYearsParticipants,
  calculateYearlyStats,
  calculateMetricsData,
  calculateYearComparison,
  calculateDashboardData as calculateAllDashboardData
} from './fitnessDashboardCalculations';

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
    console.log('Updating selected centre. Available locations:', selectedLocations);
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


  handleStationCountChangeParticipations = (e) => {
    this.setState({ selectedStationCountParticipations: parseInt(e.target.value, 10) });
  }

  handleStationCountChangeParticipants = (e) => {
    this.setState({ selectedStationCountParticipants: parseInt(e.target.value, 10) });
  }

  handleImprovementBasisChange = (e) => {
    this.setState({ improvementBasis: e.target.value });
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

  drawGenderChart = (genderData) => {
    if (!this.genderChartCanvas) return;
    
    const ctx = this.genderChartCanvas.getContext('2d');
    const width = 700;
    const height = 350;
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    if (genderData.length === 0) return;
    
    const maxVal = Math.max(10, ...genderData.flatMap(d => [d.male, d.female]));
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Draw Y-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * graphHeight;
      const val = Math.round((5 - i) / 5 * maxVal);
      ctx.fillText(val, padding.left - 10, y);
    }
    
    // Calculate points for both lines
    const femalePoints = genderData.map((d, idx) => ({
      x: padding.left + (idx / (genderData.length - 1 || 1)) * graphWidth,
      y: height - padding.bottom - ((d.female / maxVal) * graphHeight),
      value: d.female,
      year: d.year
    }));
    
    const malePoints = genderData.map((d, idx) => ({
      x: padding.left + (idx / (genderData.length - 1 || 1)) * graphWidth,
      y: height - padding.bottom - ((d.male / maxVal) * graphHeight),
      value: d.male,
      year: d.year
    }));
    
    // Draw female line
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(femalePoints[0].x, femalePoints[0].y);
    for (let i = 1; i < femalePoints.length; i++) {
      ctx.lineTo(femalePoints[i].x, femalePoints[i].y);
    }
    ctx.stroke();
    
    // Draw male line
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(malePoints[0].x, malePoints[0].y);
    for (let i = 1; i < malePoints.length; i++) {
      ctx.lineTo(malePoints[i].x, malePoints[i].y);
    }
    ctx.stroke();
    
    // Draw female points
    ctx.fillStyle = '#ec4899';
    for (const p of femalePoints) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw male points
    ctx.fillStyle = '#3b82f6';
    for (const p of malePoints) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw X-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const p of femalePoints) {
      ctx.fillText(p.year, p.x, height - 45);
    }
    
    // Draw female value labels
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const p of femalePoints) {
      ctx.fillText(p.value, p.x, p.y - 18);
    }
    
    // Draw male value labels
    ctx.fillStyle = '#3b82f6';
    for (const p of malePoints) {
      ctx.fillText(p.value, p.x, p.y - 18);
    }
    
    // Draw legend at center bottom
    const legendCenterX = width / 2 - 55;
    const legendCenterY = height - 20;
    
    // Female legend
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(legendCenterX, legendCenterY, 12, 12);
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Female', legendCenterX + 18, legendCenterY + 6);
    
    // Male legend
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(legendCenterX + 90, legendCenterY, 12, 12);
    ctx.fillStyle = '#64748b';
    ctx.fillText('Male', legendCenterX + 108, legendCenterY + 6);
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
      yearlyGender
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

        <div className="fft-dash-gender-row-full-width">
          <h3 className="fft-dash-section-header">Gender Distribution (Unique individuals) by year</h3>
          <div className="fft-dash-line-chart">
            {(() => {
              const genderData = years.map(year => {
                const yearData = yearlyGender[year] || {};
                return {
                  year,
                  male: yearData.male || 0,
                  female: yearData.female || 0
                };
              });

              if (genderData.length === 0) {
                return <div className="fft-dash-chart-empty">No data available</div>;
              }

              return (
                <canvas
                  ref={(canvas) => {
                    this.genderChartCanvas = canvas;
                    if (canvas) {
                      setTimeout(() => this.drawGenderChart(genderData), 0);
                    }
                  }}
                  width={900}
                  height={400}
                  className="fft-dash-chart-canvas"
                  style={{borderRadius: '4px'}}
                />
              );
            })()}
          </div>
        </div>
      </>
    );
  }
}

export default FitnessDashboardSection;
