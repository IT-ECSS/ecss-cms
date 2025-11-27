import React, { Component } from 'react';
import '../../../css/sub/salesReportModal.css';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import io from 'socket.io-client';
import html2pdf from 'html2pdf.js';

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
      locationGroupedData: {}, // Data grouped by collection location
      stationLocationTabs: [], // All unique station locations
      activeStationTab: 'All Stations', // Currently active station tab
      stationLocationGroupedData: {}, // Data grouped by station location
      locationTabType: 'collection', // 'collection' or 'station' - which tab type is active
      summaryTab: 'payment', // Tab for summary view (default: payment)
      lastUpdated: null, // Track last update timestamp
      showPDFPreview: false, // Toggle PDF preview modal
      pdfPreviewContent: null // Store PDF preview content
    };
    this.socket = null;
  }

  componentDidMount() {
    this.prepareDisplayData();
    this.initializeSocket();
  }

  // Initialize Socket.IO connection for live updates
  initializeSocket = () => {
    const socketURL = window.location.hostname === "localhost" 
      ? "http://localhost:3001" 
      : "https://ecss-backend-node.azurewebsites.net";
    
    this.socket = io(socketURL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    // Listen for fundraising events
    this.socket.on('fundraising', (eventData) => {
      console.log('Received fundraising event:', eventData);
      
      if (eventData.action === 'insert' || eventData.action === 'update') {
        console.log('Updating all orders data and timestamp due to live update');
        
        const newOrder = eventData.data;
        if (!newOrder) return;
        
        // Update both locationGroupedData and stationLocationGroupedData
        this.setState((prevState) => {
          const updatedLocationGroupedData = { ...prevState.locationGroupedData };
          const updatedStationLocationGroupedData = { ...prevState.stationLocationGroupedData };
          
          // Get locations from the new order
          const collectionLocation = newOrder.collectionDetails?.CollectionDeliveryLocation || 
                                    newOrder.collectionDeliveryLocation || 
                                    'Unknown Location';
          const stationLocation = newOrder.personalInfo?.location || 'Unknown Station';
          
          // Initialize locations if they don't exist
          if (!updatedLocationGroupedData[collectionLocation]) {
            updatedLocationGroupedData[collectionLocation] = [];
          }
          if (!updatedStationLocationGroupedData[stationLocation]) {
            updatedStationLocationGroupedData[stationLocation] = [];
          }
          
          // Create order data object
          const orderData = {
            id: newOrder._id || newOrder.id,
            firstName: newOrder.personalInfo?.firstName || newOrder.firstName || '',
            lastName: newOrder.personalInfo?.lastName || newOrder.lastName || '',
            email: newOrder.personalInfo?.email || newOrder.email || '',
            phone: newOrder.personalInfo?.phone || newOrder.contactNumber || '',
            paymentMethod: newOrder.paymentDetails?.paymentMethod || newOrder.paymentMethod || '',
            totalAmount: this.calculateTotalAmount(newOrder),
            invoiceNumber: newOrder.invoiceNumber || newOrder.paymentDetails?.invoiceNumber || '',
            status: newOrder.status || 'Pending',
            itemsSummary: this.formatItemsSummary(newOrder.orderDetails?.items || newOrder.items || []),
            orderDate: this.getOrderDetails(newOrder),
            collectionDate: this.getCollectionDetails(newOrder),
            collectionMode: newOrder.collectionDetails?.collectionMode || newOrder.collectionMode || '',
            originalOrder: newOrder,
            location: collectionLocation,
            stationLocation: stationLocation
          };
          
          // Update collection location grouping
          const collectionExistingIndex = updatedLocationGroupedData[collectionLocation].findIndex(
            order => order.id === (newOrder._id || newOrder.id)
          );
          
          if (collectionExistingIndex >= 0) {
            updatedLocationGroupedData[collectionLocation][collectionExistingIndex] = {
              ...orderData,
              sn: updatedLocationGroupedData[collectionLocation][collectionExistingIndex].sn
            };
          } else {
            updatedLocationGroupedData[collectionLocation].push({
              ...orderData,
              sn: updatedLocationGroupedData[collectionLocation].length + 1
            });
          }
          
          // Update station location grouping
          const stationExistingIndex = updatedStationLocationGroupedData[stationLocation].findIndex(
            order => order.id === (newOrder._id || newOrder.id)
          );
          
          if (stationExistingIndex >= 0) {
            updatedStationLocationGroupedData[stationLocation][stationExistingIndex] = {
              ...orderData,
              sn: updatedStationLocationGroupedData[stationLocation][stationExistingIndex].sn
            };
          } else {
            updatedStationLocationGroupedData[stationLocation].push({
              ...orderData,
              sn: updatedStationLocationGroupedData[stationLocation].length + 1
            });
          }
          
          // Update All Locations data
          const allLocationsData = [];
          let sn = 1;
          Object.values(updatedLocationGroupedData).forEach(locationOrders => {
            if (Array.isArray(locationOrders)) {
              locationOrders.forEach(order => {
                allLocationsData.push({ ...order, sn: sn++ });
              });
            }
          });
          updatedLocationGroupedData['All Locations'] = allLocationsData;
          updatedStationLocationGroupedData['All Stations'] = allLocationsData;
          
          return {
            locationGroupedData: updatedLocationGroupedData,
            stationLocationGroupedData: updatedStationLocationGroupedData,
            lastUpdated: new Date(),
            displayData: allLocationsData
          };
        });
      }
    });

    this.socket.on('connect', () => {
      console.log('SalesReportModal Socket.IO connected');
    });

    this.socket.on('disconnect', () => {
      console.log('SalesReportModal Socket.IO disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('SalesReportModal Socket.IO error:', error);
    });
  }

  componentWillUnmount() {
    // Disconnect socket when component unmounts
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Helper method: Format timestamp as dd/mm/yyyy, hh:mm:ss (24 hour format)
  formatTimestamp = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
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
        stationLocationTabs: [],
        stationLocationGroupedData: {},
        activeTab: 'All Locations',
        activeStationTab: 'All Stations',
        lastUpdated: new Date()
      });
      return;
    }

    // Show all orders but calculate totals only for Paid status
    const allOrders = fundraisingData || [];
    
    // Group data by collection location
    const locationGroupedData = {};
    const locationSet = new Set();

    // Group data by station location
    const stationLocationGroupedData = {};
    const stationLocationSet = new Set();

    allOrders.forEach((order, index) => {
      // Collection location grouping
      const collectionLocation = order.collectionDetails?.CollectionDeliveryLocation || 
                                 order.collectionDeliveryLocation || 
                                 'Unknown Location';
      locationSet.add(collectionLocation);

      if (!locationGroupedData[collectionLocation]) {
        locationGroupedData[collectionLocation] = [];
      }

      const orderData = {
        id: order._id || index,
        sn: locationGroupedData[collectionLocation].length + 1,
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
        originalOrder: order,
        location: collectionLocation,
        stationLocation: order.personalInfo?.location || 'Unknown Station'
      };

      locationGroupedData[collectionLocation].push(orderData);

      // Station location grouping
      const stationLocation = order.personalInfo?.location || 'Unknown Station';
      stationLocationSet.add(stationLocation);

      if (!stationLocationGroupedData[stationLocation]) {
        stationLocationGroupedData[stationLocation] = [];
      }

      stationLocationGroupedData[stationLocation].push(orderData);
    });

    // Force collection location order
    const fixedLocations = [
      'Tampines North Community Club',
      'CT Hub',
      'Pasir Ris West Wellness Centre',
    ];
    const locationTabs = ['All Locations', ...fixedLocations.filter(loc => locationGroupedData[loc])];
    
    // Get unique and sorted station locations
    const stationLocationTabs = ['All Stations', ...Array.from(stationLocationSet).sort()];
    
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
      stationLocation: order.personalInfo?.location || 'Unknown Station',
      originalOrder: order
    }));

    locationGroupedData['All Locations'] = allLocationsData;
    stationLocationGroupedData['All Stations'] = allLocationsData;

    this.setState({ 
      displayData: allLocationsData,
      locationTabs,
      locationGroupedData,
      stationLocationTabs,
      stationLocationGroupedData,
      activeTab: 'All Locations',
      activeStationTab: 'All Stations',
      lastUpdated: new Date()
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
    const { activeTab, activeStationTab, locationGroupedData, stationLocationGroupedData, selectedPaymentMethods, locationTabType } = this.state;
    const tabData = locationTabType === 'collection'
      ? locationGroupedData[activeTab] || []
      : stationLocationGroupedData[activeStationTab] || [];

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
  addPaymentDataToWorksheet = (worksheet, headerRow, dataToProcess, activeHeaders, allHeaders, useStationLocation = false) => {
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
      const stationLocation = item.personalInfo?.location || 'Unknown Station';

      // Build payment report row data
      const completeRowData = [
        originalIndex + 1,
        item.personalInfo?.firstName || item.firstName || '',
        item.personalInfo?.lastName || item.lastName || '',
        item.personalInfo?.email || item.email || '',
        item.personalInfo?.phone || item.contactNumber || '',
        stationLocation,
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
      
      // Determine background color based on location type
      const colorLocation = useStationLocation ? stationLocation : collectionLocation;
      const backgroundColor = this.getLocationBackgroundColor(colorLocation);
      this.applyRowStyling(excelRow, headerRow, backgroundColor);
    });
    
    return total;
  };

  // Helper method: Get background color for location or station
  getLocationBackgroundColor = (location) => {
    const locationKey = location;
    switch (locationKey) {
      case 'CT Hub':
        return 'FFD4EDD4'; // Soft pastel green
      case 'Tampines North Community Club':
        return 'FFFFF3CD'; // Soft pastel yellow
      case 'Pasir Ris West Wellness Centre':
        return 'FFD1ECF1'; // Soft pastel blue
      case 'En Community Church':
        return 'FFFDCCE6'; // Soft pastel pink
      default:
        return null;
    }
  };

  // Helper method: Get tab color for location
  getLocationTabColor = (location) => {
    switch (location) {
      case 'CT Hub':
        return 'FFD4EDD4'; // Soft pastel green
      case 'Tampines North Community Club':
        return 'FFFFF3CD'; // Soft pastel yellow
      case 'Pasir Ris West Wellness Centre':
        return 'FFD1ECF1'; // Soft pastel blue
      case 'En Community Church':
        return 'FFFDCCE6'; // Soft pastel pink
      default:
        return null;
    }
  };

  // Helper method: Get location class for background color
  getLocationClass = (location) => {
    switch (location) {
      case 'CT Hub':
        return 'location-cthub'; // Soft pastel green
      case 'Tampines North Community Club':
        return 'location-tampines'; // Soft pastel yellow
      case 'Pasir Ris West Wellness Centre':
        return 'location-pasirris'; // Soft pastel blue
      case 'En Community Church':
        return 'location-enchurch'; // Soft pastel light pink
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

  // Helper method: Format price display
  formatPriceDisplay = (item, row) => {
    const originalPrice = item.orderDetails?.totalPrice || item.totalPrice || item.donationAmount;
    const enrichedPrice = item.enrichedTotalPrice || row.enrichedTotalPrice || 0;
    
    if (enrichedPrice > 0) {
      return `$${enrichedPrice.toFixed(2)}`;
    } else if (originalPrice && !isNaN(originalPrice)) {
      return `$${parseFloat(originalPrice).toFixed(2)}`;
    } else {
      return '$0.00';
    }
  };

  // Helper method: Get collection location
  getCollectionLocation = (item, row) => {
    return item.collectionDetails?.CollectionDeliveryLocation || 
           item.collectionDetails || 
           row.collectionDetails || 
           'Unknown Location';
  };

  // Helper method: Build export row data
  buildExportRowData = (item, row, index, headers) => {
    const items = item.orderDetails?.items || item.items || row.items || [];
    const itemsSummary = this.formatItemsSummary(items);
    const displayPrice = this.formatPriceDisplay(item, row);
    const stationLocation = item.personalInfo?.location;
    const collectionLocation = this.getCollectionLocation(item, row);
    const orderDetails = this.getOrderDetails(item);
    const collectionDetails = this.getCollectionDetails(item);

    const completeRowData = [
      row.sn || index + 1, // S/N
      item.personalInfo?.firstName || item.firstName || row.firstName || '', // First Name
      item.personalInfo?.lastName || item.lastName || row.lastName || '', // Last Name
      item.personalInfo?.email || item.email || row.email || '', // Email
      item.personalInfo?.phone || item.contactNumber || row.contactNumber || '', // Contact Number
      stationLocation, // Station Location
      itemsSummary, // Items Summary
      displayPrice, // Total Price
      item.paymentDetails?.paymentMethod || item.paymentMethod || row.paymentMethod || '', // Payment Method
      item.invoiceNumber || item.paymentDetails?.invoiceNumber || row.invoiceNumber || '', // Invoice Number
      orderDetails, // Order Details
      item.status || row.status || 'Pending', // Status
      item.collectionDetails?.collectionMode || item.collectionMode || row.collectionMode || '', // Collection Mode
      collectionLocation, // Collection Location
      collectionDetails, // Collection Details
      item.receiptNumber || row.receiptNumber || '', // Receipt Number
    ];

    // Filter data to match only active headers (non-commented)
    return completeRowData.filter((_, index) => {
      const header = headers[index];
      return typeof header === 'string' && header.trim() !== '';
    });
  };

  // Helper method: Group data by location
  // Helper method: Create and populate worksheet
  createWorksheet = (workbook, sheetName, activeHeaders, originalLocationName = null, isAllDataSheet = false) => {
    const worksheet = workbook.addWorksheet(sheetName);
    
    // Set tab color for location-specific sheets
    if (!isAllDataSheet && originalLocationName) {
      const tabColor = this.getLocationTabColor(originalLocationName);
      if (tabColor) {
        worksheet.properties.tabColor = { argb: tabColor };
      }
    }

    // Add headers
    worksheet.addRow(activeHeaders);
    const headerRow = worksheet.getRow(1);
    this.applyHeaderStyling(headerRow);

    return { worksheet, headerRow };
  };



  // Helper method: Add total row to sales report
  addPaymentTotalRow = (worksheet, total, headerCount) => {
    // Add empty row after data
    worksheet.addRow([]);

    // Create total row data array
    const totalRowData = new Array(headerCount).fill('');
    totalRowData[6] = 'TOTAL:'; // Items Summary column (column before Total Price)
    totalRowData[7] = `$${total.toFixed(2)}`; // Total Price column (correct index)

    // Filter to match active headers
    const filteredTotalRowData = totalRowData.filter((_, index) => {
      // This should match the same filtering logic as the data rows
      return index < headerCount;
    });

    const totalRow = worksheet.addRow(filteredTotalRowData);
    const headerRow = worksheet.getRow(1);

    // Apply soft pastel brown background color only to cells with valid headers
    totalRow.eachCell((cell, colNumber) => {
      const headerCell = headerRow.getCell(colNumber);
      const hasHeader = headerCell.value && headerCell.value.toString().trim() !== '';
      
      if (hasHeader) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCC8B8' } // Soft pastel brown background
        };
        cell.font = { bold: true };
      }
    });
  };

  // Helper method: Calculate payment summary statistics
  calculatePaymentSummary = () => {
    const { activeTab, activeStationTab, locationGroupedData, stationLocationGroupedData, selectedPaymentMethods, locationTabType } = this.state;
    const tabData = locationTabType === 'collection'
      ? locationGroupedData[activeTab] || []
      : stationLocationGroupedData[activeStationTab] || [];
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
    const { activeTab, activeStationTab, locationGroupedData, stationLocationGroupedData, selectedPaymentMethods, locationTabType } = this.state;
    
    // Select data based on active tab type
    const tabData = locationTabType === 'collection' 
      ? locationGroupedData[activeTab] || []
      : stationLocationGroupedData[activeStationTab] || [];
    const filteredData = tabData.filter(row => selectedPaymentMethods[row.paymentMethod] && row.status === 'Paid');

    // Dynamically determine all unique product names from the data
    const productSet = new Set();
    const locationBreakdown = {};
    const groupByField = locationTabType === 'collection' ? 'location' : 'stationLocation';
    
    filteredData.forEach(row => {
      const location = row[groupByField] || (locationTabType === 'collection' ? 'Unknown Location' : 'Unknown Station');
      if (!locationBreakdown[location]) {
        locationBreakdown[location] = {
          count: 0,
          totalAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          productCounts: {}
        };
      }

      locationBreakdown[location].count++;
      locationBreakdown[location].totalAmount += row.totalAmount || 0;
      locationBreakdown[location].paidCount++;
      locationBreakdown[location].paidAmount += row.totalAmount || 0;

      // Count items from the original order only if status is 'Paid'
      if (row.status === 'Paid') {
        const items = row.originalOrder?.orderDetails?.items || row.originalOrder?.items || [];
        items.forEach(item => {
          const productName = item.productName || item.name || item.itemName || '';
          const quantity = item.quantity || 1;
          if (productName) {
            productSet.add(productName);
            if (!locationBreakdown[location].productCounts[productName]) {
              locationBreakdown[location].productCounts[productName] = 0;
            }
            locationBreakdown[location].productCounts[productName] += quantity;
          }
        });
      }
    });

    // Sort product names alphabetically, but if they contain numbers, sort by those numbers in ascending order
    const products = Array.from(productSet).sort((a, b) => {
      // Extract ALL numbers from the product names and get the last one (grams value)
      const aMatches = a.match(/\d+/g);
      const bMatches = b.match(/\d+/g);
      
      const aNum = aMatches ? parseInt(aMatches[aMatches.length - 1]) : null;
      const bNum = bMatches ? parseInt(bMatches[bMatches.length - 1]) : null;
      
      // If both have numbers, sort numerically
      if (aNum !== null && bNum !== null) {
        return aNum - bNum;
      }
      
      // If only one has a number, prioritize the one with number
      if (aNum !== null) return -1;
      if (bNum !== null) return 1;
      
      // Otherwise sort alphabetically
      return a.localeCompare(b);
    });

    const locations = Object.keys(locationBreakdown).sort();

    // Calculate totals for all items by product
    const totalByProduct = {};
    products.forEach(product => { totalByProduct[product] = 0; });
    locations.forEach(location => {
      const data = locationBreakdown[location];
      products.forEach(product => {
        totalByProduct[product] += data.productCounts[product] || 0;
      });
    });

    const locationColumnHeader = locationTabType === 'collection' ? 'Collection Location' : 'Station Location';
    const allLocationsLabel = locationTabType === 'collection' ? 'ALL Locations' : 'ALL Stations';

    return (
      <table className="summary-table-content business-summary-table">
        <thead>
          <tr>
            <th rowSpan="2">{locationColumnHeader}</th>
            <th rowSpan="2">Total Paid Amount</th>
            <th rowSpan="2" className="border-right-emphasis">Total Orders Made</th>
            <th colSpan={products.length} className="panettone-parent-header">Items Sold</th>
          </tr>
          <tr>
            {products.map(product => (
              <th key={product}>{product}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {locations.map((location, index) => {
            const data = locationBreakdown[location];
            return (
              <tr key={location} className={`business-row ${index % 2 === 0 ? 'business-row-even' : 'business-row-odd'} ${this.getLocationClass(location)}`}>
                <td className="location-name">{location}</td>
                <td className="location-value paid">${data.paidAmount.toFixed(2)}</td>
                <td className="location-value paid border-right-emphasis">{data.paidCount}</td>
                {products.map(product => (
                  <td className="location-value" key={product}>{data.productCounts[product] || 0}</td>
                ))}
              </tr>
            );
          })}
          <tr className="summary-total-row business-total-row">
            <td className="location-name" style={{ fontWeight: 'bold' }}>{allLocationsLabel}</td>
            <td className="location-value paid" style={{ fontWeight: 'bold' }}>${summary.totalPaid.toFixed(2)}</td>
            <td className="location-value paid border-right-emphasis" style={{ fontWeight: 'bold' }}>{summary.paidCount}</td>
            {products.map(product => (
              <td className="location-value" key={product} style={{ fontWeight: 'bold' }}>{totalByProduct[product]}</td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  };

  // Generate Sales Report Excel
  generateSalesReport = async () => {
    try {
      console.log('Starting Sales Report generation...');
      
      // Use fundraisingData from props
      const dataToExport = this.props.fundraisingData || [];
      
      if (!dataToExport || dataToExport.length === 0) {
        alert('No data available to export');
        return;
      }
      
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      
      // Define comprehensive headers for sales report
      const { locationTabType } = this.state;
      const firstColumnHeader = locationTabType === 'collection' ? 'Collection Location' : 'Station Location';
      
      const headers = [
        'S/N', 'First Name', 'Last Name', 'Email', 'Contact Number',
        'Station Location', 'Items Summary', 'Total Price',
        'Payment Method', 'Invoice Number', 'Order Details', 'Status',
        'Collection Mode', 'Collection Location', 'Collection Details', 'Receipt Number'
      ];
      
      // Update first header based on tab type
      headers[5] = firstColumnHeader;
      
      const activeHeaders = headers.filter(header => typeof header === 'string' && header.trim() !== '');

      if (locationTabType === 'collection') {
        // Original behavior: Group by collection location
        const locationGroups = {};
        dataToExport.forEach((item, index) => {
          const collectionLocation = item.collectionDetails?.CollectionDeliveryLocation || 
                                     item.collectionDeliveryLocation || 
                                     'Unknown Location';
          
          if (!locationGroups[collectionLocation]) {
            locationGroups[collectionLocation] = [];
          }
          
          locationGroups[collectionLocation].push({ item, row: {}, originalIndex: index });
        });
        
        console.log('Sales Report Location groups:', Object.keys(locationGroups));

        // Create "All Locations" sales report worksheet
        const { worksheet: allPaymentWorksheet, headerRow: allPaymentHeaderRow } = 
          this.createWorksheet(workbook, 'All Locations Sales Report', activeHeaders, null, true);

        let grandTotal = 0;

        // Add all data to the sales report worksheet
        grandTotal = this.addPaymentDataToWorksheet(
          allPaymentWorksheet,
          allPaymentHeaderRow,
          dataToExport,
          activeHeaders,
          headers
        );

        // Add total row to all locations worksheet
        this.addPaymentTotalRow(allPaymentWorksheet, grandTotal, headers.length);
        this.autoFitColumns(allPaymentWorksheet);

        // Create sales report worksheets for each location
        Object.entries(locationGroups).forEach(([location, locationData]) => {
          // Clean up location name for sheet name
          const sheetName = `${location.replace(/[\\\/?\*\[\]]/g, '_').substring(0, 25)}_Sales`;
          const { worksheet, headerRow } = this.createWorksheet(workbook, sheetName, activeHeaders, location);
          // locationData is an array of {item, row, originalIndex}, so map to just the item for export
          const locationTotal = this.addPaymentDataToWorksheet(
            worksheet,
            headerRow,
            locationData.map(d => d.item),
            activeHeaders,
            headers
          );
          // Add total row to location-specific worksheet
          this.addPaymentTotalRow(worksheet, locationTotal, headers.length);
          this.autoFitColumns(worksheet);
        });
      } else {
        // Station Location mode: Group by station location
        const stationGroups = {};
        dataToExport.forEach((item, index) => {
          const stationLocation = item.personalInfo?.location || 'Unknown Station';
          
          if (!stationGroups[stationLocation]) {
            stationGroups[stationLocation] = [];
          }
          
          stationGroups[stationLocation].push({ item, row: {}, originalIndex: index });
        });
        
        console.log('Sales Report Station groups:', Object.keys(stationGroups));

        // Create "All Stations" sales report worksheet
        const { worksheet: allStationWorksheet, headerRow: allStationHeaderRow } = 
          this.createWorksheet(workbook, 'All Stations Sales Report', activeHeaders, null, true);

        let grandTotal = 0;

        // Add all data to the sales report worksheet
        grandTotal = this.addPaymentDataToWorksheet(
          allStationWorksheet,
          allStationHeaderRow,
          dataToExport,
          activeHeaders,
          headers,
          true // Use station location for coloring
        );

        // Add total row to all stations worksheet
        this.addPaymentTotalRow(allStationWorksheet, grandTotal, headers.length);
        this.autoFitColumns(allStationWorksheet);

        // Create sales report worksheets for each station location
        Object.entries(stationGroups).forEach(([station, stationData]) => {
          // Clean up station name for sheet name
          const sheetName = `${station.replace(/[\\\/?\*\[\]]/g, '_').substring(0, 25)}_Sales`;
          const { worksheet, headerRow } = this.createWorksheet(workbook, sheetName, activeHeaders, station);
          // stationData is an array of {item, row, originalIndex}, so map to just the item for export
          const stationTotal = this.addPaymentDataToWorksheet(
            worksheet,
            headerRow,
            stationData.map(d => d.item),
            activeHeaders,
            headers,
            true // Use station location for coloring
          );
          // Add total row to station-specific worksheet
          this.addPaymentTotalRow(worksheet, stationTotal, headers.length);
          this.autoFitColumns(worksheet);
        });
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const tabName = locationTabType === 'collection' ? this.state.activeTab : this.state.activeStationTab;
      const filename = `Sales_Report_${tabName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

      // Save the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, filename);

      console.log('Sales report export completed successfully');

    } catch (error) {
      console.error('Error generating sales report:', error);
    }
  };

  // Helper method: Generate summary table HTML for PDF
  generateSummaryTableHTML = (locationTabType, tabName) => {
    const { locationGroupedData, stationLocationGroupedData, selectedPaymentMethods } = this.state;
    
    // Select data based on tab type
    const tabData = locationTabType === 'collection' 
      ? locationGroupedData[tabName] || []
      : stationLocationGroupedData[tabName] || [];
    const filteredData = tabData.filter(row => selectedPaymentMethods[row.paymentMethod] && row.status === 'Paid');

    // Dynamically determine all unique product names from the data
    const productSet = new Set();
    const locationBreakdown = {};
    const groupByField = locationTabType === 'collection' ? 'location' : 'stationLocation';
    
    filteredData.forEach(row => {
      const location = row[groupByField] || (locationTabType === 'collection' ? 'Unknown Location' : 'Unknown Station');
      if (!locationBreakdown[location]) {
        locationBreakdown[location] = {
          count: 0,
          totalAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          productCounts: {}
        };
      }

      locationBreakdown[location].count++;
      locationBreakdown[location].totalAmount += row.totalAmount || 0;
      locationBreakdown[location].paidCount++;
      locationBreakdown[location].paidAmount += row.totalAmount || 0;

      if (row.status === 'Paid') {
        const items = row.originalOrder?.orderDetails?.items || row.originalOrder?.items || [];
        items.forEach(item => {
          const productName = item.productName || item.name || item.itemName || '';
          const quantity = item.quantity || 1;
          if (productName) {
            productSet.add(productName);
            if (!locationBreakdown[location].productCounts[productName]) {
              locationBreakdown[location].productCounts[productName] = 0;
            }
            locationBreakdown[location].productCounts[productName] += quantity;
          }
        });
      }
    });

    const products = Array.from(productSet).sort((a, b) => {
      const aMatches = a.match(/\d+/g);
      const bMatches = b.match(/\d+/g);
      const aNum = aMatches ? parseInt(aMatches[aMatches.length - 1]) : null;
      const bNum = bMatches ? parseInt(bMatches[bMatches.length - 1]) : null;
      if (aNum !== null && bNum !== null) return aNum - bNum;
      if (aNum !== null) return -1;
      if (bNum !== null) return 1;
      return a.localeCompare(b);
    });

    const locations = Object.keys(locationBreakdown).sort();
    const totalByProduct = {};
    products.forEach(product => { totalByProduct[product] = 0; });
    locations.forEach(location => {
      const data = locationBreakdown[location];
      products.forEach(product => {
        totalByProduct[product] += data.productCounts[product] || 0;
      });
    });

    let totalPaid = 0;
    let paidCount = 0;
    filteredData.forEach(row => {
      if (row.status === 'Paid') {
        totalPaid += row.totalAmount || 0;
        paidCount++;
      }
    });

    const locationColumnHeader = locationTabType === 'collection' ? 'Collection Location' : 'Station Location';
    const allLocationsLabel = locationTabType === 'collection' ? 'ALL Locations' : 'ALL Stations';

    let tableHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 8.5px; line-height: 1.4; table-layout: auto;">
        <thead>
          <tr style="height: auto; min-height: 75px;">
            <th rowSpan="2" style="padding: 10px 5px; border: 1px solid #333; background-color: #333; color: white; font-weight: bold; font-size: 15px;">${locationColumnHeader}</th>
            <th rowSpan="2" style="padding: 10px 5px; border: 1px solid #333; background-color: #333; color: white; font-weight: bold; font-size: 15px;">Total Paid Amount</th>
            <th rowSpan="2" style="padding: 10px 5px; border: 1px solid #333; background-color: #333; color: white; font-weight: bold; font-size: 15px;">Total Orders Made</th>
            <th colSpan="${products.length}" style="padding: 10px 5px; border: 1px solid #333; background-color: #8B7355; color: white; font-weight: bold; font-size: 15px;">Items Sold</th>
          </tr>
          <tr style="height: auto; min-height: 75px;">
            ${products.map(product => `<th style="padding: 10px 5px; border: 1px solid #333; background-color: #333; color: white; font-weight: bold; font-size: 15px;">${product}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${locations.map((location, index) => {
            const data = locationBreakdown[location];
            const bgColor = this.getLocationBackgroundColor(location);
            const bgStyle = bgColor ? `background-color: #${bgColor.substring(2)};` : '';
            return `
              <tr style="height: auto; min-height: 110px; ${bgStyle}">
                <td style="padding: 10px 5px; border: 1px solid #ddd; font-size: 15px;">${location}</td>
                <td style="padding: 10px 5px; border: 1px solid #ddd; text-align: right; font-size: 15px;">$${data.paidAmount.toFixed(2)}</td>
                <td style="padding: 10px 5px; border: 1px solid #ddd; text-align: right; font-size: 15px;">${data.paidCount}</td>
                ${products.map(product => `<td style="padding: 10px 5px; border: 1px solid #ddd; text-align: right; font-size: 15px;">${data.productCounts[product] || 0}</td>`).join('')}
              </tr>
            `;
          }).join('')}
          <tr style="height: auto; min-height: 60px; background-color: #f0f0f0;">
            <td style="padding: 10px 5px; border: 1px solid #ddd; font-weight: bold; font-size: 15px;">${allLocationsLabel}</td>
            <td style="padding: 10px 5px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 15px;">$${totalPaid.toFixed(2)}</td>
            <td style="padding: 10px 5px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 15px;">${paidCount}</td>
            ${products.map(product => `<td style="padding: 10px 5px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 15px;">${totalByProduct[product]}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    `;

    return tableHTML;
  };

  // Generate PDF Report with landscape orientation - 2 pages (Collection and Station Location)
  generatePDFReport = (preview = false) => {
    try {
      console.log('Starting PDF Report generation...');

      const { activeTab, activeStationTab } = this.state;

      // Create two pages with page break
      const fullDocument = document.createElement('div');
      
      // Page 1: Collection Location
      const collectionTableHTML = this.generateSummaryTableHTML('collection', activeTab);
      const collectionPageDiv = document.createElement('div');
      collectionPageDiv.style.pageBreakAfter = 'always';
      collectionPageDiv.innerHTML = `
        <div style="padding: 3px; background-color: white; width: 100%;">
          <h2 style="margin-bottom: 8px; text-align: center; font-size: 14px; font-weight: bold;">Sales Report Summary</h2>
          <p style="text-align: center; color: #666; margin-bottom: 12px; font-size: 10px;">Collection Location: ${activeTab}</p>
          <div style="width: 100%; padding: 0; margin: 0;">${collectionTableHTML}</div>
        </div>
      `;
      fullDocument.appendChild(collectionPageDiv);
      
      // Page 2: Station Location
      const stationTableHTML = this.generateSummaryTableHTML('station', activeStationTab);
      const stationPageDiv = document.createElement('div');
      stationPageDiv.innerHTML = `
        <div style="padding: 3px; background-color: white; width: 100%;">
          <h2 style="margin-bottom: 8px; text-align: center; font-size: 14px; font-weight: bold;">Sales Report Summary</h2>
          <p style="text-align: center; color: #666; margin-bottom: 12px; font-size: 10px;">Station Location: ${activeStationTab}</p>
          <div style="width: 100%; padding: 0; margin: 0;">${stationTableHTML}</div>
        </div>
      `;
      fullDocument.appendChild(stationPageDiv);

      // PDF options for landscape
      const pdfOptions = {
        margin: [3, 3, 3, 3],
        filename: `Sales_Report_Summary_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' },
        jsPDF: { 
          orientation: 'landscape', 
          unit: 'mm', 
          format: 'a4',
          compress: true,
          precision: 10
        },
        pagebreak: { mode: 'css', before: 'div[style*="pageBreakAfter"]' }
      };

      // Generate and download PDF
      html2pdf().set(pdfOptions).from(fullDocument).save();
      console.log('PDF report export completed successfully with 2 pages');

    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  // Open PDF preview in new tab
  openPDFPreviewInNewTab = () => {
    try {
      console.log('Opening PDF preview in new tab...');
      const { activeTab, activeStationTab } = this.state;

      // Create two pages with page break
      const fullDocument = document.createElement('div');
      
      // Page 1: Collection Location
      const collectionTableHTML = this.generateSummaryTableHTML('collection', activeTab);
      const collectionPageDiv = document.createElement('div');
      collectionPageDiv.style.pageBreakAfter = 'always';
      collectionPageDiv.innerHTML = `
        <div style="padding: 3px; background-color: white; width: 100%;">
          <h2 style="margin-bottom: 8px; text-align: center; font-size: 14px; font-weight: bold;">Sales Report Summary</h2>
          <p style="text-align: center; color: #666; margin-bottom: 12px; font-size: 10px;">Collection Location: ${activeTab}</p>
          <div style="width: 100%; padding: 0; margin: 0;">${collectionTableHTML}</div>
        </div>
      `;
      fullDocument.appendChild(collectionPageDiv);
      
      // Page 2: Station Location
      const stationTableHTML = this.generateSummaryTableHTML('station', activeStationTab);
      const stationPageDiv = document.createElement('div');
      stationPageDiv.innerHTML = `
        <div style="padding: 3px; background-color: white; width: 100%;">
          <h2 style="margin-bottom: 8px; text-align: center; font-size: 14px; font-weight: bold;">Sales Report Summary</h2>
          <p style="text-align: center; color: #666; margin-bottom: 12px; font-size: 10px;">Station Location: ${activeStationTab}</p>
          <div style="width: 100%; padding: 0; margin: 0;">${stationTableHTML}</div>
        </div>
      `;
      fullDocument.appendChild(stationPageDiv);

      // PDF options for landscape
      const pdfOptions = {
        margin: [3, 3, 3, 3],
        filename: `Sales_Report_Summary_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' },
        jsPDF: { 
          orientation: 'landscape', 
          unit: 'mm', 
          format: 'a4',
          compress: true,
          precision: 10
        },
        pagebreak: { mode: 'css', before: 'div[style*="pageBreakAfter"]' }
      };

      // Generate PDF as data URL and open in new tab
      html2pdf().set(pdfOptions).from(fullDocument).outputPdf('dataurlstring').then((pdfDataUrl) => {
        const newTab = window.open();
        newTab.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Sales Report Summary Preview</title>
            <style>
              body { margin: 0; padding: 0; background-color: #eeeeee; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${pdfDataUrl}" title="PDF Preview"></iframe>
          </body>
          </html>
        `);
        newTab.document.close();
        console.log('PDF preview opened in new tab');
      });
    } catch (error) {
      console.error('Error opening PDF preview in new tab:', error);
      alert('Error opening PDF preview. Please try again.');
    }
  };

  render() {
    const { isOpen, onClose } = this.props;
    const { isLoading, selectedPaymentMethods, allPaymentMethodsChecked, locationTabs, stationLocationTabs, activeTab, activeStationTab, locationTabType, lastUpdated } = this.state;

    if (!isOpen) return null;

    const currentTabs = locationTabType === 'collection' ? locationTabs : stationLocationTabs;
    const currentActiveTab = locationTabType === 'collection' ? activeTab : activeStationTab;

    return (
      <div className="sales-report-modal-overlay" onClick={onClose}>
        <div className="sales-report-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="sales-report-modal-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h2>Sales Report</h2>
              <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
                {lastUpdated && <div>Last updated: {this.formatTimestamp(lastUpdated)}</div>}
              </div>
            </div>
            <button className="sales-report-modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', padding: '0 20px 10px 20px', borderBottom: '1px solid #e0e0e0' }}>
            <button
              onClick={() => this.setState({ locationTabType: 'collection' })}
              style={{
                padding: '8px 16px',
                backgroundColor: locationTabType === 'collection' ? '#007bff' : '#e0e0e0',
                color: locationTabType === 'collection' ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: locationTabType === 'collection' ? 'bold' : 'normal'
              }}
            >
              Collection Location
            </button>
            <button
              onClick={() => this.setState({ locationTabType: 'station' })}
              style={{
                padding: '8px 16px',
                backgroundColor: locationTabType === 'station' ? '#007bff' : '#e0e0e0',
                color: locationTabType === 'station' ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: locationTabType === 'station' ? 'bold' : 'normal'
              }}
            >
              Station Location
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '8px 20px', width: 'fit-content', marginLeft: 'auto', marginRight: '0px' }}>
            <button
              onClick={this.openPDFPreviewInNewTab}
              disabled={isLoading}
              style={{
                padding: '6px 14px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: isLoading ? 0.6 : 1,
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
            >
              Preview PDF
            </button>
            <button
              onClick={() => this.generatePDFReport(false)}
              disabled={isLoading}
              style={{
                padding: '6px 14px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: isLoading ? 0.6 : 1,
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
            >
              Export as PDF
            </button>
          </div>

          <div className="sales-report-modal-body">
            <div className="summary-container">
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

        {/* PDF Preview Modal */}
        {this.state.showPDFPreview && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
          }} onClick={this.closePDFPreview}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '1000px',
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }} onClick={(e) => e.stopPropagation()}>
              {/* Preview Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8f9fa'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>PDF Preview</h3>
                <button
                  onClick={this.closePDFPreview}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Preview Content - Embedded PDF */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '16px',
                backgroundColor: '#eeeeee',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start'
              }}>
                {this.state.pdfPreviewContent && (
                  <iframe
                    src={this.state.pdfPreviewContent}
                    style={{
                      width: '100%',
                      maxWidth: '900px',
                      height: '100%',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                    title="PDF Preview"
                  />
                )}
              </div>

              {/* Preview Footer */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#f8f9fa'
              }}>
                <button
                  onClick={this.closePDFPreview}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={this.downloadPDFFromPreview}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '12px'
                  }}
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default SalesReportModal;
