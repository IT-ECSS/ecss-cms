import React, { Component } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import '../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme
import '../../../css/fftStaff.css';


ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class UploadStatus extends Component {
  constructor(props) {
    super(props);
    this.state = {
      excelData: [],
      validationResults: {},
      showValidation: false,
      validationComplete: false,
      rowsWithErrors: [], // Track which rows have errors
      sheetCounts: {},   // { sheetName: rowCount } for capacity checks
      existingParticipants: [], // Participants already in the sheet
      existingLoaded: false,    // Whether the existing-participant fetch has completed
    };
  }

  componentDidMount() {
    this.parseExcelFiles();
    // Only fetch if parent hasn't pre-fetched
    if (this.props.event && !this.props.existingLoaded) {
      this.fetchExistingParticipants();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.files !== this.props.files) {
      this.parseExcelFiles();
    }
    if (prevProps.event !== this.props.event && this.props.event && !this.props.existingLoaded) {
      this.fetchExistingParticipants();
    }
  }

  parseExcelFiles = () => {
    const { files } = this.props;
    if (!files || files.length === 0) return;

    // Reset validation state before parsing new file
    this.setState({
      excelData: [],
      validationResults: {},
      showValidation: false,
      validationComplete: false,
      rowsWithErrors: [],
      sheetCounts: {},
    });

    const file = files[0]; // Parse first file
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read ALL sheets so multi-slot uploads are fully processed.
        // Skip rows where all participant-identifying columns are empty
        // (e.g. template rows that only have Start Time / Time End pre-filled).
        const KEY_FIELDS = ['Name', 'Chinese Name', 'Phone Number', 'Gender', 'DD', 'MM', 'YYYY', 'DOB', 'Date of Birth (DD/MM/YYYY)'];
        const allData = [];
        const sheetCounts = {};

        // Helper: normalise a DOB string to DD/MM/YYYY with 4-digit year.
        // XLSX.utils.sheet_to_json with raw:false + dateNF:'dd/mm/yyyy' returns all
        // date-formatted cells as "DD/MM/YYYY" strings — no JS Date objects needed.
        const dobToString = (val) => {
          if (!val) return '';
          const str = String(val).trim();
          // Expand 2-digit year: "06/07/95" → "06/07/1995"
          // Pivot: yy < 30 → 20xx, yy >= 30 → 19xx
          return str.replace(/^(\d{1,2}\/\d{1,2}\/)([0-9]{2})$/, (_, prefix, yy) => {
            const century = parseInt(yy, 10) < 30 ? '20' : '19';
            return prefix + century + yy;
          });
        };

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          // raw:false + dateNF forces Excel date serials to be returned as
          // "DD/MM/YYYY" formatted strings instead of JS Date objects or numbers.
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'dd/mm/yyyy' });
          const validRows = jsonData.filter(row =>
            KEY_FIELDS.some(f => String(row[f] ?? '').trim() !== '')
          );
          // Normalise: split combined DOB column ("DOB" or "Date of Birth (DD/MM/YYYY)") into DD, MM, YYYY
          const normalisedRows = validRows.map(row => {
            const rawDob = row['DOB'] || row['Date of Birth (DD/MM/YYYY)'];
            if (rawDob) {
              const dobStr = dobToString(rawDob);
              const parts = dobStr.split('/');
              return {
                ...row,
                _dobRaw: dobStr,
                DD: parts[0] ? parseInt(parts[0], 10) : '',
                MM: parts[1] ? parseInt(parts[1], 10) : '',
                YYYY: parts[2] ? String(parts[2]).trim() : '',
              };
            }
            return row;
          });
          sheetCounts[sheetName] = normalisedRows.length;
          normalisedRows.forEach(row => allData.push({ ...row, _sheetName: sheetName }));
        }

        this.setState({ excelData: allData, sheetCounts }, () => {
          this.handleValidateAll();
        });
      } catch (error) {
        console.error('Error parsing Excel file:', error);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  fetchExistingParticipants = async () => {
    const { event } = this.props;
    if (!event?.id) return;
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/getParticipants`, {
        fileId: event.id,
      });
      if (res.data && Array.isArray(res.data)) {
        this.setState({ existingParticipants: res.data, existingLoaded: true }, () => this.props.onExistingLoaded?.());
      } else {
        this.setState({ existingLoaded: true }, () => this.props.onExistingLoaded?.());
      }
    } catch (err) {
      console.warn('Could not fetch existing participants for duplicate check:', err.message);
      this.setState({ existingLoaded: true }, () => this.props.onExistingLoaded?.());
    }
  };

  isExistingParticipant = (row) => {
    // Prefer pre-fetched data from parent prop
    const existingParticipants = this.props.existingParticipants ?? this.state.existingParticipants;
    const nameLower   = String(row.Name || '').trim().toLowerCase();
    const phone       = String(row['Phone Number'] || '').trim();
    const genderLower = String(row.Gender || '').trim().toLowerCase();
    const dd   = parseInt(row.DD, 10);
    const mm   = parseInt(row.MM, 10);
    const yyyy = String(row.YYYY || '').trim();

    return existingParticipants.some(existing =>
      String(existing.Name || '').trim().toLowerCase() === nameLower &&
      String(existing['Phone Number'] || '').trim() === phone &&
      String(existing.Gender || '').trim().toLowerCase() === genderLower &&
      parseInt(existing.DD, 10) === dd &&
      parseInt(existing.MM, 10) === mm &&
      String(existing.YYYY || '').trim() === yyyy
    );
  };

  // Returns only rows that are not already registered — used by BulkUpload to skip duplicates
  getNewOnlyData = () => {
    const { excelData } = this.state;
    const existingLoaded = this.props.existingLoaded ?? this.state.existingLoaded;
    if (!existingLoaded) return excelData;
    return excelData.filter(row => !this.isExistingParticipant(row));
  };

  validateRow = (row, rowIndex) => {
    const errors = [];

    // Check for empty cells in required fields (Name, Phone Number, Gender)
    ['Name', 'Phone Number', 'Gender'].forEach((field) => {
      const value = row[field];
      if (value === null || value === undefined || String(value).trim() === '') {
        errors.push(`${field} cannot be empty`);
      }
    });

    // Validate Contact Number: starts with 8 or 9, exactly 8 chars, numeric
    const phoneNumber = row['Phone Number'] || '';
    if (phoneNumber && String(phoneNumber).trim() !== '') {
      const phoneStr = String(phoneNumber).trim();
      console.log(`Validating Contact Number for Participant ${rowIndex + 1}:`, phoneStr.length);
      
      // Check if all characters are numeric
      const isNumeric = /^\d+$/.test(phoneStr);
      if (!isNumeric) {
        errors.push('Contact Number must contain only numeric characters');
      }
      
      // Check if length is exactly 8
      if (phoneStr.length !== 8) {
        errors.push(`Contact Number must be exactly 8 numeric characters`);
      }
      
      // Check if starts with 8 or 9
      if (!/^[89]/.test(phoneStr)) {
        errors.push('Contact Number must start with 8 or 9');
      }
    }

    // Validate Date of Birth (DD/MM/YYYY after normalisation)
    const dd   = parseInt(row?.DD);
    const mm   = parseInt(row?.MM);
    const yyyy = parseInt(row?.YYYY);

    if (!row?.DD && !row?.MM && !row?.YYYY) {
      errors.push('Date of Birth cannot be empty');
    } else {
      if (!dd || dd < 1 || dd > 31) {
        errors.push('Date of Birth: day must be between 1–31');
      }
      if (!mm || mm < 1 || mm > 12) {
        errors.push('Date of Birth: month must be between 1–12');
      }
      if (!yyyy || String(yyyy).length !== 4) {
        errors.push('Date of Birth: year must be exactly 4 digits');
      }
      // Check the date actually exists in the calendar (e.g. rejects 31/04, 29/02 on non-leap years)
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yyyy && String(yyyy).length === 4) {
        const isLeap = (yyyy % 4 === 0 && yyyy % 100 !== 0) || (yyyy % 400 === 0);
        const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mm - 1];
        if (dd > daysInMonth) {
          errors.push(`Date of Birth: ${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${yyyy} is not a valid calendar date`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  };

  handleValidateAll = () => {
    const { excelData } = this.state;
    if (excelData.length === 0) return;

    const newValidationResults = {};
    const newRowsWithErrors = [];

    excelData.forEach((row, index) => {
      const result = this.validateRow(row, index);
      newValidationResults[index] = result;
      if (result.errors.length > 0) newRowsWithErrors.push(index + 1);
    });

    this.setState(
      { validationResults: newValidationResults, rowsWithErrors: newRowsWithErrors, showValidation: true, validationComplete: true },
      () => { if (this.props.onValidationComplete) this.props.onValidationComplete(); }
    );
  };

  getColumnDefs = () => {
    const { excelData } = this.state;
    if (excelData.length === 0) return [];

    const hasMultipleSheets = Object.keys(this.state.sheetCounts).length > 1;

    // Fixed column order: Participant Number | Name | Chinese Name | Contact Number | Gender | Date of Birth | Start Time | End Time | [Slot] | Status
    let columnDefs = [
      {
        field: 'participantNumber',
        headerName: 'Participant Number',
        width: 250,
        valueGetter: (params) => params.node.rowIndex + 1,
        sortable: false,
        filter: false,
        pinned: 'left',
      },
      { field: 'Name',         headerName: 'Name',           width: 250 },
      { field: 'Chinese Name', headerName: 'Chinese Name',   width: 250 },
      { field: 'Phone Number', headerName: 'Contact Number', width: 250 },
      { field: 'Gender',       headerName: 'Gender',         width: 150 },
      {
        field: 'dateOfBirth',
        headerName: 'Date of Birth',
        width: 200,
        valueGetter: (params) => {
          const dd   = params.data?.DD;
          const mm   = params.data?.MM;
          const yyyy = params.data?.YYYY;
          if (dd && mm && yyyy) {
            return `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;
          }
          // Fallback: show the raw value as entered so the user can see what's wrong
          return params.data?._dobRaw || '';
        },
      },
      { field: 'Start Time', headerName: 'Start Time', width: 150 },
      { field: 'End Time',   headerName: 'End Time',   width: 150 },
    ];

    // Slot column — only show when file has multiple sheets
    if (hasMultipleSheets) {
      columnDefs.push({ field: '_sheetName', headerName: 'Slot', width: 210 });
    }

    // Single combined Status column:
    //   ✓ green  = validation passed + new entry
    //   ✗ red    = validation failed
    //   – orange = already registered (will be skipped)
    columnDefs.push({
      field: 'status',
      headerName: 'Status',
      width: 100,
      pinned: 'right',
      cellRenderer: (params) => {
        const rowIndex = params.node.rowIndex;
        const validation = this.state.validationResults[rowIndex];
        const existingLoaded = this.props.existingLoaded ?? this.state.existingLoaded;
        let symbol = '';
        let color = 'inherit';
        if (validation) {
          if (!validation.isValid) { symbol = '✗'; color = 'red'; }
          else if (!existingLoaded) { symbol = ''; }
          else if (this.isExistingParticipant(params.data)) { symbol = '–'; color = '#e65100'; }
          else { symbol = '✓'; color = 'green'; }
        }
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22.5px', fontWeight: 'bold', color }}>
            {symbol}
          </div>
        );
      },
    });

    return columnDefs;
  };

  render() {
    const { reviewing, uploading, uploadProgress, results, files, onConfirmUpload, event } = this.props;
    const { excelData, showValidation, validationResults, validationComplete, rowsWithErrors } = this.state;
    const existingLoaded = this.props.existingLoaded ?? this.state.existingLoaded;
    const newCount = existingLoaded ? excelData.filter(row => !this.isExistingParticipant(row)).length : null;
    const dupCount = existingLoaded ? excelData.length - newCount : null;

    if (!reviewing && !uploading && !results && (!files || files.length === 0)) {
      return null;
    }

    // Build error list for display - group all errors for each participant into one entry
    const errorList = [];
    if (validationComplete) {
      excelData.forEach((row, index) => {
        const validation = validationResults[index];
        if (!validation?.isValid && validation?.errors.length > 0) {
          const participantErrors = validation.errors.join(' and ');
          errorList.push({
            participantNumber: index + 1,
            errors: participantErrors
          });
        }
      });
    }

    // ─── Action Buttons ───
    let actionButtons = null;

    // Completed: show Done (success) or Try Again (failure)
    if (results && results.status === 'completed') {
      if (results.uploadSuccess) {
        actionButtons = (
          <div style={{ marginTop: '20px', padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
            <button
              className="fft-staff-upload-btn"
              onClick={() => this.props.onDone?.()}
              style={{ width: 'fit-content', padding: '10px 32px' }}
            >
              Done
            </button>
          </div>
        );
      } else {
        actionButtons = (
          <div style={{ marginTop: '20px', padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
            <button
              className="fft-staff-reset-btn"
              onClick={() => this.props.onReset?.()}
              style={{ width: 'fit-content', padding: '10px 32px' }}
            >
              Try Again
            </button>
          </div>
        );
      }
    }

    // Show Clear/Review buttons (file selection only with files selected)
    else if (files && files.length > 0 && !reviewing && !uploading && !results) {
      actionButtons = (
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', padding: '0 20px' }}>
          <button
            className="fft-staff-reset-btn"
            onClick={() => this.props.onClear?.()}
            style={{ flex: 1 }}
          >
            Clear
          </button>
          <button
            className="fft-staff-upload-btn"
            onClick={() => this.props.onReview?.()}
            style={{ flex: 1 }}
          >
            Review
          </button>
        </div>
      );
    }

    // Show buttons during review (based on validation state)
    else if (reviewing && !results) {
      const hasErrors = rowsWithErrors.length > 0;

      if (!showValidation) {
        actionButtons = null;
      } else if (hasErrors) {
        actionButtons = (
          <div style={{ marginTop: '20px', padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
            <button
              className="fft-staff-reset-btn"
              onClick={() => {
                this.setState({ validationComplete: false, validationResults: {}, showValidation: false, rowsWithErrors: [] });
                this.props.onClear?.();
              }}
              style={{ width: 'fit-content', padding: '10px 32px' }}
            >
              Try Again
            </button>
          </div>
        );
      } else if (!existingLoaded) {
        actionButtons = null;
      } else {
        const newOnlyData = this.getNewOnlyData?.() || [];
        const hasNewRows = newOnlyData.length > 0;
        if (!hasNewRows) {
          actionButtons = (
            <div style={{ marginTop: '20px', padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
              <button
                className="fft-staff-reset-btn"
                onClick={() => {
                  this.setState({ validationComplete: false, validationResults: {}, showValidation: false, rowsWithErrors: [] });
                  this.props.onClear?.();
                }}
                style={{ width: 'fit-content', padding: '10px 32px' }}
              >
                Try Again
              </button>
            </div>
          );
        } else {
          actionButtons = (
            <div style={{ marginTop: '20px', padding: '0 20px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => this.props.onConfirmUpload?.()}
                className="fft-staff-upload-btn"
                style={{ width: 'fit-content', padding: '10px 32px' }}
              >
                Upload
              </button>
            </div>
          );
        }
      }
    }

    return (
      <div>
        {(reviewing || uploading) && (
          <div style={{ marginBottom: '20px', marginTop: '20px' }}>
            <h4 style={{ fontSize: '1.71875rem', fontWeight: '700', color: '#212121', margin: '0 0 12px' }}>
                Review Files
            </h4>
            <hr style={{ border: 'none', borderTop: '2px solid #e2e6ed', margin: '0 0 12px' }} />
            <p style={{ fontSize: '1.25rem', color: '#555', margin: '0 0 16px 0' }}>
                Validating your file. Please review the results below before proceeding.
            </p>
            
            {/* Files Being Uploaded - Show Excel Data with AG Grid */}
            {files && files.length > 0 && excelData.length > 0 && (
              <>
                <p style={{ fontSize: '1.25rem', fontWeight: "bold"}}>
                  File: {files[0].name}
                </p>
                <div className="grid-container fft-upload-grid" style={{marginLeft: '0px', width: '100%'}}>
                  <AgGridReact
                    columnDefs={this.getColumnDefs()}
                    rowData={excelData}
                    domLayout="normal"
                    pagination={true}
                    paginationPageSize={excelData.length}
                  />
                </div>

                {/* Legend — only shows entries that are actually present */}
                {validationComplete && existingLoaded && (() => {
                  const failCount = excelData.filter((_, i) => validationResults[i] && !validationResults[i].isValid).length;
                  return (
                    <div style={{ marginTop: '8px', padding: '10px 16px', border: '1px solid #ccc', borderRadius: '4px', display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {newCount > 0 && <span style={{ color: 'green', fontWeight: 600, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '1.5625rem' }}>✓</span><span>Success</span></span>}
                      {dupCount > 0 && <span style={{ color: '#e65100', fontWeight: 600, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '1.5625rem' }}>–</span><span>Already Uploaded</span></span>}
                      {failCount > 0 && <span style={{ color: 'red', fontWeight: 600, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '1.5625rem' }}>✗</span><span>Validation Failed</span></span>}
                    </div>
                  );
                })()}

                {/* Error List Display - Below the Table */}
                {validationComplete && errorList.length > 0 && (
                  <div style={{ 
                    marginTop: '20px',
                    padding: '16px',
                    backgroundColor: '#ffebee',
                    border: '1px solid #ef5350',
                    borderRadius: '4px',
                  }}>
                    <h5 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c62828', margin: '0 0 4px 0' }}>
                      Validation Errors:
                    </h5>
                    <p style={{ fontSize: '1.3rem', fontWeight: '700', color: '#c62828', margin: '0 0 12px 0' }}>
                      All records are not uploaded. Please fix the error(s) below and try again.
                    </p>
                    <ul style={{ 
                      margin: '0',
                      paddingLeft: '20px',
                      color: '#c62828',
                      fontSize: '1.1rem',
                    }}>
                      {errorList.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>
                          <strong>Participant Number {item.participantNumber}:</strong> {item.errors}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Already Uploaded notice — shown when all valid rows are duplicates */}
                {validationComplete && existingLoaded && errorList.length === 0 && dupCount > 0 && newCount === 0 && (
                  <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    backgroundColor: '#fff3e0',
                    border: '1px solid #e65100',
                    borderRadius: '4px',
                  }}>
                    <h5 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#e65100', margin: '0 0 4px 0' }}>
                      All Entries Already Uploaded
                    </h5>
                  </div>
                )}

              </>
            )}
            
          </div>
        )}
        {actionButtons}
      </div>
    );
  }
}

export default UploadStatus;
