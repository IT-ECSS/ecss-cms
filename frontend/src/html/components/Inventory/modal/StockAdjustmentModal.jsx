import React, { Component } from 'react';
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
            uploadedFile: null
        };
    }

    componentDidMount() {
        document.addEventListener('mousedown', this.handleDocumentClick);
    }

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
                        <form id="incoming-stock-form" className="stock-modal-form" onSubmit={onSubmit}>
                            <div className="stock-modal-field">
                                <label>Action</label>
                                <div className="incoming-dropdown" ref={this.actionDropdownRef}>
                                    <input
                                        type="text"
                                        className="incoming-dropdown-input"
                                        value={formData.action}
                                        onFocus={() => this.setState({ actionDropdownOpen: true })}
                                        readOnly
                                        required
                                        style={{ cursor: 'pointer' }}
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
                                <label>Product</label>
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
                                        required
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
                            </div>

                            {hasColorVariations(formData.product, inventoryProducts) && (
                                <div className="stock-modal-field">
                                    <label>Variant</label>
                                    <div className="incoming-dropdown" ref={this.variantDropdownRef}>
                                        <input
                                            type="text"
                                            className="incoming-dropdown-input"
                                            value={formData.variant}
                                            onFocus={() => this.setState({ variantDropdownOpen: true })}
                                            readOnly
                                            required
                                            style={{ cursor: 'pointer' }}
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
                                </div>
                            )}

                            <div className="stock-modal-field">
                                <label>Location From</label>
                                <div className="incoming-dropdown" ref={this.locationFromDropdownRef}>
                                    <input
                                        type="text"
                                        className="incoming-dropdown-input"
                                        value={formData.locationFrom}
                                        onFocus={() => this.setState({ locationFromDropdownOpen: true })}
                                        readOnly
                                        required
                                        style={{ cursor: 'pointer' }}
                                        placeholder="Select location"
                                    />
                                    {locationFromDropdownOpen && (
                                        <ul className="incoming-dropdown-list">
                                            {(
                                                formData.action === 'Return Stock to Store'
                                                    ? SITE_LOCATIONS
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
                            </div>
                            
                            <div className="stock-modal-field">
                                <label>Location To</label>
                                <div className="incoming-dropdown" ref={this.locationToDropdownRef}>
                                    <input
                                        type="text"
                                        className="incoming-dropdown-input"
                                        value={formData.locationTo}
                                        onFocus={() => this.setState({ locationToDropdownOpen: true })}
                                        readOnly
                                        required
                                        style={{ cursor: 'pointer' }}
                                        placeholder="Select location"
                                    />
                                    {locationToDropdownOpen && (
                                        <ul className="incoming-dropdown-list">
                                            {(
                                                formData.action === 'Allocation To Site'
                                                    ? SITE_LOCATIONS
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
                            </div>

                            <div className="stock-modal-field">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => onFormChange('date', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="stock-modal-field">
                                <label>Time</label>
                                <input
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => onFormChange('time', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="stock-modal-field">
                                <label>Quantity</label>
                                <input
                                    type="text"
                                    value={formData.quantity}
                                    onChange={(e) => onFormChange('quantity', e.target.value)}
                                    placeholder="Enter quantity"
                                    required
                                />
                            </div>

                            <div className="stock-modal-field">
                                <label>Updated By</label>
                                <input
                                    type="text"
                                    value={formData.updatedBy}
                                    onChange={(e) => onFormChange('updatedBy', e.target.value)}
                                    placeholder="Enter name"
                                    required
                                />
                            </div>

                            <div className="stock-modal-field">
                                <label>Reason</label>
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
