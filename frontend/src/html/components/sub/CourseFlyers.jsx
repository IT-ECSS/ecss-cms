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
      apiError: null, // Track API errors for display
      showCourseTypeDropdown: false, // Show/hide course type dropdown
      locationInput: '', // Location combobox input
      locationOptions: [], // Available locations
      filteredLocationOptions: [], // Filtered location options
      showLocationDropdown: false, // Show/hide location dropdown
    };
    this.courseTypeDropdownRef = React.createRef();
    this.locationDropdownRef = React.createRef();
  }

  componentDidMount() {
    // Don't fetch flyers on mount to avoid loading popup
    if (this.props.closePopup1) {
      this.props.closePopup1();
    }
    // Fetch flyers for default tab based on role
    const defaultCourseType = this.getFilteredCourseTypes()[0];
    this.setState({ activeTab: defaultCourseType });
    this.fetchFlyers(defaultCourseType);
    
    // Add click outside listener
    document.addEventListener('mousedown', this.handleClickOutside);
    
    // Leave-site popup disabled
    // window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  componentWillUnmount() {
    // Remove click outside listener
    document.removeEventListener('mousedown', this.handleClickOutside);
    // Remove beforeunload listener
    // window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  getFilteredCourseTypes = () => {
    const { role } = this.props;
    // NSA in-charge: NSA only
    if (role === 'NSA in-charge') {
      return ['nsa'];
    }
    // Site in-charge & Ops in-charge: NSA, ILP, SCC
    if (role === 'Site in-charge' || role === 'Ops in-charge') {
      return ['nsa', 'ilp', 'scc'];
    }
    // Social Worker: SCC only
    if (role === 'Social Worker') {
      return ['scc'];
    }
    // Default for other roles: NSA, ILP, SCC
    return ['nsa', 'ilp', 'scc'];
  }

  getCourseTypeLabel = (type) => {
    const labels = {
      'nsa': 'NSA',
      'ilp': 'ILP',
      'scc': 'SCC'
    };
    return labels[type] || type.toUpperCase();
  }

  handleBeforeUnload = (e) => {
    if (this.state.selectedFiles.size > 0 && !this.state.promptShown) {
      e.preventDefault();
      e.returnValue = 'You have selected files for bulk download. Are you sure you want to leave?';
      this.setState({ promptShown: true });
      return e.returnValue;
    }
  }

  getAssignedLocations = () => {
    const { role, siteIC } = this.props;
    
    // Site in-charge: only access their assigned site location
    if (role === 'Site in-charge' && siteIC) {
      // siteIC can be a string or array
      if (Array.isArray(siteIC)) {
        return siteIC.map(site => site.toLowerCase());
      }
      return [siteIC.toLowerCase()];
    }
    
    // Other roles have no location restrictions
    return null;
  }

  isLocationAllowed = (itemName) => {
    const assignedLocations = this.getAssignedLocations();
    
    // No restrictions for other roles
    if (!assignedLocations) {
      return true;
    }
    
    const lowerName = (itemName || '').toLowerCase();
    
    // Check if item name contains any of the assigned locations
    return assignedLocations.some(location => lowerName.includes(location));
  }

  fetchFlyers = async (courseType, folderId = null) => {
    this.setState({ loading: true, apiError: null });
    try {
      const backendUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";
      
      const payload = {
        purpose: 'getFlyers',
        courseType: courseType
      };

      // If navigating into a subfolder, also include the folderId
      if (folderId) {
        payload.folderId = folderId;
      }

      console.log('Sending payload:', payload);
      const response = await axios.post(`${backendUrl}/courses`, payload);

      if (response.data.success) {
        // Combine folders and files into a single array
        const folders = response.data.folders || [];
        const files = response.data.files || [];
        let combinedFlyers = [...folders, ...files];
        
        console.log(`Fetched ${folders.length} folders and ${files.length} files`);
        console.log('Folders:', folders);
        console.log('Files:', files);
        
        // Filter based on user's assigned location only at specific depths:
        // - NSA: filter at sub-sub-sub level (breadcrumb.length === 2, showing locations)
        // - ILP: filter at sub-sub level (breadcrumb.length === 1, showing locations)
        // - SCC: no filter
        const { role } = this.props;
        const { breadcrumb } = this.state;
        let shouldFilter = false;
        
        if (role === 'Site in-charge') {
          if (courseType === 'nsa' && breadcrumb && breadcrumb.length === 2) {
            // NSA: filter at third level (showing locations)
            shouldFilter = true;
          } else if (courseType === 'ilp' && breadcrumb && breadcrumb.length === 2) {
            // ILP: filter at second level (showing locations)
            shouldFilter = true;
          }
        }
        
        if (shouldFilter) {
          combinedFlyers = combinedFlyers.filter(item => this.isLocationAllowed(item.name));
          console.log(`Filtered to ${combinedFlyers.length} items based on Site in-charge location access`);
        }
        
        // Extract unique locations from folder/file names
        const locationSet = new Set();
        combinedFlyers.forEach(item => {
          // Extract location from item name if it contains location indicators
          const name = (item.name || '').toLowerCase();
          if (name.includes('tampines')) locationSet.add('Tampines');
          if (name.includes('pasir ris')) locationSet.add('Pasir Ris');
          if (name.includes('ct hub')) locationSet.add('CT Hub');
          if (name.includes('online')) locationSet.add('Online');
        });
        
        const locationOptions = Array.from(locationSet).sort();
        
        this.setState({
          flyers: combinedFlyers,
          loading: false,
          apiError: null,
          locationOptions: locationOptions,
          filteredLocationOptions: locationOptions
        });
      } else {
        const errorMsg = response.data.message || `Failed to load files for ${courseType}`;
        console.error('Error fetching flyers:', errorMsg);
        this.setState({ 
          loading: false,
          apiError: errorMsg,
          flyers: []
        });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load course materials';
      console.error('Error fetching flyers:', error);
      this.setState({ 
        loading: false,
        apiError: errorMsg,
        flyers: []
      });
    }
  }

  handleTabChange = (tab) => {
    // Validate that the tab is allowed for this role
    const allowedTabs = this.getFilteredCourseTypes();
    if (!allowedTabs.includes(tab)) {
      console.warn(`Tab ${tab} is not allowed for this role`);
      return;
    }
    this.setState({ activeTab: tab, currentFolderId: null, breadcrumb: [], flyers: [], selectedFiles: new Set(), promptShown: false, apiError: null });
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

  handleSearchChange = (event) => {
    this.setState({ searchQuery: event.target.value });
  }

  handleDropdownToggle = () => {
    this.setState(prevState => ({
      showCourseTypeDropdown: !prevState.showCourseTypeDropdown
    }));
  }

  handleClickOutside = (event) => {
    if (
      this.courseTypeDropdownRef.current &&
      !this.courseTypeDropdownRef.current.contains(event.target)
    ) {
      this.setState({ showCourseTypeDropdown: false });
    }
    if (
      this.locationDropdownRef.current &&
      !this.locationDropdownRef.current.contains(event.target)
    ) {
      this.setState({ showLocationDropdown: false });
    }
  }

  handleClearFilters = () => {
    const defaultCourseType = this.getFilteredCourseTypes()[0];
    this.setState({
      searchQuery: '',
      activeTab: defaultCourseType,
      currentFolderId: null,
      breadcrumb: [],
      selectedFiles: new Set(),
      showCourseTypeDropdown: false,
      locationInput: '',
      filteredLocationOptions: this.state.locationOptions,
      showLocationDropdown: false
    }, () => {
      this.fetchFlyers(defaultCourseType);
    });
  }

  handleLocationInputChange = (event) => {
    const input = event.target.value;
    const filtered = this.state.locationOptions.filter(loc =>
      loc.toLowerCase().includes(input.toLowerCase())
    );
    this.setState({
      locationInput: input,
      filteredLocationOptions: filtered,
      showLocationDropdown: true
    });
  }

  handleLocationSelect = (location) => {
    this.setState({
      locationInput: location,
      showLocationDropdown: false,
      filteredLocationOptions: this.state.locationOptions
    });
  }

  handleLocationDropdownToggle = () => {
    this.setState(prevState => ({
      showLocationDropdown: !prevState.showLocationDropdown,
      filteredLocationOptions: !prevState.showLocationDropdown ? this.state.locationOptions : []
    }));
  }

  render() {
    const { activeTab, flyers, loading, breadcrumb, selectedFiles, apiError, searchQuery, showCourseTypeDropdown, locationInput, showLocationDropdown, filteredLocationOptions } = this.state;

    return (
      <div className="course-flyers-section">
        <div className="flyers-header">
          <h1 className="flyers-title">Course Flyers</h1>
          <p className="flyers-subtitle">Browse and download available course materials and information</p>
        </div>

        {/* Instructions Section */}
        <div style={{
          backgroundColor: '#e7f3ff',
          border: '1px solid #91d5ff',
          borderRadius: '4px',
          padding: '15px 20px',
          marginBottom: '30px',
          fontSize: '14px',
          color: '#003a8c',
          lineHeight: '1.6',
          width: '100%',
          clear: 'both'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Instructions - Individual file and bulk download:</p>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Select a course type from the tabs above</li>
            <li>Navigate through folders by clicking on them</li>
            <li><strong>Individual download:</strong> Click on a file to download it individually</li>
            <li><strong>Bulk download:</strong> Check the checkbox next to files or folders, then click the Download button to download all selected items as a ZIP file</li>
          </ul>
        </div>

        {/* Download Button */}
        <div style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'center', clear: 'both' }}>
          <button 
            className="bulk-download-btn" 
            onClick={this.handleBulkDownload}
            disabled={selectedFiles.size <= 0}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedFiles.size <= 0 ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedFiles.size <= 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            Download {selectedFiles.size > 0 && `(${selectedFiles.size})`}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flyers-tabs">
          {this.getFilteredCourseTypes().map(type => (
            <button
              key={type}
              className={`flyers-tab ${activeTab === type ? 'active' : ''}`}
              onClick={() => this.handleTabChange(type)}
            >
              {this.getCourseTypeLabel(type)}
            </button>
          ))}
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
          ) : apiError ? (
            <div className="error-state" style={{
              padding: '20px',
              margin: '20px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              color: '#c33'
            }}>
              <p><strong>Error loading materials:</strong></p>
              <p>{apiError}</p>
              <button 
                onClick={() => this.handleTabChange(activeTab)}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#c33',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
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
                    style={{
                      cursor: 'pointer',
                      opacity: 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input 
                      type="checkbox"
                      className="file-checkbox"
                      checked={this.state.selectedFiles.has(file.id)}
                      onChange={(e) => this.handleFileSelect(file.id, e, isFolder)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flyer-card-header">
                      <div className="flyer-icon-name">
                        <div className="flyer-icon" style={{ fontSize: '2.5rem' }}>
                          {isFolder ? '📁' : isPdf ? '📄' : isImage ? '🖼️' : '📋'}
                        </div>
                        <h3 className="flyer-name">{file.name}</h3>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          ) : null}
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
