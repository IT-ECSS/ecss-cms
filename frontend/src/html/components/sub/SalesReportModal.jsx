import React, { Component } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import '../../../css/sub/salesReportModal.css';

class SalesReportModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      selectedLocations: {
        'CT Hub': true,
        'Pasir Ris West Wellness Centre': true,
        'Tampines North Community Club': true,
      },
      allLocationsChecked: true,
      displayData: [],
      activeTab: 'Orders' // 'Orders' or 'Items'
    };
  }

  componentDidMount() {
    // Prepare display data from fundraising data
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
      this.setState({ displayData: [] });
      return;
    }

    // Filter for Paid status orders and format for display
    const confirmedOrders = fundraisingData.filter(order => order.status === 'Paid');
    
    const displayData = confirmedOrders.map((order, index) => ({
      id: order._id || index,
      sn: index + 1,
      firstName: order.personalInfo?.firstName || order.firstName || '',
      lastName: order.personalInfo?.lastName || order.lastName || '',
      email: order.personalInfo?.email || order.email || '',
      phone: order.personalInfo?.phone || order.contactNumber || '',
      location: order.collectionDetails?.CollectionDeliveryLocation || 'Unknown',
      itemCount: (order.items || []).length,
      totalAmount: order.enrichedTotalPrice || order.totalPrice || order.donationAmount || 0,
      paymentMethod: order.paymentDetails?.paymentMethod || order.paymentMethod || '',
      status: order.status || 'Pending'
    }));

    this.setState({ displayData });
  };

  // Get background color for location
  getLocationBackgroundColor = (location) => {
    switch (location) {
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

  // Apply header styling
  applyHeaderStyling = (headerRow) => {
    headerRow.font = { bold: true };
    
    headerRow.eachCell((cell) => {
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

  // Auto-fit columns
  autoFitColumns = (worksheet) => {
    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      
      column.width = Math.min(maxLength + 2, 50);
    });
  };

  // Handle location checkbox change
  handleLocationChange = (location) => {
    const { selectedLocations } = this.state;
    const newSelectedLocations = {
      ...selectedLocations,
      [location]: !selectedLocations[location]
    };

    const allChecked = Object.values(newSelectedLocations).every(v => v === true);

    this.setState({
      selectedLocations: newSelectedLocations,
      allLocationsChecked: allChecked
    });
  };

  // Handle select all locations
  handleSelectAllLocations = () => {
    const { allLocationsChecked } = this.state;
    const newValue = !allLocationsChecked;

    this.setState({
      selectedLocations: {
        'CT Hub': newValue,
        'Pasir Ris West Wellness Centre': newValue,
        'Tampines North Community Club': newValue,
      },
      allLocationsChecked: newValue
    });
  };

  // Generate sales report
  generateSalesReport = async () => {
    try {
      this.setState({ isLoading: true });

      const { displayData, selectedLocations } = this.state;

      // displayData already contains only Paid (confirmed) orders from prepareDisplayData()
      // Group by collection location using the prepared display data
      const locationGroups = {};
      displayData.forEach((row) => {
        const location = row.location || 'Unknown Location';
        
        if (!locationGroups[location]) {
          locationGroups[location] = [];
        }
        locationGroups[location].push(row);
      });

      // Create Excel workbook using ExcelJS
      const workbook = new ExcelJS.Workbook();

      // Since we're using displayData which shows items per order row, we need to rebuild the item list
      // Get all items from the fundraising props data (original source)
      const { fundraisingData } = this.props;
      const allItemsSet = new Set();
      
      // Filter fundraising data to match displayed orders and extract items
      fundraisingData.forEach((order) => {
        const location = order.collectionDetails?.CollectionDeliveryLocation || 'Unknown Location';
        
        // Only include if order is in selected locations and is Paid status
        if (selectedLocations[location] && order.status === 'Paid') {
          const items = order.items || order.orderDetails?.items || [];
          items.forEach(item => {
            const itemName = item.productName || item.name || item.itemName || 'Unknown';
            allItemsSet.add(itemName);
          });
        }
      });

      // Sort items with custom ordering: 1000gm, 500gm, 100gm
      const sortedItems = Array.from(allItemsSet).sort((a, b) => {
        const sizeOrder = { '1000gm': 1, '500gm': 2, '100gm': 3 };
        
        // Extract sizes from item names
        const sizeA = a.match(/(1000gm|500gm|100gm)/i)?.[0].toLowerCase();
        const sizeB = b.match(/(1000gm|500gm|100gm)/i)?.[0].toLowerCase();
        
        const orderA = sizeA ? sizeOrder[sizeA] : 999;
        const orderB = sizeB ? sizeOrder[sizeB] : 999;
        
        // If both have sizes, compare by size order
        if (orderA !== 999 && orderB !== 999) {
          return orderA - orderB;
        }
        
        // Otherwise, sort alphabetically
        return a.localeCompare(b);
      });
      
      // Get selected location names sorted
      const sortedLocations = Object.keys(locationGroups)
        .filter(location => Object.keys(locationGroups).includes(location))
        .sort();

      // ===== ORDERS SHEET =====
      const ordersWs = workbook.addWorksheet('Orders');
      
      // Build Orders header row
      const ordersHeaderRow = ['Location', 'All Locations', ...sortedLocations];
      ordersWs.addRow(ordersHeaderRow);
      
      const ordersExcelHeaderRow = ordersWs.getRow(1);
      this.applyHeaderStyling(ordersExcelHeaderRow);
      
      // Build Orders data rows
      const locationNames = ['CT Hub', 'Pasir Ris West Wellness Centre', 'Tampines North Community Club'];
      let totalOrders = 0;
      const ordersByLocation = {};
      
      locationNames.forEach(location => {
        const count = locationGroups[location]?.length || 0;
        ordersByLocation[location] = count;
        totalOrders += count;
      });
      
      locationNames.forEach((location, index) => {
        const ordersRowData = [
          location,
          totalOrders,
          ordersByLocation['CT Hub'],
          ordersByLocation['Pasir Ris West Wellness Centre'],
          ordersByLocation['Tampines North Community Club']
        ];
        
        const ordersRow = ordersWs.addRow(ordersRowData);
        ordersRow.eachCell((cell, colNumber) => {
          if (colNumber === 1) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' }
            };
          } else if (colNumber === 2) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFEEEEEE' }
            };
          } else if (colNumber >= 3) {
            const locationIndex = colNumber - 3;
            if (sortedLocations[locationIndex]) {
              const backgroundColor = this.getLocationBackgroundColor(sortedLocations[locationIndex]);
              if (backgroundColor) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: backgroundColor }
                };
              }
            }
          }
        });
      });
      
      // Add Orders total row
      const ordersTotalData = [
        'Total',
        totalOrders,
        ordersByLocation['CT Hub'],
        ordersByLocation['Pasir Ris West Wellness Centre'],
        ordersByLocation['Tampines North Community Club']
      ];
      
      const ordersTotalRow = ordersWs.addRow(ordersTotalData);
      ordersTotalRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        
        if (colNumber === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
          };
        } else if (colNumber === 2) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC0C0C0' }
          };
        } else if (colNumber >= 3) {
          const locationIndex = colNumber - 3;
          if (sortedLocations[locationIndex]) {
            const location = sortedLocations[locationIndex];
            let bgColor;
            if (location === 'CT Hub') {
              bgColor = 'FFC6E0C6';
            } else if (location === 'Pasir Ris West Wellness Centre') {
              bgColor = 'FFCCE5FF';
            } else if (location === 'Tampines North Community Club') {
              bgColor = 'FFFFE4B5';
            }
            if (bgColor) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgColor }
              };
            }
          }
        }
      });
      
      this.autoFitColumns(ordersWs);

      // ===== ITEMS SHEET =====
      const ws = workbook.addWorksheet('Items');

      // Build header row: [Item Name, All Locations, CT Hub, Pasir Ris, Tampines]
      const headerRow = ['Item Name', 'All Locations', ...sortedLocations];
      ws.addRow(headerRow);

      const excelHeaderRow = ws.getRow(1);
      this.applyHeaderStyling(excelHeaderRow);

      // Build data rows using fundraising data as source
      const totalsData = ['TOTAL'];
      let grandTotalAllLocations = 0;
      const grandTotalsByLocation = {};

      sortedItems.forEach(itemName => {
        const rowData = [itemName];
        
        // Calculate total for all locations
        let allLocationsTotal = 0;
        sortedLocations.forEach(location => {
          let locationTotal = 0;

          // Find matching orders from fundraising data that are in this location and are Paid
          fundraisingData.forEach(order => {
            const orderLocation = order.collectionDetails?.CollectionDeliveryLocation || 'Unknown Location';
            
            if (orderLocation === location && order.status === 'Paid') {
              const items = order.items || order.orderDetails?.items || [];
              items.forEach(item => {
                const name = item.productName || item.name || item.itemName || 'Unknown';
                if (name === itemName) {
                  locationTotal += item.quantity || 1;
                }
              });
            }
          });

          allLocationsTotal += locationTotal;
        });

        rowData.push(allLocationsTotal);
        grandTotalAllLocations += allLocationsTotal;

        // Add quantities for each location
        sortedLocations.forEach((location, locIndex) => {
          let totalQuantity = 0;

          fundraisingData.forEach(order => {
            const orderLocation = order.collectionDetails?.CollectionDeliveryLocation || 'Unknown Location';
            
            if (orderLocation === location && order.status === 'Paid') {
              const items = order.items || order.orderDetails?.items || [];
              items.forEach(item => {
                const name = item.productName || item.name || item.itemName || 'Unknown';
                if (name === itemName) {
                  totalQuantity += item.quantity || 1;
                }
              });
            }
          });

          rowData.push(totalQuantity);
          if (!grandTotalsByLocation[location]) {
            grandTotalsByLocation[location] = 0;
          }
          grandTotalsByLocation[location] += totalQuantity;
        });

        const excelRow = ws.addRow(rowData);
        
        // Apply color to each location column
        excelRow.eachCell((cell, colNumber) => {
          const headerCell = excelHeaderRow.getCell(colNumber);
          const hasHeader = headerCell.value && headerCell.value.toString().trim() !== '';
          
          if (hasHeader) {
            if (colNumber === 1) {
              // Item Name column - light gray
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF5F5F5' }
              };
            } else if (colNumber === 2) {
              // All Locations column - neutral light background
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEEEEEE' }
              };
            } else if (colNumber >= 3) {
              // Location-specific columns with their colors
              const locationIndex = colNumber - 3;
              if (sortedLocations[locationIndex]) {
                const backgroundColor = this.getLocationBackgroundColor(sortedLocations[locationIndex]);
                if (backgroundColor) {
                  cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: backgroundColor }
                  };
                }
              }
            }
          }
        });
      });

      // Add total row
      totalsData.push(grandTotalAllLocations);
      sortedLocations.forEach(location => {
        totalsData.push(grandTotalsByLocation[location] || 0);
      });

      const totalExcelRow = ws.addRow(totalsData);
      
      // Style total row - bold with darker background
      totalExcelRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        
        if (colNumber === 1) {
          // Total label - gray background
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
          };
        } else if (colNumber === 2) {
          // All Locations total - darker neutral background
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC0C0C0' }
          };
        } else if (colNumber >= 3) {
          // Location-specific columns - darker versions of their colors
          const locationIndex = colNumber - 3;
          if (sortedLocations[locationIndex]) {
            const location = sortedLocations[locationIndex];
            let bgColor;
            if (location === 'CT Hub') {
              bgColor = 'FFC6E0C6'; // Darker green
            } else if (location === 'Pasir Ris West Wellness Centre') {
              bgColor = 'FFCCE5FF'; // Darker blue
            } else if (location === 'Tampines North Community Club') {
              bgColor = 'FFFFE4B5'; // Darker yellow
            }
            
            if (bgColor) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgColor }
              };
            }
          }
        }
      });

      // Auto-fit columns
      this.autoFitColumns(ws);

      // Generate filename with current date in ddmmyyyy format
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const filename = `Sales-Report-${day}${month}${year}.xlsx`;
      
      // Save the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, filename);
      
      this.setState({ isLoading: false });
      console.log('Sales report generated successfully');

      // Close modal after successful export
      if (this.props.onClose) {
        this.props.onClose();
      }

    } catch (error) {
      console.error('Error generating sales report:', error);
      this.setState({ isLoading: false });
    }
  };

  renderSalesReportTableRows = () => {
    const { fundraisingData } = this.props;
    const { selectedLocations } = this.state;

    if (!fundraisingData || fundraisingData.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="table-empty-message">
            No confirmed orders found
          </td>
        </tr>
      );
    }

    // Filter only Paid (confirmed) orders
    const confirmedOrders = fundraisingData.filter(order => order.status === 'Paid');

    // Get all unique items with their sizes
    const allItemsMap = new Map(); // { itemName -> Set of sizes }
    confirmedOrders.forEach((order) => {
      const items = order.items || order.orderDetails?.items || [];
      items.forEach(item => {
        const fullName = item.productName || item.name || item.itemName || 'Unknown';
        
        // Extract size (1000gm, 500gm, 100gm) from the product name
        const sizeMatch = fullName.match(/(1000gm|500gm|100gm)/i);
        const size = sizeMatch ? sizeMatch[0].toLowerCase() : 'Unknown';
        
        // Get base name (everything before the size)
        const baseNameMatch = fullName.match(/^(.*?)\s*-?\s*(?:1000gm|500gm|100gm)?$/i);
        const baseName = baseNameMatch ? baseNameMatch[1].trim() : fullName;
        
        // Create a unique key: "Panettone For Good 2025 - 1000gm"
        const uniqueKey = `${baseName} - ${size}`;
        
        if (!allItemsMap.has(baseName)) {
          allItemsMap.set(baseName, new Set());
        }
        allItemsMap.get(baseName).add(uniqueKey);
      });
    });

    // Create sorted list of all unique item variations with custom ordering
    const sortedItems = [];
    const sizeOrder = { '1000gm': 1, '500gm': 2, '100gm': 3 };
    
    allItemsMap.forEach((sizes) => {
      const sizedItems = Array.from(sizes).sort((a, b) => {
        const sizeA = a.match(/(1000gm|500gm|100gm)/i)?.[0].toLowerCase();
        const sizeB = b.match(/(1000gm|500gm|100gm)/i)?.[0].toLowerCase();
        
        const orderA = sizeA ? sizeOrder[sizeA] : 999;
        const orderB = sizeB ? sizeOrder[sizeB] : 999;
        
        return orderA - orderB;
      });
      sortedItems.push(...sizedItems);
    });

    // Get selected locations
    const selectedLocationsList = Object.keys(selectedLocations).filter(loc => selectedLocations[loc]).sort();

    // Calculate grand totals
    let grandTotalAllLocations = 0;
    const grandTotalByLocation = {
      'CT Hub': 0,
      'Pasir Ris West Wellness Centre': 0,
      'Tampines North Community Club': 0
    };

    // Build rows
    const itemRows = sortedItems.map((itemName, index) => {
      // Calculate totals for all locations
      let allLocationsTotal = 0;
      const locationTotals = {};

      confirmedOrders.forEach(order => {
        const location = order.collectionDetails?.CollectionDeliveryLocation || 'Unknown';
        
        const items = order.items || order.orderDetails?.items || [];
        items.forEach(item => {
          const name = item.productName || item.name || item.itemName || 'Unknown';
          if (name === itemName) {
            const quantity = item.quantity || 1;
            allLocationsTotal += quantity;
            
            if (!locationTotals[location]) {
              locationTotals[location] = 0;
            }
            locationTotals[location] += quantity;
          }
        });
      });

      // Add to grand totals
      grandTotalAllLocations += allLocationsTotal;
      grandTotalByLocation['CT Hub'] += locationTotals['CT Hub'] || 0;
      grandTotalByLocation['Pasir Ris West Wellness Centre'] += locationTotals['Pasir Ris West Wellness Centre'] || 0;
      grandTotalByLocation['Tampines North Community Club'] += locationTotals['Tampines North Community Club'] || 0;

      return (
        <tr key={itemName} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
          <td className="item-name-cell">{itemName}</td>
          <td className="all-locations-cell">{allLocationsTotal}</td>
          <td className="location-cell location-ct-hub" style={{ backgroundColor: '#E8F5E8' }}>
            {locationTotals['CT Hub'] || 0}
          </td>
          <td className="location-cell location-pasir-ris" style={{ backgroundColor: '#E6F3FF' }}>
            {locationTotals['Pasir Ris West Wellness Centre'] || 0}
          </td>
          <td className="location-cell location-tampines" style={{ backgroundColor: '#FFFACD' }}>
            {locationTotals['Tampines North Community Club'] || 0}
          </td>
        </tr>
      );
    });

    // Add total row
    const totalRow = (
      <tr key="total-row" className="sales-report-total-row">
        <td className="item-name-cell" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>Total</td>
        <td className="all-locations-cell" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{grandTotalAllLocations}</td>
        <td className="location-cell location-ct-hub" style={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
          {grandTotalByLocation['CT Hub']}
        </td>
        <td className="location-cell location-pasir-ris" style={{ fontWeight: 'bold', backgroundColor: '#E6F3FF' }}>
          {grandTotalByLocation['Pasir Ris West Wellness Centre']}
        </td>
        <td className="location-cell location-tampines" style={{ fontWeight: 'bold', backgroundColor: '#FFFACD' }}>
          {grandTotalByLocation['Tampines North Community Club']}
        </td>
      </tr>
    );

    return [...itemRows, totalRow];
  };

  renderOrdersTable = () => {
    const { fundraisingData } = this.props;

    if (!fundraisingData || fundraisingData.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="table-empty-message">
            No confirmed orders found
          </td>
        </tr>
      );
    }

    // Filter only Paid (confirmed) orders
    const confirmedOrders = fundraisingData.filter(order => order.status === 'Paid');

    if (confirmedOrders.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="table-empty-message">
            No confirmed orders found
          </td>
        </tr>
      );
    }

    // Group orders by location
    const locationGroups = {};
    confirmedOrders.forEach(order => {
      const location = order.collectionDetails?.CollectionDeliveryLocation || 'Unknown';
      if (!locationGroups[location]) {
        locationGroups[location] = 0;
      }
      locationGroups[location] += 1;
    });

    // Calculate totals
    const allLocationsTotal = confirmedOrders.length;
    const grandTotalsByLocation = {
      'CT Hub': locationGroups['CT Hub'] || 0,
      'Pasir Ris West Wellness Centre': locationGroups['Pasir Ris West Wellness Centre'] || 0,
      'Tampines North Community Club': locationGroups['Tampines North Community Club'] || 0
    };

    // Build rows for each location
    const locationNames = ['CT Hub', 'Pasir Ris West Wellness Centre', 'Tampines North Community Club'];
    const rows = locationNames.map((location, index) => (
      <tr key={location} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
        <td className="item-name-cell">{location}</td>
        <td className="all-locations-cell">{grandTotalsByLocation[location]}</td>
        <td className="location-cell location-ct-hub" style={{ backgroundColor: '#E8F5E8' }}>
          {location === 'CT Hub' ? grandTotalsByLocation['CT Hub'] : 0}
        </td>
        <td className="location-cell location-pasir-ris" style={{ backgroundColor: '#E6F3FF' }}>
          {location === 'Pasir Ris West Wellness Centre' ? grandTotalsByLocation['Pasir Ris West Wellness Centre'] : 0}
        </td>
        <td className="location-cell location-tampines" style={{ backgroundColor: '#FFFACD' }}>
          {location === 'Tampines North Community Club' ? grandTotalsByLocation['Tampines North Community Club'] : 0}
        </td>
      </tr>
    ));

    // Add total row
    const totalRow = (
      <tr key="total-row" className="sales-report-total-row">
        <td className="item-name-cell" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>Total</td>
        <td className="all-locations-cell" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{allLocationsTotal}</td>
        <td className="location-cell location-ct-hub" style={{ fontWeight: 'bold', backgroundColor: '#E8F5E8' }}>
          {grandTotalsByLocation['CT Hub']}
        </td>
        <td className="location-cell location-pasir-ris" style={{ fontWeight: 'bold', backgroundColor: '#E6F3FF' }}>
          {grandTotalsByLocation['Pasir Ris West Wellness Centre']}
        </td>
        <td className="location-cell location-tampines" style={{ fontWeight: 'bold', backgroundColor: '#FFFACD' }}>
          {grandTotalsByLocation['Tampines North Community Club']}
        </td>
      </tr>
    );

    return [...rows, totalRow];
  };

  render() {
    const { isOpen, onClose } = this.props;
    const { isLoading, selectedLocations, allLocationsChecked, displayData, activeTab } = this.state;

    if (!isOpen) return null;

    return (
      <div className="sales-report-modal-overlay" onClick={onClose}>
        <div className="sales-report-modal-content-large" onClick={(e) => e.stopPropagation()}>
          <div className="sales-report-modal-header">
            <h2>Sales Report</h2>
            <button className="sales-report-modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          {/* Tabs Section */}
          <div className="sales-report-tabs">
            <button
              className={`sales-report-tab ${activeTab === 'Orders' ? 'active' : ''}`}
              onClick={() => this.setState({ activeTab: 'Orders' })}
            >
              Orders
            </button>
            <button
              className={`sales-report-tab ${activeTab === 'Items' ? 'active' : ''}`}
              onClick={() => this.setState({ activeTab: 'Items' })}
            >
              Items
            </button>
          </div>

          <div className="sales-report-modal-body-large">
            {/* Orders Tab Content */}
            {activeTab === 'Orders' && (
              <div className="sales-report-table-section">
                <h4>Confirmed Orders</h4>
                <div className="sales-report-table-wrapper">
                  <table className="sales-report-table">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>All Locations</th>
                        <th>CT Hub</th>
                        <th>Pasir Ris West Wellness Centre</th>
                        <th>Tampines North Community Club</th>
                      </tr>
                    </thead>
                    <tbody>
                      {this.renderOrdersTable()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Items Tab Content */}
            {activeTab === 'Items' && (
              <div className="sales-report-table-section">
                <h4>Item Sales</h4>
                <div className="sales-report-table-wrapper">
                  <table className="sales-report-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>All Locations</th>
                        <th>CT Hub</th>
                        <th>Pasir Ris West Wellness Centre</th>
                        <th>Tampines North Community Club</th>
                      </tr>
                    </thead>
                    <tbody>
                      {this.renderSalesReportTableRows()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
              className="sales-report-btn-generate"
              onClick={this.generateSalesReport}
              disabled={isLoading || displayData.length === 0}
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default SalesReportModal;
