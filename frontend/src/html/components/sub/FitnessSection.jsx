import React, { Component, useMemo, useState } from "react";
import axios from 'axios';
import './FitnessSection.css';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';

// Advanced Table Component
const AdvancedFitnessTable = ({ data, calculateChange, getStationStats, onSelectionChange, onRowClick, yearFrom, yearTo }) => {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 1000, // Set to a large number to show all entries by default
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());

  const toggleRowExpansion = (rowId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowId)) {
      newExpandedRows.delete(rowId);
    } else {
      newExpandedRows.add(rowId);
    }
    setExpandedRows(newExpandedRows);
  };

  const toggleRowSelection = (rowIndex) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(rowIndex)) {
      newSelectedRows.delete(rowIndex);
    } else {
      newSelectedRows.add(rowIndex);
    }
    setSelectedRows(newSelectedRows);
    
    // Get selected participant data
    const selectedData = data.filter((_, index) => newSelectedRows.has(index));
    onSelectionChange(selectedData);
  };

  const calculateOverallSummary = (participant) => {
    const data2024 = participant['2024'] || {};
    const data2025 = participant['2025'] || {};
    
    let improved = 0;
    let declined = 0;
    let noChange = 0;
    let totalMetrics = 0;

    stationMetrics.forEach(station => {
      const value2024 = data2024[station.key];
      const value2025 = data2025[station.key];
      
      if (value2024 && value2025 && value2024 !== '-' && value2025 !== '-') {
        totalMetrics++;
        const change = calculateChange(value2024, value2025, station.isHigherBetter);
        
        if (change.trend === 'improved') {
          improved++;
        } else if (change.trend === 'declined') {
          declined++;
        } else {
          noChange++;
        }
      }
    });

    return { improved, declined, noChange, totalMetrics };
  };

  const stationMetrics = [
    { key: 'grip', name: 'Grip Strength', isHigherBetter: true, unit: '' },
    { key: 'march', name: '2-Min March', isHigherBetter: true, unit: '' },
    { key: 'arm_curl', name: 'Arm Curl', isHigherBetter: true, unit: '' },
    { key: 'sit_reach', name: 'Sit & Reach', isHigherBetter: true, unit: 'cm' },
    { key: 'back_stretch', name: 'Back Stretch', isHigherBetter: true, unit: 'cm' },
    { key: 'speed_walk', name: 'Speed Walk', isHigherBetter: false, unit: 's' },
    { key: 'squat', name: '30s Squat', isHigherBetter: true, unit: '' }
  ];

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Participant',
      size: 200,
      cell: ({ row }) => (
        <div className="participant-info">
          <div className="name">{row.original.name}</div>
          <div className="dob">{row.original.dob}</div>
        </div>
      ),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'gender',
      header: 'Gender',
      size: 100,
      cell: ({ getValue }) => (
        <span className={`gender-badge ${getValue()?.toLowerCase()}`}>
          {getValue()}
        </span>
      ),
      filterFn: 'equals',
    },
    {
      accessorKey: 'location',
      header: 'Location',
      size: 150,
      cell: ({ getValue }) => (
        <span className="location-badge">{getValue()}</span>
      ),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'phone_number',
      header: 'Phone',
      size: 150,
      enableSorting: false,
    },
    ...stationMetrics.map(station => ({
      id: station.key,
      header: station.name,
      size: 140,
      cell: ({ row }) => {
        const dataFrom = row.original[yearFrom] || {};
        const dataTo = row.original[yearTo] || {};
        const valueFrom = dataFrom[station.key] || '-';
        const valueTo = dataTo[station.key] || '-';
        const change = calculateChange(valueFrom, valueTo, station.isHigherBetter);
        const hasComparison = valueFrom !== '-' && valueTo !== '-';

        if (!hasComparison) {
          return <div className="no-data">No Data</div>;
        }

        const changeValue = parseFloat(change.value);
        const isPositiveChange = changeValue > 0;
        const isImprovement = change.trend === 'improved';

        return (
          <div className="stock-indicator">
            <div className={`stock-arrow ${isImprovement ? 'positive' : 'negative'}`}>
              {isPositiveChange ? '▲' : '▼'}
            </div>
            <div className="stock-values">
              <div className={`change-value ${isImprovement ? 'positive' : 'negative'}`}>
                {isPositiveChange ? '+' : ''}{change.value}{station.unit}
              </div>
              <div className={`percentage-value ${isImprovement ? 'positive' : 'negative'}`}>
                ({change.percentage}%)
              </div>
            </div>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const aFrom = rowA.original[yearFrom]?.[station.key] || 0;
        const aTo = rowA.original[yearTo]?.[station.key] || 0;
        const bFrom = rowB.original[yearFrom]?.[station.key] || 0;
        const bTo = rowB.original[yearTo]?.[station.key] || 0;
        
        const aChange = parseFloat(aTo) - parseFloat(aFrom);
        const bChange = parseFloat(bTo) - parseFloat(bFrom);
        
        return aChange - bChange;
      },
    }))
  ], [data, calculateChange, expandedRows]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnFilters: true,
    enableSorting: true,
    debugTable: false,
  });

  return (
    <div className="table-container">
      {/* Table */}
      <table className="advanced-fitness-table">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id} 
                  className={`header-cell ${header.column.getCanSort() ? 'sortable' : ''}`}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ width: header.getSize() }}
                >
                  <div className="header-content">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())
                    }
                    {header.column.getCanSort() && (
                      <span className="sort-indicator">
                        {{
                          asc: '🔼',
                          desc: '🔽',
                        }[header.column.getIsSorted()] ?? ''}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr 
              key={row.id} 
              className={`data-row compact-row ${selectedRows.has(parseInt(row.id)) ? 'selected' : ''}`}
              onClick={(e) => {
                // Don't trigger row click if clicking on checkbox
                if (e.target.type !== 'checkbox') {
                  onRowClick(row.original);
                }
              }}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="data-cell compact-cell">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="table-pagination">
        <div className="pagination-info">
          <span>
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} participants
          </span>
        </div>

        <div className="pagination-size-controls">
          <span>Show:</span>
          <select
            value={table.getState().pagination.pageSize >= table.getFilteredRowModel().rows.length ? 
                   table.getFilteredRowModel().rows.length : table.getState().pagination.pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value));
            }}
            className="page-size-select"
          >
            {[10, 25, 50, 100].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
            <option value={table.getFilteredRowModel().rows.length}>
              All ({table.getFilteredRowModel().rows.length})
            </option>
          </select>
          <span>entries</span>
        </div>
        
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            ⏮️ First
          </button>
          <button
            className="pagination-btn"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            ⬅️ Previous
          </button>
          
          <span className="page-info">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          
          <button
            className="pagination-btn"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next ➡️
          </button>
          <button
            className="pagination-btn"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            Last ⏭️
          </button>
        </div>
      </div>
    </div>
  );
};

// Participant Detail Card Component
const ParticipantDetailCard = ({ participant, calculateChange, stationMetrics, onClose, yearFrom, yearTo }) => {
  return (
    <div className="participant-detail-overlay" onClick={onClose}>
      <div className="participant-detail-card" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div className="participant-info-card">
            <h2>{participant.name}</h2>
            <p className="participant-details">
              <span className="detail-item">📅 {participant.dob}</span>
              <span className="detail-item">👤 {participant.gender}</span>
              <span className="detail-item">📍 {participant.location}</span>
              <span className="detail-item">📞 {participant.phone_number}</span>
            </p>
          </div>
          <button className="close-card-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="card-content">
          <h3>Fitness Performance Analysis</h3>
          <div className="metrics-card-grid">
            {stationMetrics.map(station => {
              const dataFrom = participant[yearFrom] || {};
              const dataTo = participant[yearTo] || {};
              const valueFrom = dataFrom[station.key] || '-';
              const valueTo = dataTo[station.key] || '-';
              const change = calculateChange(valueFrom, valueTo, station.isHigherBetter);
              const hasComparison = valueFrom !== '-' && valueTo !== '-';

              return (
                <div key={station.key} className="metric-card">
                  <div className="metric-card-header">
                    <h4>{station.name}</h4>
                  </div>
                  <div className="metric-card-body">
                    <div className="year-values">
                      <div className="year-value">
                        <span className="year-label">{yearFrom}</span>
                        <span className="value">{valueFrom}{station.unit}</span>
                      </div>
                      <div className="year-value">
                        <span className="year-label">{yearTo}</span>
                        <span className="value">{valueTo}{station.unit}</span>
                      </div>
                    </div>
                    {hasComparison && (
                      <div className="change-info">
                        <div className={`change-amount ${change.trend}`}>
                          {change.value > 0 ? '+' : ''}{change.value}{station.unit}
                        </div>
                        <div className={`change-percentage ${change.trend}`}>
                          ({change.percentage}%)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

class FitnessSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fftData: [],
      loading: false,
      searchTerm: '',
      sortBy: 'name',
      sortOrder: 'asc',
      currentPage: 1,
      itemsPerPage: 10,
      filterType: 'all',
      selectedParticipants: [],
      selectedParticipantForDetail: null,
      yearFrom: '',
      yearTo: '',
      availableYears: []
    };
  }

  componentDidMount() {
    this.fetchFitnessData();
  }

  fetchFitnessData = async () => {
    this.setState({ loading: true });
    
    try {
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fitness`,
        { purpose: "retrieve" }
      );
      if (response.data.success) {
        console.log("Fitness Report Data:", response.data.data);
        
        // Extract available years from the main keys of participant data
        const years = new Set();
        response.data.data.forEach(participant => {
          Object.keys(participant).forEach(key => {
            // Only look at main keys that are 4-digit years, excluding other fields like 'name', 'dob', etc.
            if (!isNaN(key) && key.length === 4 && parseInt(key) >= 1900 && parseInt(key) <= 2100) {
              years.add(key);
            }
          });
        });
        
        const sortedYears = Array.from(years).sort();
        console.log("Available years found:", sortedYears);
        
        this.setState({ 
          fftData: response.data.data,
          availableYears: sortedYears
        });
      } else {
        console.error('Error fetching fitness data:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching fitness data:', error);
    } finally {
      this.setState({ loading: false });
      
      // Call parent callback to close popup when data loading is complete
      if (this.props.onDataLoaded) {
        this.props.onDataLoaded();
      }
    }
  }

  calculateChange = (oldValue, newValue, isHigherBetter = false) => {
    if (!oldValue || !newValue || oldValue === '-' || newValue === '-') {
      return { value: '-', trend: 'neutral', icon: '➖' };
    }
    
    const old = parseFloat(oldValue);
    const newVal = parseFloat(newValue);
    
    if (isNaN(old) || isNaN(newVal)) {
      return { value: '-', trend: 'neutral', icon: '➖' };
    }
    
    const change = newVal - old;
    const percentage = ((change / old) * 100);
    
    let trend = 'neutral';
    let icon = '➖';
    
    if (change > 0) {
      trend = isHigherBetter ? 'improved' : 'declined';
      icon = isHigherBetter ? '📈' : '📉';
    } else if (change < 0) {
      trend = isHigherBetter ? 'declined' : 'improved';
      icon = isHigherBetter ? '📉' : '📈';
    }
    
    return { 
      value: change.toFixed(2), 
      percentage: percentage.toFixed(1),
      trend,
      icon
    };
  }

  getFilteredData = () => {
    return [...this.state.fftData];
  }

  handleSelectionChange = (selectedData) => {
    this.setState({ selectedParticipants: selectedData });
  }

  handleRowClick = (participant) => {
    this.setState({ selectedParticipantForDetail: participant });
  }

  handleCloseDetailCard = () => {
    this.setState({ selectedParticipantForDetail: null });
  }

  handleYearFromChange = (event) => {
    this.setState({ yearFrom: event.target.value });
  }

  handleYearToChange = (event) => {
    this.setState({ yearTo: event.target.value });
  }

  // Enhanced table component using React Table
  renderAdvancedTable = () => {
    const stationMetrics = [
      { key: 'grip', name: 'Grip Strength', isHigherBetter: true, unit: '' },
      { key: 'march', name: '2-Min March', isHigherBetter: true, unit: '' },
      { key: 'arm_curl', name: 'Arm Curl', isHigherBetter: true, unit: '' },
      { key: 'sit_reach', name: 'Sit & Reach', isHigherBetter: true, unit: 'cm' },
      { key: 'back_stretch', name: 'Back Stretch', isHigherBetter: true, unit: 'cm' },
      { key: 'speed_walk', name: 'Speed Walk', isHigherBetter: false, unit: 's' },
      { key: 'squat', name: '30s Squat', isHigherBetter: true, unit: '' }
    ];

    return (
      <>
        <AdvancedFitnessTable 
          data={this.state.fftData} 
          calculateChange={this.calculateChange}
          getStationStats={this.getStationStats}
          onSelectionChange={this.handleSelectionChange}
          onRowClick={this.handleRowClick}
          yearFrom={this.state.yearFrom}
          yearTo={this.state.yearTo}
        />
        {this.state.selectedParticipantForDetail && (
          <ParticipantDetailCard
            participant={this.state.selectedParticipantForDetail}
            calculateChange={this.calculateChange}
            stationMetrics={stationMetrics}
            onClose={this.handleCloseDetailCard}
            yearFrom={this.state.yearFrom}
            yearTo={this.state.yearTo}
          />
        )}
      </>
    );
  }

  handleSort = (column) => {
    const isAsc = this.state.sortBy === column && this.state.sortOrder === 'asc';
    this.setState({
      sortBy: column,
      sortOrder: isAsc ? 'desc' : 'asc'
    });
  }

  getStationStats = (metricKey, isHigherBetter = true) => {
    const participants = this.state.fftData;
    const { yearFrom, yearTo } = this.state;
    let improved = 0;
    let declined = 0;
    let noChange = 0;
    let totalWithData = 0;

    participants.forEach(participant => {
      const dataFrom = participant[yearFrom] || {};
      const dataTo = participant[yearTo] || {};
      const valueFrom = dataFrom[metricKey];
      const valueTo = dataTo[metricKey];

      if (valueFrom && valueTo && valueFrom !== '-' && valueTo !== '-') {
        totalWithData++;
        const change = this.calculateChange(valueFrom, valueTo, isHigherBetter);
        
        if (change.trend === 'improved') {
          improved++;
        } else if (change.trend === 'declined') {
          declined++;
        } else {
          noChange++;
        }
      }
    });

    return { improved, declined, noChange, totalWithData };
  }

  render() {
    const { loading, yearFrom, yearTo, availableYears } = this.state;
    const filteredData = this.getFilteredData();
    const totalCount = filteredData.length;
    const bothYearsSelected = yearFrom && yearTo && yearFrom !== yearTo;
    
    return (
      <>
        <div className="report-header">
          <h1 className="report-title">FFT Fitness Results</h1>
        </div>
        
        {/* Payment Report Style Controls */}
        <div className="report-controls">
          <div className="date-range-selector">
            <div className="date-input-group">
              <label htmlFor="yearFrom">From</label>
              <select 
                id="yearFrom"
                value={yearFrom} 
                onChange={this.handleYearFromChange}
                className="date-select"
              >
                <option value="">Select Year</option>
                {availableYears.map(year => (
                  <option key={year} value={year} disabled={year === yearTo}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="date-input-group">
              <label htmlFor="yearTo">To</label>
              <select 
                id="yearTo"
                value={yearTo} 
                onChange={this.handleYearToChange}
                className="date-select"
              >
                <option value="">Select Year</option>
                {availableYears.map(year => (
                  <option key={year} value={year} disabled={year === yearFrom}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {bothYearsSelected && (
          <div className="report-content">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading fitness data...</p>
              </div>
            ) : totalCount === 0 ? (
              <div className="empty-state">
                <h3>📭 No participants found</h3>
                <p>No fitness data available for {yearFrom} vs {yearTo}</p>
              </div>
            ) : (
              this.renderAdvancedTable()
            )}
          </div>
        )}
      </>
    );
  }
}

export default FitnessSection;
