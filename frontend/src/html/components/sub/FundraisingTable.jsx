import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import '../../../css/sub/fundraising.css';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import JSZip from 'jszip';
import { io } from 'socket.io-client';

// Register the community modules
ModuleRegistry.registerModules([AllCommunityModule]);

class FundraisingTable extends Component {
    constructor(props) {
      super(props);
      this.state = {
        fundraisingData: [],
        isLoading: true,
        focusedInputIndex: null,
        originalData: [],
        currentPage: 1,
        entriesPerPage: 100,
        remarks: "",
        paginatedDetails: [],
        columnDefs: [],
        rowData: [],
        expandedRowIndex: null,
        editedRowIndex: "",
        aiSearchQuery: '',
        aiSuggestions: [],
        anomalyThreshold: 0.8,
        phoneNumber: '',
        message: '',
        status: '',
        isAlertShown: false,
        showItemsModal: false,
        selectedItems: [],
        selectedRowData: null
      };
      this.tableRef = React.createRef();
      this.gridRef = React.createRef();
    }

    toggleRow = (index) => {
      this.setState((prevState) => ({
        expandedRow: prevState.expandedRow === index ? null : index,
      }));
    };  

    handleEntriesPerPageChange = (e) => {
      this.setState({
        entriesPerPage: parseInt(e.target.value, 100),
        currentPage: 1
      });
    }

    fetchFundraisingData = async () => 
    {
      try 
      {
        const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`, { 
          purpose: 'retrieve'
        });

        console.log('Fundraising data fetched:', response);
        
        // Check if the response has the expected structure
        if (response.data.result && response.data.result.success && response.data.result.data) {
          return response.data.result.data;
        } else {
          console.error('Unexpected response structure:', response.data);
          return [];
        }
    
      } catch (error) {
        console.error('Error fetching fundraising data:', error);
        return [];
      }
    };

    async componentDidMount() 
    {
      await this.fetchAndSetFundraisingData();

      /*// --- Live update via Socket.IO ---
      this.socket = io(
        window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : "https://ecss-backend-node.azurewebsites.net"
      );
      this.socket.on('fundraising', (data) => {
        console.log("Socket event received", data);
        this.fetchAndSetFundraisingData();
      });*/
    }

    componentWillUnmount() {
      if (this.socket) {
        this.socket.disconnect();
      }
    }

    async fetchAndSetFundraisingData() {
      // Save current scroll position and page
      const gridContainer = document.querySelector('.ag-body-viewport');
      const currentScrollTop = gridContainer ? gridContainer.scrollTop : 0;
      const currentPage = (this.gridApi && typeof this.gridApi.paginationGetCurrentPage === 'function') 
        ? this.gridApi.paginationGetCurrentPage() : 0;

      const data = await this.fetchFundraisingData();
      
      // Ensure data is an array, fallback to empty array if not
      const safeData = Array.isArray(data) ? data : [];

      this.setState({
        originalData: safeData,
        fundraisingData: safeData,
        isLoading: false
      }, () => {
        console.log("Initial data loaded, originalData length:", safeData?.length || 0);
        this.getRowData(safeData);

        // Restore scroll position and page after data is set
        if (gridContainer) {
          gridContainer.scrollTop = currentScrollTop;
        }
        if (this.gridApi && typeof this.gridApi.paginationGoToPage === 'function') {
          try {
            this.gridApi.paginationGoToPage(currentPage);
          } catch (error) {
            console.warn("Error setting pagination page:", error);
          }
        }

        // Call onDataLoaded if it exists
        if (this.props.onDataLoaded && typeof this.props.onDataLoaded === 'function') {
          this.props.onDataLoaded();
        }
      });
    }

    getRowData = (fundraisingData) => 
    {
      console.log('Processing fundraising data in getRowData:', fundraisingData);
      
      // Ensure fundraisingData is an array
      if (!Array.isArray(fundraisingData)) {
        console.error('fundraisingData is not an array:', fundraisingData);
        return [];
      }
      
      const rowData = fundraisingData.map((item, index) => ({
        id: item._id,
        sn: index + 1,
        firstName: item.personalInfo?.firstName || item.firstName || '',
        lastName: item.personalInfo?.lastName || item.lastName || '',
        contactNumber: item.personalInfo?.phone || item.contactNumber || '',
        email: item.personalInfo?.email || item.email || '',
        donationAmount: item.totalPrice || item.donationAmount || '',
        donationDate: item.orderDate,
        receiptNumber: item.receiptNumber,
        items: item.items,
        status: item.status || 'Pending',
        address: item.personalInfo?.address || item.address || '',
        postalCode: item.personalInfo?.postalCode || item.postalCode || '',
        paymentMethod: item.paymentMethod || '',
        collectionMode: item.collectionMode || ''
      }));
      
      console.log('Processed row data:', rowData);
      
      this.setState({ 
        rowData,
        columnDefs: this.getColumnDefs()
      });
    };

    getColumnDefs = () => {
      const columnDefs = [
        {
          headerName: "S/N",
          field: "sn",
          width: 100,
          pinned: "left",
        },
        {
          headerName: "First Name",
          field: "firstName",
          width: 150,
          editable: true,
          pinned: "left",
        },
        {
          headerName: "Last Name",
          field: "lastName",
          width: 150,
          editable: true,
          pinned: "left",
        },
        {
          headerName: "Contact Number",
          field: "contactNumber",
          width: 150,
          editable: true,
        },
        {
          headerName: "Email",
          field: "email",
          width: 250,
          editable: true,
        },
        {
          headerName: "Total Price",
          field: "donationAmount",
          width: 150,
          editable: true,
          cellRenderer: (params) => {
            let amount = params.value;
            
            // If amount is 0 or empty, try to calculate from items
            if ((!amount || amount === 0) && params.data.items && params.data.items.length > 0) {
              const calculatedTotal = params.data.items.reduce((total, item) => {
                const itemPrice = item.price || item.unitPrice || 0;
                const quantity = item.quantity || 1;
                return total + (itemPrice * quantity);
              }, 0);
              
              if (calculatedTotal > 0) {
                amount = calculatedTotal;
              }
            }
            
            if (amount && typeof amount === 'string' && amount.includes('$')) {
              return amount;
            } else if (amount && !isNaN(amount)) {
              return `$${parseFloat(amount).toFixed(2)}`;
            }
            return amount || '$0.00';
          }
        },
        {
          headerName: "Payment Method",
          field: "paymentMethod",
          width: 200,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: {
            values: ["Cash", "PayNow"]
          },
          editable: true,
        },
        {
          headerName: "Items",
          field: "items",
          width: 200,
          cellRenderer: (params) => {
            const items = params.value;
            if (items && items.length > 0) {
              return (
                <button
                  onClick={() => this.viewItems(items, params.data)}
                  className="fundraising-view-items-btn"
                >
                  View items
                </button>
              );
            }
            return (
              <span className="fundraising-no-items">
                No items
              </span>
            );
          }
        },
        {
          headerName: "Collection Mode",
          field: "collectionMode",
          width: 150,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: {
            values: ["Delivery", "Self-Collection"]
          },
          editable: true,
        },
        {
          headerName: "Status",
          field: "status",
           width: 220,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: (params) => {
            // Dynamic status values based on collection mode
            const collectionMode = params.data.collectionMode;
            if (collectionMode === "Delivery") {
              return { values: ["Pending", "Paid", "Delivered", "Refunded"] };
            } else if (collectionMode === "Self-Collection") {
              return { values: ["Pending", "Paid", "Collected", "Refunded"] };
            } else {
              // Default values if collection mode is not set
              return { values: ["Pending", "Paid", "Completed", "Refunded"] };
            }
          },
          cellRenderer: (params) => {
            const statusText = params.value;
            const statusClass = statusText ? statusText.toLowerCase() : 'default';

            return (
              <div className="fundraising-status-container">
                <span className={`fundraising-status-badge ${statusClass}`}>
                  {statusText}
                </span>
              </div>
            );
          },
          editable: true,
        }
      ];

      return columnDefs;
    };

    // Method to view items in a modal popup
    viewItems = (items, rowData) => {
      console.log('Viewing items for:', rowData);
      
      this.setState({
        showItemsModal: true,
        selectedItems: items,
        selectedRowData: rowData
      });
    };

    // Close the items modal
    closeItemsModal = () => {
      this.setState({
        showItemsModal: false,
        selectedItems: [],
        selectedRowData: null
      });
    };

    // Render the items modal
    renderItemsModal = () => {
      const { showItemsModal, selectedItems, selectedRowData } = this.state;
      
      if (!showItemsModal || !selectedRowData) return null;

      // Calculate totals
      const calculatedTotal = selectedItems.reduce((total, item) => {
        const itemPrice = item.price || item.unitPrice || 0;
        const quantity = item.quantity || 1;
        return total + (itemPrice * quantity);
      }, 0);

      return (
        <div className="modal-overlay" onClick={this.closeItemsModal}>
          <div className="modal-content professional-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header professional-header">
              <h3>Order List</h3>
              <button className="modal-close-btn" onClick={this.closeItemsModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body professional-body">
              <div className="items-section">
                <div className="list-header">
                  <span className="header-item">Item</span>
                  <span className="header-qty">Qty</span>
                </div>
                <div className="items-list-professional">
                  {selectedItems.map((item, index) => {
                    const itemName = item.productName || item.name || item.itemName || 'Unknown Item';
                    const quantity = item.quantity || 1;
                    const price = item.price || item.unitPrice || 0;
                    const subtotal = price * quantity;
                    
                    return (
                      <div key={index} className="professional-item-row">
                        <div className="item-details">
                          <div className="item-name-horizontal">
                            <span className="item-name">{itemName}</span>
                            <span className="quantity-text">{quantity}</span>
                          </div>
                          {price > 0 && (
                            <div className="item-meta">
                              <span className="price-info">@ ${price.toFixed(2)}</span>
                              <span className="subtotal">${subtotal.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {calculatedTotal > 0 && (
                  <div className="order-total-section">
                    <div className="total-line">
                      <span className="total-label">Total Amount:</span>
                      <span className="total-amount">${calculatedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

    getRowStyle = (params) => {
      const { expandedRowIndex, rowData } = this.state;
      const rowIndex = params.rowIndex;
    
      if (expandedRowIndex !== null && expandedRowIndex === rowIndex) {
        return {
          background: '#f1f1f1',
          borderBottom: '1px solid #ddd'
        };
      }
    
      return null;
    };

    // Render the detailed view of a row when expanded
    renderDetailView = (rowData) => {
      console.log('Rendering detail view for row data:', rowData);
      if (!rowData) return null;
      
      return (
        <div className="detail-view-container">
          <div className="detail-view-header">
            <h3>Fundraising Details</h3>
          </div>
          
          <div className="detail-view-content">
            <div className="detail-view-section">
              <h4>Donor Information</h4>
              <div className="detail-view-grid">
                <div className="detail-field">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{`${rowData.firstName} ${rowData.lastName}`.trim()}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Contact:</span>
                  <span className="detail-value">{rowData.contactNumber}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{rowData.email}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{rowData.address}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Postal Code:</span>
                  <span className="detail-value">{rowData.postalCode}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-view-section">
              <h4>Donation Information</h4>
              <div className="detail-view-grid">
                <div className="detail-field">
                  <span className="detail-label">Total Price:</span>
                  <span className="detail-value">{rowData.donationAmount}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{rowData.donationDate}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Payment Method:</span>
                  <span className="detail-value">{rowData.paymentMethod}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Collection Mode:</span>
                  <span className="detail-value">{rowData.collectionMode}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{rowData.status}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Receipt Number:</span>
                  <span className="detail-value">{rowData.receiptNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            {rowData.items && rowData.items.length > 0 && (
              <div className="detail-view-section">
                <h4>Donated Items</h4>
                <div className="items-list">
                  {rowData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-details">
                        <strong>{item.name || item.productName || item.itemName}</strong>
                        <span className="item-quantity">Quantity: {item.quantity || 1}</span>
                        {item.description && <span>{item.description}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Handle cell value changes
    onCellValueChanged = async (params) => {
      console.log('Cell value changed:', params);
      
      // Check if the status field was changed to "Paid"
      if (params.colDef.field === 'status' && params.newValue === 'Paid' && params.oldValue !== 'Paid') {
        await this.handleStatusChangeToPaid(params.data);
      }
      
      // Update the data in the backend
      await this.updateFundraisingRecord(params.data);
    };

    // Handle stock reduction when status changes to Paid
    handleStatusChangeToPaid = async (rowData) => {
      console.log('Status changed to Paid for order:', rowData);
      
      if (!rowData.items || rowData.items.length === 0) {
        console.log('No items found for this order');
        return;
      }
      
      try {
        // Reduce stock for each item in WooCommerce
        for (const item of rowData.items) {
          await this.reduceWooCommerceStock(item, rowData);
        }
        
        console.log('Stock reduction completed for order:', rowData.id);
      } catch (error) {
        console.error('Error reducing stock:', error);
        alert('Error reducing stock in WooCommerce. Please check manually.');
      }
    };

    // Reduce stock in WooCommerce
    reduceWooCommerceStock = async (item, orderData) => {
      try {
        const quantity = item.quantity || 1;
        const productName = item.productName;
        
        if (!productName) {
          console.warn('No product name found for item:', item);
          return;
        }
        
        // For fundraising items, use a more flexible approach that doesn't rely on hardcoded location
        // Send productName directly and let the backend handle the matching
        const productData = {
          productName: productName,       // Send the actual product name
          type: "fundraising"             // Specify this is a fundraising product
        };
        
        // Use your existing Django endpoint for stock updates
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/update_stock/`,
          {
            page: productData,
            status: "Paid", // Indicate we want to reduce stock
            quantity: quantity // Amount to reduce
          }
        );
        
        if (response.data.success) 
        {
          // Check if the response contains stock information
          const stockInfo = response.data.success;
          let message = `Stock reduced successfully for "${productName}" (Quantity: ${quantity})`;
          
          if (typeof stockInfo === 'object' && stockInfo.previous_stock !== undefined) {
            message += `\nPrevious stock: ${stockInfo.previous_stock}, New stock: ${stockInfo.new_stock}`;
          }
          
          alert(message);
        } else {
          console.error(`Failed to reduce stock for product "${productName}":`, response.data.error);
          alert(`Failed to reduce stock for "${productName}": ${response.data.error || 'Unknown error'}`);
        }
        
      } catch (error) {
        console.error('Error calling WooCommerce stock reduction API:', error);
        let errorMessage = `Error reducing stock for "${item.productName || 'Unknown product'}"`;
        
        if (error.response && error.response.data && error.response.data.error) {
          errorMessage += `: ${error.response.data.error}`;
        } else {
          errorMessage += `: ${error.message}`;
        }
        
        alert(errorMessage);
        throw error;
      }
    };

    // Update fundraising record in backend
    updateFundraisingRecord = async (rowData) => {
      try {
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          {
            purpose: 'update',
            id: rowData.id,
            data: {
              firstName: rowData.firstName,
              lastName: rowData.lastName,
              contactNumber: rowData.contactNumber,
              email: rowData.email,
              donationAmount: rowData.donationAmount,
              paymentMethod: rowData.paymentMethod,
              collectionMode: rowData.collectionMode,
              status: rowData.status
            }
          }
        );
        
        if (response.data.result && response.data.result.success) {
          console.log('Fundraising record updated successfully');
        } else {
          console.error('Failed to update fundraising record:', response.data);
        }
        
      } catch (error) {
        console.error('Error updating fundraising record:', error);
      }
    };

    // Handle cell clicks
    handleValueClick = (params) => {
      console.log('Cell clicked:', params);
      // Add any specific cell click handling logic here if needed
    };

    // Grid API initialization
    onGridReady = (params) => {
      this.gridApi = params.api;
      this.gridColumnApi = params.columnApi;
      
      console.log("Grid API initialized successfully");
    };

    render() 
    {
      return (
        <div className="fundraising-container">
          <div className="fundraising-heading">
            <h2>Fundraising Orders</h2>
          </div>

          <div className="grid-container">
            <AgGridReact
              ref={this.gridRef}
              rowData={this.state.rowData}
              columnDefs={this.getColumnDefs()}
              onGridReady={this.onGridReady}
              onCellValueChanged={this.onCellValueChanged}
              onCellClicked={this.handleValueClick}
              suppressRowClickSelection={true}
              pagination={true}
              paginationPageSize={10}
              domLayout="normal"
              getRowStyle={this.getRowStyle}
              defaultColDef={{
                resizable: true,
                sortable: true
              }}
            />
          </div>
          
          {/* Items Modal */}
          {this.renderItemsModal()}
        </div>
      );
    }
}

export default FundraisingTable;