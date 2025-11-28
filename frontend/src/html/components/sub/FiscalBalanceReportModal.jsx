import React, { Component } from 'react';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import io from 'socket.io-client';
import '../../../css/sub/fiscalBalanceReportModal.css';

class FiscalBalanceReportModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lastUpdated: new Date(),
      lastOpened: new Date(),
      socket: null,
      pdfMode: false
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

  componentDidUpdate(prevProps) {
    // Update lastOpened timestamp when modal is opened (Last View only)
    // Last Updated is independent and only updated by Socket.IO events
    if (!prevProps.isOpen && this.props.isOpen) {
      console.log('Fiscal Balance Report modal opened - updating lastOpened timestamp');
      this.setState({ lastOpened: new Date() });
    }
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
    const { lastUpdated, lastOpened, pdfMode } = this.state;

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
      'Panettone For Good 2025 - 1000gm': 40,
      'Panettone For Good 2025 - 500gm': 274,
      'Panettone For Good 2025 - 100gm': 640
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

    // Format timestamp as dd/mm/yyyy hh:mm:ss (24 hrs format)
    const formatTimestamp = (date) => {
      const d = date || new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Format date as dd/mm/yyyy only
    const formatDate = (date) => {
      const d = date || new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Preview as PDF in new tab
    const handlePreview = () => {
      // Set PDF mode to show only table
      this.setState({ pdfMode: true }, () => {
        setTimeout(() => {
          const element = document.querySelector('.fiscal-balance-modal-body');
          const dateStr = formatDate(new Date()).replace(/\//g, '-');
          
          // Create container with header
          const container = document.createElement('div');
          container.style.padding = '20px';
          container.innerHTML = `
            <h2 style="text-align: center; margin-bottom: 20px; font-size: 18px; font-weight: bold;">Fiscal Balance Report Summary</h2>
            ${element.innerHTML}
          `;
          
          const opt = {
            margin: 5,
            filename: `Fiscal-Balance-Report-Preview-${dateStr}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4', compress: true }
          };
          
          // Generate PDF and open in new tab
          html2pdf().set(opt).from(container).outputPdf('blob').then((pdfBlob) => {
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
            // Exit PDF mode
            this.setState({ pdfMode: false });
          }).catch((error) => {
            console.error('Error generating PDF preview:', error);
            alert('Error generating PDF preview. Please try again.');
            this.setState({ pdfMode: false });
          });
        }, 100);
      });
    };

    // Export as PDF functionality - downloads the file
    const handleExportPDF = () => {
      // Set PDF mode to show only table
      this.setState({ pdfMode: true }, () => {
        setTimeout(() => {
          const element = document.querySelector('.fiscal-balance-modal-body');
          const dateStr = formatDate(new Date()).replace(/\//g, '-');
          
          // Create container with header
          const container = document.createElement('div');
          container.style.padding = '20px';
          container.innerHTML = `
            <h2 style="text-align: center; margin-bottom: 20px; font-size: 18px; font-weight: bold;">Fiscal Balance Report Summary</h2>
            ${element.innerHTML}
          `;
          
          const opt = {
            margin: 5,
            filename: `Fiscal-Balance-Report-${dateStr}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4', compress: true }
          };
          
          // Generate and download PDF
          html2pdf().set(opt).from(container).save().catch((error) => {
            console.error('Error exporting PDF:', error);
            alert('Error exporting PDF. Please try again.');
          }).finally(() => {
            // Exit PDF mode
            this.setState({ pdfMode: false });
          });
        }, 100);
      });
    };

    // Export as Excel functionality - detailed based on fundraising orders by product
    const handleExportExcel = async () => {
      try {
        const workbook = new ExcelJS.Workbook();
        
        // Helper function to create product sheet
        const createProductSheet = (productName, orders) => {
          const sheet = workbook.addWorksheet(productName.substring(0, 31)); // Excel sheet name limit is 31 chars
          
          // Add title
          const titleRow = sheet.addRow([`Fiscal Balance Report - ${productName}`]);
          titleRow.font = { bold: true, size: 14 };
          sheet.addRow([]);

          // Add headers
          const headers = ['S/N', 'Invoice Number', 'First Name', 'Last Name', 'Email', 'Contact', 'Quantity', 'Cost Price', 'Total Cost', 'Sale Price', 'Total Sale', 'Balance', 'Status'];
          const headerRow = sheet.addRow(headers);
          headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3f4a5e' } };
          });

          // Find product details
          const productDetails = productTable.find(p => p.Name === productName);
          const costPrice = productDetails ? parseFloat(productDetails.Price) : 0;
          const salePrice = productDetails ? parseFloat(productDetails.SalePrice) : 0;

          let sn = 1;
          let totalQuantity = 0;
          let totalCost = 0;
          let totalSale = 0;

          // Add data rows for orders
          orders.forEach(({ order, item }) => {
            const invoiceNumber = order.invoiceNumber || order.paymentDetails?.invoiceNumber || '';
            const firstName = order.personalInfo?.firstName || order.firstName || '';
            const lastName = order.personalInfo?.lastName || order.lastName || '';
            const email = order.personalInfo?.email || order.email || '';
            const contact = order.personalInfo?.phone || order.contactNumber || '';
            const quantity = item.quantity || 1;

            const itemTotalCost = (costPrice * quantity).toFixed(2);
            const itemTotalSale = (salePrice * quantity).toFixed(2);
            const itemBalance = (itemTotalSale - itemTotalCost).toFixed(2);

            totalQuantity += quantity;
            totalCost += parseFloat(itemTotalCost);
            totalSale += parseFloat(itemTotalSale);

            const row = sheet.addRow([
              sn,
              invoiceNumber,
              firstName,
              lastName,
              email,
              contact,
              quantity,
              `$${costPrice.toFixed(2)}`,
              `$${itemTotalCost}`,
              `$${salePrice.toFixed(2)}`,
              `$${itemTotalSale}`,
              `$${itemBalance}`,
              order.status || 'Paid'
            ]);

            // Color the balance cell
            const balanceValue = parseFloat(itemBalance);
            row.getCell(12).font = {
              bold: true,
              color: { argb: balanceValue >= 0 ? 'FF008000' : 'FFFF0000' }
            };

            sn++;
          });

          // Add manual bulk order row for all products
          const manualQty = manualQuantities[productName] || 0;
          const manualTotalCost = (costPrice * manualQty).toFixed(2);
          const manualTotalSale = (salePrice * manualQty).toFixed(2);
          const manualBalance = (manualTotalSale - manualTotalCost).toFixed(2);

          totalQuantity += manualQty;
          totalCost += parseFloat(manualTotalCost);
          totalSale += parseFloat(manualTotalSale);

          const row = sheet.addRow([
            sn,
            '',
            'Manual',
            'Bulk Order',
            '',
            '',
            manualQty,
            `$${costPrice.toFixed(2)}`,
            `$${manualTotalCost}`,
            `$${salePrice.toFixed(2)}`,
            `$${manualTotalSale}`,
            `$${manualBalance}`,
            'Manual'
          ]);

          // Apply soft pastel light gold styling to manual bulk order row
          row.font = { color: { argb: 'FF000000' } };
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf5e6c8' } };
          });

          // Color the balance cell
          const balanceValue = parseFloat(manualBalance);
          row.getCell(12).font = {
            bold: true,
            color: { argb: balanceValue >= 0 ? 'FF008000' : 'FFFF0000' }
          };

          sn++;

          // Add separator row with background only on non-empty cells
          const separatorRow = sheet.addRow([]);
          separatorRow.eachCell((cell) => {
            if (cell.value) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf0f0f0' } };
            }
          });

          // Add totals row
          const totalBalance = (totalSale - totalCost).toFixed(2);
          const totalsRow = sheet.addRow([
            '',
            '',
            'Total',
            '',
            '',
            '',
            totalQuantity,
            '',
            `$${totalCost.toFixed(2)}`,
            '',
            `$${totalSale.toFixed(2)}`,
            `$${totalBalance}`,
            ''
          ]);
          totalsRow.font = { bold: true, color: { argb: 'FF000000' } };
          totalsRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe8e8e8' } };
          });

          // Color the total balance cell with green/red while keeping light grey background
          const totalBalanceValue = parseFloat(totalBalance);
          totalsRow.getCell(12).font = {
            bold: true,
            color: { argb: totalBalanceValue >= 0 ? 'FF008000' : 'FFFF0000' }
          };
          totalsRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe8e8e8' } };

          // Add separator row after totals with background only on non-empty cells
          const separatorRowAfter = sheet.addRow([]);
          separatorRowAfter.eachCell((cell) => {
            if (cell.value) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf0f0f0' } };
            }
          });

          // Auto-fit columns
          sheet.columns.forEach((column) => {
            let maxLength = 10;
            column.eachCell({ includeEmpty: true }, (cell) => {
              const cellLength = cell.value ? cell.value.toString().length : 0;
              maxLength = Math.max(maxLength, cellLength);
            });
            column.width = Math.min(maxLength + 2, 50);
          });
        };

        // Group orders by product
        const ordersByProduct = {};

        if (fundraisingData && Array.isArray(fundraisingData)) {
          fundraisingData.forEach((order) => {
            // Only include paid orders
            if (order.status && order.status.toLowerCase() === 'paid') {
              // Extract items from order
              let itemsArray = [];
              if (order.items && Array.isArray(order.items)) {
                itemsArray = order.items;
              } else if (order.orderDetails?.items && Array.isArray(order.orderDetails.items)) {
                itemsArray = order.orderDetails.items;
              }

              // Group each item by product name
              itemsArray.forEach((item) => {
                const productName = item.name || item.productName || item.itemName || 'Unknown';
                
                if (!ordersByProduct[productName]) {
                  ordersByProduct[productName] = [];
                }
                
                ordersByProduct[productName].push({ order, item });
              });
            }
          });
        }

        // Define the tab order for products (descending: 1000gm, 500gm, 100gm)
        const productOrder = [
          'Panettone For Good 2025 - 1000gm',
          'Panettone For Good 2025 - 500gm',
          'Panettone For Good 2025 - 100gm'
        ];

        // Create sheets in the specified order
        productOrder.forEach((productName) => {
          if (ordersByProduct[productName]) {
            createProductSheet(productName, ordersByProduct[productName]);
          }
        });

        // Create sheets for any remaining products not in the order list
        Object.entries(ordersByProduct).forEach(([productName, orders]) => {
          if (!productOrder.includes(productName)) {
            createProductSheet(productName, orders);
          }
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Fiscal_Balance_Report_${timestamp}.xlsx`;

        // Save the file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);

        console.log('Excel export completed successfully');
      } catch (error) {
        console.error('Error exporting to Excel:', error);
        alert('Error exporting to Excel. Please try again.');
      }
    };

    return (
      <div className="fiscal-balance-modal-overlay" onClick={onClose}>
        <div className="fiscal-balance-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header with Title and Timestamps */}
          <div className="fiscal-balance-modal-header-top">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0', fontSize: '1.5rem' }}>Fiscal Balance Report</h2>
              </div>
              <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Last Updated: {formatTimestamp(lastUpdated)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Last Opened: {formatTimestamp(lastOpened)}
                  </div>
                </div>
                <button     className="sales-report-modal-close"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0 4px'
                }}
              >
                ×
              </button>
              </div>
            </div>
          </div>

          {/* PDF Buttons Above Table */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '8px 20px', width: 'fit-content', marginLeft: 'auto', marginRight: '0px' }}>
            <button
              onClick={handlePreview}
              style={{
                padding: '6px 14px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
            >
              Preview PDF
            </button>
            <button
              onClick={handleExportPDF}
              style={{
                padding: '6px 14px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
            >
              Export as PDF
            </button>
          </div>

          {/* Table Content */}
          <div className="fiscal-balance-modal-body">
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
                        <td style={{ whiteSpace: 'nowrap' }}>{product.Name}</td>
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
          </div>

          {/* Footer with Export Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '12px 20px', borderTop: '1px solid #e0e0e0' }}>
            <button
              onClick={handleExportExcel}
              className="fiscal-balance-export-excel-btn"
            >
              Generate Fiscal Balance Report
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default FiscalBalanceReportModal;
