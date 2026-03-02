import React, { Component } from 'react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { io } from 'socket.io-client';
import * as pdfjsLib from 'pdfjs-dist';
import StockRecords from './Records/StockRecords';
import OrderRecords from './Records/OrderRecords';
import { fetchInventoryRecords as fetchInventoryRecordsApi, fetchInventoryProducts as fetchInventoryProductsApi, fetchStockRecords as fetchStockRecordsApi } from './inventoryApiHelpers';
import '../../../css/sub/inventoryModules.css';

// Set PDF.js worker ok
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const restrictedRoles = ['Site in-charge', 'NSA in-charge', 'Fitness Trainer'];

class InventoryRecords extends Component {
    constructor(props) {
        super(props);
        const isRestricted = restrictedRoles.includes(props.role);

        // derive allowedSites from prop similar to InventoryStore
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
            activeTab: isRestricted ? 'orders' : 'stock', // 'stock' or 'orders'
            records: [],
            stockRecords: [],
            isLoading: false,
            error: null,
            inventoryProducts: []
        };
        this.socket = null;
        this.socketFetchTimer = null; // Debounce timer
    }

    async componentDidMount() {
        console.log("InventoryRecords - componentDidMount called");
        this.setState({ isLoading: true, error: null });
        await Promise.all([
            this.fetchInventoryRecords(),
            this.fetchStockRecords(),
            this.fetchInventoryProducts()
        ]);
        this.setState({ isLoading: false });
        
        // --- Live update via Socket.IO ---
        this.socket = io(
            window.location.hostname === "localhost"
                ? "http://localhost:3001"
                : "https://ecss-backend-node.azurewebsites.net"
        );
        this.socket.on('inventory', (data) => {
            // Debounce socket updates - refresh both records and product details
            if (this.socketFetchTimer) clearTimeout(this.socketFetchTimer);
            this.socketFetchTimer = setTimeout(() => {
                // always update stock records
                this.fetchStockRecords();
                // also update the product list so balances are current
                this.fetchInventoryProducts();

                // refresh records only when user is viewing them
                if (this.props.activeTab === 'records') {
                    this.fetchInventoryRecords();
                }
            }, 500);
        });
    }

    async componentDidUpdate(prevProps) {
        if (this.props.activeTab === 'records' && this.props.inventoryRefreshCounter !== prevProps.inventoryRefreshCounter) {
            this.setState({ isLoading: true, error: null });
            await Promise.all([
                this.fetchInventoryRecords(),
                this.fetchStockRecords(),
                this.fetchInventoryProducts()
            ]);
            this.setState({ isLoading: false });
        }
    }

    fetchInventoryRecords = async () => {
        const result = await fetchInventoryRecordsApi();
        let recs = result.records;
        if (this.props.role === 'Site in-charge' && this.allowedSites.length > 0 && Array.isArray(recs)) {
            recs = recs.filter(r => {
                const loc = (r.location || '').toLowerCase();
                const locFrom = (r.locationFrom || '').toLowerCase();
                return this.allowedSites.some(site => loc.includes(site) || locFrom.includes(site));
            });
        }
        this.setState({
            records: recs,
            error: result.error
        });
    };

    fetchInventoryProducts = async () => {
        const result = await fetchInventoryProductsApi();
        let products = result.inventoryProducts;
        if (this.props.role === 'Site in-charge' && this.allowedSites.length > 0 && Array.isArray(products)) {
            products = products.filter(p => {
                const loc = (p.variation_name || '').toLowerCase();
                return this.allowedSites.some(site => loc.includes(site));
            });
        }
        this.setState({
            inventoryProducts: products
        });
    };

    fetchStockRecords = async () => {
        const result = await fetchStockRecordsApi();
        console.log("Fetched stock records:", result.stockRecords);
        let records = result.stockRecords;
        if (this.props.role === 'Site in-charge' && this.allowedSites.length > 0 && Array.isArray(records)) {
            records = records.filter(r => {
                const loc = (r.location || '').toLowerCase();
                const locFrom = (r.locationFrom || '').toLowerCase();
                return this.allowedSites.some(site => loc.includes(site) || locFrom.includes(site));
            });
        }
        this.setState({
            stockRecords: records
        });

        // keep the product cache up to date each time we reload records
        // this ensures the card balances always reflect the latest WooCommerce values
        this.fetchInventoryProducts();
    };

    // Stock adjustment callback from StockRecords
    handleStockAdjustmentSubmit = async () => {
        console.log("[DEBUG] Stock adjustment submitted, refreshing data...");
        await Promise.all([
            this.fetchStockRecords(),
            this.fetchInventoryProducts()
        ]);
        console.log("[DEBUG] Data refresh complete");
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

    handleManualRefresh = async () => {
        // user clicked refresh button - reload everything
        this.setState({ isLoading: true, error: null });
        await Promise.all([
            this.fetchInventoryRecords(),
            this.fetchStockRecords(),
            this.fetchInventoryProducts()
        ]);
        this.setState({ isLoading: false });
    };

    render() {
        const { activeTab, isLoading } = this.state;
        const isRestricted = restrictedRoles.includes(this.props.role);

        return (
            <>
                {/* Loading Popup */}
                {isLoading && (
                    <div style={{
                        position: 'fixed',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: '9999'
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '40px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}>
                            <i className="fas fa-spinner fa-spin" style={{
                                fontSize: '48px',
                                color: '#007bff',
                                marginBottom: '16px',
                                display: 'block'
                            }}></i>
                            <p style={{
                                fontSize: '16px',
                                color: '#333',
                                margin: '0',
                                fontWeight: '500'
                            }}>Loading Inventory Movement Log...</p>
                        </div>
                    </div>
                )}

                <div className="inventory-heading">
                    <h2>Inventory Movement Log</h2>
                </div>

                {/* Sub-tabs */}
                {!isRestricted && (
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
                )}

                {/* Tab content */}
                {activeTab === 'stock' && (
                    <StockRecords
                        stockRecords={this.state.stockRecords}
                        inventoryProducts={this.state.inventoryProducts}
                        isLoading={isLoading}
                        isRestricted={isRestricted}
                        role={this.props.role}
                        userName={this.props.userName}
                        onStockAdjustmentSubmit={this.handleStockAdjustmentSubmit}
                    />
                )}

                {activeTab === 'orders' && (
                    <OrderRecords
                        stockRecords={this.state.stockRecords}
                        isLoading={isLoading}
                    />
                )}
            </>
        );
    }
}

export default InventoryRecords;
