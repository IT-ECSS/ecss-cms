import React, { Component, createRef } from 'react';
import axios from 'axios';
import '../../../css/sub/inventoryModules.css';

class InventoryInvoices extends Component {
    constructor(props) {
        super(props);
        this.state = {
            folders: [],
            activeFolder: null,
            files: [],
            isLoadingFolders: true,
            isLoading: false,
            error: null,
            viewMode: 'list',
            searchQuery: '',
            sortBy: 'name',
            selectedIds: new Set(),
            downloadingFileId: null,
            downloadingZip: false,
            activeMenuId: null,
            isDragging: false,
            dragStart: null,
            dragRect: null
        };
        this.gridRef = createRef();
        this.cardRefs = {};
        this.parentFolderId = '1eaWb0DqxKJDj2_z6NxIv-vd03W0HUV1p';
    }

    async componentDidMount() {
        await this.fetchFolders();
        document.addEventListener('click', this.handleDocumentClick);
    }

    async componentDidUpdate(prevProps) {
        if (this.props.activeTab === 'invoices' && this.props.inventoryRefreshCounter !== prevProps.inventoryRefreshCounter) {
            await this.fetchFolders();
        }
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    handleDocumentClick = (e) => {
        if (this.state.activeMenuId && !e.target.closest('.gdrive-card-menu-wrapper')) {
            this.setState({ activeMenuId: null });
        }
    };

    getBackendUrl = () => {
        return window.location.hostname === "localhost" 
            ? "http://localhost:3001" 
            : "https://ecss-backend-node.azurewebsites.net";
    };

    fetchFolders = async () => {
        try {
            this.setState({ isLoadingFolders: true, error: null });
            const response = await axios.post(`${this.getBackendUrl()}/googleDrive`, {
                folderId: this.parentFolderId,
                purpose: 'listFiles'
            });

            if (response.data.success) {
                const allItems = response.data.files || [];
                const folders = allItems.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
                
                this.setState({ 
                    folders, 
                    isLoadingFolders: false,
                    activeFolder: folders.length > 0 ? folders[0].id : null
                });

                // Auto-fetch files for the first folder
                if (folders.length > 0) {
                    await this.fetchFilesForFolder(folders[0].id);
                }
            } else {
                this.setState({ error: response.data.error || 'Failed to fetch folders', isLoadingFolders: false });
            }
        } catch (error) {
            console.error('Error fetching folders:', error);
            this.setState({ error: error.message || 'An error occurred', isLoadingFolders: false });
        }
    };

    fetchFilesForFolder = async (folderId) => {
        try {
            this.setState({ isLoading: true, error: null, files: [], selectedIds: new Set(), searchQuery: '' });
            const response = await axios.post(`${this.getBackendUrl()}/googleDrive`, {
                folderId: folderId,
                purpose: 'listFiles'
            });

            if (response.data.success) {
                const files = (response.data.files || [])
                    .filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
                    .map((file, index) => ({
                    ...file,
                    sn: index + 1,
                    formattedDate: file.createdTime 
                        ? new Date(file.createdTime).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric'
                        })
                        : '',
                    formattedTime: file.createdTime
                        ? new Date(file.createdTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit', minute: '2-digit'
                        })
                        : '',
                    formattedSize: file.size 
                        ? this.formatFileSize(parseInt(file.size))
                        : '—',
                    sizeBytes: file.size ? parseInt(file.size) : 0
                }));
                this.setState({ files, isLoading: false });
            } else {
                this.setState({ error: response.data.error || 'Failed to fetch files', isLoading: false });
            }
        } catch (error) {
            console.error('Error fetching files:', error);
            this.setState({ error: error.message || 'An error occurred', isLoading: false });
        }
    };

    handleTabClick = async (folderId) => {
        if (folderId === this.state.activeFolder) return;
        this.setState({ activeFolder: folderId });
        await this.fetchFilesForFolder(folderId);
    };

    formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    getFilteredFiles = () => {
        const { files, searchQuery, sortBy } = this.state;
        let filtered = [...files];
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(f => f.name && f.name.toLowerCase().includes(query));
        }
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date': return new Date(b.createdTime || 0) - new Date(a.createdTime || 0);
                case 'size': return (b.sizeBytes || 0) - (a.sizeBytes || 0);
                default: return (a.name || '').localeCompare(b.name || '');
            }
        });
        return filtered;
    };

    getFileIcon = (fileName) => {
        if (!fileName) return 'fas fa-file';
        const ext = fileName.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf': return 'fas fa-file-pdf';
            case 'doc': case 'docx': return 'fas fa-file-word';
            case 'xls': case 'xlsx': return 'fas fa-file-excel';
            case 'png': case 'jpg': case 'jpeg': case 'gif': return 'fas fa-file-image';
            default: return 'fas fa-file-invoice';
        }
    };

    getFileIconColor = (fileName) => {
        if (!fileName) return '#5f6368';
        const ext = fileName.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf': return '#ea4335';
            case 'doc': case 'docx': return '#4285f4';
            case 'xls': case 'xlsx': return '#34a853';
            case 'png': case 'jpg': case 'jpeg': case 'gif': return '#a142f4';
            default: return '#4285f4';
        }
    };

    // --- Selection ---
    toggleSelect = (fileId, e) => {
        e.stopPropagation();
        this.setState(prev => {
            const next = new Set(prev.selectedIds);
            if (next.has(fileId)) next.delete(fileId);
            else next.add(fileId);
            return { selectedIds: next };
        });
    };

    selectAll = () => {
        const filtered = this.getFilteredFiles();
        const allSelected = filtered.every(f => this.state.selectedIds.has(f.id));
        if (allSelected) {
            this.setState({ selectedIds: new Set() });
        } else {
            this.setState({ selectedIds: new Set(filtered.map(f => f.id)) });
        }
    };

    clearSelection = () => {
        this.setState({ selectedIds: new Set() });
    };

    // --- Drag to select (grid) ---
    handleDragStart = (e) => {
        if (e.target.closest('.gdrive-card') || e.target.closest('.gdrive-card-menu-wrapper') || e.target.closest('input') || e.target.closest('button')) return;
        const gridEl = this.gridRef.current;
        if (!gridEl) return;
        const rect = gridEl.getBoundingClientRect();
        const x = e.clientX - rect.left + gridEl.scrollLeft;
        const y = e.clientY - rect.top + gridEl.scrollTop;
        this.setState({ isDragging: true, dragStart: { x, y }, dragRect: null, selectedIds: new Set() });

        const handleMove = (me) => {
            const mx = me.clientX - rect.left + gridEl.scrollLeft;
            const my = me.clientY - rect.top + gridEl.scrollTop;
            const start = this.state.dragStart;
            if (!start) return;
            const dragRect = {
                left: Math.min(start.x, mx),
                top: Math.min(start.y, my),
                width: Math.abs(mx - start.x),
                height: Math.abs(my - start.y)
            };
            this.setState({ dragRect });
            // Check intersections
            const selected = new Set();
            const filteredFiles = this.getFilteredFiles();
            filteredFiles.forEach(file => {
                const el = this.cardRefs[file.id];
                if (!el) return;
                const cardRect = el.getBoundingClientRect();
                const cardLeft = cardRect.left - rect.left + gridEl.scrollLeft;
                const cardTop = cardRect.top - rect.top + gridEl.scrollTop;
                const cardRight = cardLeft + cardRect.width;
                const cardBottom = cardTop + cardRect.height;
                if (!(dragRect.left > cardRight || dragRect.left + dragRect.width < cardLeft || dragRect.top > cardBottom || dragRect.top + dragRect.height < cardTop)) {
                    selected.add(file.id);
                }
            });
            this.setState({ selectedIds: selected });
        };

        const handleUp = () => {
            this.setState({ isDragging: false, dragRect: null, dragStart: null });
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    // --- Downloads ---
    downloadFile = async (file) => {
        try {
            this.setState({ downloadingFileId: file.id });
            const response = await axios.post(`${this.getBackendUrl()}/googleDrive/downloadFile`, 
                { fileId: file.id }, { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.name || 'download');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Failed to download file. Please try again.');
        } finally {
            this.setState({ downloadingFileId: null });
        }
    };

    downloadSelectedAsZip = async () => {
        const { selectedIds } = this.state;
        if (selectedIds.size === 0) return;

        try {
            this.setState({ downloadingZip: true });
            const fileIds = Array.from(selectedIds);
            const response = await axios.post(`${this.getBackendUrl()}/googleDrive/downloadZip`,
                { fileIds }, { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoices-receipts-${new Date().toISOString().slice(0,10)}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading ZIP:', error);
            alert('Failed to download files as ZIP. Please try again.');
        } finally {
            this.setState({ downloadingZip: false });
        }
    };

    downloadAllAsZip = async () => {
        const filteredFiles = this.getFilteredFiles();
        if (filteredFiles.length === 0) return;
        try {
            this.setState({ downloadingZip: true });
            const fileIds = filteredFiles.map(f => f.id);
            const response = await axios.post(`${this.getBackendUrl()}/googleDrive/downloadZip`,
                { fileIds }, { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoices-receipts-${new Date().toISOString().slice(0,10)}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading ZIP:', error);
            alert('Failed to download files as ZIP. Please try again.');
        } finally {
            this.setState({ downloadingZip: false });
        }
    };

    // --- Toolbar ---
    renderToolbar = () => {
        const { viewMode, searchQuery, sortBy, files, downloadingZip, selectedIds } = this.state;
        const filteredFiles = this.getFilteredFiles();
        const filteredCount = filteredFiles.length;
        const selectedCount = selectedIds.size;
        const allSelected = filteredCount > 0 && filteredFiles.every(f => selectedIds.has(f.id));

        return (
            <div className="gdrive-toolbar">
                <div className="gdrive-toolbar-left">
                    <div className="gdrive-search-wrapper">
                        <i className="fas fa-search gdrive-search-icon"></i>
                        <input
                            type="text"
                            placeholder="Search in invoices & receipts"
                            value={searchQuery}
                            onChange={(e) => this.setState({ searchQuery: e.target.value })}
                            className="gdrive-search-input"
                        />
                        {searchQuery && (
                            <i className="fas fa-times gdrive-search-clear"
                                onClick={() => this.setState({ searchQuery: '' })}></i>
                        )}
                    </div>
                </div>
                <div className="gdrive-toolbar-right">
                    <span className="gdrive-file-count">
                        {filteredCount} file{filteredCount !== 1 ? 's' : ''}
                    </span>
                    <div className="gdrive-separator"></div>
                    <select
                        value={sortBy}
                        onChange={(e) => this.setState({ sortBy: e.target.value })}
                        className="gdrive-sort-select"
                    >
                        <option value="name">Name</option>
                        <option value="date">Last modified</option>
                        <option value="size">File size</option>
                    </select>
                    <div className="gdrive-view-toggle">
                        <button className={`gdrive-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => this.setState({ viewMode: 'list' })} title="List layout">
                            <i className="fas fa-bars"></i>
                        </button>
                        <button className={`gdrive-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => this.setState({ viewMode: 'grid' })} title="Grid layout">
                            <i className="fas fa-th-large"></i>
                        </button>
                    </div>
                    <div className="gdrive-separator"></div>
                    <button className="gdrive-download-all-btn"
                        onClick={this.downloadAllAsZip}
                        disabled={downloadingZip || filteredCount === 0}
                        title="Download all as ZIP">
                        {downloadingZip && selectedCount === 0
                            ? <><i className="fas fa-spinner fa-spin"></i> Zipping...</>
                            : <><i className="fas fa-file-archive"></i> Download All</>
                        }
                    </button>
                </div>
            </div>
        );
    };

    // --- Selection bar ---
    renderSelectionBar = () => {
        const { selectedIds, downloadingZip } = this.state;
        const count = selectedIds.size;
        if (count === 0) return null;

        return (
            <div className="gdrive-selection-bar">
                <div className="gdrive-selection-bar-left">
                    <button className="gdrive-selection-clear" onClick={this.clearSelection}>
                        <i className="fas fa-times"></i>
                    </button>
                    <span className="gdrive-selection-count">
                        {count} selected
                    </span>
                </div>
                <div className="gdrive-selection-bar-right">
                    <button className="gdrive-selection-action"
                        onClick={this.downloadSelectedAsZip}
                        disabled={downloadingZip}>
                        {downloadingZip
                            ? <><i className="fas fa-spinner fa-spin"></i> Zipping...</>
                            : <><i className="fas fa-file-archive"></i> Download Selected as ZIP</>
                        }
                    </button>
                </div>
            </div>
        );
    };

    // --- List View ---
    renderListView = () => {
        const filteredFiles = this.getFilteredFiles();
        const { selectedIds, downloadingFileId } = this.state;
        const allSelected = filteredFiles.length > 0 && filteredFiles.every(f => selectedIds.has(f.id));

        if (filteredFiles.length === 0) {
            return (
                <div className="gdrive-no-results">
                    <i className="fas fa-search"></i>
                    <p>No matching files</p>
                </div>
            );
        }

        return (
            <div className="gdrive-list">
                <div className="gdrive-list-header">
                    <div className="gdrive-list-col gdrive-col-checkbox">
                        <input type="checkbox" checked={allSelected} onChange={this.selectAll}
                            className="gdrive-checkbox" title="Select all" />
                    </div>
                    <div className="gdrive-list-col gdrive-col-name">Name</div>
                    <div className="gdrive-list-col gdrive-col-date">Date created</div>
                    <div className="gdrive-list-col gdrive-col-size">File size</div>
                    <div className="gdrive-list-col gdrive-col-actions"></div>
                </div>
                <div className="gdrive-list-body">
                    {filteredFiles.map((file, index) => {
                        const isSelected = selectedIds.has(file.id);
                        return (
                            <div key={file.id || index}
                                className={`gdrive-list-row ${isSelected ? 'selected' : ''}`}
                                onClick={(e) => {
                                    if (!e.target.closest('input') && !e.target.closest('button')) {
                                        window.open(file.webViewLink, '_blank');
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="gdrive-list-col gdrive-col-checkbox">
                                    <input type="checkbox" checked={isSelected}
                                        onChange={(e) => this.toggleSelect(file.id, e)}
                                        className="gdrive-checkbox" />
                                </div>
                                <div className="gdrive-list-col gdrive-col-name">
                                    <i className={this.getFileIcon(file.name)}
                                        style={{ color: this.getFileIconColor(file.name) }}></i>
                                    <span className="gdrive-file-name">{file.name}</span>
                                </div>
                                <div className="gdrive-list-col gdrive-col-date">
                                    {file.formattedDate} {file.formattedTime}
                                </div>
                                <div className="gdrive-list-col gdrive-col-size">
                                    {file.formattedSize}
                                </div>
                                <div className="gdrive-list-col gdrive-col-actions">
                                    <button className="gdrive-action-btn"
                                        onClick={(e) => { e.stopPropagation(); this.downloadFile(file); }}
                                        disabled={downloadingFileId === file.id} title="Download">
                                        {downloadingFileId === file.id
                                            ? <i className="fas fa-spinner fa-spin"></i>
                                            : <i className="fas fa-download"></i>}
                                    </button>
                                    <button className="gdrive-action-btn"
                                        onClick={(e) => { e.stopPropagation(); window.open(file.webViewLink, '_blank'); }}
                                        title="Open in Google Drive">
                                        <i className="fas fa-external-link-alt"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- Grid View ---
    renderGridView = () => {
        const filteredFiles = this.getFilteredFiles();
        const { selectedIds, activeMenuId, downloadingFileId, dragRect } = this.state;

        if (filteredFiles.length === 0) {
            return (
                <div className="gdrive-no-results">
                    <i className="fas fa-search"></i>
                    <p>No matching files</p>
                </div>
            );
        }

        return (
            <div className="gdrive-grid" ref={this.gridRef}
                onMouseDown={this.handleDragStart}
                style={{ position: 'relative', userSelect: 'none' }}>
                {dragRect && (
                    <div className="gdrive-drag-select-box" style={{
                        left: dragRect.left, top: dragRect.top,
                        width: dragRect.width, height: dragRect.height
                    }} />
                )}
                {filteredFiles.map((file, index) => {
                    const isSelected = selectedIds.has(file.id);
                    const menuOpen = activeMenuId === file.id;
                    return (
                        <div key={file.id || index}
                            ref={el => this.cardRefs[file.id] = el}
                            className={`gdrive-card ${isSelected ? 'selected' : ''}`}
                            onClick={(e) => {
                                if (!e.target.closest('.gdrive-card-menu-wrapper') && !e.target.closest('input')) {
                                    window.open(file.webViewLink, '_blank');
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="gdrive-card-checkbox-area">
                                <input type="checkbox" checked={isSelected}
                                    onChange={(e) => this.toggleSelect(file.id, e)}
                                    className="gdrive-checkbox gdrive-card-cb" />
                            </div>
                            <div className="gdrive-card-thumbnail">
                                <i className={this.getFileIcon(file.name)}
                                    style={{ color: this.getFileIconColor(file.name) }}></i>
                            </div>
                            <div className="gdrive-card-footer">
                                <i className={this.getFileIcon(file.name)} style={{
                                    color: this.getFileIconColor(file.name),
                                    fontSize: '16px', flexShrink: 0
                                }}></i>
                                <span className="gdrive-card-title" title={file.name}>{file.name}</span>
                                <div className="gdrive-card-menu-wrapper">
                                    <button className="gdrive-card-menu-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            this.setState(prev => ({
                                                activeMenuId: prev.activeMenuId === file.id ? null : file.id
                                            }));
                                        }}>
                                        <i className="fas fa-ellipsis-v"></i>
                                    </button>
                                    {menuOpen && (
                                        <div className="gdrive-card-dropdown">
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(file.webViewLink, '_blank');
                                                this.setState({ activeMenuId: null });
                                            }}>
                                                <i className="fas fa-external-link-alt"></i> Open in Drive
                                            </button>
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                this.downloadFile(file);
                                                this.setState({ activeMenuId: null });
                                            }} disabled={downloadingFileId === file.id}>
                                                {downloadingFileId === file.id
                                                    ? <><i className="fas fa-spinner fa-spin"></i> Downloading...</>
                                                    : <><i className="fas fa-download"></i> Download</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    render() {
        const { files, isLoading, isLoadingFolders, error, viewMode, folders, activeFolder } = this.state;

        if (isLoadingFolders) {
            return (
                <>
                    <div className="inventory-heading"><h2>Inventory Billing Management</h2></div>
                    <div className="inventory-content">
                        <div className="inventory-loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Loading folders...</p>
                        </div>
                    </div>
                </>
            );
        }

        if (error && folders.length === 0) {
            return (
                <>
                    <div className="inventory-heading"><h2>Inventory Billing Management</h2></div>
                    <div className="inventory-content">
                        <div className="inventory-error">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                            <button onClick={this.fetchFolders} className="retry-btn">
                                <i className="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="inventory-heading"><h2>Inventory Billing Management</h2></div>
                <div className="inventory-content">
                    {folders.length > 0 && (
                        <div className="records-sub-tabs">
                            {folders.map(folder => (
                                <button
                                    key={folder.id}
                                    className={`records-sub-tab ${activeFolder === folder.id ? 'active' : ''}`}
                                    onClick={() => this.handleTabClick(folder.id)}
                                >
                                    <i className="fas fa-folder" style={{ marginRight: '8px' }}></i>
                                    {folder.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="inventory-loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Loading files...</p>
                        </div>
                    ) : error ? (
                        <div className="inventory-error">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                            <button onClick={() => this.fetchFilesForFolder(activeFolder)} className="retry-btn">
                                <i className="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="inventory-empty-state">
                            <i className="fas fa-file-invoice"></i>
                            <h3>No Files Found</h3>
                            <p>No files have been uploaded to this folder yet.</p>
                        </div>
                    ) : (
                        <div className="gdrive-container">
                            {this.renderToolbar()}
                            {this.renderSelectionBar()}
                            <div className="gdrive-body">
                                {viewMode === 'grid' ? this.renderGridView() : this.renderListView()}
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }
}

export default InventoryInvoices;
