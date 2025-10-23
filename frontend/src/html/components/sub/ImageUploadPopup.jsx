import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/imageUploadPopup.css';
import UploadedImagesModal from './UploadedImagesModal';

class ImageUploadPopup extends Component {
    constructor(props) {
        super(props);
        this.state = {
            uploadedImages: [],
            isUploading: false,
            uploadStatus: null, // 'success', 'error', or null
            uploadMessage: '',
            uploadResults: [], // Array to track individual file upload results
            showUploadedImagesModal: false // New state for the uploaded images modal
        };
    }

    // Handle file drop
    handleFileDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = Array.from(e.dataTransfer.files);
        
        // Validate that files were dropped
        if (files.length === 0) {
            this.showMessage('warning', 'No files were dropped. Please try again.');
            return;
        }
        
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        const nonImageFiles = files.filter(file => !file.type.startsWith('image/'));
        
        // Show warning for non-image files
        if (nonImageFiles.length > 0) {
            const nonImageNames = nonImageFiles.map(f => f.name).join(', ');
            this.showMessage('warning', `Skipped non-image files: ${nonImageNames}`);
        }
        
        if (imageFiles.length > 0) {
            this.showMessage('success', `${imageFiles.length} image file(s) selected for upload.`);
            this.uploadImagesToWordPress(imageFiles);
        } else {
            this.showMessage('error', 'Please drop only image files (JPEG, PNG, GIF, WebP).');
        }
    };

    // Handle file input change
    handleFileInputChange = (e) => {
        const files = Array.from(e.target.files);
        
        // Validate that files were selected
        if (files.length === 0) {
            this.showMessage('warning', 'No files were selected. Please try again.');
            return;
        }
        
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        const nonImageFiles = files.filter(file => !file.type.startsWith('image/'));
        
        // Show warning for non-image files
        if (nonImageFiles.length > 0) {
            const nonImageNames = nonImageFiles.map(f => f.name).join(', ');
            this.showMessage('warning', `Skipped non-image files: ${nonImageNames}`);
        }
        
        if (imageFiles.length > 0) {
            this.showMessage('success', `${imageFiles.length} image file(s) selected for upload.`);
            this.uploadImagesToWordPress(imageFiles);
        } else {
            this.showMessage('error', 'Please select only image files (JPEG, PNG, GIF, WebP).');
        }
        
        // Reset the file input
        e.target.value = '';
    };

    // Show success or error message
    showMessage = (type, message) => {
        this.setState({
            uploadStatus: type,
            uploadMessage: message
        });

        // Auto-hide message after 5 seconds
        setTimeout(() => {
            this.setState({
                uploadStatus: null,
                uploadMessage: ''
            });
        }, 5000);
    };

    // Upload images to WordPress
    uploadImagesToWordPress = async (files) => {
        this.setState({ 
            isUploading: true,
            uploadStatus: null,
            uploadMessage: '',
            uploadResults: []
        });
        
        // Initial validation
        const validFiles = [];
        const invalidFiles = [];
        
        files.forEach(file => {
            // Check file size (2MB limit)
            const maxSize = 2 * 1024 * 1024; // 2MB
            if (file.size > maxSize) {
                invalidFiles.push({
                    filename: file.name,
                    error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 2MB limit`
                });
            } else if (!file.type.startsWith('image/')) {
                invalidFiles.push({
                    filename: file.name,
                    error: 'Not a valid image file'
                });
            } else {
                validFiles.push(file);
            }
        });
        
        // Show validation results
        if (invalidFiles.length > 0) {
            const errorMessages = invalidFiles.map(f => `${f.filename}: ${f.error}`).join('\n');
            this.showMessage('error', `Validation failed for ${invalidFiles.length} file(s):\n${errorMessages}`);
        }
        
        if (validFiles.length === 0) {
            this.setState({ isUploading: false });
            return;
        }
        
        // Show progress message
        this.showMessage('success', `Starting upload for ${validFiles.length} valid file(s)...`);
        
        try {
            const uploadResults = [];
            const successfulUploads = [];
            
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i];
                
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const baseUrl = window.location.hostname === "localhost" 
                        ? "http://localhost:3002" 
                        : "https://ecss-backend-django.azurewebsites.net";
                    
                    const response = await axios.post(`${baseUrl}/upload-product-image/`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    
                    if (response.data.success && response.data.image_url) {
                        successfulUploads.push(response.data.image_url);
                        uploadResults.push({
                            filename: file.name,
                            success: true,
                            url: response.data.image_url,
                            media_id: response.data.media_id
                        });
                    } else {
                        uploadResults.push({
                            filename: file.name,
                            success: false,
                            error: response.data.error || 'Upload failed'
                        });
                    }
                } catch (error) {
                    console.error(`Error uploading ${file.name}:`, error);
                    uploadResults.push({
                        filename: file.name,
                        success: false,
                        error: error.response?.data?.error || error.message || 'Upload failed'
                    });
                }
            }
            
            // Update state with results
            this.setState(prevState => ({
                uploadedImages: [...prevState.uploadedImages, ...successfulUploads],
                isUploading: false,
                uploadResults: uploadResults
            }));

            // Show summary message
            const successCount = uploadResults.filter(r => r.success).length;
            const failCount = uploadResults.filter(r => !r.success).length;
            
            if (successCount > 0 && failCount === 0) {
                this.showMessage('success', `Successfully uploaded ${successCount} image(s) to WordPress Media Library!`);
                // Automatically show the uploaded images modal after successful upload
                setTimeout(() => {
                    this.setState({ showUploadedImagesModal: true });
                }, 1000); // Small delay to let users see the success message
            } else if (successCount > 0 && failCount > 0) {
                this.showMessage('warning', `Uploaded ${successCount} image(s) successfully, but ${failCount} failed.`);
                // Show modal even with partial success
                setTimeout(() => {
                    this.setState({ showUploadedImagesModal: true });
                }, 1000);
            } else {
                this.showMessage('error', `Failed to upload ${failCount} image(s). Please check file sizes and try again.`);
            }
            
        } catch (error) {
            console.error('Error during upload process:', error);
            this.setState({ 
                isUploading: false,
                uploadResults: []
            });
            this.showMessage('error', 'Failed to upload images. Please try again.');
        }
    };

    // Remove uploaded image
    removeUploadedImage = (index) => {
        this.setState(prevState => ({
            uploadedImages: prevState.uploadedImages.filter((_, i) => i !== index)
        }));
    };

    // Handle create item
    handleCreateItem = () => {
        const { uploadedImages } = this.state;
        if (this.props.onCreateItem) {
            this.props.onCreateItem(uploadedImages);
        }
        this.handleClose();
    };

    // Handle close of uploaded images modal
    handleCloseUploadedImagesModal = () => {
        this.setState({ showUploadedImagesModal: false });
    };

    // Handle close
    handleClose = () => {
        this.setState({
            uploadedImages: [],
            isUploading: false,
            uploadStatus: null,
            uploadMessage: '',
            uploadResults: [],
            showUploadedImagesModal: false
        });
        if (this.props.onClose) {
            this.props.onClose();
        }
    };

    render() {
        const { isOpen } = this.props;
        const { uploadedImages, isUploading } = this.state;
        
        if (!isOpen) return null;
        
        return (
            <div className="modal-overlay">
                <div className="image-upload-modal">
                    <div className="modal-header">
                        <h3>Upload Product Images</h3>
                        <button 
                            className="close-btn" 
                            onClick={this.handleClose}
                            disabled={isUploading}
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className="modal-body"> 
                        {/* Upload Area */}
                        <div 
                            className={`drag-drop-area ${isUploading ? 'uploading' : ''}`}
                            onDrop={this.handleFileDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnter={(e) => e.preventDefault()}
                        >
                            {isUploading ? (
                                <div className="upload-spinner">
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <p>Uploading images to WordPress...</p>
                                </div>
                            ) : (
                                <>
                                    <i className="fas fa-cloud-upload-alt"></i>
                                    <p>Drag and drop images here</p>
                                    <p className="size-limit">Maximum file size: 2MB per image</p>
                                    <p>or</p>
                                    <label className="file-input-label">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={this.handleFileInputChange}
                                            style={{ display: 'none' }}
                                            disabled={isUploading}
                                        />
                                        Click to browse files
                                    </label>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button 
                            className="cancel-btn" 
                            onClick={this.handleClose}
                            disabled={isUploading}
                        >
                            Cancel
                        </button>
                        
                        {/* View Uploaded Images Button - only show if we have upload results */}
                        {this.state.uploadResults.length > 0 && (
                            <button 
                                className="view-uploaded-btn" 
                                onClick={() => this.setState({ showUploadedImagesModal: true })}
                                disabled={isUploading}
                            >
                                <i className="fas fa-eye"></i> View Uploaded Images
                            </button>
                        )}
                        
                        <button 
                            className="create-item-btn" 
                            onClick={this.handleCreateItem}
                            disabled={uploadedImages.length === 0 || isUploading}
                        >
                            Create Item ({uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''})
                        </button>
                    </div>
                </div>
                
                {/* Uploaded Images Modal */}
                <UploadedImagesModal
                    isOpen={this.state.showUploadedImagesModal}
                    onClose={this.handleCloseUploadedImagesModal}
                    uploadedImages={this.state.uploadedImages}
                    uploadResults={this.state.uploadResults}
                />
            </div>
        );
    }
}

export default ImageUploadPopup;