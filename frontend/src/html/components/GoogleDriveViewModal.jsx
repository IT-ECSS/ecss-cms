import React, { Component } from 'react';
import axios from 'axios';
import '../../css/googleDriveViewModal.css';

class GoogleDriveViewModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'all', // 'all', 'receipts' or 'invoices'
      viewMode: 'grid', // 'row' or 'grid'
      receiptFiles: [],
      invoiceFiles: [],
      isLoadingReceipts: false,
      isLoadingInvoices: false,
      receiptError: null,
      invoiceError: null
    };
  }

  componentDidMount() {
    this.fetchReceiptFiles();
    this.fetchInvoiceFiles();
    
    // Set up auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (this.state.activeTab === 'receipts') {
        this.fetchReceiptFiles();
      } else if (this.state.activeTab === 'invoices') {
        this.fetchInvoiceFiles();
      } else {
        this.fetchReceiptFiles();
        this.fetchInvoiceFiles();
      }
    }, 30000);
  }

  componentWillUnmount() {
    // Clear the interval when component is unmounted
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  fetchReceiptFiles = async () => {
    this.setState({ isLoadingReceipts: true, receiptError: null });
    try {
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/googleDrive`,
        {
          folderId: '11dHfai2ZsHia2J-Ho7w2arW_-dFYMmVW',
          purpose: 'listFiles'
        }
      );
      this.setState({ 
        receiptFiles: response.data.files || [],
        isLoadingReceipts: false
      });
    } catch (error) {
      console.error('Error fetching receipt files:', error);
      this.setState({ 
        receiptError: error.message || 'Failed to load receipt files',
        isLoadingReceipts: false
      });
    }
  }

  fetchInvoiceFiles = async () => {
    this.setState({ isLoadingInvoices: true, invoiceError: null });
    try {
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/googleDrive`,
        {
          folderId: '1eF1phBpOZnKlRy5ARSNkQeawefDpu8Ou',
          purpose: 'listFiles'
        }
      );
      this.setState({ 
        invoiceFiles: response.data.files || [],
        isLoadingInvoices: false
      });
    } catch (error) {
      console.error('Error fetching invoice files:', error);
      this.setState({ 
        invoiceError: error.message || 'Failed to load invoice files',
        isLoadingInvoices: false
      });
    }
  }

  handleTabChange = (tab) => {
    this.setState({ activeTab: tab });
  }

  handleViewModeChange = (mode) => {
    this.setState({ viewMode: mode });
  }

  handleFileClick = (fileLink) => {
    window.open(fileLink, '_blank');
  }

  handleRefresh = () => {
    if (this.state.activeTab === 'receipts') {
      this.fetchReceiptFiles();
    } else if (this.state.activeTab === 'invoices') {
      this.fetchInvoiceFiles();
    } else {
      this.fetchReceiptFiles();
      this.fetchInvoiceFiles();
    }
  }

  render() {
    const { isOpen, onClose } = this.props;
    const { activeTab, viewMode, receiptFiles, invoiceFiles, isLoadingReceipts, isLoadingInvoices, receiptError, invoiceError } = this.state;

    if (!isOpen) {
      return null;
    }

    return (
      <div className="gd-modal-overlay" onClick={onClose}>
        <div className="gd-modal-container" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="gd-header">
            <h2>Google Drive Files</h2>
            <button 
              className="gd-close-btn"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="gd-tabs">
            <button 
              className={`gd-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => this.handleTabChange('all')}
            >
              All
            </button>
            <button 
              className={`gd-tab-btn ${activeTab === 'receipts' ? 'active' : ''}`}
              onClick={() => this.handleTabChange('receipts')}
            >
              Receipts
            </button>
            <button 
              className={`gd-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
              onClick={() => this.handleTabChange('invoices')}
            >
              Invoices
            </button>
          </div>

          {/* Content Section */}
          <div className="gd-content">
            {/* All Tab */}
            {activeTab === 'all' && (
              <div className="gd-tab-content">
                <div className="gd-tab-header">
                  <div className="gd-view-toggle">
                    <button 
                      className={`gd-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => this.handleViewModeChange('grid')}
                      title="Grid view"
                    >
                      ⊞
                    </button>
                    <button 
                      className={`gd-view-btn ${viewMode === 'row' ? 'active' : ''}`}
                      onClick={() => this.handleViewModeChange('row')}
                      title="Row view"
                    >
                      ≡
                    </button>
                  </div>
                  <button 
                    className="gd-refresh-icon-btn"
                    onClick={this.handleRefresh}
                    title="Refresh files"
                  >
                    🔄
                  </button>
                </div>
                {(isLoadingReceipts || isLoadingInvoices) && <div className="gd-loading">Loading files...</div>}
                {(!isLoadingReceipts && !isLoadingInvoices) && receiptError && invoiceError && <div className="gd-error">Error loading files</div>}
                {!isLoadingReceipts && !isLoadingInvoices && receiptFiles.length === 0 && invoiceFiles.length === 0 && (
                  <div className="gd-empty-state">No files in this folder</div>
                )}
                {!isLoadingReceipts && !isLoadingInvoices && (receiptFiles.length > 0 || invoiceFiles.length > 0) && (
                  <div className="gd-files-list">
                    <div className="gd-file-count">Total: {receiptFiles.length + invoiceFiles.length} files</div>
                    <div className={`gd-files-scroll gd-view-${viewMode}`}>
                      {[...receiptFiles, ...invoiceFiles].map((file, index) => {
                        const isReceipt = receiptFiles.some(rf => rf.id === file.id);
                        return (
                        <div key={file.id || index} className={`gd-file-item ${isReceipt ? 'gd-receipt-item' : 'gd-invoice-item'}`} onClick={() => this.handleFileClick(file.webViewLink)}>
                          <div className="gd-file-logo">📄</div>
                          <div className="gd-file-info">
                            <div className="gd-file-name">
                              {file.name}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Receipts Tab */}
            {activeTab === 'receipts' && (
              <div className="gd-tab-content">
                <div className="gd-tab-header">
                  <div className="gd-view-toggle">
                    <button 
                      className={`gd-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => this.handleViewModeChange('grid')}
                      title="Grid view"
                    >
                      ⊞
                    </button>
                    <button 
                      className={`gd-view-btn ${viewMode === 'row' ? 'active' : ''}`}
                      onClick={() => this.handleViewModeChange('row')}
                      title="Row view"
                    >
                      ≡
                    </button>
                  </div>
                  <button 
                    className="gd-refresh-icon-btn"
                    onClick={this.handleRefresh}
                    title="Refresh files"
                  >
                    🔄
                  </button>
                </div>
                {isLoadingReceipts && <div className="gd-loading">Loading receipts...</div>}
                {receiptError && <div className="gd-error">Error: {receiptError}</div>}
                {!isLoadingReceipts && !receiptError && receiptFiles.length === 0 && (
                  <div className="gd-empty-state">No files in this folder</div>
                )}
                {!isLoadingReceipts && !receiptError && receiptFiles.length > 0 && (
                  <div className="gd-files-list">
                    <div className="gd-file-count">Total: {receiptFiles.length} files</div>
                    <div className={`gd-files-scroll gd-view-${viewMode}`}>
                      {receiptFiles.map((file, index) => (
                        <div key={file.id || index} className="gd-file-item gd-receipt-item" onClick={() => this.handleFileClick(file.webViewLink)}>
                          <div className="gd-file-logo">📄</div>
                          <div className="gd-file-info">
                            <div className="gd-file-name">
                              {file.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="gd-tab-content">
                <div className="gd-tab-header">
                  <div className="gd-view-toggle">
                    <button 
                      className={`gd-view-btn ${viewMode === 'row' ? 'active' : ''}`}
                      onClick={() => this.handleViewModeChange('row')}
                      title="Row view"
                    >
                      ≡
                    </button>
                    <button 
                      className={`gd-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => this.handleViewModeChange('grid')}
                      title="Grid view"
                    >
                      ⊞
                    </button>
                  </div>
                  <button 
                    className="gd-refresh-icon-btn"
                    onClick={this.handleRefresh}
                    title="Refresh files"
                  >
                    🔄
                  </button>
                </div>
                {isLoadingInvoices && <div className="gd-loading">Loading invoices...</div>}
                {invoiceError && <div className="gd-error">Error: {invoiceError}</div>}
                {!isLoadingInvoices && !invoiceError && invoiceFiles.length === 0 && (
                  <div className="gd-empty-state">No files in this folder</div>
                )}
                {!isLoadingInvoices && !invoiceError && invoiceFiles.length > 0 && (
                  <div className="gd-files-list">
                    <div className="gd-file-count">Total: {invoiceFiles.length} files</div>
                    <div className={`gd-files-scroll gd-view-${viewMode}`}>
                      {invoiceFiles.map((file, index) => (
                        <div key={file.id || index} className="gd-file-item gd-invoice-item" onClick={() => this.handleFileClick(file.webViewLink)}>
                          <div className="gd-file-logo">📄</div>
                          <div className="gd-file-info">
                            <div className="gd-file-name">
                              {file.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default GoogleDriveViewModal;
