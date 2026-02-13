import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/inventoryForm.css';

class InventoryForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            inventoryProducts: [],
            isLoading: true,
            isSubmitting: false,
            error: null,
            successMessage: null,
            formData: {
                customerName: '',
                product: '',
                location: '',
                quantity: "",
                orderDate: '',
                orderTime: '',
                staffName: props.userName || '',
                paymentMethod: '',
                totalAmount: ''
            },
            showProductDropdown: false,
            showLocationDropdown: false
        };
        this.productRef = React.createRef();
        this.locationRef = React.createRef();
    }

    // Get unique product names from inventoryProducts state (only in-stock)
    getProductSuggestions = () => {
        const { inventoryProducts = [] } = this.state;
        const inStockProducts = inventoryProducts.filter(p => (parseInt(p.stock_quantity) || 0) > 0);
        const productNames = [...new Set(inStockProducts.map(p => p.name))];
        return productNames;
    };

    // Get unique location names from inventoryProducts state (only in-stock)
    getLocationSuggestions = () => {
        const { inventoryProducts = [] } = this.state;
        const inStockProducts = inventoryProducts.filter(p => (parseInt(p.stock_quantity) || 0) > 0);
        const locationNames = [...new Set(
            inStockProducts
                .map(p => p.variation_name)
                .filter(name => name) // Filter out null/undefined
        )];
        return locationNames;
    };

    // Filter suggestions based on input
    getFilteredProducts = () => {
        const allProducts = this.getProductSuggestions();
        return allProducts;
    };

    getFilteredLocations = () => {
        const allLocations = this.getLocationSuggestions();
        return allLocations;
    };

    // Get the price of the currently selected product and location
    getSelectedProductPrice = () => {
        const { formData, inventoryProducts = [] } = this.state;
        
        if (!formData.product || !formData.location) return null;
        
        const matchedProduct = inventoryProducts.find(p => 
            p.name === formData.product && p.variation_name === formData.location
        );
        
        return matchedProduct ? parseFloat(matchedProduct.price) || 0 : null;
    };

    // Get the SKU of the currently selected product and location
    getSelectedProductSku = () => {
        const { formData, inventoryProducts = [] } = this.state;
        
        if (!formData.product || !formData.location) return '';
        
        const matchedProduct = inventoryProducts.find(p => 
            p.name === formData.product && p.variation_name === formData.location
        );
        
        return matchedProduct ? matchedProduct.sku || '' : '';
    };

    // Get the stock quantity of the currently selected product and location
    getSelectedProductStock = () => {
        const { formData, inventoryProducts = [] } = this.state;
        
        if (!formData.product || !formData.location) return null;
        
        const matchedProduct = inventoryProducts.find(p => 
            p.name === formData.product && p.variation_name === formData.location
        );
        
        return matchedProduct ? parseInt(matchedProduct.stock_quantity) || 0 : null;
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
        this.setState(prevState => {
            const newFormData = {
                ...prevState.formData,
                product: product
            };
            
            // Auto-calculate totalAmount when product changes
            const quantity = parseInt(newFormData.quantity) || 0;
            if (quantity > 0 && newFormData.location) {
                const matchedProduct = prevState.inventoryProducts.find(p => 
                    p.name === product && p.variation_name === newFormData.location
                );
                if (matchedProduct) {
                    const price = parseFloat(matchedProduct.price) || 0;
                    newFormData.totalAmount = (price * quantity).toFixed(2);
                }
            }
            
            return {
                formData: newFormData,
                showProductDropdown: false
            };
        });
    };

    handleLocationSelect = (location) => {
        this.setState(prevState => {
            const newFormData = {
                ...prevState.formData,
                location: location
            };
            
            // Auto-calculate totalAmount when location changes
            const quantity = parseInt(newFormData.quantity) || 0;
            if (quantity > 0 && newFormData.product) {
                const matchedProduct = prevState.inventoryProducts.find(p => 
                    p.name === newFormData.product && p.variation_name === location
                );
                if (matchedProduct) {
                    const price = parseFloat(matchedProduct.price) || 0;
                    newFormData.totalAmount = (price * quantity).toFixed(2);
                }
            }
            
            return {
                formData: newFormData,
                showLocationDropdown: false
            };
        });
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

    async componentDidMount() {
        document.addEventListener('mousedown', this.handleClickOutside);
        this.setCurrentDateTime();
        
        // Fetch inventory products on mount
        await this.fetchInventoryProducts();
    }

    fetchInventoryProducts = async () => {
        try {
            this.setState({ isLoading: true, error: null });

            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            const response = await axios.get(`${baseUrl}/inventory_product_details/`);

            console.log('Inventory products fetched:', response.data);

            if (response.data.success) {
                const products = response.data.inventory_products || [];
                this.setState({
                    inventoryProducts: products,
                    isLoading: false
                });
            } else {
                this.setState({
                    error: 'Failed to fetch inventory products',
                    isLoading: false
                });
            }
        } catch (error) {
            console.error('Error fetching inventory products:', error);
            this.setState({
                error: error.message || 'An error occurred while fetching inventory products',
                isLoading: false
            });
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
        
        this.setState(prevState => {
            const newFormData = {
                ...prevState.formData,
                [name]: value
            };
            
            // Auto-calculate totalAmount when quantity changes
            if (name === 'quantity') {
                const quantity = parseInt(value) || 0;
                const matchedProduct = prevState.inventoryProducts.find(p => 
                    p.name === newFormData.product && p.variation_name === newFormData.location
                );
                if (matchedProduct) {
                    const price = parseFloat(matchedProduct.price) || 0;
                    newFormData.totalAmount = (price * quantity).toFixed(2);
                }
            }
            
            return { formData: newFormData };
        });
    };

    // Update backend (port 3001)
    updateBackend = async (payload) => {
        const backendUrl = window.location.hostname === "localhost" 
            ? "http://localhost:3001" 
            : "https://ecss-backend-node.azurewebsites.net";

        const response = await axios.post(`${backendUrl}/inventory`, {payload: payload, purpose: "insert"});
        console.log('Backend response:', response.data);
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
        if (!formData.totalAmount && formData.totalAmount !== 0 && formData.totalAmount !== '0' && formData.totalAmount !== '0.00') {
            this.setState({ error: 'Please enter a total amount' });
            return;
        }

        this.setState({ isSubmitting: true, error: null, successMessage: null });

        try {
            const payload = {
                type: 'Purchases',
                customerName: formData.customerName,
                product: formData.product,
                location: formData.location,
                quantity: parseInt(formData.quantity),
                orderDate: formData.orderDate,
                orderTime: formData.orderTime,
                staffName: formData.staffName,
                sku: this.getSelectedProductSku(),
                paymentMethod: formData.paymentMethod,
                totalPrice: parseFloat(formData.totalAmount) || 0
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
                // Step 3: Generate receipt PDF
                const backendUrl = window.location.hostname === "localhost" 
                    ? "http://localhost:3001" 
                    : "https://ecss-backend-node.azurewebsites.net";
                
                // Get receipt number from data object
                const receiptNumber = backendResponse.data.data?.receiptNumber || backendResponse.data.receiptNumber || '';
                
                const receiptResponse = await axios.post(`${backendUrl}/inventory`, {
                    purpose: "generateReceipt",
                    customerName: formData.customerName,
                    paymentMethod: formData.paymentMethod,
                    receiptNumber: receiptNumber,
                    product: formData.product,
                    location: formData.location,
                    quantity: parseInt(formData.quantity),
                    orderDate: formData.orderDate,
                    orderTime: formData.orderTime,
                    staffName: formData.staffName,
                    unitPrice: this.getSelectedProductPrice(),
                    totalPrice: parseFloat(formData.totalAmount) || 0
                });

                // Handle PDF download if generated
                // if (receiptResponse.data.result?.pdfGenerated && receiptResponse.data.result?.pdfData) {
                //     const pdfBlob = new Blob(
                //         [Uint8Array.from(atob(receiptResponse.data.result.pdfData), c => c.charCodeAt(0))],
                //         { type: 'application/pdf' }
                //     );
                //     const pdfUrl = URL.createObjectURL(pdfBlob);
                //     const link = document.createElement('a');
                //     link.href = pdfUrl;
                //     link.download = receiptResponse.data.result.pdfFilename || 'receipt.pdf';
                //     link.click();
                //     URL.revokeObjectURL(pdfUrl);
                // }

                // Receipt PDF is uploaded to Google Drive automatically by the backend
                if (receiptResponse.data.result?.googleDrive?.fileLink) {
                    console.log('Receipt uploaded to Google Drive:', receiptResponse.data.result.googleDrive.fileLink);
                }

                this.setState({
                    successMessage: 'Order submitted successfully!',
                    isSubmitting: false,
                    formData: {
                        ...this.state.formData,
                        customerName: '',
                        product: '',
                        location: '',
                        quantity: "",
                        paymentMethod: '',
                        totalAmount: ''
                    }
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
        const { isSubmitting, isLoading, error, successMessage, formData, showProductDropdown, showLocationDropdown } = this.state;
        const filteredProducts = this.getFilteredProducts();
        const filteredLocations = this.getFilteredLocations();

        if (isLoading) {
            return (
                <div className="inventory-loading">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading inventory form...</p>
                </div>
            );
        }

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
                                                style={
                                                    this.getSelectedProductStock() !== null && 
                                                    (parseInt(formData.quantity) || 0) > this.getSelectedProductStock()
                                                        ? { borderColor: 'red', color: 'red' }
                                                        : {}
                                                }
                                            />
                                            {this.getSelectedProductStock() !== null && 
                                             (parseInt(formData.quantity) || 0) > this.getSelectedProductStock() && (
                                                <span style={{ color: 'red', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '4px', display: 'block' }}>
                                                    Exceeds stock ({this.getSelectedProductStock()} available)
                                                </span>
                                            )}
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
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
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
                                        <div style={{ flex: 1 }}>
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
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div style={{ display: 'flex', gap: '10px'}}>
                                        <div style={{ flex: 1 }}>
                                            <label htmlFor="totalAmount">
                                                <i className="fas fa-dollar-sign"></i>
                                                Total Amount <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="totalAmount"
                                                name="totalAmount"
                                                value={formData.totalAmount ? `$${formData.totalAmount}` : '$0.00'}
                                                onChange={this.handleInputChange}
                                                placeholder="Enter total amount"
                                                required
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label>
                                                <i className="fas fa-credit-card"></i>
                                                Payment Method <span className="required">*</span>
                                            </label>
                                            <div className="radio-group">
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="Cash"
                                                        checked={formData.paymentMethod === 'Cash'}
                                                        onClick={() => this.setState(prev => ({ formData: { ...prev.formData, paymentMethod: prev.formData.paymentMethod === 'Cash' ? '' : 'Cash' } }))}
                                                        readOnly
                                                    />
                                                    <span className="radio-custom"></span>
                                                    Cash
                                                </label>
                                                <label className="radio-label">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        value="PayNow"
                                                        checked={formData.paymentMethod === 'PayNow'}
                                                        onClick={() => this.setState(prev => ({ formData: { ...prev.formData, paymentMethod: prev.formData.paymentMethod === 'PayNow' ? '' : 'PayNow' } }))}
                                                        readOnly
                                                    />
                                                    <span className="radio-custom"></span>
                                                    PayNow
                                                </label>
                                            </div>
                                        </div>
                                    </div>
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
                                                quantity: 1,
                                                paymentMethod: '',
                                                totalAmount: ''
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
