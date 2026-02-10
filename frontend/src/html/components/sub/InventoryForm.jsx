import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/inventoryForm.css';

class InventoryForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isSubmitting: false,
            error: null,
            successMessage: null,
            formData: {
                customerName: '',
                product: '',
                location: '',
                quantity: 1,
                orderDate: '',
                orderTime: '',
                staffName: props.userName || ''
            },
            showProductDropdown: false,
            showLocationDropdown: false
        };
        this.productRef = React.createRef();
        this.locationRef = React.createRef();
    }

    // Get unique product names from inventoryProducts prop
    getProductSuggestions = () => {
        const { inventoryProducts = [] } = this.props;
        const productNames = [...new Set(inventoryProducts.map(p => p.name))];
        return productNames;
    };

    // Get unique location names from inventoryProducts prop
    getLocationSuggestions = () => {
        const { inventoryProducts = [] } = this.props;
        const locationNames = [...new Set(
            inventoryProducts
                .map(p => p.variation_name)
                .filter(name => name) // Filter out null/undefined
        )];
        return locationNames;
    };

    // Filter suggestions based on input
    getFilteredProducts = () => {
        const { formData } = this.state;
        const allProducts = this.getProductSuggestions();
        if (!formData.product) return allProducts;
        return allProducts.filter(p => 
            p.toLowerCase().includes(formData.product.toLowerCase())
        );
    };

    getFilteredLocations = () => {
        const { formData } = this.state;
        const allLocations = this.getLocationSuggestions();
        if (!formData.location) return allLocations;
        return allLocations.filter(l => 
            l.toLowerCase().includes(formData.location.toLowerCase())
        );
    };

    // Get the price of the currently selected product and location
    getSelectedProductPrice = () => {
        const { formData } = this.state;
        const { inventoryProducts = [] } = this.props;
        
        if (!formData.product || !formData.location) return null;
        
        const matchedProduct = inventoryProducts.find(p => 
            p.name === formData.product && p.variation_name === formData.location
        );
        
        return matchedProduct ? parseFloat(matchedProduct.price) || 0 : null;
    };

    // Calculate total price based on quantity and product price
    getTotalPrice = () => {
        const price = this.getSelectedProductPrice();
        const { formData } = this.state;
        const quantity = parseInt(formData.quantity) || 0;
        
        if (price === null) return null;
        return (price * quantity).toFixed(2);
    };

    // Handle dropdown selection
    handleProductSelect = (product) => {
        this.setState(prevState => ({
            formData: {
                ...prevState.formData,
                product: product
            },
            showProductDropdown: false
        }));
    };

    handleLocationSelect = (location) => {
        this.setState(prevState => ({
            formData: {
                ...prevState.formData,
                location: location
            },
            showLocationDropdown: false
        }));
    };

    // Handle click outside to close dropdowns
    handleClickOutside = (e) => {
        if (this.productRef.current && !this.productRef.current.contains(e.target)) {
            this.setState({ showProductDropdown: false });
        }
        if (this.locationRef.current && !this.locationRef.current.contains(e.target)) {
            this.setState({ showLocationDropdown: false });
        }
    };

    componentDidMount() {
        document.addEventListener('mousedown', this.handleClickOutside);
        this.setCurrentDateTime();
        
        // Close popup only if dropdown data is already available
        this.checkAndClosePopup();
    }

    componentDidUpdate(prevProps) {
        // Close popup when inventoryProducts becomes available
        if (prevProps.inventoryProducts !== this.props.inventoryProducts) {
            this.checkAndClosePopup();
        }
    }

    checkAndClosePopup = () => {
        const { inventoryProducts = [] } = this.props;
        
        // Only close popup when we have dropdown data loaded
        if (inventoryProducts.length > 0) {
            if (this.props.closePopup1) {
                this.props.closePopup1();
            }
            if (this.props.onDataLoaded) {
                this.props.onDataLoaded();
            }
        }
    };

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleClickOutside);
    }

    setCurrentDateTime = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const date = `${day}/${month}/${year}`; // DD/MM/YYYY
        const time = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        
        this.setState(prevState => ({
            formData: {
                ...prevState.formData,
                orderDate: date,
                orderTime: time
            }
        }));
    };

    handleInputChange = (e) => {
        const { name, value } = e.target;
        
        this.setState(prevState => ({
            formData: {
                ...prevState.formData,
                [name]: value
            }
        }));
    };

    // Update backend (port 3001)
    updateBackend = async (payload) => {
        const backendUrl = window.location.hostname === "localhost" 
            ? "http://localhost:3001" 
            : "https://ecss-backend-node.azurewebsites.net";

        const response = await axios.post(`${backendUrl}/inventory`, {payload: payload, purpose: "insert"});
        return response;
    };

    // Update WooCommerce (port 3002)
    updateWooCommerce = async (payload) => {
        const woocommerceUrl = window.location.hostname === "localhost" 
            ? "http://localhost:3002" 
            : "https://ecss-backend-django.azurewebsites.net";

        const response = await axios.post(`${woocommerceUrl}/inventory_order/`, payload);
        return response;
    };

    handleSubmit = async (e) => {
        e.preventDefault();
        
        const { formData } = this.state;
        
        // Validation
        if (!formData.customerName.trim()) {
            this.setState({ error: 'Please enter a customer name' });
            return;
        }
        if (!formData.product.trim()) {
            this.setState({ error: 'Please enter a product' });
            return;
        }
        if (!formData.location.trim()) {
            this.setState({ error: 'Please enter a location' });
            return;
        }
        if (!formData.quantity || parseInt(formData.quantity) < 1) {
            this.setState({ error: 'Please enter a valid quantity' });
            return;
        }

        this.setState({ isSubmitting: true, error: null, successMessage: null });

        try {
            const payload = {
                customerName: formData.customerName,
                product: formData.product,
                location: formData.location,
                quantity: parseInt(formData.quantity),
                orderDate: formData.orderDate,
                orderTime: formData.orderTime,
                staffName: formData.staffName
            };

            // Step 1: Update backend (port 3001)
            const backendResponse = await this.updateBackend(payload);

            if (!backendResponse.data.success) {
                const errorMsg = typeof backendResponse.data.error === 'string' 
                    ? backendResponse.data.error 
                    : 'Failed to save order to backend';
                this.setState({
                    error: errorMsg,
                    isSubmitting: false
                });
                return;
            }

            // Step 2: If backend successful, update WooCommerce (port 3002)
            const woocommerceResponse = await this.updateWooCommerce(payload);

            // Both updates complete, now show result
            if (woocommerceResponse.data.success) {
                this.setState({
                    successMessage: 'Order submitted successfully!',
                    isSubmitting: false,
                    formData: {
                        ...this.state.formData,
                        customerName: '',
                        product: '',
                        location: '',
                        quantity: 1
                    }
                }, () => {
                    // Only set date/time after state is updated
                    this.setCurrentDateTime();
                });
            } else {
                const wooErrorMsg = typeof woocommerceResponse.data.error === 'string'
                    ? woocommerceResponse.data.error
                    : 'Failed to update WooCommerce stock';
                this.setState({
                    error: wooErrorMsg,
                    isSubmitting: false
                });
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            let errorMessage = 'An error occurred while submitting the order';
            if (error.response?.data?.error) {
                errorMessage = typeof error.response.data.error === 'string' 
                    ? error.response.data.error 
                    : errorMessage;
            } else if (typeof error.message === 'string') {
                errorMessage = error.message;
            }
            this.setState({
                error: errorMessage,
                isSubmitting: false
            });
        }
    };

    render() {
        const { isSubmitting, error, successMessage, formData, showProductDropdown, showLocationDropdown } = this.state;
        const filteredProducts = this.getFilteredProducts();
        const filteredLocations = this.getFilteredLocations();

        return (
            <>
                {/* Header Section */}
                <div className="inventory-heading">
                    <h2>Inventory Form</h2>
                </div>
                {/* Form Section */}
                <div className="inventory-form-content">
                    <form onSubmit={this.handleSubmit} className="inventory-order-form">
                            {error && (
                                <div className="form-message error">
                                    <i className="fas fa-exclamation-circle"></i>
                                    {error}
                                </div>
                            )}
                            
                            {successMessage && (
                                <div className="form-message success">
                                    <i className="fas fa-check-circle"></i>
                                    {successMessage}
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="customerName">
                                        <i className="fas fa-user"></i>
                                        Customer Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="customerName"
                                        name="customerName"
                                        value={formData.customerName}
                                        onChange={this.handleInputChange}
                                        placeholder="Enter customer name"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="staffName">
                                        <i className="fas fa-user-tie"></i>
                                        Staff Name
                                    </label>
                                    <input
                                        type="text"
                                        id="staffName"
                                        name="staffName"
                                        value={formData.staffName}
                                        onChange={this.handleInputChange}
                                        placeholder="Enter staff name"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group" ref={this.productRef}>
                                    <label htmlFor="product">
                                        <i className="fas fa-box"></i>
                                        Product <span className="required">*</span>
                                    </label>
                                    <div className="custom-dropdown-container">
                                        <input
                                            type="text"
                                            id="product"
                                            name="product"
                                            value={formData.product}
                                            onChange={this.handleInputChange}
                                            onFocus={() => this.setState({ showProductDropdown: true })}
                                            placeholder="Type or select product"
                                            required
                                            autoComplete="off"
                                        />
                                        {showProductDropdown && filteredProducts.length > 0 && (
                                            <div className="custom-dropdown-list">
                                                {filteredProducts.map((product, index) => (
                                                    <div 
                                                        key={index} 
                                                        className="custom-dropdown-item"
                                                        onClick={() => this.handleProductSelect(product)}
                                                    >
                                                        {product}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group" ref={this.locationRef}>
                                    <label htmlFor="location">
                                        <i className="fas fa-map-marker-alt"></i>
                                        Location <span className="required">*</span>
                                    </label>
                                    <div className="custom-dropdown-container">
                                        <input
                                            type="text"
                                            id="location"
                                            name="location"
                                            value={formData.location}
                                            onChange={this.handleInputChange}
                                            onFocus={() => this.setState({ showLocationDropdown: true })}
                                            placeholder="Type or select location"
                                            required
                                            autoComplete="off"
                                        />
                                        {showLocationDropdown && filteredLocations.length > 0 && (
                                            <div className="custom-dropdown-list">
                                                {filteredLocations.map((location, index) => (
                                                    <div 
                                                        key={index} 
                                                        className="custom-dropdown-item"
                                                        onClick={() => this.handleLocationSelect(location)}
                                                    >
                                                        {location}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="quantity">
                                                <i className="fas fa-sort-numeric-up"></i>
                                                Quantity <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="quantity"
                                                name="quantity"
                                                value={formData.quantity}
                                                onChange={this.handleInputChange}
                                                placeholder="Qty"
                                                required
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="unitPrice">
                                                <i className="fas fa-tag"></i>
                                                Unit Price
                                            </label>
                                            <input
                                                type="text"
                                                id="unitPrice"
                                                name="unitPrice"
                                                value={this.getSelectedProductPrice() !== null ? `$${this.getSelectedProductPrice().toFixed(2)}` : '$0.00'}
                                                readOnly
                                                placeholder="Price"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="orderDate">
                                        <i className="fas fa-calendar-alt"></i>
                                        Order Date
                                    </label>
                                    <input
                                        type="text"
                                        id="orderDate"
                                        name="orderDate"
                                        value={formData.orderDate}
                                        onChange={this.handleInputChange}
                                        placeholder="DD/MM/YYYY"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="orderTime">
                                        <i className="fas fa-clock"></i>
                                        Order Time
                                    </label>
                                    <input
                                        type="text"
                                        id="orderTime"
                                        name="orderTime"
                                        value={formData.orderTime}
                                        onChange={this.handleInputChange}
                                        placeholder="HH:MM"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="totalPrice">
                                        <i className="fas fa-dollar-sign"></i>
                                        Total Price
                                    </label>
                                    <input
                                        type="text"
                                        id="totalPrice"
                                        name="totalPrice"
                                        value={`$${this.getTotalPrice() || '0.00'}`}
                                        readOnly
                                        placeholder="Quantity × Unit Price"
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="submit" 
                                    className="submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-paper-plane"></i>
                                            Submit Order
                                        </>
                                    )}
                                </button>
                                <button 
                                    type="button" 
                                    className="reset-btn"
                                    onClick={() => {
                                        this.setState({
                                            formData: {
                                                ...this.state.formData,
                                                customerName: '',
                                                product: '',
                                                location: '',
                                                quantity: 1
                                            },
                                            error: null,
                                            successMessage: null
                                        });
                                        this.setCurrentDateTime();
                                    }}
                                >
                                    <i className="fas fa-undo"></i>
                                    Reset Form
                                </button>
                            </div>
                        </form>
                </div>
            </>
        );
    }
}

export default InventoryForm;
