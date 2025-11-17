import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/newProductPopup.css';
import UploadedImagesModal from './UploadedImagesModal';

class NewProductPopup extends Component {
    constructor(props) {
        super(props);
        this.state = {
            uploadedImages: [],
            isUploading: false,
            uploadStatus: null, // 'success', 'error', or null
            uploadMessage: '',
            uploadResults: [], // Array to track individual file upload results
            showUploadedImagesModal: false, // New state for the uploaded images modal
            // Product form fields
            productName: '',
            description: '',
            price: 0,
            stockQuantity: 0,
            category: '',
            formErrors: {},
            // Multi-step state
            currentStep: 1,
            totalSteps: 3
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

    // Validate form fields
    validateForm = () => {
        const { productName, description, price, stockQuantity, category } = this.state;
        const errors = {};

        if (!productName.trim()) {
            errors.productName = 'Product name is required';
        }

        if (!description.trim()) {
            errors.description = 'Description is required';
        }

        if (!category.trim()) {
            errors.category = 'Category is required';
        }

        if (price < 0) {
            errors.price = 'Price must be 0 or greater';
        }

        if (stockQuantity < 0) {
            errors.stockQuantity = 'Stock quantity must be 0 or greater';
        }

        this.setState({ formErrors: errors });
        return Object.keys(errors).length === 0;
    };

    // Handle form field changes
    handleFieldChange = (fieldName, value) => {
        this.setState({ 
            [fieldName]: value,
            formErrors: { ...this.state.formErrors, [fieldName]: null } // Clear error when user starts typing
        });
    };

    // Step navigation methods
    nextStep = () => {
        const { currentStep, totalSteps } = this.state;
        
        // Validate current step before proceeding
        if (this.validateCurrentStep()) {
            if (currentStep < totalSteps) {
                this.setState({ currentStep: currentStep + 1 });
            }
        }
    };

    prevStep = () => {
        const { currentStep } = this.state;
        if (currentStep > 1) {
            this.setState({ currentStep: currentStep - 1 });
        }
    };

    // Validate current step
    validateCurrentStep = () => {
        const { currentStep, productName, description } = this.state;
        const errors = {};

        switch (currentStep) {
            case 1:
                if (!productName.trim()) {
                    errors.productName = 'Product name is required';
                }
                if (!description.trim()) {
                    errors.description = 'Description is required';
                }
                break;
            case 2:
                // Images are optional, so no validation needed
                break;
            case 3:
                // Price and quantity validation will be done in final validation
                break;
            default:
                break;
        }

        this.setState({ formErrors: errors });
        return Object.keys(errors).length === 0;
    };

    // Handle create item
    handleCreateItem = () => {
        // Validate form first
        if (!this.validateForm()) {
            this.showMessage('error', 'Please fill in all required fields correctly.');
            return;
        }

        const { uploadedImages, productName, description, price, stockQuantity, category } = this.state;
        
        // Create product data object
        const productData = {
            product_name: productName,
            description: description,
            price: parseFloat(price) || 0,
            stock_quantity: parseInt(stockQuantity) || 0,
            category: category,
            image_url: uploadedImages
        };

        if (this.props.onCreateItem) {
            this.props.onCreateItem(uploadedImages, productData);
        }
        this.handleClose();
    };

    // Handle close of uploaded images modal
    handleCloseUploadedImagesModal = () => {
        this.setState({ showUploadedImagesModal: false });
    };

    // Render step content
    renderStepContent = () => {
        const { currentStep, productName, description, price, stockQuantity, category, formErrors, uploadedImages, isUploading } = this.state;

        switch (currentStep) {
            case 1:
                return this.renderStep1();
            case 2:
                return this.renderStep2();
            case 3:
                return this.renderStep3();
            default:
                return null;
        }
    };

    // Step 1: Basic Information
    renderStep1 = () => {
        const { productName, description, formErrors } = this.state;
        
        return (
            <div className="step-content">
                <div className="step-header">
                    <h4>
                        <i className="fas fa-info-circle"></i>
                        Basic Information
                    </h4>
                    <p className="step-description">Enter the basic details for your product</p>
                </div>
                
                <div className="form-content">
                    <div className="form-group full-width">
                        <label htmlFor="productName">
                            Product Name <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="productName"
                            value={productName}
                            onChange={(e) => this.handleFieldChange('productName', e.target.value)}
                            placeholder="Enter product name"
                            className={formErrors.productName ? 'error' : ''}
                        />
                        {formErrors.productName && <span className="error-message">{formErrors.productName}</span>}
                    </div>

                    <div className="form-group full-width">
                        <label htmlFor="description">
                            Description <span className="required">*</span>
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => this.handleFieldChange('description', e.target.value)}
                            placeholder="Enter product description"
                            rows="6"
                            className={formErrors.description ? 'error' : ''}
                        />
                        {formErrors.description && <span className="error-message">{formErrors.description}</span>}
                    </div>
                </div>
            </div>
        );
    };

    // Step 2: Product Images
    renderStep2 = () => {
        const { uploadedImages, isUploading } = this.state;
        
        return (
            <div className="step-content">
                <div className="step-header">
                    <h4>
                        <i className="fas fa-image"></i>
                        Product Images
                    </h4>
                    <p className="step-description">Upload images to showcase your product</p>
                </div>
                
                <div className="form-content">
                    {/* Show uploaded images if any */}
                    {uploadedImages.length > 0 && (
                        <div className="uploaded-images-preview">
                            <div className="images-count">
                                <i className="fas fa-check-circle"></i>
                                {uploadedImages.length} image(s) uploaded
                            </div>
                            <div className="image-grid">
                                {uploadedImages.map((imageUrl, index) => (
                                    <div key={index} className="image-item">
                                        <img 
                                            src={imageUrl} 
                                            alt={`Product ${index + 1}`}
                                            className="uploaded-image-preview"
                                        />
                                        <button 
                                            className="remove-image-btn"
                                            onClick={() => this.removeUploadedImage(index)}
                                            title="Remove image"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
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
            </div>
        );
    };

    // Step 3: Pricing & Inventory
    renderStep3 = () => {
        const { price, stockQuantity, category, formErrors } = this.state;
        
        return (
            <div className="step-content">
                <div className="step-header">
                    <h4>
                        <i className="fas fa-dollar-sign"></i>
                        Pricing & Inventory
                    </h4>
                    <p className="step-description">Set the price and stock information</p>
                </div>
                
                <div className="form-content">
                    <div className="form-group full-width">
                        <label htmlFor="category">
                            Category <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="category"
                            value={category}
                            onChange={(e) => this.handleFieldChange('category', e.target.value)}
                            placeholder="Enter product category"
                            className={formErrors.category ? 'error' : ''}
                        />
                        {formErrors.category && <span className="error-message">{formErrors.category}</span>}
                    </div>

                    <div className="form-group full-width">
                        <label htmlFor="price">
                            Price ($) <span className="required">*</span>
                        </label>
                        <input
                            type="number"
                            id="price"
                            value={price}
                            onChange={(e) => this.handleFieldChange('price', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={formErrors.price ? 'error' : ''}
                        />
                        {formErrors.price && <span className="error-message">{formErrors.price}</span>}
                    </div>

                    <div className="form-group full-width">
                        <label htmlFor="stockQuantity">
                            Stock Quantity <span className="required">*</span>
                        </label>
                        <input
                            type="number"
                            id="stockQuantity"
                            value={stockQuantity}
                            onChange={(e) => this.handleFieldChange('stockQuantity', e.target.value)}
                            placeholder="0"
                            min="0"
                            className={formErrors.stockQuantity ? 'error' : ''}
                        />
                        {formErrors.stockQuantity && <span className="error-message">{formErrors.stockQuantity}</span>}
                    </div>
                </div>
            </div>
        );
    };

    // Handle close
    handleClose = () => {
        this.setState({
            uploadedImages: [],
            isUploading: false,
            uploadStatus: null,
            uploadMessage: '',
            uploadResults: [],
            showUploadedImagesModal: false,
            // Reset form fields
            productName: '',
            description: '',
            price: 0,
            stockQuantity: 0,
            category: '',
            formErrors: {},
            // Reset step
            currentStep: 1
        });
        if (this.props.onClose) {
            this.props.onClose();
        }
    };

    render() {
        const { isOpen } = this.props;
        const { currentStep, totalSteps, isUploading } = this.state;
        
        if (!isOpen) return null;
        
        return (
            <div className="modal-overlay">
                <div className="new-product-modal">
                    <div className="modal-header">
                        <h3>Add New Product</h3>
                        <button 
                            className="close-btn" 
                            onClick={this.handleClose}
                            disabled={isUploading}
                        >
                            ×
                        </button>
                    </div>

                    {/* Progress Indicator */}
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            ></div>
                        </div>
                        <div className="step-indicators">
                            {[1, 2, 3].map(step => (
                                <div 
                                    key={step}
                                    className={`step-indicator ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
                                >
                                    <span className="step-number">{step}</span>
                                    <span className="step-label">
                                        {step === 1 && 'Info'}
                                        {step === 2 && 'Images'}
                                        {step === 3 && 'Pricing'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="modal-body">
                        {/* Step Content */}
                        {this.renderStepContent()}

                        {/* Status Messages */}
                        {this.state.uploadStatus && (
                            <div className={`status-message ${this.state.uploadStatus}`}>
                                <p>{this.state.uploadMessage}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="modal-footer">
                        <div className="footer-left">
                            <button 
                                className="cancel-btn" 
                                onClick={this.handleClose}
                                disabled={isUploading}
                            >
                                <i className="fas fa-times"></i>
                                Cancel
                            </button>
                        </div>

                        <div className="footer-right">
                            {/* Previous Button */}
                            {currentStep > 1 && (
                                <button 
                                    className="prev-btn" 
                                    onClick={this.prevStep}
                                    disabled={isUploading}
                                >
                                    <i className="fas fa-arrow-left"></i>
                                    Previous
                                </button>
                            )}

                            {/* View Uploaded Images Button - only show on step 2 if we have upload results */}
                            {currentStep === 2 && this.state.uploadResults.length > 0 && (
                                <button 
                                    className="view-uploaded-btn" 
                                    onClick={() => this.setState({ showUploadedImagesModal: true })}
                                    disabled={isUploading}
                                >
                                    <i className="fas fa-eye"></i> View Uploaded Images
                                </button>
                            )}

                            {/* Next/Submit Button */}
                            {currentStep < totalSteps ? (
                                <button 
                                    className="next-btn" 
                                    onClick={this.nextStep}
                                    disabled={isUploading}
                                >
                                    Next
                                    <i className="fas fa-arrow-right"></i>
                                </button>
                            ) : (
                                <button 
                                    className="create-item-btn" 
                                    onClick={this.handleCreateItem}
                                    disabled={isUploading}
                                >
                                    <i className="fas fa-plus"></i>
                                    Create Product
                                </button>
                            )}
                        </div>
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

export default NewProductPopup;