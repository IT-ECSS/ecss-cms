import React, { Component } from 'react';
import * as XLSX from 'xlsx';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import '../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme
import '../../../css/fftStaff.css';


ModuleRegistry.registerModules([AllCommunityModule]);


class UploadStatus extends Component {
  constructor(props) {
    super(props);
    this.state = {
      excelData: [],
      validationResults: {},
      showValidation: false,
      validationComplete: false,
      rowsWithErrors: [], // Track which rows have errors
    };
  }

  componentDidMount() {
    this.parseExcelFiles();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.files !== this.props.files) {
      this.parseExcelFiles();
    }
  }

  parseExcelFiles = () => {
    const { files } = this.props;
    if (!files || files.length === 0) return;

    const file = files[0]; // Parse first file
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        this.setState({ excelData: jsonData });
      } catch (error) {
        console.error('Error parsing Excel file:', error);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  validateRow = (row, rowIndex) => {
    const errors = [];

    // Check for empty cells in required fields
    const requiredFields = ['Name', 'Phone Number', 'Gender', 'DD', 'MM', 'YYYY'];
    requiredFields.forEach((field) => {
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

    // Validate Date of Birth
    const dd = parseInt(row?.DD);
    const mm = parseInt(row?.MM);
    const yyyy = parseInt(row?.YYYY);

    if (dd || mm || yyyy) {
      if (!dd || dd < 1 || dd > 31) {
        errors.push('DD must be between 1-31');
      }
      if (!mm || mm < 1 || mm > 12) {
        errors.push('MM must be between 1-12');
      }
      if (!yyyy || String(yyyy).length !== 4) {
        errors.push('YYYY must be exactly 4 digits');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  };

  handleValidateAll = () => {
    const { excelData } = this.state;
    const validationResults = {};
    const rowsWithErrors = [];

    // Calculate total validations needed
    const totalValidations = excelData.length;
    let completedValidations = 0;
    let hasErrorsFound = false;

    // Validate rows one by one with delay for visual progression
    excelData.forEach((row, index) => {
      setTimeout(() => {
        validationResults[index] = this.validateRow(row, index);
        completedValidations++;
        
        // Check if this row has errors
        const rowHasErrors = validationResults[index].errors && validationResults[index].errors.length > 0;
        if (rowHasErrors) {
          hasErrorsFound = true;
          rowsWithErrors.push(index + 1); // Store row number (1-indexed)
          console.log('ERROR FOUND at row', index + 1, ':', validationResults[index].errors);
        }
        
        this.setState({ 
          validationResults: { ...this.state.validationResults, ...validationResults },
          rowsWithErrors: rowsWithErrors,
          showValidation: true 
        });

        // After all validations complete, set validationComplete to true and notify parent
        if (completedValidations === totalValidations) {
          if (hasErrorsFound) {
            console.log('VALIDATION COMPLETE: Errors found in rows:', rowsWithErrors);
          } else {
            console.log('VALIDATION COMPLETE: All rows are valid');
          }
          this.setState({ validationComplete: true });
          // Notify parent to re-render and detect validation errors
          if (this.props.onValidationComplete) {
            this.props.onValidationComplete();
          }
        }
      }, index * 500); // 500ms delay between each row
    });

    // For return value, validate all immediately but show progressively
    const allValidationResults = {};
    excelData.forEach((row, index) => {
      allValidationResults[index] = this.validateRow(row, index);
    });
    
    // Return whether all rows are valid
    return Object.values(allValidationResults).every((result) => result.isValid);
  };

  getColumnDefs = () => {
    const { excelData, showValidation } = this.state;
    if (excelData.length === 0) return [];

    const headers = Object.keys(excelData[0]);
    const hasDateFields = headers.includes('DD') && headers.includes('MM') && headers.includes('YYYY');

    // Column width mapping
    const columnWidths = {
      'Participant Number': 250,
      'Name': 200,
      'Contact Number': 250,
      'Phone Number': 250,
      'Gender': 150,
      'Date of Birth': 200,
      'Result': 100,
    };

    // Add Participant Number column at the beginning
    let columnDefs = [
      {
        field: 'participantNumber',
        headerName: 'Participant Number',
        width: columnWidths['Participant Number'],
        valueGetter: (params) => {
          return params.node.rowIndex + 1;
        },
        sortable: false,
        filter: false,
      }
    ];

    // Add other columns with Phone Number renamed to Contact Number
    columnDefs = columnDefs.concat(
      headers.map((header) => ({
        field: header,
        headerName: header === 'Phone Number' ? 'Contact Number' : header,
        width: columnWidths[header] || 120,
        hide: hasDateFields && ['DD', 'MM', 'YYYY'].includes(header),
      }))
    );

    // Add Date of Birth column if date fields exist
    if (hasDateFields) {
      const ddIndex = columnDefs.findIndex((col) => col.field === 'DD');
      if (ddIndex !== -1) {
        columnDefs.splice(ddIndex, 0, {
          field: 'dateOfBirth',
          headerName: 'Date of Birth',
          width: columnWidths['Date of Birth'],
          valueGetter: (params) => {
            const dd = params.data?.DD;
            const mm = params.data?.MM;
            const yyyy = params.data?.YYYY;
            if (dd && mm && yyyy) {
              return `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;
            }
            return '';
          },
        });
      }
    }

    // Add Result column at the end - always show, but empty until validation completes
    columnDefs.push({
      field: 'result',
      headerName: 'Result',
      width: columnWidths['Result'],
      pinned: 'right',
      valueGetter: (params) => {
        const rowIndex = params.node.rowIndex;
        const validation = this.state.validationResults[rowIndex];
        // Return empty string if validation hasn't run, otherwise show symbol
        if (!validation) return '';
        return validation.isValid ? '✓' : '✗';
      },
      cellStyle: (params) => {
        const rowIndex = params.node.rowIndex;
        const validation = this.state.validationResults[rowIndex];
        // Only apply colors if validation has completed
        if (!validation) {
          return { textAlign: 'center' };
        }
        return {
          color: validation.isValid ? 'green' : 'red',
          fontWeight: 'bold',
          fontSize: '18px',
          textAlign: 'center',
        };
      },
    });

    return columnDefs;
  };

  render() {
    const { reviewing, uploading, uploadProgress, results, files, onConfirmUpload } = this.props;
    const { excelData, showValidation, validationResults } = this.state;

    if (!reviewing && !uploading && !results) {
      return null;
    }

    // Build error list for display - group all errors for each participant into one entry
    const errorList = [];
    if (showValidation) {
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

    return (
      <div>
        {(reviewing || uploading) && (
          <div style={{ marginBottom: '20px', marginTop: '20px' }}>
            <h4 style={{ fontSize: '1.71875rem', fontWeight: '700', color: '#212121', margin: '0 0 12px' }}>
                Review Files
            </h4>
            <hr style={{ border: 'none', borderTop: '2px solid #e2e6ed', margin: '0 0 12px' }} />
            <p style={{ fontSize: '1.25rem', color: '#555', margin: '0 0 16px 0' }}>
                Please review the files below and click Confirm to proceed.
            </p>
            
            {/* Files Being Uploaded - Show Excel Data with AG Grid */}
            {files && files.length > 0 && excelData.length > 0 && (
              <>
                <p style={{ fontSize: '1.25rem', fontWeight: "bold"}}>
                  File: {files[0].name}
                </p>
                <div className="grid-container" style={{marginLeft: '0px', width: '100%'}}>
                  <AgGridReact
                    columnDefs={this.getColumnDefs()}
                    rowData={excelData}
                    domLayout="normal"
                    pagination={true}
                    paginationPageSize={excelData.length}
                  />
                </div>

                {/* Error List Display - Below the Table */}
                {showValidation && errorList.length > 0 && (
                  <div style={{ 
                    marginTop: '20px',
                    padding: '16px',
                    backgroundColor: '#ffebee',
                    border: '1px solid #ef5350',
                    borderRadius: '4px',
                  }}>
                    <h5 style={{ fontSize: '1.25rem', color: '#c62828', margin: '0 0 12px 0' }}>
                      Validation Errors:
                    </h5>
                    <ul style={{ 
                      margin: '0',
                      paddingLeft: '20px',
                      color: '#c62828',
                      fontSize: '1.25rem',
                    }}>
                      {errorList.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>
                          <strong>Participant Number {item.participantNumber}:</strong> {item.errors}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            
          </div>
        )}
      </div>
    );
  }
}

export default UploadStatus;
