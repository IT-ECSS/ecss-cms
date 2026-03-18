import React, { Component, useMemo, useState } from "react";
import axios from 'axios';
import '../../../../../css/sub/FitnessResult/GoogleSheets/fitnessGoogleSheetsSection.css';
import FitnessFilterSection from '../Filter/FitnessFilterSection';
import {
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';

// Functional Table Component for Google Sheets Data
const GoogleSheetsDataTable = ({ data, columns, onRowClick }) => {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  const tableColumns = useMemo(() => {
    if (!columns || columns.length === 0) return [];
    
    return columns.map((col, index) => ({
      accessorKey: `col_${index}`,
      header: col,
      size: 150,
      cell: ({ getValue }) => (
        <span className="fft-gsheets-cell-value">{getValue() || '-'}</span>
      ),
    }));
  }, [columns]);

  const tableData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((row, rowIndex) => {
      const rowObj = { _rowIndex: rowIndex };
      row.forEach((cell, colIndex) => {
        rowObj[`col_${colIndex}`] = cell;
      });
      return rowObj;
    });
  }, [data]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (tableColumns.length === 0) {
    return (
      <div className="fft-gsheets-no-columns">
        <i className="fas fa-table"></i>
        <p>No data columns available</p>
      </div>
    );
  }

  return (
    <div className="fft-gsheets-table-wrapper">
      {/* Search */}
      <div className="fft-gsheets-search-container">
        <i className="fas fa-search fft-gsheets-search-icon"></i>
        <input
          type="text"
          placeholder="Search in records..."
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="fft-gsheets-search-input"
        />
      </div>

      {/* Table */}
      <div className="fft-gsheets-table-scroll">
        <table className="fft-gsheets-table">
          <thead className="fft-gsheets-thead">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="fft-gsheets-header-row">
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id} 
                    className={`fft-gsheets-header-cell ${header.column.getCanSort() ? 'fft-gsheets-sortable' : ''}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="fft-gsheets-header-content">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="fft-gsheets-sort-indicator">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted()] ?? ''}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="fft-gsheets-tbody">
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id} 
                className="fft-gsheets-data-row"
                onClick={() => onRowClick && onRowClick(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="fft-gsheets-data-cell">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="fft-gsheets-pagination">
        <div className="fft-gsheets-pagination-info">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} records
        </div>

        <div className="fft-gsheets-pagination-size">
          <span>Show:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="fft-gsheets-page-size-select"
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
            <option value={table.getFilteredRowModel().rows.length}>All</option>
          </select>
        </div>

        <div className="fft-gsheets-pagination-controls">
          <button
            className="fft-gsheets-pagination-btn"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            ⏮
          </button>
          <button
            className="fft-gsheets-pagination-btn"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            ◀
          </button>
          <span className="fft-gsheets-page-number">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            className="fft-gsheets-pagination-btn"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            ▶
          </button>
          <button
            className="fft-gsheets-pagination-btn"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
};

// File List Component
const FileListCard = ({ files, selectedFile, onFileSelect, loading }) => {
  if (loading) {
    return (
      <div className="fft-gsheets-files-loading">
        <div className="fft-gsheets-files-spinner"></div>
        <p>Loading files...</p>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="fft-gsheets-files-empty">
        <i className="fas fa-folder-open"></i>
        <p>No spreadsheet files found</p>
      </div>
    );
  }

  return (
    <div className="fft-gsheets-files-list">
      {files.map(file => (
        <div 
          key={file.id}
          className={`fft-gsheets-file-item ${selectedFile?.id === file.id ? 'fft-gsheets-file-selected' : ''}`}
          onClick={() => onFileSelect(file)}
        >
          <i className={`fft-gsheets-file-icon ${
            file.mimeType === 'application/vnd.google-apps.spreadsheet' 
              ? 'fas fa-file-excel' 
              : file.mimeType === 'application/vnd.google-apps.folder'
              ? 'fas fa-folder'
              : 'fas fa-file'
          }`}></i>
          <div className="fft-gsheets-file-info">
            <span className="fft-gsheets-file-name">{file.name}</span>
            <span className="fft-gsheets-file-date">
              {new Date(file.createdTime).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Sheet Tabs Component
const SheetTabs = ({ sheets, activeSheet, onSheetChange }) => {
  if (!sheets || sheets.length === 0) return null;

  return (
    <div className="fft-gsheets-sheet-tabs">
      {sheets.map((sheet, index) => (
        <button
          key={index}
          className={`fft-gsheets-sheet-tab ${activeSheet === sheet ? 'fft-gsheets-sheet-tab-active' : ''}`}
          onClick={() => onSheetChange(sheet)}
        >
          {sheet}
        </button>
      ))}
    </div>
  );
};

// Main Class Component
class FitnessGoogleSheetsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      files: [],
      filesLoading: true,
      selectedFile: null,
      sheets: [],
      activeSheet: '',
      sheetData: [],
      sheetColumns: [],
      dataLoading: false,
      error: null,
      // Filters
      selectedYear: '',
      availableYears: [],
      selectedLocation: '',
      availableLocations: [],
      // Folder configuration
      fftFolderId: ''
    };
  }

  componentDidMount() {
    // Try to load folder ID from localStorage or use default
    const savedFolderId = localStorage.getItem('fftGoogleDriveFolderId') || '';
    this.setState({ fftFolderId: savedFolderId }, () => {
      if (savedFolderId) {
        this.fetchFiles();
      }
    });
  }

  getApiBaseUrl = () => {
    return window.location.hostname === "localhost" 
      ? "http://localhost:3001" 
      : "https://ecss-backend-node.azurewebsites.net";
  }

  fetchFiles = async () => {
    const { fftFolderId } = this.state;
    
    if (!fftFolderId) {
      this.setState({ 
        filesLoading: false,
        error: 'No Google Drive folder ID configured. Please set a folder ID to view spreadsheets.'
      });
      return;
    }
    
    this.setState({ filesLoading: true, error: null });
    
    try {
      const response = await axios.post(
        `${this.getApiBaseUrl()}/googleDrive`,
        { folderId: fftFolderId, purpose: 'listFiles' }
      );
      
      if (response.data.success) {
        // Filter for spreadsheet files only
        const spreadsheetFiles = (response.data.files || []).filter(file => 
          file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
          file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.csv')
        );
        
        // Extract years from file names (e.g., "2024 FFT Results", "FFT 2025")
        const years = new Set();
        spreadsheetFiles.forEach(file => {
          const yearMatch = file.name.match(/\b(20\d{2})\b/);
          if (yearMatch) {
            years.add(yearMatch[1]);
          }
        });
        
        this.setState({ 
          files: spreadsheetFiles,
          availableYears: Array.from(years).sort(),
          filesLoading: false 
        });

        // Auto-select first file
        if (spreadsheetFiles.length > 0) {
          this.handleFileSelect(spreadsheetFiles[0]);
        }
      } else {
        this.setState({ 
          error: response.data.error || 'Failed to fetch files',
          filesLoading: false 
        });
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      this.setState({ 
        error: error.message || 'Failed to connect to server',
        filesLoading: false 
      });
    }
  }

  handleFileSelect = async (file) => {
    this.setState({ 
      selectedFile: file, 
      dataLoading: true,
      sheetData: [],
      sheetColumns: [],
      sheets: [],
      activeSheet: ''
    });

    try {
      const response = await axios.post(
        `${this.getApiBaseUrl()}/googleDrive/readSpreadsheet`,
        { fileId: file.id }
      );
      
      if (response.data.success) {
        const { sheets, data, columns } = response.data;
        
        this.setState({
          sheets: sheets || [],
          activeSheet: sheets && sheets.length > 0 ? sheets[0] : '',
          sheetData: data || [],
          sheetColumns: columns || [],
          dataLoading: false
        });
      } else {
        this.setState({ 
          error: response.data.error || 'Failed to read spreadsheet',
          dataLoading: false 
        });
      }
    } catch (error) {
      console.error('Error reading spreadsheet:', error);
      this.setState({ 
        error: error.message || 'Failed to read spreadsheet',
        dataLoading: false 
      });
    }
  }

  handleSheetChange = async (sheetName) => {
    const { selectedFile } = this.state;
    if (!selectedFile) return;

    this.setState({ activeSheet: sheetName, dataLoading: true });

    try {
      const response = await axios.post(
        `${this.getApiBaseUrl()}/googleDrive/readSpreadsheet`,
        { fileId: selectedFile.id, sheetName }
      );
      
      if (response.data.success) {
        this.setState({
          sheetData: response.data.data || [],
          sheetColumns: response.data.columns || [],
          dataLoading: false
        });
      } else {
        this.setState({ dataLoading: false });
      }
    } catch (error) {
      console.error('Error reading sheet:', error);
      this.setState({ dataLoading: false });
    }
  }

  handleYearChange = (year) => {
    this.setState({ selectedYear: year });
    
    // Filter files by year
    const { files } = this.state;
    if (year) {
      const matchingFile = files.find(f => f.name.includes(year));
      if (matchingFile) {
        this.handleFileSelect(matchingFile);
      }
    }
  }

  handleLocationChange = (location) => {
    this.setState({ selectedLocation: location });
  }

  getFilteredFiles = () => {
    const { files, selectedYear } = this.state;
    
    if (!selectedYear) return files;
    
    return files.filter(file => file.name.includes(selectedYear));
  }

  handleRowClick = (row) => {
    console.log('Row clicked:', row);
    // Could open detail modal
  }

  handleFolderIdChange = (e) => {
    this.setState({ fftFolderId: e.target.value });
  }

  handleSaveFolderId = () => {
    const { fftFolderId } = this.state;
    if (fftFolderId) {
      localStorage.setItem('fftGoogleDriveFolderId', fftFolderId);
      this.fetchFiles();
    }
  }

  render() {
    const { 
      filesLoading, 
      selectedFile, 
      sheets, 
      activeSheet, 
      sheetData, 
      sheetColumns,
      dataLoading, 
      error,
      availableYears,
      availableLocations,
      selectedYear,
      selectedLocation,
      fftFolderId
    } = this.state;

    const filteredFiles = this.getFilteredFiles();

    // Show folder configuration if no folder ID is set
    if (!fftFolderId || error?.includes('No Google Drive folder ID')) {
      return (
        <div className="fft-gsheets-section-wrapper">
          <div className="fft-gsheets-config-container">
            <div className="fft-gsheets-config-card">
              <div className="fft-gsheets-config-icon">
                <i className="fas fa-folder-open"></i>
              </div>
              <h2 className="fft-gsheets-config-title">Configure Google Drive Folder</h2>
              <p className="fft-gsheets-config-description">
                Enter the Google Drive folder ID that contains your FFT spreadsheet files.
                You can find this in the folder URL after /folders/
              </p>
              <div className="fft-gsheets-config-input-group">
                <input
                  type="text"
                  placeholder="Enter Google Drive Folder ID..."
                  value={fftFolderId}
                  onChange={this.handleFolderIdChange}
                  className="fft-gsheets-config-input"
                />
                <button 
                  onClick={this.handleSaveFolderId}
                  className="fft-gsheets-config-btn"
                  disabled={!fftFolderId}
                >
                  <i className="fas fa-save"></i>
                  Save & Load
                </button>
              </div>
              <p className="fft-gsheets-config-hint">
                Example: If your folder URL is https://drive.google.com/drive/folders/1abc123XYZ,
                the folder ID is <code>1abc123XYZ</code>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fft-gsheets-section-wrapper">
        {/* Filter Section */}
        <FitnessFilterSection
          title="Filter Records"
          availableYears={availableYears}
          availableLocations={availableLocations}
          showYearRange={false}
          showSingleYear={true}
          showLocation={false}
          selectedYear={selectedYear}
          selectedLocation={selectedLocation}
          onSingleYearChange={this.handleYearChange}
          onLocationChange={this.handleLocationChange}
        />

        <div className="fft-gsheets-main-content">
          {/* Files Sidebar */}
          <div className="fft-gsheets-sidebar">
            <div className="fft-gsheets-sidebar-header">
              <h3 className="fft-gsheets-sidebar-title">
                <i className="fas fa-file-excel"></i>
                FFT Spreadsheets
              </h3>
              <button 
                className="fft-gsheets-refresh-btn"
                onClick={this.fetchFiles}
                disabled={filesLoading}
              >
                <i className={`fas fa-sync-alt ${filesLoading ? 'fa-spin' : ''}`}></i>
              </button>
            </div>

            <FileListCard
              files={filteredFiles}
              selectedFile={selectedFile}
              onFileSelect={this.handleFileSelect}
              loading={filesLoading}
            />
          </div>

          {/* Data Content Area */}
          <div className="fft-gsheets-content-area">
            {error && (
              <div className="fft-gsheets-error-banner">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
                <button onClick={() => this.setState({ error: null })}>✕</button>
              </div>
            )}

            {selectedFile ? (
              <>
                <div className="fft-gsheets-content-header">
                  <h2 className="fft-gsheets-file-title">
                    <i className="fas fa-table"></i>
                    {selectedFile.name}
                  </h2>
                  <a 
                    href={selectedFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fft-gsheets-open-link"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    Open in Google
                  </a>
                </div>

                {/* Sheet Tabs */}
                <SheetTabs 
                  sheets={sheets}
                  activeSheet={activeSheet}
                  onSheetChange={this.handleSheetChange}
                />

                {/* Data Table */}
                {dataLoading ? (
                  <div className="fft-gsheets-data-loading">
                    <div className="fft-gsheets-data-spinner"></div>
                    <p>Loading spreadsheet data...</p>
                  </div>
                ) : sheetData.length > 0 ? (
                  <GoogleSheetsDataTable
                    data={sheetData}
                    columns={sheetColumns}
                    onRowClick={this.handleRowClick}
                  />
                ) : (
                  <div className="fft-gsheets-no-data">
                    <i className="fas fa-table"></i>
                    <p>No data in this sheet</p>
                  </div>
                )}
              </>
            ) : (
              <div className="fft-gsheets-select-file">
                <i className="fas fa-hand-pointer"></i>
                <h3>Select a Spreadsheet</h3>
                <p>Choose a file from the sidebar to view its contents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default FitnessGoogleSheetsSection;
