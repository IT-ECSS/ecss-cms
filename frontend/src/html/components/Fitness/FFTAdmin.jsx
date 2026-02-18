import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../../../css/fftAdmin.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const SOURCE_SPREADSHEET_ID = '1xaTsyYx8rND25rMz8QUjlRxHO82TRQ8k5M3JIOg5KkQ';

// Root FFT folder ID in Google Drive (parent that holds year folders)
const FFT_ROOT_FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';

const LOCATIONS = [
  { key: 'cthub', label: 'CT Hub' },
  { key: 'prw', label: 'PRW' },
  { key: 'tampines', label: 'TNCC', aliases: ['tampines'] },
];

class FFTAdmin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Menu view: null = menu, 'create' = Create File, 'choose' = Choose File
      activeView: null,

      // Year selection (shared)
      yearFolders: [],        // [{id, name}] from Google Drive
      yearFilesMap: {},       // { folderId: [fileName, ...] } — files in each year folder
      loadingYears: false,
      selectedYear: null,      // {id, name} of chosen year folder
      showYearModal: false,
      newYearInput: '',
      creatingYear: false,

      // Location selection (Create File)
      selectedLocation: '',

      // File name & copy (Create File)
      customFileName: '',
      copying: false,
      checking: false,
      duplicateFound: false,
      result: null,
      error: null,

      // Choose File flow
      chooseYearFiles: [],    // [{id, name}] files in selected year folder
      loadingChooseFiles: false,
      chooseSelectedFile: null, // {id, name} selected spreadsheet
    };
  }

  componentDidMount() {
    this.loadYearFolders();

    // Socket.IO: live updates
    this.socket = io(BACKEND_URL);
    this.socket.on('fftActiveFile', (data) => {
      // Another admin changed the active file — refresh folder data
      if (data && data.file) {
        this.loadYearFolders();
      }
    });
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // ── Year folders ──

  loadYearFolders = async () => {
    if (!FFT_ROOT_FOLDER_ID) {
      // No root folder configured — skip loading
      return;
    }
    this.setState({ loadingYears: true });
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive`, {
        folderId: FFT_ROOT_FOLDER_ID,
        purpose: 'listSubfolders',
      });
      if (res.data.success) {
        // Sort year folders descending (newest first)
        const sorted = (res.data.folders || []).sort((a, b) => b.name.localeCompare(a.name));
        this.setState({ yearFolders: sorted, loadingYears: false });
        // Load files for each year folder to know which locations are done
        this.loadYearFiles(sorted);
      } else {
        this.setState({ loadingYears: false });
      }
    } catch {
      this.setState({ loadingYears: false });
    }
  };

  loadYearFiles = async (folders) => {
    const map = {};
    await Promise.all(
      folders.map(async (folder) => {
        try {
          const res = await axios.post(`${BACKEND_URL}/googleDrive`, {
            folderId: folder.id,
            purpose: 'listFiles',
          });
          if (res.data.success && res.data.files) {
            map[folder.id] = res.data.files.map(f => f.name);
          } else {
            map[folder.id] = [];
          }
        } catch {
          map[folder.id] = [];
        }
      })
    );
    this.setState({ yearFilesMap: map });
  };

  // Check if a year folder has files for ALL locations
  yearHasAllLocations = (folderId) => {
    const files = this.state.yearFilesMap[folderId] || [];
    const fileNamesLower = files.map(f => f.toLowerCase());
    return LOCATIONS.every(loc => {
      const names = [loc.label.toLowerCase(), ...(loc.aliases || []).map(a => a.toLowerCase())];
      return names.some(name => fileNamesLower.some(fn => fn.includes(name)));
    });
  };

  // Get locations that already have a file in the selected year
  getCompletedLocations = () => {
    const { selectedYear, yearFilesMap } = this.state;
    if (!selectedYear) return [];
    const files = yearFilesMap[selectedYear.id] || [];
    const fileNamesLower = files.map(f => f.toLowerCase());
    return LOCATIONS
      .filter(loc => {
        const names = [loc.label.toLowerCase(), ...(loc.aliases || []).map(a => a.toLowerCase())];
        return names.some(name => fileNamesLower.some(fn => fn.includes(name)));
      })
      .map(loc => loc.key);
  };

  handleYearSelect = (folder) => {
    this.setState({
      selectedYear: folder,
      selectedLocation: '',
      customFileName: '',
      duplicateFound: false,
      checking: false,
      result: null,
      error: null,
    });
  };

  openYearModal = () => {
    const currentYear = new Date().getFullYear().toString();
    this.setState({ showYearModal: true, newYearInput: currentYear });
  };

  closeYearModal = () => {
    this.setState({ showYearModal: false, newYearInput: '', creatingYear: false });
  };

  handleCreateYear = async () => {
    const { newYearInput } = this.state;
    const yearName = newYearInput.trim();
    if (!yearName) return;

    this.setState({ creatingYear: true });

    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive/createFolder`, {
        folderName: yearName,
        parentFolderId: FFT_ROOT_FOLDER_ID,
      });

      if (res.data.success) {
        const newFolder = { id: res.data.folderId, name: res.data.folderName };
        this.setState((prev) => ({
          yearFolders: [newFolder, ...prev.yearFolders].sort((a, b) => b.name.localeCompare(a.name)),
          selectedYear: newFolder,
          selectedLocation: '',
          customFileName: '',
          duplicateFound: false,
          result: null,
          error: null,
          showYearModal: false,
          newYearInput: '',
          creatingYear: false,
        }));
      } else {
        this.setState({ error: res.data.error || 'Failed to create folder', creatingYear: false });
      }
    } catch (err) {
      this.setState({ error: err.response?.data?.error || err.message, creatingYear: false });
    }
  };

  // ── Location selection ──

  getDefaultFileName = () => {
    const loc = LOCATIONS.find(l => l.key === this.state.selectedLocation);
    const year = this.state.selectedYear;
    if (!loc || !year) return '';
    return `${loc.label} ${year.name} FFT`;
  };

  handleLocationSelect = (key) => {
    this.setState({ selectedLocation: key, result: null, error: null, duplicateFound: false }, () => {
      const fileName = this.getDefaultFileName();
      this.setState({ customFileName: fileName }, () => {
        this.checkDuplicate(fileName);
      });
    });
  };

  // ── Duplicate check ──

  checkDuplicate = async (fileName) => {
    const { selectedYear } = this.state;
    if (!selectedYear || !selectedYear.id || !fileName.trim()) {
      this.setState({ duplicateFound: false, error: null });
      return;
    }

    this.setState({ checking: true });

    try {
      const listRes = await axios.post(`${BACKEND_URL}/googleDrive`, {
        folderId: selectedYear.id,
        purpose: 'listFiles',
      });

      if (listRes.data.success && listRes.data.files) {
        const duplicate = listRes.data.files.find(
          f => f.name.toLowerCase() === fileName.trim().toLowerCase()
        );
        if (duplicate) {
          this.setState({
            duplicateFound: true,
            error: `A file named "${fileName.trim()}" already exists in the ${selectedYear.name} folder.`,
            checking: false,
          });
          return;
        }
      }
      this.setState({ duplicateFound: false, error: null, checking: false });
    } catch {
      this.setState({ checking: false });
    }
  };

  handleFileNameChange = (value) => {
    this.setState({ customFileName: value, duplicateFound: false, error: null, result: null });
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      if (this.state.selectedYear && value.trim()) {
        this.checkDuplicate(value);
      }
    }, 500);
  };

  // ── Copy spreadsheet ──

  handleCopy = async () => {
    const { selectedYear, customFileName } = this.state;
    if (!selectedYear || !customFileName.trim()) return;

    const destinationFolderId = selectedYear.id;

    this.setState({ copying: true, result: null, error: null, duplicateFound: false });

    try {
      // Safety check for duplicates
      if (destinationFolderId) {
        const listRes = await axios.post(`${BACKEND_URL}/googleDrive`, {
          folderId: destinationFolderId,
          purpose: 'listFiles',
        });

        if (listRes.data.success && listRes.data.files) {
          const duplicate = listRes.data.files.find(
            f => f.name.toLowerCase() === customFileName.trim().toLowerCase()
          );
          if (duplicate) {
            this.setState({
              error: `A file named "${customFileName.trim()}" already exists in the ${selectedYear.name} folder.`,
              duplicateFound: true,
              copying: false,
            });
            return;
          }
        }
      }

      const response = await axios.post(`${BACKEND_URL}/googleDrive/copySpreadsheet`, {
        sourceFileId: SOURCE_SPREADSHEET_ID,
        newFileName: customFileName.trim(),
        destinationFolderId: destinationFolderId || undefined,
      });

      if (response.data.success) {
        // Update yearFilesMap with the new file
        this.setState((prev) => {
          const folderId = prev.selectedYear.id;
          const existingFiles = prev.yearFilesMap[folderId] || [];
          return {
            result: response.data,
            copying: false,
            yearFilesMap: {
              ...prev.yearFilesMap,
              [folderId]: [...existingFiles, customFileName.trim()],
            },
          };
        });
      } else {
        this.setState({ error: response.data.error || 'Copy failed', copying: false });
      }
    } catch (err) {
      this.setState({ error: err.response?.data?.error || err.message, copying: false });
    }
  };

  // ── Menu navigation ──

  handleMenuSelect = (view) => {
    this.setState({
      activeView: view,
      // Reset Create File state
      selectedYear: null,
      selectedLocation: '',
      customFileName: '',
      copying: false,
      checking: false,
      duplicateFound: false,
      result: null,
      error: null,
      // Reset Choose File state
      chooseYearFiles: [],
      chooseSelectedFile: null,
      loadingChooseFiles: false,
      // Reset cache state
      clearingCache: false,
      cacheMessage: null,
    });
  };

  handleClearCache = async () => {
    this.setState({ clearingCache: true, cacheMessage: null });
    try {
      const res = await axios.delete(`${BACKEND_URL}/googleDrive/clearCache`);
      if (res.data.success) {
        this.setState({ clearingCache: false, cacheMessage: res.data.message });
      } else {
        this.setState({ clearingCache: false, cacheMessage: 'Failed to clear cache.' });
      }
    } catch (err) {
      this.setState({ clearingCache: false, cacheMessage: err.message || 'Error clearing cache.' });
    }
  };

  handleBackToMenu = () => {
    this.setState({
      activeView: null,
      selectedYear: null,
      selectedLocation: '',
      customFileName: '',
      copying: false,
      checking: false,
      duplicateFound: false,
      result: null,
      error: null,
      chooseYearFiles: [],
      chooseSelectedFile: null,
      loadingChooseFiles: false,
    });
  };

  // ── Choose File flow ──

  handleChooseYearSelect = async (folder) => {
    this.setState({
      selectedYear: folder,
      chooseYearFiles: [],
      chooseSelectedFile: null,
      loadingChooseFiles: true,
      error: null,
    });

    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive`, {
        folderId: folder.id,
        purpose: 'listFiles',
      });
      if (res.data.success && res.data.files) {
        this.setState({ chooseYearFiles: res.data.files, loadingChooseFiles: false });
      } else {
        this.setState({ chooseYearFiles: [], loadingChooseFiles: false });
      }
    } catch {
      this.setState({ chooseYearFiles: [], loadingChooseFiles: false });
    }
  };

  handleChooseFileSelect = (file) => {
    this.setState({ chooseSelectedFile: file });
  };

  // ── Render ──

  render() {
    const { onBack } = this.props;
    const {
      activeView,
      yearFolders, loadingYears, selectedYear, showYearModal, newYearInput, creatingYear,
      selectedLocation, customFileName,
      copying, checking, duplicateFound, result, error,
      chooseYearFiles, loadingChooseFiles, chooseSelectedFile,
    } = this.state;

    // Filter out years that already have files for ALL locations (for Create File)
    const availableYears = yearFolders.filter(f => !this.yearHasAllLocations(f.id));
    const completedLocations = this.getCompletedLocations();

    return (
      <div className="fft-participants-wrapper">
        <div className="fft-participants-header">
          <div className="fft-participants-header-top-row">
            <button
              className="fft-participants-icon-btn"
              onClick={activeView ? this.handleBackToMenu : onBack}
              title={activeView ? 'Back' : 'Home'}
            >
              <i className={activeView ? 'fas fa-arrow-left' : 'fas fa-home'}></i>
            </button>
          </div>
        </div>

        {/* ════════════ MENU VIEW ════════════ */}
        {!activeView && (
          <div className="fft-participants-form">
            {/* Current active file indicator */}
            {this.props.selectedFile && (
              <div className="fft-admin-result fft-admin-result--success" style={{ marginBottom: '16px' }}>
                <i className="fas fa-file-alt"></i>
                <div>
                  <p className="fft-admin-result-title">Active File</p>
                  <p className="fft-admin-result-detail">{this.props.selectedFile.name}</p>
                </div>
              </div>
            )}
            <div className="fft-admin-menu-grid">
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('create')}
              >
                <div className="fft-admin-menu-btn-icon">
                  <i className="fas fa-file-medical"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Create File</span>
              </button>
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={() => this.handleMenuSelect('choose')}
              >
                <div className="fft-admin-menu-btn-icon">
                  <i className="fas fa-folder-open"></i>
                </div>
                <span className="fft-admin-menu-btn-label">Choose File</span>
              </button>
              <button
                type="button"
                className="fft-admin-menu-btn"
                onClick={this.handleClearCache}
                disabled={this.state.clearingCache}
                style={{ borderColor: '#ef4444' }}
              >
                <div className="fft-admin-menu-btn-icon" style={{ color: '#ef4444' }}>
                  <i className={this.state.clearingCache ? 'fas fa-spinner fa-spin' : 'fas fa-trash-alt'}></i>
                </div>
                <span className="fft-admin-menu-btn-label">{this.state.clearingCache ? 'Clearing...' : 'Clear Cache'}</span>
              </button>
            </div>
            {this.state.cacheMessage && (
              <div className="fft-admin-result fft-admin-result--success" style={{ marginTop: '16px' }}>
                <i className="fas fa-check-circle"></i>
                <div>
                  <p className="fft-admin-result-title">Cache Cleared</p>
                  <p className="fft-admin-result-detail">{this.state.cacheMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ CREATE FILE VIEW ════════════ */}
        {activeView === 'create' && (
          <div className="fft-participants-form">

            {/* ── Step 1: Year selection ── */}
            <div className="fft-participants-section">
              <div className="fft-participants-section-header">
                <span className="fft-participants-section-number">1</span>
                <h3 className="fft-participants-section-title">Select Year</h3>
              </div>

              {loadingYears ? (
                <div className="fft-admin-loading">
                  <i className="fas fa-spinner fa-spin"></i> Loading year folders...
                </div>
              ) : (
                <div className="fft-admin-year-grid">
                  {availableYears.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className={`fft-admin-year-btn ${selectedYear && selectedYear.id === folder.id ? 'fft-admin-year-btn--active' : ''}`}
                      onClick={() => this.handleYearSelect(folder)}
                    >
                      <i className="fas fa-folder"></i>
                      {folder.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="fft-admin-year-btn fft-admin-year-btn--new"
                    onClick={this.openYearModal}
                  >
                    <i className="fas fa-plus"></i>
                    New Year
                  </button>
                </div>
              )}
            </div>

            {/* ── Step 2: Location selection (shown after year) ── */}
            {selectedYear && (
              <div className="fft-participants-section">
                <div className="fft-participants-section-header">
                  <span className="fft-participants-section-number">2</span>
                  <h3 className="fft-participants-section-title">Select Location</h3>
                </div>
                <div className="fft-admin-location-grid">
                  {LOCATIONS.filter((loc) => !completedLocations.includes(loc.key)).map((loc) => (
                    <button
                      key={loc.key}
                      type="button"
                      className={`fft-admin-location-btn ${selectedLocation === loc.key ? 'fft-admin-location-btn--active' : ''}`}
                      onClick={() => this.handleLocationSelect(loc.key)}
                    >
                      <i className="fas fa-map-marker-alt"></i>
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: File name (shown after location) ── */}
            {selectedYear && selectedLocation && (
              <div className="fft-participants-section">
                <div className="fft-participants-section-header">
                  <span className="fft-participants-section-number">3</span>
                  <h3 className="fft-participants-section-title">File Name</h3>
                </div>
                <div className="fft-participants-field fft-participants-field--full">
                  <input
                    id="fft-admin-filename"
                    className="fft-participants-input"
                    type="text"
                    value={customFileName}
                    onChange={(e) => this.handleFileNameChange(e.target.value)}
                    placeholder="Enter file name"
                  />
                </div>

                {checking && (
                  <div className="fft-admin-loading" style={{ marginTop: '12px' }}>
                    <i className="fas fa-spinner fa-spin"></i> Checking for existing files...
                  </div>
                )}

                {duplicateFound && error && (
                  <div className="fft-admin-result fft-admin-result--warning">
                    <i className="fas fa-exclamation-triangle"></i>
                    <div>
                      <p className="fft-admin-result-title">Duplicate found</p>
                      <p className="fft-admin-result-detail">{error}</p>
                    </div>
                  </div>
                )}

                {customFileName.trim() && !duplicateFound && !checking && (
                  <button
                    type="button"
                    className="fft-participants-submit-btn"
                    onClick={this.handleCopy}
                    disabled={copying}
                    style={{ marginTop: '16px' }}
                  >
                    {copying ? (
                      <><i className="fas fa-spinner fa-spin"></i> Creating...</>
                    ) : (
                      <><i className="fas fa-file-medical"></i> Create File</>
                    )}
                  </button>
                )}

                {result && (
                  <div className="fft-admin-result fft-admin-result--success">
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <p className="fft-admin-result-title">File created successfully!</p>
                      <p className="fft-admin-result-detail">{result.fileName}</p>
                      <a
                        className="fft-admin-result-link"
                        href={result.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Google Sheets <i className="fas fa-external-link-alt"></i>
                      </a>
                    </div>
                  </div>
                )}

                {error && !duplicateFound && (
                  <div className="fft-admin-result fft-admin-result--error">
                    <i className="fas fa-exclamation-circle"></i>
                    <div>
                      <p className="fft-admin-result-title">Error</p>
                      <p className="fft-admin-result-detail">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════ CHOOSE FILE VIEW ════════════ */}
        {activeView === 'choose' && (
          <div className="fft-participants-form">

            {/* ── Step 1: Year selection ── */}
            <div className="fft-participants-section">
              <div className="fft-participants-section-header">
                <span className="fft-participants-section-number">1</span>
                <h3 className="fft-participants-section-title">Select Year</h3>
              </div>

              {loadingYears ? (
                <div className="fft-admin-loading">
                  <i className="fas fa-spinner fa-spin"></i> Loading year folders...
                </div>
              ) : (
                <div className="fft-admin-year-grid">
                  {yearFolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className={`fft-admin-year-btn ${selectedYear && selectedYear.id === folder.id ? 'fft-admin-year-btn--active' : ''}`}
                      onClick={() => this.handleChooseYearSelect(folder)}
                    >
                      <i className="fas fa-folder"></i>
                      {folder.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Step 2: Choose a file ── */}
            {selectedYear && (
              <div className="fft-participants-section">
                <div className="fft-participants-section-header">
                  <span className="fft-participants-section-number">2</span>
                  <h3 className="fft-participants-section-title">Select File</h3>
                </div>

                {loadingChooseFiles ? (
                  <div className="fft-admin-loading">
                    <i className="fas fa-spinner fa-spin"></i> Loading files...
                  </div>
                ) : chooseYearFiles.length === 0 ? (
                  <p style={{ color: '#757575', fontSize: '1.35rem' }}>No files in this folder.</p>
                ) : (
                  <div className="fft-admin-file-grid">
                    {chooseYearFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        className={`fft-admin-file-btn ${chooseSelectedFile && chooseSelectedFile.id === file.id ? 'fft-admin-file-btn--active' : ''}`}
                        onClick={() => this.handleChooseFileSelect(file)}
                      >
                        <i className="fas fa-file-spreadsheet fa-file-excel"></i>
                        {file.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected file confirmation */}
                {chooseSelectedFile && (
                  <div className="fft-admin-result fft-admin-result--success" style={{ marginTop: '16px' }}>
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <p className="fft-admin-result-title">File selected</p>
                      <p className="fft-admin-result-detail">{chooseSelectedFile.name}</p>
                    </div>
                  </div>
                )}

                {/* Confirm & go to participants */}
                {chooseSelectedFile && (
                  <button
                    type="button"
                    className="fft-participants-submit-btn"
                    style={{ marginTop: '16px' }}
                    onClick={() => {
                      const { onFileSelected } = this.props;
                      if (onFileSelected) onFileSelected(chooseSelectedFile);
                    }}
                  >
                    <i className="fas fa-arrow-right"></i> Continue to Participants
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Year Modal ── */}
        {showYearModal && (
          <div className="fft-admin-modal-overlay" onClick={this.closeYearModal}>
            <div className="fft-admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="fft-admin-modal-header">
                <h3 className="fft-admin-modal-title">Create New Year Folder</h3>
                <button className="fft-admin-modal-close" onClick={this.closeYearModal}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="fft-admin-modal-body">
                <label className="fft-participants-label" htmlFor="fft-admin-year-input">Year</label>
                <input
                  id="fft-admin-year-input"
                  className="fft-participants-input"
                  type="text"
                  value={newYearInput}
                  onChange={(e) => this.setState({ newYearInput: e.target.value })}
                  placeholder="e.g. 2026"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') this.handleCreateYear(); }}
                />
              </div>
              <div className="fft-admin-modal-footer">
                <button className="fft-admin-modal-cancel" onClick={this.closeYearModal}>Cancel</button>
                <button
                  className="fft-admin-modal-confirm"
                  onClick={this.handleCreateYear}
                  disabled={!newYearInput.trim() || creatingYear}
                >
                  {creatingYear ? (
                    <><i className="fas fa-spinner fa-spin"></i> Creating...</>
                  ) : (
                    <><i className="fas fa-folder-plus"></i> Create</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default FFTAdmin;
