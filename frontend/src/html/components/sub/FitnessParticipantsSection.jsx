import React, { Component } from "react";
import '../../../css/sub/fitnessParticipantsSection.css';
import FitnessParticipantsDetailsTab from './FitnessParticipantsDetailsTab';
import FitnessParticipantsVisualizationTab from './FitnessParticipantsVisualizationTab';

class FitnessParticipantsSection extends Component {
  constructor(props) {
    super(props);
    // Default to 'rawData' (Details And Results) always
    this.state = {
      activeSubTab: 'rawData' // 'rawData' or 'visualization'
    };
  }

  handleSubTabChange = (tab) => {
    this.setState({ activeSubTab: tab });
  }

  // Handle click on participant name in comparison table
  handleComparisonParticipantClick = (participantData) => {
    // Switch to visualization tab and set the participant to auto-select
    this.setState({ 
      activeSubTab: 'visualization',
      initialVisualizationParticipant: participantData
    });
  }

  render() {
    const { 
      data = [], 
      allLocationData = [],
      loading = false, 
      yearFrom, 
      yearTo,
      yearFolders,
      selectedLocation,
      getApiBaseUrl,
      getHardcodedLocations,
      matchesLocation
    } = this.props;
    
    const { selectedParticipant, activeSubTab, initialVisualizationParticipant } = this.state;

    if (loading) {
      return (
        <div className="fft-participants-loading">
          <div className="fft-participants-loading-spinner"></div>
          <p>Loading participants...</p>
        </div>
      );
    }

    // Define sub-tabs - show visualization only when date range selected (different years)
    const hasDateRange = yearFrom && yearTo && yearFrom !== yearTo;
    const subTabs = [
      { key: 'rawData', label: 'Details And Results', icon: 'fas fa-table' },
      ...(hasDateRange ? [{ key: 'visualization', label: 'Data Visualization', icon: 'fas fa-chart-bar' }] : [])
    ];

    return (
      <div className="fft-participants-section-wrapper">
        {/* Sub-Tab Navigation - show only when date range selected */}
        {hasDateRange && (
          <div className="fft-participants-subtabs">
            {subTabs.map(tab => (
              <button
                key={tab.key}
                className={`fft-participants-subtab ${activeSubTab === tab.key ? 'fft-participants-subtab-active' : ''}`}
                onClick={() => this.handleSubTabChange(tab.key)}
              >
                <i className={tab.icon}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Sub-Tab Content */}
        <div className="fft-participants-subtab-content">
          {data.length === 0 ? (
            <div className="fft-participants-empty">
              <i className="fas fa-users fft-participants-empty-icon"></i>
              <p>No participants found for the selected filters</p>
              <p className="fft-participants-empty-hint">
                Select a Centre and Year to view participant data
              </p>
            </div>
          ) : (
            <>
              {activeSubTab === 'rawData' && (
                <FitnessParticipantsDetailsTab 
                  data={data}
                  allLocationData={allLocationData}
                  yearFrom={yearFrom}
                  yearTo={yearTo}
                  onRowClick={this.handleRowClick}
                  onParticipantClick={this.handleComparisonParticipantClick}
                />
              )}

              {activeSubTab === 'visualization' && hasDateRange && (
                <FitnessParticipantsVisualizationTab 
                  data={data}
                  allLocationData={allLocationData}
                  yearFrom={yearFrom}
                  yearTo={yearTo}
                  yearFolders={yearFolders}
                  selectedLocation={selectedLocation}
                  getApiBaseUrl={getApiBaseUrl}
                  getHardcodedLocations={getHardcodedLocations}
                  matchesLocation={matchesLocation}
                  initialVisualizationParticipant={initialVisualizationParticipant}
                  onInitialParticipantUsed={() => this.setState({ initialVisualizationParticipant: null })}
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  }
}

export default FitnessParticipantsSection;
