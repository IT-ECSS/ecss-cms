import React, { Component } from 'react';

/**
 * Data Visualization Component - search for individual participant results with charts (Class Component)
 */
class DataVisualization extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedParticipant: null
    };
    
    // Specific fitness metrics to display
    // key matches the exact column name in spreadsheet
    this.fitnessMetrics = [
      { key: '30 secs Sit & Stand',          label: '30 Secs Sit & Stand',          unit: 'squats', higherIsBetter: true },
      { key: '30 secs Dumbbell Curl',           label: '30 Secs Dumbbell Curl',       unit: 'dumbbell curls', higherIsBetter: true },
      { key: '2 min On-the-spot Marching',    label: '2 Min On-the-spot Marching',   unit: 'Sets of steps', higherIsBetter: true },
      { key: 'Sit & Reach',                   label: 'Sit & Reach',                  unit: 'cm',   higherIsBetter: true },
      { key: 'Back Stretching',               label: 'Back Stretching',              unit: 'cm',   higherIsBetter: true },
      { key: '2.44m Speed Walk',              label: '2.44m Speed Walk',             unit: 'sec',  higherIsBetter: false },
      { key: 'Grip test',                     label: 'Grip Test',                    unit: 'kg',   higherIsBetter: true }
    ];
  }

  componentDidMount() {
    this.handleInitialParticipant();
  }

  componentDidUpdate(prevProps) {
    // Check if initialParticipant changed
    if (this.props.initialParticipant && this.props.initialParticipant !== prevProps.initialParticipant) {
      this.handleInitialParticipant();
    }
  }

  handleInitialParticipant = () => {
    const { initialParticipant, onInitialParticipantUsed, data, allLocationData } = this.props;
    if (!initialParticipant) return;

    // Normalise: lowercase + trim so casing differences don't break the match
    const participantName = (initialParticipant.Name || initialParticipant.name || '').toLowerCase().trim();
    // Use allLocationData so we can find the participant even when not in the filtered set
    const dataSource = allLocationData || data || [];

    const matchingRow = dataSource.find(row => {
      const rowName = this.getParticipantName(row).toLowerCase().trim();
      return rowName === participantName;
    });

    // Use the found flat row; fall back to the pivoted row itself so charts still render
    this.setState({ selectedParticipant: matchingRow || initialParticipant });

    if (onInitialParticipantUsed) {
      onInitialParticipantUsed();
    }
  }

  // Helper to find column key (case-insensitive matching)
  findMetricKey = (row, metricKey) => {
    // Direct case-insensitive match
    const exactMatch = Object.keys(row).find(k => k.toLowerCase() === metricKey.toLowerCase());
    return exactMatch || null;
  };

  // Get all unique participants for default display
  getDefaultParticipants = () => {
    const { data } = this.props;
    const dataSource = data || [];
    const seenNames = new Set();
    const results = [];

    dataSource.forEach(row => {
      const name = this.getParticipantName(row).toLowerCase();
      if (!seenNames.has(name)) {
        seenNames.add(name);
        results.push(row);
      }
    });

    return results;
  };

  getParticipantName = (row) => {
    const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
    return nameKey ? row[nameKey] || 'Unknown' : 'Unknown';
  };

  getChineseName = (row) => {
    const chineseKey = Object.keys(row).find(k => k.toLowerCase() === 'chinese name');
    return chineseKey ? row[chineseKey] || '' : '';
  };

  getParticipantGender = (row) => {
    const genderKey = Object.keys(row).find(k =>
      k.toLowerCase() === 'gender' || k.toLowerCase() === 'sex'
    );
    const value = genderKey ? String(row[genderKey] || '').toLowerCase() : '';
    return value === 'm' || value === 'male' ? 'Male' : 'Female';
  };

  getParticipantAge = (row) => {
    const ageKey = Object.keys(row).find(k => k.toLowerCase() === 'age');
    return ageKey ? row[ageKey] : null;
  };

  // Get the year range for a participant
  getParticipantYearRange = (participant) => {
    const { data } = this.props;
    const name = this.getParticipantName(participant).toLowerCase();
    const chineseName = this.getChineseName(participant);
    const dataSource = data || [];

    const years = dataSource
      .filter(row => {
        const rowName = this.getParticipantName(row).toLowerCase();
        const rowChineseName = this.getChineseName(row);
        return rowName === name || 
          (chineseName && rowChineseName && rowChineseName.toLowerCase() === chineseName.toLowerCase());
      })
      .map(row => row.year)
      .filter(Boolean)
      .sort();

    const uniqueYears = [...new Set(years)];
    
    if (uniqueYears.length === 0) return null;
    if (uniqueYears.length === 1) return uniqueYears[0];
    return `${uniqueYears[0]} - ${uniqueYears[uniqueYears.length - 1]}`;
  };

  nameMatchesSearch = (name, searchTerm) => {
    if (!name || !searchTerm) return false;
    const nameLower = name.toLowerCase();
    const nameWords = nameLower.split(/\s+/).filter(Boolean);
    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    return searchWords.every(searchWord =>
      nameWords.some(nameWord => nameWord.includes(searchWord)) ||
      nameLower.includes(searchWord)
    );
  };

  getParticipantYearlyData = (participant) => {
    const { data, allLocationData } = this.props;
    const name = this.getParticipantName(participant);
    const chineseName = this.getChineseName(participant);

    // Use allLocationData to get records from all years, not just filtered data
    const dataSource = allLocationData || data || [];

    const allRecords = dataSource.filter(row => {
      const rowName = this.getParticipantName(row);
      const rowChineseName = this.getChineseName(row);
      return rowName.toLowerCase().trim() === name.toLowerCase().trim() ||
        (chineseName && rowChineseName && rowChineseName.toLowerCase().trim() === chineseName.toLowerCase().trim());
    });

    return allRecords.sort((a, b) => (a.year || '').localeCompare(b.year || ''));
  };

  buildChartData = (yearlyRecords) => {
    return yearlyRecords.map(record => {
      const chartPoint = { year: record.year || 'Unknown' };

      this.fitnessMetrics.forEach(metric => {
        const foundKey = this.findMetricKey(record, metric.key);
        const value = foundKey ? parseFloat(record[foundKey]) : null;
        chartPoint[metric.key] = !isNaN(value) ? value : null;
      });

      return chartPoint;
    });
  };

  handleSearchChange = (e) => {
    const value = e.target.value;
    const { data } = this.props;

    this.setState({ searchTerm: value });

    const dataSource = data || [];
    const seenNames = new Set();
    const results = [];

    dataSource.forEach(row => {
      const name = this.getParticipantName(row).toLowerCase();
      const chineseName = this.getChineseName(row);

      if (!seenNames.has(name)) {
        // If there's a search term, filter by it; otherwise show all
        if (value.trim().length === 0 || this.nameMatchesSearch(this.getParticipantName(row), value) || this.nameMatchesSearch(chineseName, value)) {
          seenNames.add(name);
          results.push(row);
        }
      }
    });

    this.setState({ searchResults: results });
  };

  handleSelectParticipant = (participant) => {
    this.setState({
      selectedParticipant: participant,
      searchTerm: '',
      searchResults: []
    });
  };

  handleClearSelection = () => {
    this.setState({ selectedParticipant: null });
  };

  getMetricValue = (row, metricKey) => {
    const foundKey = this.findMetricKey(row, metricKey);
    if (foundKey) {
      const value = row[foundKey];
      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }
    return '-';
  };

  render() {
    const { yearFrom, yearTo } = this.props;
    const { selectedParticipant } = this.state;

    const yearlyRecords = selectedParticipant ? this.getParticipantYearlyData(selectedParticipant) : [];
    const chartData = yearlyRecords.length > 0 ? this.buildChartData(yearlyRecords) : [];
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#F44336'];

    return (
      <div className="fft-viz-wrapper">
        {selectedParticipant ? (
          <div className="fft-viz-section fft-viz-results-section">
            <div className={`fft-viz-participant-card ${this.getParticipantGender(selectedParticipant) === 'Male' ? 'fft-viz-card-male-bg' : 'fft-viz-card-female-bg'}`}>
              <div className="fft-viz-participant-avatar">
                <i className={`fas ${this.getParticipantGender(selectedParticipant) === 'Male' ? 'fa-male' : 'fa-female'}`}></i>
              </div>
              <div className="fft-viz-participant-info">
                <h4 className="fft-viz-participant-name">
                  {this.getParticipantName(selectedParticipant)}
                  {this.getChineseName(selectedParticipant) && (
                    <span className="fft-viz-participant-chinese">({this.getChineseName(selectedParticipant)})</span>
                  )}
                </h4>
                <div className="fft-viz-participant-meta">
                  <span className={`fft-viz-meta-badge ${this.getParticipantGender(selectedParticipant) === 'Male' ? 'fft-viz-badge-male' : 'fft-viz-badge-female'}`}>
                    {this.getParticipantGender(selectedParticipant)}
                  </span>
                  {this.getParticipantAge(selectedParticipant) && (
                    <span className="fft-viz-meta-badge fft-viz-badge-age">
                      Age: {this.getParticipantAge(selectedParticipant)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {yearlyRecords.length > 0 && (
              <div className="fft-fitness-progress-chart-outer">
                {/* Metric Cards Grid - Max 2 per row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                  {this.fitnessMetrics.map((metric, index) => {
                    const values = chartData.map(point => ({
                      year: point.year,
                      value: point[metric.key]
                    })).filter(v => v.value !== null);
                    
                    const latestValue = values.length > 0 ? values[values.length - 1].value : null;
                    const firstValue = values.length > 1 ? values[0].value : null;
                    const change = firstValue !== null && latestValue !== null ? latestValue - firstValue : null;
                    const isImproved = metric.higherIsBetter ? change > 0 : change < 0;
                    
                    return (
                      <div 
                        key={index} 
                        style={{
                          backgroundColor: '#fff',
                          borderRadius: '20px',
                          padding: '32px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          minHeight: '520px'
                        }}
                      >
                        {/* Card Header */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ 
                              width: '60px', 
                              height: '60px', 
                              borderRadius: '14px', 
                              backgroundColor: colors[index],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <i className="fas fa-dumbbell" style={{ color: '#fff', fontSize: '28px' }}></i>
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '26px', color: '#333' }}>{metric.label}</div>
                          </div>
                        </div>
                        
                        {/* Line Chart for Progress - Using Canvas with Axes */}
                        {values.length > 0 && (
                          <div 
                            style={{ 
                              backgroundColor: '#f8f9fa', 
                              borderRadius: '14px', 
                              padding: '28px',
                              marginBottom: '28px'
                            }}
                          >
                            {(() => {
                              const dataMin = Math.min(...values.map(v => v.value));
                              const dataMax = Math.max(...values.map(v => v.value));
                              
                              // Y-axis: handle both positive and negative values
                              // If all positive, start from 0. If has negative, extend below 0.
                              const yMin = dataMin < 0 ? Math.floor(dataMin * 1.1) : 0;
                              const yMax = Math.ceil(dataMax * 1.1); // Add 10% padding at top
                              const range = yMax - yMin || 1;
                              
                              const chartAreaHeight = 180; // The actual drawing area height
                              const topMargin = 40; // Space for value labels above points
                              const bottomMargin = 55; // Space for x-axis labels
                              const totalHeight = chartAreaHeight + topMargin + bottomMargin;
                              
                              // Calculate Y-axis values (5 tick marks for better granularity)
                              const tickCount = 5;
                              const yAxisValues = [];
                              for (let i = 0; i < tickCount; i++) {
                                const val = yMax - (i / (tickCount - 1)) * (yMax - yMin);
                                yAxisValues.push(val);
                              }
                              
                              // Calculate positions for each point
                              // X is calculated as percentage (10% to 90%), Y is in pixels within chart area
                              const points = values.map((v, i) => {
                                const xPercent = values.length === 1 ? 50 : 10 + (i / (values.length - 1)) * 80;
                                // Y position: topMargin is the highest point (yMax), topMargin + chartAreaHeight is lowest (yMin)
                                const yPos = topMargin + ((yMax - v.value) / range) * chartAreaHeight;
                                return {
                                  x: xPercent,
                                  y: yPos,
                                  value: v.value,
                                  year: v.year
                                };
                              });
                              
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
                                      <div key={i} style={{ fontSize: '15px', color: '#555', fontWeight: '600' }}>
                                        {val.toFixed(metric.key === '2.44m speed walk' ? 2 : 0)}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Y-Axis line - thin grey, from top to bottom of chart area */}
                                  <div style={{
                                    position: 'absolute',
                                    left: '0',
                                    top: `${topMargin}px`,
                                    height: `${chartAreaHeight + 1}px`,
                                    width: '1px',
                                    backgroundColor: '#bbb'
                                  }}></div>
                                  
                                  {/* X-Axis line - thin grey, from left edge to right edge */}
                                  <div style={{
                                    position: 'absolute',
                                    left: '0',
                                    right: '0',
                                    top: `${topMargin + chartAreaHeight}px`,
                                    height: '1px',
                                    backgroundColor: '#bbb'
                                  }}></div>
                                  
                                  {/* Canvas for drawing lines */}
                                  <canvas 
                                    style={{ 
                                      position: 'absolute', 
                                      top: 0, 
                                      left: 0, 
                                      width: '100%', 
                                      height: `${topMargin + chartAreaHeight}px`,
                                      pointerEvents: 'none'
                                    }}
                                    ref={(canvas) => {
                                      if (canvas && points.length > 1) {
                                        const ctx = canvas.getContext('2d');
                                        const rect = canvas.getBoundingClientRect();
                                        canvas.width = rect.width;
                                        canvas.height = topMargin + chartAreaHeight;
                                        
                                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                                        ctx.strokeStyle = colors[index];
                                        ctx.lineWidth = 3;
                                        ctx.lineCap = 'round';
                                        ctx.lineJoin = 'round';
                                        
                                        ctx.beginPath();
                                        points.forEach((point, i) => {
                                          const px = (point.x / 100) * canvas.width;
                                          const py = point.y;
                                          if (i === 0) {
                                            ctx.moveTo(px, py);
                                          } else {
                                            ctx.lineTo(px, py);
                                          }
                                        });
                                        ctx.stroke();
                                      }
                                    }}
                                  />
                                  
                                  {/* Data points and labels */}
                                  {points.map((point, i) => (
                                    <React.Fragment key={i}>
                                      {/* Value label above point */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${point.x}%`,
                                          top: `${point.y - 50}px`,
                                          transform: 'translateX(-50%)',
                                          fontSize: '18px',
                                          fontWeight: '700',
                                          color: colors[index],
                                          zIndex: 3,
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {point.value}
                                      </div>
                                      {/* Data point */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${point.x}%`,
                                          top: `${point.y}px`,
                                          transform: 'translate(-50%, -50%)',
                                          width: '18px',
                                          height: '18px',
                                          borderRadius: '50%',
                                          backgroundColor: '#fff',
                                          border: `5px solid ${colors[index]}`,
                                          boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                                          zIndex: 2
                                        }}
                                      ></div>
                                      {/* Year label below (X-axis) */}
                                      <div
                                        style={{
                                          position: 'absolute',
                                          left: `${point.x}%`,
                                          top: `${topMargin + chartAreaHeight + 15}px`,
                                          transform: 'translateX(-50%)',
                                          fontSize: '16px',
                                          color: '#444',
                                          fontWeight: '700'
                                        }}
                                      >
                                        {point.year}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        {/* Year-by-Year Summary as Text */}
                        <div style={{ 
                          padding: '20px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '14px'
                        }}>
                          <div style={{ fontSize: '22px', color: '#444', marginBottom: '14px', fontWeight: '700' }}>Progress Summary</div>
                          <div style={{ fontSize: '21px', color: '#333', lineHeight: '1.9' }}>
                            {values.length === 1 ? (
                              <>Only one record available from {values[0].year} with a result of <strong>{values[0].value} {metric.unit}</strong>. More fitness tests are needed to track progress over time.</>
                            ) : values.length > 1 ? (
                              (() => {
                                // Build a text summary with meaningful descriptions
                                let summaryParts = [];
                                const pName = this.getParticipantName(selectedParticipant);
                                summaryParts.push(`In ${values[0].year}, ${pName} recorded <strong>${values[0].value} ${metric.unit}</strong> for ${metric.label}.<br/>`);
                                
                                for (let i = 1; i < values.length; i++) {
                                  const prev = values[i - 1];
                                  const curr = values[i];
                                  const diff = curr.value - prev.value;
                                  const improved = metric.higherIsBetter ? diff > 0 : diff < 0;
                                  const unchanged = diff === 0;
                                  const absDiff = Math.abs(diff);
                                  
                                  if (unchanged) {
                                    summaryParts.push(`In ${curr.year}, maintained the same performance at <strong>${curr.value} ${metric.unit}</strong>.<br/>`);
                                  } else if (improved) {
                                    if (metric.higherIsBetter) {
                                      // Higher is better (reps, steps, cm, kg)
                                      const changeDesc = absDiff >= 5 ? 'significantly improved' : absDiff >= 2 ? 'showed improvement' : 'slightly improved';
                                      summaryParts.push(`In ${curr.year}, ${changeDesc} to <strong>${curr.value} ${metric.unit}</strong> (<span style="color:#10b981; font-weight: bold">+${absDiff.toFixed(1)} ${metric.unit}</span> from ${prev.year}).<br/>`);
                                    } else {
                                      // Lower is better (seconds for speed walk)
                                      const changeDesc = absDiff >= 1 ? 'completed faster' : 'slightly faster';
                                      summaryParts.push(`In ${curr.year}, ${changeDesc} at <strong>${curr.value} ${metric.unit}</strong> (<span style="color:#10b981; font-weight: bold">${absDiff.toFixed(2)} ${metric.unit} faster</span> than ${prev.year}).<br/>`);
                                    }
                                  } else {
                                    if (metric.higherIsBetter) {
                                      // Higher is better but decreased
                                      const changeDesc = absDiff >= 5 ? 'showed a notable decline' : absDiff >= 2 ? 'decreased' : 'slightly decreased';
                                      summaryParts.push(`In ${curr.year}, ${changeDesc} to <strong>${curr.value} ${metric.unit}</strong> (<span style="color:#ef4444; font-weight: bold">-${absDiff.toFixed(1)} ${metric.unit}</span> from ${prev.year}).<br/>`);
                                    } else {
                                      // Lower is better but got slower
                                      const changeDesc = absDiff >= 1 ? 'took longer' : 'slightly slower';
                                      summaryParts.push(`In ${curr.year}, ${changeDesc} at <strong>${curr.value} ${metric.unit}</strong> (<span style="color:#ef4444; font-weight: bold">+${absDiff.toFixed(2)} ${metric.unit}</span> from ${prev.year}).<br/>`);
                                    }
                                  }
                                }
                                
                                // Add overall summary
                                const firstVal = values[0].value;
                                const lastVal = values[values.length - 1].value;
                                const overallDiff = lastVal - firstVal;
                                const overallImproved = metric.higherIsBetter ? overallDiff > 0 : overallDiff < 0;
                                
                                // Always show overall when there's a range (2+ years)
                                if (values.length >= 2) {
                                  if (overallImproved) {
                                    summaryParts.push(`<br/><strong>Overall:</strong> Showed positive progress from ${values[0].year} to ${values[values.length - 1].year}.<br/>`);
                                  } else if (overallDiff === 0) {
                                    summaryParts.push(`<br/><strong>Overall:</strong> Maintained consistent performance from ${values[0].year} to ${values[values.length - 1].year}.<br/>`);
                                  } else {
                                    summaryParts.push(`<br/><strong>Overall:</strong> Performance declined from ${values[0].year} to ${values[values.length - 1].year}. Consider additional training focus.<br/>`);
                                  }
                                }
                                
                                return <span dangerouslySetInnerHTML={{ __html: summaryParts.join(' ') }} />;
                              })()
                            ) : (
                              <>No data available for this metric.</>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="fft-viz-section fft-viz-empty-state">
            <div className="fft-viz-empty-content">
              <i className="fas fa-chart-bar fft-viz-empty-icon"></i>
              <h4>Search for a Participant</h4>
              <p>Search for a participant to view their fitness test results and year-by-year comparison.</p>
              <div className="fft-viz-empty-features">
                <div className="fft-viz-empty-feature">
                  <i className="fas fa-chart-bar"></i>
                  <span>Year-by-Year Comparison</span>
                </div>
                <div className="fft-viz-empty-feature">
                  <i className="fas fa-table"></i>
                  <span>Detailed Results Table</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

/**
 * FitnessParticipantsVisualizationTab
 * Self-contained Data Visualization section with tab button and chart content
 */
const FitnessParticipantsVisualizationTab = ({
  data = [],
  allLocationData = [],
  yearFrom,
  yearTo,
  initialParticipant,
  onInitialParticipantUsed,
  onBack
}) => {
  return (
    <div className="fft-participants-subtab-block">
      {onBack && (
        <button
          onClick={onBack}
          title="Back to Details"
          style={{ marginBottom: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#1976d2', height: '40px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', padding: 0, alignSelf: 'flex-start' }}
        >
          <i className="fas fa-arrow-left"></i><span>Back</span>
        </button>
      )}
      {/* Content */}
      <div className="fft-participants-subtab-content">
        <DataVisualization 
          data={data}
          allLocationData={allLocationData}
          yearFrom={yearFrom}
          yearTo={yearTo}
          initialParticipant={initialParticipant}
          onInitialParticipantUsed={onInitialParticipantUsed}
        />
      </div>
    </div>
  );
};

export default FitnessParticipantsVisualizationTab;
