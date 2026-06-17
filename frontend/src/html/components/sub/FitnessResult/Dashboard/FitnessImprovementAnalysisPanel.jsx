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
      <></>
    );
  }
}

export default FitnessImprovementAnalysisPanel;
