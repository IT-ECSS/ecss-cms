import React, { Component } from 'react';
import axios from 'axios';
import '../../css/orderTabs.css';
import CustomerInformation from './CustomerInformation';
import OrderInformation from './OrderInformation';
import OrderItems from './OrderItems';

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
      console.log('Search terms after processing:', searchTerms);
      
      // Send search terms to backend for exact matching (only using invoiceNumber)
      let foundOrders = [];
      
      for (const term of searchTerms) {
        console.log('Searching for term:', term);
        try {
          // Try exact match first
          let response = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
            {
              purpose: 'retrieve',
              invoiceNumber: term
            }
          );
          
          console.log('Backend response for exact term:', term, response.data);
          let results = response.data.result || [];
          
          // If no exact match found, try case-insensitive search by getting all and filtering
          if (results.length === 0) {
            console.log('No exact match found for:', term, 'trying case-insensitive search');
            const allOrdersResponse = await axios.post(
              `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
              {
                purpose: 'retrieveAll'
              }
            );
            
            const allOrders = allOrdersResponse.data.result || [];
            console.log('Retrieved all orders for filtering:', allOrders.length);
            
            // Filter case-insensitive
            results = allOrders.filter(order => {
              const invoiceNumber = order.invoiceNumber || order.receiptNumber || '';
              return invoiceNumber.toLowerCase() === term.toLowerCase();
            });
            
            console.log('Case-insensitive search results for', term, ':', results.length);
          }
          
          console.log('Results found for term:', term, 'Count:', results.length);
          foundOrders = [...foundOrders, ...results];
        } catch (error) {
          console.error('Error searching for term:', term, error);
        }
      }
      
      console.log('Total orders found before deduplication:', foundOrders.length);
      
      // Remove duplicates based on _id
      foundOrders = foundOrders.filter((order, index, self) => 
        index === self.findIndex(o => o._id === order._id)
      );
      
      console.log('All found orders after deduplication:', foundOrders.length, foundOrders);
      
      // Transform the data to match expected format based on actual backend structure
      const formattedOrders = foundOrders.map((order, index) => ({
        id: order._id,
        name: order.invoiceNumber || order.receiptNumber,
        status: order.status,
        date: order.orderDetails?.orderDate || new Date().toISOString().split('T')[0],
        customer: order.personalInfo ? `${order.personalInfo.lastName} ${order.personalInfo.firstName}` : 'Unknown Customer',
        invoiceNumber: order.invoiceNumber || order.receiptNumber,
        // Store the full order object for detailed view
        fullOrder: order
      }));
      
      console.log('Formatted orders:', formattedOrders);
      
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

  getTranslation = (key) => {
    const { selectedLanguage = 'english' } = this.props;
    const translations = {
      searchTitle: {
        english: 'Search Invoice/Receipt Numbers',
        chinese: '搜索发票/收据编号',
        malay: 'Cari Nombor Invois/Resit'
      },
      invoiceReceiptNumbers: {
        english: 'Invoice/Receipt Number(s):',
        chinese: '发票/收据编号：',
        malay: 'Nombor Invois/Resit:'
      },
      placeholder: {
        english: 'Enter invoice/receipt number (single) or numbers separated by commas (bulk)',
        chinese: '输入发票/收据编号（单个）或用逗号分隔的编号（批量）',
        malay: 'Masukkan nombor invois/resit (tunggal) atau nombor yang dipisahkan dengan koma (pukal)'
      },
      submit: {
        english: 'Submit',
        chinese: '提交',
        malay: 'Hantar'
      },
      clear: {
        english: 'Clear',
        chinese: '清除',
        malay: 'Padam'
      },
      found: {
        english: 'Found',
        chinese: '找到',
        malay: 'Dijumpai'
      },
      results: {
        english: 'result(s)',
        chinese: '个结果',
        malay: 'hasil'
      },
      noResults: {
        english: 'No invoices/receipts found for the search terms',
        chinese: '未找到符合搜索条件的发票/收据',
        malay: 'Tiada invois/resit dijumpai untuk istilah carian'
      },
      orderInformation: {
        english: 'Order Information',
        chinese: '订单信息',
        malay: 'Maklumat Pesanan'
      },
      status: {
        english: 'Status',
        chinese: '状态',
        malay: 'Status'
      },
      date: {
        english: 'Date',
        chinese: '日期',
        malay: 'Tarikh'
      },
      time: {
        english: 'Time',
        chinese: '时间',
        malay: 'Masa'
      },
      customer: {
        english: 'Customer',
        chinese: '客户',
        malay: 'Pelanggan'
      },
      orderDetails: {
        english: 'Order Details',
        chinese: '订单详情',
        malay: 'Butiran Pesanan'
      },
      paymentMethod: {
        english: 'Payment Method',
        chinese: '付款方式',
        malay: 'Kaedah Bayaran'
      },
      collectionMode: {
        english: 'Collection Mode',
        chinese: '收取方式',
        malay: 'Mod Pengumpulan'
      },
      orderItems: {
        english: 'Order Items',
        chinese: '订单项目',
        malay: 'Item Pesanan'
      },
      item: {
        english: 'Item',
        chinese: '项目',
        malay: 'Item'
      },
      quantity: {
        english: 'Quantity',
        chinese: '数量',
        malay: 'Kuantiti'
      },
      price: {
        english: 'Price',
        chinese: '价格',
        malay: 'Harga'
      },
      subtotal: {
        english: 'Subtotal',
        chinese: '小计',
        malay: 'Subjumlah'
      },
      noItems: {
        english: 'No items found',
        chinese: '未找到项目',
        malay: 'Tiada item dijumpai'
      },
      orderTotal: {
        english: 'Order Total',
        chinese: '订单总额',
        malay: 'Jumlah Pesanan'
      },
      customerInformation: {
        english: 'Customer Information',
        chinese: '客户信息',
        malay: 'Maklumat Pelanggan'
      },
      name: {
        english: 'Name',
        chinese: '姓名',
        malay: 'Nama'
      },
      email: {
        english: 'Email',
        chinese: '电子邮件',
        malay: 'E-mel'
      },
      phone: {
        english: 'Phone',
        chinese: '电话',
        malay: 'Telefon'
      },
      address: {
        english: 'Address',
        chinese: '地址',
        malay: 'Alamat'
      },
      postalCode: {
        english: 'Postal Code',
        chinese: '邮政编码',
        malay: 'Poskod'
      },
      collectionLocation: {
        english: 'Station Location',
        chinese: '站点位置',
        malay: 'Lokasi Stesen'
      },
      // Status translations
      pending: {
        english: 'Payment Processing',
        chinese: '付款处理中',
        malay: 'Pemprosesan Bayaran'
      },
      paid: {
        english: 'Order Fulfillment',
        chinese: '订单履行',
        malay: 'Pemenuhan Pesanan'
      },
      delivered: {
        english: 'Delivered',
        chinese: '已送达',
        malay: 'Dihantar'
      },
      collected: {
        english: 'Collected',
        chinese: '已收取',
        malay: 'Dikumpul'
      },
      refunded: {
        english: 'Order Refunded',
        chinese: '订单已退款',
        malay: 'Pesanan Dipulangkan'
      },
      cancelled: {
        english: 'Order Cancelled',
        chinese: '订单已取消',
        malay: 'Pesanan Dibatalkan'
      }
    };
    return translations[key] && translations[key][selectedLanguage] 
      ? translations[key][selectedLanguage] 
      : translations[key] && translations[key]['english'] 
        ? translations[key]['english'] 
        : key;
  }

  getOrderStatusInfo = (status, collectionMode) => {
    // Determine the final step icon and name based on collection mode
    const finalStepIcon = collectionMode?.toLowerCase() === 'delivery' ? '🚚' : '✋';
    const finalStepName = collectionMode?.toLowerCase() === 'delivery' ? this.getTranslation('delivered') : this.getTranslation('collected');
    
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          stage: this.getTranslation('pending'),
          icon: '💳',
          color: '#f39c12',
          steps: [
            { name: this.getTranslation('pending'), icon: '💳', active: true, completed: false },
            { name: this.getTranslation('paid'), icon: '📦', active: false, completed: false },
            { name: finalStepName, icon: finalStepIcon, active: false, completed: false }
          ]
        };
      case 'paid':
        return {
          stage: this.getTranslation('paid'),
          icon: '📦',
          color: '#3498db',
          steps: [
            { name: this.getTranslation('pending'), icon: '💳', active: false, completed: true },
            { name: this.getTranslation('paid'), icon: '📦', active: true, completed: false },
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
            { name: this.getTranslation('pending'), icon: '💳', active: false, completed: true },
            { name: this.getTranslation('paid'), icon: '📦', active: false, completed: true },
            { name: finalStepName, icon: finalStepIcon, active: true, completed: true }
          ]
        };
      case 'refunded':
        return {
          stage: this.getTranslation('refunded'),
          icon: '💰',
          color: '#e67e22',
          steps: [
            { name: this.getTranslation('pending'), icon: '💳', active: false, completed: true },
            { name: this.getTranslation('paid'), icon: '📦', active: false, completed: true },
            { name: finalStepName, icon: finalStepIcon, active: false, completed: true },
            { name: this.getTranslation('refunded'), icon: '💰', active: true, completed: true }
          ]
        };
      case 'cancelled':
        return {
          stage: this.getTranslation('cancelled'),
          icon: '❌',
          color: '#e74c3c',
          steps: [
            { name: this.getTranslation('pending'), icon: '💳', active: false, completed: false },
            { name: this.getTranslation('paid'), icon: '📦', active: false, completed: false },
            { name: finalStepName, icon: finalStepIcon, active: false, completed: false },
            { name: this.getTranslation('cancelled'), icon: '❌', active: true, completed: true }
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
          <h3>{this.getTranslation('searchTitle')}</h3>
          <div className="search-form">
            <div className="search-input-group">
              <label htmlFor="invoiceSearch" className="search-label">
                {this.getTranslation('invoiceReceiptNumbers')}
              </label>
              <input
                id="invoiceSearch"
                type="text"
                className="search-input"
                value={searchInput}
                onChange={this.handleSearchInputChange}
                placeholder={this.getTranslation('placeholder')}
              />
            </div>
            <div className="search-buttons">
              <button 
                className="search-btn submit-search"
                onClick={this.handleSearch}
                disabled={!searchInput.trim()}
              >
                {this.getTranslation('submit')}
              </button>
              <button 
                className="search-btn clear-search"
                onClick={this.clearSearch}
                disabled={!isSearched}
              >
                {this.getTranslation('clear')}
              </button>
            </div>
          </div>
        </div>

        {/* Results Message */}
        {isSearched && (
          <div className="search-results-message">
            {orders.length > 0 ? (
              <p className="results-found">{this.getTranslation('found')} {orders.length} {this.getTranslation('results')}</p>
            ) : (
              <p className="results-not-found">{this.getTranslation('noResults')}</p>
            )}
          </div>
        )}

        {/* Horizontal Order Tabs - Only show if there are orders */}
        {orders.length > 0 && (
          <div className="order-tabs-header">
            <div className="order-tabs-nav">
              {orders.map((order, index) => (
                <button
                  key={`${order.id}-${index}`}
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
                <CustomerInformation 
                  activeOrder={activeOrder} 
                  selectedLanguage={this.props.selectedLanguage} 
                />

                <OrderInformation 
                  activeOrder={activeOrder} 
                  selectedLanguage={this.props.selectedLanguage} 
                />
                
                <OrderItems 
                  activeOrder={activeOrder} 
                  selectedLanguage={this.props.selectedLanguage} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default OrderTabs;