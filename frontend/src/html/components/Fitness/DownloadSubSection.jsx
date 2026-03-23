import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/fftDownloadSubSection.css';

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

// Fixed spreadsheet to download
const TEMPLATE_FILE_ID = '1xu3UtY6fm3O09_vwlCk1p_NZM0waWrzUMsDGmJbmNDk';
const TEMPLATE_FILE_NAME = 'FFT Pre-Registration Template (Bulk Upload)';

class DownloadSubSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      error: null,
      success: false,
    };
  }

  handleDownload = async () => {
    this.setState({ loading: true, error: null, success: false });

    try {
      const response = await axios.post(
        `${BACKEND_URL}/googleDrive/exportSpreadsheet`,
        { fileId: TEMPLATE_FILE_ID, fileName: TEMPLATE_FILE_NAME },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${TEMPLATE_FILE_NAME}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      this.setState({ loading: false, success: true });
      setTimeout(() => this.setState({ success: false }), 3000);
    } catch (err) {
      console.error('Download error:', err);
      this.setState({ loading: false, error: 'Failed to download the file. Please try again.' });
    }
  };

  render() {
    const { loading, error, success } = this.state;

    return (
      <div className="fft-download-subsection">
        {/* Header */}
        <div className="fft-download-subsection-header">
          <i className="fas fa-file-download"></i>
          <h4 className="fft-download-subsection-title">FFT Registration Template</h4>
        </div>

        <p className="fft-download-subsection-desc">
          As an alternative, you may download the FFT Template Spreadsheet.
        </p>

        {/* Action */}
        <div className="fft-download-subsection-actions" style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className={`fft-download-btn ${loading ? 'fft-download-btn--loading' : ''}`}
            onClick={this.handleDownload}
            disabled={loading}
            style={{ width: 'fit-content' }}
          >
              <><i className="fas fa-download"></i>Download Template</>
          </button>
        </div>
      </div>
    );
  }
}

export default DownloadSubSection;
