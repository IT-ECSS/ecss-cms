import React, { Component } from 'react';
import axios from 'axios';
import FitnessFilterSection from './FitnessFilterSection';
import FitnessDashboardSection from './FitnessDashboardSection';
import FitnessParticipantsSection from './FitnessParticipantsSection';
import '../../../css/sub/fitnessMainSection.css';

/**
 * FitnessSection - Main container for FFT Fitness Results
 * Shows filter first, then tabs after location is selected
 * Reads data from Google Drive spreadsheets
 */
class FitnessSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Data states
      fitnessData: [],
      loading: false,
      error: null,
      
      // Google Drive states
      spreadsheetFiles: [],
      yearFolders: {},
      locationFileMap: {},
      locationYearMap: {}, // Maps location -> [years] where that location has data
      fftFolderId: '',
      
      // Filter states
      selectedLocations: [],
      yearFrom: '',
      yearTo: '',
      availableLocations: [],
      availableYears: [],
      
      // Tab state (only shown after location selected)
      activeTab: 'dashboard',
      
      // Dashboard stats
      dashboardStats: null
    };
  }

  componentDidMount() {
    // Load folder ID from localStorage or use default FFT folder
    const defaultFolderId = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';
    const savedFolderId = localStorage.getItem('fftGoogleDriveFolderId') || defaultFolderId;
    this.setState({ fftFolderId: savedFolderId }, () => {
      this.fetchYearFolders();
    });
  }

  getApiBaseUrl = () => {
    return window.location.hostname === "localhost" 
      ? "http://localhost:3001" 
      : "https://ecss-backend-node.azurewebsites.net";
  }

  fetchYearFolders = async () => {
    const { fftFolderId } = this.state;
    
    try {
      this.setState({ error: null });
      
      if (!fftFolderId) {
        this.setState({ 
          availableYears: [],
          yearFolders: {}
        }, () => {
          if (this.props.onDataLoaded) {
            this.props.onDataLoaded();
          }
        });
        return;
      }

      const response = await axios.post(
        `${this.getApiBaseUrl()}/googleDrive`,
        { 
          folderId: fftFolderId, 
          purpose: 'listSubfolders'
        }
      );
      
      if (response.data.success) {
        const folders = response.data.folders || [];

        console.log('Fetched year folders:', folders);
        
        // Filter for folders only (year folders like 2024, 2025, 2026)
        const yearFolders = {};
        const yearsSet = new Set();
        
        folders.forEach(folder => {
          // Try to extract a year (e.g., "2024") from the folder name.
          // Some setups might name the folder "2024 FFT" or "FFT 2024".
          const yearMatch = folder.name.match(/(20\d{2})/);
          if (yearMatch) {
            const year = yearMatch[1];
            yearsSet.add(year);
            yearFolders[year] = folder.id;
          }
        });

        const availableYears = [...yearsSet].sort();

        this.setState({
          yearFolders,
          availableYears
        }, () => {
          // After loading year folders, scan for location-year mapping
          this.buildLocationYearMap(yearFolders, availableYears);
          if (this.props.onDataLoaded) {
            this.props.onDataLoaded();
          }
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch folders from Google Drive');
      }
    } catch (error) {
      console.error('Error fetching year folders:', error);
      this.setState({
        error: error.message || 'Failed to fetch folders from Google Drive'
      }, () => {
        if (this.props.onDataLoaded) {
          this.props.onDataLoaded();
        }
      });
    }
  }

  // Hardcoded centre locations with file name prefixes
  getHardcodedLocations = () => {
    return [
      { name: 'CT Hub', prefixes: ['CT Hub', 'CT', 'CTH'] },
      { name: 'Pasir Ris', prefixes: ['PRW'] },
      { name: 'Tampines', prefixes: ['Tampines', 'TNCC', 'TNC'] }
    ];
  }

  // Check if filename contains any of the location prefixes
  matchesLocation = (filename, locationPrefixes) => {
    const lowerFilename = filename.toLowerCase();
    // Remove date/session patterns for matching
    const cleanedFilename = lowerFilename.replace(/\d{4}\/\d{2}\/\d{2}/g, '') // Remove YYYY/MM/DD
      .replace(/\d{4}/g, '') // Remove standalone year
      .replace(/session \d+/gi, '') // Remove session info
      .replace(/fft/g, '') // Remove FFT
      .replace(/\s+/g, ' '); // Normalize spaces
    return locationPrefixes.some(prefix =>
      cleanedFilename.includes(prefix.toLowerCase()) || lowerFilename.includes(prefix.toLowerCase())
    );
  }

  // Build a map of which years each location has data in
  buildLocationYearMap = async (yearFolders, availableYears) => {
    const hardcodedLocations = this.getHardcodedLocations();
    const locationYearMap = {};

    
    // Initialize map for each location
    hardcodedLocations.forEach(loc => {
      locationYearMap[loc.name] = [];
    });

    // Scan each year folder in parallel
    const scanPromises = availableYears.map(async (year) => {
      const folderId = yearFolders[year];
      if (!folderId) return { year, files: [] };

      try {
        const response = await axios.post(
          `${this.getApiBaseUrl()}/googleDrive`,
          { folderId, purpose: 'listFiles' }
        );
        
        if (response.data.success) {
          return { year, files: response.data.files || [] };
        }
      } catch (err) {
        console.error(`Error scanning year folder ${year}:`, err);
      }
      return { year, files: [] };
    });

    const results = await Promise.all(scanPromises);

    // Map files to locations
    results.forEach(({ year, files }) => {
      files.forEach(file => {
        // Check if it's a spreadsheet
        const fileNameLower = (file.name || '').toLowerCase();
        const isSpreadsheet = file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
          file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          fileNameLower.endsWith('.xlsx') ||
          fileNameLower.endsWith('.xls') ||
          fileNameLower.endsWith('.csv');

        if (isSpreadsheet) {
          // Find which location this file belongs to
          for (const loc of hardcodedLocations) {
            if (this.matchesLocation(file.name, loc.prefixes)) {
              if (!locationYearMap[loc.name].includes(year)) {
                locationYearMap[loc.name].push(year);
              }
              break;
            }
          }
        }
      });
    });

    // Sort years for each location
    Object.keys(locationYearMap).forEach(loc => {
      locationYearMap[loc].sort();
    });

    // Extract available locations from hardcoded list
    const availableLocations = hardcodedLocations.map(loc => loc.name);

    console.log('Location-Year Map:', locationYearMap);
    console.log('Available Locations:', availableLocations);
    this.setState({ 
      locationYearMap,
      availableLocations 
    });
  }

  fetchSpreadsheetFiles = async (yearFolderId) => {
    try {
      this.setState({ error: null });

      const response = await axios.post(
        `${this.getApiBaseUrl()}/googleDrive`,
        { folderId: yearFolderId, purpose: 'listFiles' }
      );

      if (response.data.success) {
        const files = response.data.files || [];
        // Filter for spreadsheet files only
        const spreadsheetFiles = files.filter(file => 
          file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
          file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.csv')
        );

        // Map files to hardcoded locations based on file name prefix
        const locationMap = {};
        const hardcodedLocations = this.getHardcodedLocations();
        spreadsheetFiles.forEach(file => {
          for (const loc of hardcodedLocations) {
            if (this.matchesLocation(file.name, loc.prefixes)) {
              if (!locationMap[loc.name]) {
                locationMap[loc.name] = [];
              }
              locationMap[loc.name].push(file);
              break;
            }
          }
        });

        const availableLocations = hardcodedLocations.map(loc => loc.name);

        this.setState({
          spreadsheetFiles,
          locationFileMap: locationMap,
          availableLocations
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch files from Google Drive');
      }
    } catch (error) {
      this.setState({
        error: error.message || 'Failed to fetch files from Google Drive'
      });
    }
  }

  fetchFitnessData = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      const response = await axios.post(
        `${this.getApiBaseUrl()}/fitness`,
        { purpose: 'retrieve' }
      );

      if (response.data.success) {
        const data = response.data.data || [];

        console.log('Fetched fitness data:', data.length, 'records');
        
        // Extract unique locations
        const locations = [...new Set(data.map(item => item.location).filter(Boolean))];
        
        // Extract available years from data
        const years = new Set();
        data.forEach(item => {
          Object.keys(item).forEach(key => {
            if (/^\d{4}$/.test(key)) {
              years.add(key);
            }
          });
        });
        const sortedYears = [...years].sort();

        this.setState({
          fitnessData: data,
          availableLocations: locations,
          availableYears: sortedYears,
          loading: false
        }, () => {
          // Close loading popup after data is loaded
          if (this.props.onDataLoaded) {
            this.props.onDataLoaded();
          }
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch fitness data');
      }
    } catch (error) {
      console.error('Error fetching fitness data:', error);
      this.setState({
        error: error.message || 'Failed to fetch fitness data',
        loading: false
      }, () => {
        // Also close popup on error
        if (this.props.onDataLoaded) {
          this.props.onDataLoaded();
        }
      });
    }
  };

  calculateDashboardStats = (filteredData) => {
    const { yearFrom, yearTo } = this.state;
    
    if (!filteredData || filteredData.length === 0) {
      return null;
    }

    // Get years to analyze based on yearFrom and yearTo
    const yearsToAnalyze = [];
    if (yearFrom && yearTo) {
      for (let y = parseInt(yearFrom); y <= parseInt(yearTo); y++) {
        yearsToAnalyze.push(y.toString());
      }
    } else if (yearFrom) {
      yearsToAnalyze.push(yearFrom);
    } else if (yearTo) {
      yearsToAnalyze.push(yearTo);
    } else {
      // Use all available years
      filteredData.forEach(item => {
        Object.keys(item).forEach(key => {
          if (/^\d{4}$/.test(key) && !yearsToAnalyze.includes(key)) {
            yearsToAnalyze.push(key);
          }
        });
      });
    }

    // Calculate statistics by centre/location
    const centreStats = {};
    let totalParticipants = 0;
    let totalImproved = 0;
    let totalDeclined = 0;
    let totalMaintained = 0;

    filteredData.forEach(participant => {
      const location = participant.location || 'Unknown';
      
      if (!centreStats[location]) {
        centreStats[location] = {
          total: 0,
          improved: 0,
          declined: 0,
          maintained: 0,
          male: 0,
          female: 0
        };
      }

      centreStats[location].total++;
      totalParticipants++;

      // Gender count
      if (participant.gender?.toLowerCase() === 'male') {
        centreStats[location].male++;
      } else if (participant.gender?.toLowerCase() === 'female') {
        centreStats[location].female++;
      }

      // Calculate improvement trends if multiple years
      if (yearsToAnalyze.length >= 2) {
        const improvement = this.calculateParticipantImprovement(participant, yearsToAnalyze);
        if (improvement > 0) {
          centreStats[location].improved++;
          totalImproved++;
        } else if (improvement < 0) {
          centreStats[location].declined++;
          totalDeclined++;
        } else {
          centreStats[location].maintained++;
          totalMaintained++;
        }
      }
    });

    // Calculate participants by year
    const byYear = {};
    filteredData.forEach(participant => {
      yearsToAnalyze.forEach(year => {
        if (participant[year]) {
          byYear[year] = (byYear[year] || 0) + 1;
        }
      });
    });

    // Transform centreStats to have noChange instead of maintained for component compatibility
    const byLocation = {};
    Object.entries(centreStats).forEach(([location, stats]) => {
      byLocation[location] = {
        ...stats,
        noChange: stats.maintained // Map maintained to noChange for component
      };
    });

    return {
      totalParticipants,
      overallImprovement: {
        improved: totalImproved,
        declined: totalDeclined,
        noChange: totalMaintained
      },
      byLocation,
      byYear,
      yearsAnalyzed: yearsToAnalyze
    };
  };

  calculateParticipantImprovement = (participant, years) => {
    // Simple improvement calculation based on fitness metrics
    let improvementScore = 0;
    const sortedYears = [...years].sort();
    
    for (let i = 1; i < sortedYears.length; i++) {
      const prevYear = sortedYears[i - 1];
      const currYear = sortedYears[i];
      
      if (participant[prevYear] && participant[currYear]) {
        // Compare key metrics (lower is better for some, higher for others)
        const prevData = participant[prevYear];
        const currData = participant[currYear];
        
        // Chair stand - higher is better
        if (currData.chair_stand > prevData.chair_stand) improvementScore++;
        else if (currData.chair_stand < prevData.chair_stand) improvementScore--;
        
        // Arm curl - higher is better
        if (currData.arm_curl > prevData.arm_curl) improvementScore++;
        else if (currData.arm_curl < prevData.arm_curl) improvementScore--;
        
        // Sit and reach - higher is better
        if (currData.sit_and_reach > prevData.sit_and_reach) improvementScore++;
        else if (currData.sit_and_reach < prevData.sit_and_reach) improvementScore--;
        
        // Two min step - higher is better
        if (currData.two_min_step > prevData.two_min_step) improvementScore++;
        else if (currData.two_min_step < prevData.two_min_step) improvementScore--;
      }
    }
    
    return improvementScore;
  };

  getFilteredData = () => {
    const { fitnessData, selectedLocations, yearFrom, yearTo } = this.state;
    
    let filtered = [...fitnessData];
    
    // Filter by locations (allow data from multiple selected locations)
    if (selectedLocations.length > 0) {
      filtered = filtered.filter(item => selectedLocations.includes(item.location));
    }
    
    // Filter by year - each row has a 'year' property
    if (yearFrom || yearTo) {
      filtered = filtered.filter(item => {
        const itemYear = parseInt(item.year);
        if (yearFrom && yearTo) {
          return itemYear >= parseInt(yearFrom) && itemYear <= parseInt(yearTo);
        } else if (yearFrom) {
          return itemYear >= parseInt(yearFrom);
        } else if (yearTo) {
          return itemYear <= parseInt(yearTo);
        }
        return true;
      });
    }
    
    return filtered;
  };

  handleLocationChange = async (locations) => {
    if (!locations || locations.length === 0) {
      this.setState({ 
        selectedLocations: [], 
        yearFrom: '',
        yearTo: '',
        fitnessData: [],
        dashboardStats: null,
        loading: false
      });
      return;
    }

    // Clear year selections when locations change (years will be filtered for new locations)
    this.setState({ 
      selectedLocations: locations, 
      yearFrom: '', 
      yearTo: '', 
      fitnessData: [],
      dashboardStats: null,
      loading: false 
    });
  };

  // Get years available for the selected locations
  getFilteredYearsForLocation = () => {
    const { selectedLocations, locationYearMap, availableYears } = this.state;
    
    // If no locations selected, return empty (years should only show after location is selected)
    if (!selectedLocations || selectedLocations.length === 0) {
      return [];
    }
    
    // If we have the location-year map, combine years from all selected locations
    if (locationYearMap) {
      const yearsSet = new Set();
      selectedLocations.forEach(location => {
        if (locationYearMap[location]) {
          locationYearMap[location].forEach(year => yearsSet.add(year));
        }
      });
      if (yearsSet.size > 0) {
        return Array.from(yearsSet).sort();
      }
    }
    
    // Fallback to all available years
    return availableYears;
  };

  // Fetch data when both locations and year(s) are selected
  fetchLocationYearData = async () => {
    const { selectedLocations, yearFrom, yearTo, yearFolders } = this.state;
    
    if (!selectedLocations || selectedLocations.length === 0 || (!yearFrom && !yearTo)) {
      return;
    }

    this.setState({ loading: true });
    
    try {
      // Get the centre codes for all selected locations
      const hardcodedLocations = this.getHardcodedLocations();
      const selectedCentres = selectedLocations
        .map(locName => hardcodedLocations.find(loc => loc.name === locName))
        .filter(loc => loc !== undefined);
      
      if (selectedCentres.length === 0) {
        console.error('No matching centres found for:', selectedLocations);
        throw new Error('Invalid centres selected');
      }

      console.log('Selected locations:', selectedLocations);
      console.log('Selected centres:', selectedCentres);
      console.log('Year folders:', yearFolders);

      // Determine which years to fetch
      let yearsToFetch = Object.keys(yearFolders).sort();
      console.log('All available years:', yearsToFetch);
      
      if (yearsToFetch.length === 0) {
        console.warn('No year folders available. Make sure the FFT folder is accessible.');
        this.setState({
          fitnessData: [],
          dashboardStats: null,
          loading: false
        });
        return;
      }
      
      // If Year From is set but Year To is empty, just use Year From only
      if (yearFrom && !yearTo) {
        yearsToFetch = yearsToFetch.filter(y => y === yearFrom);
      } else if (yearFrom && yearTo) {
        yearsToFetch = yearsToFetch.filter(y => 
          parseInt(y) >= parseInt(yearFrom) && parseInt(y) <= parseInt(yearTo)
        );
      } else if (yearTo) {
        yearsToFetch = yearsToFetch.filter(y => parseInt(y) <= parseInt(yearTo));
      }
      // If no year filters, fetch all years

      console.log('Years to fetch after filter:', yearsToFetch);

      // Fetch spreadsheets from each year folder and for each centre IN PARALLEL
      const fetchPromises = [];
      
      yearsToFetch.forEach(year => {
        selectedCentres.forEach(selectedCentre => {
          const promise = (async () => {
            const folderId = yearFolders[year];
            
            try {
              // List files in the year folder
              const listResponse = await axios.post(
                `${this.getApiBaseUrl()}/googleDrive`,
                { folderId, purpose: 'listFiles' }
              );

              if (listResponse.data.success) {
                const files = listResponse.data.files || [];
                
                // Find spreadsheet matching the centre prefixes
                const matchingFile = files.find(file => {
                  const fileNameLower = (file.name || '').toLowerCase();
                  const isSpreadsheet = file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
                    file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    fileNameLower.endsWith('.xlsx') ||
                    fileNameLower.endsWith('.xls') ||
                    fileNameLower.endsWith('.csv');
                  
                  const matchesLoc = selectedCentre && selectedCentre.prefixes ? 
                    this.matchesLocation(file.name, selectedCentre.prefixes) : false;
                  
                  return isSpreadsheet && matchesLoc;
                });

                if (matchingFile) {
                  // Read the spreadsheet data
                  const readResponse = await axios.post(
                    `${this.getApiBaseUrl()}/googleDrive/readSpreadsheet`,
                    { fileId: matchingFile.id }
                  );

                  if (readResponse.data.success && readResponse.data.data) {
                    const { data: rows, columns } = readResponse.data;
                    
                    // Convert array rows to objects using column headers
                    return rows.map(row => {
                      const obj = { year, location: selectedCentre.name };
                      columns.forEach((colName, index) => {
                        obj[colName] = row[index] ?? '';
                      });
                      return obj;
                    });
                  }
                }
              }
            } catch (err) {
              console.error(`Error fetching data for year ${year} and centre ${selectedCentre.name}:`, err);
            }
            return [];
          })();
          
          fetchPromises.push(promise);
        });
      });

      // Wait for all parallel fetches to complete
      const results = await Promise.all(fetchPromises);
      const allData = results.flat();

      console.log('Total data rows:', allData.length);

      // Calculate dashboard stats
      const dashboardStats = this.calculateDashboardStatsFromData(allData);

      this.setState({
        fitnessData: allData,
        dashboardStats,
        loading: false
      });

    } catch (error) {
      console.error('Error fetching centre data:', error);
      this.setState({
        error: error.message || 'Failed to fetch centre data',
        loading: false
      });
    }
  };

  calculateDashboardStatsFromData = (data) => {
    if (!data || data.length === 0) {
      return null;
    }

    console.log('Calculating stats for data:', data.length, 'rows');
    console.log('Sample data row:', data[0]);

    const totalParticipants = data.length;
    
    // Count by gender
    let maleCount = 0;
    let femaleCount = 0;
    
    data.forEach(row => {
      const gender = (row.gender || row.Gender || row.GENDER || '').toLowerCase();
      if (gender === 'male' || gender === 'm') {
        maleCount++;
      } else if (gender === 'female' || gender === 'f') {
        femaleCount++;
      }
    });

    // Count by year
    const byYear = {};
    data.forEach(row => {
      const year = row.year;
      if (year) {
        byYear[year] = (byYear[year] || 0) + 1;
      }
    });

    // Count by location
    const byLocation = {};
    data.forEach(row => {
      const location = row.location;
      if (location) {
        if (!byLocation[location]) {
          byLocation[location] = {
            total: 0,
            improved: 0,
            declined: 0,
            noChange: 0
          };
        }
        byLocation[location].total++;
        byLocation[location].noChange++;
      }
    });

    console.log('Dashboard stats calculated:', { totalParticipants, maleCount, femaleCount, byYear, byLocation });

    return {
      totalParticipants,
      maleCount,
      femaleCount,
      byYear,
      byLocation,
      overallImprovement: {
        improved: 0,
        declined: 0,
        noChange: totalParticipants
      }
    };
  };

  handleYearFromChange = (year) => {
    this.setState({ yearFrom: year }, () => {
      // Fetch data if a centre is already selected
      this.fetchLocationYearData();
    });
  };

  handleYearToChange = (year) => {
    this.setState({ yearTo: year }, () => {
      // Fetch data if a centre is already selected
      this.fetchLocationYearData();
    });
  };

  handleTabChange = (tab) => {
    this.setState({ activeTab: tab });
  };

  handleFolderIdChange = (e) => {
    this.setState({ fftFolderId: e.target.value });
  }

  handleSaveFolderId = () => {
    const { fftFolderId } = this.state;
    localStorage.setItem('fftGoogleDriveFolderId', fftFolderId);
    this.fetchYearFolders();
  }

  renderTabContent = () => {
    const { activeTab, dashboardStats, yearFrom, yearTo, locationFileMap, selectedLocations, availableYears } = this.state;
    const filteredData = this.getFilteredData();

    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <FitnessDashboardSection
              dashboardStats={dashboardStats}
              filteredData={filteredData}
              selectedLocations={selectedLocations}
              yearFrom={yearFrom}
              yearTo={yearTo}
            />
          </>
        );
      case 'participants':
        // Get all data for the selected locations (not filtered by year) for cross-year visualization
        const allLocationData = this.state.fitnessData.filter(item => 
          selectedLocations.length > 0 && selectedLocations.includes(item.location)
        );
        
        // Combine spreadsheet files from all selected locations
        const allLocationFiles = [];
        selectedLocations.forEach(location => {
          if (locationFileMap[location]) {
            allLocationFiles.push(...locationFileMap[location]);
          }
        });
        
        return (
          <FitnessParticipantsSection
            data={filteredData}
            allLocationData={allLocationData}
            yearFrom={yearFrom}
            yearTo={yearTo}
            availableYears={availableYears}
            spreadsheetFiles={allLocationFiles}
            yearFolders={this.state.yearFolders}
            selectedLocations={selectedLocations}
            getApiBaseUrl={this.getApiBaseUrl}
            getHardcodedLocations={this.getHardcodedLocations}
            matchesLocation={this.matchesLocation}
          />
        );
      default:
        return null;
    }
  };

  render() {
    const { 
      availableLocations,
      availableYears,
      yearFrom,
      yearTo,
      activeTab,
      fftFolderId,
      selectedLocations,
      loading,
      error
    } = this.state;

    // Define tabs - always Dashboard and Individual Participants
    const tabs = [
      { key: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-bar' },
      { key: 'participants', label: 'Individual Participants', icon: 'fas fa-users' }
    ];

    if (error) {
      return (
        <div className="fft-main-error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
          <button onClick={this.fetchYearFolders} className="fft-main-retry-btn">
            <i className="fas fa-redo"></i> Retry
          </button>
        </div>
      );
    }

    return (
      <>
        {/* Header */}
        <div className="fft-main-header">
          <h2 className="fft-main-title">
            <i className="fas fa-person-running"></i>
            FFT Results
          </h2>
          <p className="fft-main-subtitle">
            Functional Fitness Test data analysis and tracking
          </p>
        </div>

        {/* Folder Configuration - Show if no folder ID */}
        {!fftFolderId && (
          <div className="fft-main-folder-config">
            <div className="fft-main-folder-config-content">
              <i className="fas fa-folder-open"></i>
              <h3>Configure Google Drive Folder</h3>
              <p>Enter your Google Drive folder ID containing FFT spreadsheets to get started.</p>
              <div className="fft-main-folder-input-row">
                <input
                  type="text"
                  value={fftFolderId}
                  onChange={this.handleFolderIdChange}
                  placeholder="Enter Google Drive folder ID..."
                  className="fft-main-folder-input"
                />
                <button 
                  onClick={this.handleSaveFolderId}
                  className="fft-main-folder-save-btn"
                >
                  <i className="fas fa-save"></i> Save & Load
                </button>
              </div>
              <p className="fft-main-folder-hint">
                The folder ID is the last part of your Google Drive folder URL.
              </p>
            </div>
          </div>
        )}

        {/* Show filters and content only if folder is configured */}
        {fftFolderId && (
          <>
            {/* Filter Section - Year From, Year To, and Centre */}
            <FitnessFilterSection
              availableLocations={availableLocations}
              availableYears={this.getFilteredYearsForLocation()}
              selectedLocations={selectedLocations}
              yearFrom={yearFrom}
              yearTo={yearTo}
              onLocationChange={this.handleLocationChange}
              onYearFromChange={this.handleYearFromChange}
              onYearToChange={this.handleYearToChange}
              showYearRange={true}
              showSingleYear={false}
              showLocation={true}
              title="Filter by Year & Centre"
            />

        {/* Loading State */}
        {loading && (
          <div className="fft-main-loading">
            <div className="fft-main-loading-spinner"></div>
            <p>Loading fitness data...</p>
          </div>
        )}

        {/* Tabs and Content - Only shown after centre AND year(s) are selected and not loading */}
        {!loading && selectedLocations.length > 0 && (yearFrom || yearTo) ? (
          <>
            {/* Tab Navigation */}
            <div className="fft-main-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`fft-main-tab ${activeTab === tab.key ? 'fft-main-tab-active' : ''}`}
                  onClick={() => this.handleTabChange(tab.key)}
                >
                  <i className={tab.icon}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="fft-main-content">
              {this.renderTabContent()}
            </div>
          </>
        ) : !loading && (
          /* Prompt to select years and centre */
          <div className="fft-main-select-prompt">
            <div className="fft-main-prompt-content">
              <i className="fas fa-filter"></i>
              <h3>Select Filters to View Data</h3>
              <p>
                {!yearFrom && !yearTo
                  ? 'Please select Year From or Year To to begin.'
                  : selectedLocations.length === 0
                  ? 'Please select a Centre from the filter above to view the dashboard and participant data.'
                  : 'Please select both Centre and Year(s) to view data.'
                }
              </p>
            </div>
          </div>
        )}
          </>
        )}
      </>
    );
  }
}

export default FitnessSection;
