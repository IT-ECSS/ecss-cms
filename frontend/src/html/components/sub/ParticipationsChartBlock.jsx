import React, { Component } from "react";

class ParticipationsChartBlock extends Component {
  constructor(props) {
    super(props);
    this.participationsChartCanvas = null;
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.years !== this.props.years ||
      prevProps.yearlyParticipants !== this.props.yearlyParticipants
    ) {
      this.drawChartIfReady();
    }
  }

  componentDidMount() {
    this.drawChartIfReady();
  }

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
      yearlyParticipants = {},
      years = []
    } = this.props;

    return (
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
    );
  }
}

export default ParticipationsChartBlock;
