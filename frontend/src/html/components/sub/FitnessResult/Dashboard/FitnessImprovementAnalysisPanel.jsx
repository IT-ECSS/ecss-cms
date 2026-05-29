import React, { Component } from 'react';
import { 
  analyzeParticipantImprovementAllCases, 
  formatImprovementAnalysisReport,
  exportAnalysisAsJSON 
} from './fitnessImprovementAnalysis';

/**
 * FitnessImprovementAnalysisPanel
 * Displays comprehensive improvement analysis across 3 cases with detailed breakdown
 */
class FitnessImprovementAnalysisPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      analysis: null,
      stationThreshold: 1,
      loading: true
    };
  }

  componentDidMount() {
    this.performAnalysis();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      this.performAnalysis();
    }
  }

  performAnalysis = () => {
    const { data } = this.props;
    const { stationThreshold } = this.state;

    if (!data || !data.participantMap || !data.years || data.years.length < 2) {
      this.setState({ analysis: null, loading: false });
      return;
    }

    try {
      const analysis = analyzeParticipantImprovementAllCases(
        data.participantMap,
        data.years,
        stationThreshold
      );
      this.setState({ analysis, loading: false });
    } catch (error) {
      console.error('Error performing analysis:', error);
      this.setState({ analysis: null, loading: false });
    }
  };

  handleStationThresholdChange = (e) => {
    const threshold = parseInt(e.target.value);
    this.setState({ stationThreshold: threshold }, this.performAnalysis);
  };

  downloadReport = () => {
    const { analysis } = this.state;
    if (!analysis) return;

    const report = formatImprovementAnalysisReport(analysis);
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness_improvement_analysis_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  render() {
    const { analysis, stationThreshold, loading } = this.state;

    if (loading) {
      return <div className="fft-analysis-panel">Loading analysis...</div>;
    }

    if (!analysis) {
      return <div className="fft-analysis-panel">Insufficient data for analysis</div>;
    }

    const {
      totalParticipants,
      uniqueCount,
      cases,
      summary,
      uniqueImprovedParticipants
    } = analysis;

    return (
      <div className="fft-analysis-panel">
        <style>{`
          .fft-analysis-panel {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }

          .fft-analysis-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
          }

          .fft-analysis-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
          }

          .fft-analysis-controls {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .fft-analysis-controls label {
            font-size: 14px;
            color: #475569;
            font-weight: 500;
          }

          .fft-analysis-controls select {
            padding: 6px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            font-size: 14px;
            cursor: pointer;
          }

          .fft-analysis-controls button {
            padding: 6px 12px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
          }

          .fft-analysis-controls button:hover {
            background: #2563eb;
          }

          .fft-analysis-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }

          .fft-summary-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 16px;
            text-align: center;
          }

          .fft-summary-card-label {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .fft-summary-card-value {
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
          }

          .fft-summary-card-subtext {
            font-size: 12px;
            color: #78909c;
            margin-top: 4px;
          }

          .fft-analysis-cases {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }

          .fft-case-card {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            padding: 16px;
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .fft-case-card:hover {
            border-color: #94a3b8;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }

          .fft-case-title {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 8px;
          }

          .fft-case-count {
            font-size: 24px;
            font-weight: 700;
            color: #059669;
            margin-bottom: 8px;
          }

          .fft-case-years {
            font-size: 12px;
            color: #64748b;
            line-height: 1.6;
          }

          .fft-participants-list {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 16px;
            margin-top: 16px;
            max-height: 400px;
            overflow-y: auto;
          }

          .fft-participants-header {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 12px;
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .fft-participant-item {
            font-size: 12px;
            padding: 8px 10px;
            margin-bottom: 4px;
            background: #f1f5f9;
            border-radius: 4px;
            border-left: 3px solid #3b82f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .fft-participant-name {
            color: #1e293b;
            font-weight: 500;
            flex-grow: 1;
          }

          .fft-participant-badges {
            display: flex;
            gap: 4px;
            font-size: 10px;
          }

          .fft-participant-badge {
            background: #dbeafe;
            color: #1e40af;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
          }

          .fft-participant-badge.consecutive { background: #d1fae5; color: #065f46; }
          .fft-participant-badge.skipped { background: #fef3c7; color: #92400e; }
        `}</style>

        {/* Header with Controls */}
        <div className="fft-analysis-header">
          <div className="fft-analysis-title">
            Participant Improvement Analysis
          </div>
          <div className="fft-analysis-controls">
            <label>Station Threshold:</label>
            <select value={stationThreshold} onChange={this.handleStationThresholdChange}>
              {[1, 2, 3, 4, 5, 6, 7].map(num => (
                <option key={num} value={num}>≥ {num}</option>
              ))}
            </select>
            <button onClick={this.downloadReport}>📥 Download Report</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="fft-analysis-summary">
          <div className="fft-summary-card">
            <div className="fft-summary-card-label">Total Participants</div>
            <div className="fft-summary-card-value">{totalParticipants}</div>
          </div>

          <div className="fft-summary-card">
            <div className="fft-summary-card-label">Unique Improved</div>
            <div className="fft-summary-card-value">{uniqueCount}</div>
            <div className="fft-summary-card-subtext">{summary.percentageImproved}% improvement rate</div>
          </div>

          <div className="fft-summary-card">
            <div className="fft-summary-card-label">Station Threshold</div>
            <div className="fft-summary-card-value">≥{stationThreshold}</div>
            <div className="fft-summary-card-subtext">Metrics to count as improved</div>
          </div>
        </div>

        {/* Case Breakdown */}
        <div className="fft-analysis-cases">
          <div className="fft-case-card">
            <div className="fft-case-title">📊 Consecutive Years</div>
            <div className="fft-case-count">{cases.consecutiveYears.count}</div>
            <div className="fft-case-years">
              {cases.consecutiveYears.yearPairs.length > 0 ? (
                cases.consecutiveYears.yearPairs.map((pair, idx) => (
                  <div key={idx}>{pair}</div>
                ))
              ) : (
                <div>No data</div>
              )}
            </div>
          </div>

          <div className="fft-case-card">
            <div className="fft-case-title">⏭️ Skipped Years</div>
            <div className="fft-case-count">{cases.skippedYears.count}</div>
            <div className="fft-case-years">
              {cases.skippedYears.yearPairs.length > 0 ? (
                cases.skippedYears.yearPairs.slice(0, 3).map((pair, idx) => (
                  <div key={idx}>{pair}</div>
                ))
              ) : (
                <div>No data</div>
              )}
              {cases.skippedYears.yearPairs.length > 3 && (
                <div style={{ color: '#94a3b8', marginTop: '4px' }}>
                  +{cases.skippedYears.yearPairs.length - 3} more
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Detailed Participants List */}
        {uniqueImprovedParticipants.length > 0 && (
          <div className="fft-participants-list">
            <div className="fft-participants-header">
              ✅ {uniqueImprovedParticipants.length} Participants Improved
            </div>
            {uniqueImprovedParticipants.map((participant, idx) => (
              <div key={idx} className="fft-participant-item">
                <span className="fft-participant-name">
                  {participant.displayName} ({participant.gender})
                </span>
                <div className="fft-participant-badges">
                  {participant.improvedIn.consecutiveYears && (
                    <span className="fft-participant-badge consecutive">Consecutive</span>
                  )}
                  {participant.improvedIn.skippedYears && (
                    <span className="fft-participant-badge skipped">Skipped</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default FitnessImprovementAnalysisPanel;
