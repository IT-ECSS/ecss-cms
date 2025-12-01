import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/invoiceModal.css';

class InvoiceModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checklist: {
        preview: false,
        downloaded: false,
        uploadedToGoogleDrive: false
      },
      loading: {
        preview: false,
        downloaded: false,
        uploadedToGoogleDrive: false
      },
      errors: {
        preview: false,
        downloaded: false,
        uploadedToGoogleDrive: false
      },
      errorMessages: {
        preview: '',
        downloaded: '',
        uploadedToGoogleDrive: ''
      }
    };
    this.currentBlob = null;
    this.currentBlobUrl = null;
    this.hasExecutedActions = false;
  }

  componentDidMount() {
    // Add event listener for escape key if needed
  }

  componentWillUnmount() {
    // Clean up event listener
  }

  componentDidUpdate(prevProps) {
    // Only execute actions when modal is explicitly opened by user (isOpen changes from false to true)
    if (prevProps.isOpen === false && this.props.isOpen === true) {
      this.autoExecuteActions();
    }
    
    // Reset state when modal is closed
    if (prevProps.isOpen === true && this.props.isOpen === false) {
      this.resetModalState();
    }
  }

  // Reset modal state to initial values
  resetModalState = () => {
    this.setState({
      checklist: {
        preview: false,
        downloaded: false,
        uploadedToGoogleDrive: false
      },
      loading: {
        preview: false,
        downloaded: false,
        uploadedToGoogleDrive: false
      },
      errors: {
        preview: false,
        downloaded: false,
        uploadedToGoogleDrive: false
      },
      errorMessages: {
        preview: '',
        downloaded: '',
        uploadedToGoogleDrive: ''
      }
    });
    this.currentBlob = null;
    this.currentBlobUrl = null;
    this.hasExecutedActions = false;
  }

  // Auto-execute all invoice actions
  autoExecuteActions = async () => {
    const { invoiceNumber, orderData } = this.props;
    
    // Reset to show spinners for all items
    this.setState({
      checklist: {
        preview: false,
        downloaded: false,
        uploadedToGoogleDrive: false
      },
      loading: {
        preview: true,
        downloaded: true,
        uploadedToGoogleDrive: true
      },
      errors: {
        preview: false,
        downloaded: false,
        uploadedToGoogleDrive: false
      }
    });
    
    try {
      const baseUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";
      
      // Generate invoice PDF using existing invoice number
      const response = await axios.post(`${baseUrl}/fundraising`, {
        purpose: 'generateCheckoutInvoice',
        invoiceNumber: invoiceNumber,
        orderData: orderData
      });

      if (!response.data.result.success) {
        throw new Error(response.data.result.message || 'Failed to generate invoice');
      }

      // Convert base64 back to blob
      const binaryString = atob(response.data.result.pdfData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      this.currentBlob = blob;
      
      // Execute preview (auto-open in new tab)
      await this.executePreview(blob);
      
      // Wait 1 second before download
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Execute download
      await this.executeDownload(blob);
      
      // Wait 1 second before Google Drive upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Execute Google Drive upload
      await this.executeGoogleDriveUpload(blob);
      
      // Check if all actions completed successfully (no errors)
      this.setState((prevState) => {
        const hasErrors = prevState.errors.preview || prevState.errors.downloaded || prevState.errors.uploadedToGoogleDrive;
        
        // Only auto-close if no errors occurred
        if (!hasErrors) {
          setTimeout(() => {
            const { onClose } = this.props;
            if (onClose) {
              onClose();
            }
          }, 3000); // Wait 3 seconds to show the checkmarks before closing
        } else {
          // If there are errors, keep modal open and display them
          console.log('Modal kept open due to errors. User must close manually.');
        }
        
        return prevState;
      });
    } catch (error) {
      console.error('Error in auto-execute actions:', error);
      // Mark all as errors if generation fails
      this.setState((prevState) => ({
        loading: {
          preview: false,
          downloaded: false,
          uploadedToGoogleDrive: false
        },
        errors: {
          preview: true,
          downloaded: true,
          uploadedToGoogleDrive: true
        },
        errorMessages: {
          preview: error.message,
          downloaded: '',
          uploadedToGoogleDrive: ''
        }
      }));
    }
  };

  // Execute preview action
  executePreview = async (blob) => {
    try {
      this.setState((prevState) => ({
        loading: { ...prevState.loading, preview: true }
      }));

      const blobUrl = window.URL.createObjectURL(blob);
      
      // Store blob URL for later preview action (user clicks to open)
      this.currentBlobUrl = blobUrl;
      
      // Automatically open preview in new tab
      const pdfWindow = window.open(blobUrl, '_blank');
      if (!pdfWindow) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
      
      // Mark as previewed (ready to open)
      this.setState((prevState) => ({
        checklist: { ...prevState.checklist, preview: true },
        loading: { ...prevState.loading, preview: false },
        errors: { ...prevState.errors, preview: false },
        errorMessages: { ...prevState.errorMessages, preview: '' }
      }));
    } catch (error) {
      console.error('Error executing preview:', error);
      this.setState((prevState) => ({
        loading: { ...prevState.loading, preview: false },
        errors: { ...prevState.errors, preview: true },
        errorMessages: { ...prevState.errorMessages, preview: error.message }
      }));
    }
  };

  // Handle preview button click to open PDF in new tab
  handlePreviewClick = () => {
    if (this.currentBlobUrl) {
      const pdfWindow = window.open(this.currentBlobUrl, '_blank');
      if (!pdfWindow) {
        console.warn('Popup blocked: Could not open PDF in new tab');
        this.setState((prevState) => ({
          errors: { ...prevState.errors, preview: true },
          errorMessages: { ...prevState.errorMessages, preview: 'Popup was blocked. Please allow popups for this site.' }
        }));
      }
    }
  };

  // Execute download action
  executeDownload = async (blob) => {
    try {
      this.setState((prevState) => ({
        loading: { ...prevState.loading, downloaded: true }
      }));

      const blobUrl = window.URL.createObjectURL(blob);
      const { invoiceNumber } = this.props;
      
      // Create filename with invoice number
      const filename = `Invoice_${invoiceNumber}.pdf`;
      
      // Create and trigger download immediately
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Clean up after download
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(blobUrl);
      }, 500);
      
      this.setState((prevState) => ({
        checklist: { ...prevState.checklist, downloaded: true },
        loading: { ...prevState.loading, downloaded: false },
        errors: { ...prevState.errors, downloaded: false },
        errorMessages: { ...prevState.errorMessages, downloaded: '' }
      }));
    } catch (error) {
      console.error('Error executing download:', error);
      this.setState((prevState) => ({
        loading: { ...prevState.loading, downloaded: false },
        errors: { ...prevState.errors, downloaded: true },
        errorMessages: { ...prevState.errorMessages, downloaded: error.message }
      }));
    }
  };

  // Execute Google Drive upload action
  executeGoogleDriveUpload = async (blob) => {
    try {
      this.setState((prevState) => ({
        loading: { ...prevState.loading, uploadedToGoogleDrive: true }
      }));

      const { invoiceNumber } = this.props;
      
      // Create filename: Invoice_InvoiceNumber
      const filename = `Invoice_${invoiceNumber}.pdf`;
      
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('filename', filename);
      formData.append('purpose', 'upload-to-google-drive');
      formData.append('fileType', 'invoice');
      
      const baseUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";
      
      const response = await axios.post(
        `${baseUrl}/fundraising`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      const data = response.data;
      console.log('📦 Google Drive upload response:', data);
      
      if (data.success) {
        // Full success - Google Drive upload successful
        console.log(`✓ PDF successfully uploaded to Google Drive`);
        console.log(`  File ID: ${data.fileId}`);
        console.log(`  File Name: ${data.fileName}`);
        console.log(`  File Link: ${data.fileLink}`);
        console.log(`  Uploaded At: ${data.uploadedAt}`);
        
        this.setState((prevState) => ({
          checklist: { ...prevState.checklist, uploadedToGoogleDrive: true },
          loading: { ...prevState.loading, uploadedToGoogleDrive: false },
          errors: { ...prevState.errors, uploadedToGoogleDrive: false },
          errorMessages: { ...prevState.errorMessages, uploadedToGoogleDrive: '' }
        }));
      } else if (data.existingFileName) {
        // Duplicate file detected
        const errorMsg = `${data.existingFileName} already exists in the folder`;
        console.error('Duplicate file error:', errorMsg);
        
        this.setState((prevState) => ({
          loading: { ...prevState.loading, uploadedToGoogleDrive: false },
          errors: { ...prevState.errors, uploadedToGoogleDrive: true },
          errorMessages: { ...prevState.errorMessages, uploadedToGoogleDrive: errorMsg }
        }));
      } else {
        throw new Error(data.error || data.message || 'Failed to upload to Google Drive');
      }
    } catch (error) {
      console.error('Error executing Google Drive upload:', error);
      this.setState((prevState) => ({
        loading: { ...prevState.loading, uploadedToGoogleDrive: false },
        errors: { ...prevState.errors, uploadedToGoogleDrive: true },
        errorMessages: { ...prevState.errorMessages, uploadedToGoogleDrive: error.message }
      }));
    }
  };

  render() {
    const { isOpen, onClose, invoiceNumber } = this.props;
    const { checklist, loading, errors, errorMessages } = this.state;

    if (!isOpen) return null;

    return (
      <div className="invoice-modal-overlay" onClick={onClose}>
        <div className="invoice-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="invoice-modal-header">
            <h2 className="invoice-modal-title">Invoice Generator</h2>
            <button 
              className="invoice-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div className="invoice-modal-body">
            {/* Checklist Section */}
            <div className="invoice-checklist">
              {/* Preview */}
              <div className="invoice-checklist-item">
                <span className={`invoice-status-icon${errors.preview ? ' error' : ''}`}>
                  {loading.preview ? (
                    <span className="invoice-loading-spinner"></span>
                  ) : errors.preview ? (
                    '✗'
                  ) : checklist.preview ? (
                    '✓'
                  ) : (
                    ''
                  )}
                </span>
                <label 
                  className="invoice-checkbox-label"
                  onClick={checklist.preview && !errors.preview ? this.handlePreviewClick : null}
                  style={checklist.preview && !errors.preview ? { cursor: 'pointer' } : {}}
                >
                  Preview on New Tab
                </label>
                {errors.preview && errorMessages.preview && (
                  <div className="invoice-error-message">{errorMessages.preview}</div>
                )}
              </div>

              {/* Downloaded */}
              <div className="invoice-checklist-item">
                <span className={`invoice-status-icon${errors.downloaded ? ' error' : ''}`}>
                  {loading.downloaded ? (
                    <span className="invoice-loading-spinner"></span>
                  ) : errors.downloaded ? (
                    '✗'
                  ) : checklist.downloaded ? (
                    '✓'
                  ) : (
                    ''
                  )}
                </span>
                <label className="invoice-checkbox-label">
                  Download
                </label>
                {errors.downloaded && errorMessages.downloaded && (
                  <div className="invoice-error-message">{errorMessages.downloaded}</div>
                )}
              </div>

              {/* Upload to Google Drive */}
              <div className="invoice-checklist-item">
                <span className={`invoice-status-icon${errors.uploadedToGoogleDrive ? ' error' : ''}`}>
                  {loading.uploadedToGoogleDrive ? (
                    <span className="invoice-loading-spinner"></span>
                  ) : errors.uploadedToGoogleDrive ? (
                    '✗'
                  ) : checklist.uploadedToGoogleDrive ? (
                    '✓'
                  ) : (
                    ''
                  )}
                </span>
                <label className="invoice-checkbox-label">
                  Upload to Google Drive
                </label>
                {errors.uploadedToGoogleDrive && errorMessages.uploadedToGoogleDrive && (
                  <div className="invoice-error-message">{errorMessages.uploadedToGoogleDrive}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default InvoiceModal;
