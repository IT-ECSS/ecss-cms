import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import '../../../css/sub/inventoryModules.css';
import '../../../css/ag-grid-custom-theme.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

class InventoryRecords extends Component {
    constructor(props) {
        super(props);
        this.gridApi = null;
        this.gridColumnApi = null;
    }

    // Column definitions for the AG Grid
    columnDefs = [
        { 
            headerName: 'S/N', 
            valueGetter: (params) => params.node.rowIndex + 1,  
            width: 80, 
            pinned: 'left'
        },
        { 
            headerName: 'Customer Name', 
            field: 'customerName', 
            width: 180, 
            pinned: 'left'
        },
        { 
            headerName: 'Product', 
            field: 'product', 
            width: 200, 
            pinned: 'left'
        },
        { 
            headerName: 'Location', 
            field: 'location', 
            width: 250, 
        },
        { 
            headerName: 'Quantity', 
            field: 'quantity', 
            width: 100, 
            cellStyle: { textAlign: 'center' }
        },
        { 
            headerName: 'Order Date', 
            field: 'orderDate', 
            width: 130
        },
        { 
            headerName: 'Order Time', 
            field: 'orderTime', 
            width: 120
        },
        { 
            headerName: 'Staff Name', 
            field: 'staffName', 
            width: 180
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
    }

    render() {
        const { records = [], isLoading = false, error = null, onRetry } = this.props;

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
                            <button onClick={onRetry} className="retry-btn">
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
