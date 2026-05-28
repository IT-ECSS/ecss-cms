import React, { Component } from "react";

class GenderBlock extends Component {
  constructor(props) {
    super(props);
    this.genderChartCanvas = null;
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.years !== this.props.years ||
      prevProps.yearlyGender !== this.props.yearlyGender
    ) {
      if (this.genderChartCanvas) {
        this.drawChartIfReady();
      }
    }
  }

  drawChartIfReady = () => {
    const { years = [], yearlyGender = {} } = this.props;
    if (this.genderChartCanvas) {
      const genderData = years.map(year => {
        const yearData = yearlyGender[year] || {};
        return {
          year,
          male: yearData.male || 0,
          female: yearData.female || 0
        };
      });
      if (genderData.length > 0) {
        this.drawGenderChart(this.genderChartCanvas, genderData);
      }
    }
  };

  drawGenderChart = (canvas, genderData) => {
    const ctx = canvas.getContext('2d');
    const width = 700;
    const height = 350;
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    
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
    
    // Draw Y-axis labels (matching Participations style)
    ctx.fillStyle = '#000000';
    ctx.font = '18px sans-serif';
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
    
    // Draw X-axis labels (matching Participations style)
    ctx.fillStyle = '#000000';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const p of femalePoints) {
      ctx.fillText(p.year, p.x, height - 45);
    }
    
    // Draw female value labels
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 19.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const p of femalePoints) {
      ctx.fillText(p.value, p.x, p.y - 20);
    }
    
    // Draw male value labels
    ctx.fillStyle = '#3b82f6';
    for (const p of malePoints) {
      ctx.fillText(p.value, p.x, p.y - 20);
    }
    
    // Draw legend at center bottom (matching Participations style)
    const legendFemaleX = width / 2 - 90;
    const legendMaleX = width / 2 + 20;
    const legendY = height - 20;
    
    // Female legend
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(legendFemaleX, legendY, 12, 12);
    ctx.fillStyle = '#000000';
    ctx.font = '19.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Female', legendFemaleX + 18, legendY + 6);
    
    // Male legend
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(legendMaleX, legendY, 12, 12);
    ctx.fillStyle = '#000000';
    ctx.fillText('Male', legendMaleX + 18, legendY + 6);
  };

  render() {
    const { years = [], yearlyGender = {} } = this.props;

    const genderData = years.map(year => {
      const yearData = yearlyGender[year] || {};
      return {
        year,
        male: yearData.male || 0,
        female: yearData.female || 0
      };
    });

    return (
      <div className="fft-dash-chart-section fft-dash-gender-section-with-divider">
        <h3 className="fft-dash-chart-section-title">Gender Distribution (Unique individuals) by year</h3>
        <div className="fft-dash-line-chart">
          {(() => {
            if (genderData.length === 0) {
              return <div className="fft-dash-chart-empty">No data available</div>;
            }
            return (
              <canvas
                ref={(canvas) => {
                  this.genderChartCanvas = canvas;
                  if (canvas) {
                    setTimeout(() => this.drawChartIfReady(), 0);
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

export default GenderBlock;
