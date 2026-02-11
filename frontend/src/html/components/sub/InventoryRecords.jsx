import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { io } from 'socket.io-client';
import '../../../css/sub/inventoryModules.css';

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

    generateReceipt = async (record) => {
        try {
            const backendUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3001" 
                : "https://ecss-backend-node.azurewebsites.net";

            const response = await axios.post(`${backendUrl}/inventory`, {
                purpose: "generateReceipt",
                customerName: record.customerName,
                paymentMethod: record.paymentMethod || 'Cash',
                receiptNumber: record.receiptNumber,
                product: record.product,
                location: record.location,
                quantity: record.quantity,
                orderDate: record.orderDate,
                orderTime: record.orderTime,
                staffName: record.staffName,
                unitPrice: record.unitPrice || 0,
                totalPrice: record.totalPrice || 0
            });

            // Handle PDF download if generated
            if (response.data.result?.pdfGenerated && response.data.result?.pdfData) {
                const pdfBlob = new Blob(
                    [Uint8Array.from(atob(response.data.result.pdfData), c => c.charCodeAt(0))],
                    { type: 'application/pdf' }
                );
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = response.data.result.pdfFilename || 'receipt.pdf';
                link.click();
                URL.revokeObjectURL(pdfUrl);
            }
        } catch (error) {
            console.error('Error generating receipt:', error);
            alert('Failed to generate receipt. Please try again.');
        }
    };

    // Column definitions for the AG Grid
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
            width: 300, 
            //pinned: 'left',
        },
        { 
            headerName: 'Location', 
            field: 'location', 
            width: 150,
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
            width: 150,
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

    onGridReady = (params) => {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
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
                        <div className="inventory-records-grid-container ag-theme-inventory" style={{ height: '500px', width: '100%' }}>
                            <AgGridReact
                                columnDefs={this.columnDefs}
                                rowData={records}
                                pagination={true}
                                paginationPageSize={records.length}
                                paginationPageSizeSelector={[25, 50, 100, 200, records.length]}
                                domLayout="normal"
                                onGridReady={this.onGridReady}
                                rowSelection="single"
                                enableCellTextSelection={true}
                                headerHeight={28}
                                rowHeight={24}
                            />
                        </div>
                    )}
                </div>
            </>
        );
    }
}

export default InventoryRecords;
