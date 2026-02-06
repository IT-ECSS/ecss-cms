import React, { Component } from "react";
import '../../../css/sub/fitnessDashboardSection.css';

class FitnessDashboardSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'overview'
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

  getParticipantName = (row) => {
    const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
    return nameKey ? row[nameKey] || 'Unknown' : 'Unknown';
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

    // Group by participant
    const participantMap = {};
    let maleCount = 0;
    let femaleCount = 0;

    filteredData.forEach(row => {
      const name = this.getParticipantName(row).toLowerCase().trim();
      const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
      const year = yearKey ? row[yearKey]?.toString() : null;
      
      if (!name || name === 'unknown' || !year) return;
      
      if (!participantMap[name]) {
        participantMap[name] = { 
          displayName: this.getParticipantName(row),
          gender: this.getParticipantGender(row),
          years: {} 
        };
        if (participantMap[name].gender === 'Male') maleCount++;
        else femaleCount++;
      }
      
      if (!participantMap[name].years[year]) {
        participantMap[name].years[year] = {};
      }
      
      this.fitnessMetrics.forEach(metric => {
        const metricKey = this.findMetricKey(row, metric.key);
        const val = metricKey ? row[metricKey] : null;
        if (val !== null && val !== undefined && val !== '') {
          participantMap[name].years[year][metric.key] = parseFloat(val);
        }
      });
    });

    const totalParticipants = Object.keys(participantMap).length;

    // Calculate participants per year (unique and total entries)
    const yearlyParticipants = {};
    const yearlyGender = {};
    years.forEach(year => {
      const uniqueNames = new Set();
      let totalEntries = 0;
      let maleInYear = 0;
      let femaleInYear = 0;
      const countedNames = new Set();
      
      filteredData.forEach(row => {
        const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
        if ((yearKey ? row[yearKey]?.toString() : null) !== year) return;
        const name = this.getParticipantName(row).toLowerCase().trim();
        if (name && name !== 'unknown') {
          uniqueNames.add(name);
          totalEntries++;
          
          // Count gender only once per unique participant per year
          if (!countedNames.has(name)) {
            countedNames.add(name);
            const gender = this.getParticipantGender(row);
            if (gender === 'Male') maleInYear++;
            else femaleInYear++;
          }
        }
      });
      yearlyParticipants[year] = { unique: uniqueNames.size, total: totalEntries };
      yearlyGender[year] = { male: maleInYear, female: femaleInYear };
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

    return { years, totalParticipants, maleCount, femaleCount, metricsData, participantMap, yearlyParticipants, yearlyGender };
  };

  render() {
    const { yearFrom, yearTo, loading = false } = this.props;
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
          <i className="fas fa-chart-bar"></i>
          <p>No data available</p>
          <span>Select Year and Centre to view dashboard</span>
        </div>
      );
    }

    const { years, totalParticipants, maleCount, femaleCount, metricsData, yearlyParticipants, yearlyGender } = data;
    const { activeTab } = this.state;

    // Calculate max for line chart scaling with fallback
    const participantValues = Object.values(yearlyParticipants || {});
    const genderValues = Object.values(yearlyGender || {});
    const maxParticipants = participantValues.length > 0 
      ? Math.max(10, ...participantValues.map(y => Math.max(y.unique || 0, y.total || 0))) 
      : 10;
    const maxGender = genderValues.length > 0 
      ? Math.max(10, ...genderValues.map(y => Math.max(y.male || 0, y.female || 0))) 
      : 10;

    return (
      <div className="fft-dash-container">
        {/* Tab Navigation */}
        <div className="fft-dash-tabs">
          <button 
            className={`fft-dash-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => this.setState({ activeTab: 'overview' })}
          >
            <i className="fas fa-chart-pie"></i>
            Overview
          </button>
          {/* Only show Year-on-Year tab if multiple years */}
          {!isSingleYear && years.length >= 2 && (
            <button 
              className={`fft-dash-tab ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => this.setState({ activeTab: 'metrics' })}
            >
              <i className="fas fa-dumbbell"></i>
              Year-on-Year Performance
            </button>
          )}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Header Stats */}
            <div className="fft-dash-header">
              <div className="fft-dash-header-card fft-dash-header-total">
                <div className="fft-dash-header-icon"><i className="fas fa-users"></i></div>
                <div className="fft-dash-header-info">
                  <span className="fft-dash-header-value">{totalParticipants}</span>
                  <span className="fft-dash-header-label">Total Participants</span>
                </div>
              </div>
              <div className="fft-dash-header-card fft-dash-header-male">
                <div className="fft-dash-header-icon"><i className="fas fa-mars"></i></div>
                <div className="fft-dash-header-info">
                  <span className="fft-dash-header-value">{maleCount}</span>
                  <span className="fft-dash-header-label">Male</span>
                </div>
              </div>
              <div className="fft-dash-header-card fft-dash-header-female">
                <div className="fft-dash-header-icon"><i className="fas fa-venus"></i></div>
                <div className="fft-dash-header-info">
                  <span className="fft-dash-header-value">{femaleCount}</span>
                  <span className="fft-dash-header-label">Female</span>
                </div>
              </div>
            </div>

            {/* Participants Line Chart - only show if multiple years */}
            {years.length >= 2 && (
              <div className="fft-dash-chart-section">
                <h3 className="fft-dash-section-title">
                  <i className="fas fa-chart-line"></i>
                  Participants by Year
                </h3>
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '14px', 
                  padding: '28px',
                  marginBottom: '20px'
                }}>
                  {(() => {
                    // Prepare data for total participants only
                    const totalValues = years.map(year => ({
                      year,
                      value: (yearlyParticipants[year] || {}).total || 0
                    }));
                    
                    const allValues = totalValues.map(v => v.value);
                    const dataMax = Math.max(...allValues, 10);
                    const yMax = Math.ceil(dataMax * 1.1);
                    const yMin = 0;
                    const range = yMax - yMin || 1;
                    
                    const chartAreaHeight = 180;
                    const topMargin = 40;
                    const bottomMargin = 55;
                    const totalHeight = chartAreaHeight + topMargin + bottomMargin;
                    
                    // Y-axis tick values
                    const tickCount = 5;
                    const yAxisValues = [];
                    for (let i = 0; i < tickCount; i++) {
                      yAxisValues.push(Math.round(yMax - (i / (tickCount - 1)) * yMax));
                    }
                    
                    // Calculate points for the line
                    const calcPoints = (values) => values.map((v, i) => {
                      const xPercent = values.length === 1 ? 50 : 10 + (i / (values.length - 1)) * 80;
                      const yPos = topMargin + ((yMax - v.value) / range) * chartAreaHeight;
                      return { x: xPercent, y: yPos, value: v.value, year: v.year };
                    });
                    
                    const totalPoints = calcPoints(totalValues);
                    
                    return (
                      <div style={{ position: 'relative', height: `${totalHeight}px`, marginLeft: '55px', marginRight: '20px' }}>
                        {/* Y-Axis labels */}
                        <div style={{ 
                          position: 'absolute', 
                          left: '-55px', 
                          top: topMargin, 
                          height: `${chartAreaHeight}px`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          paddingRight: '10px'
                        }}>
                          {yAxisValues.map((val, i) => (
                            <div key={i} style={{ fontSize: '19px', color: '#555', fontWeight: '600' }}>{val}</div>
                          ))}
                        </div>
                        
                        {/* Y-Axis line */}
                        <div style={{
                          position: 'absolute', left: '0', top: `${topMargin}px`,
                          height: `${chartAreaHeight + 1}px`, width: '1px', backgroundColor: '#bbb'
                        }}></div>
                        
                        {/* X-Axis line */}
                        <div style={{
                          position: 'absolute', left: '0', right: '0', top: `${topMargin + chartAreaHeight}px`,
                          height: '1px', backgroundColor: '#bbb'
                        }}></div>
                        
                        {/* Canvas for drawing lines */}
                        <canvas 
                          style={{ 
                            position: 'absolute', top: 0, left: 0, 
                            width: '100%', height: `${topMargin + chartAreaHeight}px`,
                            pointerEvents: 'none'
                          }}
                          ref={(canvas) => {
                            if (canvas && years.length > 0) {
                              const ctx = canvas.getContext('2d');
                              const rect = canvas.getBoundingClientRect();
                              canvas.width = rect.width;
                              canvas.height = topMargin + chartAreaHeight;
                              ctx.clearRect(0, 0, canvas.width, canvas.height);
                              
                              // Draw total line (green)
                              if (totalPoints.length > 1) {
                                ctx.strokeStyle = '#10b981';
                                ctx.lineWidth = 3;
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                ctx.beginPath();
                                totalPoints.forEach((point, i) => {
                                  const px = (point.x / 100) * canvas.width;
                                  if (i === 0) ctx.moveTo(px, point.y);
                                  else ctx.lineTo(px, point.y);
                                });
                                ctx.stroke();
                              }
                            }
                          }}
                        />
                        
                        {/* Data points for Total */}
                        {totalPoints.map((point, i) => (
                          <React.Fragment key={`total-${i}`}>
                            <div style={{
                              position: 'absolute', left: `${point.x}%`, top: `${point.y - 28}px`,
                              transform: 'translateX(-50%)', fontSize: '20px', fontWeight: '700',
                              color: '#10b981', zIndex: 3, whiteSpace: 'nowrap'
                            }}>{point.value}</div>
                            <div style={{
                              position: 'absolute', left: `${point.x}%`, top: `${point.y}px`,
                              transform: 'translate(-50%, -50%)', width: '16px', height: '16px',
                              borderRadius: '50%', backgroundColor: '#fff', border: '4px solid #10b981',
                              boxShadow: '0 3px 8px rgba(0,0,0,0.25)', zIndex: 2
                            }}></div>
                          </React.Fragment>
                        ))}
                        
                        {/* Year labels (X-axis) */}
                        {years.map((year, i) => {
                          const xPercent = years.length === 1 ? 50 : 10 + (i / (years.length - 1)) * 80;
                          return (
                            <div key={year} style={{
                              position: 'absolute', left: `${xPercent}%`, top: `${topMargin + chartAreaHeight + 15}px`,
                              transform: 'translateX(-50%)', fontSize: '20px', color: '#444', fontWeight: '700'
                            }}>{year}</div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Gender Distribution - Pie Chart for single year, Line Chart for multiple years */}
            {years.length >= 1 && (
              <div className="fft-dash-chart-section">
                <h3 className="fft-dash-section-title">
                  <i className="fas fa-venus-mars"></i>
                  Gender Distribution{years.length >= 2 ? ' by Year' : ''}
                </h3>
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '14px', 
                  padding: '28px',
                  marginBottom: '20px'
                }}>
                  {years.length === 1 ? (
                    // PIE CHART for single year
                    (() => {
                      const total = maleCount + femaleCount;
                      const malePercent = total > 0 ? (maleCount / total) * 100 : 50;
                      const femalePercent = total > 0 ? (femaleCount / total) * 100 : 50;
                      
                      // Calculate pie chart arc
                      const maleAngle = (malePercent / 100) * 360;
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '60px' }}>
                          {/* Pie Chart using conic-gradient */}
                          <div style={{ position: 'relative' }}>
                            <div style={{
                              width: '200px',
                              height: '200px',
                              borderRadius: '50%',
                              background: `conic-gradient(#3b82f6 0deg ${maleAngle}deg, #ec4899 ${maleAngle}deg 360deg)`,
                              boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                            }}></div>
                          </div>
                          
                          {/* Legend with counts */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#3b82f6' }}></div>
                              <div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Male</div>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{maleCount} <span style={{ fontSize: '20px', color: '#64748b' }}>({malePercent.toFixed(1)}%)</span></div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#ec4899' }}></div>
                              <div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Female</div>
                                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ec4899' }}>{femaleCount} <span style={{ fontSize: '20px', color: '#64748b' }}>({femalePercent.toFixed(1)}%)</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // LINE CHART for multiple years
                    (() => {
                    // Prepare data for two lines: male and female
                    const maleValues = years.map(year => ({
                      year,
                      value: (yearlyGender[year] || {}).male || 0
                    }));
                    const femaleValues = years.map(year => ({
                      year,
                      value: (yearlyGender[year] || {}).female || 0
                    }));
                    
                    const allValues = [...maleValues.map(v => v.value), ...femaleValues.map(v => v.value)];
                    const dataMax = Math.max(...allValues, 10);
                    const yMax = Math.ceil(dataMax * 1.1);
                    const yMin = 0;
                    const range = yMax - yMin || 1;
                    
                    const chartAreaHeight = 180;
                    const topMargin = 40;
                    const bottomMargin = 55;
                    const totalHeight = chartAreaHeight + topMargin + bottomMargin;
                    
                    // Y-axis tick values
                    const tickCount = 5;
                    const yAxisValues = [];
                    for (let i = 0; i < tickCount; i++) {
                      yAxisValues.push(Math.round(yMax - (i / (tickCount - 1)) * yMax));
                    }
                    
                    // Calculate points for each line
                    const calcPoints = (values) => values.map((v, i) => {
                      const xPercent = values.length === 1 ? 50 : 10 + (i / (values.length - 1)) * 80;
                      const yPos = topMargin + ((yMax - v.value) / range) * chartAreaHeight;
                      return { x: xPercent, y: yPos, value: v.value, year: v.year };
                    });
                    
                    const malePoints = calcPoints(maleValues);
                    const femalePoints = calcPoints(femaleValues);
                    
                    return (
                      <div style={{ position: 'relative', height: `${totalHeight}px`, marginLeft: '55px', marginRight: '20px' }}>
                        {/* Y-Axis labels */}
                        <div style={{ 
                          position: 'absolute', 
                          left: '-55px', 
                          top: topMargin, 
                          height: `${chartAreaHeight}px`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          paddingRight: '10px'
                        }}>
                          {yAxisValues.map((val, i) => (
                            <div key={i} style={{ fontSize: '19px', color: '#555', fontWeight: '600' }}>{val}</div>
                          ))}
                        </div>
                        
                        {/* Y-Axis line */}
                        <div style={{
                          position: 'absolute', left: '0', top: `${topMargin}px`,
                          height: `${chartAreaHeight + 1}px`, width: '1px', backgroundColor: '#bbb'
                        }}></div>
                        
                        {/* X-Axis line */}
                        <div style={{
                          position: 'absolute', left: '0', right: '0', top: `${topMargin + chartAreaHeight}px`,
                          height: '1px', backgroundColor: '#bbb'
                        }}></div>
                        
                        {/* Canvas for drawing lines */}
                        <canvas 
                          style={{ 
                            position: 'absolute', top: 0, left: 0, 
                            width: '100%', height: `${topMargin + chartAreaHeight}px`,
                            pointerEvents: 'none'
                          }}
                          ref={(canvas) => {
                            if (canvas && years.length > 0) {
                              const ctx = canvas.getContext('2d');
                              const rect = canvas.getBoundingClientRect();
                              canvas.width = rect.width;
                              canvas.height = topMargin + chartAreaHeight;
                              ctx.clearRect(0, 0, canvas.width, canvas.height);
                              
                              // Draw male line (blue)
                              if (malePoints.length > 1) {
                                ctx.strokeStyle = '#3b82f6';
                                ctx.lineWidth = 3;
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                ctx.beginPath();
                                malePoints.forEach((point, i) => {
                                  const px = (point.x / 100) * canvas.width;
                                  if (i === 0) ctx.moveTo(px, point.y);
                                  else ctx.lineTo(px, point.y);
                                });
                                ctx.stroke();
                              }
                              
                              // Draw female line (pink)
                              if (femalePoints.length > 1) {
                                ctx.strokeStyle = '#ec4899';
                                ctx.lineWidth = 3;
                                ctx.beginPath();
                                femalePoints.forEach((point, i) => {
                                  const px = (point.x / 100) * canvas.width;
                                  if (i === 0) ctx.moveTo(px, point.y);
                                  else ctx.lineTo(px, point.y);
                                });
                                ctx.stroke();
                              }
                            }
                          }}
                        />
                        
                        {/* Data points for Male */}
                        {malePoints.map((point, i) => (
                          <React.Fragment key={`male-${i}`}>
                            <div style={{
                              position: 'absolute', left: `${point.x}%`, top: `${point.y - 28}px`,
                              transform: 'translateX(-50%)', fontSize: '20px', fontWeight: '700',
                              color: '#3b82f6', zIndex: 3, whiteSpace: 'nowrap'
                            }}>{point.value}</div>
                            <div style={{
                              position: 'absolute', left: `${point.x}%`, top: `${point.y}px`,
                              transform: 'translate(-50%, -50%)', width: '16px', height: '16px',
                              borderRadius: '50%', backgroundColor: '#fff', border: '4px solid #3b82f6',
                              boxShadow: '0 3px 8px rgba(0,0,0,0.25)', zIndex: 2
                            }}></div>
                          </React.Fragment>
                        ))}
                        
                        {/* Data points for Female */}
                        {femalePoints.map((point, i) => (
                          <React.Fragment key={`female-${i}`}>
                            <div style={{
                              position: 'absolute', left: `${point.x}%`, top: `${point.y - 28}px`,
                              transform: 'translateX(-50%)', fontSize: '20px', fontWeight: '700',
                              color: '#ec4899', zIndex: 3, whiteSpace: 'nowrap'
                            }}>{point.value}</div>
                            <div style={{
                              position: 'absolute', left: `${point.x}%`, top: `${point.y}px`,
                              transform: 'translate(-50%, -50%)', width: '16px', height: '16px',
                              borderRadius: '50%', backgroundColor: '#fff', border: '4px solid #ec4899',
                              boxShadow: '0 3px 8px rgba(0,0,0,0.25)', zIndex: 2
                            }}></div>
                          </React.Fragment>
                        ))}
                        
                        {/* Year labels (X-axis) */}
                        {years.map((year, i) => {
                          const xPercent = years.length === 1 ? 50 : 10 + (i / (years.length - 1)) * 80;
                          return (
                            <div key={year} style={{
                              position: 'absolute', left: `${xPercent}%`, top: `${topMargin + chartAreaHeight + 15}px`,
                              transform: 'translateX(-50%)', fontSize: '20px', color: '#444', fontWeight: '700'
                            }}>{year}</div>
                          );
                        })}
                      </div>
                    );
                  })()
                  )}
                  
                  {/* Legend - only for line chart */}
                  {years.length >= 2 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', color: '#475569' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }}></span> Male
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', color: '#475569' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ec4899' }}></span> Female
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
        <div className="fft-dash-metrics-section">
          <div className="fft-dash-metrics-grid">
            {this.fitnessMetrics.map((metric, idx) => {
              const md = metricsData[metric.key];
              if (!md) return null;
              
              const yearEntries = Object.entries(md.yearlyData).sort((a, b) => a[0].localeCompare(b[0]));
              const hasMultiYear = yearEntries.length >= 2 && !isSingleYear;
              const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];
              const color = colors[idx % colors.length];

              // For single year, get the stats
              const singleYearData = yearEntries.length === 1 ? yearEntries[0][1] : null;

              return (
                <div key={metric.key} className="fft-dash-metric-card">
                  <div className="fft-dash-metric-header" style={{ backgroundColor: color, fontWeight: 'bold' }}>
                    <span className="fft-dash-metric-name">{metric.label}</span>
                  </div>
                  
                  <div className="fft-dash-metric-body">
                    {/* Single Year View - Show progress bar only */}
                    {!hasMultiYear && singleYearData && (
                      <div className="fft-dash-metric-progress">
                        <div className="fft-dash-year-pair">
                          <div className="fft-dash-stacked-bar" style={{ height: '24px', borderRadius: '12px', background: color, opacity: 0.85 }}>
                          </div>
                          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '16px', fontWeight: '600', color: '#475569' }}>
                            Average: <span style={{ color: color, fontWeight: '700' }}>{singleYearData.avg.toFixed(1)}</span> &nbsp;|&nbsp; Participants: <strong>{singleYearData.count}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Multi Year View - Progress Comparison for Each Year Pair */}
                    {hasMultiYear && md.yearPairProgress && (
                      <div className="fft-dash-metric-progress">
                        {Object.entries(md.yearPairProgress).map(([pairKey, pairData]) => {
                          if (pairData.total === 0) return null;
                          return (
                            <div key={pairKey} className="fft-dash-year-pair">
                              <div className="fft-dash-year-pair-label">{pairKey}</div>
                              <div className="fft-dash-stacked-bar">
                                <div 
                                  className="fft-dash-stacked-segment fft-dash-bar-improved"
                                  style={{ width: `${(pairData.improved / pairData.total) * 100}%` }}
                                  title={`Improved: ${pairData.improved}`}
                                ></div>
                                <div 
                                  className="fft-dash-stacked-segment fft-dash-bar-nochange"
                                  style={{ width: `${(pairData.noChange / pairData.total) * 100}%` }}
                                  title={`No Change: ${pairData.noChange}`}
                                ></div>
                                <div 
                                  className="fft-dash-stacked-segment fft-dash-bar-declined"
                                  style={{ width: `${(pairData.declined / pairData.total) * 100}%` }}
                                  title={`Declined: ${pairData.declined}`}
                                ></div>
                              </div>
                              <div className="fft-dash-stacked-legend">
                                <span className="fft-dash-improved"><i className="fas fa-arrow-up"></i> <strong>{pairData.improved}</strong> Improved</span>
                                <span className="fft-dash-nochange"><i className="fas fa-minus"></i> <strong>{pairData.noChange}</strong> No Change</span>
                                <span className="fft-dash-declined"><i className="fas fa-arrow-down"></i> <strong>{pairData.declined}</strong> Declined</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}


      </div>
    );
  }
}

export default FitnessDashboardSection;
