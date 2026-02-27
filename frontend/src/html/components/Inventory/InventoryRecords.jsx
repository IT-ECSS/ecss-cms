import React, { Component } from 'react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { io } from 'socket.io-client';
import * as pdfjsLib from 'pdfjs-dist';
import StockRecords from './Records/StockRecords';
import OrderRecords from './Records/OrderRecords';
import { fetchInventoryRecords as fetchInventoryRecordsApi, fetchInventoryProducts as fetchInventoryProductsApi, fetchStockRecords as fetchStockRecordsApi } from './inventoryApiHelpers';
import '../../../css/sub/inventoryModules.css';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

class InventoryRecords extends Component {
    constructor(props) {
        super(props);
        const restrictedRoles = ['Site in-charge', 'NSA in-charge', 'Fitness Trainer'];
        const isRestricted = restrictedRoles.includes(props.role);
        this.state = {
            activeTab: isRestricted ? 'orders' : 'stock', // 'stock' or 'orders'
            records: [],
            stockRecords: [],
            isLoading: true,
            error: null,
            inventoryProducts: []
        };
        this.socket = null;
        this.socketFetchTimer = null; // Debounce timer
    }

    async componentDidMount() {
        console.log("InventoryRecords - componentDidMount called");
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
            // Debounce socket updates - only fetch after 500ms of no new events
            if (this.socketFetchTimer) clearTimeout(this.socketFetchTimer);
            this.socketFetchTimer = setTimeout(() => {
                this.fetchInventoryRecords();
                this.fetchStockRecords();
                this.fetchInventoryProducts();
            }, 500);
        });
    }

    async componentDidUpdate(prevProps) {
        if (this.props.activeTab === 'records' && this.props.inventoryRefreshCounter !== prevProps.inventoryRefreshCounter) {
            await Promise.all([
                this.fetchInventoryRecords(),
                this.fetchStockRecords(),
                this.fetchInventoryProducts()
            ]);
        }
    }

    fetchInventoryRecords = async () => {
        this.setState({ isLoading: true, error: null });
        const result = await fetchInventoryRecordsApi();
        this.setState({
            records: result.records,
            error: result.error,
            isLoading: false
        });
    };

    fetchInventoryProducts = async () => {
        const result = await fetchInventoryProductsApi();
        this.setState({
            inventoryProducts: result.inventoryProducts
        });
    };

    fetchStockRecords = async () => {
        const result = await fetchStockRecordsApi();
        this.setState({
            stockRecords: result.stockRecords
        });
    };

    // Stock adjustment callback from StockRecords
    handleStockAdjustmentSubmit = async () => {
        await Promise.all([
            this.fetchStockRecords(),
            this.fetchInventoryProducts()
        ]);
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
        const { activeTab, isLoading } = this.state;
        const restrictedRoles = ['Site in-charge', 'NSA in-charge', 'Fitness Trainer'];
        const isRestricted = restrictedRoles.includes(this.props.role);

        return (
            <>
                <div className="inventory-heading">
                    <h2>Inventory Records</h2>
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
