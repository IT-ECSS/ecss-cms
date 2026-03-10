import React from 'react';
import axios from 'axios';
import '../../../css/fftChooseFileForm.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const FFT_ROOT_FOLDER_ID = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';

class ChooseFileForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      yearFolders: [],
      loadingYears: false,
      selectedYear: null,
      chooseYearFiles: [],
      chooseSelectedFile: null,
      loadingChooseFiles: false,
    };
  }

  componentDidMount() {
    this.loadYearFolders();
  }

  loadYearFolders = async () => {
    this.setState({ loadingYears: true });
    try {
      const res = await axios.post(`${BACKEND_URL}/googleDrive`, {
        folderId: FFT_ROOT_FOLDER_ID,
        purpose: 'listSubfolders',
      });
      if (res.data.success) {
        const sorted = (res.data.folders || []).sort((a, b) => b.name.localeCompare(a.name));
        this.setState({ yearFolders: sorted, loadingYears: false });
      } else {
        this.setState({ loadingYears: false });
      }
    } catch {
      this.setState({ loadingYears: false });
    }
  };

  handleChooseYearSelect = async (folder) => {
    this.setState({
      selectedYear: folder,
      chooseYearFiles: [],
      chooseSelectedFile: null,
      loadingChooseFiles: true,
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

  render() {
    const {
      yearFolders,
      loadingYears,
      selectedYear,
      chooseYearFiles,
      loadingChooseFiles,
      chooseSelectedFile,
    } = this.state;

    const { onCancel, onFileSelected } = this.props;

    return (
      <div className="fft-choose-file-form">
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
                  if (onFileSelected) onFileSelected(chooseSelectedFile);
                }}
              >
                <i className="fas fa-arrow-right"></i> Continue to Participants
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default ChooseFileForm;
