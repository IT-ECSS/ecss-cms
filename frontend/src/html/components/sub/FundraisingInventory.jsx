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
            isNewProductPopupOpen: false, // New popup component state
            activeStockTab: {}, // Track active tab for each product (add, reduce, restock)
            tempEditValues: {}, // Temporary edit values for form inputs (not committed to state until save)
            stockOperations: {}, // Track stock operations: { productId: { type: 'add'|'reduce'|'restock', originalStock, newValue } }
            isUpdating: {} // Track which products are being updated: { productId: true/false }
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

    // Update product values for a specific product (stored in tempEditValues, not committed until save)
    updateProductValue = (productId, field, value) => {
        this.setState(prevState => ({
            tempEditValues: {
                ...prevState.tempEditValues,
                [`${productId}_${field}`]: value
            }
        }));
    };

    // Update individual product
    updateIndividualProduct = async (productId) => {
        try {
            // Mark this product as updating
            this.setState(prevState => ({
                isUpdating: {
                    ...prevState.isUpdating,
                    [productId]: true
                }
            }));
            
            // Find the current product to get current values
            const product = this.state.filteredData.find(p => p.id === productId);
            if (!product) throw new Error('Product not found');

            // Get the new values from tempEditValues (only if they were explicitly edited)
            const newPrice = this.state.tempEditValues[`${productId}_price`];
            console.log('updateIndividualProduct called for product:', productId);
            console.log('newPrice from tempEditValues:', newPrice);
            console.log('Current product stock:', product.stock_quantity, 'Current product price:', product.price);
            
            // For stock, use the current product stock (after it was updated by handleAddStock/Reduce/Restock)
            // The tempEditValues[stock_quantity] will be empty string after action, so we use the product value instead
            const stockToUse = product.stock_quantity;

            // Determine price to use - if edited, use new value; otherwise use existing
            const priceToUse = newPrice !== undefined && newPrice !== '' ? newPrice : product.price;
            console.log('priceToUse will be:', priceToUse);

            // Validate inputs
            if (priceToUse && priceToUse !== '' && (isNaN(parseFloat(priceToUse)) || parseFloat(priceToUse) < 0)) {
                throw new Error('Invalid price - must be a non-negative number');
            }

            if (stockToUse === null || stockToUse === undefined) {
                throw new Error('Invalid stock - cannot be empty');
            }
            const parsedStock = parseInt(stockToUse);
            if (isNaN(parsedStock) || parsedStock < 0) {
                throw new Error('Invalid stock - must be a non-negative integer');
            }

            // Build payload with the new values
            const baseUrl = window.location.hostname === "localhost" 
                ? "http://localhost:3002" 
                : "https://ecss-backend-django.azurewebsites.net";

            const payload = {
                product_id: productId,
                price: priceToUse ? parseFloat(priceToUse) : 0,
                stock_quantity: parseInt(stockToUse)
            };

            // Add stock operation if exists - this contains the operation type and value
            const stockOp = this.state.stockOperations[productId];
            if (stockOp) {
                payload.stock_operation = stockOp.type;
                payload.original_stock = stockOp.originalStock;
                payload.operation_value = stockOp.newValue;
                console.log('Stock operation:', { type: stockOp.type, originalStock: stockOp.originalStock, newValue: stockOp.newValue });
            }

            console.log('Sending payload to backend:', payload);
            const response = await axios.post(`${baseUrl}/update_fundraising_product_details/`, payload);
            
            console.log('Backend response:', response.data);

            if (!response.data.success) {
                throw new Error(response.data.error || response.data.message || 'Update failed');
            }

            console.log('Product updated successfully!');
        
            // Refresh data and switch to table view
            await this.fetchInventoryData();
            
            // Clear stock operations after successful update, but keep the price value
            // Reset active stock tab to 'add' for this product
            this.setState(prevState => ({
                tempEditValues: {
                    ...prevState.tempEditValues,
                    [`${productId}_stock_quantity`]: undefined
                    // Keep price value - DO NOT clear it
                },
                stockOperations: {
                    ...prevState.stockOperations,
                    [productId]: null
                },
                viewMode: 'table',
                activeStockTab: {
                    ...prevState.activeStockTab,
                    [productId]: 'add'
                },
                isUpdating: {
                    ...prevState.isUpdating,
                    [productId]: false
                }
            }));
            
        } catch (error) {
            console.error('Error updating product:', error.message);
            if (error.response?.data) {
                console.error('Backend error details:', error.response.data);
            }
            // Mark as not updating on error
            this.setState(prevState => ({
                isUpdating: {
                    ...prevState.isUpdating,
                    [productId]: false
                }
            }));
        }
    };

    // Handle stock tab switching
    handleStockTabSwitch = (productId, tab) => {
        this.setState(prevState => ({
            activeStockTab: {
                ...prevState.activeStockTab,
                [productId]: tab
            }
        }));
    };

    // Handle adding stock (increment by 1) - updates tempEditValues and auto-saves
    handleAddStock = (productId) => {
        this.setState(prevState => {
            // Get the input value from Edit Stock field (tempEditValues)
            const inputValue = prevState.tempEditValues[`${productId}_stock_quantity`];
            
            // If input is empty or undefined, don't proceed
            if (inputValue === '' || inputValue === undefined) {
                return null;
            }
            
            // Parse the input value as integer
            const valueToAdd = parseInt(inputValue);
            
            // If parsed value is invalid (NaN) or negative, don't proceed
            if (isNaN(valueToAdd) || valueToAdd < 0) {
                return null;
            }
            
            // If value is 0, don't proceed (no point in adding 0)
            if (valueToAdd === 0) {
                return null;
            }
            
            // Get the product - return early if not found
            const product = prevState.filteredData.find(p => p.id === productId);
            if (!product) {
                console.error('Product not found:', productId);
                return null;
            }
            
            const originalStock = product.stock_quantity || 0;
            
            // Find the product in filteredData and update stock
            const filteredDataCopy = prevState.filteredData.map(prod => {
                if (prod.id === productId) {
                    const newStock = (prod.stock_quantity || 0) + valueToAdd;
                    return { ...prod, stock_quantity: newStock };
                }
                return prod;
            });
            
            // Also update inventoryData to keep both arrays in sync
            const inventoryDataCopy = prevState.inventoryData.map(prod => {
                if (prod.id === productId) {
                    const newStock = (prod.stock_quantity || 0) + valueToAdd;
                    return { ...prod, stock_quantity: newStock };
                }
                return prod;
            });
            
            return {
                filteredData: filteredDataCopy,
                inventoryData: inventoryDataCopy,
                stockOperations: {
                    ...prevState.stockOperations,
                    [productId]: { type: 'add', originalStock, newValue: valueToAdd }
                }
            };
        }, () => {
            this.updateIndividualProduct(productId);
        });
    };

    // Handle reducing stock - subtracts input value from current stock and auto-saves
    handleReduceStock = (productId) => {
        this.setState(prevState => {
            // Get the input value from Edit Stock field (tempEditValues)
            const inputValue = prevState.tempEditValues[`${productId}_stock_quantity`];
            
            // If input is empty or undefined, don't proceed
            if (inputValue === '' || inputValue === undefined) {
                return null;
            }
            
            // Parse the input value as integer
            const valueToReduce = parseInt(inputValue);
            
            // If parsed value is invalid (NaN) or negative, don't proceed
            if (isNaN(valueToReduce) || valueToReduce < 0) {
                return null;
            }
            
            // If value is 0, don't proceed (no point in reducing by 0)
            if (valueToReduce === 0) {
                return null;
            }
            
            // Get the product - return early if not found
            const product = prevState.filteredData.find(p => p.id === productId);
            if (!product) {
                console.error('Product not found:', productId);
                return null;
            }
            
            const originalStock = product.stock_quantity || 0;
            
            //*/ Find the product in filteredData and update stock
            const filteredDataCopy = prevState.filteredData.map(prod => {
                if (prod.id === productId) {
                    // Subtract the input value from current stock (minimum 0)
                    const newStock = Math.max(0, (prod.stock_quantity || 0) - valueToReduce);
                    return { ...prod, stock_quantity: newStock };
                }
                return prod;
            });
            
            // Also update inventoryData to keep both arrays in sync
            const inventoryDataCopy = prevState.inventoryData.map(prod => {
                if (prod.id === productId) {
                    const newStock = Math.max(0, (prod.stock_quantity || 0) - valueToReduce);
                    return { ...prod, stock_quantity: newStock };
                }
                return prod;
            });
            
            return {
                filteredData: filteredDataCopy,
                inventoryData: inventoryDataCopy,
                stockOperations: {
                    ...prevState.stockOperations,
                    [productId]: { type: 'reduce', originalStock, newValue: valueToReduce }
                }
            };
        }, () => {
            this.updateIndividualProduct(productId);
        });
    };

    // Handle restocking - sets stock to the entered quantity and auto-saves
    handleRestockProduct = (productId) => {
        this.setState(prevState => {
            // Get the input value from Edit Stock field (tempEditValues)
            const inputValue = prevState.tempEditValues[`${productId}_stock_quantity`];
            
            // If input is empty or undefined, don't proceed
            if (inputValue === '' || inputValue === undefined) {
                return null;
            }
            
            // Parse the input value as integer
            const restockQuantity = parseInt(inputValue);
            
            // If parsed value is invalid (NaN) or negative, don't proceed
            if (isNaN(restockQuantity) || restockQuantity < 0) {
                return null;
            }
            
            // Get the product - return early if not found
            const product = prevState.filteredData.find(p => p.id === productId);
            if (!product) {
                console.error('Product not found:', productId);
                return null;
            }
            
            const originalStock = product.stock_quantity || 0;
            
            // Find the product in filteredData and update stock
            const filteredDataCopy = prevState.filteredData.map(prod => {
                if (prod.id === productId) {
                    // Set stock to the entered quantity
                    return { ...prod, stock_quantity: restockQuantity };
                }
                return prod;
            });
            
            // Also update inventoryData to keep both arrays in sync
            const inventoryDataCopy = prevState.inventoryData.map(prod => {
                if (prod.id === productId) {
                    return { ...prod, stock_quantity: restockQuantity };
                }
                return prod;
            });
            
            return {
                filteredData: filteredDataCopy,
                inventoryData: inventoryDataCopy,
                stockOperations: {
                    ...prevState.stockOperations,
                    [productId]: { type: 'restock', originalStock, newValue: restockQuantity }
                }
            };
        }, () => {
            this.updateIndividualProduct(productId);
        });
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
                        <h3 
                            className="card-product-name"
                            dangerouslySetInnerHTML={{ 
                                __html: product.name ? product.name.replace(/\s*<\/?br\s*\/?>\s*/gi, '<br>') : '' 
                            }}
                        />
                        <div className="card-content">
                            
                            {/* Price and Stock Info Row */}
                            <div className="card-info-row">
                                <div className="info-group">
                                    <span className="info-label">Price:</span>
                                    <span className="info-value price-value">
                                        ${(() => {
                                            return product.price && product.price !== '' ? parseFloat(product.price).toFixed(2) : '0.00';
                                        })()}
                                    </span>
                                </div>
                                <div className="info-group">
                                    <span className="info-label">Current Stock:</span>
                                    <span className="info-value stock-value">
                                        {product.stock_quantity !== undefined && product.stock_quantity !== null ? product.stock_quantity : 0}
                                    </span>
                                </div>
                            </div>

                            {/* Edit Fields Section */}
                            <div className="card-edit-section">
                                <div className="edit-field">
                                    <label>Edit Price:</label>
                                    <div className="price-input-wrapper">
                                        <span className="price-prefix">$</span>
                                        <input
                                            type="text"
                                            value={
                                                this.state.tempEditValues[`${product.id}_price`] !== undefined && this.state.tempEditValues[`${product.id}_price`] !== '' 
                                                    ? this.state.tempEditValues[`${product.id}_price`] 
                                                    : (product.price && product.price !== '' ? parseFloat(product.price).toFixed(2) : '0.00')
                                            }
                                            onFocus={(e) => {
                                                const fieldKey = `${product.id}_price`;
                                                // When focusing, if tempEditValues is empty, initialize it with current price
                                                if (this.state.tempEditValues[fieldKey] === undefined) {
                                                    this.setState(prevState => ({
                                                        tempEditValues: {
                                                            ...prevState.tempEditValues,
                                                            [fieldKey]: parseFloat(product.price).toFixed(2)
                                                        },
                                                        editingFields: {
                                                            ...prevState.editingFields,
                                                            [fieldKey]: true
                                                        }
                                                    }));
                                                } else {
                                                    this.setState(prevState => ({
                                                        editingFields: {
                                                            ...prevState.editingFields,
                                                            [fieldKey]: true
                                                        }
                                                    }));
                                                }
                                            }}
                                            onBlur={(e) => {
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
                                    <button 
                                        className="price-save-btn"
                                        onClick={() => {
                                            const priceValue = this.state.tempEditValues[`${product.id}_price`] !== undefined ? this.state.tempEditValues[`${product.id}_price`] : product.price;
                                            console.log(`Saving price for product ${product.id}:`, { editedPrice: this.state.tempEditValues[`${product.id}_price`], finalPrice: priceValue });
                                            this.updateIndividualProduct(product.id);
                                        }}
                                        disabled={this.state.isUpdating[product.id]}
                                        title="Save price changes"
                                    >
                                        <i className="fas fa-save"></i> Save Price
                                    </button>
                                </div>

                                <div className="edit-field">
                                    <label>Edit Stock:</label>
                                    <div className="stock-tabs-wrapper">
                                        <div className="stock-tabs">
                                            {(parseInt(product.stock_quantity) || 0) > 0 && (
                                                <>
                                                    <button 
                                                        className={`stock-tab ${(this.state.activeStockTab[product.id] || 'add') === 'add' ? 'active' : ''}`}
                                                        onClick={() => this.handleStockTabSwitch(product.id, 'add')}
                                                        title="Add stock"
                                                    >
                                                        <i className="fas fa-plus"></i> Add
                                                    </button>
                                                    <button 
                                                        className={`stock-tab ${(this.state.activeStockTab[product.id] || 'add') === 'reduce' ? 'active' : ''}`}
                                                        onClick={() => this.handleStockTabSwitch(product.id, 'reduce')}
                                                        title="Reduce stock"
                                                    >
                                                        <i className="fas fa-minus"></i> Reduce
                                                    </button>
                                                </>
                                            )}
                                            {(parseInt(product.stock_quantity) || 0) === 0 && (
                                                <button 
                                                    className={`stock-tab ${(this.state.activeStockTab[product.id] || 'restock') === 'restock' ? 'active' : ''}`}
                                                    onClick={() => this.handleStockTabSwitch(product.id, 'restock')}
                                                    title="Restock product"
                                                >
                                                    <i className="fas fa-redo"></i> Restock
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Add Tab Content - Only show when stock > 0 */}
                                        {(parseInt(product.stock_quantity) || 0) > 0 && (this.state.activeStockTab[product.id] || 'add') === 'add' && (
                                            <div className="stock-tab-content">
                                                <input
                                                    type="text"
                                                    value={this.state.tempEditValues[`${product.id}_stock_quantity`] !== undefined ? this.state.tempEditValues[`${product.id}_stock_quantity`] : ''}
                                                    onChange={(e) => this.updateProductValue(product.id, 'stock_quantity', e.target.value)}
                                                    className="card-stock-input"
                                                    placeholder="0"
                                                />
                                                <button 
                                                    className="stock-action-btn stock-action-add"
                                                    onClick={() => this.handleAddStock(product.id)}
                                                    disabled={this.state.isUpdating[product.id]}
                                                    title="Add to stock"
                                                >
                                                    <i className="fas fa-plus"></i> Add {this.state.tempEditValues[`${product.id}_stock_quantity`] !== undefined ? this.state.tempEditValues[`${product.id}_stock_quantity`] : '0'} Unit(s)
                                                </button>
                                            </div>
                                        )}

                                        {/* Reduce Tab Content - Only show when stock > 0 */}
                                        {(parseInt(product.stock_quantity) || 0) > 0 && (this.state.activeStockTab[product.id] || 'add') === 'reduce' && (
                                            <div className="stock-tab-content">
                                                <input
                                                    type="text"
                                                    value={this.state.tempEditValues[`${product.id}_stock_quantity`] !== undefined ? this.state.tempEditValues[`${product.id}_stock_quantity`] : ''}
                                                    onChange={(e) => this.updateProductValue(product.id, 'stock_quantity', e.target.value)}
                                                    className="card-stock-input"
                                                    placeholder="0"
                                                />
                                                <button 
                                                    className="stock-action-btn stock-action-reduce"
                                                    onClick={() => this.handleReduceStock(product.id)}
                                                    disabled={this.state.isUpdating[product.id]}
                                                    title="Reduce stock"
                                                >
                                                    <i className="fas fa-minus"></i> Reduce {this.state.tempEditValues[`${product.id}_stock_quantity`] !== undefined ? this.state.tempEditValues[`${product.id}_stock_quantity`] : '0'} Unit(s)
                                                </button>
                                            </div>
                                        )}

                                        {/* Restock Tab Content - Only show when stock is 0 */}
                                        {(parseInt(product.stock_quantity) || 0) === 0 && (this.state.activeStockTab[product.id] || 'restock') === 'restock' && (
                                            <div className="stock-tab-content">
                                                <input
                                                    type="number"
                                                    className="stock-input"
                                                    placeholder="Enter restock quantity"
                                                    value={this.state.tempEditValues[`${product.id}_stock_quantity`] !== undefined ? this.state.tempEditValues[`${product.id}_stock_quantity`] : ''}
                                                    onChange={(e) => this.updateProductValue(product.id, 'stock_quantity', e.target.value)}
                                                    min="0"
                                                />
                                                <button 
                                                    className="stock-action-btn stock-action-restock"
                                                    onClick={() => this.handleRestockProduct(product.id)}
                                                    disabled={this.state.isUpdating[product.id]}
                                                    title="Restock with entered quantity"
                                                >
                                                    <i className="fas fa-redo"></i> Restock Unit(s)
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                                className="action-btn btn-add-item"
                                onClick={this.handleAddNewItem}
                                title="Add a new item to inventory"
                            >
                                <i className="fas fa-plus"/> Add New Item
                            </button>
                            <button 
                                className="action-btn btn-remove-item"
                                onClick={this.handleRemoveItem}
                                title="Remove selected item from inventory"
                            >
                                <i className="fas fa-minus"/> Remove Item
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