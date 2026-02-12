import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import * as XLSX from 'xlsx';
import "../../../css/sub/auditLogs.css";
import "../../../css/homePage.css";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const baseURL = window.location.hostname === "localhost" 
  ? "http://localhost:3001" 
  : "https://ecss-backend-node.azurewebsites.net";

class AuditLogsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      auditLogsData: [],
      loading: true,
      error: null,
      columnDefs: this.getColumnDefs(),
      originalData: [],
      rowData: [],
      filterUser: 'All Users',
      filterModule: 'All Modules',
      filterSection: 'All Sections',
      filterActionType: 'All Action Types',
      users: [],
      modules: [],
      sections: [],
      actionTypes: [],
      // Date and time range filters
      filterStartDate: '',
      filterEndDate: '',
      filterStartTime: '',
      filterEndTime: '',
      // Custom dropdown states
      openDropdown: null,
      searchUser: '',
      searchModule: '',
      searchSection: '',
      searchActionType: ''
    };
    this.dropdownRefs = {
      user: React.createRef(),
      module: React.createRef(),
      section: React.createRef(),
      actionType: React.createRef()
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    this.initializeData();
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  handleClickOutside = (event) => {
    const { openDropdown } = this.state;
    if (openDropdown && this.dropdownRefs[openDropdown]?.current && 
        !this.dropdownRefs[openDropdown].current.contains(event.target)) {
      this.setState({ openDropdown: null });
    }
  };

  toggleDropdown = (dropdownName) => {
    this.setState(prevState => ({
      openDropdown: prevState.openDropdown === dropdownName ? null : dropdownName
    }));
  };

  handleSearchChange = (searchField, value) => {
    this.setState({ [searchField]: value });
  };

  selectOption = (filterType, searchField, value, defaultValue) => {
    this.setState({
      [filterType]: value || defaultValue,
      [searchField]: '',
      openDropdown: null
    }, () => {
      this.filterAuditLogsData();
    });
  };

  renderCustomDropdown = (label, filterType, searchField, options, defaultValue, dropdownKey, showArrow = true) => {
    const { openDropdown } = this.state;
    const filterValue = this.state[filterType];
    const searchValue = this.state[searchField];
    const isOpen = openDropdown === dropdownKey;

    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes(searchValue.toLowerCase())
    );

    return (
      <div className="searchable-dropdown" ref={this.dropdownRefs[dropdownKey]}>
        <label>{label}:</label>
        <div className="dropdown-container">
          <input
            type="text"
            className={`dropdown-input${!showArrow ? ' no-arrow' : ''}`}
            value={isOpen ? searchValue : (filterValue === defaultValue ? '' : filterValue)}
            placeholder={defaultValue}
            onChange={(e) => this.handleSearchChange(searchField, e.target.value)}
            onFocus={() => this.setState({ openDropdown: dropdownKey })}
          />
          {showArrow && <span className="dropdown-arrow" onClick={() => this.toggleDropdown(dropdownKey)}>▼</span>}
          {isOpen && (
            <ul className="dropdown-list">
              {defaultValue.toLowerCase().includes(searchValue.toLowerCase()) && (
                <li
                  className={filterValue === defaultValue ? 'selected' : ''}
                  onClick={() => this.selectOption(filterType, searchField, '', defaultValue)}
                >
                  {defaultValue}
                </li>
              )}
              {filteredOptions.map(option => (
                <li
                  key={option}
                  className={filterValue === option ? 'selected' : ''}
                  onClick={() => this.selectOption(filterType, searchField, option, defaultValue)}
                >
                  {option}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  // Define column definitions for the audit logs table
  getColumnDefs = () => {
    console.log('Generating column definitions for audit logs data');
    return [
      {
        headerName: "S/N",
        field: "sn",
        width: 100,
        sortable: true,
        pinned: 'left'
      },
      {
        headerName: "Date",
        field: "timestamp",
        width: 200,
        sortable: true,
        pinned: 'left',
        valueFormatter: (params) => {
          if (params.value) {
            return new Date(params.value).toLocaleDateString('en-SG', {
              timeZone: 'Asia/Singapore',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
          return '';
        }
      },
      {
        headerName: "Time",
        field: "timestamp",
        width: 150,
        sortable: true,
        pinned: 'left',
        valueFormatter: (params) => {
          if (params.value) {
            return new Date(params.value).toLocaleTimeString('en-SG', {
              timeZone: 'Asia/Singapore',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
          }
          return '';
        }
      },
      {
        headerName: "User",
        field: "userName",
        width: 200,
        sortable: true,
        pinned: 'left'
      },
      {
        headerName: "Action Type",
        field: "actionType",
        width: 250,
        sortable: true
      },
      {
        headerName: "Module",
        field: "module",
        width: 400,
        sortable: true
      },
      {
        headerName: "Section",
        field: "section",
        width: 450,
        sortable: true
      },
      {
        headerName: "Description",
        field: "description",
        width: 1000,
        sortable: true,
        wrapText: true,
        autoHeight: true
      }
    ];
  };

  // Extract unique filter options from data
  extractFilterOptions = (data) => {
    const users = [...new Set(data.map(item => item.userName).filter(Boolean))].sort();
    const modules = [...new Set(data.map(item => item.module).filter(Boolean))].sort();
    const sections = [...new Set(data.map(item => item.section).filter(Boolean))].sort();
    const actionTypes = [...new Set(data.map(item => item.actionType).filter(Boolean))].sort();
    
    return { users, modules, sections, actionTypes };
  };

  async initializeData() {
    this.setState({ columnDefs: this.getColumnDefs() });
    await this.fetchAuditLogsData();
    if (this.props.closePopup1) {
      this.props.closePopup1();
    }

    // --- Live update via Socket.IO ---
    this.socket = io(
      window.location.hostname === "localhost"
        ? "http://localhost:3001"
        : "https://ecss-backend-node.azurewebsites.net"
    );
    this.socket.on('auditLog', (data) => {
      console.log("Audit log socket event received", data);
      this.fetchAuditLogsData();
    });
  }

  componentDidUpdate(prevProps) {
    // Filter when searchQuery props change
    if (prevProps.searchQuery !== this.props.searchQuery) {
      this.filterAuditLogsData();
      if (this.props.closePopup1) {
        this.props.closePopup1();
      }
    }
  }

  // Filter audit logs data based on selected filters
  filterAuditLogsData = () => {
    const { filterUser, filterModule, filterSection, filterActionType, filterStartDate, filterEndDate, filterStartTime, filterEndTime } = this.state;
    const { searchQuery } = this.props;
    const { auditLogsData } = this.state;

    console.log('Filtering audit logs data with:', { filterUser, filterModule, filterSection, filterActionType, filterStartDate, filterEndDate, filterStartTime, filterEndTime, searchQuery });

    let filteredData = [...auditLogsData];

    // Filter by date range (DD/MM/YYYY format)
    if (filterStartDate || filterEndDate) {
      const parseDate = (val) => {
        const parts = val.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return null;
      };

      if (filterStartDate && filterEndDate) {
        // Range: show records between start and end date
        const startISO = parseDate(filterStartDate);
        const endISO = parseDate(filterEndDate);
        if (startISO && endISO) {
          filteredData = filteredData.filter(record => {
            if (!record.timestamp) return false;
            const recordDate = new Date(record.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
            return recordDate >= startISO && recordDate <= endISO;
          });
        }
      } else {
        // Single value: show records matching that date prefix (e.g. "11/02" matches "11/02/2026")
        const singleDate = filterStartDate || filterEndDate;
        const fullParsed = parseDate(singleDate);
        if (fullParsed) {
          // Full DD/MM/YYYY — exact match
          filteredData = filteredData.filter(record => {
            if (!record.timestamp) return false;
            const recordDate = new Date(record.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
            return recordDate === fullParsed;
          });
        } else {
          // Partial input — prefix match on displayed date (DD/MM/YYYY)
          filteredData = filteredData.filter(record => {
            if (!record.timestamp) return false;
            const recordDate = new Date(record.timestamp).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' });
            return recordDate.startsWith(singleDate);
          });
        }
      }
    }

    // Filter by time range (HH:MM:SS format)
    if (filterStartTime || filterEndTime) {
      if (filterStartTime && filterEndTime) {
        // Range: show records between start and end time
        filteredData = filteredData.filter(record => {
          if (!record.timestamp) return false;
          const recordTime = new Date(record.timestamp).toLocaleTimeString('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          return recordTime >= filterStartTime && recordTime <= filterEndTime;
        });
      } else {
        // Single value: show records matching that time prefix (e.g. "06:30" matches "06:30:xx")
        const singleTime = filterStartTime || filterEndTime;
        filteredData = filteredData.filter(record => {
          if (!record.timestamp) return false;
          const recordTime = new Date(record.timestamp).toLocaleTimeString('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          return recordTime.startsWith(singleTime);
        });
      }
    }

    // Filter by user
    if (filterUser && filterUser !== 'All Users') {
      filteredData = filteredData.filter(record =>
        record.userName && record.userName.toLowerCase() === filterUser.toLowerCase()
      );
    }

    // Filter by module
    if (filterModule && filterModule !== 'All Modules') {
      filteredData = filteredData.filter(record =>
        record.module && record.module.toLowerCase() === filterModule.toLowerCase()
      );
    }

    // Filter by section
    if (filterSection && filterSection !== 'All Sections') {
      filteredData = filteredData.filter(record =>
        record.section && record.section.toLowerCase() === filterSection.toLowerCase()
      );
    }

    // Filter by action type
    if (filterActionType && filterActionType !== 'All Action Types') {
      filteredData = filteredData.filter(record =>
        record.actionType && record.actionType.toLowerCase() === filterActionType.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredData = filteredData.filter(record => {
        return (
          (record.userName && record.userName.toLowerCase().includes(query)) ||
          (record.module && record.module.toLowerCase().includes(query)) ||
          (record.section && record.section.toLowerCase().includes(query)) ||
          (record.actionType && record.actionType.toLowerCase().includes(query)) ||
          (record.description && record.description.toLowerCase().includes(query))
        );
      });
    }

    // Reassign S/N numbers for filtered data
    const filteredDataWithCorrectSN = filteredData.map((item, index) => ({
      ...item,
      sn: index + 1
    }));

    this.setState({ rowData: filteredDataWithCorrectSN });
  };
  
  fetchAuditLogsData = async () => {
    try {
      this.setState({ loading: true });

      const response = await axios.post(`${baseURL}/logs`, {
        purpose: "retrieve"
      });

      let processedData = [];
      if (response.data && response.data.data) {
        processedData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        processedData = response.data;
      }

      // Sort by timestamp ascending (oldest first - chronological order)
      processedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const dataWithSN = processedData.map((item, index) => ({
        ...item,
        sn: index + 1
      }));

      const { users, modules, sections, actionTypes } = this.extractFilterOptions(dataWithSN);

      this.setState({
        auditLogsData: dataWithSN,
        rowData: dataWithSN,
        originalData: dataWithSN,
        loading: false,
        users,
        modules,
        sections,
        actionTypes
      });

    } catch (error) {
      console.error('Error fetching audit logs data:', error);
      this.setState({
        error: 'Failed to load audit logs data. Please try again later.',
        loading: false
      });
    }
  }

  handleFilterChange = (filterType, value) => {
    this.setState({ [filterType]: value }, () => {
      this.filterAuditLogsData();
    });
  };

  refreshAuditLogsData = async () => {
    this.setState({ loading: true });
    await this.fetchAuditLogsData();
    
    // Reset filters
    this.setState({
      filterUser: 'All Users',
      filterModule: 'All Modules',
      filterSection: 'All Sections',
      filterActionType: 'All Action Types',
      filterStartDate: '',
      filterEndDate: '',
      filterStartTime: '',
      filterEndTime: ''
    }, () => {
      if (this.props.closePopup1) {
        this.props.closePopup1();
      }
    });
  };

  exportToExcel = () => {
    const { rowData } = this.state;
    
    // Prepare data for export
    const exportData = rowData.map(item => ({
      'S/N': item.sn,
      'Date': item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-SG', {
        timeZone: 'Asia/Singapore',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }) : '',
      'Time': item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-SG', {
        timeZone: 'Asia/Singapore',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) : '',
      'User': item.userName || '',
      'Action Type': item.actionType || '',
      'Module': item.module || '',
      'Section': item.section || '',
      'Description': item.description || ''
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },   // S/N
      { wch: 12 },  // Date
      { wch: 10 },  // Time
      { wch: 20 },  // User
      { wch: 20 },  // Action Type
      { wch: 30 },  // Module
      { wch: 30 },  // Section
      { wch: 80 }   // Description
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `Audit_Logs_${timestamp}.xlsx`;

    // Export file
    XLSX.writeFile(wb, filename);
  };

  render() {
    const { loading, error, columnDefs, rowData, filterUser, filterModule, filterSection, filterActionType, users, modules, sections, actionTypes } = this.state;

    return (
      <>
        <div className="audit-logs-heading">
          <h1>{this.props.language === 'zh' ? '审计日志' : 'Audit Logs'}</h1>
          
          {/* Filter Row */}
          <div className="audit-logs-filters">
            <div className="filter-row">
              {this.renderCustomDropdown('User', 'filterUser', 'searchUser', users, 'All Users', 'user', false)}
              {this.renderCustomDropdown('Module', 'filterModule', 'searchModule', modules, 'All Modules', 'module', false)}
              {this.renderCustomDropdown('Section', 'filterSection', 'searchSection', sections, 'All Sections', 'section', false)}
              {this.renderCustomDropdown('Action Type', 'filterActionType', 'searchActionType', actionTypes, 'All Action Types', 'actionType', false)}
            </div>

            <div className="filter-row">
              <div className="date-time-filter">
                <label>Date Range:</label>
                <div className="range-inputs">
                  <input
                    type="text"
                    className="filter-date-input"
                    placeholder="DD/MM/YYYY"
                    value={this.state.filterStartDate}
                    onChange={(e) => this.setState({ filterStartDate: e.target.value }, () => this.filterAuditLogsData())}
                  />
                  <span className="range-separator">to</span>
                  <input
                    type="text"
                    className="filter-date-input"
                    placeholder="DD/MM/YYYY"
                    value={this.state.filterEndDate}
                    onChange={(e) => this.setState({ filterEndDate: e.target.value }, () => this.filterAuditLogsData())}
                  />
                </div>
              </div>

              <div className="date-time-filter">
                <label>Time Range:</label>
                <div className="range-inputs">
                  <input
                    type="text"
                    className="filter-time-input"
                    placeholder="HH:MM:SS"
                    value={this.state.filterStartTime}
                    onChange={(e) => this.setState({ filterStartTime: e.target.value }, () => this.filterAuditLogsData())}
                  />
                  <span className="range-separator">to</span>
                  <input
                    type="text"
                    className="filter-time-input"
                    placeholder="HH:MM:SS"
                    value={this.state.filterEndTime}
                    onChange={(e) => this.setState({ filterEndTime: e.target.value }, () => this.filterAuditLogsData())}
                  />
                </div>
              </div>

              <button className="archive-btn" onClick={this.exportToExcel}>
                Archive Audit Logs
              </button>
            </div>
          </div>

          <div className="grid-container1">
            <AgGridReact
              columnDefs={columnDefs}
              rowData={rowData}
              pagination={true}
              paginationPageSize={rowData.length}
              paginationPageSizeSelector={[Math.ceil(rowData.length/4), Math.ceil(rowData.length/2), Math.ceil(rowData.length*3/4), rowData.length]}
              domLayout="normal"
              defaultColDef={{
                resizable: true,
                sortable: true
              }}
              onGridReady={(params) => {
                params.api.sizeColumnsToFit();
              }}
            />
          </div>
        </div>
      </>
    );
  }
}

export default AuditLogsSection;
