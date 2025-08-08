import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import "../../../css/sub/attendance.css";
import "../../../css/homePage.css";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

class AttendancePivotView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      gridKey: 0
    };
    this.gridApi = null;
  }

  componentDidMount() {
    this.updateGrid();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.filteredData !== this.props.filteredData || 
        prevProps.selectedLocation !== this.props.selectedLocation) {
      this.updateGrid();
    }
  }

  updateGrid = () => {
    this.setState(prevState => ({
      gridKey: prevState.gridKey + 1
    }));
  };

  onGridReady = (params) => {
    this.gridApi = params.api;
    params.api.sizeColumnsToFit();
  };

  getRowData = () => {
    const { filteredData } = this.props;
    if (!filteredData || filteredData.length === 0) return [];

    return filteredData.map(record => ({
      location: this.getLocationFromClassId(record.qrCode),
      date: record.date || '',
      class_id: record.qrCode || '',
      name: record.name || '',
      time: record.time || '',
      count: 1
    }));
  };

  getLocationFromClassId = (classId) => {
    if (!classId) return 'Unknown';
    
    const locationCode = classId.split(/[-_|\/\\]/)[0].trim().toUpperCase();
    
    const locationMap = {
      'CTH': 'CT Hub',
      '253': 'Tampines 253',
      'TNC': 'Tampines North Community Centre',
      'PRW': 'Pasir Ris West Wellness Centre',
    };
    
    return locationMap[locationCode] || locationCode;
  };

  getColumnDefs = () => [
    { 
      headerName: 'Location', 
      field: 'location', 
      rowGroup: true,
      hide: true,
      width: 200,
      sortable: true
    },
    { 
      headerName: 'Date', 
      field: 'date', 
      rowGroup: true,
      hide: true,
      width: 120,
      sortable: true
    },
    { 
      headerName: 'Class ID', 
      field: 'class_id', 
      rowGroup: true,
      hide: true,
      width: 200,
      sortable: true
    },
    { 
      headerName: 'Name', 
      field: 'name', 
      width: 200,
      sortable: true
    },
    { 
      headerName: 'Time', 
      field: 'time', 
      width: 100,
      sortable: true
    },
    { 
      headerName: 'Count', 
      field: 'count', 
      aggFunc: 'sum',
      width: 100
    }
  ];

  render() {
    const { filteredData } = this.props;
    
    if (!filteredData || filteredData.length === 0) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#888',
          fontSize: '16px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div>No attendance data available</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            Please select a date range and location to view the pivot analysis
          </div>
        </div>
      );
    }

    return (
      <div style={{ 
        width: '100%', 
        height: '600px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '12px', 
          background: '#f8f9fa', 
          borderBottom: '1px solid #ddd',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          📊 Attendance Pivot Analysis - {filteredData.length} records
        </div>
        
        <div className="ag-theme-alpine" style={{ height: 'calc(100% - 45px)', width: '100%' }}>
          <AgGridReact
            key={this.state.gridKey}
            columnDefs={this.getColumnDefs()}
            rowData={this.getRowData()}
            autoGroupColumnDef={{
              headerName: 'Group',
              minWidth: 300,
              cellRendererParams: {
                suppressCount: false,
              },
            }}
            groupDefaultExpanded={1}
            animateRows={true}
            onGridReady={this.onGridReady}
            suppressAggFuncInHeader={true}
            suppressMenuHide={true}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true
            }}
          />
        </div>
      </div>
    );
  }
}

export default AttendancePivotView;
