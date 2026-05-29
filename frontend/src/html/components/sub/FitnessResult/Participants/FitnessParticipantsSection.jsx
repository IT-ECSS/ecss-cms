import React, { Component } from "react";
import '../../../../../css/sub/FitnessResult/Participants/fitnessParticipantsSection.css';
import FitnessParticipantsDetailsTab from './FitnessParticipantsDetailsTab';
import FitnessParticipantsVisualizationTab from './FitnessParticipantsVisualizationTab';

class FitnessParticipantsSection extends Component {
  constructor(props) {
    super(props);
    // Default to 'rawData' (Details And Results) always
    this.state = {
      activeSubTab: 'rawData', // 'rawData' or 'visualization'
      participantNamesAlertShown: false
    };
  }

  componentDidMount() {
    this.showParticipantNamesAlert(this.props.data);
  }

  componentDidUpdate(prevProps) {
    const { data } = this.props;
    if (prevProps.data !== data) {
      this.showParticipantNamesAlert(data);
    }
  }

  getParticipantName = (row) => {
    if (!row || typeof row !== 'object') return '';
    const candidateKeys = ['Name', 'Full Name', 'Participant Name', 'Chinese Name', 'name', 'participantName'];
    const rawName = candidateKeys
      .map(key => row[key])
      .find(value => value !== undefined && value !== null && String(value).trim() !== '');
    if (!rawName) return '';
    return String(rawName)
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/(?:^|\s)\S/g, c => c.toUpperCase());
  }

  showParticipantNamesAlert = (data) => {
    if (!Array.isArray(data) || data.length === 0) return;
    if (this.state.participantNamesAlertShown) return;

    const participantNames = data
      .map(this.getParticipantName)
      .filter(name => name !== '');

    if (participantNames.length === 0) return;

    const uniqueNames = Array.from(new Set(participantNames));
    const namesText = uniqueNames
      .map((name, index) => `${index + 1}. ${name}`)
      .join('\n');

    alert(`FFT Results - Total Participants: ${data.length}\n\n${namesText}`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('FFT RESULTS - TOTAL PARTICIPANTS:', data.length);
    console.log('FFT RESULTS - PARTICIPANT NAMES:');
    uniqueNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Total Unique Names:', uniqueNames.length);
    console.log('═══════════════════════════════════════════════════════════');

    this.setState({ participantNamesAlertShown: true });
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
                <>
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
                    initialParticipant={initialVisualizationParticipant}
                    onInitialParticipantUsed={() => this.setState({ initialVisualizationParticipant: null })}
                    onBack={() => this.setState({ activeSubTab: 'rawData' })}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
}

export default FitnessParticipantsSection;
