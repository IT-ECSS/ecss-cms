import React, { Component } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import '../../../css/sub/bulkOrderModal.css';

class BulkOrderModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      bulkOrderData: null,
      paidOrdersCount: 0,
      totalAmount: 0,
      ordersList: [],
      headers: [],
      showConfirmation: false,
      successMessage: '',
      errorMessage: '',
      lastUpdated: null
    };
  }

  componentDidMount() {
    this.processBackendData();
    // Fetch latest data from backend when modal opens
    this.fetchLatestBulkOrderData();
  }

  componentDidUpdate(prevProps) {
    // Process data when backendData prop changes
    if (this.props.backendData !== prevProps.backendData) {
      this.processBackendData();
    }
  }

  fetchLatestBulkOrderData = async () => {
    try {
      this.setState({ isLoading: true, errorMessage: '' });
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
        {
          "purpose": "bulk"
        }
      );
      console.log("Bulk order response:", response.data.result.data);
      if (response.data?.result?.success) {
        const bulkOrdersArray = response.data.result.data || [];
        console.log('Latest data retrieved from backend:', bulkOrdersArray);
        
        // Extract headers from the first object
        const headers = bulkOrdersArray.length > 0 ? Object.keys(bulkOrdersArray[0]) : [];
        
        // Format data as expected by processBackendData
        const backendData = {
          bulkOrders: bulkOrdersArray,
          headers: headers
        };
        
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const formattedTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        console.log('Data fetched at:', formattedTime);
        
        this.setState({ 
          bulkOrderData: backendData,
          lastUpdated: formattedTime,
          isLoading: false
        });
        this.processBackendData();
      } else {
        console.error('Backend returned error:', response.data?.result?.message);
        this.setState({ 
          errorMessage: response.data?.result?.message || 'Failed to fetch bulk orders',
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Error fetching latest bulk order data:', error);
      this.setState({ 
        errorMessage: 'Failed to fetch latest data. Using cached data.',
        isLoading: false 
      });
    }
  };

  exportBulkOrdersToExcel = async (backendData, timestamp) => {
    try {
      // Validate backendData exists
      if (!backendData) {
        alert('No data to export. Please fetch the bulk orders first.');
        return;
      }
      
      const bulkOrders = backendData.bulkOrders || [];
      const headers = backendData.headers || [];
      
      // Define product columns to include
      const productColumns = ['Panettone For Good - 1000gm', 'Panettone For Good - 500gm', 'Panettone For Good - 100gm'];
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Bulk Orders');
      
      // Helper function to convert Excel serial number to dd/mm/yyyy
      const convertExcelDate = (excelDateNum) => {
        if (!excelDateNum || isNaN(excelDateNum)) return '';
        
        const excelDate = parseInt(excelDateNum);
        // Excel's epoch is January 1, 1900
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        
        if (isNaN(date.getTime())) return '';
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
      };
      
      // Create header row
      const headerColumns = ['S/N', ...headers];
      worksheet.columns = headerColumns.map(col => ({ header: col, key: col.toLowerCase().replace(/\s+/g, '_') }));
      
      // Apply header styling - navy blue background with white bold text
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
      headerRow.height = null; // Auto fit height
      
      // Apply navy blue background to all header cells from column 1 to last column
      for (let colIndex = 1; colIndex <= headerColumns.length; colIndex++) {
        const cell = headerRow.getCell(colIndex);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000080' } };
      }
      
      // Process and add data rows
      let totalAmount = 0;
      const productTotals = {};
      productColumns.forEach(product => {
        productTotals[product] = 0;
      });
      
      bulkOrders.forEach((order, rowIndex) => {
        const orderData = order.data || order;
        
        // Skip empty rows
        if (!orderData['S/N'] || orderData['S/N'] === '' || orderData['S/N'] === ' ') {
          return;
        }
        
        const rowData = {
          's_n': orderData['S/N'] || ''
        };
        
        // Process each header column
        headers.forEach(header => {
          let value = orderData[header] !== '' && orderData[header] !== ' ' ? orderData[header] : '';
          
          // Format date fields to dd/mm/yyyy
          const lowerHeader = header.toLowerCase().trim();
          if ((lowerHeader.includes('order date') || lowerHeader.includes('date of delivery')) && value) {
            if (!isNaN(value) && typeof value === 'number') {
              value = convertExcelDate(value);
            } else if (typeof value === 'string') {
              const numValue = parseInt(value);
              if (!isNaN(numValue) && value.trim() !== '') {
                value = convertExcelDate(numValue);
              }
            }
          }
          
          // Format amount column as currency
          if ((lowerHeader === 'amount' || header === 'amount') && value) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              value = numValue;
              totalAmount += numValue;
            }
          }
          
          // Sum product quantities
          if (productColumns.includes(header) && value) {
            const quantity = parseFloat(value);
            if (!isNaN(quantity)) {
              productTotals[header] += quantity;
            }
          }
          
          rowData[header.toLowerCase().replace(/\s+/g, '_')] = value;
        });
        
        // Add row to worksheet
        const row = worksheet.addRow(rowData);
        
        // Apply data row styling - soft pastel light green to all cells in table
        row.font = { color: { argb: 'FF000000' } };
        row.alignment = { horizontal: 'left', vertical: 'center' };
        
        // Apply soft pastel green background to all cells from column 1 to last column
        const headerColumns = ['S/N', ...headers];
        for (let colIndex = 1; colIndex <= headerColumns.length; colIndex++) {
          const cell = row.getCell(colIndex);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } };
        }
        
        // Format amount column as currency
        headers.forEach((header, colIndex) => {
          if ((header === 'amount' || header.toLowerCase() === 'amount')) {
            const cell = row.getCell(colIndex + 2); // +2 because S/N is first column
            if (cell.value !== '' && cell.value !== null) {
              cell.numFmt = '$#,##0.00';
              cell.alignment = { horizontal: 'right' };
            }
          }
        });
      });
      
      // Add empty row
      worksheet.addRow({});
      
      // Add totals row
      const totalsData = {
        's_n': 'TOTAL'
      };
      
      headers.forEach(header => {
        if (header === 'amount' || header.toLowerCase() === 'amount') {
          totalsData[header.toLowerCase().replace(/\s+/g, '_')] = totalAmount;
        } else if (productColumns.includes(header)) {
          totalsData[header.toLowerCase().replace(/\s+/g, '_')] = productTotals[header];
        }
      });
      
      const totalsRow = worksheet.addRow(totalsData);
      
      // Apply totals row styling - pastel yellow to all cells from col 1 to last table column
      totalsRow.font = { bold: true, color: { argb: 'FF000000' } };
      totalsRow.alignment = { horizontal: 'left', vertical: 'center' };
      
      // Calculate the last column index (S/N + all headers)
      const lastTableColIndex = 1 + headers.length;
      
      // Apply background color to all cells in the table range
      for (let colIndex = 1; colIndex <= lastTableColIndex; colIndex++) {
        const cell = totalsRow.getCell(colIndex);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
      }
      
      // Format S/N cell to show TOTAL
      const snCell = totalsRow.getCell(1);
      snCell.value = 'TOTAL';
      snCell.font = { bold: true, color: { argb: 'FF000000' } };
      
      // Format amount column in totals as currency
      headers.forEach((header, colIndex) => {
        if ((header === 'amount' || header.toLowerCase() === 'amount')) {
          const cell = totalsRow.getCell(colIndex + 2);
          cell.numFmt = '$#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      });
      
      // Set column widths - auto fit content
      worksheet.columns.forEach(column => {
        let maxLength = 12;
        column.eachCell((cell) => {
          const cellValue = String(cell.value || '');
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });
      
      // Generate file
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Bulk Orders Record ${dateStr}.xlsx`;
      
      // Write file
      await workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
      });
      
      console.log('Excel file exported successfully:', filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  }

  processBackendData = () => {
    // Use data from state first, then fallback to props
    const backendData = this.state.bulkOrderData || this.props.backendData;
    
    if (!backendData) {
      console.log('No backend data received');
      return;
    }

    // Extract all entries from backendData
    const bulkOrders = backendData.bulkOrders || [];
    const headers = backendData.headers || [];
    
    // Get product columns (Panettone variants)
    const productColumns = headers.filter(h => h && typeof h === 'string' && h.includes('Panettone')) || [];
    
    console.log('Raw bulk orders data:', bulkOrders);
    console.log('Product columns found:', productColumns);

    // Build summary - aggregate all data (no location grouping)
    const summary = {
      totalOrders: 0,
      itemsSoldByProduct: {},
      totalPaidAmount: 0
    };

    // Initialize product counts
    productColumns.forEach(product => {
      summary.itemsSoldByProduct[product] = 0;
    });

    // Process each order
    bulkOrders.forEach((order) => {
      const orderData = order.data || order;
      
      // Skip empty rows
      if (!orderData['S/N'] || orderData['S/N'] === '' || orderData['S/N'] === ' ') {
        return;
      }
      
      summary.totalOrders += 1;
      
      // Get the payment amount for this row (from 'amount' field)
      const paymentAmount = parseFloat(orderData['amount'] || 0);
      if (!isNaN(paymentAmount) && paymentAmount > 0) {
        summary.totalPaidAmount += paymentAmount;
      }
      
      // Count each product sold
      productColumns.forEach(product => {
        const quantity = parseFloat(orderData[product] || 0);
        if (!isNaN(quantity) && quantity > 0) {
          summary.itemsSoldByProduct[product] += quantity;
        }
      });
    });

    console.log('Summary:', summary);

    this.setState({
      headers: headers,
      paidOrdersCount: summary.totalOrders,
      totalAmount: summary.totalPaidAmount,
      locationSummary: summary,
      productColumns: productColumns,
      isLoading: false
      // Note: lastUpdated and bulkOrderData are NOT reset here to preserve them
    });
  };

  exportToPDF = () => {
    try {
      console.log('Exporting PDF...');
      const { locationSummary, productColumns } = this.state;
      const backendData = this.state.bulkOrderData;
      
      if (!locationSummary) {
        alert('No data to export');
        return;
      }

      if (!backendData) {
        alert('No backend data available');
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      
      // Create container with header and styling
      const container = document.createElement('div');
      
      // Build table HTML from backendData
      const bulkOrders = backendData.bulkOrders || [];
      const headers = backendData.headers || [];
      
      let tableHTML = `
        <table class="bulk-order-products-table1">
          <thead>
            <tr>
              <th>Total Paid Amount</th>
              <th>Total Orders Made</th>
              ${productColumns?.map(product => `<th style="text-align: center;">${product}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #e8e8e8; font-weight: 600;">
              <td style="text-align: center;"><strong>$${locationSummary.totalPaidAmount?.toFixed(2) || '0.00'}</strong></td>
              <td style="text-align: center;"><strong>${locationSummary.totalOrders || 0}</strong></td>
              ${productColumns?.map(product => `<td style="text-align: center;"><strong>${locationSummary.itemsSoldByProduct?.[product] || 0}</strong></td>`).join('')}
            </tr>
          </tbody>
        </table>
      `;
      
      container.innerHTML = `
        <style>
          body { margin: 0; padding: 0; }
          table.bulk-order-products-table1 {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
          }
          table.bulk-order-products-table1 th,
          table.bulk-order-products-table1 td {
            font-size: 11px;
            padding: 8px 4px;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          table.bulk-order-products-table1 th {
            white-space: normal;
          }
        </style>
        <div style="padding: 3px; background-color: white; width: 100%;">
          <h2 style="margin-bottom: 8px; text-align: center; font-size: 14px; font-weight: bold;">Bulk Order Report</h2>
          <div style="width: 100%; padding: 0; margin: 0;">${tableHTML}</div>
        </div>
      `;

      const pdfOptions = {
        margin: [3, 3, 3, 3],
        filename: `Bulk-Order-Report-${dateStr}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' },
        jsPDF: { 
          orientation: 'landscape', 
          unit: 'mm', 
          format: 'a4',
          compress: true,
          precision: 10
        }
      };

      html2pdf().set(pdfOptions).from(container).save();
      console.log('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF. Please try again.');
    }
  };

  viewPDF = () => {
    try {
      console.log('Opening PDF preview in new tab...');
      const { locationSummary, productColumns } = this.state;
      const backendData = this.state.bulkOrderData;
      
      if (!locationSummary) {
        alert('No data to view');
        return;
      }

      if (!backendData) {
        alert('No backend data available');
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      
      // Create container with header and styling
      const container = document.createElement('div');
      
      // Build table HTML from backendData
      const bulkOrders = backendData.bulkOrders || [];
      const headers = backendData.headers || [];
      
      let tableHTML = `
        <table class="bulk-order-products-table1">
          <thead>
            <tr>
              <th rowSpan="2">Total Paid Amount</th>
              <th rowSpan="2">Total Orders Made</th>
              <th colSpan="${productColumns?.length || 1}" style="text-align: center; border-bottom: 2px solid rgba(255, 255, 255, 0.2);">Items Sold</th>
            </tr>
            <tr>
              ${productColumns?.map(product => `<th style="text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">${product}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #e8e8e8; font-weight: 600;">
              <td style="text-align: center;"><strong>$${locationSummary.totalPaidAmount?.toFixed(2) || '0.00'}</strong></td>
              <td style="text-align: center;"><strong>${locationSummary.totalOrders || 0}</strong></td>
              ${productColumns?.map(product => `<td style="text-align: center;"><strong>${locationSummary.itemsSoldByProduct?.[product] || 0}</strong></td>`).join('')}
            </tr>
          </tbody>
        </table>
      `;
      
      container.innerHTML = `
        <style>
          body { margin: 0; padding: 0; }
          table.bulk-order-products-table1 {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
          }
          table.bulk-order-products-table1 th,
          table.bulk-order-products-table1 td {
            font-size: 11px;
            padding: 8px 4px;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          table.bulk-order-products-table1 th {
            white-space: normal;
          }
        </style>
        <div style="padding: 3px; background-color: white; width: 100%;">
          <h2 style="margin-bottom: 8px; text-align: center; font-size: 14px; font-weight: bold;">Bulk Order Report</h2>
          <div style="width: 100%; padding: 0; margin: 0;">${tableHTML}</div>
        </div>
      `;

      const pdfOptions = {
        margin: [3, 3, 3, 3],
        filename: `Bulk-Order-Report-${dateStr}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' },
        jsPDF: { 
          orientation: 'landscape', 
          unit: 'mm', 
          format: 'a4',
          compress: true,
          precision: 10
        }
      };

      html2pdf().set(pdfOptions).from(container).outputPdf('blob').then((pdfBlob) => {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const newTab = window.open();
        newTab.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Bulk Order Report Preview</title>
            <style>
              body { margin: 0; padding: 0; background-color: #eeeeee; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${pdfUrl}" title="PDF Preview"></iframe>
          </body>
          </html>
        `);
        newTab.document.close();
        console.log('PDF preview opened in new tab');
      }).catch((error) => {
        console.error('Error generating PDF preview:', error);
        alert('Error generating PDF preview. Please try again.');
      });
    } catch (error) {
      console.error('Error opening PDF preview in new tab:', error);
      alert('Error opening PDF preview. Please try again.');
    }
  };


  render() {
    const { onClose, loading, error, isOpen } = this.props;
    
    // Don't render if modal is not open
    if (!isOpen) return null;
    
    const { 
      isLoading, 
      paidOrdersCount, 
      totalAmount,
      successMessage,
      errorMessage,
      locationSummary,
      productColumns,
      lastUpdated
    } = this.state;

    // Show loading state from parent
    const displayLoading = loading || isLoading;
    const displayError = error || errorMessage;

    return (
      <div className="bulk-order-modal-overlay" onClick={onClose}>
        <div className="bulk-order-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header with Title and Timestamps */}
          <div className="bulk-order-modal-header-top">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0', fontSize: '1.5rem' }}>Bulk Order Report</h2>
              </div>
              <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                {lastUpdated && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Last Updated: {lastUpdated}
                    </div>
                  </div>
                )}
                <button 
                  className="sales-report-modal-close"
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

          {/* Export Buttons Above Table */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '8px 20px', width: 'fit-content', marginLeft: 'auto', marginRight: '0px' }}>
            <button
              onClick={this.viewPDF}
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
              onClick={this.exportToPDF}
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
          <div className="bulk-order-modal-body">
            {/* Error State from Parent */}
            {displayError && !displayLoading && (
              <div className="bulk-order-error-message">
                <span className="bulk-order-error-icon">!</span>
                {displayError}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bulk-order-success-message">
                <span className="bulk-order-success-icon">✓</span>
                {successMessage}
              </div>
            )}

            {/* Empty State - No Data Yet */}
            {!displayError && !successMessage && paidOrdersCount === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <p style={{ fontSize: '16px', color: '#666', margin: '0' }}>
                  Awaiting bulk order data...
                </p>
                <p style={{ fontSize: '13px', color: '#999', margin: '8px 0 0 0' }}>
                  Click "Bulk Orders Report" or wait for data to load
                </p>
              </div>
            )}

            {/* Data Ready State */}
            {!displayError && paidOrdersCount > 0 && (
              <div className="bulk-order-products-section">
                <table className="bulk-order-products-table">
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ backgroundColor: '#3f4a5e', color: 'white' }}>Total Paid Amount</th>
                      <th rowSpan="2" style={{ backgroundColor: '#3f4a5e', color: 'white' }}>Total Orders Made</th>
                      <th colSpan={productColumns?.length || 1} style={{ textAlign: 'center', borderBottom: '2px solid rgba(255, 255, 255, 0.2)', backgroundColor: '#3f4a5e', color: 'white' }}>Items Sold</th>
                    </tr>
                    <tr>
                      {productColumns?.map((product, idx) => (
                        <th key={idx} style={{ textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: '#3f4a5e', color: 'white' }}>{product}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ backgroundColor: '#e8e8e8', fontWeight: '600' }}>
                      <td style={{ textAlign: 'center' }}>
                        <strong>${locationSummary.totalPaidAmount?.toFixed(2) || '0.00'}</strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <strong>{locationSummary.totalOrders || 0}</strong>
                      </td>
                      {productColumns?.map((product, idx) => (
                        <td key={idx} style={{ textAlign: 'center' }}>
                          <strong>{locationSummary.itemsSoldByProduct?.[product] || 0}</strong>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="bulk-order-modal-footer">
            <button
              className="bulk-order-generate-btn"
              onClick={() => this.exportBulkOrdersToExcel(this.state.bulkOrderData, this.state.lastUpdated)}
            >
              Generate Bulk Orders Report
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default BulkOrderModal;
