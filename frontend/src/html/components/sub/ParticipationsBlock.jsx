import React, { Component } from "react";

class ParticipationsBlock extends Component {
  constructor(props) {
    super(props);
    this.participationsChartCanvas = null;
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

  componentDidUpdate(prevProps) {
    if (
      prevProps.years !== this.props.years ||
      prevProps.yearlyParticipants !== this.props.yearlyParticipants ||
      prevProps.selectedStationCountParticipations !== this.props.selectedStationCountParticipations
    ) {
      this.drawChartIfReady();
    }
  }

  componentDidMount() {
    this.drawChartIfReady();
  }

  calculateYearlyImprovement = (data, stationCount = 1) => {
    const { isMultipleYearsView } = this.props;
    
    // Only calculate if multiple years selected
    if (!isMultipleYearsView) {
      return null;
    }

    if (!data || data.years.length < 2 || !data.participantMap) {
      return null;
    }

    const years = data.years.sort();
    const improvements = [];

    // Calculate improvement for each consecutive year pair
    for (let i = 0; i < years.length - 1; i++) {
      const currentYear = years[i];
      const nextYear = years[i + 1];

      let participantsWithData = 0;
      let participantsImproved = 0;

      Object.values(data.participantMap).forEach(participant => {
        const currentYearData = participant.years[currentYear];
        const nextYearData = participant.years[nextYear];
        if (!currentYearData || !nextYearData) return;
        participantsWithData++;
        let improvedCount = 0;
        this.fitnessMetrics.slice(0, stationCount).forEach(metric => {
          const currentValue = currentYearData[metric.key];
          const nextValue = nextYearData[metric.key];
          if (currentValue !== undefined && nextValue !== undefined && !isNaN(currentValue) && !isNaN(nextValue)) {
            const diff = nextValue - currentValue;
            const improved = metric.higherIsBetter ? diff > 0 : diff < 0;
            if (improved) {
              improvedCount++;
            }
          }
        });
        if (improvedCount >= stationCount) {
          participantsImproved++;
        }
      });

      if (participantsWithData > 0) {
        const improvementPercentage = (participantsImproved / participantsWithData) * 100;
        improvements.push({
          from: currentYear,
          to: nextYear,
          value: improvementPercentage
        });
      }
    }

    // Always return improvements, even if 0% or negative
    return improvements.length > 0 ? improvements : null;
  };

  drawChartIfReady = () => {
    const { years = [], yearlyParticipants = {} } = this.props;
    if (this.participationsChartCanvas) {
      const participations = years.map(year => ({
        year,
        value: (yearlyParticipants[year] || {}).total || 0
      }));
      if (participations.length > 0) {
        this.drawChartOnCanvas(this.participationsChartCanvas, participations, 'Participations');
      }
    }
  };

  drawChartOnCanvas = (canvas, participants, legendLabel) => {
    const ctx = canvas.getContext('2d');
    const width = 700;
    const height = 350;
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    if (participants.length === 0) return;
    
    const maxVal = Math.max(10, ...participants.map(d => d.value));
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * graphHeight;
      const val = Math.round((5 - i) / 5 * maxVal);
      ctx.fillText(val, padding.left - 10, y);
    }
    
    const points = participants.map((p, idx) => ({
      x: padding.left + (idx / (participants.length - 1 || 1)) * graphWidth,
      y: height - padding.bottom - ((p.value / maxVal) * graphHeight),
      ...p
    }));
    
    const isParticipationChart = legendLabel === 'Participations' || legendLabel === 'Participants';
    const lineColor = isParticipationChart ? '#16a34a' : '#3b82f6';
    const pointColor = isParticipationChart ? '#16a34a' : '#3b82f6';
    const valueColor = isParticipationChart ? '#16a34a' : '#1e293b';
    
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    ctx.fillStyle = pointColor;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const p of points) {
      ctx.fillText(p.year, p.x, height - 45);
    }
    
    ctx.fillStyle = valueColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const p of points) {
      ctx.fillText(p.value, p.x, p.y - 20);
    }
    
    const legendX = width / 2 - 50;
    const legendY = height - 20;
    ctx.fillStyle = lineColor;
    ctx.fillRect(legendX, legendY, 12, 12);
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(legendLabel, legendX + 18, legendY + 6);
  };

  render() {
    const {
      data,
      yearlyParticipants = {},
      years = [],
      selectedStationCountParticipations = 1,
      handleStationCountChangeParticipations,
      isMultipleYearsView
    } = this.props;

    if (!data) {
      return (
        <div className="fft-dash-left-section">
          <h3 className="fft-dash-section-header">Participations</h3>
          <div className="fft-dash-empty">No data available</div>
        </div>
      );
    }

    const {
      totalParticipations,
      maleParticipations,
      femaleParticipations
    } = data;

    return (
      <div className="fft-dash-left-section">
        <h3 className="fft-dash-section-header">Participations</h3>
        <div className="fft-dash-kpi-row">
          <div className="fft-dash-kpi-card">
            <div className="fft-dash-kpi-label">Total Participations (Attendance)</div>
            <div className="fft-dash-kpi-value">{totalParticipations}</div>
          </div>
          <div className="fft-dash-kpi-card fft-dash-kpi-female">
            <div className="fft-dash-kpi-label">Participations (Female)</div>
            <div className="fft-dash-kpi-value">
              {femaleParticipations}
              <span className="fft-dash-kpi-percent">
                ({totalParticipations > 0 ? ((femaleParticipations / totalParticipations) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
          <div className="fft-dash-kpi-card fft-dash-kpi-male">
            <div className="fft-dash-kpi-label">Participations (Male)</div>
            <div className="fft-dash-kpi-value">
              {maleParticipations}
              <span className="fft-dash-kpi-percent">
                ({totalParticipations > 0 ? ((maleParticipations / totalParticipations) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
          {isMultipleYearsView && (
            <div className="fft-dash-kpi-card fft-dash-kpi-improvement" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
              <div className="fft-dash-kpi-header" style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, marginRight: '8px', color: '#475569', whiteSpace: 'nowrap' }} htmlFor="station-count-select">Number of Stations</label>
                <select
                  id="station-count-select"
                  className="fft-dash-station-dropdown"
                  style={{ fontSize: '13px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                  value={selectedStationCountParticipations}
                  onChange={handleStationCountChangeParticipations}
                >
                  {this.fitnessMetrics.map((m, idx) => {
                    const stationValue = Math.round((idx + 1) * 1.25);
                    return (
                      <option key={stationValue} value={stationValue}>{stationValue} station{stationValue > 1 ? 's' : ''}</option>
                    );
                  })}
                </select>
              </div>
              <div className="fft-dash-kpi-body" style={{ marginTop: '16px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="fft-dash-kpi-label" style={{ fontWeight: 'bold', fontSize: '1.5em', marginBottom: '8px' }}>Improvement by year</span>
                <span className="fft-dash-kpi-value" style={{ fontWeight: 700, fontSize: '2.5em', color: '#1e293b' }}>
                  {(() => {
                    const improvements = this.calculateYearlyImprovement(data, selectedStationCountParticipations);
                    if (!improvements || improvements.length === 0) {
                      return '-';
                    }
                    const value = improvements[0].value;
                    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="fft-dash-chart-section">
          <h3 className="fft-dash-chart-section-title">Participations (Attendance) by year</h3>
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
                <canvas
                  ref={(canvas) => {
                    this.participationsChartCanvas = canvas;
                    if (canvas) {
                      setTimeout(() => this.drawChartOnCanvas(canvas, participations, 'Participations'), 0);
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
      </div>
    );
  }
}

export default ParticipationsBlock;
