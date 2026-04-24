import React, { Component } from 'react';
import axios from 'axios';
import FitnessFilterSection from './Filter/FitnessFilterSection';
import FitnessDashboardSection from './Dashboard/FitnessDashboardSection';
import FitnessParticipantsSection from './Participants/FitnessParticipantsSection';
import '../../../../css/sub/FitnessResult/fitnessMainSection.css';

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
      fileRegistry: [], // [{ fileId, fileName, year, location }]
      
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
      this.scanFFTFiles();
    });
  }

  getApiBaseUrl = () => {
    return window.location.hostname === "localhost" 
      ? "http://localhost:3001" 
      : "https://ecss-backend-node.azurewebsites.net";
  }

  // Extract year from filename using both naming conventions:
  //   Convention 1: "Location yyyy FFT"           e.g. "PRW 2025 FFT"
  //   Convention 2: "yyyy/mm/dd Location FFT Session N"  e.g. "2025/03/15 PRW FFT Session 1"
  extractYearFromFilename = (filename) => {
    // Convention 2: starts with yyyy/mm/dd
    const dateMatch = filename.match(/^(20\d{2})\/\d{2}\/\d{2}/);
    if (dateMatch) return dateMatch[1];
    // Convention 1 / general: first 20xx pattern anywhere in the name
    const yearMatch = filename.match(/(20\d{2})/);
    if (yearMatch) return yearMatch[1];
    return null;
  }

  isSpreadsheetFile = (file) => {
    const lower = (file.name || '').toLowerCase();
    return file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
      file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
  }

  scanFFTFiles = async () => {
    const { fftFolderId } = this.state;

    this.setState({ error: null });

    if (!fftFolderId) {
      this.setState({ availableYears: [], yearFolders: {}, fileRegistry: [] }, () => {
        if (this.props.onDataLoaded) this.props.onDataLoaded();
      });
      return;
    }

    const hardcodedLocations = this.getHardcodedLocations();
    const fileRegistry = [];
    const yearsSet = new Set();
    const locationYearMap = {};
    hardcodedLocations.forEach(loc => { locationYearMap[loc.name] = []; });
    const yearFolders = {};

    const registerFile = (file, folderYear = null) => {
      if (!this.isSpreadsheetFile(file)) return;
      const year = folderYear || this.extractYearFromFilename(file.name);
      if (!year) return;
      for (const loc of hardcodedLocations) {
        if (this.matchesLocation(file.name, loc.prefixes)) {
          fileRegistry.push({ fileId: file.id, fileName: file.name, year, location: loc.name });
          yearsSet.add(year);
          if (!locationYearMap[loc.name].includes(year)) {
            locationYearMap[loc.name].push(year);
          }
          break;
        }
      }
    };

    try {
      // Step 1: List sub-folders (year-folder structure support)
      const subfoldersResp = await axios.post(
        `${this.getApiBaseUrl()}/googleDrive`,
        { folderId: fftFolderId, purpose: 'listSubfolders' }
      );
      const subfolders = subfoldersResp.data.success ? (subfoldersResp.data.folders || []) : [];

      // Extract year from sub-folder names
      subfolders.forEach(folder => {
        const ym = folder.name.match(/(20\d{2})/);
        if (ym) yearFolders[ym[1]] = folder.id;
      });

      // Step 2: List files directly in root (flat file structure support)
      const rootResp = await axios.post(
        `${this.getApiBaseUrl()}/googleDrive`,
        { folderId: fftFolderId, purpose: 'listFiles' }
      );
      const rootFiles = rootResp.data.success ? (rootResp.data.files || []) : [];
      rootFiles.forEach(f => registerFile(f, null));

      // Step 3: Scan each year sub-folder using folder year as reference
      const subFolderScans = Object.entries(yearFolders).map(async ([year, folderId]) => {
        try {
          const resp = await axios.post(
            `${this.getApiBaseUrl()}/googleDrive`,
            { folderId, purpose: 'listFiles' }
          );
          const files = resp.data.success ? (resp.data.files || []) : [];
          files.forEach(f => registerFile(f, year));
        } catch (err) {
          console.error(`Error scanning year folder ${year}:`, err);
        }
      });
      await Promise.all(subFolderScans);

      // Sort
      Object.keys(locationYearMap).forEach(loc => locationYearMap[loc].sort());
      const availableYears = [...yearsSet].sort();
      const availableLocations = hardcodedLocations.map(loc => loc.name);

      console.log('File registry:', fileRegistry);
      console.log('Available years:', availableYears);
      console.log('Location-year map:', locationYearMap);

      this.setState({
        yearFolders,
        fileRegistry,
        availableYears,
        availableLocations,
        locationYearMap
      }, () => {
        if (this.props.onDataLoaded) this.props.onDataLoaded();
      });
    } catch (error) {
      console.error('Error scanning FFT files:', error);
      this.setState(
        { error: error.message || 'Failed to scan FFT files', availableYears: [], yearFolders: {}, fileRegistry: [] },
        () => { if (this.props.onDataLoaded) this.props.onDataLoaded(); }
      );
    }
  }

  // Hardcoded centre locations with file name prefixes (both short codes and full names)
  getHardcodedLocations = () => {
    return [
      { name: 'CT Hub', prefixes: ['CT Hub', 'CTH', 'CT'] },
      { name: 'Pasir Ris', prefixes: ['Pasir Ris', 'PRW', 'PR'] },
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

  // buildLocationYearMap is now handled inside scanFFTFiles

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
          return itemYear === parseInt(yearTo);
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

  // Detect and correct a one-column right-shift caused by a missing S/N header in the spreadsheet.
  // When the 2026 template omits the leading "S/N" column, every field ends up stored under the
  // NEXT column's header.  We detect this by checking whether "30 secs Sit & Stand" holds a date
  // value (DD/MM/YYYY) instead of a numeric score, then slide every field left one slot.
  normalizeShiftedColumns = (rows) => {
    if (!rows || rows.length === 0) return rows;
    const sampleRow = rows.find(
      r => r['30 secs Sit & Stand'] !== undefined && String(r['30 secs Sit & Stand']).trim() !== ''
    );
    if (!sampleRow) return rows;
    const val = String(sampleRow['30 secs Sit & Stand']).trim();
    // If it looks like a date (e.g. "03/02/2026") the columns are shifted
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) return rows;
    return rows.map(row => ({
      year:                           row.year,
      location:                       row.location,
      'S/N':                          row['Name']                        || '',
      'Name':                         row['Phone Number']                || '',
      'Phone Number':                 row['Gender']                      || '',
      'Gender':                       row['DD']                          || '',
      'DD':                           row['MM']                          || '',
      'MM':                           row['YYYY']                        || '',
      'YYYY':                         row['Start Time']                  || '',
      'Start Time':                   row['End Time']                    || '',
      'End Time':                     row['Age']                         || '',
      'Age':                          row['Height']                      || '',
      'Height':                       row['Weight']                      || '',
      'Weight':                       row['BMI']                         || '',
      'BMI':                          row['Date of test']                || '',
      'Date of test':                 row['30 secs Sit & Stand']         || '',
      '30 secs Sit & Stand':          row['30 secs Dumbbell Curl']       || '',
      '30 secs Dumbbell Curl':        row['2 min On-the-spot Marching']  || '',
      '2 min On-the-spot Marching':   row['Sit & Reach']                 || '',
      'Sit & Reach':                  row['Back Stretching']             || '',
      'Back Stretching':              row['2.44m Speed Walk']            || '',
      '2.44m Speed Walk':             row['Grip test']                   || '',
      'Grip test':                    row['Improvements']                || '',
      'Improvements':                 row['Remarks']                     || '',
      'Remarks':                      '',
    }));
  };

  // Fetch data when both locations and year(s) are selected
  fetchLocationYearData = async () => {
    const { selectedLocations, yearFrom, yearTo, fileRegistry } = this.state;

    if (!selectedLocations || selectedLocations.length === 0 || (!yearFrom && !yearTo)) {
      return;
    }

    this.setState({ loading: true });

    try {
      // Filter file registry for matching location + year range
      let filesToFetch = fileRegistry.filter(f => selectedLocations.includes(f.location));

      if (yearFrom && !yearTo) {
        filesToFetch = filesToFetch.filter(f => f.year === yearFrom);
      } else if (yearFrom && yearTo) {
        filesToFetch = filesToFetch.filter(f =>
          parseInt(f.year) >= parseInt(yearFrom) && parseInt(f.year) <= parseInt(yearTo)
        );
      } else if (yearTo) {
        filesToFetch = filesToFetch.filter(f => parseInt(f.year) <= parseInt(yearTo));
      }

      console.log('Files to fetch:', filesToFetch);

      if (filesToFetch.length === 0) {
        console.warn('No matching files found for selected location/year.');
        this.setState({ fitnessData: [], dashboardStats: null, loading: false });
        return;
      }

      // Fetch each matching spreadsheet in parallel
      const fetchPromises = filesToFetch.map(async ({ fileId, year, location }) => {
        try {
          const readResponse = await axios.post(
            `${this.getApiBaseUrl()}/googleDrive/readSpreadsheet`,
            { fileId }
          );

          if (readResponse.data.success && readResponse.data.data) {
            const { data: rows, columns } = readResponse.data;
            const rawRows = rows.map(row => {
              const obj = { year, location };
              columns.forEach((colName, index) => {
                obj[colName] = row[index] ?? '';
              });
              return obj;
            });
            return this.normalizeShiftedColumns(rawRows);
          }
        } catch (err) {
          console.error(`Error reading file ${fileId} (${year} / ${location}):`, err);
        }
        return [];
      });

      const results = await Promise.all(fetchPromises);
      const allData = results.flat();

      console.log('Total data rows:', allData.length);

      const dashboardStats = this.calculateDashboardStatsFromData(allData);

      this.setState({ fitnessData: allData, dashboardStats, loading: false });

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
    this.scanFFTFiles();
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
          <button onClick={this.scanFFTFiles} className="fft-main-retry-btn">
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
