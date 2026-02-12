import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { io } from 'socket.io-client';
import * as XLSX from 'xlsx';
import '../../../css/sub/inventoryModules.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

class InventoryRecords extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 'stock', // 'stock' or 'orders'
            records: [],
            stockRecords: [],
            isLoading: true,
            error: null,
            // Incoming modal
            showIncomingModal: false,
            inventoryProducts: [],
            productDropdownOpen: false,
            locationDropdownOpen: false,
            incomingForm: {
                product: '',
                location: '',
                date: '',
                time: '',
                quantity: '',
                updatedBy: ''
            },
            selectedProduct: null,
            showCards: false,
            // Filters for cards
            cardFilterProduct: '',
            cardFilterLocation: '',
            cardFilterDateFrom: '',
            cardFilterDateTo: '',
            filterProductDropdownOpen: false,
            filterLocationDropdownOpen: false,
            // Order Records filters
            orderFilterProduct: '',
            orderFilterLocation: '',
            orderFilterDateFrom: '',
            orderFilterDateTo: '',
            orderFilterProductDropdownOpen: false,
            orderFilterLocationDropdownOpen: false
        };
        this.gridApi = null;
        this.gridColumnApi = null;
        this.stockGridApi = null;
        this.productDropdownRef = React.createRef();
        this.locationDropdownRef = React.createRef();
        this.filterProductDropdownRef = React.createRef();
        this.filterLocationDropdownRef = React.createRef();
        this.orderFilterProductDropdownRef = React.createRef();
        this.orderFilterLocationDropdownRef = React.createRef();
        this.socket = null;
    }

    async componentDidMount() {
        console.log("InventoryRecords - componentDidMount called");
        document.addEventListener('mousedown', this.handleDocumentClick);
        await Promise.all([
            this.fetchInventoryRecords(),
            this.fetchStockRecords(),
            this.fetchInventoryProducts()
        ]);
        
        // --- Live update via Socket.IO ---
        this.socket = io(
            window.location.hostname === "localhost"
                ? "http://localhost:3001"
                : "https://ecss-backend-node.azurewebsites.net"
        );
        this.socket.on('inventory', (data) => {
            console.log("Socket inventory event received", data);
            this.fetchInventoryRecords();
            this.fetchStockRecords();
            this.fetchInventoryProducts();
        });
    }

    fetchInventoryRecords = async () => {
        try {
            this.setState({ isLoading: true, error: null });

            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, { purpose: "retrieve" });

            console.log('Inventory records fetched:', response.data);

            if (response.data.success) {
                const allRecords = response.data.records || [];
                // Filter out Incoming stock records from order records
                const orderRecords = allRecords.filter(r => !r.type || r.type !== 'Incoming');
                this.setState({
                    records: orderRecords,
                    isLoading: false
                });
            } else {
                this.setState({
                    error: response.data.error || 'Failed to fetch inventory records',
                    isLoading: false
                });
            }
        } catch (error) {
            console.error('Error fetching inventory records:', error);
            this.setState({
                error: error.message || 'An error occurred while fetching inventory records',
                isLoading: false
            });
        }
    };

    fetchInventoryProducts = async () => {
        try {
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            const response = await axios.get(`${baseUrl}/inventory_product_details/`);

            if (response.data.success) {
                this.setState({
                    inventoryProducts: response.data.inventory_products || []
                });
            }
        } catch (error) {
            console.error('Error fetching inventory products:', error);
        }
    };

    fetchStockRecords = async () => {
        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, { purpose: "retrieveStock" });

            if (response.data.success) {
                this.setState({
                    stockRecords: response.data.records || []
                });
            }
        } catch (error) {
            console.error('Error fetching stock records:', error);
        }
    };

    openIncomingModal = () => {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].substring(0, 5);
        this.setState({
            showIncomingModal: true,
            incomingForm: {
                product: '',
                location: '',
                date,
                time,
                quantity: '',
                updatedBy: this.props.userName || ''
            }
        });
    };

    closeIncomingModal = () => {
        this.setState({ showIncomingModal: false, productDropdownOpen: false, locationDropdownOpen: false });
    };

    handleDocumentClick = (e) => {
        if (this.productDropdownRef.current && !this.productDropdownRef.current.contains(e.target)) {
            this.setState({ productDropdownOpen: false });
        }
        if (this.locationDropdownRef.current && !this.locationDropdownRef.current.contains(e.target)) {
            this.setState({ locationDropdownOpen: false });
        }
        if (this.filterProductDropdownRef.current && !this.filterProductDropdownRef.current.contains(e.target)) {
            this.setState({ filterProductDropdownOpen: false });
        }
        if (this.filterLocationDropdownRef.current && !this.filterLocationDropdownRef.current.contains(e.target)) {
            this.setState({ filterLocationDropdownOpen: false });
        }
        if (this.orderFilterProductDropdownRef.current && !this.orderFilterProductDropdownRef.current.contains(e.target)) {
            this.setState({ orderFilterProductDropdownOpen: false });
        }
        if (this.orderFilterLocationDropdownRef.current && !this.orderFilterLocationDropdownRef.current.contains(e.target)) {
            this.setState({ orderFilterLocationDropdownOpen: false });
        }
    };

    selectProduct = (name) => {
        this.handleIncomingFormChange('product', name);
        this.setState({ productDropdownOpen: false });
    };

    selectLocation = (loc) => {
        this.handleIncomingFormChange('location', loc);
        this.setState({ locationDropdownOpen: false });
    };

    getFilteredProducts = () => {
        const query = this.state.incomingForm.product.toLowerCase();
        const unique = [...new Set(
            this.state.inventoryProducts.map(p => p.name).filter(Boolean)
        )];
        return unique;
    };

    getFilteredLocations = () => {
        const query = this.state.incomingForm.location.toLowerCase();
        const unique = [...new Set(
            this.state.inventoryProducts.map(p => p.variation_name).filter(Boolean)
        )];
        return unique;
    };

    // Convert DD/MM/YYYY to YYYY-MM-DD for comparison
    parseDateFilter = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    getProductSummaryCards = () => {
        const { inventoryProducts, stockRecords, cardFilterProduct, cardFilterLocation, cardFilterDateFrom, cardFilterDateTo } = this.state;
        const productMap = {};

        // Filter stock records by date range if set
        let filteredStockRecords = stockRecords;
        if (cardFilterDateFrom || cardFilterDateTo) {
            const fromDate = this.parseDateFilter(cardFilterDateFrom);
            const toDate = this.parseDateFilter(cardFilterDateTo);
            filteredStockRecords = stockRecords.filter(r => {
                const recordDate = r.date || r.orderDate || '';
                if (!recordDate) return true;
                if (fromDate && recordDate < fromDate) return false;
                if (toDate && recordDate > toDate) return false;
                return true;
            });
        }

        for (const p of inventoryProducts) {
            if (!p.name) continue;
            if (!productMap[p.name]) {
                productMap[p.name] = { name: p.name, locations: [] };
            }
            const loc = p.variation_name || '';
            const incoming = filteredStockRecords
                .filter(r => r.product === p.name && r.location === loc && r.type === 'Incoming')
                .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
            const outgoing = filteredStockRecords
                .filter(r => r.product === p.name && r.location === loc && r.type === 'Outgoing')
                .reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0);
            productMap[p.name].locations.push({ location: loc, inventoryStock: incoming - outgoing, unitsSold: outgoing });
        }

        let results = Object.values(productMap).map(product => ({
            name: product.name,
            totalStock: product.locations.reduce((s, l) => s + l.inventoryStock, 0),
            totalSold: product.locations.reduce((s, l) => s + l.unitsSold, 0),
            locations: product.locations
        }));

        // Apply product name filter
        if (cardFilterProduct) {
            results = results.filter(c => c.name.toLowerCase().includes(cardFilterProduct.toLowerCase()));
        }

        // Apply location filter
        if (cardFilterLocation) {
            results = results.filter(c => c.locations.some(l => l.location.toLowerCase().includes(cardFilterLocation.toLowerCase())));
        }

        return results;
    };

    clearCardFilters = () => {
        this.setState({ cardFilterProduct: '', cardFilterLocation: '', cardFilterDateFrom: '', cardFilterDateTo: '', filterProductDropdownOpen: false, filterLocationDropdownOpen: false });
    };

    selectFilterProduct = (name) => {
        this.setState({ cardFilterProduct: name, filterProductDropdownOpen: false });
    };

    selectFilterLocation = (loc) => {
        this.setState({ cardFilterLocation: loc, filterLocationDropdownOpen: false });
    };

    getFilterProductOptions = () => {
        const query = this.state.cardFilterProduct.toLowerCase();
        const unique = [...new Set(this.state.inventoryProducts.map(p => p.name).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };

    getFilterLocationOptions = () => {
        const query = this.state.cardFilterLocation.toLowerCase();
        const unique = [...new Set(this.state.inventoryProducts.map(p => p.variation_name).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };

    toggleCards = () => {
        this.setState(prev => ({ showCards: !prev.showCards }));
    };

    // Order Records filter methods
    selectOrderFilterProduct = (name) => {
        this.setState({ orderFilterProduct: name, orderFilterProductDropdownOpen: false });
    };

    selectOrderFilterLocation = (loc) => {
        this.setState({ orderFilterLocation: loc, orderFilterLocationDropdownOpen: false });
    };

    getOrderFilterProductOptions = () => {
        const query = this.state.orderFilterProduct.toLowerCase();
        const unique = [...new Set(this.state.records.map(r => r.product).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };

    getOrderFilterLocationOptions = () => {
        const query = this.state.orderFilterLocation.toLowerCase();
        const unique = [...new Set(this.state.records.map(r => r.location).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };

    clearOrderFilters = () => {
        this.setState({ orderFilterProduct: '', orderFilterLocation: '', orderFilterDateFrom: '', orderFilterDateTo: '', orderFilterProductDropdownOpen: false, orderFilterLocationDropdownOpen: false });
    };

    getFilteredOrderRecords = () => {
        const { records, orderFilterProduct, orderFilterLocation, orderFilterDateFrom, orderFilterDateTo } = this.state;
        let filtered = records;
        if (orderFilterProduct) {
            filtered = filtered.filter(r => r.product && r.product.toLowerCase().includes(orderFilterProduct.toLowerCase()));
        }
        if (orderFilterLocation) {
            filtered = filtered.filter(r => r.location && r.location.toLowerCase().includes(orderFilterLocation.toLowerCase()));
        }
        if (orderFilterDateFrom) {
            const fromDate = this.parseDateFilter(orderFilterDateFrom);
            filtered = filtered.filter(r => {
                const d = r.orderDate || r.date || '';
                return d >= fromDate;
            });
        }
        if (orderFilterDateTo) {
            const toDate = this.parseDateFilter(orderFilterDateTo);
            filtered = filtered.filter(r => {
                const d = r.orderDate || r.date || '';
                return d <= toDate;
            });
        }
        return filtered;
    };

    toggleCardExpand = (name) => {
        this.setState(prevState => ({
            selectedProduct: prevState.selectedProduct === name ? null : name
        }));
    };

    backToProducts = () => {
        this.setState({ selectedProduct: null });
    };

    handleIncomingFormChange = (field, value) => {
        this.setState(prevState => ({
            incomingForm: {
                ...prevState.incomingForm,
                [field]: value
            }
        }));
    };

    handleIncomingSubmit = async (e) => {
        e.preventDefault();
        const { incomingForm } = this.state;

        if (!incomingForm.product || !incomingForm.location || !incomingForm.date || !incomingForm.time || !incomingForm.quantity || !incomingForm.updatedBy) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, {
                purpose: "insertStock",
                payload: {
                    type: "Incoming",
                    product: incomingForm.product,
                    location: incomingForm.location,
                    date: incomingForm.date,
                    time: incomingForm.time,
                    quantity: incomingForm.quantity,
                    updatedBy: incomingForm.updatedBy
                }
            });

            if (response.data.success) {
                console.log('Stock record inserted:', response.data);

                // Also increase WooCommerce stock
                try {
                    const djangoUrl = window.location.hostname === "localhost"
                        ? "http://localhost:3002"
                        : "https://ecss-backend.azurewebsites.net";

                    await axios.post(`${djangoUrl}/inventory_incoming/`, {
                        product: incomingForm.product,
                        location: incomingForm.location,
                        quantity: incomingForm.quantity
                    });
                    console.log('WooCommerce stock increased successfully');
                } catch (wooErr) {
                    console.error('Failed to increase WooCommerce stock:', wooErr);
                }

                this.closeIncomingModal();
                await this.fetchStockRecords();
            } else {
                alert(response.data.error || 'Failed to insert stock record.');
            }
        } catch (error) {
            console.error('Error inserting stock record:', error);
            alert('Failed to insert stock record. Please try again.');
        }
    };

    generateReceipt = async (record) => {
        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, {
                purpose: "downloadReceipt",
                customerName: record.customerName,
                paymentMethod: record.paymentMethod,
                receiptNumber: record.receiptNumber,
                product: record.product,
                location: record.location,
                quantity: record.quantity,
                orderDate: record.orderDate,
                orderTime: record.orderTime,
                staffName: record.staffName,
                unitPrice: record.unitPrice,
                totalPrice: record.totalPrice
            });

            // Download and open PDF in new tab
            if (response.data.result?.pdfGenerated && response.data.result?.pdfData) {
                const pdfBlob = new Blob(
                    [Uint8Array.from(atob(response.data.result.pdfData), c => c.charCodeAt(0))],
                    { type: 'application/pdf' }
                );
                const pdfUrl = URL.createObjectURL(pdfBlob);
                // Open in new tab
                window.open(pdfUrl, '_blank');
                // Also trigger download
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = response.data.result.pdfFilename || 'receipt.pdf';
                link.click();
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
            } else {
                alert('Failed to generate receipt PDF.');
            }
        } catch (error) {
            console.error('Error generating receipt:', error);
            alert('Failed to generate receipt. Please try again.');
        }
    };

    // Column definitions for the AG Grid
    exportStockToExcel = () => {
        const { stockRecords } = this.state;
        if (!stockRecords || stockRecords.length === 0) return;

        const exportData = stockRecords.map((r, i) => ({
            'S/N': i + 1,
            'Type': r.type || '',
            'Product': r.product || '',
            'Location': r.location || '',
            'Date': r.date || r.orderDate || '',
            'Time': r.time || r.orderTime || '',
            'Quantity': r.quantity || '',
            'Updated By': r.updatedBy || r.staffName || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stock Records');
        XLSX.writeFile(wb, `Stock_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    exportToExcel = () => {
        const { records } = this.state;
        if (!records || records.length === 0) return;

        const exportData = records.map((r, i) => ({
            'S/N': i + 1,
            'Customer Name': r.customerName || '',
            'Product': r.product || '',
            'Location': r.location || '',
            'Quantity': r.quantity || '',
            'Order Date': r.orderDate || '',
            'Order Time': r.orderTime || '',
            'Staff Name': r.staffName || '',
            'Payment Method': r.paymentMethod || '',
            'Total Price': parseFloat(r.totalPrice) || 0,
            'Receipt Number': r.receiptNumber || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Order Records');
        XLSX.writeFile(wb, `Order_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    columnDefs = [
        { 
            headerName: 'S/N', 
            valueGetter: (params) => params.node.rowIndex + 1,  
            width: 100, 
            pinned: 'left',
        },
        { 
            headerName: 'Customer Name', 
            field: 'customerName', 
            width: 300, 
            pinned: 'left',
        },
        { 
            headerName: 'Product', 
            field: 'product', 
            width: 500, 
            //pinned: 'left',
        },
        { 
            headerName: 'Location', 
            field: 'location', 
            width: 300,
        },
        { 
            headerName: 'Quantity', 
            field: 'quantity', 
            width: 150, 
        },
        { 
            headerName: 'Order Date', 
            field: 'orderDate', 
            width: 150,
        },
        { 
            headerName: 'Order Time', 
            field: 'orderTime', 
            width: 150,
        },
        { 
            headerName: 'Staff Name', 
            field: 'staffName', 
            width: 300,
        },
        { 
            headerName: 'Payment Method', 
            field: 'paymentMethod', 
            width: 200,
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Total Price', 
            field: 'totalPrice', 
            width: 150,
            cellStyle: { textAlign: 'center' },
            valueFormatter: (params) => {
                const value = parseFloat(params.value) || 0;
                return `$${value.toFixed(2)}`;
            }
        },
        { 
            headerName: 'Receipt Number', 
            field: 'receiptNumber', 
            width: 250,
            pinned: 'right',
            cellStyle: { textAlign: 'center' },
            cellRenderer: (params) => {
                if (!params.value) return '';
                return (
                    <span 
                        style={{ 
                            textDecoration: 'none' 
                        }}
                        onClick={() => this.generateReceipt(params.data)}
                    >
                        {params.value}
                    </span>
                );
            }
        }
    ];

    // Stock Records column definitions
    stockColumnDefs = [
        { 
            headerName: 'S/N', 
            valueGetter: (params) => params.node.rowIndex + 1,  
            width: 100, 
            pinned: 'left',
        },
        { 
            headerName: 'Type', 
            field: 'type', 
            width: 200,
            pinned: 'left'
        },
        { 
            headerName: 'Product', 
            field: 'product', 
            width: 500,
        },
        { 
            headerName: 'Location', 
            field: 'location', 
            width: 350,
        },
        { 
            headerName: 'Date', 
            WSHidth: 150,
            valueGetter: (params) => params.data?.date || params.data?.orderDate || '',
            valueFormatter: (params) => {
                if (!params.value) return '';
                const parts = params.value.split('-');
                if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                return params.value;
            }
        },
        { 
            headerName: 'Time', 
            width: 150,
            valueGetter: (params) => params.data?.time || params.data?.orderTime || '',
        },
        { 
            headerName: 'Quantity', 
            field: 'quantity', 
            width: 150,
            cellStyle: { textAlign: 'center' },
        },
        { 
            headerName: 'Updated By', 
            pinned: 'right',
            width: 200,
            valueGetter: (params) => params.data?.updatedBy || params.data?.staffName || '',
        },
    ];

    onGridReady = (params) => {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
    };

    onStockGridReady = (params) => {
        this.stockGridApi = params.api;
    };

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleDocumentClick);
        // Remove resize event listener
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
        }
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    render() {
        const { activeTab, records, isLoading, error } = this.state;

        return (
            <>
                <div className="inventory-heading">
                    <h2>Inventory Records</h2>
                </div>

                {/* Sub-tabs */}
                <div className="records-sub-tabs">
                    <button
                        className={`records-sub-tab${activeTab === 'stock' ? ' active' : ''}`}
                        onClick={() => this.setState({ activeTab: 'stock' })}
                    >
                        Stock Records
                    </button>
                    <button
                        className={`records-sub-tab${activeTab === 'orders' ? ' active' : ''}`}
                        onClick={() => this.setState({ activeTab: 'orders' })}
                    >
                        Order Records
                    </button>
                </div>

                {/* Tab content */}
                {activeTab === 'stock' && (
                    <div className="inventory-content">
                        {/* Search & Filter Bar */}
                        <div className="stock-filter-bar">
                            <div className="stock-filter-row">
                                <div className="stock-filter-field">
                                    <label>Product</label>
                                    <div className="stock-filter-dropdown" ref={this.filterProductDropdownRef}>
                                        <input
                                            type="text"
                                            placeholder="Search product..."
                                            value={this.state.cardFilterProduct}
                                            onChange={e => this.setState({ cardFilterProduct: e.target.value, filterProductDropdownOpen: true })}
                                            onFocus={() => this.setState({ filterProductDropdownOpen: true })}
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
                                <div className="stock-filter-field">
                                    <label>Location</label>
                                    <div className="stock-filter-dropdown" ref={this.filterLocationDropdownRef}>
                                        <input
                                            type="text"
                                            placeholder="Search location..."
                                            value={this.state.cardFilterLocation}
                                            onChange={e => this.setState({ cardFilterLocation: e.target.value, filterLocationDropdownOpen: true })}
                                            onFocus={() => this.setState({ filterLocationDropdownOpen: true })}
                                        />
                                        {this.state.filterLocationDropdownOpen && this.getFilterLocationOptions().length > 0 && (
                                            <ul className="stock-filter-dropdown-list">
                                                {this.getFilterLocationOptions().map((loc, idx) => (
                                                    <li key={idx} className="stock-filter-dropdown-item" onClick={() => this.selectFilterLocation(loc)}>
                                                        {loc}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="stock-filter-field">
                                    <label>Date From</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        value={this.state.cardFilterDateFrom}
                                        onChange={e => this.setState({ cardFilterDateFrom: e.target.value })}
                                    />
                                </div>
                                <div className="stock-filter-field">
                                    <label>Date To</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        value={this.state.cardFilterDateTo}
                                        onChange={e => this.setState({ cardFilterDateTo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Toggle Cards Button */}
                        <div className="stock-toggle-cards-row">
                            <button className="stock-toggle-cards-btn" onClick={this.toggleCards}>
                                <i className={`fas fa-chevron-${this.state.showCards ? 'up' : 'down'}`}></i>
                                {this.state.showCards ? 'Hide' : 'Show'} Product Summary Cards
                            </button>
                        </div>

                        {/* Product Summary Cards - Togglable */}
                        {this.state.showCards && (
                        <div className="stock-product-cards">
                            {this.getProductSummaryCards().map((card, idx) => (
                                <div key={card.name} className={`stock-product-card stock-product-card-${idx % 3}${this.state.selectedProduct === card.name ? ' stock-product-card-active' : ''}`} onClick={() => this.toggleCardExpand(card.name)} style={{ cursor: 'pointer' }}>
                                    <div className="stock-product-card-header">
                                        <div>
                                            <h4>{card.name}</h4>
                                            <p className="stock-product-card-location">
                                                <i className="fas fa-map-marker-alt"></i> {card.locations.length} location{card.locations.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <i className={`fas fa-chevron-${this.state.selectedProduct === card.name ? 'down' : 'right'} stock-card-chevron`}></i>
                                    </div>
                                    <div className="stock-product-card-divider"></div>
                                    <div className="stock-product-card-stats">
                                        <div className="stock-product-stat incoming">
                                            <span className="stat-value">{card.totalStock}</span>
                                            <span className="stat-label">Inventory Stock</span>
                                        </div>
                                        <div className="stock-product-stat outgoing">
                                            <span className="stat-value">{card.totalSold}</span>
                                            <span className="stat-label">Units Sold</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        )}

                        {/* Drill-down Location Cards */}
                        {this.state.showCards && this.state.selectedProduct !== null && (
                            <div className="stock-drilldown-section">
                                <div className="stock-drilldown-header">
                                    <h3 className="stock-drilldown-title">
                                        <i className="fas fa-map-marker-alt"></i> {this.state.selectedProduct} — Locations
                                    </h3>
                                    <button className="stock-back-btn" onClick={this.backToProducts}>
                                        <i className="fas fa-times"></i> Close
                                    </button>
                                </div>
                                <div className="stock-product-cards">
                                    {this.getProductSummaryCards()
                                        .find(c => c.name === this.state.selectedProduct)?.locations
                                        .map((loc, idx) => (
                                            <div key={idx} className={`stock-product-card stock-product-card-${idx % 3}`}>
                                                <div className="stock-product-card-header">
                                                    <div>
                                                        <h4>{loc.location}</h4>
                                                    </div>
                                                </div>
                                                <div className="stock-product-card-divider"></div>
                                                <div className="stock-product-card-stats">
                                                    <div className="stock-product-stat incoming">
                                                        <span className="stat-value">{loc.inventoryStock}</span>
                                                        <span className="stat-label">Inventory Stock</span>
                                                    </div>
                                                    <div className="stock-product-stat outgoing">
                                                        <span className="stat-value">{loc.unitsSold}</span>
                                                        <span className="stat-label">Units Sold</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        <div className="stock-records-toolbar">
                            <button className="stock-incoming-btn" onClick={this.openIncomingModal}>
                                Incoming
                            </button>
                            {this.state.stockRecords.length > 0 && (
                                <button className="stock-export-btn" onClick={this.exportStockToExcel}>
                                    Export
                                </button>
                            )}
                        </div>
                        {isLoading ? (
                            <div className="inventory-loading">
                                <i className="fas fa-spinner fa-spin"></i>
                                <p>Loading records...</p>
                            </div>
                        ) : this.state.stockRecords.length === 0 ? (
                            <div className="inventory-empty-state">
                                <i className="fas fa-clipboard-list"></i>
                                <h3>No Records Found</h3>
                                <p>No stock records have been recorded yet.</p>
                            </div>
                        ) : (
                            <div className="inventory-records-grid-container ag-theme-inventory" style={{ height: '500px', width: '100%' }}>
                                <AgGridReact
                                    columnDefs={this.stockColumnDefs}
                                    rowData={this.state.stockRecords}
                                    pagination={true}
                                    paginationPageSize={50}
                                    paginationPageSizeSelector={[25, 50, 100, 200]}
                                    domLayout="normal"
                                    onGridReady={this.onStockGridReady}
                                    rowSelection="single"
                                    enableCellTextSelection={true}
                                    headerHeight={40}
                                    rowHeight={36}
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="inventory-content">
                        {/* Order Records Search & Filter Bar */}
                        <div className="stock-filter-bar">
                            <div className="stock-filter-row">
                                <div className="stock-filter-field">
                                    <label>Product</label>
                                    <div className="stock-filter-dropdown" ref={this.orderFilterProductDropdownRef}>
                                        <input
                                            type="text"
                                            placeholder="Search product..."
                                            value={this.state.orderFilterProduct}
                                            onChange={e => this.setState({ orderFilterProduct: e.target.value, orderFilterProductDropdownOpen: true })}
                                            onFocus={() => this.setState({ orderFilterProductDropdownOpen: true })}
                                        />
                                        {this.state.orderFilterProductDropdownOpen && this.getOrderFilterProductOptions().length > 0 && (
                                            <ul className="stock-filter-dropdown-list">
                                                {this.getOrderFilterProductOptions().map((name, idx) => (
                                                    <li key={idx} className="stock-filter-dropdown-item" onClick={() => this.selectOrderFilterProduct(name)}>
                                                        {name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="stock-filter-field">
                                    <label>Location</label>
                                    <div className="stock-filter-dropdown" ref={this.orderFilterLocationDropdownRef}>
                                        <input
                                            type="text"
                                            placeholder="Search location..."
                                            value={this.state.orderFilterLocation}
                                            onChange={e => this.setState({ orderFilterLocation: e.target.value, orderFilterLocationDropdownOpen: true })}
                                            onFocus={() => this.setState({ orderFilterLocationDropdownOpen: true })}
                                        />
                                        {this.state.orderFilterLocationDropdownOpen && this.getOrderFilterLocationOptions().length > 0 && (
                                            <ul className="stock-filter-dropdown-list">
                                                {this.getOrderFilterLocationOptions().map((loc, idx) => (
                                                    <li key={idx} className="stock-filter-dropdown-item" onClick={() => this.selectOrderFilterLocation(loc)}>
                                                        {loc}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="stock-filter-field">
                                    <label>Date From</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        value={this.state.orderFilterDateFrom}
                                        onChange={e => this.setState({ orderFilterDateFrom: e.target.value })}
                                    />
                                </div>
                                <div className="stock-filter-field">
                                    <label>Date To</label>
                                    <input
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        value={this.state.orderFilterDateTo}
                                        onChange={e => this.setState({ orderFilterDateTo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {records.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                <button className="stock-export-btn" onClick={this.exportToExcel}>
                                    Export
                                </button>
                            </div>
                        )}
                        {isLoading ? (
                            <div className="inventory-loading">
                                <i className="fas fa-spinner fa-spin"></i>
                                <p>Loading records...</p>
                            </div>
                        ) : error ? (
                            <div className="inventory-error">
                                <i className="fas fa-exclamation-circle"></i>
                                <p>{error}</p>
                                <button onClick={this.fetchInventoryRecords} className="retry-btn">
                                    <i className="fas fa-redo"></i> Retry
                                </button>
                            </div>
                        ) : records.length === 0 ? (
                            <div className="inventory-empty-state">
                                <i className="fas fa-clipboard-list"></i>
                                <h3>No Records Found</h3>
                                <p>No inventory orders have been recorded yet.</p>
                            </div>
                        ) : (
                            <div className="inventory-records-grid-container ag-theme-inventory" style={{ height: '500px', width: '100%' }}>
                                <AgGridReact
                                    columnDefs={this.columnDefs}
                                    rowData={this.getFilteredOrderRecords()}
                                    pagination={true}
                                    paginationPageSize={this.getFilteredOrderRecords().length}
                                    paginationPageSizeSelector={[25, 50, 100, 200, this.getFilteredOrderRecords().length]}
                                    domLayout="normal"
                                    onGridReady={this.onGridReady}
                                    rowSelection="single"
                                    enableCellTextSelection={true}
                                    headerHeight={40}
                                    rowHeight={36}
                                />
                            </div>
                        )}
                    </div>
                )}
                {/* Incoming Modal */}
                {this.state.showIncomingModal && (
                    <div className="stock-modal-overlay" onClick={this.closeIncomingModal}>
                        <div className="stock-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="stock-modal-header">
                                <h3>Incoming Stock</h3>
                            </div>
                            <div className="stock-modal-body">
                                <form id="incoming-stock-form" className="stock-modal-form" onSubmit={this.handleIncomingSubmit}>
                                    <div className="stock-modal-field">
                                        <label>Product</label>
                                        <div className="incoming-dropdown" ref={this.productDropdownRef}>
                                            <input
                                                type="text"
                                                className="incoming-dropdown-input"
                                                value={this.state.incomingForm.product}
                                                onChange={(e) => {
                                                    this.handleIncomingFormChange('product', e.target.value);
                                                    this.setState({ productDropdownOpen: true });
                                                }}
                                                onFocus={() => this.setState({ productDropdownOpen: true })}
                                                placeholder="Enter product"
                                                required
                                            />
                                            {this.state.productDropdownOpen && this.getFilteredProducts().length > 0 && (
                                                <ul className="incoming-dropdown-list">
                                                    {this.getFilteredProducts().map((name, idx) => (
                                                        <li key={idx} className="incoming-dropdown-item" onClick={() => this.selectProduct(name)}>
                                                            {name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Location</label>
                                        <div className="incoming-dropdown" ref={this.locationDropdownRef}>
                                            <input
                                                type="text"
                                                className="incoming-dropdown-input"
                                                value={this.state.incomingForm.location}
                                                onChange={(e) => {
                                                    this.handleIncomingFormChange('location', e.target.value);
                                                    this.setState({ locationDropdownOpen: true });
                                                }}
                                                onFocus={() => this.setState({ locationDropdownOpen: true })}
                                                placeholder="Enter location"
                                                required
                                            />
                                            {this.state.locationDropdownOpen && this.getFilteredLocations().length > 0 && (
                                                <ul className="incoming-dropdown-list">
                                                    {this.getFilteredLocations().map((loc, idx) => (
                                                        <li key={idx} className="incoming-dropdown-item" onClick={() => this.selectLocation(loc)}>
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
                                            value={this.state.incomingForm.date}
                                            onChange={(e) => this.handleIncomingFormChange('date', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Time</label>
                                        <input
                                            type="time"
                                            value={this.state.incomingForm.time}
                                            onChange={(e) => this.handleIncomingFormChange('time', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Quantity</label>
                                        <input
                                            type="text"
                                            value={this.state.incomingForm.quantity}
                                            onChange={(e) => this.handleIncomingFormChange('quantity', e.target.value)}
                                            placeholder="Enter quantity"
                                            required
                                        />
                                    </div>
                                    <div className="stock-modal-field">
                                        <label>Updated By</label>
                                        <input
                                            type="text"
                                            value={this.state.incomingForm.updatedBy}
                                            onChange={(e) => this.handleIncomingFormChange('updatedBy', e.target.value)}
                                            placeholder="Enter name"
                                            required
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="stock-modal-footer">
                                <button type="button" className="stock-modal-cancel" onClick={this.closeIncomingModal}>Cancel</button>
                                <button type="submit" form="incoming-stock-form" className="stock-modal-submit">Submit</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }
}

export default InventoryRecords;
