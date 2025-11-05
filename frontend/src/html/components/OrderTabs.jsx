import React, { Component } from 'react';
import axios from 'axios';
import '../../css/orderTabs.css';

class OrderTabs extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchInput: '',
      orders: [],
      activeOrderTab: null,
      isSearched: false
    };
  }

  handleOrderTabChange = (orderId) => {
    this.setState({
      activeOrderTab: orderId
    });
  }

  handleSearchInputChange = (e) => {
    this.setState({
      searchInput: e.target.value
    });
  }

  fetchAllData = async () => {
    try {
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
        {
          purpose: 'retrieve'
        }
      );
      
      console.log('Backend response:', response.data);
      // The retrieve purpose returns data in response.data.result.data format
      return response.data.result?.data || [];
    } catch (error) {
      console.error('Error fetching data from backend:', error);
      return [];
    }
  }

  handleBulkSearch = async () => {
    const { searchInput } = this.state;
    if (searchInput.trim()) {
      const searchTerms = searchInput.split(',').map(term => term.trim().toUpperCase()).filter(term => term);
      
      // Fetch all data from backend
      const allData = await this.fetchAllData();
      
      // Filter the data based on search terms
      // Search specifically in invoiceNumber and receiptNumber fields from backend
      const foundOrders = allData.filter(order => 
        searchTerms.some(term => 
          (order.invoiceNumber && order.invoiceNumber.toUpperCase().includes(term)) ||
          (order.receiptNumber && order.receiptNumber.toUpperCase().includes(term))
        )
      );
      
      // Transform the data to match expected format if needed
      const formattedOrders = foundOrders.map(order => ({
        id: order.id || order.invoiceNumber || order.receiptNumber,
        name: `${order.invoiceNumber ? 'Invoice' : 'Receipt'} #${order.id || order.invoiceNumber || order.receiptNumber}`,
        status: order.status || 'Pending',
        date: order.date || new Date().toISOString().split('T')[0],
        customer: order.customer || order.customerName || 'Unknown Customer',
        invoiceNumber: order.invoiceNumber || order.receiptNumber || order.id
      }));
      
      this.setState({
        orders: formattedOrders,
        activeOrderTab: formattedOrders.length > 0 ? formattedOrders[0].id : null,
        isSearched: true
      });
      
      console.log('Found orders:', formattedOrders.length, 'out of', searchTerms.length, 'searched');
    }
  }

  clearSearch = () => {
    this.setState({
      searchInput: '',
      orders: [],
      activeOrderTab: null,
      isSearched: false
    });
  }

  render() {
    const { orders, activeOrderTab, searchInput, isSearched } = this.state;
    const activeOrder = orders.find(order => order.id === activeOrderTab);

    return (
      <div className="order-tabs-container">
        {/* Search Section */}
        <div className="search-section1">
          <h3>Search Invoice/Receipt Numbers</h3>
          <div className="search-form">
            <div className="search-input-group">
              <label htmlFor="invoiceSearch" className="search-label">
                Invoice/Receipt Number(s):
              </label>
              <input
                id="invoiceSearch"
                type="text"
                className="search-input"
                value={searchInput}
                onChange={this.handleSearchInputChange}
                placeholder="Enter invoice/receipt number (single) or numbers separated by commas (bulk)"
              />
            </div>
            <div className="search-buttons">
              <button 
                className="search-btn submit-search"
                onClick={this.handleBulkSearch}
                disabled={!searchInput.trim()}
              >
                Submit
              </button>
              <button 
                className="search-btn clear-search"
                onClick={this.clearSearch}
                disabled={!isSearched}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results Message */}
        {isSearched && (
          <div className="search-results-message">
            {orders.length > 0 ? (
              <p className="results-found">Found {orders.length} result(s)</p>
            ) : (
              <p className="results-not-found">No invoices/receipts found for the search terms</p>
            )}
          </div>
        )}

        {/* Horizontal Order Tabs - Only show if there are orders */}
        {orders.length > 0 && (
          <div className="order-tabs-header">
            <div className="order-tabs-nav">
              {orders.map(order => (
                <button
                  key={order.id}
                  className={`order-tab ${activeOrderTab === order.id ? 'active' : ''}`}
                  onClick={() => this.handleOrderTabChange(order.id)}
                >
                  <span className="order-tab-name">{order.name}</span>
                  <span className={`order-tab-status status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Content */}
        <div className="order-content">
          {activeOrder && (
            <div className="order-details fade-in">
              <div className="order-header">
                <h3>{activeOrder.name} Details</h3>
                <span className={`status-badge status-${activeOrder.status.toLowerCase()}`}>
                  {activeOrder.status}
                </span>
              </div>
              
              <div className="order-info">
                <div className="order-section">
                  <h4>Order Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Order ID:</strong> {activeOrder.id}
                    </div>
                    <div className="info-item">
                      <strong>Status:</strong> {activeOrder.status}
                    </div>
                    <div className="info-item">
                      <strong>Date:</strong> {activeOrder.date}
                    </div>
                    <div className="info-item">
                      <strong>Customer:</strong> {activeOrder.customer}
                    </div>
                    <div className="info-item">
                      <strong>Total:</strong> ${activeOrder.totalPrice || '0.00'}
                    </div>
                  </div>
                </div>
                
                <div className="order-section">
                  <h4>Order Items</h4>
                  <div className="items-table">
                    <div className="items-header">
                      <span>Item</span>
                      <span>Quantity</span>
                      <span>Price</span>
                      <span>Subtotal</span>
                    </div>
                    {activeOrder.orderDetails?.items?.map((item, index) => (
                      <div key={index} className="items-row">
                        <span>{item.productName || item.name}</span>
                        <span>{item.quantity}</span>
                        <span>${item.unitPrice?.toFixed(2) || item.price?.toFixed(2) || '0.00'}</span>
                        <span>${item.subtotal?.toFixed(2) || ((item.quantity || 0) * (item.unitPrice || item.price || 0)).toFixed(2)}</span>
                      </div>
                    )) || (
                      <div className="items-row">
                        <span colSpan="4">No items found</span>
                      </div>
                    )}
                    <div className="items-total">
                      <span></span>
                      <span></span>
                      <span><strong>Total:</strong></span>
                      <span><strong>${activeOrder.totalPrice?.toFixed(2) || '0.00'}</strong></span>
                    </div>
                  </div>
                </div>
                
                <div className="order-section">
                  <h4>Customer Information</h4>
                  <div className="customer-info">
                    <div className="customer-details">
                      <div className="info-item">
                        <strong>Name:</strong> {activeOrder.customerDetails?.name || activeOrder.customer || 'N/A'}
                      </div>
                      <div className="info-item">
                        <strong>Email:</strong> {activeOrder.customerDetails?.email || 'N/A'}
                      </div>
                      <div className="info-item">
                        <strong>Phone:</strong> {activeOrder.customerDetails?.phone || activeOrder.customerDetails?.contactNumber || 'N/A'}
                      </div>
                      <div className="info-item">
                        <strong>Address:</strong> {activeOrder.customerDetails?.address || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Actions */}
                <div className="order-actions">
                  <button className="action-btn primary">Update Status</button>
                  <button className="action-btn secondary">Print Invoice</button>
                  <button className="action-btn secondary">Send Email</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default OrderTabs;