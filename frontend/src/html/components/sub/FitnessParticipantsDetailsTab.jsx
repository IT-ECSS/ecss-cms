import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import '../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme

// CSS to remove borders from AG-Grid
const GRID_STYLES = `
  .fft-entries-table-wrapper .ag-root {
    border: none;
  }
  .fft-entries-table-wrapper .ag-header-cell {
    border-right: none;
    border-bottom: none;
  }
  .fft-entries-table-wrapper .ag-cell {
    border-right: none;
    border-bottom: none;
  }
  .fft-entries-table-wrapper .ag-row {
    border-bottom: none;
  }
  .fft-entries-table-wrapper .ag-header {
    border-bottom: none;
  }
  .fft-entries-table-wrapper .ag-pinned-left-cols-container .ag-cell {
    border-right: 1px solid #e0e0e0;
  }
`;

const FITNESS_METRICS = [
  { key: '30 secs Sit & Stand', label: '30 Secs Sit & Stand', higherIsBetter: true },
  { key: '30 secs Arm Banding', label: '30 Secs Arm Banding', higherIsBetter: true },
  { key: '2 min On-the-spot Marching', label: '2 Min On-The-Spot Marching', higherIsBetter: true },
  { key: 'Sit & Reach', label: 'Sit & Reach', higherIsBetter: true },
  { key: 'Back Stretching', label: 'Back Stretching', higherIsBetter: true },
  { key: '2.44m Speed Walk', label: '2.44m Speed Walk', higherIsBetter: false },
  { key: 'Grip test', label: 'Grip Test', higherIsBetter: true }
];

const filterRowsBySearchTerm = (rowData, searchTerm) => {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return rowData;

  return rowData.filter(row => {
    const allValues = Object.values(row)
      .filter(v => v !== null && v !== undefined)
      .map(v => String(v))
      .join(' ')
      .toLowerCase();
    return allValues.includes(query);
  });
};

const COLUMN_WIDTHS = {
  'S/N': 60,
  'Name': 150,
  'Date of Birth': 120,
  'Phone Number': 130,
  'Gender': 80,
  'Age': 80,
  'Height': 90,
  'Weight': 90,
  'BMI': 90,
  '30 secs Sit & Stand': 140,
  '30 secs Arm Banding': 140,
  '2 min On-the-spot Marching': 160,
  'Sit & Reach': 120,
  'Back Stretching': 130,
  '2.44m Speed Walk': 130,
  'Grip test': 100,
  'Improvements': 150,
  'Remarks': 150
};

const buildColumnDefinitions = (data) => {
  if (!data || data.length === 0) return [];
  const allColumns = Object.keys(data[0]);
  
  // Filter out columns that should be compressed or hidden
  const filteredColumns = allColumns
    .filter(col => !['Chinese Name', 'year', 'location', 'S/N', 'Date of test', 'DD', 'MM', 'YYYY'].includes(col));
  
  // Create S/N column (row number)
  const snColumn = {
    headerName: 'S/N',
    field: 'S/N',
    sortable: false,
    filter: false,
    resizable: true,
    width: COLUMN_WIDTHS['S/N'],
    valueGetter: (params) => {
      return params.rowIndex + 1;
    }
  };
  
  // Add Date of Birth column at the appropriate position
  const nameIndex = filteredColumns.indexOf('Name');
  const dateOfBirthColumn = {
    headerName: 'Date of Birth',
    field: 'Date of Birth',
    sortable: true,
    filter: false,
    resizable: true,
    width: COLUMN_WIDTHS['Date of Birth'],
    valueGetter: (params) => {
      const dd = params.data['DD'];
      const mm = params.data['MM'];
      const yyyy = params.data['YYYY'];
      if (dd && mm && yyyy) {
        return `${dd}/${mm}/${yyyy}`;
      }
      return '';
    }
  };
  
  // Create column definitions with widths
  const columnDefs = [snColumn]; // Start with S/N column
  
  filteredColumns.forEach((col, idx) => {
    const colDef = {
      headerName: col,
      field: col,
      sortable: true,
      filter: false,
      resizable: true,
      width: COLUMN_WIDTHS[col],
      valueGetter: (params) => {
        const value = params.data[col];
        if (col === '2.44m Speed Walk') {
          console.log(`2.44m Speed Walk value for ${params.data.Name}:`, value);
        }
        return value;
      }
    };
    
    // Insert Date of Birth column after Name
    if (col === 'Name') {
      columnDefs.push(colDef);
      columnDefs.push(dateOfBirthColumn);
    } else {
      columnDefs.push(colDef);
    }
  });
  
  // Log column widths for debugging
  console.log('Column Widths:', columnDefs.map(c => ({ headerName: c.headerName, width: c.width })));
  
  return columnDefs;
};

const getRowStyleForEntries = (params) => {
  if (params.data.Gender === 'M') {
    return { background: '#1976d2', color: 'white' };
  }
  if (params.data.Gender === 'F') {
    return { background: '#c2185b', color: 'white' };
  }
  return {};
};

class EntriesTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      quickFilterText: ''
    };
    this.gridRef = React.createRef();
  }

  componentDidMount() {
    // Inject border-removing styles
    const styleId = 'fft-grid-no-borders-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = GRID_STYLES;
      document.head.appendChild(style);
    }
  }

  handleOnFilterTextChange = (e) => {
    this.setState({ quickFilterText: e.target.value });
  }

  handleOnRowClicked = (event) => {
    const { onRowClick } = this.props;
    if (onRowClick) onRowClick(event.data);
  }

  getRowData = () => {
    const { data } = this.props;
    return data || [];
  }

  getFilteredRowData = () => {
    const { quickFilterText } = this.state;
    const rowData = this.getRowData();
    return filterRowsBySearchTerm(rowData, quickFilterText);
  }

  render() {
    const { data } = this.props;
    const { quickFilterText } = this.state;

    const filteredRowData = this.getFilteredRowData();
    console.log('Filtered row data:', filteredRowData);
    const columnDefs = buildColumnDefinitions(data);

    const defaultColDef = {
      sortable: true,
      filter: false,
      resizable: true,
    };

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
        <div className="fft-entries-search-bar">
          <div className="fft-entries-search-row">
            <div className="fft-entries-search-icon">
              <i className="fas fa-search"></i>
            </div>
            <input
              className="fft-entries-search-input"
              type="text"
              value={quickFilterText}
              onChange={this.handleOnFilterTextChange}
              placeholder="Search entries..."
            />
          </div>
        </div>

        <div className="grid-container">
            <AgGridReact
            ref={this.gridRef}
            rowData={filteredRowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            domLayout="normal"
            pagination={true}
            paginationPageSize={filteredRowData.length}
            getRowStyle={getRowStyleForEntries}
            onRowClicked={this.handleOnRowClicked}
            rowSelection="single"
            animateRows={true}
            suppressCellFocus={true}
            />
        </div>
      </div>
    );
  }
}

class FitnessParticipantsDetailsTab extends Component {
  render() {
    const { data = [], onRowClick } = this.props;

    return (
      <div className="fft-participants-subtab-block">
        <div className="fft-participants-subtab-content">
          {data.length === 0 ? (
            <div className="fft-participants-empty">
              <i className="fas fa-users fft-participants-empty-icon"></i>
              <p>No participants found for the selected filters</p>
            </div>
          ) : (
            <EntriesTable 
              data={data}
              onRowClick={onRowClick}
            />
          )}
        </div>
      </div>
    );
  }
}

export default FitnessParticipantsDetailsTab;
