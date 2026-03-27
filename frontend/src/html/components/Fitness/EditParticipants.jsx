import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import '../../../css/ag-grid-custom-theme.css';
import '../../../css/fftEditParticipants.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

class EditParticipants extends Component {
  constructor(props) {
    super(props);
    this.state = {
      participants: [],
      loading: false,
      error: null,
      saving: false,
      saveSuccess: false,
      saveError: null,
      // pendingChanges: { rowIndex: { field: { oldValue, newValue } } }
      pendingChanges: {},
      // validationErrors: { rowIndex: { field: 'error message' } }
      validationErrors: {},
      saveAttempted: false,
      searchText: '',
    };
    this.gridRef = React.createRef();
  }

  componentDidMount() {
    this.fetchParticipants();
  }

  reset = () => {
    this.setState({
      participants: [],
      loading: false,
      error: null,
      saving: false,
      saveSuccess: false,
      saveError: null,
      pendingChanges: {},
      validationErrors: {},
      saveAttempted: false,
      searchText: '',
    });
  };

  componentDidUpdate(prevProps) {
    if (prevProps.event?.id !== this.props.event?.id) {
      this.fetchParticipants();
    }
  }

  fetchParticipants = async () => {
    const { event } = this.props;
    if (!event?.id) return;

    this.setState({ loading: true, error: null, pendingChanges: {}, saveSuccess: false, saveError: null, validationErrors: {}, saveAttempted: false });

    try {
      const response = await axios.post(`${BACKEND_URL}/googleDrive/getParticipants`, {
        fileId: event.id,
      });
      this.setState({ loading: false, participants: response.data || [] });
    } catch (err) {
      console.error('Failed to fetch participants:', err);
      this.setState({ loading: false, error: 'Failed to load participants. Please try again.' });
    }
  };

  // Returns an error string or null
  validateField = (field, value) => {
    const v = String(value || '').trim();
    if (field === 'Name' || field === 'Gender') {
      if (!v) return `${field} cannot be empty.`;
    }
    if (field === 'Phone Number') {
      if (!v) return 'Contact Number cannot be empty.';
      if (!/^[89]\d{7}$/.test(v)) return 'Contact Number must be 8 digits and start with 8 or 9.';
    }
    if (field === 'DateOfBirth') {
      if (!v) return 'Date of Birth cannot be empty.';
      const parts = v.split('/');
      if (parts.length !== 3) return 'Date of Birth must be in dd/mm/yyyy format.';
      const dd = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      const yyyy = parts[2].trim();
      if (isNaN(dd) || dd < 1 || dd > 31) return 'Day must be between 1 and 31.';
      if (isNaN(mm) || mm < 1 || mm > 12) return 'Month must be between 1 and 12.';
      if (!yyyy) return 'Year cannot be empty.';
    }
    return null;
  };

  onCellValueChanged = (params) => {
    const rowIndex = params.node.rowIndex;
    const field = params.colDef.colId || params.colDef.field;
    const oldValue = params.oldValue;
    const newValue = params.newValue;
    if (oldValue === newValue) return;

    const validationError = this.validateField(field, newValue);

    this.setState((prev) => {
      // Update validation errors
      const rowErrors = { ...(prev.validationErrors[rowIndex] || {}) };
      if (validationError) {
        rowErrors[field] = validationError;
      } else {
        delete rowErrors[field];
      }
      const validationErrors = { ...prev.validationErrors };
      if (Object.keys(rowErrors).length > 0) {
        validationErrors[rowIndex] = rowErrors;
      } else {
        delete validationErrors[rowIndex];
      }

      // Always track the pending change, regardless of validation error
      const rowChanges = prev.pendingChanges[rowIndex] || {};
      const existingOld = rowChanges[field]?.oldValue ?? oldValue;
      return {
        validationErrors,
        pendingChanges: {
          ...prev.pendingChanges,
          [rowIndex]: {
            ...rowChanges,
            [field]: { oldValue: existingOld, newValue },
          },
        },
        saveAttempted: false,
        saveSuccess: false,
        saveError: null,
      };
    });
  };

  handleSaveAll = async () => {
    const { event } = this.props;
    const { participants, pendingChanges, validationErrors } = this.state;
    const changedIndexes = Object.keys(pendingChanges);
    if (changedIndexes.length === 0) return;

    // If there are validation errors, surface them and stop
    if (Object.keys(validationErrors).length > 0) {
      this.setState({ saveAttempted: true });
      return;
    }

    this.setState({ saving: true, saveError: null, saveAttempted: true });
    try {
      await Promise.all(
        changedIndexes.map((idx) =>
          axios.post(`${BACKEND_URL}/googleDrive/updateParticipant`, {
            fileId: event.id,
            rowIndex: parseInt(idx),
            participantData: participants[parseInt(idx)],
          })
        )
      );
      this.setState({ saving: false, saveSuccess: true, pendingChanges: {}, saveAttempted: false });
    } catch (err) {
      console.error('Failed to save participants:', err);
      this.setState({ saving: false, saveError: 'Failed to save changes. Please try again.' });
    }
  };

  getColumnDefs = () => [
    {
      headerName: 'Participant Number',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 250,
      editable: false,
      sortable: false,
      filter: false,
      pinned: 'left',
    },
    {
      colId: 'Name',
      headerName: 'Name',
      width: 200,
      editable: true,
      valueGetter: (params) => params.data ? params.data['Name'] || '' : '',
      valueSetter: (params) => { if (params.data) { params.data['Name'] = params.newValue; } return true; },
    },
    {
      colId: 'Chinese Name',
      headerName: 'Chinese Name',
      width: 160,
      editable: true,
      valueGetter: (params) => params.data ? params.data['Chinese Name'] || '' : '',
      valueSetter: (params) => { if (params.data) { params.data['Chinese Name'] = params.newValue; } return true; },
    },
    {
      colId: 'Phone Number',
      headerName: 'Contact Number',
      width: 200,
      editable: true,
      valueGetter: (params) => params.data ? params.data['Phone Number'] || '' : '',
      valueSetter: (params) => { if (params.data) { params.data['Phone Number'] = params.newValue; } return true; },
    },
    {
      colId: 'Gender',
      headerName: 'Gender',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['M', 'F'] },
      valueGetter: (params) => params.data ? params.data['Gender'] || '' : '',
      valueSetter: (params) => { if (params.data) { params.data['Gender'] = params.newValue; } return true; },
    },
    {
      colId: 'DateOfBirth',
      headerName: 'Date of Birth',
      width: 160,
      editable: true,
      valueGetter: (params) => {
        if (!params.data) return '';
        const dd = String(params.data['DD'] || '').padStart(2, '0');
        const mm = String(params.data['MM'] || '').padStart(2, '0');
        const yyyy = params.data['YYYY'] || '';
        if (!dd || !mm || !yyyy) return '';
        return `${dd}/${mm}/${yyyy}`;
      },
      valueSetter: (params) => {
        if (!params.data || !params.newValue) return false;
        const parts = String(params.newValue).split('/');
        if (parts.length !== 3) return false;
        params.data['DD'] = parts[0].trim();
        params.data['MM'] = parts[1].trim();
        params.data['YYYY'] = parts[2].trim();
        return true;
      },
    },
    {
      colId: 'Start Time',
      headerName: 'Start Time',
      width: 130,
      editable: true,
      valueGetter: (params) => params.data ? params.data['Start Time'] || '' : '',
      valueSetter: (params) => { if (params.data) { params.data['Start Time'] = params.newValue; } return true; },
    },
    {
      colId: 'End Time',
      headerName: 'End Time',
      width: 130,
      editable: true,
      valueGetter: (params) => params.data ? params.data['End Time'] || '' : '',
      valueSetter: (params) => { if (params.data) { params.data['End Time'] = params.newValue; } return true; },
    },
  ];

  render() {
    const { participants, loading, error, saving, saveSuccess, saveError, pendingChanges, validationErrors, saveAttempted, searchText } = this.state;

    const filteredParticipants = searchText.trim()
      ? participants.filter((p) => {
          const q = searchText.toLowerCase();
          const dob = `${String(p['DD'] || '').padStart(2, '0')}/${String(p['MM'] || '').padStart(2, '0')}/${p['YYYY'] || ''}`;
          return (
            (p['Name'] || '').toLowerCase().includes(q) ||
            (p['Phone Number'] || '').toLowerCase().includes(q) ||
            (p['Gender'] || '').toLowerCase().includes(q) ||
            dob.includes(q)
          );
        })
      : participants;
    const changedRows = Object.entries(pendingChanges);
    const hasPending = changedRows.length > 0;
    const allValidationErrors = Object.entries(validationErrors);
    const hasValidationErrors = allValidationErrors.length > 0;
    // Only show errors after the user has attempted to save
    const showErrors = saveAttempted && hasValidationErrors;

    return (
      <div className="fft-edit-participants">
        {/* Header */}
        <div className="fft-edit-header">
          <h4 className="fft-edit-title">Edit Participants</h4>
          <hr className="fft-edit-divider" />
          <p className="fft-edit-desc">
            Click any cell to edit its value directly.
          </p>
        </div>

        {/* Status messages */}
        {loading && <div className="fft-edit-status"><i className="fas fa-spinner fa-spin"></i> Loading participants...</div>}
        {error && <div className="fft-edit-error"><i className="fas fa-exclamation-circle"></i> {error}</div>}

        {/* Search bar */}
        {!loading && participants.length > 0 && (
          <div className="fft-edit-search-row">
            <div className="fft-edit-search-wrap">
              <i className="fas fa-search fft-edit-search-icon"></i>
              <input
                type="text"
                className="fft-edit-search-input"
                placeholder="Search by name, contact, gender or date of birth…"
                value={searchText}
                onChange={(e) => this.setState({ searchText: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* AG Grid */}
        {!loading && participants.length > 0 && (
          <div className="grid-container fft-upload-grid fft-edit-grid" style={{ width: '100%', maxWidth: '100%', height: '450px', marginLeft: 0 }}>
            <AgGridReact
              ref={this.gridRef}
              columnDefs={this.getColumnDefs()}
              rowData={filteredParticipants}
              domLayout="normal"
              pagination={false}
              singleClickEdit={true}
              stopEditingWhenCellsLoseFocus={true}
              onCellValueChanged={this.onCellValueChanged}
              getRowStyle={(params) => {
                const idx = params.node.rowIndex;
                if (showErrors && validationErrors[idx]) return { background: '#ffebee' };
                if (pendingChanges[idx]) return { background: '#fff8e1' };
                return undefined;
              }}
            />
          </div>
        )}

        {!loading && participants.length === 0 && !error && (
          <p className="fft-edit-status">No participants found for this event.</p>
        )}

        {/* Combined changes + validation + save */}

        {hasPending && (() => {
          const allRowIndexes = new Set([
            ...changedRows.map(([idx]) => idx),
            ...(showErrors ? allValidationErrors.map(([idx]) => idx) : []),
          ]);

          return (
            <div className={`fft-edit-changes-panel${showErrors ? ' fft-edit-changes-panel--error' : ''}`}>
              <h5 className="fft-edit-changes-title">
                {showErrors
                  ? <><i className="fas fa-exclamation-triangle"></i> Error</>
                  : <><i className="fas fa-pencil-alt"></i> Pending Changes ({changedRows.length} row{changedRows.length > 1 ? 's' : ''})</>
                }
              </h5>
              <ul className="fft-edit-changes-list">
                {[...allRowIndexes].sort((a, b) => parseInt(a) - parseInt(b)).map((rowIdx) => {
                  const fields = pendingChanges[rowIdx] || {};
                  const errors = showErrors ? (validationErrors[rowIdx] || {}) : {};
                  return (
                    <li key={rowIdx} className="fft-edit-changes-row">
                      <span className="fft-edit-changes-rownum">Row {parseInt(rowIdx) + 1}</span>
                      {Object.entries(fields).map(([field, { oldValue, newValue }]) => (
                        <span key={field} className="fft-edit-changes-field">
                          <strong>{field}:</strong> <span className="fft-edit-old">{oldValue || '—'}</span> → <span className="fft-edit-new">{newValue || '—'}</span>
                        </span>
                      ))}
                      {Object.values(errors).map((msg, i) => (
                        <span key={`err-${i}`} className="fft-edit-validation-msg">{msg}</span>
                      ))}
                    </li>
                  );
                })}
              </ul>

              {saveError && (
                <div className="fft-edit-error" style={{ marginBottom: '12px', marginTop: '8px' }}>
                  <i className="fas fa-exclamation-circle"></i> {saveError}
                </div>
              )}
            </div>
          );
        })()}

        {hasPending && !saveAttempted && (
          <button
            className="fft-edit-btn fft-edit-btn--save"
            style={{ marginTop: '16px' }}
            onClick={this.handleSaveAll}
            disabled={saving}
          >
            {saving
              ? <><i className="fas fa-spinner fa-spin"></i> Saving...</>
              : <><i className="fas fa-save"></i> Save Changes</>}
          </button>
        )}

        {saveSuccess && !hasPending && (
          <div className="fft-edit-success">
            <i className="fas fa-check-circle"></i> Changes saved successfully.
          </div>
        )}
      </div>
    );
  }
}

export default EditParticipants;
