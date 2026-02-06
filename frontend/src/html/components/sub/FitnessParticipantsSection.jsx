import React, { Component, useMemo, useState, useCallback, useRef } from "react";
import '../../../css/sub/fitnessParticipantsSection.css';
import '../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import axios from 'axios';

// Register the community modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Entries Table Component - displays raw data entries using AG Grid (same as Registration & Payment)
const EntriesTable = ({ data, onRowClick, yearFrom, yearTo, allLocationData, onParticipantClick }) => {
  const gridRef = useRef(null);
  const [quickFilterText, setQuickFilterText] = useState('');

  // Check if we have a year range (multiple years selected)
  const hasYearRange = yearFrom && yearTo && yearFrom !== yearTo;

  // Fitness metrics for comparison
  const fitnessMetrics = [
    { key: '30 secs Sit & Stand', label: '30 Secs Sit & Stand', higherIsBetter: true },
    { key: '30 secs Arm Curl', label: '30 Secs Arm Curl', higherIsBetter: true },
    { key: '2 min March on the spot', label: '2 Min March On The Spot', higherIsBetter: true },
    { key: 'Sit & Reach', label: 'Sit & Reach', higherIsBetter: true },
    { key: 'Back Stretch', label: 'Back Stretch', higherIsBetter: true },
    { key: '2.44m speed walk', label: '2.44m Speed Walk', higherIsBetter: false },
    { key: 'Grip Test', label: 'Grip Test', higherIsBetter: true }
  ];

  // Calculate year comparison stats
  const yearComparisonData = useMemo(() => {
    if (!hasYearRange || !data || data.length === 0) return null;

    // Group by year
    const yearGroups = {};
    data.forEach(row => {
      const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
      const year = yearKey ? row[yearKey] : null;
      if (year) {
        if (!yearGroups[year]) yearGroups[year] = [];
        yearGroups[year].push(row);
      }
    });

    const years = Object.keys(yearGroups).sort();
    if (years.length < 2) return null;

    // Calculate stats for each year and metric
    const stats = years.map(year => {
      const rows = yearGroups[year];
      const yearStat = { year, count: rows.length, metrics: {} };

      fitnessMetrics.forEach(metric => {
        const metricKey = Object.keys(rows[0] || {}).find(k => k.toLowerCase() === metric.key.toLowerCase());
        const values = rows
          .map(row => {
            const val = metricKey ? row[metricKey] : null;
            return val !== null && val !== undefined && val !== '' ? parseFloat(val) : null;
          })
          .filter(v => v !== null && !isNaN(v));

        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          yearStat.metrics[metric.key] = {
            avg: sum / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length
          };
        } else {
          yearStat.metrics[metric.key] = null;
        }
      });

      return yearStat;
    });

    return stats;
  }, [data, hasYearRange]);

  // Columns to hide from display
  const hiddenColumns = ['date of test', 'improvement', 'remarks', 'dd', 'mm', 'yyyy', '_rowIndex', 's/n', 'chinese name', 'improvements', 'year', 'location'];

  // Helper to find original column keys (case-insensitive)
  const findColumnKey = (row, colName) => {
    return Object.keys(row).find(k => k.toLowerCase() === colName.toLowerCase());
  };

  // Process row data to add Birth Date and S/N
  const rowData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((row, index) => {
      const ddKey = findColumnKey(row, 'dd');
      const mmKey = findColumnKey(row, 'mm');
      const yyyyKey = findColumnKey(row, 'yyyy');
      const dd = ddKey ? String(row[ddKey] || '').padStart(2, '0') : '';
      const mm = mmKey ? String(row[mmKey] || '').padStart(2, '0') : '';
      const yyyy = yyyyKey ? row[yyyyKey] || '' : '';
      
      let birthDate = '-';
      if (dd && mm && yyyy) {
        birthDate = `${dd}/${mm}/${yyyy}`;
      } else if (dd || mm || yyyy) {
        birthDate = [dd, mm, yyyy].filter(Boolean).join('/');
      }

      return {
        ...row,
        _sn: index + 1,
        _birthDate: birthDate
      };
    });
  }, [data]);

  // Generate column definitions
  const columnDefs = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const keys = Object.keys(data[0]).filter(k => !hiddenColumns.includes(k.toLowerCase()));
    
    // Check if we have DD, MM, YYYY columns
    const hasDD = Object.keys(data[0]).some(k => k.toLowerCase() === 'dd');
    const hasMM = Object.keys(data[0]).some(k => k.toLowerCase() === 'mm');
    const hasYYYY = Object.keys(data[0]).some(k => k.toLowerCase() === 'yyyy');
    const hasBirthDate = hasDD && hasMM && hasYYYY;
    
    // Start with S/N column
    const columns = [
      {
        headerName: 'S/N',
        field: '_sn',
        width: 80,
        pinned: 'left',
        sortable: false,
        filter: false,
      }
    ];

    // Add data columns
    keys.forEach(col => {
      const colLower = col.toLowerCase();
      
      // Skip if it's a hidden column
      if (hiddenColumns.includes(colLower)) return;
      
      const colDef = {
        headerName: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
        field: col,
        sortable: true,
        filter: false,
        resizable: true,
        width: 150,
      };

      // Use valueGetter for columns with special characters (dots, brackets, etc.)
      // AG Grid interprets dots as nested property access, so we need valueGetter
      if (col.includes('.') || col.includes('[') || col.includes(']')) {
        colDef.valueGetter = (params) => params.data[col];
      }

      // Special styling for name column - combine with Chinese Name
      if (colLower === 'name') {
        colDef.width = 320;
        colDef.pinned = 'left';
        colDef.valueGetter = (params) => {
          const name = params.data[col] || '';
          // Find Chinese Name key (case-insensitive, with or without space)
          const chineseNameKey = Object.keys(params.data).find(k => {
            const keyLower = k.toLowerCase();
            return keyLower === 'chinese name' || keyLower === 'chinesename' || keyLower === 'chinese_name';
          });
          const chineseName = chineseNameKey ? params.data[chineseNameKey] : '';
          if (chineseName && String(chineseName).trim()) {
            return `${name} (${chineseName})`;
          }
          return name;
        };
      }

      // Gender column - show Male/Female
      if (colLower === 'gender' || colLower === 'sex') {
        colDef.width = 120;
        colDef.valueFormatter = (params) => {
          const value = params.value;
          const genderValue = String(value || '').toLowerCase();
          const isMale = genderValue === 'm' || genderValue === 'male';
          return isMale ? 'Male' : 'Female';
        };
      }

      // Phone number column
      if (colLower === 'phone' || colLower === 'phone number' || colLower === 'phonenumber' || colLower === 'phone_number' || colLower === 'contact' || colLower === 'mobile') {
        colDef.width = 160;
      }

      // Age column
      if (colLower === 'age') {
        colDef.width = 80;
      }

      // Height column
      if (colLower === 'height') {
        colDef.width = 100;
      }

      // Weight column
      if (colLower === 'weight') {
        colDef.width = 100;
      }

      // BMI column
      if (colLower === 'bmi') {
        colDef.width = 80;
      }

      // Fitness metric columns - give them enough width for the header text
      if (colLower === '30 secs sit & stand') {
        colDef.width = 180;
      }
      if (colLower === '30 secs arm curl') {
        colDef.width = 170;
      }
      if (colLower === '2 min march on the spot') {
        colDef.width = 220;
      }
      if (colLower === 'sit & reach') {
        colDef.width = 150;
      }
      if (colLower === 'back stretch') {
        colDef.width = 200;
      }
      if (colLower === '2.44m speed walk') {
        colDef.width = 250;
      }
      if (colLower === 'grip test') {
        colDef.width = 150;
      }

      columns.push(colDef);
      
      // Add Date of Birth column after Name if we have the date components
      if (colLower === 'name' && hasBirthDate) {
        columns.push({
          headerName: 'Date of Birth',
          field: '_birthDate',
          width: 150,
        });
      }
    });

    return columns;
  }, [data]);

  // Grid options
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: false,
    resizable: false,
    cellStyle: { fontWeight: 'bold' },
  }), []);

  // Row style function (text color and background based on gender)
  const getRowStyle = useCallback((params) => {
    // Find gender column
    const genderKey = Object.keys(params.data).find(k => 
      k.toLowerCase() === 'gender' || k.toLowerCase() === 'sex'
    );
    const genderValue = genderKey ? String(params.data[genderKey] || '').toLowerCase() : '';
    const isMale = genderValue === 'm' || genderValue === 'male';
    
    if (isMale) {
      return { 
        color: '#1976d2',
        backgroundColor: '#e3f2fd'
      };
    }
    return { 
      color: '#c2185b',
      backgroundColor: '#fce4ec'
    };
  }, []);

  // Handle row click
  const onRowClicked = useCallback((event) => {
    if (onRowClick) {
      onRowClick(event.data);
    }
  }, [onRowClick]);

  // Handle quick filter change
  const onFilterTextChange = useCallback((e) => {
    setQuickFilterText(e.target.value);
  }, []);

  if (!data || data.length === 0 || columnDefs.length === 0) {
    return (
      <div className="fft-participants-empty">
        <i className="fas fa-table fft-participants-empty-icon"></i>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="fft-entries-table-wrapper">
        {/* Show participant list table when no year range, show comparison table when year range */}
        {!hasYearRange ? (
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            domLayout="normal"
            pagination={true}
            paginationPageSize={rowData.length}
            getRowStyle={getRowStyle}
            onRowClicked={onRowClicked}
            rowSelection="single"
            animateRows={true}
            suppressCellFocus={true}
            autoSizeStrategy={{ type: 'fitCellContents', skipHeader: false }}
          />
        ) : (yearComparisonData && yearComparisonData.length > 1) ? (
          <YearComparisonView 
            data={allLocationData || data} 
            yearComparisonData={yearComparisonData} 
            fitnessMetrics={fitnessMetrics}
            yearFrom={yearFrom}
            yearTo={yearTo}
            onParticipantClick={onParticipantClick}
          />
        ) : null}
    </div>
  );
};

// Year Comparison View Component - shows per-participant comparison across years
const YearComparisonView = ({ data, yearComparisonData, fitnessMetrics, yearFrom, yearTo, onParticipantClick }) => {
  // Helper functions (same as DataVisualization)
  const getParticipantName = (row) => {
    const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
    return nameKey ? row[nameKey] || 'Unknown' : 'Unknown';
  };

  const getChineseName = (row) => {
    const chineseKey = Object.keys(row).find(k => k.toLowerCase() === 'chinese name');
    return chineseKey ? row[chineseKey] || '' : '';
  };

  const getParticipantGender = (row) => {
    const genderKey = Object.keys(row).find(k => k.toLowerCase() === 'gender' || k.toLowerCase() === 'sex');
    const value = genderKey ? String(row[genderKey] || '').toLowerCase() : '';
    return value === 'm' || value === 'male' ? 'Male' : 'Female';
  };

  const getFieldValue = (row, fieldName) => {
    const key = Object.keys(row).find(k => k.toLowerCase() === fieldName.toLowerCase());
    return key ? row[key] : null;
  };

  const getPhoneNumber = (row) => getFieldValue(row, 'phone number') || getFieldValue(row, 'phone') || getFieldValue(row, 'contact') || '';
  const getAge = (row) => getFieldValue(row, 'age');
  const getHeight = (row) => getFieldValue(row, 'height');
  const getWeight = (row) => getFieldValue(row, 'weight');
  const getBMI = (row) => getFieldValue(row, 'bmi');
  const getDD = (row) => getFieldValue(row, 'dd');
  const getMM = (row) => getFieldValue(row, 'mm');
  const getYYYY = (row) => getFieldValue(row, 'yyyy');

  // Generate all years from yearFrom to yearTo
  const startYear = parseInt(yearFrom);
  const endYear = parseInt(yearTo);
  const years = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(String(y));
  }

  // Generate consecutive year pairs for comparison (e.g., 2024-2025, 2025-2026)
  const yearPairs = [];
  for (let i = 0; i < years.length - 1; i++) {
    yearPairs.push({ from: years[i], to: years[i + 1] });
  }

  // Group data by participant name (case-insensitive, with Chinese name fallback - same as DataVisualization)
  const participantMap = {};
  
  // Process all data to group by participant
  data.forEach(row => {
    const name = getParticipantName(row);
    const chineseName = getChineseName(row);
    const yearKey = Object.keys(row).find(k => k.toLowerCase() === 'year');
    const year = yearKey ? row[yearKey] : null;
    
    if (!name || name === 'Unknown' || !year) return;
    
    // Use lowercase name as key for matching
    const nameKey = name.toLowerCase().trim();
    
    if (!participantMap[nameKey]) {
      participantMap[nameKey] = { 
        name: name, 
        chineseName: chineseName,
        gender: getParticipantGender(row),
        phoneNumber: getPhoneNumber(row),
        dd: getDD(row),
        mm: getMM(row),
        yyyy: getYYYY(row),
        age: getAge(row),
        height: getHeight(row),
        weight: getWeight(row),
        bmi: getBMI(row),
        years: {} 
      };
    }
    
    // Store metrics for this year
    if (!participantMap[nameKey].years[year]) {
      participantMap[nameKey].years[year] = {};
    }
    
    fitnessMetrics.forEach(metric => {
      const metricKey = Object.keys(row).find(k => k.toLowerCase() === metric.key.toLowerCase());
      const val = metricKey ? row[metricKey] : null;
      if (val !== null && val !== undefined && val !== '') {
        participantMap[nameKey].years[year][metric.key] = parseFloat(val);
      }
    });
  });

  // Get all participants (not just those with multiple years)
  const allParticipants = Object.values(participantMap);

  // Build row data for each participant
  const comparisonRowData = allParticipants.map((participant, idx) => {
    // Format date of birth
    const dd = participant.dd ? String(participant.dd).padStart(2, '0') : '';
    const mm = participant.mm ? String(participant.mm).padStart(2, '0') : '';
    const yyyy = participant.yyyy || '';
    const dateOfBirth = (dd && mm && yyyy) ? `${dd}/${mm}/${yyyy}` : (dd || mm || yyyy ? `${dd}/${mm}/${yyyy}`.replace(/^\/|\/$/g, '') : '-');

    const row = {
      _sn: idx + 1,
      name: participant.name,
      chineseName: participant.chineseName,
      gender: participant.gender,
      phoneNumber: participant.phoneNumber || '-',
      dateOfBirth: dateOfBirth,
      age: participant.age || '-',
      height: participant.height || '-',
      weight: participant.weight || '-',
      bmi: participant.bmi || '-',
      hasMultipleYears: Object.keys(participant.years).length > 1
    };
    
    // Add each metric for each year
    fitnessMetrics.forEach(metric => {
      years.forEach(year => {
        const value = participant.years[year]?.[metric.key];
        row[`${metric.key}_${year}`] = value !== undefined ? value : null;
      });
      
      // Calculate change for each consecutive year pair
      yearPairs.forEach(pair => {
        const fromValue = participant.years[pair.from]?.[metric.key];
        const toValue = participant.years[pair.to]?.[metric.key];
        if (fromValue !== null && fromValue !== undefined && toValue !== null && toValue !== undefined) {
          const change = toValue - fromValue;
          const isImproved = metric.higherIsBetter ? change > 0 : change < 0;
          row[`${metric.key}_change_${pair.from}_${pair.to}`] = change;
          row[`${metric.key}_improved_${pair.from}_${pair.to}`] = isImproved;
        } else {
          row[`${metric.key}_change_${pair.from}_${pair.to}`] = null;
          row[`${metric.key}_improved_${pair.from}_${pair.to}`] = null;
        }
      });
    });
    
    return row;
  });

  // Build column definitions with grouped headers for each metric
  // For each metric: show [Year1, Year2, Δ1-2, Year3, Δ2-3, ...]
  const comparisonColDefs = [
    {
      headerName: 'S/N',
      field: '_sn',
      width: 80,
      pinned: 'left',
      sortable: false,
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'center' }
    },
    {
      headerName: 'Name',
      field: 'name',
      width: 280,
      pinned: 'left',
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', cursor: 'pointer'},
      cellRenderer: (params) => {
        const chineseName = params.data.chineseName;
        const displayName = chineseName ? `${params.value} (${chineseName})` : params.value;
        return <span>{displayName}</span>;
      },
      onCellClicked: (params) => {
        if (onParticipantClick) {
          onParticipantClick(params.data);
        }
      }
    },
    {
      headerName: 'Phone',
      field: 'phoneNumber',
      width: 160,
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'center' }
    },
    {
      headerName: 'Gender',
      field: 'gender',
      width: 150,
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'center' }
    },
    {
      headerName: 'Date of Birth',
      field: 'dateOfBirth',
      width: 200,
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'center' }
    },
    {
      headerName: 'Age',
      field: 'age',
      width: 100,
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'center' }
    },
    {
      headerName: 'Height',
      field: 'height',
      width: 100,
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'center' }
    },
    {
      headerName: 'Weight',
      field: 'weight',
      width: 150,
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'center' }
    },
    {
      headerName: 'BMI',
      field: 'bmi',
      width: 100,
      headerClass: 'ag-header-cell-bordered',
      cellStyle: { borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', textAlign: 'center' }
    },
    // Create a column group for each metric
    ...fitnessMetrics.map(metric => {
      const children = [];
      
      // Build columns: Year1, Year2, Δ1-2, Year3, Δ2-3, ...
      years.forEach((year, idx) => {
        // Add year column
        children.push({
          headerName: year,
          field: `${metric.key}_${year}`,
          width: 150,
          headerClass: 'ag-header-cell-bordered',
          cellRenderer: (params) => {
            if (params.value === null || params.value === undefined || isNaN(params.value)) return '-';
            const isSpeedWalk = metric.key === '2.44m speed walk';
            return params.value.toFixed(isSpeedWalk ? 2 : 1);
          },
          cellStyle: { textAlign: 'center', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }
        });
        
        // Add delta column after each year (except first year)
        if (idx > 0) {
          const prevYear = years[idx - 1];
          children.push({
            headerName: `${prevYear}-${year}`,
            field: `${metric.key}_change_${prevYear}_${year}`,
            width: 150,
            headerClass: 'ag-header-cell-bordered',
            cellRenderer: (params) => {
              if (params.value === null || params.value === undefined || isNaN(params.value)) return '-';
              const sign = params.value > 0 ? '+' : '';
              return `${sign}${params.value.toFixed(1)}`;
            },
            cellStyle: (params) => {
              const baseStyle = { textAlign: 'center', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' };
              if (params.value === null || params.value === undefined || isNaN(params.value)) return baseStyle;
              const isImproved = params.data[`${metric.key}_improved_${prevYear}_${year}`];
              return {
                ...baseStyle,
                fontWeight: 'bold',
                color: isImproved ? '#4CAF50' : '#f44336',
                backgroundColor: isImproved ? '#e8f5e9' : '#ffebee'
              };
            }
          });
        }
      });
      
      return {
        headerName: metric.label,
        headerClass: 'ag-header-group-bordered',
        children
      };
    })
  ];

  // Row style based on gender
  const getComparisonRowStyle = (params) => {
    const isMale = params.data.gender === 'Male';
    if (isMale) {
      return { color: '#1976d2', backgroundColor: '#e3f2fd' };
    }
    return { color: '#c2185b', backgroundColor: '#fce4ec' };
  };

  // Count participants with data in multiple years
  const participantsWithMultipleYears = allParticipants.filter(p => Object.keys(p.years).length > 1).length;

  return (
    <div>
      {allParticipants.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <i className="fas fa-info-circle" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
          <p>No participants found</p>
        </div>
      ) : (
        <div className="fft-entries-table-wrapper fft-year-comparison-table">
          <AgGridReact
            rowData={comparisonRowData}
            columnDefs={comparisonColDefs}
            defaultColDef={{
              sortable: true,
              filter: false,
              resizable: true,
              cellStyle: { fontWeight: 'bold' }
            }}
            domLayout="normal"
            pagination={true}
            paginationPageSize={comparisonRowData.length}
            getRowStyle={getComparisonRowStyle}
            headerHeight={45}
            rowHeight={40}
            animateRows={true}
            suppressCellFocus={true}
          />
        </div>
      )}
    </div>
  );
};

// Data Visualization Component - search for individual participant results with charts (Class Component)
class DataVisualization extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchTerm: '',
      selectedParticipant: null,
      searchResults: [],
      allParticipants: [],
      showParticipantList: false
    };
    
    // Specific fitness metrics to display
    // key matches the exact column name in spreadsheet
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
    const { initialParticipant, onInitialParticipantUsed, data } = this.props;
    if (!initialParticipant) return;

    // Find the matching participant in data
    const participantName = initialParticipant.name?.toLowerCase();
    const dataSource = data || [];
    
    const matchingRow = dataSource.find(row => {
      const rowName = this.getParticipantName(row).toLowerCase();
      return rowName === participantName;
    });

    if (matchingRow) {
      this.setState({ selectedParticipant: matchingRow });
    }

    // Clear the initial participant after using it
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
      return rowName.toLowerCase() === name.toLowerCase() ||
        (chineseName && rowChineseName && rowChineseName.toLowerCase() === chineseName.toLowerCase());
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
    const { yearFrom, yearTo, data } = this.props;
    const { searchTerm, selectedParticipant, searchResults, showParticipantList } = this.state;

    const yearlyRecords = selectedParticipant ? this.getParticipantYearlyData(selectedParticipant) : [];
    const chartData = yearlyRecords.length > 0 ? this.buildChartData(yearlyRecords) : [];
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#F44336'];

    return (
      <div className="fft-viz-wrapper">
        <div className="fft-viz-section">
          {/* Collapsible header */}
          <div 
            className="fft-viz-dropdown-header"
            onClick={() => this.setState({ showParticipantList: !showParticipantList })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '15px 20px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: showParticipantList ? '8px 8px 0 0' : '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <h3 className="fft-viz-section-title" style={{ margin: 0 }}>
              <i className="fas fa-users" style={{ marginRight: '10px' }}></i>
              Select Participant
              {selectedParticipant && (
                <span style={{ marginLeft: '10px', fontSize: '18px', color: '#4CAF50', fontWeight: 'bold' }}>
                  - {this.getParticipantName(selectedParticipant)}
                </span>
              )}
              {yearFrom && (
                <span className="fft-viz-year-badge">
                  {yearTo && yearTo !== yearFrom ? `${yearFrom} - ${yearTo}` : yearFrom}
                </span>
              )}
            </h3>
            <i className={`fas fa-chevron-${showParticipantList ? 'up' : 'down'}`} style={{ color: '#666' }}></i>
          </div>

          {/* Collapsible content */}
          {showParticipantList && (
            <div style={{ border: '1px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '15px' }}>
              <div className="fft-viz-search-container">
                <div className="fft-viz-search-input-wrapper">
                  <i className="fas fa-search fft-viz-search-icon"></i>
                  <input
                    type="text"
                    className="fft-viz-search-input"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={this.handleSearchChange}
                  />
                  {searchTerm && (
                    <button
                      className="fft-viz-search-clear"
                      onClick={() => this.setState({ searchTerm: '', searchResults: [] })}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>

                <div className="fft-viz-search-results" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px', marginTop: '10px' }}>
                  {(searchResults.length > 0 ? searchResults : this.getDefaultParticipants()).map((result, index) => {
                    const name = this.getParticipantName(result);
                    const chineseName = this.getChineseName(result);
                    const gender = this.getParticipantGender(result);
                    const age = this.getParticipantAge(result);
                    const yearRange = this.getParticipantYearRange(result);
                    const isMale = gender === 'Male';

                    return (
                      <div
                        key={index}
                        className={`fft-viz-search-result-item ${isMale ? 'fft-viz-result-male' : 'fft-viz-result-female'}`}
                        onClick={() => {
                          this.handleSelectParticipant(result);
                          this.setState({ showParticipantList: false });
                        }}
                      >
                        <div className="fft-viz-result-name">
                          <i className={`fas ${isMale ? 'fa-male' : 'fa-female'}`}></i>
                          <span>{name}</span>
                          {chineseName && <span className="fft-viz-result-chinese">({chineseName})</span>}
                        </div>
                        <div className="fft-viz-result-info">
                          {age && <span>Age: {age}</span>}
                          {yearRange && <span>Year: {yearRange}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

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
                                summaryParts.push(`In ${values[0].year}, ${pName} recorded <strong>${values[0].value} ${metric.unit}</strong> for ${metric.label}.`);
                                
                                for (let i = 1; i < values.length; i++) {
                                  const prev = values[i - 1];
                                  const curr = values[i];
                                  const diff = curr.value - prev.value;
                                  const improved = metric.higherIsBetter ? diff > 0 : diff < 0;
                                  const unchanged = diff === 0;
                                  const absDiff = Math.abs(diff);
                                  
                                  if (unchanged) {
                                    summaryParts.push(`In ${curr.year}, maintained the same performance at <strong>${curr.value} ${metric.unit}</strong>.`);
                                  } else if (improved) {
                                    if (metric.higherIsBetter) {
                                      // Higher is better (reps, steps, cm, kg)
                                      const changeDesc = absDiff >= 5 ? 'significantly improved' : absDiff >= 2 ? 'showed improvement' : 'slightly improved';
                                      summaryParts.push(`In ${curr.year}, ${changeDesc} to <strong>${curr.value} ${metric.unit}</strong> (<span style="color:#10b981">+${absDiff.toFixed(1)}</span> from ${prev.year}).`);
                                    } else {
                                      // Lower is better (seconds for speed walk)
                                      const changeDesc = absDiff >= 1 ? 'completed faster' : 'slightly faster';
                                      summaryParts.push(`In ${curr.year}, ${changeDesc} at <strong>${curr.value} ${metric.unit}</strong> (<span style="color:#10b981">${absDiff.toFixed(2)}s faster</span> than ${prev.year}).`);
                                    }
                                  } else {
                                    if (metric.higherIsBetter) {
                                      // Higher is better but decreased
                                      const changeDesc = absDiff >= 5 ? 'showed a notable decline' : absDiff >= 2 ? 'decreased' : 'slightly decreased';
                                      summaryParts.push(`In ${curr.year}, ${changeDesc} to <strong>${curr.value} ${metric.unit}</strong> (<span style="color:#ef4444">-${absDiff.toFixed(1)}</span> from ${prev.year}).`);
                                    } else {
                                      // Lower is better but got slower
                                      const changeDesc = absDiff >= 1 ? 'took longer' : 'slightly slower';
                                      summaryParts.push(`In ${curr.year}, ${changeDesc} at <strong>${curr.value} ${metric.unit}</strong> (<span style="color:#ef4444">+${absDiff.toFixed(2)}s</span> from ${prev.year}).`);
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
                                    summaryParts.push(`<br/><strong>Overall:</strong> Showed positive progress from ${values[0].year} to ${values[values.length - 1].year}.`);
                                  } else if (overallDiff === 0) {
                                    summaryParts.push(`<br/><strong>Overall:</strong> Maintained consistent performance from ${values[0].year} to ${values[values.length - 1].year}.`);
                                  } else {
                                    summaryParts.push(`<br/><strong>Overall:</strong> Performance declined from ${values[0].year} to ${values[values.length - 1].year}. Consider additional training focus.`);
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

// Participant Detail Modal - shows detailed visualization for a single entry
const ParticipantDetailModal = ({ participant, onClose }) => {
  if (!participant) return null;

  // Get all keys except metadata
  const dataKeys = Object.keys(participant).filter(k => 
    k !== '_rowIndex' && k !== 'year' && k !== 'location'
  );

  // Separate numeric and text fields
  const numericFields = [];
  const textFields = [];

  dataKeys.forEach(key => {
    const value = participant[key];
    if (value !== null && value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
      numericFields.push({ key, value: parseFloat(value), original: value });
    } else {
      textFields.push({ key, value });
    }
  });

  return (
    <div className="fft-detail-modal-overlay" onClick={onClose}>
      <div className="fft-detail-modal-content" onClick={e => e.stopPropagation()}>
        <div className="fft-detail-modal-header">
          <h2 className="fft-detail-modal-title">
            <i className="fas fa-user-circle"></i>
            Participant Details
          </h2>
          <button className="fft-detail-modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="fft-detail-modal-body">
          {/* Metadata */}
          <div className="fft-detail-metadata">
            {participant.year && (
              <span className="fft-detail-meta-badge fft-detail-year">
                <i className="fas fa-calendar"></i> {participant.year}
              </span>
            )}
            {participant.location && (
              <span className="fft-detail-meta-badge fft-detail-location">
                <i className="fas fa-map-marker-alt"></i> {participant.location}
              </span>
            )}
          </div>

          {/* Text Fields */}
          {textFields.length > 0 && (
            <div className="fft-detail-section">
              <h3 className="fft-detail-section-title">Information</h3>
              <div className="fft-detail-text-grid">
                {textFields.map(({ key, value }) => (
                  <div key={key} className="fft-detail-text-item">
                    <span className="fft-detail-label">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                    </span>
                    <span className="fft-detail-value">{value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Numeric Fields with Visualization */}
          {numericFields.length > 0 && (
            <div className="fft-detail-section">
              <h3 className="fft-detail-section-title">Fitness Metrics</h3>
              <div className="fft-detail-metrics-grid">
                {numericFields.map(({ key, value, original }) => {
                  // Calculate percentage for bar (using 100 as max for display)
                  const displayPercentage = Math.min(value, 100);
                  
                  return (
                    <div key={key} className="fft-detail-metric-card">
                      <div className="fft-detail-metric-header">
                        <span className="fft-detail-metric-name">
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                        </span>
                        <span className="fft-detail-metric-value">{original}</span>
                      </div>
                      <div className="fft-detail-metric-bar-container">
                        <div 
                          className="fft-detail-metric-bar"
                          style={{ width: `${displayPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Class Component
class FitnessParticipantsSection extends Component {
  constructor(props) {
    super(props);
    // Default to 'rawData' (Details And Results) always
    this.state = {
      selectedParticipant: null,
      activeSubTab: 'rawData', // 'rawData' or 'visualization'
      initialVisualizationParticipant: null // Participant to auto-select in visualization
    };
  }

  handleSubTabChange = (tab) => {
    this.setState({ activeSubTab: tab });
  }

  handleRowClick = (participant) => {
    this.setState({ selectedParticipant: participant });
  }

  handleCloseModal = () => {
    this.setState({ selectedParticipant: null });
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
                <EntriesTable 
                  data={data}
                  onRowClick={this.handleRowClick}
                  yearFrom={yearFrom}
                  yearTo={yearTo}
                  allLocationData={allLocationData}
                  onParticipantClick={this.handleComparisonParticipantClick}
                />
              )}

              {activeSubTab === 'visualization' && (
                <DataVisualization 
                  data={allLocationData || data}
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
                />
              )}
            </>
          )}
        </div>

        {/* Detail Modal */}
        {selectedParticipant && (
          <ParticipantDetailModal
            participant={selectedParticipant}
            onClose={this.handleCloseModal}
          />
        )}
      </div>
    );
  }
}

export default FitnessParticipantsSection;
