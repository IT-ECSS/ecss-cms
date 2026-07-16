import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { generateReceipt, exportOrderToExcel } from '../inventoryServiceHelpers';
import { orderColumnDefs } from '../inventoryColumnDefs';
import { calculateItemSold } from '../searchFilter/StockFilterUtils';

class OrderRecords extends Component {
    constructor(props) {
        super(props);
        this.gridApi = null;
        this.gridColumnApi = null;
        
        this.orderFilterProductDropdownRef = React.createRef();
        this.orderFilterLocationDropdownRef = React.createRef();
        
        this.state = {
            orderFilterProduct: '',
            orderFilterLocation: '',
            orderFilterDateFrom: '',
            orderFilterDateTo: '',
            orderFilterProductDropdownOpen: false,
            orderFilterLocationDropdownOpen: false,
        };
    }

    columnDefs = orderColumnDefs;

    componentDidMount() {
        document.addEventListener('mousedown', this.handleDocumentClick);
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleDocumentClick);
    }

    handleDocumentClick = (e) => {
        if (this.orderFilterProductDropdownRef.current && !this.orderFilterProductDropdownRef.current.contains(e.target)) {
            this.setState({ orderFilterProductDropdownOpen: false });
        }
        if (this.orderFilterLocationDropdownRef.current && !this.orderFilterLocationDropdownRef.current.contains(e.target)) {
            this.setState({ orderFilterLocationDropdownOpen: false });
        }
    };

    parseDateFilter = (dateStr) => {
        // Convert DD/MM/YYYY to YYYY-MM-DD for comparison
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    getLocationStockRecords = () => {
        const { stockRecords } = this.props;
        // match both club and centre variants for Tampines North
        const siteLocations = ['ct hub', 'tampines north community club', 'tampines north community centre', 'pasir ris west wellness centre'];
        return stockRecords.filter(r => {
            const locTo = (r.locationTo || '').toLowerCase();
            const locFrom = (r.locationFrom || r.location || '').toLowerCase();
            return siteLocations.includes(locTo) || siteLocations.includes(locFrom);
        });
    };

    getFilteredOrderRecords = () => {
        const { stockRecords } = this.props;
        const { orderFilterProduct, orderFilterLocation, orderFilterDateFrom, orderFilterDateTo } = this.state;
        // include both spellings so filters catch our Tampines North records
        const siteLocations = ['ct hub', 'tampines north community club', 'tampines north community centre', 'pasir ris west wellness centre'];

        // Get all stock records relevant to site locations and relabel action from location's POV
        let filtered = stockRecords.filter(r => {
            const locTo = (r.locationTo || '').toLowerCase();
            const locFrom = (r.locationFrom || r.location || '').toLowerCase();
            return siteLocations.includes(locTo) || siteLocations.includes(locFrom);
        }).map(r => {
            const action = (r.action || '').toLowerCase();
            let location = '';
            let locationAction = '';

            if (action === 'allocation to site') {
                location = r.locationTo || '';
                locationAction = 'Stock In (received from Store)';
            } else if (action === 'return stock to store') {
                location = r.locationFrom || '';
                locationAction = 'Stock Out (returned to Store)';
            } else if (action === 'sales') {
                location = r.locationFrom || r.location || '';
                locationAction = 'Item Sold';
            } else {
                location = r.locationFrom || r.locationTo || r.location || '';
                locationAction = r.action || '';
            }

            return { ...r, location, locationAction };
        });

        if (orderFilterProduct) {
            filtered = filtered.filter(r => r.product && r.product.toLowerCase().includes(orderFilterProduct.toLowerCase()));
        }
        if (orderFilterLocation) {
            filtered = filtered.filter(r => r.location && r.location.toLowerCase().includes(orderFilterLocation.toLowerCase()));
        }
        if (orderFilterDateFrom) {
            const fromDate = this.parseDateFilter(orderFilterDateFrom);
            filtered = filtered.filter(r => {
                const d = r.date || r.orderDate || '';
                return d >= fromDate;
            });
        }
        if (orderFilterDateTo) {
            const toDate = this.parseDateFilter(orderFilterDateTo);
            filtered = filtered.filter(r => {
                const d = r.date || r.orderDate || '';
                return d <= toDate;
            });
        }

        // Enrich each record with cumulative Item Sold and Balance for that product+location
        return filtered.map(r => {
            const product = (r.product || '').toLowerCase();
            const loc = (r.location || '').toLowerCase();
            if (!product || !loc) return { ...r, itemSold: 0, balance: 0 };

            // Item Sold = total Sales quantity for this product at this location
            // (shared with the product summary cards' "Sold" figure so they can never diverge)
            const itemSold = calculateItemSold(stockRecords, [r.product], r.location);

            // Received = Allocation To Site where locationTo matches this location
            const received = stockRecords
                .filter(sr => (sr.product || '').toLowerCase() === product && (sr.action || '').toLowerCase() === 'allocation to site' && (sr.locationTo || '').toLowerCase() === loc)
                .reduce((sum, sr) => sum + (parseInt(sr.quantity) || 0), 0);

            // Returned = Return Stock to Store where locationFrom matches this location
            const returned = stockRecords
                .filter(sr => (sr.product || '').toLowerCase() === product && (sr.action || '').toLowerCase() === 'return stock to store' && (sr.locationFrom || '').toLowerCase() === loc)
                .reduce((sum, sr) => sum + (parseInt(sr.quantity) || 0), 0);

            const balance = received - returned - itemSold;

            return { ...r, itemSold, balance };
        });
    };

    getOrderFilterProductOptions = () => {
        const { orderFilterProduct } = this.state;
        const query = orderFilterProduct.toLowerCase();
        const locationRecords = this.getLocationStockRecords();
        const unique = [...new Set(locationRecords.map(r => r.product).filter(Boolean))];
        return query ? unique.filter(n => n.toLowerCase().includes(query)) : unique;
    };

    getOrderFilterLocationOptions = () => {
        const { orderFilterLocation } = this.state;
        const query = orderFilterLocation.toLowerCase();
        const locations = ['CT Hub', 'Tampines North Community Centre', 'Pasir Ris West Wellness Centre'];
        return query ? locations.filter(n => n.toLowerCase().includes(query)) : locations;
    };

    selectOrderFilterProduct = (name) => {
        this.setState({ orderFilterProduct: name, orderFilterProductDropdownOpen: false });
    };

    selectOrderFilterLocation = (loc) => {
        this.setState({ orderFilterLocation: loc, orderFilterLocationDropdownOpen: false });
    };

    onGridReady = (params) => {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
    };

    render() {
        const { isLoading } = this.props;
        const {
            orderFilterProduct,
            orderFilterLocation,
            orderFilterDateFrom,
            orderFilterDateTo,
            orderFilterProductDropdownOpen,
            orderFilterLocationDropdownOpen,
        } = this.state;

        return (
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
                                    value={orderFilterProduct}
                                    onChange={e => this.setState({ 
                                        orderFilterProduct: e.target.value, 
                                        orderFilterProductDropdownOpen: true 
                                    })}
                                    onFocus={() => this.setState({ orderFilterProductDropdownOpen: true })}
                                />
                                {orderFilterProductDropdownOpen && this.getOrderFilterProductOptions().length > 0 && (
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
                                    value={orderFilterLocation}
                                    onChange={e => this.setState({ 
                                        orderFilterLocation: e.target.value, 
                                        orderFilterLocationDropdownOpen: true 
                                    })}
                                    onFocus={() => this.setState({ orderFilterLocationDropdownOpen: true })}
                                />
                                {orderFilterLocationDropdownOpen && this.getOrderFilterLocationOptions().length > 0 && (
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
                                value={orderFilterDateFrom}
                                onChange={e => this.setState({ orderFilterDateFrom: e.target.value })}
                            />
                        </div>
                        <div className="stock-filter-field">
                            <label>Date To</label>
                            <input
                                type="text"
                                placeholder="DD/MM/YYYY"
                                value={orderFilterDateTo}
                                onChange={e => this.setState({ orderFilterDateTo: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {this.getLocationStockRecords().length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                        <button className="stock-export-btn" onClick={() => exportOrderToExcel(this.getFilteredOrderRecords())}>
                            Export
                        </button>
                    </div>
                )}
                {isLoading ? (
                    <div className="inventory-loading">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>Loading records...</p>
                    </div>
                ) : this.getLocationStockRecords().length === 0 ? (
                    <div className="inventory-empty-state">
                        <i className="fas fa-clipboard-list"></i>
                        <h3>No Records Found</h3>
                        <p>No order records have been recorded for any location yet.</p>
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
                            headerHeight={40}
                            rowHeight={36}
                        />
                    </div>
                )}
            </div>
        );
    }
}

export default OrderRecords;
