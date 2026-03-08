import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../../../css/sub/inventoryModules.css';

class InventoryStore extends Component {
    constructor(props) {
        super(props);
        const restrictedRoles = ['Site in-charge', 'NSA in-charge', 'Fitness Trainer'];
        const canViewSubProducts = restrictedRoles.includes(props.role);
        this.canViewSubProducts = canViewSubProducts; // helper flag used in render

        // calculate allowedSites array (lowercased) from props.siteIC
        let allowedSites = [];
        if (props.siteIC) {
            if (Array.isArray(props.siteIC)) {
                allowedSites = props.siteIC.map(s => s.trim()).filter(Boolean);
            } else if (typeof props.siteIC === 'string') {
                allowedSites = props.siteIC.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
        this.allowedSites = allowedSites.map(s => s.toLowerCase());

        this.state = {
            inventoryProducts: [],
            inventoryRecords: [],
            stockRecords: [],
            isLoading: true,
            loadingMessage: 'Loading...',
            error: null,
            // Tabs - restricted roles only see Sub Products (variants) and no tab navigation
            activeTab: canViewSubProducts ? 'variants' : 'store',
            // Allocation modal
            showAllocateModal: false,
            allocateForm: {
                product: '',
                location: '',
                quantity: '',
                reason: '',
                updatedBy: ''
            },
            allocateStoreStock: 0,
            allocateVariants: [],
            allocateLocationDropdownOpen: false,
            allocateProductDropdownOpen: false,
            // Filters
            filterProduct: '',
            filterProductSearch: '',
            filterProductDropdownOpen: false
        };
        this.eventSource = null;
        this.socket = null;
        this.filterProductDropdownRef = React.createRef();
        this.allocateProductDropdownRef = React.createRef();

        // product fetch control flags
        // Removed all caching/throttling flags for inventory products
    }

    async componentDidMount() {
        document.addEventListener('mousedown', this.handleDocumentClick);
        this.setState({ 
            isLoading: true,
            loadingMessage: 'Loading inventory data...'
        });
        await Promise.all([
            this.fetchInventoryProducts(),
            this.fetchInventoryRecords(),
            this.fetchStockRecords()
        ]);
        this.setState({ isLoading: false });
        await this.setupSSE();
       //await this.setupSocket();
    }

    async componentDidUpdate(prevProps) {
        if (this.props.activeTab === 'store' && this.props.inventoryRefreshCounter !== prevProps.inventoryRefreshCounter) {
            this.setState({ 
                isLoading: true,
                loadingMessage: 'Refreshing inventory data...'
            });
            await Promise.all([
                this.fetchInventoryProducts(),
                this.fetchInventoryRecords(),
                this.fetchStockRecords()
            ]);
            this.setState({ isLoading: false });
        }
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleDocumentClick);
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    setupSSE = () => {
        return new Promise((resolve) => {
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            this.eventSource = new EventSource(`${baseUrl}/inventory_sse/`);

            this.eventSource.onopen = async () => {
                console.log('SSE connection opened');
                // only refetch products if we haven't got any yet – avoids the
                // duplicate call that happens immediately after the initial load
                try {
                    if (!this.productsFetchedOnce || this.state.inventoryProducts.length === 0) {
                        await this.fetchInventoryProducts(true);
                    }
                    await this.fetchStockRecords();
                    if (this.state.activeTab === 'records') {
                        await this.fetchInventoryRecords();
                    }
                } catch (err) {
                    console.error('Error fetching on SSE reconnect', err);
                }
                resolve();
            };

            this.eventSource.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE inventory update:', data);
                    
                    if (data.type === 'connected') {
                        console.log('SSE connected to inventory updates');
                    } else if (data.type === 'inventory_updated') {
                        // Only refresh the minimal data needed.
                        // stockRecords change every update so refetch them.
                        await this.fetchStockRecords();

                        // if we already have products loaded, attempt to patch the relevant product
                        if (this.state.inventoryProducts.length && data.product_name && data.location) {
                            const nameLower = data.product_name.toLowerCase();
                            const locLower = data.location.toLowerCase();
                            this.setState(prev => {
                                const prods = prev.inventoryProducts.map(p => {
                                    if (p.name && p.variation_name && p.name.toLowerCase() === nameLower && p.variation_name.toLowerCase() === locLower) {
                                        // event doesn't include new stock qty; leave unchanged
                                    }
                                    return p;
                                });
                                return { inventoryProducts: prods };
                            });
                        }

                        // if there's a product in the event that we don't yet have, it's
                        // probably a new item – fetch the full list immediately.
                        let needFetch = false;
                        if (data.product_id) {
                            needFetch = !this.state.inventoryProducts.some(p => p.id === data.product_id);
                        } else if (data.product_name && data.location) {
                            const nameLower = data.product_name.toLowerCase();
                            const locLower = data.location.toLowerCase();
                            needFetch = !this.state.inventoryProducts.some(p =>
                                p.name && p.variation_name &&
                                p.name.toLowerCase() === nameLower &&
                                p.variation_name.toLowerCase() === locLower
                            );
                        }

                        // fetch full product list when we haven't before, if we're empty, or
                        // if event indicates a new product
                        if (needFetch || !this.productsFetchedOnce || this.state.inventoryProducts.length === 0) {
                            await this.fetchInventoryProducts(true); // force bypass throttle
                            this.productsFetchedOnce = true;
                        }
                        // records are rarely needed; fetch only if user is on records tab
                        if (this.state.activeTab === 'records') {
                            await this.fetchInventoryRecords();
                        }
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                // Reconnect after 5 seconds
                if (this.eventSource) {
                    this.eventSource.close();
                }
                setTimeout(() => {
                    if (this.eventSource === null || this.eventSource.readyState === EventSource.CLOSED) {
                        this.setupSSE();
                    }
                }, 5000);
            };
        });
    };

    //ok
    /*setupSSE = () => {
        return new Promise((resolve) => {
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            this.eventSource = new EventSource(`${baseUrl}/inventory_sse/`);

            this.eventSource.onopen = () => {
                console.log('SSE connection opened');
                resolve();
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE inventory update:', data);
                    
                    if (data.type === 'connected') {
                        console.log('SSE connected to inventory updates');
                    } else if (data.type === 'inventory_updated') {
                        // Refetch the full inventory list (silent, no loading spinner)
                        this.fetchInventoryProducts();
                    }
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                // Reconnect after 5 seconds
                if (this.eventSource) {
                    this.eventSource.close();
                }
                setTimeout(() => {
                    if (this.eventSource === null || this.eventSource.readyState === EventSource.CLOSED) {
                        this.setupSSE();
                    }
                }, 5000);
            };
        });
    };*/


    /*setupSocket = () => {
        return new Promise((resolve) => {
            this.socket = io(
                window.location.hostname === "localhost"
                    ? "http://localhost:3001"
                    : "https://ecss-backend-node.azurewebsites.net"
            );
            this.socket.on('connect', () => {
                console.log('Socket.IO connected');
                resolve();
            });
            this.socket.on('inventory', (data) => {
                console.log("Socket inventory event received", data);
                this.fetchInventoryRecords(true);
            });
        });
    };*/

    // fetchInventoryProducts optionally accepts a `force` flag to bypass throttling
    fetchInventoryProducts = async (force = false) => {
        // Always fetch fresh inventory products, no cache/throttle
        try {
            const { fetchInventoryProducts } = await import('./inventoryApiHelpers');
            const result = await fetchInventoryProducts();
            const products = result.inventoryProducts || [];
            this.setState({
                inventoryProducts: products
            });
            if (!result.success) {
                this.setState({
                    error: result.error || 'Failed to fetch inventory products'
                });
            }
        } catch (error) {
            console.error('Error fetching inventory products:', error);
            this.setState({
                error: error.message || 'An error occurred while fetching inventory products'
            });
        }
    };

    fetchInventoryRecords = async () => {
        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, { purpose: "retrieve" });

            if (response.data.success) {
                this.setState({
                    inventoryRecords: response.data.records || []
                });
            }
        } catch (error) {
            console.error('Error fetching inventory records:', error);
        }
    };

    // Calculate sold count for a specific product and location (Sales action from stock records)
    getSoldCount = (productName, locationName) => {
        const { stockRecords } = this.state;
        const nameLower = productName.toLowerCase();
        const locLower = locationName.toLowerCase();
        return stockRecords
            .filter(r => (r.product || '').toLowerCase() === nameLower && r.action === 'Sales' && (r.locationFrom || '').toLowerCase() === locLower)
            .reduce((total, r) => total + (parseInt(r.quantity) || 0), 0);
    };

    // Calculate sold amount (money) for a specific product and location (Sales action from stock records)
    getSoldAmount = (productName, locationName) => {
        const { stockRecords } = this.state;
        const nameLower = productName.toLowerCase();
        const locLower = locationName.toLowerCase();
        return stockRecords
            .filter(r => (r.product || '').toLowerCase() === nameLower && r.action === 'Sales' && (r.locationFrom || '').toLowerCase() === locLower)
            .reduce((total, r) => {
                const totalPrice = parseFloat(r.totalPrice) || 0;
                if (totalPrice > 0) return total + totalPrice;
                const unitPrice = parseFloat(r.unitPrice) || 0;
                const quantity = parseInt(r.quantity) || 0;
                return total + (unitPrice * quantity);
            }, 0);
    };

    fetchStockRecords = async () => {
        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, { purpose: "retrieveStock" });

            if (response.data.success) {
                let records = response.data.records || [];
                if (this.props.role === 'Site in-charge' && this.allowedSites.length > 0) {
                    records = records.filter(r => {
                        const loc = (r.location || '').toLowerCase();
                        const locFrom = (r.locationFrom || '').toLowerCase();
                        return this.allowedSites.some(site => loc.includes(site) || locFrom.includes(site));
                    });
                }
                this.setState({
                    stockRecords: records
                });
            }
        } catch (error) {
            console.error('Error fetching stock records:', error);
        }
    };

    // Get store stock from WooCommerce parent product stock_quantity
    getStoreStock = (productName) => {
        const { inventoryProducts } = this.state;
        // Find any variant of this product to get parent_stock_quantity
        const variant = inventoryProducts.find(p => (p.name || '').toLowerCase() === productName.toLowerCase());
        return variant ? (variant.parent_stock_quantity || 0) : 0;
    };

    // Get grouped products by parent name
    getGroupedProducts = () => {
        const { inventoryProducts } = this.state;
        const groups = {};
        for (const p of inventoryProducts) {
            const name = p.name || 'Unknown';
            if (!groups[name]) {
                groups[name] = { name, variants: [], images: p.images || [] };
            }
            groups[name].variants.push(p);
        }
        return Object.values(groups);
    };

    openAllocateModal = (productName) => {
        if (productName) {
            const storeStock = this.getStoreStock(productName);
            const variants = this.state.inventoryProducts
                .filter(p => p.name === productName && p.variation_name)
                .map(p => p.variation_name);
            this.setState({
                showAllocateModal: true,
                allocateForm: {
                    product: productName,
                    location: variants.length === 1 ? variants[0] : '',
                    quantity: '',
                    reason: '',
                    updatedBy: this.props.userName || ''
                },
                allocateStoreStock: storeStock,
                allocateVariants: variants,
                allocateLocationDropdownOpen: false,
                allocateProductDropdownOpen: false
            });
        } else {
            // No product pre-selected — user picks from dropdown
            this.setState({
                showAllocateModal: true,
                allocateForm: {
                    product: '',
                    location: '',
                    quantity: '',
                    reason: '',
                    updatedBy: this.props.userName
                },
                allocateStoreStock: 0,
                allocateVariants: [],
                allocateLocationDropdownOpen: false,
                allocateProductDropdownOpen: false
            });
        }
    };

    selectAllocateProduct = (productName) => {
        const storeStock = this.getStoreStock(productName);
        // Get locations (variation_name) from WooCommerce products
        const variants = this.state.inventoryProducts
            .filter(p => p.name === productName && p.variation_name)
            .map(p => p.variation_name);
        this.setState(prev => ({
            allocateForm: { ...prev.allocateForm, product: productName, location: variants.length === 1 ? variants[0] : '' },
            allocateStoreStock: storeStock,
            allocateVariants: variants,
            allocateProductDropdownOpen: false,
            allocateLocationDropdownOpen: false
        }));
    };

    getAvailableProductsForAllocation = () => {
        // Source products from WooCommerce (inventoryProducts)
        const { inventoryProducts } = this.state;
        const query = this.state.allocateForm.product.toLowerCase();
        const uniqueNames = [...new Set(inventoryProducts.map(p => p.name).filter(Boolean))];
        return query ? uniqueNames.filter(n => n.toLowerCase().includes(query)) : uniqueNames;
    };

    selectAllocateLocation = (loc) => {
        this.setState(prev => ({
            allocateForm: { ...prev.allocateForm, location: loc },
            allocateLocationDropdownOpen: false
        }));
    };

    closeAllocateModal = () => {
        this.setState({ showAllocateModal: false });
    };

    handleAllocateFormChange = (field, value) => {
        this.setState(prev => ({
            allocateForm: { ...prev.allocateForm, [field]: value }
        }));
    };

    handleAllocateSubmit = async (e) => {
        e.preventDefault();
        const { allocateForm, allocateStoreStock } = this.state;
        const qty = parseInt(allocateForm.quantity);

        if (!qty || qty <= 0) {
            alert('Please enter a valid quantity.');
            return;
        }
        if (qty > allocateStoreStock) {
            alert(`Not enough store stock. Available: ${allocateStoreStock}`);
            return;
        }

        try {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0].substring(0, 5);

            // 1. Insert allocation records in MongoDB (Node backend)
            const backendUrl = window.location.hostname === "localhost"
                ? "http://localhost:3001"
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, {
                purpose: "insertStockAllocation",
                payload: {
                    product: allocateForm.product,
                    location: allocateForm.location,
                    date,
                    time,
                    quantity: qty,
                    reason: allocateForm.reason,
                    updatedBy: allocateForm.updatedBy
                }
            });

            if (!response.data.success) {
                alert(response.data.error || 'Failed to record allocation.');
                return;
            }

            // 2. Increase WooCommerce stock for the variant (Django backend)
            try {
                const djangoUrl = window.location.hostname === "localhost"
                    ? "http://localhost:3002"
                    : "https://ecss-backend-django.azurewebsites.net";

                await axios.post(`${djangoUrl}/inventory_allocate/`, {
                    product: allocateForm.product,
                    location: allocateForm.location,
                    quantity: qty
                });
                console.log('WooCommerce stock allocated successfully');
            } catch (wooErr) {
                console.error('Failed to allocate WooCommerce stock:', wooErr);
                alert('Stock allocation recorded but WooCommerce update failed. Please check.');
            }

            this.closeAllocateModal();
            // Refresh data
            await Promise.all([
                this.fetchStockRecords(),
                this.fetchInventoryProducts()
            ]);
        } catch (error) {
            console.error('Error allocating stock:', error);
            alert('Failed to allocate stock. Please try again.');
        }
    };

    handleDocumentClick = (e) => {
        if (this.filterProductDropdownRef.current && !this.filterProductDropdownRef.current.contains(e.target)) {
            // If search text is empty when closing, clear the applied filter to show all
            if (this.state.filterProductDropdownOpen && this.state.filterProductSearch === '') {
                this.setState({ filterProduct: '', filterProductDropdownOpen: false });
            } else {
                this.setState({ filterProductDropdownOpen: false });
            }
        }
        if (this.allocateProductDropdownRef.current && !this.allocateProductDropdownRef.current.contains(e.target)) {
            this.setState({ allocateProductDropdownOpen: false });
        }
    };

    getFilterProductOptions = () => {
        const query = this.state.filterProductSearch.toLowerCase();
        const unique = [...new Set(this.state.inventoryProducts.map(p => p.name).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };


    selectFilterProduct = (name) => {
        this.setState({ filterProduct: name, filterProductSearch: '', filterProductDropdownOpen: false });
    };


    getFilteredGroupedProducts = () => {
        const { filterProduct } = this.state;
        let groups = this.getGroupedProducts();
        if (filterProduct) {
            groups = groups.filter(g => g.name.toLowerCase().includes(filterProduct.toLowerCase()));
        }
        return groups;
    };

    getFilteredVariants = () => {
        const { inventoryProducts, filterProduct } = this.state;
        let variants = inventoryProducts;
        if (filterProduct) {
            variants = variants.filter(p => p.name && p.name.toLowerCase().includes(filterProduct.toLowerCase()));
        }
        return variants;
    };

    // Get allocation count for a product at a location (Stock Out + Allocation records)
    getAllocationIn = (productName, locationName) => {
        const { stockRecords } = this.state;
        const nameLower = productName.toLowerCase();
        const locLower = locationName.toLowerCase();
        return stockRecords
            .filter(r => (r.product || '').toLowerCase() === nameLower && !r.action && r.type !== 'Purchases' && r.action !== 'Sales' && (r.location || '').toLowerCase() === locLower)
            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
    };

    // Get sold count for a product at a location from stockRecords (Sales action)
    getLocationSold = (productName, locationName) => {
        const { stockRecords } = this.state;
        const nameLower = productName.toLowerCase();
        const locLower = locationName.toLowerCase();
        return stockRecords
            .filter(r => (r.product || '').toLowerCase() === nameLower && r.action === 'Sales' && (r.locationFrom || '').toLowerCase() === locLower)
            .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
    };



    render() {
        const { inventoryProducts, isLoading, error } = this.state;

        // show early error state if something went wrong
        if (error) {
            return (
                <>
                    <div className="inventory-heading">
                        <h2>Inventory Overview</h2>
                    </div>
                    <div className="inventory-content">
                        <div className="inventory-error">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                            <button onClick={this.fetchInventoryProducts} className="retry-btn">
                                <i className="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="inventory-heading">
                    <h2>Inventory Overview</h2>
                </div>

                {/* Tabs - only show navigation for users who are _not_ in the restricted roles list */}
                {!this.canViewSubProducts && (
                    <div className="records-sub-tabs">
                        <button
                            className={`records-sub-tab${this.state.activeTab === 'store' ? ' active' : ''}`}
                            onClick={() => this.setState({ activeTab: 'store' })}
                        >
                            Store Inventory
                        </button>
                        <button
                            className={`records-sub-tab${this.state.activeTab === 'variants' ? ' active' : ''}`}
                            onClick={() => this.setState({ activeTab: 'variants' })}
                        >
                            Sub Products
                        </button>
                    </div>
                )}

                <div className="inventory-content">
                    {/* Filters */}
                    <div className="stock-filter-bar">
                        <div className="stock-filter-row">
                            <div className="stock-filter-field">
                                <label>Product</label>
                                <div className="stock-filter-dropdown" ref={this.filterProductDropdownRef}>
                                    <input
                                        type="text"
                                        placeholder={this.state.filterProduct || "Search product..."}
                                        value={this.state.filterProductDropdownOpen ? this.state.filterProductSearch : this.state.filterProduct}
                                        onChange={e => this.setState({ filterProductSearch: e.target.value, filterProductDropdownOpen: true })}
                                        onFocus={() => this.setState({ filterProductSearch: '', filterProductDropdownOpen: true })}
                                    />
                                    {this.state.filterProductDropdownOpen && this.getFilterProductOptions().length > 0 && (
                                        <ul className="stock-filter-dropdown-list">
                                            {this.getFilterProductOptions().map((name, idx) => (
                                                <li key={idx} className="stock-filter-dropdown-item" onClick={() => this.selectFilterProduct(name)}>
                                                    {name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                {(inventoryProducts.length === 0 && !isLoading && this.initialFetchDone) ? (
                    <div className="inventory-empty-state">
                        <i className="fas fa-boxes"></i>
                        <h3>No Products Found</h3>
                        <p>No products in the Inventory category.</p>
                    </div>
                ) : this.state.activeTab === 'store' ? (
                    /* Store Inventory Tab - One card per product with location badges */
                    <div className="inventory-cards-grid">
                        {this.getFilteredGroupedProducts().map((group) => {
                            const storeStock = this.getStoreStock(group.name);
                            return (
                                <div key={group.name} className="inventory-store-card-wrapper">
                                    <div className="inventory-card">
                                        {group.images && group.images.length > 0 ? (
                                            <div className="inventory-card-image">
                                                <img src={group.images[0].src} alt={group.name} />
                                            </div>
                                        ) : null}
                                        <div className="inventory-card-content">
                                            <h3 className="inventory-card-title">{group.name}</h3>
                                            <div className="inventory-card-details">
                                                <span className={`inventory-store-stock ${storeStock > 0 ? 'has-stock' : 'no-stock'}`}>
                                                    <b>Store Stock:&nbsp;</b> {storeStock}
                                                </span>
                                            </div>
                                            {/* Location allocation badges */}
                                            {group.variants.filter(v => v.variation_name).length > 0 && (
                                                <div className="inventory-location-badges">
                                                    {group.variants.filter(v => v.variation_name).map((v, idx) => {
                                                        const allocated = parseInt(v.stock_quantity) || 0;
                                                        const sold = this.getLocationSold(group.name, v.variation_name);
                                                        const total = allocated + sold;
                                                        return (
                                                            <div key={idx} className="inventory-location-badge-row">
                                                                <span className="inventory-location-label">{v.variation_name}</span>
                                                                <span className={`inventory-location-stock ${allocated > 0 ? 'has-stock' : 'no-stock'}`}>
                                                                    Stock: {allocated}
                                                                </span>
                                                                <span className={`inventory-location-stock ${sold > 0 ? 'has-stock' : 'no-stock'}`}>
                                                                    Sold: {sold}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Sub Products Tab - Original card layout */
                    <div className="inventory-cards-grid">
                        {this.getFilteredVariants().map((product) => (
                            <div key={product.id} className="inventory-card">
                                {product.images && product.images.length > 0 ? (
                                    <div className="inventory-card-image">
                                        <img src={product.images[0].src} alt={product.name} />
                                    </div>
                                ) : null}
                                <div className="inventory-card-content">
                                    <h3 className="inventory-card-title">{product.name}</h3>
                                    {product.variation_name && (
                                        <div className="inventory-card-variation">
                                            {product.attributes && product.attributes.length > 0 && product.attributes[0].name && product.attributes[0].name.toLowerCase() !== 'location' ? (
                                                <i className="fas fa-palette"></i>
                                            ) : (
                                                <i className="fas fa-map-marker-alt"></i>
                                            )}
                                            <b>{product.variation_name}</b>
                                        </div>
                                    )}
                                    <div className="inventory-card-details">
                                        <span className={`inventory-stock ${(parseInt(product.stock_quantity) > 0) ? 'in-stock' : 'out-of-stock'}`}>
                                            <b>Inventory Stock:&nbsp;</b> {product.stock_quantity}
                                        </span>
                                        <span className="inventory-sold">
                                            <b>Unit Sold:&nbsp;</b> {this.getSoldCount(product.name, product.variation_name)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>

                {/* Allocation Modal */}

                {/* loading overlay popup */}
                {isLoading && (
                    <div className="inventory-loading-overlay">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>{this.state.loadingMessage}</p>
                    </div>
                )}
                {this.state.showAllocateModal && (
                    <div className="stock-modal-overlay" onClick={this.closeAllocateModal}>
                        <div className="stock-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="stock-modal-header">
                                <h3>Allocate Stock</h3>
                            </div>
                            <div className="stock-modal-body">
                                <form id="allocate-stock-form" className="stock-modal-form" onSubmit={this.handleAllocateSubmit}>
                                    <div className="stock-modal-field">
                                        <label>Product</label>
                                        <div className="incoming-dropdown" ref={this.allocateProductDropdownRef}>
                                            <input
                                                type="text"
                                                className="incoming-dropdown-input"
                                                value={this.state.allocateForm.product}
                                                onFocus={() => this.setState({ allocateProductDropdownOpen: true })}
                                                onChange={(e) => {
                                                    this.handleAllocateFormChange('product', e.target.value);
                                                    this.setState({ allocateProductDropdownOpen: true, allocateStoreStock: 0, allocateVariants: [], allocateForm: { ...this.state.allocateForm, product: e.target.value, location: '' } });
                                                }}
                                                placeholder="Select product"
                                                required
                                            />
                                            {this.state.allocateProductDropdownOpen && this.getAvailableProductsForAllocation().length > 0 && (
                                                <ul className="incoming-dropdown-list">
                                                    {this.getAvailableProductsForAllocation().map((name, idx) => (
                                                        <li key={idx} className="incoming-dropdown-item" onClick={() => this.selectAllocateProduct(name)}>
                                                            {name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Allocate To (Location)</label>
                                        <div className="incoming-dropdown">
                                            <input
                                                type="text"
                                                className="incoming-dropdown-input"
                                                value={this.state.allocateForm.location}
                                                onFocus={() => this.setState({ allocateLocationDropdownOpen: true })}
                                                onChange={(e) => {
                                                    this.handleAllocateFormChange('location', e.target.value);
                                                    this.setState({ allocateLocationDropdownOpen: true });
                                                }}
                                                placeholder="Select location"
                                                required
                                            />
                                            {this.state.allocateLocationDropdownOpen && this.state.allocateVariants.length > 0 && (
                                                <ul className="incoming-dropdown-list">
                                                    {this.state.allocateVariants
                                                        .filter(v => !this.state.allocateForm.location || v.toLowerCase().includes(this.state.allocateForm.location.toLowerCase()))
                                                        .map((v, idx) => (
                                                            <li key={idx} className="incoming-dropdown-item" onClick={() => this.selectAllocateLocation(v)}>
                                                                {v}
                                                            </li>
                                                        ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Available Store Stock</label>
                                        <input type="text" value={this.state.allocateStoreStock} readOnly />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Quantity to Allocate</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={this.state.allocateStoreStock}
                                            value={this.state.allocateForm.quantity}
                                            onChange={(e) => this.handleAllocateFormChange('quantity', e.target.value)}
                                            placeholder="Enter quantity"
                                            required
                                        />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Updated By</label>
                                        <input
                                            type="text"
                                            value={this.state.allocateForm.updatedBy}
                                            onChange={(e) => this.handleAllocateFormChange('updatedBy', e.target.value)}
                                            placeholder="Enter name"
                                            required
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="stock-modal-footer">
                                <button type="button" className="stock-modal-cancel" onClick={this.closeAllocateModal}>Cancel</button>
                                <button type="submit" form="allocate-stock-form" className="stock-modal-submit">Allocate</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }
}

export default InventoryStore;
