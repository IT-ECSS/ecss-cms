import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/fundraisingInventory.css';
import '../../../css/ag-grid-custom-theme.css';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import NewProductPopup from './NewProductPopup';

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
            editingFields: {}, // Track which fields are being edited
            isNewProductPopupOpen: false // New popup component state
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
        }, () => {
            // Refresh grid after data update (removed sizeColumnsToFit for horizontal scrolling)
            if (this.gridApi) {
                setTimeout(() => {
                    this.gridApi.refreshCells();
                }, 100);
            }
        });
    };

    // Get column definitions for ag-grid
    getColumnDefs = () => {
        return [
            {
                headerName: "Product Id",
                field: "sn",
                width: 200,
                resizable: true,
                suppressSizeToFit: true
            },
            {
                headerName: "Product Image",
                field: "images",
                width: 350,
                resizable: true,
                suppressSizeToFit: true,
                cellRenderer: (params) => {
                    const images = params.value;
                    if (images && images.length > 0) {
                        return (
                            <>
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
                            </>
                        );
                    }
                    return (
                        <div className="image-placeholder">
                            No Image
                        </div>
                    );
                }
            },
            {
                headerName: "Product Name",
                field: "name",
                width: 500,
                resizable: true,
                suppressSizeToFit: true,
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
                headerName: "Price",
                field: "price",
                width: 200,
                resizable: true,
                suppressSizeToFit: true,
                cellRenderer: (params) => {
                    return `$${params.value.toFixed(2)}`;
                }
            },
            {
                headerName: "Current Stock",
                field: "stock_quantity",
                width: 200,
                resizable: true,
                suppressSizeToFit: true
            },
            {
                headerName: "Stock Status",
                field: "stock_status",
                width: 200,
                resizable: true,
                suppressSizeToFit: true,
                cellRenderer: (params) => {
                    const stockQuantity = params.data.stock_quantity;
                    const statusValue = stockQuantity > 0 ? 'In Stock' : 'Out of Stock';
                    
                    const statusStyles = {
                      'In Stock': "#32CD32",  // Green (LimeGreen)
                      'Out of Stock': "#FF0000",  // Red
                    };
              
                    const backgroundColor = statusStyles[statusValue] || "#D3D3D3"; // Default light gray for unknown values
              
                    return (
                      <span
                        style={{
                          fontWeight: "bold",
                          color: "white",
                          textAlign: "center",
                          display: "inline-block",
                          borderRadius: "20px",
                          paddingLeft: "30px",
                          paddingRight: "30px",
                          width: "fit-content",
                          lineHeight: "30px",
                          whiteSpace: "nowrap",
                          backgroundColor: backgroundColor
                        }}
                      >
                        {statusValue}
                      </span>
                    );
                }
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
                'Current Stock': product.stock_quantity,
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

    // Save new product to backend
    saveProduct = async (productId, productData) => {
        try {
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";
            
            const saveData = {
                product_name: productData.product_name,
                description: productData.description,
                price: parseFloat(productData.price) || 0,
                stock_quantity: parseInt(productData.stock_quantity) || 0,
                category: productData.category,
                image_url: productData.image_url || []
            };

            // Call the create endpoint for new products
            const response = await axios.post(`${baseUrl}/create_fundraising_product/`, saveData);

            if (response.data.success) {
                console.log('Product created successfully!');
                console.log('Product creation response:', response.data);
                
                // Update the product with the real ID from backend
                this.setState(prevState => {
                    const updatedData = prevState.inventoryData.map(product => {
                        if (product.id === productId) {
                            return {
                                ...product,
                                id: response.data.product_id || product.id,
                                is_new: false
                            };
                        }
                        return product;
                    });
                    
                    return {
                        inventoryData: updatedData,
                        filteredData: updatedData
                    };
                }, () => {
                    this.updateRowData();
                });
                
            } else {
                throw new Error(response.data.error || response.data.message || 'Save failed');
            }
            
        } catch (error) {
            console.error('Error saving product:', error);
            
            if (error.response && error.response.data) {
                console.error(`Failed to save product: ${error.response.data.error || error.response.data.message}`);
            } else {
                console.error('Failed to save product. Please try again.');
            }
        }
    };

    // Handle adding a new item
    handleAddNewItem = () => {
        // Show the new product popup
        this.setState({
            isNewProductPopupOpen: true
        });
    };

    // Handle creating item with uploaded images
    handleCreateItemWithImages = (uploadedImageUrls, productData = null) => {
        // Create a new product object with uploaded images and form data
        const newProduct = {
            id: Date.now(), // Temporary ID until saved to backend
            product_name: productData ? productData.product_name : '',
            description: productData ? productData.description : '',
            price: productData ? productData.price : 0,
            stock_quantity: productData ? productData.stock_quantity : 0,
            category: productData ? productData.category : '',
            image_url: uploadedImageUrls,
            is_new: true // Flag to identify new items
        };

        // Add to the beginning of the inventory data
        this.setState(prevState => ({
            inventoryData: [newProduct, ...prevState.inventoryData],
            filteredData: [newProduct, ...prevState.filteredData],
            editingProduct: productData ? null : newProduct.id, // Only auto-edit if no form data provided
            editValues: productData ? {} : {
                product_name: '',
                description: '',
                price: 0,
                stock_quantity: 0,
                category: ''
            },
            isNewProductPopupOpen: false // Close the popup
        }), () => {
            this.updateRowData();
            
            // If we have complete product data, save immediately
            if (productData && productData.product_name) {
                this.saveProduct(newProduct.id, newProduct);
            }
        });
    };

    // Handle removing an item
    handleRemoveItem = () => {
        const { editingProduct } = this.state;
        
        if (!editingProduct) {
            alert('Please select an item to remove by clicking on it first.');
            return;
        }

        if (window.confirm('Are you sure you want to remove this item from the inventory?')) {
            this.setState(prevState => ({
                inventoryData: prevState.inventoryData.filter(item => item.id !== editingProduct),
                filteredData: prevState.filteredData.filter(item => item.id !== editingProduct),
                editingProduct: null,
                editValues: {}
            }), () => {
                this.updateRowData();
                // Here you would typically also make an API call to delete from backend
                // this.deleteItemFromBackend(editingProduct);
            });
        }
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
                                <label>Current Stock:</label>
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
        
        // Don't auto-size columns to enable horizontal scrolling with fixed column widths
        // params.api.sizeColumnsToFit(); - Removed to allow horizontal scrolling
        
        // Optional: Listen for window resize to refresh grid layout
        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (params.api) {
                    params.api.refreshCells();
                }
            }, 100);
        });
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
                    <div className="table-wrapper">
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
                                sortable: true,
                                suppressSizeToFit: true
                            }}
                            rowHeight={100}
                            headerHeight={50}
                            suppressMenuHide={true}
                            suppressColumnVirtualisation={false}
                            enableRangeSelection={true}
                            animateRows={true}
                            suppressHorizontalScroll={false}
                            maintainColumnOrder={true}
                        />
                    </div>
                ) : (
                    <>
                        <div className="card-view-actions">
                            <button 
                                className="action-btn add-item-btn"
                                onClick={this.handleAddNewItem}
                                title="Add a new item to inventory"
                            >
                                <i className="fas fa-plus"></i> Add New Item
                            </button>
                            <button 
                                className="action-btn remove-item-btn"
                                onClick={this.handleRemoveItem}
                                title="Remove selected item from inventory"
                            >
                                Remove Item
                            </button>
                        </div>
                        <div className="card-view-container">
                            {this.renderCardView()}
                        </div>
                    </>
                )}
                
                {/* New Product Popup */}
                <NewProductPopup
                    isOpen={this.state.isNewProductPopupOpen}
                    onClose={() => this.setState({ isNewProductPopupOpen: false })}
                    onCreateItem={this.handleCreateItemWithImages}
                />
            </div>
        );
    }
}

export default FundraisingInventory;