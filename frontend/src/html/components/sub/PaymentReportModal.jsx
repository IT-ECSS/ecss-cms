import React, { Component } from 'react';
import '../../../css/sub/salesReportModal.css';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

class SalesReportModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      selectedPaymentMethods: {
        'Cash': true,
        'PayNow': true,
      },
      allPaymentMethodsChecked: true,
      displayData: [],
      locationTabs: [], // All unique locations
      activeTab: 'All Locations', // Currently active tab
      locationGroupedData: {}, // Data grouped by location
      summaryTab: 'payment' // Tab for summary view (default: payment)
    };
  }

  componentDidMount() {
    this.prepareDisplayData();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.fundraisingData !== this.props.fundraisingData) {
      this.prepareDisplayData();
    }
  }

  prepareDisplayData = () => {
    const { fundraisingData } = this.props;
    
    if (!fundraisingData || fundraisingData.length === 0) {
      this.setState({ 
        displayData: [],
        locationTabs: [],
        locationGroupedData: {},
        activeTab: 'All Locations'
      });
      return;
    }

    // Show all orders but calculate totals only for Paid status
    const allOrders = fundraisingData || [];
    
    // Group data by collection location
    const locationGroupedData = {};
    const locationSet = new Set();

    allOrders.forEach((order, index) => {
      const location = order.collectionDetails?.CollectionDeliveryLocation || 
                       order.collectionDeliveryLocation || 
                       'Unknown Location';
      locationSet.add(location);

      if (!locationGroupedData[location]) {
        locationGroupedData[location] = [];
      }

      locationGroupedData[location].push({
        id: order._id || index,
        sn: locationGroupedData[location].length + 1,
        firstName: order.personalInfo?.firstName || order.firstName || '',
        lastName: order.personalInfo?.lastName || order.lastName || '',
        email: order.personalInfo?.email || order.email || '',
        phone: order.personalInfo?.phone || order.contactNumber || '',
        paymentMethod: order.paymentDetails?.paymentMethod || order.paymentMethod || '',
        totalAmount: this.calculateTotalAmount(order),
        invoiceNumber: order.invoiceNumber || order.paymentDetails?.invoiceNumber || '',
        status: order.status || 'Pending',
        itemsSummary: this.formatItemsSummary(order.orderDetails?.items || order.items || []),
        orderDate: this.getOrderDetails(order),
        collectionDate: this.getCollectionDetails(order),
        collectionMode: order.collectionDetails?.collectionMode || order.collectionMode || '',
        originalOrder: order
      });
    });

    // Sort locations
    const locationTabs = ['All Locations'];
    
    // Create combined all locations data
    const allLocationsData = allOrders.map((order, index) => ({
      id: order._id || index,
      sn: index + 1,
      firstName: order.personalInfo?.firstName || order.firstName || '',
      lastName: order.personalInfo?.lastName || order.lastName || '',
      email: order.personalInfo?.email || order.email || '',
      phone: order.personalInfo?.phone || order.contactNumber || '',
      paymentMethod: order.paymentDetails?.paymentMethod || order.paymentMethod || '',
      totalAmount: this.calculateTotalAmount(order),
      invoiceNumber: order.invoiceNumber || order.paymentDetails?.invoiceNumber || '',
      status: order.status || 'Pending',
      itemsSummary: this.formatItemsSummary(order.orderDetails?.items || order.items || []),
      orderDate: this.getOrderDetails(order),
      collectionDate: this.getCollectionDetails(order),
      collectionMode: order.collectionDetails?.collectionMode || order.collectionMode || '',
      location: order.collectionDetails?.CollectionDeliveryLocation || 'Unknown Location',
      originalOrder: order
    }));

    locationGroupedData['All Locations'] = allLocationsData;

    this.setState({ 
      displayData: allLocationsData,
      locationTabs,
      locationGroupedData,
      activeTab: 'All Locations'
    });
  };

  handlePaymentMethodChange = (method) => {
    const { selectedPaymentMethods } = this.state;
    const newSelectedMethods = {
      ...selectedPaymentMethods,
      [method]: !selectedPaymentMethods[method]
    };

    const allChecked = Object.values(newSelectedMethods).every(v => v === true);

    this.setState({
      selectedPaymentMethods: newSelectedMethods,
      allPaymentMethodsChecked: allChecked
    });
  };

  handleSelectAllPaymentMethods = () => {
    const { allPaymentMethodsChecked } = this.state;
    const newValue = !allPaymentMethodsChecked;

    this.setState({
      selectedPaymentMethods: {
        'Cash': newValue,
        'PayNow': newValue,
      },
      allPaymentMethodsChecked: newValue
    });
  };

  // Helper method: Calculate total amount from order with multiple fallbacks
  calculateTotalAmount = (order) => {
    // Try different property names and paths
    const amount = 
      order.enrichedTotalPrice ||
      order.totalPrice ||
      order.donationAmount ||
      order.orderDetails?.totalPrice ||
      order.orderDetails?.donationAmount ||
      order.paymentDetails?.totalPrice ||
      0;
    
    return parseFloat(amount) || 0;
  };

  renderPaymentReportTable = () => {
    const { activeTab, locationGroupedData, selectedPaymentMethods } = this.state;
    const tabData = locationGroupedData[activeTab] || [];

    if (!tabData || tabData.length === 0) {
      return (
        <tr>
          <td colSpan="9" className="table-empty-message">
            No payment records found for this location
          </td>
        </tr>
      );
    }

    // Filter by selected payment methods
    const filteredData = tabData.filter(row => selectedPaymentMethods[row.paymentMethod]);

    if (filteredData.length === 0) {
      return (
        <tr>
          <td colSpan="9" className="table-empty-message">
            No payment records found with selected filters
          </td>
        </tr>
      );
    }

    // Calculate total only for Paid status orders
    let total = 0;
    filteredData.forEach(row => {
      if (row.status === 'Paid') {
        total += row.totalAmount;
      }
    });

    const rows = filteredData.map((row, index) => (
      <tr key={row.id} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
        <td className="payment-sn-cell">{row.sn}</td>
        <td>{row.firstName}</td>
        <td>{row.lastName}</td>
        <td>{row.email}</td>
        <td>{row.phone}</td>
        <td>{row.paymentMethod}</td>
        <td>{row.invoiceNumber}</td>
        <td>{row.status}</td>
        <td>{row.itemsSummary}</td>
        <td>{row.orderDate}</td>
        <td>{row.collectionDate}</td>
        <td>{row.collectionMode}</td>
        <td className="payment-amount-cell">${row.totalAmount.toFixed(2)}</td>
      </tr>
    ));

    // Store total in state to use in footer
    this.currentTabTotal = total;
    
    return rows;
  };




  // Helper method: Format items summary
  formatItemsSummary = (items) => {
    if (!items || items.length === 0) return '';
    
    return items.map(itemDetail => {
      const name = itemDetail.productName || itemDetail.name || itemDetail.itemName || 'Unknown Item';
      const quantity = itemDetail.quantity || 1;
      return `${name} (x${quantity})`;
    }).join(', ');
  };

  // Helper method: Get order details
  getOrderDetails = (item) => {
    const orderDate = item.orderDetails?.orderDate || item.orderDate || '';
    const orderTime = item.orderDetails?.orderTime || item.orderTime || '';
    
    const formatDate = (dateValue) => {
      if (!dateValue) return '';
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      }
      return '';
    };

    if (orderDate && orderTime) {
      const combinedDateTime = new Date(`${orderDate} ${orderTime}`);
      if (!isNaN(combinedDateTime.getTime())) {
        return formatDate(combinedDateTime);
      } else {
        return `${orderDate} at ${orderTime}`;
      }
    } else if (orderDate) {
      const dateOnly = new Date(orderDate);
      if (!isNaN(dateOnly.getTime())) {
        const day = String(dateOnly.getDate()).padStart(2, '0');
        const month = String(dateOnly.getMonth() + 1).padStart(2, '0');
        const year = dateOnly.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return orderDate;
    }
    return orderTime || '';
  };

  // Helper method: Get collection details
  getCollectionDetails = (item) => {
    const collectionDetails = item.collectionDetails;
    if (collectionDetails && (collectionDetails.collectionDate || collectionDetails.collectionTime)) {
      let formattedDate = "TBD";
      if (collectionDetails.collectionDate) {
        const date = new Date(collectionDetails.collectionDate);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          formattedDate = `${day}/${month}/${year}`;
        } else {
          formattedDate = collectionDetails.collectionDate;
        }
      }
      
      let formattedTime = "TBD";
      if (collectionDetails.collectionTime) {
        formattedTime = collectionDetails.collectionTime;
      }
      
      return `${formattedDate} ${formattedTime}`;
    }
    return "Not set";
  };

  // Helper method: Add payment data to worksheet and return total
  addPaymentDataToWorksheet = (worksheet, headerRow, dataToProcess, activeHeaders, allHeaders) => {
    let total = 0;
    
    dataToProcess.forEach((item, originalIndex) => {
      // Calculate pricing
      const originalPrice = item.orderDetails?.totalPrice || item.totalPrice || item.donationAmount;
      const enrichedPrice = item.enrichedTotalPrice || 0;
      
      let totalPriceValue = 0;
      let totalPriceDisplay = '';
      
      if (enrichedPrice > 0) {
        totalPriceValue = enrichedPrice;
        totalPriceDisplay = `$${enrichedPrice.toFixed(2)}`;
      } else if (originalPrice && !isNaN(originalPrice)) {
        totalPriceValue = parseFloat(originalPrice);
        totalPriceDisplay = `$${totalPriceValue.toFixed(2)}`;
      } else {
        totalPriceValue = 0;
        totalPriceDisplay = '$0.00';
      }

      // Add to total only if status is "Paid" or "Collected" and amount is positive
      const status = item.status || 'Pending';
      if ((status === 'Paid' || status === 'Collected') && totalPriceValue > 0) {
        total += totalPriceValue;
      }

      const items = item.orderDetails?.items || item.items || [];
      const itemsSummary = this.formatItemsSummary(items);
      const orderDetails = this.getOrderDetails(item);
      const collectionDetails = this.getCollectionDetails(item);
      const collectionLocation = item.collectionDetails?.CollectionDeliveryLocation || item.collectionDetails || 'Unknown Location';

      // Build payment report row data
      const completeRowData = [
        originalIndex + 1,
        item.personalInfo?.firstName || item.firstName || '',
        item.personalInfo?.lastName || item.lastName || '',
        item.personalInfo?.email || item.email || '',
        item.personalInfo?.phone || item.contactNumber || '',
        item.personalInfo?.location || '',
        itemsSummary,
        totalPriceDisplay,
        item.paymentDetails?.paymentMethod || item.paymentMethod || '',
        item.invoiceNumber || item.paymentDetails?.invoiceNumber || '',
        orderDetails,
        item.status || 'Pending',
        item.collectionDetails?.collectionMode || item.collectionMode || '',
        collectionLocation,
        collectionDetails,
        item.receiptNumber || '',
      ];

      // Filter data to match only active headers
      const paymentRowData = completeRowData.filter((_, index) => {
        const header = allHeaders[index];
        return typeof header === 'string' && header.trim() !== '';
      });

      const excelRow = worksheet.addRow(paymentRowData);
      
      // Apply color coding based on collection location
      const backgroundColor = this.getLocationBackgroundColor(collectionLocation);
      this.applyRowStyling(excelRow, headerRow, backgroundColor);
    });
    
    return total;
  };

  // Helper method: Get background color for location
  getLocationBackgroundColor = (location) => {
    const locationKey = location;
    switch (locationKey) {
      case 'CT Hub':
        return 'FFE8F5E8'; // Soft pastel green
      case 'Pasir Ris West Wellness Centre':
        return 'FFE6F3FF'; // Soft pastel blue
      case 'Tampines North Community Club':
        return 'FFFFFACD'; // Soft pastel yellow
      default:
        return null;
    }
  };

  // Helper method: Get tab color for location
  getLocationTabColor = (location) => {
    switch (location) {
      case 'CT Hub':
        return 'FFE8F5E8'; // Soft pastel green
      case 'Pasir Ris West Wellness Centre':
        return 'FFE6F3FF'; // Soft pastel blue
      case 'Tampines North Community Club':
        return 'FFFFFF99'; // Soft pastel yellow
      default:
        return null;
    }
  };

  // Helper method: Get location class for background color
  getLocationClass = (location) => {
    switch (location) {
      case 'CT Hub':
        return 'location-cthub'; // Soft pastel green
      case 'Pasir Ris West Wellness Centre':
        return 'location-pasirris'; // Soft pastel blue
      case 'Tampines North Community Club':
        return 'location-tampines'; // Soft pastel yellow
      default:
        return 'location-default';
    }
  };

  // Helper method: Apply header styling
  applyHeaderStyling = (headerRow) => {
    headerRow.font = { bold: true };
    
    headerRow.eachCell((cell, colNumber) => {
      const hasHeader = cell.value && cell.value.toString().trim() !== '';
      
      if (hasHeader) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      }
    });
  };

  // Helper method: Apply row styling with background color
  applyRowStyling = (excelRow, headerRow, backgroundColor) => {
    if (!backgroundColor) return;

    excelRow.eachCell((cell, colNumber) => {
      const headerCell = headerRow.getCell(colNumber);
      const hasHeader = headerCell.value && headerCell.value.toString().trim() !== '';
      
      if (hasHeader) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: backgroundColor }
        };
      }
    });
  };

  // Helper method: Auto-fit worksheet columns
  autoFitColumns = (worksheet) => {
    worksheet.columns.forEach((column, columnIndex) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      
      const headerCell = worksheet.getRow(1).getCell(columnIndex + 1);
      const headerValue = headerCell.value ? headerCell.value.toString() : '';
      
      if (headerValue === 'Items Summary') {
        column.width = Math.min(maxLength + 2, 120);
      } else {
        column.width = Math.min(maxLength + 2, 50);
      }
    });
  };

  // Helper method: Calculate payment summary statistics
  calculatePaymentSummary = () => {
    const { activeTab, locationGroupedData, selectedPaymentMethods } = this.state;
    const tabData = locationGroupedData[activeTab] || [];
    const filteredData = tabData.filter(row => selectedPaymentMethods[row.paymentMethod]);

    let totalAmount = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalCollected = 0;
    let totalRecords = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let collectedCount = 0;
    const paymentMethodCount = {};

    filteredData.forEach(row => {
      const amount = row.totalAmount || 0;
      totalAmount += amount;

      if (row.status === 'Paid') {
        totalPaid += amount;
        paidCount++;
      } else if (row.status === 'Pending') {
        totalPending += amount;
        pendingCount++;
      } else if (row.status === 'Collected') {
        totalCollected += amount;
        collectedCount++;
      }

      const method = row.paymentMethod || 'Unknown';
      paymentMethodCount[method] = (paymentMethodCount[method] || 0) + 1;
    });

    return {
      totalAmount,
      totalPaid,
      totalPending,
      totalCollected,
      totalRecords: filteredData.length,
      paidCount,
      pendingCount,
      collectedCount,
      paymentMethodCount
    };
  };

  // Helper method: Render payment summary
  renderPaymentSummary = () => {
    const summary = this.calculatePaymentSummary();
    const { activeTab, locationGroupedData, selectedPaymentMethods } = this.state;
    const tabData = locationGroupedData[activeTab] || [];
    const filteredData = tabData.filter(row => selectedPaymentMethods[row.paymentMethod]);

    // Group filtered data by location
    const locationBreakdown = {};
    filteredData.forEach(row => {
      const location = row.location || 'Unknown Location';
      if (!locationBreakdown[location]) {
        locationBreakdown[location] = {
          count: 0,
          totalAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          pendingCount: 0,
          collectedCount: 0,
          collectedAmount: 0
        };
      }

      locationBreakdown[location].count++;
      locationBreakdown[location].totalAmount += row.totalAmount || 0;

      if (row.status === 'Paid') {
        locationBreakdown[location].paidCount++;
        locationBreakdown[location].paidAmount += row.totalAmount || 0;
      } else if (row.status === 'Pending') {
        locationBreakdown[location].pendingCount++;
      } else if (row.status === 'Collected') {
        locationBreakdown[location].collectedCount++;
        locationBreakdown[location].collectedAmount += row.totalAmount || 0;
      }
    });

    const locations = Object.keys(locationBreakdown).sort();

    return (
      <div className="payment-summary-container">
        <div className="payment-report-summary">
          <table className="combined-summary-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Paid</th>
                <th>Paid Orders</th>
              </tr>
            </thead>
            <tbody>
              <tr className="summary-total-row">
                <td className="location-name">ALL Locations</td>
                <td className="location-value paid">${summary.totalPaid.toFixed(2)}</td>
                <td className="location-value paid">{summary.paidCount}</td>
              </tr>
              {locations.map((location, index) => {
                const data = locationBreakdown[location];
                return (
                  <tr key={location} className={`${index % 2 === 0 ? 'row-even' : 'row-odd'} ${this.getLocationClass(location)}`}>
                    <td className="location-name">{location}</td>
                    <td className="location-value paid">${data.paidAmount.toFixed(2)}</td>
                    <td className="location-value paid">{data.paidCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Generate Sales Report Excel
  generateSalesReport = async () => {
    try {
      console.log('Starting Sales Report generation...');
      
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      
      // Define comprehensive headers for payment report
      const headers = [
        'S/N', 'First Name', 'Last Name', 'Email', 'Contact Number',
        'Station Location', 'Items Summary', 'Total Price',
        'Payment Method', 'Invoice Number', 'Order Details', 'Status',
        'Collection Mode', 'Collection Location', 'Collection Details', 'Receipt Number'
      ];
      
      const activeHeaders = headers.filter(header => typeof header === 'string' && header.trim() !== '');
      const dataToExport = this.state.originalData || this.state.rowData;
      
      // Group data by collection location for sales report
      const locationGroups = this.groupDataByLocation(dataToExport);
      console.log('Sales Report Location groups:', Object.keys(locationGroups));

      // Create "All Locations" sales report worksheet
      const { worksheet: allPaymentWorksheet, headerRow: allPaymentHeaderRow } = 
        this.createWorksheet(workbook, 'All Locations Sales Report', activeHeaders, null, true);

      let grandTotal = 0;

      // Add all data to the payment report worksheet
      const allPaymentDataFormatted = dataToExport.map((item, index) => ({
        item,
        row: this.state.rowData[index] || {},
        originalIndex: index
      }));
      
      grandTotal = this.addPaymentDataToWorksheet(allPaymentWorksheet, allPaymentHeaderRow, allPaymentDataFormatted, activeHeaders, headers);

      // Add total row to all locations worksheet
      this.addPaymentTotalRow(allPaymentWorksheet, grandTotal, headers.length);
      this.autoFitColumns(allPaymentWorksheet);

      // Create sales report worksheets for each location
      Object.entries(locationGroups).forEach(([location, locationData]) => {
        // Clean up location name for sheet name
        const sheetName = `${location.replace(/[\\\/?\*\[\]]/g, '_').substring(0, 25)}_Sales`;
        
        const { worksheet, headerRow } = this.createWorksheet(workbook, sheetName, activeHeaders, location);
        const locationTotal = this.addPaymentDataToWorksheet(worksheet, headerRow, locationData, activeHeaders, headers);
        
        // Add total row to location-specific worksheet
        this.addPaymentTotalRow(worksheet, locationTotal, headers.length);
        this.autoFitColumns(worksheet);
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `Sales_Report_${timestamp}.xlsx`;

      // Save the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, filename);

      console.log('Sales report export completed successfully');
      console.log('Grand Total:', grandTotal.toFixed(2));

    } catch (error) {
      console.error('Error generating sales report:', error);
    }
  };

  // Helper method: Add total row to payment report
  addPaymentTotalRow = (worksheet, total, headerCount) => {
    worksheet.addRow([]);

    const totalRowData = new Array(headerCount).fill('');
    totalRowData[6] = 'TOTAL:';
    totalRowData[7] = `$${total.toFixed(2)}`;

    const filteredTotalRowData = totalRowData.filter((_, index) => {
      return index < headerCount;
    });

    const totalRow = worksheet.addRow(filteredTotalRowData);
    const headerRow = worksheet.getRow(1);

    totalRow.eachCell((cell, colNumber) => {
      const headerCell = headerRow.getCell(colNumber);
      const hasHeader = headerCell.value && headerCell.value.toString().trim() !== '';
      
      if (hasHeader) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE0F0' }
        };
        cell.font = { bold: true };
      }
    });

    const labelCell = worksheet.getCell(totalRow.number, 5);
    labelCell.alignment = { horizontal: 'right' };
  };

  render() {
    const { isOpen, onClose } = this.props;
    const { isLoading, selectedPaymentMethods, allPaymentMethodsChecked, locationTabs, activeTab } = this.state;

    if (!isOpen) return null;

    return (
      <div className="sales-report-modal-overlay" onClick={onClose}>
        <div className="sales-report-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="sales-report-modal-header">
            <h2>Sales Report</h2>
            <button className="sales-report-modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="sales-report-modal-body">
            <div className="sales-report-table-section">
              {this.renderPaymentSummary()}
            </div>
          </div>

          <div className="sales-report-modal-footer">
            <button 
              className="sales-report-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              Close
            </button>
            <button 
              className="sales-report-btn-export"
              onClick={this.generateSalesReport}
              disabled={isLoading || locationTabs.length === 0}
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default SalesReportModal;
