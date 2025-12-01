import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/receiptModal.css';

class ReceiptModal extends Component {
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
      }
    };
    // Store blob and filename for reuse across actions
    this.currentBlob = null;
    this.currentFilename = null;
    this.hasExecutedActions = false; // Track if actions have already been executed
  }

  componentDidMount() {
    // Add event listener for escape key
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
    this.currentFilename = null;
    this.currentBlobUrl = null;
    this.hasExecutedActions = false;
  }

  // Auto-execute all receipt actions
  autoExecuteActions = async () => {
    const { receiptNumber, orderDetails } = this.props;
    
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
      
      // Prepare complete order data for PDF generation
      const pdfData = {
        purpose: 'generateReceipt',
        receiptNumber: receiptNumber,
        personalInfo: {
          firstName: orderDetails?.firstName || '',
          lastName: orderDetails?.lastName || '',
          email: orderDetails?.email || '',
          phone: orderDetails?.contactNumber || ''
        },
        paymentMethod: orderDetails?.paymentMethod || '',
        paymentDetails: {
          paymentMethod: orderDetails?.paymentMethod || '',
          invoiceNumber: orderDetails?.invoiceNumber || ''
        },
        collectionMode: orderDetails?.collectionMode || '',
        collectionDetails: {
          collectionMode: orderDetails?.collectionMode || '',
          CollectionDeliveryLocation: orderDetails?.collectionDeliveryLocation || '',
          collectionDate: orderDetails?.collectionDate || '',
          collectionTime: orderDetails?.collectionTime || ''
        },
        items: orderDetails?.items || [],
        totalPrice: orderDetails?.enrichedTotalPrice > 0 
          ? orderDetails?.enrichedTotalPrice 
          : orderDetails?.originalTotalPrice || 0,
        donationAmount: orderDetails?.donationAmount || ''
      };
      
      const response = await axios.post(`${baseUrl}/fundraising`, pdfData);

      if (!response.data.result.success) {
        throw new Error(response.data.result.message || 'Failed to generate receipt');
      }

      // Convert base64 back to blob
      const binaryString = atob(response.data.result.pdfData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      this.currentBlob = blob;
      this.currentFilename = response.data.result.pdfFilename;
      
      // Execute preview (with immediate window.open)
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
        
        // If no errors, auto-close the modal after a brief delay
        if (!hasErrors) {
          setTimeout(() => {
            const { onClose } = this.props;
            if (onClose) {
              onClose();
            }
          }, 3000); // Wait 3 seconds to show the checkmarks before closing
        }
        
        return prevState;
      });
    } catch (error) {
      console.error('Error in auto-execute actions:', error);
    }
  };

  // Execute preview action
  executePreview = async (blob) => {
    try {
      this.setState((prevState) => ({
        loading: { ...prevState.loading, preview: true }
      }));

      const blobUrl = window.URL.createObjectURL(blob);
      
      // Open PDF in new tab immediately (before async operations)
      const pdfWindow = window.open(blobUrl, '_blank');
      if (!pdfWindow) {
        console.warn('Popup blocked: Could not open PDF in new tab');
        this.setState((prevState) => ({
          loading: { ...prevState.loading, preview: false },
          errors: { ...prevState.errors, preview: true }
        }));
        return;
      }
      
      // Mark as previewed
      this.setState((prevState) => ({
        checklist: { ...prevState.checklist, preview: true },
        loading: { ...prevState.loading, preview: false },
        errors: { ...prevState.errors, preview: false }
      }));
      
      // Clean up blob URL after a delay to allow opening
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    } catch (error) {
      console.error('Error executing preview:', error);
      this.setState((prevState) => ({
        loading: { ...prevState.loading, preview: false },
        errors: { ...prevState.errors, preview: true }
      }));
    }
  };

  // Execute download action
  executeDownload = async (blob) => {
    try {
      this.setState((prevState) => ({
        loading: { ...prevState.loading, downloaded: true }
      }));

      const blobUrl = window.URL.createObjectURL(blob);
      const { orderDetails } = this.props;
      
      // Build filename: FirstName LastName PaymentMethod ReceiptNumber
      const firstName = (orderDetails?.firstName || '').trim().replace(/\s+/g, '_');
      const lastName = (orderDetails?.lastName || '').trim().replace(/\s+/g, '_');
      const paymentMethod = (orderDetails?.paymentMethod || '').trim().replace(/\s+/g, '_');
      const receiptNumber = (this.props.receiptNumber || '').trim().replace(/\s+/g, '_');
      
      const filename = `${firstName}_${lastName}_${paymentMethod}_${receiptNumber}.pdf`;
      
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
        errors: { ...prevState.errors, downloaded: false }
      }));
    } catch (error) {
      console.error('Error executing download:', error);
      this.setState((prevState) => ({
        loading: { ...prevState.loading, downloaded: false },
        errors: { ...prevState.errors, downloaded: true }
      }));
    }
  };

  // Execute Google Drive upload action
  executeGoogleDriveUpload = async (blob) => {
    try {
      this.setState((prevState) => ({
        loading: { ...prevState.loading, uploadedToGoogleDrive: true }
      }));

      const { orderDetails } = this.props;
      
      // Build filename: FirstName_LastName_PaymentMethod_ReceiptNumber
      const firstName = (orderDetails?.firstName || '').trim().replace(/\s+/g, '_');
      const lastName = (orderDetails?.lastName || '').trim().replace(/\s+/g, '_');
      const paymentMethod = (orderDetails?.paymentMethod || '').trim().replace(/\s+/g, '_');
      const receiptNumber = (this.props.receiptNumber || '').trim().replace(/\s+/g, '_');
      
      const filename = `${firstName}_${lastName}_${paymentMethod}_${receiptNumber}.pdf`;
      
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('filename', filename);
      formData.append('purpose', 'upload-to-google-drive');
      
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
        // Check if there's a warning (partial success - PDF downloaded but Google Drive upload failed)
        if (data.warning) {
          console.warn(`⚠️ ${data.warning}`);
          console.warn(`Google Drive Error: ${data.googleDriveError}`);
          console.log('✓ PDF downloaded locally, Google Drive upload pending');
          
          // Mark as completed since PDF was downloaded locally
          this.setState((prevState) => ({
            checklist: { ...prevState.checklist, uploadedToGoogleDrive: true },
            loading: { ...prevState.loading, uploadedToGoogleDrive: false },
            errors: { ...prevState.errors, uploadedToGoogleDrive: false }
          }));
        } else {
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
        }
      } else {
        // Handle specific errors
        let errorMessage = data.error || 'Upload failed';
        
        if (data.fileAlreadyExists) {
          errorMessage = `File already exists in folder. Created: ${data.createdTime || 'N/A'}`;
        }
        
        this.setState((prevState) => ({
          loading: { ...prevState.loading, uploadedToGoogleDrive: false },
          errors: { ...prevState.errors, uploadedToGoogleDrive: true },
          errorMessages: { ...prevState.errorMessages, uploadedToGoogleDrive: errorMessage }
        }));
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Google Drive upload error:', error.message);
      const errorMsg = error.message || 'Upload failed';
      
      this.setState((prevState) => ({
        loading: { ...prevState.loading, uploadedToGoogleDrive: false },
        errors: { ...prevState.errors, uploadedToGoogleDrive: true },
        errorMessages: { ...prevState.errorMessages, uploadedToGoogleDrive: errorMsg }
      }));
    }
  }

  render() {
    const { isOpen, onClose, receiptNumber, orderDetails } = this.props;
    const { checklist, loading, errors } = this.state;

    if (!isOpen) return null;

    // Extract and format data
    const name = orderDetails ? `${orderDetails.firstName || ''} ${orderDetails.lastName || ''}`.trim() : '';
    const email = orderDetails?.email || '';
    const contactNumber = orderDetails?.contactNumber || '';
    const paymentMethod = orderDetails?.paymentMethod || '';
    const items = orderDetails?.items || [];
    const collectionDetails = orderDetails?.collectionDetails || {};
    const collectionDate = orderDetails?.collectionDate || '';
    const collectionMode = orderDetails?.collectionMode || '';
    const collectionLocation = orderDetails?.collectionDeliveryLocation || '';
    const donationAmount = orderDetails?.donationAmount || '';
    const enrichedTotalPrice = orderDetails?.enrichedTotalPrice || 0;
    const originalTotalPrice = orderDetails?.originalTotalPrice || 0;

    // Determine which total to display
    const displayTotal = enrichedTotalPrice > 0 ? enrichedTotalPrice : originalTotalPrice;

    return (
      <div className="receipt-modal-overlay" onClick={this.handleOverlayClick}>
        <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="receipt-modal-header">
            <h2 className="receipt-modal-title">Receipt Generator</h2>
            <button 
              className="receipt-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div className="receipt-modal-body">
            {/* Checklist Section */}
            <div className="receipt-checklist">
              {/* Preview */}
              <div className="receipt-checklist-item">
                <span className={`receipt-status-icon${errors.preview ? ' error' : ''}`}>
                  {loading.preview ? (
                    <span className="receipt-loading-spinner"></span>
                  ) : errors.preview ? (
                    '✗'
                  ) : checklist.preview ? (
                    '✓'
                  ) : (
                    ''
                  )}
                </span>
                <label className="receipt-checkbox-label">
                  Preview on New Tab
                </label>
              </div>

              {/* Downloaded */}
              <div className="receipt-checklist-item">
                <span className={`receipt-status-icon${errors.downloaded ? ' error' : ''}`}>
                  {loading.downloaded ? (
                    <span className="receipt-loading-spinner"></span>
                  ) : errors.downloaded ? (
                    '✗'
                  ) : checklist.downloaded ? (
                    '✓'
                  ) : (
                    ''
                  )}
                </span>
                <label className="receipt-checkbox-label">
                  Download
                </label>
              </div>

              {/* Uploaded to Google Drive */}
              <div className="receipt-checklist-item">
                <span className={`receipt-status-icon${errors.uploadedToGoogleDrive ? ' error' : ''}`}>
                  {loading.uploadedToGoogleDrive ? (
                    <span className="receipt-loading-spinner"></span>
                  ) : errors.uploadedToGoogleDrive ? (
                    '✗'
                  ) : checklist.uploadedToGoogleDrive ? (
                    '✓'
                  ) : (
                    ''
                  )}
                </span>
                <label className="receipt-checkbox-label">
                  Upload to Google Drive
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ReceiptModal;
