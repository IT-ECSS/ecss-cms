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

  handleSearch = async () => {
    const { searchInput } = this.state;
    console.log('Initiating search for:', searchInput);
    if (searchInput.trim()) {
      const searchTerms = searchInput.split(',').map(term => term.trim()).filter(term => term);
      console.log('Search terms:', searchTerms);
      
      // Send search terms to backend for exact matching (only using invoiceNumber)
      let foundOrders = [];
      
      for (const term of searchTerms) {
        try {
          const response = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
            {
              purpose: 'retrieve',
              invoiceNumber: term
            }
          );
          
          console.log('Backend response for term:', term, response.data);
          const results = response.data.result || [];
          foundOrders = [...foundOrders, ...results];
        } catch (error) {
          console.error('Error searching for term:', term, error);
        }
      }
      
      // Remove duplicates based on _id
      foundOrders = foundOrders.filter((order, index, self) => 
        index === self.findIndex(o => o._id === order._id)
      );
      
      console.log('All found orders after deduplication:', foundOrders);
      
      // Transform the data to match expected format based on actual backend structure
      const formattedOrders = foundOrders.map((order, index) => ({
        id: order._id,
        name: order.invoiceNumber,
        status: order.status,
        date: order.orderDetails?.orderDate || new Date().toISOString().split('T')[0],
        customer: order.personalInfo ? `${order.personalInfo.firstName} ${order.personalInfo.lastName}` : 'Unknown Customer',
        invoiceNumber: order.invoiceNumber || order.receiptNumber,
        // Store the full order object for detailed view
        fullOrder: order
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

  getOrderStatusInfo = (status, collectionMode) => {
    // Determine the final step icon and name based on collection mode
    const finalStepIcon = collectionMode?.toLowerCase() === 'delivery' ? '🚚' : '✋';
    const finalStepName = collectionMode?.toLowerCase() === 'delivery' ? 'Delivered' : 'Collected';
    
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          stage: 'Payment Processing',
          icon: '💳',
          color: '#f39c12',
          steps: [
            { name: 'Payment Processing', icon: '💳', active: true, completed: false },
            { name: 'Order Fulfillment', icon: '📦', active: false, completed: false },
            { name: finalStepName, icon: finalStepIcon, active: false, completed: false }
          ]
        };
      case 'paid':
        return {
          stage: 'Order Fulfillment',
          icon: '📦',
          color: '#3498db',
          steps: [
            { name: 'Payment Processing', icon: '💳', active: false, completed: true },
            { name: 'Order Fulfillment', icon: '📦', active: true, completed: false },
            { name: finalStepName, icon: finalStepIcon, active: false, completed: false }
          ]
        };
      case 'delivered':
      case 'collected':
        return {
          stage: finalStepName,
          icon: finalStepIcon,
          color: '#27ae60',
          steps: [
            { name: 'Payment Processing', icon: '💳', active: false, completed: true },
            { name: 'Order Fulfillment', icon: '📦', active: false, completed: true },
            { name: finalStepName, icon: finalStepIcon, active: true, completed: true }
          ]
        };
      case 'refunded':
        return {
          stage: 'Order Refunded',
          icon: '💰',
          color: '#e67e22',
          steps: [
            { name: 'Payment Processing', icon: '💳', active: false, completed: true },
            { name: 'Order Fulfillment', icon: '�', active: false, completed: true },
            { name: finalStepName, icon: finalStepIcon, active: false, completed: true },
            { name: 'Order Refunded', icon: '💰', active: true, completed: true }
          ]
        };
      case 'cancelled':
        return {
          stage: 'Order Cancelled',
          icon: '❌',
          color: '#e74c3c',
          steps: [
            { name: 'Payment Processing', icon: '💳', active: false, completed: false },
            { name: 'Order Fulfillment', icon: '📦', active: false, completed: false },
            { name: finalStepName, icon: finalStepIcon, active: false, completed: false },
            { name: 'Order Cancelled', icon: '❌', active: true, completed: true }
          ]
        };
      default:
        return {
          stage: 'Unknown',
          icon: '❓',
          color: '#95a5a6',
          steps: []
        };
    }
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
                onClick={this.handleSearch}
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
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Content */}
        <div className="order-content">
          {activeOrder && (
            <div className="order-details fade-in">
              
              {/* Order Status Section */}
              <div className="order-status-section">
                {(() => {
                  const collectionMode = activeOrder.fullOrder?.collectionDetails?.collectionMode;
                  const statusInfo = this.getOrderStatusInfo(activeOrder.status, collectionMode);
                  return (
                    <div className="status-container">                      
                      {!statusInfo.hideTimeline && (
                        <div className="status-timeline">
                          {statusInfo.steps.map((step, index) => (
                            <div 
                              key={index} 
                              className={`timeline-step ${step.active ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
                            >
                              <div className="step-icon">
                                {step.icon}
                              </div>
                              <div className="step-name">{step.name}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {statusInfo.hideTimeline && (
                        <div className="single-status">
                          <div className="single-status-icon">
                            {statusInfo.icon}
                          </div>
                          <div className="single-status-text">
                            {statusInfo.stage}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="order-info">
                <div className="order-section">
                  <h4>Order Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Status:</strong> {activeOrder.status}
                    </div>
                    <div className="info-item">
                      <strong>Date:</strong> {activeOrder.date}
                    </div>
                    <div className="info-item">
                      <strong>Time:</strong> {activeOrder.fullOrder?.orderDetails?.orderTime || 'N/A'}
                    </div>
                    <div className="info-item">
                      <strong>Customer:</strong> {activeOrder.customer}
                    </div>
                    <div className="info-item">
                      <strong>Total:</strong> ${activeOrder.fullOrder?.orderDetails?.totalPrice || '0.00'}
                    </div>
                    <div className="info-item">
                      <strong>Payment Method:</strong> {activeOrder.fullOrder?.paymentDetails?.paymentMethod || 'N/A'}
                    </div>
                    <div className="info-item">
                      <strong>Collection Mode:</strong> {activeOrder.fullOrder?.collectionDetails?.collectionMode || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="order-section">
                  <h4>Order Items</h4>
                  
                  {/* Desktop Table View */}
                  <div className="items-table desktop-only">
                    <div className="items-header">
                      <span>Item</span>
                      <span>Quantity</span>
                      <span>Price</span>
                      <span>Subtotal</span>
                    </div>
                    {activeOrder.fullOrder?.orderDetails?.items?.map((item, index) => (
                      <div key={index} className="items-row">
                        <span>{item.productName}</span>
                        <span>{item.quantity}</span>
                        <span>${item.price?.toFixed(2) || '0.00'}</span>
                        <span>${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</span>
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
                      <span><strong>${activeOrder.fullOrder?.orderDetails?.totalPrice?.toFixed(2) || '0.00'}</strong></span>
                    </div>
                  </div>

                  {/* Mobile/Tablet Card View */}
                  <div className="items-cards mobile-only">
                    {activeOrder.fullOrder?.orderDetails?.items?.length > 0 ? (
                      <>
                        {activeOrder.fullOrder.orderDetails.items.map((item, index) => (
                          <div key={index} className="item-card">
                            <div className="item-card-header">
                              <h5 className="item-name">{item.productName}</h5>
                            </div>
                            <div className="item-card-body">
                              <div className="item-detail">
                                <span className="detail-label">Quantity:</span>
                                <span className="detail-value">{item.quantity}</span>
                              </div>
                              <div className="item-detail">
                                <span className="detail-label">Price:</span>
                                <span className="detail-value">${item.price?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="item-detail subtotal">
                                <span className="detail-label">Subtotal:</span>
                                <span className="detail-value">${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="items-total-card">
                          <div className="total-label">Order Total:</div>
                          <div className="total-value">${activeOrder.fullOrder?.orderDetails?.totalPrice?.toFixed(2) || '0.00'}</div>
                        </div>
                      </>
                    ) : (
                      <div className="no-items-card">
                        <p>No items found</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="order-section">
                  <h4>Customer Information</h4>
                  <div className="customer-info">
                    <div className="customer-details">
                      <div className="info-item">
                        <strong>Name:</strong> {activeOrder.fullOrder?.personalInfo ? `${activeOrder.fullOrder.personalInfo.firstName} ${activeOrder.fullOrder.personalInfo.lastName}` : 'N/A'}
                      </div>
                      <div className="info-item">
                        <strong>Email:</strong> {activeOrder.fullOrder?.personalInfo?.email || 'N/A'}
                      </div>
                      <div className="info-item">
                        <strong>Phone:</strong> {activeOrder.fullOrder?.personalInfo?.phone || 'N/A'}
                      </div>
                      <div className="info-item">
                        <strong>Address:</strong> {activeOrder.fullOrder?.personalInfo?.address || 'N/A'}
                      </div>
                      <div className="info-item">
                        <strong>Postal Code:</strong> {activeOrder.fullOrder?.personalInfo?.postalCode || 'N/A'}
                      </div>
                      <div className="info-item">
                        <strong>Collection/Delivery Location:</strong> {activeOrder.fullOrder?.collectionDetails?.CollectionDeliveryLocation || 'N/A'}
                      </div>
                    </div>
                  </div>
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