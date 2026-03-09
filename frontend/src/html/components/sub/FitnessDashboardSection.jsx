import React, { Component } from "react";
import '../../../css/sub/fitnessDashboardSection.css';
import ParticipationsBlock from './ParticipationsBlock';
import ParticipantsBlock from './ParticipantsBlock';

class FitnessDashboardSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dashboardMainViewMode: 'participations', // 'participations' or 'participants'
      participantsViewMode: 'cards', // 'cards' or 'chart'
      participationsViewMode: 'cards', // 'cards' or 'chart'
      genderViewMode: 'cards' // 'cards' or 'chart'
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

  isSingleYearView = () => {
    const { yearFrom, yearTo } = this.props;
    return yearFrom && (!yearTo || yearTo === yearFrom);
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
    const value = genderKey ? String(row[genderKey] || '').toLowerCase() : '';
    return value === 'm' || value === 'male' ? 'Male' : 'Female';
  };

  // Calculate all dashboard data
  calculateDashboardData = () => {
    const { filteredData = [] } = this.props;
    
    if (!filteredData || filteredData.length === 0) return null;

    // Get years
    const yearsSet = new Set();
    filteredData.forEach(row => {
      const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
      if (yearKey && row[yearKey]) yearsSet.add(row[yearKey].toString());
    });
    const years = [...yearsSet].sort();

    // Group by participant (dedupe by Name / Chinese Name)
    const participantMap = {};
    const participantKeyMap = new Map(); // maps normalized name/cn -> canonical key
    const normalize = (val) => (val || '').toString().trim().toLowerCase();

    const normalizePhone = (val) => {
      const digits = (val || '').toString().replace(/\D/g, '');
      return digits.startsWith('65') ? digits.slice(2) : digits;
    };

    const normalizeId = (val) => (val || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const matchNameKey = (k) => {
      if (k.includes('user')) return false;
      return k === 'name' || k.includes(' name') || k.startsWith('name');
    };

    const matchChineseKey = (k) => k.includes('chinese') && k.includes('name');

    const matchPhoneKey = (k) => k.includes('phone') || k.includes('tel') || k.includes('mobile');

    const matchIdKey = (k) => {
      return k.includes('ic') || k.includes('nric') || k.includes('uinfin') || k.includes('id');
    };

    const getParticipantKey = (row) => {
      const nameKey = this.findKey(row, matchNameKey);
      const cnKey = this.findKey(row, matchChineseKey);
      const phoneKey = this.findKey(row, matchPhoneKey);
      const idKey = this.findKey(row, matchIdKey);

      const name = nameKey ? normalize(row[nameKey]) : '';
      const chineseName = cnKey ? normalize(row[cnKey]) : '';
      const phone = phoneKey ? normalizePhone(row[phoneKey]) : '';
      const id = idKey ? normalizeId(row[idKey]) : '';

      const keys = [name, chineseName, phone, id].filter(Boolean);
      if (!keys.length) return null;

      // If any key already is known, use the existing canonical key
      for (const k of keys) {
        if (participantKeyMap.has(k)) {
          const canonical = participantKeyMap.get(k);
          // Ensure all keys point to the same canonical
          keys.forEach((kk) => participantKeyMap.set(kk, canonical));
          return canonical;
        }
      }

      // New participant; choose the first key as canonical and map all keys
      const canonical = keys[0];
      keys.forEach((k) => participantKeyMap.set(k, canonical));
      return canonical;
    };

    let maleCount = 0;
    let femaleCount = 0;
    let maleParticipations = 0;
    let femaleParticipations = 0;

    filteredData.forEach(row => {
      const participantKey = getParticipantKey(row);
      const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
      const year = yearKey ? row[yearKey]?.toString() : null;
      if (!participantKey || !year) return;

      // Track participation entries by gender
      const gender = this.getParticipantGender(row);
      if (gender === 'Male') maleParticipations++;
      else femaleParticipations++;

      if (!participantMap[participantKey]) {
        participantMap[participantKey] = {
          displayName: this.getParticipantName(row),
          gender,
          years: {}
        };
        if (gender === 'Male') maleCount++;
        else femaleCount++;
      }

      if (!participantMap[participantKey].years[year]) {
        participantMap[participantKey].years[year] = {};
      }

      this.fitnessMetrics.forEach(metric => {
        const metricKey = this.findMetricKey(row, metric.key);
        const val = metricKey ? row[metricKey] : null;
        if (val !== null && val !== undefined && val !== '') {
          participantMap[participantKey].years[year][metric.key] = parseFloat(val);
        }
      });
    });

    const totalParticipants = Object.keys(participantMap).length;

    // Calculate participants per year (unique and total entries) + gender breakdown
    const yearlyParticipants = {};
    const yearlyGender = {};
    const yearlyParticipationGender = {};
    years.forEach((year, yearIndex) => {
      const uniqueNames = new Set();
      let totalEntries = 0;
      let maleInYear = 0;
      let femaleInYear = 0;
      let maleParticipationsInYear = 0;
      let femaleParticipationsInYear = 0;
      const countedNames = new Set();
      const participantEntryCount = {}; // Track entries per participant
      const newParticipantNames = new Set(); // Track new participants
      
      // Get all participants from previous years
      const previousYearsParticipants = new Set();
      for (let i = 0; i < yearIndex; i++) {
        Object.entries(participantMap).forEach(([name, data]) => {
          if (data.years[years[i]]) {
            previousYearsParticipants.add(name);
          }
        });
      }
      
      filteredData.forEach(row => {
        const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
        if ((yearKey ? row[yearKey]?.toString() : null) !== year) return;

        const participantKey = getParticipantKey(row);
        if (!participantKey) return;

        uniqueNames.add(participantKey);
        totalEntries++;
        participantEntryCount[participantKey] = (participantEntryCount[participantKey] || 0) + 1;

        // Check if this is a new participant (not in previous years)
        if (!previousYearsParticipants.has(participantKey)) {
          newParticipantNames.add(participantKey);
        }

        const gender = this.getParticipantGender(row);
        // Track participation entries by gender
        if (gender === 'Male') maleParticipationsInYear++;
        else femaleParticipationsInYear++;

        // Count gender only once per unique participant per year
        if (!countedNames.has(participantKey)) {
          countedNames.add(participantKey);
          if (gender === 'Male') maleInYear++;
          else femaleInYear++;
        }
      });
      
      // Count repeat participants (participated more than once)
      const repeatParticipants = Object.values(participantEntryCount).filter(count => count > 1).length;
      
      yearlyParticipants[year] = {
        unique: uniqueNames.size,
        newUnique: newParticipantNames.size,
        repeat: repeatParticipants,
        total: totalEntries,
        maleParticipations: maleParticipationsInYear,
        femaleParticipations: femaleParticipationsInYear,
        maleUnique: maleInYear,
        femaleUnique: femaleInYear
      };
      yearlyGender[year] = { male: maleInYear, female: femaleInYear };
      yearlyParticipationGender[year] = { male: maleParticipationsInYear, female: femaleParticipationsInYear };
    });

    // Calculate metrics data
    const metricsData = {};
    this.fitnessMetrics.forEach(metric => {
      const yearlyData = {};
      years.forEach(year => {
        const values = [];
        filteredData.forEach(row => {
          const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
          if ((yearKey ? row[yearKey]?.toString() : null) !== year) return;
          const metricKey = this.findMetricKey(row, metric.key);
          const val = metricKey ? parseFloat(row[metricKey]) : null;
          if (val !== null && !isNaN(val)) values.push(val);
        });
        if (values.length > 0) {
          yearlyData[year] = {
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            count: values.length
          };
        }
      });

      // Count improvements for multi-year - now per year pair
      let improved = 0, declined = 0, noChange = 0;
      const yearPairProgress = {}; // Store progress for each consecutive year pair
      
      // Initialize year pairs
      for (let i = 0; i < years.length - 1; i++) {
        yearPairProgress[`${years[i]}-${years[i+1]}`] = { improved: 0, declined: 0, noChange: 0, total: 0 };
      }
      
      Object.values(participantMap).forEach(p => {
        const pYears = Object.keys(p.years).sort();
        if (pYears.length < 2) return;
        
        // Calculate for each consecutive year pair
        for (let i = 0; i < pYears.length - 1; i++) {
          const yearA = pYears[i];
          const yearB = pYears[i + 1];
          const pairKey = `${yearA}-${yearB}`;
          
          if (!yearPairProgress[pairKey]) continue;
          
          const valA = p.years[yearA]?.[metric.key];
          const valB = p.years[yearB]?.[metric.key];
          
          if (valA === undefined || valB === undefined || isNaN(valA) || isNaN(valB)) continue;
          
          const diff = valB - valA;
          yearPairProgress[pairKey].total++;
          if (diff === 0) yearPairProgress[pairKey].noChange++;
          else if (metric.higherIsBetter ? diff > 0 : diff < 0) yearPairProgress[pairKey].improved++;
          else yearPairProgress[pairKey].declined++;
        }
        
        // Overall first to last
        const first = p.years[pYears[0]]?.[metric.key];
        const last = p.years[pYears[pYears.length - 1]]?.[metric.key];
        if (first === undefined || last === undefined || isNaN(first) || isNaN(last)) return;
        const diff = last - first;
        if (diff === 0) noChange++;
        else if (metric.higherIsBetter ? diff > 0 : diff < 0) improved++;
        else declined++;
      });

      metricsData[metric.key] = { 
        ...metric, 
        yearlyData, 
        improved, 
        declined, 
        noChange,
        participantsCompared: improved + declined + noChange,
        yearPairProgress
      };
    });

    // Calculate year-to-year comparison data
    const yearComparisonData = {};
    for (let i = 0; i < years.length - 1; i++) {
      const currentYear = years[i];
      const nextYear = years[i + 1];
      const pairKey = `${currentYear}-${nextYear}`;
      
      const currentYearParticipants = new Set();
      const nextYearParticipants = new Set();
      
      // Get participants for current year
      Object.entries(participantMap).forEach(([name, data]) => {
        if (data.years[currentYear]) currentYearParticipants.add(name);
      });
      
      // Get participants for next year
      Object.entries(participantMap).forEach(([name, data]) => {
        if (data.years[nextYear]) nextYearParticipants.add(name);
      });
      
      // Calculate overlaps
      const returning = [...nextYearParticipants].filter(p => currentYearParticipants.has(p)).length;
      const newParticipants = [...nextYearParticipants].filter(p => !currentYearParticipants.has(p)).length;
      const left = [...currentYearParticipants].filter(p => !nextYearParticipants.has(p)).length;
      
      yearComparisonData[pairKey] = {
        returning,
        new: newParticipants,
        left
      };
    }

    return { 
      years, 
      totalParticipants, 
      maleCount, 
      femaleCount,
      totalParticipations: maleParticipations + femaleParticipations,
      maleParticipations,
      femaleParticipations,
      metricsData, 
      participantMap, 
      yearlyParticipants, 
      yearlyGender,
      yearlyParticipationGender,
      yearComparisonData
    };
  };

  drawChart = (participants, canvasRef = 'chartCanvas', legendLabel = 'Trend') => {
    const canvas = this[canvasRef];
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = 700;
    const height = 350;
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    if (participants.length === 0) return;
    
    const maxVal = Math.max(10, ...participants.map(d => d.value));
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
    
    // Calculate points
    const points = participants.map((p, idx) => ({
      x: padding.left + (idx / (participants.length - 1 || 1)) * graphWidth,
      y: height - padding.bottom - ((p.value / maxVal) * graphHeight),
      ...p
    }));
    
    // Draw line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#3b82f6';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw X-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const p of points) {
      ctx.fillText(p.year, p.x, height - 45);
    }
    
    // Draw value labels above points
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const p of points) {
      ctx.fillText(p.value, p.x, p.y - 20);
    }
    
    // Draw legend at center bottom
    const legendX = width / 2 - 50;
    const legendY = height - 20;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(legendX, legendY, 12, 12);
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(legendLabel, legendX + 18, legendY + 6);
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
    const { yearFrom, yearTo, loading = false } = this.props;
    const isSingleYear = this.isSingleYearView();
    const data = this.calculateDashboardData();
    const { dashboardMainViewMode } = this.state;

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
      totalParticipants,
      maleCount,
      femaleCount,
      totalParticipations,
      maleParticipations,
      femaleParticipations,
      yearlyParticipants,
      yearlyGender
    } = data;

    return (
      <>
        {/* Dashboard Main View Tabs */}
        <div className="fft-dash-main-view-tabs">
          <button
            className={`fft-dash-main-view-tab ${dashboardMainViewMode === 'participations' ? 'active' : ''}`}
            onClick={() => this.setState({ dashboardMainViewMode: 'participations' })}
          >
            <i className="fas fa-chart-bar"></i> Participations
          </button>
          <button
            className={`fft-dash-main-view-tab ${dashboardMainViewMode === 'participants' ? 'active' : ''}`}
            onClick={() => this.setState({ dashboardMainViewMode: 'participants' })}
          >
            <i className="fas fa-users"></i> Participants
          </button>
        </div>

        <div className="fft-dash-sections-wrapper">
          {dashboardMainViewMode === 'participations' && (
            <div className="fft-dash-left-section fft-dash-full-width">
              <h3 className="fft-dash-section-header">Participations</h3>
              <div className="fft-dash-participations-row">
                <div className="fft-dash-kpi-row-col">
                  <div className="fft-dash-kpi-card">
                    <div className="fft-dash-kpi-label"><strong>Total</strong></div>
                    <div className="fft-dash-kpi-value">{totalParticipations}</div>
                  </div>
                  <div className="fft-dash-kpi-card fft-dash-kpi-female">
                    <div className="fft-dash-kpi-label">Female</div>
                    <div className="fft-dash-kpi-value">
                      {femaleParticipations}
                      <span className="fft-dash-kpi-percent">
                        ({totalParticipations > 0 ? ((femaleParticipations / totalParticipations) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="fft-dash-kpi-card fft-dash-kpi-male">
                    <div className="fft-dash-kpi-label">Male</div>
                    <div className="fft-dash-kpi-value">
                      {maleParticipations}
                      <span className="fft-dash-kpi-percent">
                        ({totalParticipations > 0 ? ((maleParticipations / totalParticipations) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="fft-dash-participations-section-col">
                  <div className="fft-dash-section-title-and-tabs">
                    <h4 className="fft-dash-middle-section-title">Participations per Year</h4>
                    <div className="fft-dash-view-tabs">
                      <button
                        className={`fft-dash-tab-btn ${this.state.participationsViewMode === 'cards' ? 'active' : ''}`}
                        onClick={() => this.setState({ participationsViewMode: 'cards' })}
                      >
                        <i className="fas fa-th-large"></i> Cards
                      </button>
                      {!this.isSingleYearView() && (
                        <button
                          className={`fft-dash-tab-btn ${this.state.participationsViewMode === 'chart' ? 'active' : ''}`}
                          onClick={() => this.setState({ participationsViewMode: 'chart' })}
                        >
                          <i className="fas fa-chart-line"></i> Chart
                        </button>
                      )}
                    </div>
                  </div>
                  {this.state.participationsViewMode === 'cards' && (
                    <div className="fft-dash-year-totals">
                      {years.map((year, yearIdx) => {
                        const yearData = yearlyParticipants[year] || {};
                        const yearTotal = yearData.total || 0;
                        return (
                          <div key={yearIdx} className="fft-dash-year-total-item">
                            <span className="fft-dash-year-total-label">{year}</span>
                            <span className="fft-dash-year-total-value">{yearTotal}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!this.isSingleYearView() && this.state.participationsViewMode === 'chart' && (
                    <div className="fft-dash-line-chart">
                      {(() => {
                        const participations = years.map(year => ({
                          year,
                          value: (yearlyParticipants[year] || {}).total || 0
                        }));
                        if (participations.length === 0) {
                          return <div className="fft-dash-chart-empty">No data available</div>;
                        }
                        return (
                          <div>
                            <canvas
                              ref={(canvas) => {
                                this.participationsChartCanvas = canvas;
                                if (canvas) {
                                  setTimeout(() => this.drawChart(participations, 'participationsChartCanvas', 'Participations'), 0);
                                }
                              }}
                              width={900}
                              height={400}
                              className="fft-dash-chart-canvas"
                              style={{border: '1px solid #e2e8f0', borderRadius: '4px'}}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {dashboardMainViewMode === 'participants' && (
            <div className="fft-dash-left-section fft-dash-full-width">
              <h3 className="fft-dash-section-header">Participants</h3>
              <div className="fft-dash-participations-row">
                <div className="fft-dash-kpi-row-col">
                  <div className="fft-dash-kpi-card">
                    <div className="fft-dash-kpi-label"><strong>Total</strong></div>
                    <div className="fft-dash-kpi-value">{totalParticipants}</div>
                  </div>
                  <div className="fft-dash-kpi-card fft-dash-kpi-female">
                    <div className="fft-dash-kpi-label">Female</div>
                    <div className="fft-dash-kpi-value">
                      {femaleCount}
                      <span className="fft-dash-kpi-percent">
                        ({totalParticipants > 0 ? ((femaleCount / totalParticipants) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="fft-dash-kpi-card fft-dash-kpi-male">
                    <div className="fft-dash-kpi-label">Male</div>
                    <div className="fft-dash-kpi-value">
                      {maleCount}
                      <span className="fft-dash-kpi-percent">
                        ({totalParticipants > 0 ? ((maleCount / totalParticipants) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="fft-dash-participants-section-col">
                  <div className="fft-dash-section-title-and-tabs">
                    <h4 className="fft-dash-middle-section-title">Participants per Year</h4>
                    <div className="fft-dash-view-tabs">
                      <button
                        className={`fft-dash-tab-btn ${this.state.participantsViewMode === 'cards' ? 'active' : ''}`}
                        onClick={() => this.setState({ participantsViewMode: 'cards' })}
                      >
                        <i className="fas fa-th-large"></i> Cards
                      </button>
                      {!this.isSingleYearView() && (
                        <button
                          className={`fft-dash-tab-btn ${this.state.participantsViewMode === 'chart' ? 'active' : ''}`}
                          onClick={() => this.setState({ participantsViewMode: 'chart' })}
                        >
                          <i className="fas fa-chart-line"></i> Chart
                        </button>
                      )}
                    </div>
                  </div>
                  {this.state.participantsViewMode === 'cards' && (
                    <div className="fft-dash-year-totals">
                      {years.map((year, yearIdx) => {
                        const yearData = yearlyParticipants[year] || {};
                        const newUniqueCount = yearData.newUnique || 0;
                        return (
                          <div key={yearIdx} className="fft-dash-year-total-item">
                            <span className="fft-dash-year-total-label">{year}</span>
                            <span className="fft-dash-year-total-value">{newUniqueCount}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!this.isSingleYearView() && this.state.participantsViewMode === 'chart' && (
                    <div className="fft-dash-line-chart">
                      {(() => {
                        const participants = years.map(year => ({
                          year,
                          value: (yearlyParticipants[year] || {}).newUnique || 0
                        }));
                        if (participants.length === 0) {
                          return <div className="fft-dash-chart-empty">No data available</div>;
                        }
                        return (
                          <div>
                            <canvas
                              ref={(canvas) => {
                                this.participantsChartCanvas = canvas;
                                if (canvas) {
                                  setTimeout(() => this.drawChart(participants, 'participantsChartCanvas', 'Participants'), 0);
                                }
                              }}
                              width={900}
                              height={400}
                              className="fft-dash-chart-canvas"
                              style={{border: '1px solid #e2e8f0', borderRadius: '4px'}}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {!isSingleYear && (
            <div className="fft-dash-left-section fft-dash-full-width">
              <h3 className="fft-dash-section-header">Gender Distribution per Year</h3>
              <div className="fft-dash-section-title-and-tabs">
                <div className="fft-dash-view-tabs">
                  <button
                    className={`fft-dash-tab-btn ${this.state.genderViewMode === 'cards' ? 'active' : ''}`}
                    onClick={() => this.setState({ genderViewMode: 'cards' })}
                  >
                    <i className="fas fa-th-large"></i> Cards
                  </button>
                  <button
                    className={`fft-dash-tab-btn ${this.state.genderViewMode === 'chart' ? 'active' : ''}`}
                    onClick={() => this.setState({ genderViewMode: 'chart' })}
                  >
                    <i className="fas fa-chart-bar"></i> Chart
                  </button>
                </div>
              </div>

              {/* Cards View */}
              {this.state.genderViewMode === 'cards' && (
                <div className="fft-dash-gender-years-grid">
                  {years.map((year, yearIdx) => {
                    const yearData = yearlyGender[year] || {};
                    const maleCount = yearData.male || 0;
                    const femaleCount = yearData.female || 0;
                    const totalInYear = maleCount + femaleCount;
                    const malePercent = totalInYear > 0 ? ((maleCount / totalInYear) * 100).toFixed(1) : 0;
                    const femalePercent = totalInYear > 0 ? ((femaleCount / totalInYear) * 100).toFixed(1) : 0;

                    return (
                      <div key={yearIdx} className="fft-dash-gender-year-block">
                        <h4 className="fft-dash-gender-year-title">{year}</h4>
                        <div className="fft-dash-gender-kpi-row">
                          <div className="fft-dash-gender-kpi-card fft-dash-kpi-female">
                            <div className="fft-dash-kpi-label">Female</div>
                            <div className="fft-dash-kpi-value">{femaleCount}</div>
                            <div className="fft-dash-kpi-percent">({femalePercent}%)</div>
                          </div>
                          <div className="fft-dash-gender-kpi-card fft-dash-kpi-male">
                            <div className="fft-dash-kpi-label">Male</div>
                            <div className="fft-dash-kpi-value">{maleCount}</div>
                            <div className="fft-dash-kpi-percent">({malePercent}%)</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chart View */}
              {this.state.genderViewMode === 'chart' && (
                <div className="fft-dash-gender-chart-container">
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
                        style={{border: '1px solid #e2e8f0', borderRadius: '4px'}}
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
}

export default FitnessDashboardSection;
