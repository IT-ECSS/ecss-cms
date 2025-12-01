import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/googleDriveUploadModal.css';

class GoogleDriveUploadModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isUploading: false,
      currentFile: 0,
      totalFiles: 0,
      uploadTypes: {
        receipt: false,
        invoice: false
      }
    };
  }

  // Get all receipts and invoices from backend
  fetchFilesToUpload = async (type) => {
    try {
      const baseUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";
      
      const response = await axios.post(`${baseUrl}/fundraising`, {
        purpose: 'fetch-all-receipts-invoices',
        type: type // 'receipt', 'invoice', or 'both'
      });

      //return response.data;
      console.log('Fetched files to upload:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching files to upload:', error);
      throw error;
    }
  };

  // Start upload process
  handleStartUpload = async () => {
    const { uploadTypes } = this.state;

    // Check if at least one type is selected
    if (!uploadTypes.receipt && !uploadTypes.invoice) {
      alert('Please select at least one option: Receipts or Invoices');
      return;
    }

    this.setState({
      isUploading: true,
      currentFile: 0,
      totalFiles: 0
    });

    try {
      let totalCount = 0;
      const filesToUpload = [];

      // Fetch receipts if selected
      if (uploadTypes.receipt) {
        const receiptResponse = await this.fetchFilesToUpload('receipt');
        if (receiptResponse.success && receiptResponse.files) {
          filesToUpload.push(...receiptResponse.files.map(f => ({ ...f, type: 'receipt' })));
        }
      }

      // Fetch invoices if selected
      if (uploadTypes.invoice) {
        const invoiceResponse = await this.fetchFilesToUpload('invoice');
        if (invoiceResponse.success && invoiceResponse.files) {
          filesToUpload.push(...invoiceResponse.files.map(f => ({ ...f, type: 'invoice' })));
        }
      }

      totalCount = filesToUpload.length;
      this.setState({ totalFiles: totalCount });

      if (totalCount === 0) {
        alert('No files found to upload');
        this.setState({ isUploading: false });
        return;
      }

      // Upload each file with UI updates
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        try {
          await this.uploadSingleFile(file, file.type);
          this.setState({ currentFile: i + 1 });
        } catch (error) {
          console.error(`Error uploading file:`, error);
          this.setState({ currentFile: i + 1 });
        }
      }

      // Complete upload
      setTimeout(() => {
        this.setState({ isUploading: false });
      }, 1000);
    } catch (error) {
      console.error('Upload process error:', error);
      this.setState({ isUploading: false });
    }
  };

  // Upload a single file
  uploadSingleFile = async (fileData, type) => {
    try {
      const baseUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";

      // Convert base64 to blob if needed
      let blob;
      if (typeof fileData.pdfData === 'string') {
        const binaryString = atob(fileData.pdfData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'application/pdf' });
      } else {
        blob = fileData.pdfData;
      }

      const formData = new FormData();
      formData.append('file', blob, fileData.filename);
      formData.append('filename', fileData.filename);
      formData.append('purpose', 'upload-to-google-drive');
      formData.append('fileType', type);

      const response = await axios.post(
        `${baseUrl}/fundraising`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        return { success: true };
      } else if (response.data.existingFileName) {
        return { duplicate: true };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Error uploading single file:', error);
      throw error;
    }
  };

  // Update status message
  updateStatus = (type, status, message) => {
    this.setState((prevState) => ({
      uploadProgress: {
        ...prevState.uploadProgress,
        [type]: { status, message }
      }
    }));
  };

  // Handle close modal
  handleClose = () => {
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    const { isOpen, onClose } = this.props;
    const { isUploading, currentFile, totalFiles, uploadTypes } = this.state;

    if (!isOpen) return null;

    const progress = totalFiles > 0 ? (currentFile / totalFiles) * 100 : 0;

    return (
      <div className="gd-upload-modal-overlay" onClick={this.handleClose}>
        <div className="gd-upload-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="gd-upload-modal-header">
            <h2 className="gd-upload-modal-title">Upload Files to Google Drive</h2>
            <div className="gd-header-controls">
              <button 
                className="gd-upload-modal-close"
                onClick={this.handleClose}
                disabled={isUploading}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="gd-upload-modal-body">
            {/* Upload Type Selection - Checkboxes */}
            <div className="upload-type-section">
              <label className="upload-type-label">Select:</label>
              <div className="upload-type-options">
                <label className="upload-type-option">
                  <input
                    type="checkbox"
                    name="receipt"
                    checked={uploadTypes.receipt}
                    onChange={(e) => this.setState({ 
                      uploadTypes: { ...uploadTypes, receipt: e.target.checked } 
                    })}
                    disabled={isUploading}
                  />
                  <span>Receipts</span>
                </label>
                <label className="upload-type-option">
                  <input
                    type="checkbox"
                    name="invoice"
                    checked={uploadTypes.invoice}
                    onChange={(e) => this.setState({ 
                      uploadTypes: { ...uploadTypes, invoice: e.target.checked } 
                    })}
                    disabled={isUploading}
                  />
                  <span>Invoices</span>
                </label>
              </div>
            </div>

            {/* Loading Bar */}
            {isUploading && (
              <div className="gd-loading-container">
                <div className="gd-progress-bar">
                  <div className="gd-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="gd-progress-counter">{currentFile}/{totalFiles} uploaded</div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="gd-upload-modal-footer">
            <button
              className="gd-upload-btn-upload"
              onClick={this.handleStartUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading in Progress...' : 'Start Upload'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default GoogleDriveUploadModal;
