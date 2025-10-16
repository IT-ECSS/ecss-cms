import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/fundraising.css';
import '../../../css/sub/fundraisingInventory.css';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Register the community modules
ModuleRegistry.registerModules([AllCommunityModule]);

class FundraisingInventory extends Component {
    constructor(props) {
        super(props);
        this.state = {
            inventoryData: [],
            isLoading: false,
            error: null,
            filteredData: [],
            rowData: [],
            columnDefs: [],
            totalProducts: 0,
            viewMode: 'table', // 'table' or 'card' - default to table view
            editingProduct: null,
            editValues: {},
            cardEditMode: true, // Default to edit mode for cards
            editingFields: {} // Track which fields are being edited
        };
        this.gridRef = React.createRef();
    }

    async componentDidMount() {
        await this.fetchInventoryData();
        // Close any loading popup from parent component
        if (this.props.closePopup1) {
            this.props.closePopup1();
        }
        if (this.props.onDataLoaded) {
            this.props.onDataLoaded();
        }
    }

    // Fetch inventory data from Django backend
    fetchInventoryData = async () => {
        try {
            this.setState({ error: null });

            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            const response = await axios.get(`${baseUrl}/fundraising_product_details/`);

            console.log('Fundraising inventory data fetched:', response.data);

            if (response.data.success) {
                const products = response.data.fundraising_products || [];
                
                this.setState({
                    inventoryData: products,
                    filteredData: products,
                    totalProducts: products.length
                }, () => {
                    this.updateRowData();
                    // Close loading popup
                    if (this.props.closePopup1) {
                        this.props.closePopup1();
                    }
                });

            } else {
                throw new Error(response.data.message || 'Failed to fetch inventory data');
            }

        } catch (error) {
            console.error('Error fetching inventory data:', error);
            this.setState({
                error: error.message
            });
            // Close loading popup even on error
            if (this.props.closePopup1) {
                this.props.closePopup1();
            }
        }
    };

    // Update grid row data
    updateRowData = () => {
        const { filteredData } = this.state;
        const rowData = filteredData.map((product, index) => ({
            id: product.id,
            sn: product.id,
            name: product.name ? product.name.replace(/\s*<\/?br\s*\/?>\s*/gi, '<br>') : '',
            price: parseFloat(product.price),
            stock_quantity: product.stock_quantity,
            description: product.description,
            images: product.images
        }));

        this.setState({ 
            rowData,
            columnDefs: this.getColumnDefs()
        });
    };

    // Get column definitions for ag-grid
    getColumnDefs = () => {
        return [
            {
                headerName: "Product Id",
                field: "sn",
                width: 150
            },
            {
                headerName: "Product Image",
                field: "images",
                width: 300,
                cellRenderer: (params) => {
                    const images = params.value;
                    if (images && images.length > 0) {
                        return (
                            <div className="product-image-container">
                                <img 
                                    src={images[0].src} 
                                    alt={params.data.name}
                                    className="product-image"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="image-placeholder" style={{ display: 'none' }}>
                                    No Image
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div className="product-image-container">
                            <div className="image-placeholder">
                                No Image
                            </div>
                        </div>
                    );
                }
            },
            {
                headerName: "Product Name",
                field: "name",
                width: 600,
                cellRenderer: (params) => {
                    return (
                        <div 
                            className="product-name-cell" 
                            title={params.value}
                            dangerouslySetInnerHTML={{ __html: params.value }}
                        />
                    );
                }
            },
            {
                headerName: "Price ($)",
                field: "price",
                width: 200,
                cellRenderer: (params) => {
                    return `$${params.value.toFixed(2)}`;
                }
            },
            {
                headerName: "Current Quantity",
                field: "stock_quantity",
                width: 250
            }
        ];
    };

    // Export inventory to Excel
    exportToExcel = () => {
        try {
            const { filteredData } = this.state;
            
            // Prepare data for export
            const exportData = filteredData.map((product, index) => ({
                'Product Id': index + 1,
                'Product Name': product.name,
                'Price ($)': parseFloat(product.price).toFixed(2),
                'Current Quantity': product.stock_quantity,
                'Description': product.description || ''
            }));

            // Create workbook and worksheet
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Fundraising Inventory');

            // Generate Excel file and download
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const fileName = `fundraising_inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
            saveAs(data, fileName);

            console.log('Inventory exported to Excel successfully');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
        }
    };

    // Toggle between table and card view
    toggleViewMode = () => {
        this.setState(prevState => ({
            viewMode: prevState.viewMode === 'table' ? 'card' : 'table'
        }));
    };

    // Start editing a product
    startEditing = (product) => {
        this.setState({
            editingProduct: product.id,
            editValues: {
                price: product.price,
                stock_quantity: product.stock_quantity
            }
        });
    };

    // Cancel editing
    cancelEditing = () => {
        this.setState({
            editingProduct: null,
            editValues: {}
        });
    };

    // Update edit values
    updateEditValue = (field, value) => {
        this.setState(prevState => ({
            editValues: {
                ...prevState.editValues,
                [field]: value
            }
        }));
    };

    // Update product values for a specific product
    updateProductValue = (productId, field, value) => {
        this.setState(prevState => {
            const updatedData = prevState.filteredData.map(product => {
                if (product.id === productId) {
                    return {
                        ...product,
                        [field]: value // Store the raw value as string to allow empty fields and intermediate typing
                    };
                }
                return product;
            });

            return {
                filteredData: updatedData,
                inventoryData: updatedData
            };
        });
    };

    // Update individual product
    updateIndividualProduct = async (productId) => {
        try {
            const product = this.state.filteredData.find(p => p.id === productId);
            
            // Validate the inputs
            // Allow empty price, but if provided, it must be valid
            if (product.price !== '' && product.price !== null && product.price !== undefined && (isNaN(product.price) || parseFloat(product.price) < 0)) {
                console.log('Invalid price entered');
                return;
            }
            if (isNaN(product.stock_quantity) || parseInt(product.stock_quantity) < 0) {
                console.log('Invalid quantity entered');
                return;
            }

            // Make API call to update the product
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";
            
            const updateData = {
                product_id: productId,
                price: product.price === '' || product.price === null || product.price === undefined ? 0 : parseFloat(product.price),
                stock_quantity: parseInt(product.stock_quantity)
            };

            const response = await axios.post(`${baseUrl}/update_fundraising_product/`, updateData);

            if (response.data.success) {
                console.log('Product updated successfully!');
                console.log('Product update response:', response.data);
                
                // Refresh the component data to reflect the changes
                console.log('Refreshing component data...');
                await this.fetchInventoryData();
                console.log('Component refreshed successfully');
                
                // Switch to table view after successful update
                this.setState({ viewMode: 'table' });
            } else {
                throw new Error(response.data.error || response.data.message || 'Update failed');
            }
            
        } catch (error) {
            console.error('Error updating product:', error);
            
            if (error.response && error.response.data) {
                console.error(`Failed to update product: ${error.response.data.error || error.response.data.message}`);
            } else {
                console.error('Failed to update product. Please try again.');
            }
        }
    };

    // Refresh inventory data
    refreshData = () => {
        this.fetchInventoryData();
    };

    // Render card view
    renderCardView = () => {
        const { filteredData } = this.state;
        
        return (
            <div className="card-grid">
                {filteredData.map((product, index) => (
                    <div key={product.id} className="product-card">
                        <div className="card-image-container">
                            {product.images && product.images.length > 0 ? (
                                <img 
                                    src={product.images[0].src} 
                                    alt={product.name}
                                    className="card-product-image"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            {(!product.images || product.images.length === 0) && (
                                <div className="card-image-placeholder">
                                    No Image
                                </div>
                            )}
                        </div>
                        <div className="card-content">
                            <h3 
                                className="card-product-name"
                                dangerouslySetInnerHTML={{ 
                                    __html: product.name ? product.name.replace(/\s*<\/?br\s*\/?>\s*/gi, '<br>') : '' 
                                }}
                            />
                            
                            {/* Form fields directly in card content */}
                            <div className="edit-field">
                                <label>Price:</label>
                                <input
                                    type="text"
                                    value={(() => {
                                        const fieldKey = `${product.id}_price`;
                                        const isEditing = this.state.editingFields[fieldKey];
                                        
                                        if (isEditing) {
                                            // Show raw value while editing
                                            return product.price || '';
                                        } else {
                                            // Show formatted value when not editing
                                            return product.price && product.price !== '' ? parseFloat(product.price).toFixed(2) : '';
                                        }
                                    })()}
                                    onFocus={(e) => {
                                        // Mark field as being edited
                                        const fieldKey = `${product.id}_price`;
                                        this.setState(prevState => ({
                                            editingFields: {
                                                ...prevState.editingFields,
                                                [fieldKey]: true
                                            }
                                        }));
                                    }}
                                    onBlur={(e) => {
                                        // Stop editing and format if needed
                                        const fieldKey = `${product.id}_price`;
                                        this.setState(prevState => ({
                                            editingFields: {
                                                ...prevState.editingFields,
                                                [fieldKey]: false
                                            }
                                        }));
                                    }}
                                    onChange={(e) => this.updateProductValue(product.id, 'price', e.target.value)}
                                    className="card-price-input"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="edit-field">
                                <label>Current Quantity:</label>
                                <input
                                    type="text"
                                    value={product.stock_quantity || ''}
                                    onChange={(e) => this.updateProductValue(product.id, 'stock_quantity', e.target.value)}
                                    className="card-stock-input"
                                    placeholder="0"
                                />
                            </div>
                            
                            <button 
                                className="card-update-btn"
                                onClick={() => this.updateIndividualProduct(product.id)}
                            >
                                <i className="fas fa-save"></i> Update
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Grid ready event
    onGridReady = (params) => {
        this.gridApi = params.api;
        this.gridColumnApi = params.columnApi;
    };

    render() {
        const { 
            error, 
            rowData, 
            columnDefs,
            totalProducts,
            filteredData,
            viewMode
        } = this.state;

        if (error) {
            return (
                <div className="fundraising-container">
                    <div className="error-container">
                        <h3>Error Loading Inventory</h3>
                        <p>{error}</p>
                        <button onClick={this.refreshData} className="retry-btn">
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="fundraising-container">
                <div className="fundraising-heading">
                    <h2>Fundraising Inventory</h2>
                    <div className="view-toggle-container">
                        <button 
                            className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={this.toggleViewMode}
                            title="Browse products in table format"
                        >
                            <i className="fas fa-table"></i> Browse View
                        </button>
                        <button 
                            className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                            onClick={this.toggleViewMode}
                            title="Edit inventory with individual forms"
                        >
                            <i className="fas fa-edit"></i> Edit Inventory
                        </button>
                    </div>
                </div>

                {viewMode === 'table' ? (
                    <div className="grid-container">
                        <AgGridReact
                            ref={this.gridRef}
                            rowData={rowData}
                            columnDefs={columnDefs}
                            onGridReady={this.onGridReady}
                            suppressRowClickSelection={true}
                            pagination={true}
                            paginationPageSize={10}
                            domLayout="normal"
                            defaultColDef={{
                                resizable: true,
                                sortable: true
                            }}
                            rowHeight={100}
                            headerHeight={50}
                            suppressMenuHide={true}
                            suppressColumnVirtualisation={true}
                            enableRangeSelection={true}
                            animateRows={true}
                        />
                    </div>
                ) : (
                    <div className="card-view-container">
                        {this.renderCardView()}
                    </div>
                )}
            </div>
        );
    }
}

export default FundraisingInventory;