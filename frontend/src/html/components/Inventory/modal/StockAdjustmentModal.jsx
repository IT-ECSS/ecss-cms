import React, { Component } from 'react';
import './StockAdjustmentModal.css';
import { ALL_STOCK_ACTIONS } from '../inventoryUtils';
import { hasColorVariations } from '../searchFilter/StockFilterUtils';
import {
    getFilteredProducts,
    getProductVariants,
    getFilteredLocations,
    getActionLocationConfig,
    getProductLocationConfig,
    SITE_LOCATIONS
} from '../searchFilter/StockAdjustmentUtils';

class StockAdjustmentModal extends Component {
    constructor(props) {
        super(props);
        
        // Dropdown refs
        this.actionDropdownRef = React.createRef();
        this.productDropdownRef = React.createRef();
        this.variantDropdownRef = React.createRef();
        this.locationFromDropdownRef = React.createRef();
        this.locationToDropdownRef = React.createRef();
        this.fileInputRef = React.createRef();

        this.state = {
            actionDropdownOpen: false,
            productDropdownOpen: false,
            variantDropdownOpen: false,
            locationFromDropdownOpen: false,
            locationToDropdownOpen: false,
            isDragging: false,
            uploadedFile: null,
            validationErrors: {}
        };
    }

    componentDidMount() {
        document.addEventListener('mousedown', this.handleDocumentClick);
    }

    validateForm = (formData) => {
        const errors = {};
        const { inventoryProducts = [] } = this.props;

        // Check required fields
        // Check required fields, but skip validation for disabled fields
        if (!formData.action || formData.action.trim() === '') {
            errors.action = 'Action is required';
        }
        if (!formData.product || formData.product.trim() === '') {
            errors.product = 'Product is required';
        }
        if (hasColorVariations(formData.product, inventoryProducts) && (!formData.variant || formData.variant.trim() === '')) {
            errors.variant = 'Variant is required';
        }

        // Skip validation for Location From if disabled
        if (!this.isLocationFromFixed || typeof this.isLocationFromFixed !== 'function' || !this.isLocationFromFixed(formData.action)) {
            if (!formData.locationFrom || formData.locationFrom.trim() === '') {
                errors.locationFrom = 'Location From is required';
            }
        }

        // Skip validation for Location To if disabled
        if (!this.isLocationToFixed || typeof this.isLocationToFixed !== 'function' || !this.isLocationToFixed(formData.action)) {
            if (!formData.locationTo || formData.locationTo.trim() === '') {
                errors.locationTo = 'Location To is required';
            }
        }

        if (!formData.date || formData.date.trim() === '') {
            errors.date = 'Date is required';
        }
        if (!formData.time || formData.time.trim() === '') {
            errors.time = 'Time is required';
        }
        if (!formData.quantity || formData.quantity.trim() === '') {
            errors.quantity = 'Quantity is required';
        }
        if (!formData.updatedBy || formData.updatedBy.trim() === '') {
            errors.updatedBy = 'Updated By is required';
        }
        // Reason is optional, so no validation needed

        this.setState({ validationErrors: errors });
        return Object.keys(errors).length === 0;
    };


    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleDocumentClick);
    }

    handleDocumentClick = (e) => {
        if (this.actionDropdownRef.current && !this.actionDropdownRef.current.contains(e.target)) {
            this.setState({ actionDropdownOpen: false });
        }
        if (this.productDropdownRef.current && !this.productDropdownRef.current.contains(e.target)) {
            this.setState({ productDropdownOpen: false });
        }
        if (this.variantDropdownRef.current && !this.variantDropdownRef.current.contains(e.target)) {
            this.setState({ variantDropdownOpen: false });
        }
        if (this.locationFromDropdownRef.current && !this.locationFromDropdownRef.current.contains(e.target)) {
            this.setState({ locationFromDropdownOpen: false });
        }
        if (this.locationToDropdownRef.current && !this.locationToDropdownRef.current.contains(e.target)) {
            this.setState({ locationToDropdownOpen: false });
        }
    };

    handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragging: true });
    };

    handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragging: false });
    };

    handleFileDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ isDragging: false });
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            this.setState({ uploadedFile: file });
            if (this.props.onFileSelected) {
                this.props.onFileSelected(file);
            }
        }
    };

    handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            this.setState({ uploadedFile: file });
            if (this.props.onFileSelected) {
                this.props.onFileSelected(file);
            }
        }
    };

    handleActionSelect = (opt) => {
        const { formData, onFormChange } = this.props;
        const { inventoryProducts = [] } = this.props;
        
        onFormChange('action', opt);
        onFormChange('reason', '');
        onFormChange('variant', '');
        
        // Get location configuration for this action
        const locationConfig = getActionLocationConfig(opt, formData.product, inventoryProducts);
        onFormChange('locationFrom', locationConfig.locationFrom);
        onFormChange('locationTo', locationConfig.locationTo);
        
        this.setState({ actionDropdownOpen: false });
    };

    handleProductSelect = (name) => {
        const { formData, onFormChange } = this.props;
        const { inventoryProducts = [] } = this.props;
        
        onFormChange('product', name);
        onFormChange('variant', '');
        
        // Get location configuration for this product with current action
        const locationConfig = getProductLocationConfig(name, formData.action, inventoryProducts);
        Object.entries(locationConfig).forEach(([key, value]) => {
            onFormChange(key, value);
        });
        
        this.setState({ productDropdownOpen: false });
    };

    handleFormSubmit = (e) => {
        const { formData, onSubmit } = this.props;
        
        e.preventDefault();
        
        // Validate form before submitting
        if (this.validateForm(formData)) {
            // Clear validation errors and proceed with submission
            this.setState({ validationErrors: {} });
            if (onSubmit) {
                onSubmit(e);
            }
        } else {
            // Scroll to the first field with an error
            setTimeout(() => {
                const fieldOrder = ['action', 'product', 'variant', 'locationFrom', 'locationTo', 'date', 'time', 'quantity', 'updatedBy'];
                const firstErrorField = fieldOrder.find(field => this.state.validationErrors[field]);
                
                if (firstErrorField) {
                    // Find the label element for the field and scroll to it
                    const labels = Array.from(document.querySelectorAll('.stock-modal-field label'));
                    const label = labels.find(l => l.textContent.includes(
                        firstErrorField === 'action' ? 'Action' :
                        firstErrorField === 'product' ? 'Product' :
                        firstErrorField === 'variant' ? 'Variant' :
                        firstErrorField === 'locationFrom' ? 'Location From' :
                        firstErrorField === 'locationTo' ? 'Location To' :
                        firstErrorField === 'date' ? 'Date' :
                        firstErrorField === 'time' ? 'Time' :
                        firstErrorField === 'quantity' ? 'Quantity' :
                        firstErrorField === 'updatedBy' ? 'Updated By' : ''
                    ));
                    
                    if (label) {
                        label.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
        }
    };

    isLocationFromFixed = (action) => {
        // Determine if Location From has a fixed value based on action
        return action === 'Initial Stock' || action === 'Purchase From Supplier' || action === 'Return to Supplier' || action === 'Allocation To Site';
    };

    isLocationToFixed = (action) => {
        // Determine if Location To has a fixed value based on action
        return action === 'Purchase From Supplier' || action === 'Return to Supplier' || action === 'Return Stock to Store';
    };

    render() {
        const {
            isOpen,
            onClose,
            onSubmit,
            formData,
            onFormChange,
            isSubmitting,
            inventoryProducts = []
        } = this.props;

        const {
            actionDropdownOpen,
            productDropdownOpen,
            variantDropdownOpen,
            locationFromDropdownOpen,
            locationToDropdownOpen,
            isDragging,
            uploadedFile
        } = this.state;

        if (!isOpen) return null;

        return (
            <div className="stock-modal-overlay" onClick={onClose}>
                <div className="stock-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="stock-modal-header">
                        <h3>Stock Adjustment</h3>
                    </div>
                    <div className="stock-modal-body">
                        <form id="incoming-stock-form" className="stock-modal-form" onSubmit={this.handleFormSubmit} noValidate>
                            <div className="stock-modal-field">
                                <label>Action <span style={{ color: '#e74c3c' }}>*</span></label>
                                <div className="incoming-dropdown" ref={this.actionDropdownRef}>
                                    <input
                                        type="text"
                                        className="incoming-dropdown-input"
                                        value={formData.action}
                                        onFocus={() => this.setState({ actionDropdownOpen: true })}
                                        readOnly
                                        style={{ cursor: 'pointer', borderColor: this.state.validationErrors.action ? '#e74c3c' : '' }}
                                        placeholder="Please select one"
                                    />
                                    {actionDropdownOpen && (
                                        <ul className="incoming-dropdown-list">
                                            {ALL_STOCK_ACTIONS.map((item, idx) => {
                                                if (item.type === 'divider') {
                                                    return <li key={`div-${idx}`} className="incoming-dropdown-divider" />;
                                                }
                                                const opt = item.label;
                                                return (
                                                    <li key={idx} className="incoming-dropdown-item" onClick={() => this.handleActionSelect(opt)}>
                                                        {opt}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                                {this.state.validationErrors.action && (
                                    <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                        {this.state.validationErrors.action}
                                    </div>
                                )}
                            </div>

                            {formData.action === 'Purchase From Supplier' && (
                                <div className="stock-modal-field">
                                    <label>Upload Document</label>
                                    <div
                                        className={`stock-upload-dropzone${isDragging ? ' dragging' : ''}`}
                                        onDrop={this.handleFileDrop}
                                        onDragOver={this.handleDragOver}
                                        onDragLeave={this.handleDragLeave}
                                        onClick={() => this.fileInputRef.current && this.fileInputRef.current.click()}
                                        style={{
                                            border: '2px dashed #ccc',
                                            borderRadius: '8px',
                                            padding: '20px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            backgroundColor: isDragging ? '#e8f4fd' : '#fafafa',
                                            transition: 'background-color 0.2s',
                                            borderColor: isDragging ? '#2196F3' : '#ccc'
                                        }}
                                    >
                                        <input
                                            type="file"
                                            ref={this.fileInputRef}
                                            onChange={this.handleFileSelect}
                                            style={{ display: 'none' }}
                                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                                        />
                                        {uploadedFile ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                <i className="fas fa-file" style={{ color: '#2196F3', fontSize: '1.2rem' }}></i>
                                                <span style={{ fontWeight: '500' }}>{uploadedFile.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        this.setState({ uploadedFile: null });
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#e74c3c',
                                                        cursor: 'pointer',
                                                        fontSize: '1.1rem',
                                                        padding: '2px 6px'
                                                    }}
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: '#aaa', marginBottom: '8px' }}></i>
                                                <p style={{ margin: '0', color: '#888', fontSize: '0.9rem' }}>Drag & drop a file here, or click to browse</p>
                                                <p style={{ margin: '4px 0 0', color: '#bbb', fontSize: '0.8rem' }}>PDF, Images, Word, Excel</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="stock-modal-field">
                                <label>Product <span style={{ color: '#e74c3c' }}>*</span></label>
                                <div className="incoming-dropdown" ref={this.productDropdownRef}>
                                    <input
                                        type="text"
                                        className="incoming-dropdown-input"
                                        value={formData.product}
                                        onChange={(e) => {
                                            onFormChange('product', e.target.value);
                                            this.setState({ productDropdownOpen: true });
                                        }}
                                        onFocus={() => this.setState({ productDropdownOpen: true })}
                                        placeholder="Enter product"
                                        style={{ borderColor: this.state.validationErrors.product ? '#e74c3c' : '' }}
                                    />
                                    {productDropdownOpen && getFilteredProducts(formData.product, inventoryProducts).length > 0 && (
                                        <ul className="incoming-dropdown-list">
                                            {getFilteredProducts(formData.product, inventoryProducts).map((name, idx) => (
                                                <li key={idx} className="incoming-dropdown-item" onClick={() => this.handleProductSelect(name)}>
                                                    {name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {this.state.validationErrors.product && (
                                    <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                        {this.state.validationErrors.product}
                                    </div>
                                )}
                            </div>

                            {hasColorVariations(formData.product, inventoryProducts) && (
                                <div className="stock-modal-field">
                                    <label>Variant <span style={{ color: '#e74c3c' }}>*</span></label>
                                    <div className="incoming-dropdown" ref={this.variantDropdownRef}>
                                        <input
                                            type="text"
                                            className="incoming-dropdown-input"
                                            value={formData.variant}
                                            onFocus={() => this.setState({ variantDropdownOpen: true })}
                                            readOnly
                                            style={{ cursor: 'pointer', borderColor: this.state.validationErrors.variant ? '#e74c3c' : '' }}
                                            placeholder="Select variant"
                                        />
                                        {variantDropdownOpen && (
                                            <ul className="incoming-dropdown-list">
                                                {getProductVariants(formData.product, inventoryProducts).map((v, idx) => (
                                                    <li key={idx} className="incoming-dropdown-item" onClick={() => {
                                                        onFormChange('variant', v);
                                                        this.setState({ variantDropdownOpen: false });
                                                    }}>
                                                        {v}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    {this.state.validationErrors.variant && (
                                        <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                            {this.state.validationErrors.variant}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="stock-modal-field">
                                <label>Location From <span style={{ color: '#e74c3c' }}>*</span></label>
                                <div className="incoming-dropdown" ref={this.locationFromDropdownRef}>
                                    <input
                                        type="text"
                                        className="incoming-dropdown-input"
                                        value={formData.locationFrom}
                                        onFocus={() => !this.isLocationFromFixed(formData.action) && this.setState({ locationFromDropdownOpen: true })}
                                        readOnly
                                        disabled={this.isLocationFromFixed(formData.action)}
                                        style={{ cursor: this.isLocationFromFixed(formData.action) ? 'default' : 'pointer', borderColor: this.state.validationErrors.locationFrom ? '#e74c3c' : '' }}
                                        placeholder="Select location"
                                    />
                                    {locationFromDropdownOpen && (
                                        <ul className="incoming-dropdown-list">
                                            {(
                                                formData.action === 'Return Stock to Store'
                                                    ? SITE_LOCATIONS
                                                    : formData.action === 'Initial Stock'
                                                    ? ['Store', ...SITE_LOCATIONS]
                                                    : ['Supplier', 'Store', ...getFilteredLocations(inventoryProducts).filter(l => l !== 'Supplier' && l !== 'Store')]
                                            ).map((loc, idx) => (
                                                <li key={idx} className="incoming-dropdown-item" onClick={() => {
                                                    onFormChange('locationFrom', loc);
                                                    this.setState({ locationFromDropdownOpen: false });
                                                }}>
                                                    {loc}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {this.state.validationErrors.locationFrom && (
                                    <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                        {this.state.validationErrors.locationFrom}
                                    </div>
                                )}
                            </div>
                            
                            <div className="stock-modal-field">
                                <label>Location To <span style={{ color: '#e74c3c' }}>*</span></label>
                                <div className="incoming-dropdown" ref={this.locationToDropdownRef}>
                                    <input
                                        type="text"
                                        className="incoming-dropdown-input"
                                        value={formData.locationTo}
                                        onFocus={() => !this.isLocationToFixed(formData.action) && this.setState({ locationToDropdownOpen: true })}
                                        readOnly
                                        disabled={this.isLocationToFixed(formData.action)}
                                        style={{ cursor: this.isLocationToFixed(formData.action) ? 'default' : 'pointer', borderColor: this.state.validationErrors.locationTo ? '#e74c3c' : '' }}
                                        placeholder="Select location"
                                    />
                                    {locationToDropdownOpen && (
                                        <ul className="incoming-dropdown-list">
                                            {(
                                                formData.action === 'Allocation To Site'
                                                    ? SITE_LOCATIONS
                                                    : formData.action === 'Initial Stock'
                                                    ? ['Store', ...SITE_LOCATIONS]
                                                    : ['Supplier', 'Store', ...getFilteredLocations(inventoryProducts).filter(l => l !== 'Supplier' && l !== 'Store')]
                                            ).map((loc, idx) => (
                                                <li key={idx} className="incoming-dropdown-item" onClick={() => {
                                                    onFormChange('locationTo', loc);
                                                    this.setState({ locationToDropdownOpen: false });
                                                }}>
                                                    {loc}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {this.state.validationErrors.locationTo && (
                                    <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                        {this.state.validationErrors.locationTo}
                                    </div>
                                )}
                            </div>

                            <div className="stock-modal-field">
                                <label>Date <span style={{ color: '#e74c3c' }}>*</span></label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => onFormChange('date', e.target.value)}
                                    style={{ borderColor: this.state.validationErrors.date ? '#e74c3c' : '' }}
                                />
                                {this.state.validationErrors.date && (
                                    <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                        {this.state.validationErrors.date}
                                    </div>
                                )}
                            </div>

                            <div className="stock-modal-field">
                                <label>Time <span style={{ color: '#e74c3c' }}>*</span></label>
                                <input
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => onFormChange('time', e.target.value)}
                                    style={{ borderColor: this.state.validationErrors.time ? '#e74c3c' : '' }}
                                />
                                {this.state.validationErrors.time && (
                                    <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                        {this.state.validationErrors.time}
                                    </div>
                                )}
                            </div>

                            <div className="stock-modal-field">
                                <label>Quantity <span style={{ color: '#e74c3c' }}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.quantity}
                                    onChange={(e) => onFormChange('quantity', e.target.value)}
                                    placeholder="Enter quantity"
                                    style={{ borderColor: this.state.validationErrors.quantity ? '#e74c3c' : '' }}
                                />
                                {this.state.validationErrors.quantity && (
                                    <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                        {this.state.validationErrors.quantity}
                                    </div>
                                )}
                            </div>

                            <div className="stock-modal-field">
                                <label>Updated By <span style={{ color: '#e74c3c' }}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.updatedBy}
                                    placeholder="Enter name"
                                    readOnly
                                    style={{ borderColor: this.state.validationErrors.updatedBy ? '#e74c3c' : '' }}
                                />
                                {this.state.validationErrors.updatedBy && (
                                    <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                                        {this.state.validationErrors.updatedBy}
                                    </div>
                                )}
                            </div>

                            <div className="stock-modal-field">
                                <label>Reason <span style={{ color: '#999', fontSize: '0.85rem' }}>(Optional)</span></label>
                                <input
                                    type="text"
                                    className="incoming-dropdown-input"
                                    value={formData.reason}
                                    onChange={(e) => onFormChange('reason', e.target.value)}
                                    placeholder="Enter reason"
                                />
                            </div>
                        </form>
                    </div>

                    <div className="stock-modal-footer">
                        <button type="button" className="stock-modal-cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" form="incoming-stock-form" className="stock-modal-submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><span className="spinner" style={{
                                    display: 'inline-block',
                                    width: '14px',
                                    height: '14px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTop: '2px solid #fff',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                    marginRight: '8px',
                                    verticalAlign: 'middle'
                                }} /> Updating inventory...</>
                            ) : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default StockAdjustmentModal;
