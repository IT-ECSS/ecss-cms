import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { io } from 'socket.io-client';
import '../../../css/sub/inventoryModules.css';
import '../../../css/ag-grid-custom-theme.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

class InventoryRecords extends Component {
    constructor(props) {
        super(props);
        this.state = {
            records: [],
            isLoading: true,
            error: null
        };
        this.gridApi = null;
        this.gridColumnApi = null;
        this.socket = null;
    }

    async componentDidMount() {
        console.log("InventoryRecords - componentDidMount called");
        await this.fetchInventoryRecords();
        
        // --- Live update via Socket.IO ---
        this.socket = io(
            window.location.hostname === "localhost"
                ? "http://localhost:3001"
                : "https://ecss-backend-node.azurewebsites.net"
        );
        this.socket.on('inventory', (data) => {
            console.log("Socket inventory event received", data);
            this.fetchInventoryRecords();
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
                this.setState({
                    records: response.data.records || [],
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

    // Column definitions for the AG Grid
    columnDefs = [
        { 
            headerName: 'S/N', 
            valueGetter: (params) => params.node.rowIndex + 1,  
            width: 80, 
            pinned: 'left',
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Customer Name', 
            field: 'customerName', 
            width: 180, 
            pinned: 'left',
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Product', 
            field: 'product', 
            width: 300, 
            pinned: 'left',
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Location', 
            field: 'location', 
            width: 300,
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Quantity', 
            field: 'quantity', 
            width: 150, 
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Order Date', 
            field: 'orderDate', 
            width: 150,
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Order Time', 
            field: 'orderTime', 
            width: 150,
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Staff Name', 
            field: 'staffName', 
            width: 180,
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Receipt Number', 
            field: 'receiptNumber', 
            width: 200,
            pinned: 'right',
            cellStyle: { textAlign: 'center' }
        }
    ];

    onGridReady = (params) => {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
        
        // Size columns to fit on initial load
        params.api.sizeColumnsToFit();
        
        // Add resize listener for responsive behavior
        const handleResize = () => {
            setTimeout(() => {
                if (this.gridApi) {
                    this.gridApi.sizeColumnsToFit();
                }
            }, 100);
        };
        
        window.addEventListener('resize', handleResize);
        this.handleResize = handleResize;
    };

    componentWillUnmount() {
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
        const { records, isLoading, error } = this.state;

        if (isLoading) {
            return (
                <>
                    <div className="inventory-heading">
                        <h2>Inventory Records</h2>
                    </div>
                    <div className="inventory-content">
                        <div className="inventory-loading">
                            <i className="fas fa-spinner fa-spin"></i>
                            <p>Loading records...</p>
                        </div>
                    </div>
                </>
            );
        }

        if (error) {
            return (
                <>
                    <div className="inventory-heading">
                        <h2>Inventory Records</h2>
                    </div>
                    <div className="inventory-content">
                        <div className="inventory-error">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>{error}</p>
                            <button onClick={this.fetchInventoryRecords} className="retry-btn">
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
                    <h2>Inventory Records</h2>
                </div>
                <div className="inventory-content">
                    {records.length === 0 ? (
                        <div className="inventory-empty-state">
                            <i className="fas fa-clipboard-list"></i>
                            <h3>No Records Found</h3>
                            <p>No inventory orders have been recorded yet.</p>
                        </div>
                    ) : (
                        <div className="inventory-records-grid-container" style={{ height: '500px', width: '100%' }}>
                            <AgGridReact
                                columnDefs={this.columnDefs}
                                rowData={records}
                                pagination={true}
                                paginationPageSize={records.length}
                                paginationPageSizeSelector={[25, 50, 100, 200, records.length]}
                                domLayout="normal"
                                onGridReady={this.onGridReady}
                                suppressColumnVirtualisation={true}
                                animateRows={true}
                                rowSelection="single"
                                enableCellTextSelection={true}
                            />
                        </div>
                    )}
                </div>
            </>
        );
    }
}

export default InventoryRecords;
