import React, { Component } from 'react';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import io from 'socket.io-client';
import '../../../css/sub/fiscalBalanceReportModal.css';

class FiscalBalanceReportModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lastUpdated: new Date(),
      socket: null
    };
  }

  componentDidMount() {
    // Initialize Socket.IO connection
    const socketURL = window.location.hostname === "localhost" 
      ? "http://localhost:3001" 
      : "https://ecss-backend-node.azurewebsites.net";
    
    const socket = io(socketURL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    socket.on('fundraising', (eventData) => {
      console.log('FiscalBalanceReportModal - Received fundraising event:', eventData);
      
      if (eventData.action === 'insert' || eventData.action === 'update') {
        console.log('Updating Fiscal Balance Report timestamp and table due to live update');
        
        // Update the last updated timestamp
        this.setState({ lastUpdated: new Date() });
        
        // Force re-render to update the table with new data
        this.forceUpdate();
      }
    });

    socket.on('connect', () => {
      console.log('FiscalBalanceReportModal Socket.IO connected');
    });

    socket.on('disconnect', () => {
      console.log('FiscalBalanceReportModal Socket.IO disconnected');
    });

    socket.on('error', (error) => {
      console.error('FiscalBalanceReportModal Socket.IO error:', error);
    });

    this.setState({ socket });
  }

  componentWillUnmount() {
    // Disconnect socket when component unmounts
    const { socket } = this.state;
    if (socket) {
      socket.disconnect();
    }
  }

  render() {
    const { isOpen, onClose, fundraisingData, wooCommerceProductDetails } = this.props;

    if (!isOpen) return null;
    
    // Format wooCommerceProductDetails as a table with name, attributes, and original value
    const productTable = wooCommerceProductDetails?.map(product => {
      const priceString = product.attributes?.find(attr => attr.name === 'Price')?.options?.[0] || '0';
      const costPrice = parseFloat(priceString.toString().replace('$', '').trim()) || 0;
      
      // Extract sale price from product
      const salePriceString = product.price || '0';
      const salePrice = parseFloat(salePriceString.toString().replace('$', '').trim()) || 0;
      
      return {
        'Name': product.name,
        'Price': costPrice.toFixed(2),
        'SalePrice': salePrice.toFixed(2)
      };
    }) || [];
    
    console.log("Product Table:", productTable);
    console.table(productTable);

    // Calculate grand total cost

    // Process fundraisingData to count orders for each product (only Paid status)
    const orderCountMap = {};
    if (fundraisingData && Array.isArray(fundraisingData)) {
      fundraisingData.forEach((order) => {
        // Only count orders with "Paid" status
        if (order.status && order.status.toLowerCase() === 'paid') {
          // Extract items from order (try multiple locations)
          let itemsArray = [];
          if (order.items && Array.isArray(order.items)) {
            itemsArray = order.items;
          } else if (order.orderDetails?.items && Array.isArray(order.orderDetails.items)) {
            itemsArray = order.orderDetails.items;
          }

          // Count each item
          itemsArray.forEach((item) => {
            const productName = item.name || item.productName || item.itemName || 'Unknown';
            orderCountMap[productName] = (orderCountMap[productName] || 0) + (item.quantity || 1);
          });
        }
      });
    }
    console.log("Order Count Map (Paid only):", orderCountMap);

    // Manual quantities to add for specific products
    const manualQuantities = {
      'Panettone For Good 2025 - 1000gm': 20,
      'Panettone 2025 - 500gm': 137,
      'Panettone 2025 - 100gm': 320
    };

    // Merge order counts into productTable and add manual quantities
    const productTableWithOrders = productTable.map(product => {
      const ordersFromData = orderCountMap[product.Name] || 0;
      const manualQty = manualQuantities[product.Name] || 0;
      const totalOrders = ordersFromData + manualQty;
      
      return {
        ...product,
        'Orders': totalOrders,
        'TotalCost': (parseFloat(product.Price) * totalOrders).toFixed(2),
        'TotalSalePrice': (parseFloat(product.SalePrice) * totalOrders).toFixed(2),
        'Balance': ((parseFloat(product.SalePrice) - parseFloat(product.Price)) * totalOrders).toFixed(2)
      };
    });
    
    console.log("Product Table with Orders:", productTableWithOrders);

    // Calculate totals
    const totalCostPrice = productTableWithOrders.reduce((sum, product) => sum + parseFloat(product.TotalCost), 0).toFixed(2);
    const totalSalePrice = productTableWithOrders.reduce((sum, product) => sum + parseFloat(product.TotalSalePrice), 0).toFixed(2);
    const fiscalBalance = (parseFloat(totalSalePrice) - parseFloat(totalCostPrice)).toFixed(2);

    // Format current timestamp as dd/mm/yyyy hh:mm (24 hrs format)
    const formatTimestamp = () => {
      const { lastUpdated } = this.state;
      const date = lastUpdated || new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    // Preview as PDF in new tab
    const handlePreview = () => {
      const element = document.querySelector('.fiscal-balance-modal-content');
      const opt = {
        margin: 10,
        filename: 'Fiscal-Balance-Report-Preview.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
      };
      
      // Generate PDF and open in new tab
      html2pdf().set(opt).from(element).outputPdf('blob').then((pdfBlob) => {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
      }).catch((error) => {
        console.error('Error generating PDF preview:', error);
        alert('Error generating PDF preview. Please try again.');
      });
    };

    // Export as PDF functionality - downloads the file
    const handleExportPDF = () => {
      const element = document.querySelector('.fiscal-balance-modal-content');
      const opt = {
        margin: 10,
        filename: 'Fiscal-Balance-Report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
      };
      
      // Generate and download PDF
      html2pdf().set(opt).from(element).save().catch((error) => {
        console.error('Error exporting PDF:', error);
        alert('Error exporting PDF. Please try again.');
      });
    };

    return (
      <div className="fiscal-balance-modal-overlay" onClick={onClose}>
        <div className="fiscal-balance-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="fiscal-balance-modal-header">
            <div className="header-title-section">
              <h2>Fiscal Balance Report</h2>
              <div className="fiscal-balance-last-updated">Last updated: {formatTimestamp()}</div>
            </div>
            <button className="fiscal-balance-modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="fiscal-balance-modal-body">
            {/* Product Details Table */}
            {productTable.length > 0 && (
              <div className="fiscal-balance-products-section">
                <table className="fiscal-balance-products-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Orders</th>
                      <th>Cost Price</th>
                      <th>Total Cost</th>
                      <th>Sale Price</th>
                      <th>Total Sale</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productTableWithOrders.map((product, index) => (
                      <tr key={index}>
                        <td>{product.Name}</td>
                        <td>{product.Orders}</td>
                        <td>${product.Price}</td>
                        <td>${product.TotalCost}</td>
                        <td>${product.SalePrice}</td>
                        <td>${product.TotalSalePrice}</td>
                        <td style={{color: parseFloat(product.Balance) >= 0 ? 'green' : 'red', fontWeight: 'bold'}}>${product.Balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="fiscal-balance-modal-footer">
            <button className="fiscal-balance-preview-btn" onClick={handlePreview}>
              Preview
            </button>
            <button className="fiscal-balance-export-pdf-btn" onClick={handleExportPDF}>
              Export as PDF
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default FiscalBalanceReportModal;
