import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/CourseFlyers.css';
import BulkDownloadProgress from './BulkDownloadProgress';

class CourseFlyers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      flyers: [],
      loading: false,
      selectedFlyerId: null,
      filterType: 'all', // Filter: all, nsa, ilp, mpp, talks
      searchQuery: '',
      expandedFlyers: new Set(),
      activeTab: 'nsa', // New state for tab management
      currentFolderId: null, // Track current folder navigation
      breadcrumb: [], // Track navigation path
      selectedFiles: new Set(), // Track selected files for bulk download
      promptShown: false, // Track if beforeunload prompt was already shown
      bulkDownloadModalOpen: false, // Track bulk download modal state
      bulkDownloadProgress: 0, // Progress percentage
      bulkDownloadStatus: 'downloading', // 'downloading', 'completed', 'error'
      bulkDownloadMessage: 'Preparing download...', // Status message
      bulkDownloadItemsProcessed: 0, // Items processed
      bulkDownloadTotalItems: 0, // Total items
      bulkDownloadError: null, // Error message
    };
  }

  componentDidMount() {
    // Don't fetch flyers on mount to avoid loading popup
    if (this.props.closePopup1) {
      this.props.closePopup1();
    }
    // Fetch flyers for default tab (NSA)
    this.fetchFlyers('nsa');
    
    // Leave-site popup disabled
    // window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  componentWillUnmount() {
    // Remove beforeunload listener
    // window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  handleBeforeUnload = (e) => {
    if (this.state.selectedFiles.size > 0 && !this.state.promptShown) {
      e.preventDefault();
      e.returnValue = 'You have selected files for bulk download. Are you sure you want to leave?';
      this.setState({ promptShown: true });
      return e.returnValue;
    }
  }

  fetchFlyers = async (courseType, folderId = null) => {
    this.setState({ loading: true });
    try {
      const backendUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";
      
      const payload = {
        purpose: 'getFlyers'
      };

      // If navigating into a subfolder, use only the folderId
      if (folderId) {
        payload.folderId = folderId;
      } else {
        // Otherwise use courseType for root folder
        payload.courseType = courseType;
      }

      console.log('Sending payload:', payload);
      const response = await axios.post(`${backendUrl}/courses`, payload);

      if (response.data.success) {
        this.setState({
          flyers: response.data.files || [],
          loading: false
        });
      } else {
        console.error('Error fetching flyers:', response.data.message);
        this.setState({ loading: false });
      }
    } catch (error) {
      console.error('Error fetching flyers:', error);
      this.setState({ loading: false });
    }
  }

  handleTabChange = (tab) => {
    this.setState({ activeTab: tab, currentFolderId: null, breadcrumb: [], flyers: [], selectedFiles: new Set(), promptShown: false });
    this.fetchFlyers(tab);
  }

  handleFileSelect = (fileId, event, isFolder) => {
    event.stopPropagation();
    const { selectedFiles } = this.state;
    const newSelectedFiles = new Set(selectedFiles);
    if (newSelectedFiles.has(fileId)) {
      newSelectedFiles.delete(fileId);
    } else {
      newSelectedFiles.add(fileId);
    }
    this.setState({ selectedFiles: newSelectedFiles });
  }

  handleBulkDownload = () => {
    const { selectedFiles, flyers } = this.state;
    if (selectedFiles.size === 0) return;

    const backendUrl = window.location.hostname === "localhost" 
      ? "http://localhost:3001" 
      : "https://ecss-backend-node.azurewebsites.net";
    
    // Convert Set to array
    const fileIds = Array.from(selectedFiles);
    
    // Open modal and show progress
    this.setState({
      bulkDownloadModalOpen: true,
      bulkDownloadStatus: 'downloading',
      bulkDownloadMessage: 'Preparing download...',
      bulkDownloadItemsProcessed: 0,
      bulkDownloadTotalItems: fileIds.length,
      bulkDownloadError: null,
    });

    try {
      console.log(`Bulk downloading ${fileIds.length} items as ZIP`);
      
      // Update progress message
      this.setState({
        bulkDownloadMessage: `Collecting ${fileIds.length} items and creating ZIP...`,
        bulkDownloadItemsProcessed: 1,
      });

      // Download all files/folders as a single ZIP
      axios.post(`${backendUrl}/courses`, {
        purpose: 'bulkDownload',
        fileIds: fileIds
      }, {
        responseType: 'blob'
      }).then((response) => {
        // Create blob download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `bulk-download-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Update modal to show completion
        this.setState({
          bulkDownloadStatus: 'completed',
          bulkDownloadMessage: 'Download completed successfully!',
          bulkDownloadItemsProcessed: fileIds.length,
        });

        // Clear selections
        this.setState({ selectedFiles: new Set() });
        console.log('Bulk download completed');
      }).catch((error) => {
        console.error('Error bulk downloading:', error);
        this.setState({
          bulkDownloadStatus: 'error',
          bulkDownloadError: error.message || 'Failed to create bulk download. Please try again.',
        });
      });
    } catch (error) {
      console.error('Error initiating bulk download:', error);
      this.setState({
        bulkDownloadStatus: 'error',
        bulkDownloadError: error.message || 'An error occurred. Please try again.',
      });
    }
  }

  handleCloseBulkDownloadModal = () => {
    this.setState({
      bulkDownloadModalOpen: false,
      bulkDownloadStatus: 'downloading',
      bulkDownloadMessage: '',
      bulkDownloadItemsProcessed: 0,
      bulkDownloadTotalItems: 0,
      bulkDownloadError: null,
    });
  }

  handleRetryBulkDownload = () => {
    this.handleBulkDownload();
  }

  handleFolderClick = (folderFile) => {
    const { breadcrumb } = this.state;
    const newBreadcrumb = [...breadcrumb, { id: folderFile.id, name: folderFile.name }];
    
    this.setState({ 
      currentFolderId: folderFile.id,
      breadcrumb: newBreadcrumb
    });
    
    this.fetchFlyers(this.state.activeTab, folderFile.id);
  }

  handleGoBack = () => {
    const { breadcrumb, activeTab } = this.state;
    
    if (breadcrumb.length === 0) return;
    
    const newBreadcrumb = breadcrumb.slice(0, -1);
    const parentFolderId = newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1].id : null;
    
    this.setState({ 
      currentFolderId: parentFolderId,
      breadcrumb: newBreadcrumb
    });
    
    this.fetchFlyers(activeTab, parentFolderId);
  }

  handleMainClick = () => {
    const { activeTab } = this.state;
    
    this.setState({ 
      currentFolderId: null,
      breadcrumb: []
    });
    
    this.fetchFlyers(activeTab);
  }

  handleFileClick = (file) => {
    const fileId = file.webViewLink.split('/d/')[1].split('/')[0];
    
    const backendUrl = window.location.hostname === "localhost" 
      ? "http://localhost:3001" 
      : "https://ecss-backend-node.azurewebsites.net";
    
    // Download file via backend
    axios.post(`${backendUrl}/courses`, {
      purpose: 'download',
      fileId: fileId
    }, {
      responseType: 'blob'
    }).then((response) => {
      // Download silently
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }).catch((error) => {
      console.error('Error downloading file:', error);
    });
    
    // Tab: View using Google Drive link
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    window.open(viewUrl, '_blank');
  }

  handleBreadcrumbClick = (index) => {
    const { breadcrumb, activeTab } = this.state;
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    const targetFolderId = newBreadcrumb[newBreadcrumb.length - 1].id;
    
    this.setState({ 
      currentFolderId: targetFolderId,
      breadcrumb: newBreadcrumb
    });
    
    this.fetchFlyers(activeTab, targetFolderId);
  }

  render() {
    const { activeTab, flyers, loading, breadcrumb, selectedFiles } = this.state;

    return (
      <div className="course-flyers-section">
        <div className="flyers-header">
          <h1 className="flyers-title">Course Flyers</h1>
          <p className="flyers-subtitle">Browse and download available course materials and information</p>
        </div>

        <button 
          className="bulk-download-btn" 
          onClick={this.handleBulkDownload}
          disabled={selectedFiles.size <= 0}
        >
          Download
        </button>

        {/* Tab Navigation */}
        <div className="flyers-tabs">
          <button
            className={`flyers-tab ${activeTab === 'nsa' ? 'active' : ''}`}
            onClick={() => this.handleTabChange('nsa')}
          >
            NSA
          </button>
          <button
            className={`flyers-tab ${activeTab === 'ilp' ? 'active' : ''}`}
            onClick={() => this.handleTabChange('ilp')}
          >
            ILP
          </button>
        </div>

        {/* Tab Content */}
        <div className="flyers-tab-content">
          {/* Breadcrumb Navigation */}
          <div className="flyers-breadcrumb">
            <span className="breadcrumb-path">
              <button 
                className="breadcrumb-folder-btn"
                onClick={this.handleMainClick}
              >
                main
              </button>
              {breadcrumb.map((item, index) => (
                <span key={item.id} className="breadcrumb-item">
                  <span className="breadcrumb-separator"> / </span>
                  <button 
                    className="breadcrumb-folder-btn"
                    onClick={() => this.handleBreadcrumbClick(index)}
                  >
                    {item.name}
                  </button>
                </span>
              ))}
            </span>
            {breadcrumb.length > 0 && (
              <button className="breadcrumb-btn back-btn" onClick={this.handleGoBack}>
                Back
              </button>
            )}
          </div>
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading flyers...</p>
            </div>
          ) : flyers && flyers.length > 0 ? (
            <>
              <div className="flyers-grid">
                {flyers.map((file) => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                  const fileName = file.name.toLowerCase();
                  const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png');
                  const isPdf = fileName.endsWith('.pdf');
                  
                  // Generate preview URL using webViewLink (only for images)
                  let previewUrl = null;
                  if (!isFolder && isImage) {
                    // For images, use the webViewLink with export
                    previewUrl = file.webViewLink.replace('/view', '/export?gid=0');
                  }
                  
                  return (
                  <div 
                    key={file.id} 
                    className={`flyer-card ${isFolder ? 'folder-card' : 'file-card'}`}
                    onClick={isFolder ? () => this.handleFolderClick(file) : () => this.handleFileClick(file)}
                  >
                    <input 
                      type="checkbox"
                      className="file-checkbox"
                      checked={this.state.selectedFiles.has(file.id)}
                      onChange={(e) => this.handleFileSelect(file.id, e, isFolder)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {previewUrl ? (
                      <div className="flyer-card-header">
                        <div className="flyer-icon-name">
                          <div className="flyer-icon">📄</div>
                          <h3 className="flyer-name">{file.name}</h3>
                        </div>
                      </div>
                    ) : (
                      <div className="flyer-card-header">
                        <div className="flyer-icon-name">
                          <div className="flyer-icon">{isFolder ? '📁' : isPdf ? '📄' : '📄'}</div>
                          <h3 className="flyer-name">{file.name}</h3>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="no-data-state">
              <p>No flyers available for this course type.</p>
            </div>
          )}
        </div>
        <BulkDownloadProgress
          isOpen={this.state.bulkDownloadModalOpen}
          progress={Math.round((this.state.bulkDownloadItemsProcessed / Math.max(this.state.bulkDownloadTotalItems, 1)) * 100)}
          status={this.state.bulkDownloadStatus}
          itemsProcessed={this.state.bulkDownloadItemsProcessed}
          totalItems={this.state.bulkDownloadTotalItems}
          message={this.state.bulkDownloadMessage}
          error={this.state.bulkDownloadError}
          onClose={this.handleCloseBulkDownloadModal}
          onRetry={this.handleRetryBulkDownload}
        />
      </div>
    );
  }
}

export default CourseFlyers;
