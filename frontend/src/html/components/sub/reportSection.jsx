import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/invoiceSection.css';
import '../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import * as XLSX from 'xlsx'; // Import the XLSX library

class ReportSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      invoiceData: [],  // Store invoice data,
      updatedInvoiceData: [],  // Store invoice data
      columnDefs: [  // Define the column headers and configurations
        { headerName: "S/N", field: "index", width: 100, sortable: true },
        { headerName: "Received From", field: "participant.name", width: 200, sortable: true },
        { headerName: "Course Name", field: "course.courseEngName", width: 350, sortable: true },
        { headerName: "Course Location", field: "course.courseLocation", width: 300, sortable: true },
        { headerName: "Payment Method", field: "course.payment", width: 150, sortable: true },
        { headerName: "Price", field: "course.coursePrice", width: 150, sortable: true },
        { headerName: "Payment Status", field: "status", width: 200, sortable: true },
        { headerName: "Receipt Number", field: "official.receiptNo", width: 300, sortable: true },
        { headerName: "Registration Date", field: "registrationDate", width: 150, sortable: true },
        { headerName: "Payment Date", field: "official.date", width: 150, sortable: true },
        { headerName: "Refunded Date", field: "official.refundedDate", width: 150, sortable: true },
        { headerName: "Misc", field: "misc", width: 250, sortable: true },
        { headerName: "Remarks", field: "official.remarks", width: 250, sortable: true },
      ], 
      rowData: [],  // The actual data for the grid
      monthYearOptions: [], // List of month-year combinations
      filteredMonthYearOptions: [], // List of month-year combinations
      selectedMonthYear: '', // Selected month-year from the dropdown
      showTable: false, // Control whether the table and export button are visible
      status: "",
      total: "",
      fromDate: '',
      toDate: '',
      showReport: false,
      dateRange: "", 
      totalCash: 0,
      totalPayNow: 0,
      showMonthYearDropdown: false,
      selectedSiteICLocation: '', // Start with no default value
      showSiteICDropdown: false, // State to control visibility of Site IC dropdown
      showSiteDropdown: false, // State to control visibility of Site dropdown list
      filteredSiteOptions: [] // List of filtered site options
    };
  }

  handleFromDateChange = (e) => {
    this.setState({ fromDate: e.target.value });
  };

  handleToDateChange = (e) => {
    this.setState({ toDate: e.target.value });
  };

  generateReportButton = async () => {
      this.setState({ showReport: true, dateRange: `${this.state.fromDate} - ${this.state.toDate}` });
      await this.fetchSiteICDetails(this.state.fromDate, this.state.toDate);
      await this.calculateTotalPriceForDateRange(this.state.fromDate, this.state.toDate);
      this.setState({showSiteICDropdown: true})
  };
  
  // Fetch invoice data when the component mounts
  componentDidMount = async () => 
  {
      this.props.loadingPopup1();
      await this.fetchInvoiceDetails();
      this.props.closePopup1();
  };

  componentDidUpdate = async (prevProps) => {
    if (prevProps.reportType !== this.props.reportType) {
        this.props.loadingPopup1();
        await this.fetchInvoiceDetails();
        this.props.closePopup1();
    }
  };
  

  calculateTotalPriceForSelectedMonth = (selectedMonth) => {
    const { invoiceData } = this.state;
    console.log("Invoice Data:", invoiceData);
  
    // Function to parse the date string in dd/mm/yyyy format
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const [day, month, year] = dateStr.split('/');
      return new Date(`${year}-${month}-${day}`);
    };
  
    // Extract month and year from the selectedMonth string (e.g., "February 2025")
    const [monthName, year] = selectedMonth.split(' ');
  
    // Mapping month name to month index (0 = January, 1 = February, ..., 11 = December)
    const monthIndex = new Date(Date.parse(`${monthName} 1, 2025`)).getMonth();
    
    // Filter the invoice data based on the formatted month-year string
    const filteredData = invoiceData.filter(item => {
      const paymentDateString = item.official.date; // Assuming the format is 'dd/mm/yyyy'
      const paymentDate = parseDate(paymentDateString);
  
      if (!paymentDate) return false; // If there's no valid date, exclude the item
  
      // Format the payment date as "Month Year" string (e.g., "February 2025")
      const itemMonthName = paymentDate.toLocaleString('default', { month: 'long' }); // Get month name
      const itemYear = paymentDate.getFullYear(); // Get the full year from the payment date
  
      // Create a "Month Year" string from the item date
      const itemFormattedMonthYear = `${itemMonthName} ${itemYear}`;
  
      return item.official.receiptNo && itemFormattedMonthYear === selectedMonth; // Compare formatted month-year
    });
  
    console.log("Filtered Data:", filteredData);
  
    // Calculate total price for the filtered data
    const totalPrice = filteredData.reduce((total, item) => {
      let price = 0;
      if (item.official.date) {
        const priceString = item.course?.coursePrice.replace('$', '').trim();
        if (priceString !== "" && !isNaN(parseFloat(priceString))) {
          price = parseFloat(priceString);
        }
      }
      return total + price; // Perform numerical addition
    }, 0);
  
    console.log("Filtered Total Price:", totalPrice);
  
    // Update the state with the total price, formatted to two decimal places
    this.setState({ totalPrice: totalPrice.toFixed(2) });
  };
  
  
  calculateTotalPriceForDateRange = () => {
    console.log("Updated Invoice Data:", this.state.updatedInvoiceData)
   // Calculate total price for Cash, PayNow, and Total
    const totalCash = this.state.updatedInvoiceData.reduce((total, item) => {
      let price = 0;
      if (item.course.payment === "Cash" && item.status === "Paid") {
        const priceString = item.course?.coursePrice.replace('$', '').trim();
        if (priceString !== "" && !isNaN(parseFloat(priceString))) {
          price = parseFloat(priceString);
        }
      }
      return total + price;
    }, 0);
  
    const totalPayNow = this.state.updatedInvoiceData.reduce((total, item) => {
      let price = 0;
      if (item.course.payment === "PayNow" && item.status === "Paid") {
        const priceString = item.course?.coursePrice.replace('$', '').trim();
        if (priceString !== "" && !isNaN(parseFloat(priceString))) {
          price = parseFloat(priceString);
        }
      }
      return total + price;
    }, 0);
  
    const totalPrice = this.state.updatedInvoiceData.reduce((total, item) => {
      let price = 0;
      if (item.status === "Paid") {
        const priceString = item.course?.coursePrice.replace('$', '').trim();
        if (priceString !== "" && !isNaN(parseFloat(priceString))) {
          price = parseFloat(priceString);
        }
      }
      return total + price;
    }, 0);
  
    console.log("Total Cash:", totalCash);
    console.log("Total PayNow:", totalPayNow);
    console.log("Total Price:", totalPrice);
  
    // Update the state with the totals, formatted to two decimal places
    this.setState({
      totalCash: totalCash.toFixed(2),
      totalPayNow: totalPayNow.toFixed(2),
      totalPrice: totalPrice.toFixed(2)
    });
  };  
  
  // Function to fetch invoice details and populate the AG-Grid
  fetchInvoiceDetails = async () => {
    try {
      const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/generate_monthly_report/`);
      const data = response.data.data;
      console.log("Fetched Invoice Data:", data);
      console.log("This.props:", this.props);

      // Prepare siteIC as an array for dropdown (split by comma or handle as array, and trim after '-')
      const siteICArray = Array.isArray(this.props.siteIC)
        ? this.props.siteIC
        : (typeof this.props.siteIC === 'string' && this.props.siteIC.includes(','))
          ? this.props.siteIC.split(',').map(s => s.trim()).filter(Boolean)
          : this.props.siteIC ? [this.props.siteIC] : [];
      // Always show only the part before '-' and trim
      const siteICDisplayArray = siteICArray.map(loc => loc.split('-')[0].trim());

      let filteredData;
      const role = this.props.role ? this.props.role.toLowerCase() : "";
      // Treat NSA in-charge and Ops in-charge as admin/sub-admin
      const isAdminLike = (
        role === "admin" ||
        role === "sub-admin" ||
        role === "nsa in-charge" ||
        role === "ops in-charge"
      );
      if (isAdminLike) {
        // Remove location filter for all roles, only filter out SkillsFuture
        filteredData = data.filter(item => item.course?.payment !== "SkillsFuture");
        console.log("Filtered Data (Admin/Sub-admin/NSA/Ops in-charge):", filteredData);
      } else if (role.includes("in-charge")) {
        // Other in-charge roles: can see only their assigned sites
        filteredData = data.filter(item => {
          const courseLocation = item.course?.courseLocation?.split('-')[0]?.trim();
          return item.course?.payment !== "SkillsFuture" && siteICDisplayArray.includes(courseLocation);
        });
        console.log("Filtered Data (Other In-charge):", filteredData);
      } else {
        // Default: restrict to assigned site(s)
        filteredData = data.filter(item => {
          const courseLocation = item.course?.courseLocation?.split('-')[0]?.trim();
          return item.course?.payment !== "SkillsFuture" && siteICDisplayArray.includes(courseLocation);
        });
        console.log("Filtered Data (Default):", filteredData);
      }

      // Map data to include an 'index' field for the AG-Grid
      const mappedData = filteredData.map((item, index) => ({
        ...item,
        index: index + 1,
      }));
      console.log("Invoice Data:", mappedData);
      
      // Generate the month-year combinations
      const monthYearOptions = this.getMonthYearOptions(mappedData);

      // Update the state with the data and month-year options
      this.setState({ 
        invoiceData: mappedData, 
        rowData: mappedData, // Set the original data
        updatedInvoiceData: mappedData, // Set the filtered data initially to the full data
        monthYearOptions, 
        filteredMonthYearOptions: monthYearOptions,
        status: `Collection by ${this.props.userName || 'Lee Chin'}`,
        showReport: false,
        showTable: false,
        fromDate: "",
        toDate: "",
        selectedMonthYear: "",
        // No default site selection - empty means all locations
        selectedSiteICLocation: ""
      });
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };
  
  fetchSiteICDetails = async (fromDate, toDate) => {
    try {
      this.props.loadingPopup1();
  
      // Function to parse the date in dd/mm/yyyy format
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}`);
      };
  
      // Validate if a date is valid
      const isValidDate = (date) => date instanceof Date && !isNaN(date);
  
      // Parse fromDate and toDate
      const fromParsed = fromDate ? parseDate(fromDate) : null;
      const toParsed = toDate ? parseDate(toDate) : null;
  
      // Log invalid dates, but continue with filtering
      if (fromDate && !isValidDate(fromParsed)) {
        console.error("Invalid fromDate:", fromDate);
      }
  
      if (toDate && !isValidDate(toParsed)) {
        console.error("Invalid toDate:", toDate);
      }
  
      // Prepare siteIC as an array for dropdown (split by comma or handle as array, and trim after '-')
      const siteICArray = Array.isArray(this.props.siteIC)
        ? this.props.siteIC
        : (typeof this.props.siteIC === 'string' && this.props.siteIC.includes(','))
          ? this.props.siteIC.split(',').map(s => s.trim()).filter(Boolean)
          : this.props.siteIC ? [this.props.siteIC] : [];
      // Always show only the part before '-' and trim
      const siteICDisplayArray = siteICArray.map(loc => loc.split('-')[0].trim());
      console.log("This Props:", this.props);
  
      // Filter and map the data to ensure the index always starts from 1 after each filter
      let customIndex = 1; // Always start the index from 1
      console.log("Original Invoice Data:", this.state.invoiceData);

      // Filter the data based on date range and location
      const filteredData = this.state.invoiceData.filter((item) => {
        const itemDate = item.registrationDate;
        const date = parseDate(itemDate);
        const paymentDate = item.official?.date;
        const payment = parseDate(paymentDate);
        const courseLocation = item.course.courseLocation;
        // Use selectedSiteIC for filtering if set (support "all" option for multiple locations)
        const selectedSiteIC = this.state.selectedSiteICLocation;
        let targetLocations;
        if (selectedSiteIC === 'All Locations' || selectedSiteIC === 'all' || selectedSiteIC === '' || !selectedSiteIC) {
          // If "All Locations" is selected, empty, or no selection, use all available locations
          targetLocations = siteICDisplayArray;
        } else {
          // Use the specific selected location
          targetLocations = [selectedSiteIC];
        }
        if (payment) {
          if (fromParsed && toParsed && isValidDate(fromParsed) && isValidDate(toParsed)) {
            console.log("From1234", this.props.role, this.props.role.toLowerCase().includes("in-charge"));  
            if (this.props.role && (this.props.role.toLowerCase() === "admin" || this.props.role.toLowerCase() === "sub-admin")) {
              // Admins see all sites
              return payment >= fromParsed && payment <= toParsed && item.course.payment !== "SkillsFuture" && item.status != "Pending";
            } /*else if (this.props.siteIC === null || this.props.siteIC === undefined || this.props.siteIC == "") {
              return payment >= fromParsed && payment <= toParsed && item.course.payment !== "SkillsFuture" && item.status != "Pending";
            } */
            else if (this.props.role && this.props.role.toLowerCase().includes("in-charge")) {
              console.log("In-charge Role Detected:", this.props.role);
              // NSA in-charge: can see only CT Hub, Site in-charge: can see only their assigned sites
              if (this.props.role.toLowerCase() === "nsa in-charge") {
                return (
                  payment >= fromParsed &&
                  payment <= toParsed &&
                  (courseLocation === "CT Hub" || courseLocation === "Sree Narayana Mission" || courseLocation === "Renewal Christian Church") &&
                  item.course.payment !== "SkillsFuture" &&
                  item.status !== "Pending"
                );
              } else {
                return (
                  payment >= fromParsed &&
                  payment <= toParsed &&
                  targetLocations.includes(courseLocation) &&
                  item.course.payment !== "SkillsFuture" &&
                  item.status !== "Pending"
                );
              }
            }
            else {
              // Default: restrict to targetLocations
              return payment >= fromParsed && payment <= toParsed && targetLocations.includes(courseLocation) && item.course.payment !== "SkillsFuture" && item.status != "Pending";
            }
          } else if (!fromParsed && !toParsed) {
            if (this.props.role && (this.props.role.toLowerCase() === "admin" || this.props.role.toLowerCase() === "sub-admin")) {
              return item.course.payment !== "SkillsFuture";
            }else if (this.props.role && this.props.role.toLowerCase().includes("in-charge")) {
              // NSA in-charge: can see only CT Hub, Site in-charge: can see only their assigned sites
              if (this.props.role.toLowerCase() === "nsa in-charge") {
                return (
                  payment >= fromParsed &&
                  payment <= toParsed &&
                  targetLocations.includes("CT Hub") &&
                  item.course.payment !== "SkillsFuture" &&
                  item.status !== "Pending"
                );
              } else {
                return (
                  payment >= fromParsed &&
                  payment <= toParsed &&
                  targetLocations.includes(courseLocation) &&
                  item.course.payment !== "SkillsFuture" &&
                  item.status !== "Pending"
                );
              }
            }
            return targetLocations.includes(courseLocation) && item.course.payment !== "SkillsFuture";
          }
        }
        return false;
      }).map((item) => {
        const newItem = {
          ...item,
          index: customIndex,
        };
        customIndex++;
        return newItem;
      });
  
      console.log("Filtered Report Data:", filteredData);
  
      // Update the state with the filtered data
      this.setState({
        rowData: filteredData, // Set the original data
        updatedInvoiceData: filteredData, // Set the filtered data
        status: `Collection by ${this.props.userName}`,
      });
  
      // Close the popup
      this.props.closePopup1();
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };  
  
  // Function to extract unique month-year combinations in full month name format (mmmm yyyy)
  getMonthYearOptions = (data) => {
    const monthYearSet = new Set();
    data.forEach(item => {
      const registrationDateString = item.registrationDate; // Assuming the format is 'dd/mm/yyyy'
      const [cday, cmonth, cyear] = registrationDateString.split('/');
      const monthName = new Date(`${cyear}-${cmonth}-${cday}`).toLocaleString('default', { month: 'long' });
      const monthYear = `${monthName} ${cyear}`;
      monthYearSet.add(monthYear);
    });
    return Array.from(monthYearSet);
  };

  handleMonthYearChange = (selectedMonthYear) => 
  {
    console.log("Selected Month Year:", selectedMonthYear);
    this.setState({ selectedMonthYear, showMonthYearDropdown: false});
      // Recalculate total price and apply filter after selecting month-year
    this.calculateTotalPriceForSelectedMonth(selectedMonthYear);
    this.filterInvoiceDataByMonthYear(selectedMonthYear);
  };

  filterInvoiceDataByMonthYear = (selectedMonthYear) => {
    const { invoiceData } = this.state;
    console.log("Selected Value:", selectedMonthYear);
    console.log("Invoice Data:", invoiceData);
  
    if (selectedMonthYear !== "") {
      // Filter the data based on the selected month-year
      const filteredData = invoiceData.filter(item => {
        const registrationDateString = item.official.date || ""; // Assuming the format is 'dd/mm/yyyy'
        const [cday, cmonth, cyear] = registrationDateString.split('/');
        const monthName = new Date(`${cyear}-${cmonth}-${cday}`).toLocaleString('default', { month: 'long' });
        const monthYear = `${monthName} ${cyear}`;
        console.log("Filter:", monthYear, selectedMonthYear);
        return monthYear === selectedMonthYear && item.official.receiptNo !== "";
      });
  
      // Reset the index for the filtered data starting from 1
      const updatedFilteredData = filteredData.map((item, index) => ({
        ...item,
        index: index + 1 // Resetting the index to start from 1
      }));
  
      // Update the filtered data for AG-Grid
      this.setState({ updatedInvoiceData: updatedFilteredData, showTable: true });
    } else {
      // Show the full data and hide the table when no month is selected
      this.setState({ updatedInvoiceData: invoiceData, showTable: false });
    }
  };
  
  generateMonthlyReport = () => {
    const { updatedInvoiceData, selectedMonthYear } = this.state;
    
    const headers = [
      'S/N', 'Received From', 'Course Name', 
      'Course Location', 'Payment Method', 'Price', 
      'Payment Status', 'Receipt Number', 'Registration Date', 
      'Payment Date', 'Refunded Date', 'Misc',
      'Remarks'
    ];
  
    // First filter out SkillsFuture payments
    const filteredData = updatedInvoiceData.filter(item => 
      item.course?.payment !== "SkillsFuture"
    );
    
    // Group by receipt number prefix
    const groupedByPrefix = {};
    
    filteredData.forEach(item => {
      const receiptNo = item.official?.receiptNo || '';
      const prefix = receiptNo.split('-')[0]?.trim() || 'Unknown';
      
      if (!groupedByPrefix[prefix]) {
        groupedByPrefix[prefix] = [];
      }
      groupedByPrefix[prefix].push(item);
    });
    
    // For each prefix group, sort by numeric part
    Object.keys(groupedByPrefix).forEach(prefix => {
      groupedByPrefix[prefix].sort((a, b) => {
        const receiptA = a.official?.receiptNo || '';
        const receiptB = b.official?.receiptNo || '';
        
        // Extract the numeric part after the dash
        const numA = receiptA.split('-')[1]?.trim();
        const numB = receiptB.split('-')[1]?.trim();
        
        if (!numA) return 1;  // Items without numeric part go last
        if (!numB) return -1;
        
        return parseInt(numA, 10) - parseInt(numB, 10);
      });
    });
    
    // Flatten the grouped and sorted data back into a single array
    const sortedData = [];
    Object.keys(groupedByPrefix).sort().forEach(prefix => {
      sortedData.push(...groupedByPrefix[prefix]);
    });
  
    // Prepare the rows from the sorted data
    var rows = sortedData.map((item, index) => [
      index + 1, // Serial number (S/N)
      item.participant?.name || '', // Received From
      item.course?.courseEngName || '', // Course Name
      item.course?.courseLocation || '', // Course Location
      item.course?.payment || '', // Payment Method
      item.course?.coursePrice || '', // Price
      item.status || '', // Payment Status
      item.official?.receiptNo || '', // Receipt Number
      item.registrationDate || '', // Registration Date
      item.official?.date || '', // Added optional chaining for consistency
      item.official?.refundedDate || '',
      '',
      item.official?.remarks || ''
    ]);
  
    // Calculate total price for the filtered data
    const totalPrice = sortedData.reduce((total, item) => {
      let price = 0;
      if (item.official?.date) {
        const priceString = (item.course?.coursePrice || '').replace('$', '').trim();
        if (priceString !== "" && !isNaN(parseFloat(priceString))) {
          price = parseFloat(priceString);
        }
      }
      return total + price;
    }, 0);
  
    const formattedTotalPrice = `$  ${totalPrice.toFixed(2)}`;
  
    // The rest of your code remains unchanged
    const emptyRow = new Array(headers.length).fill('');
    const collectionRow = new Array(headers.length).fill('');
    collectionRow[2] = 'dd-mm-yy'; 
    collectionRow[3] = 'Collection by Lee Chin'; 
  
    // Add the total row at the end of the report
    const totalRow = new Array(headers.length).fill('');
    totalRow[6] = `Total: ${formattedTotalPrice}`;
  
    // Create the sheet
    const sheetData = [headers, ...rows, emptyRow, collectionRow, emptyRow, totalRow];
  
    // Determine column widths based on the longest content in each column
    const colWidths = headers.map((_, colIndex) => {
      let maxLength = headers[colIndex].length; // Start with the header length
      sheetData.forEach(row => {
        if (row[colIndex] && row[colIndex].toString().length > maxLength) {
          maxLength = row[colIndex].toString().length;
        }
      });
      return { wch: maxLength + 2 }; // Add some padding to the width
    });
  
    // Create a worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
    // Set column widths dynamically
    ws['!cols'] = colWidths;
  
    // Apply bold font for headers and collection row
    for (let col = 0; col < headers.length; col++) {
      ws[`${String.fromCharCode(65 + col)}1`].s = { font: { bold: true } };
    }
  
    // Create a workbook and export it as an Excel file
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice Report');
    XLSX.writeFile(wb, `Invoice Report - ${selectedMonthYear}.xlsx`);
  };

  generatePaymentReport = () => {
    const { updatedInvoiceData, dateRange } = this.state;
  
    const headers = [
      'S/N', 'Received From', 'Course Name', 
      'Course Location', 'Payment Method', 'Price', 
      'Payment Status', 'Receipt Number', 'Registration Date', 
      'Payment Date', 'Refunded Date', 'Misc',
      'Remarks'
    ];
  
    // Group by receiptNo (the first part before the "-")
    const groupedByReceipt = updatedInvoiceData.reduce((acc, item) => {
      const receiptNo = item.official?.receiptNo || '';
      const receiptPrefix = receiptNo.split(' - ')[0]; // e.g., "Tampines 253 Centre"
      if (!acc[receiptPrefix]) {
        acc[receiptPrefix] = [];
      }
      acc[receiptPrefix].push(item);
      return acc;
    }, {});
  
    // Now, sort each group by the number part of receiptNo (after the "-")
    const sortedGroupedData = Object.keys(groupedByReceipt).map(receiptPrefix => {
      const group = groupedByReceipt[receiptPrefix].sort((a, b) => {
        const receiptNoA = a.official?.receiptNo.split(" - ")[1];
        const receiptNoB = b.official?.receiptNo.split(" - ")[1];
        return receiptNoA && receiptNoB ? parseInt(receiptNoA) - parseInt(receiptNoB) : 0;
      });
  
      return {
        receiptPrefix,
        data: group
      };
    });
  
    /*
      'S/N', 'Received From', 'Course Name', 
      'Course Location', 'Payment Method', 'Price', 
      'Payment Status', 'Receipt Number', 'Registration Date', 
      'Payment Date', 'Refunded Date', 'Misc',
      'Remarks'
    */

    // Prepare the rows from the sorted and grouped data
    const rows = [];
    sortedGroupedData.forEach(group => {
      group.data.forEach((item, index) => {
        rows.push([
          rows.length + 1, // Serial number (S/N)
          item.participant?.name || '', // Received From
          item.course?.courseEngName || '', // Course Name
          item.course?.courseLocation || '', // Course Location
          item.course?.payment || '', // Payment Method
          item.course?.coursePrice || '', // Price
          item.status || '', // Payment Status
          item.official?.receiptNo || '', // Receipt Number
          item.registrationDate || '', // Registration Date
          item.official.date || '', // Payment Date
          item.official?.refundedDate || '',
          '',
          item.official?.remarks || ''
        ])
      });
    });
  
    // Calculate total price for the filtered data
    const { totalPriceCash, totalPricePaynow } = updatedInvoiceData.reduce((acc, item) => {
      let price = parseFloat(item.course?.coursePrice.replace('$', '').trim()) || 0;
      if (item.course?.payment === 'Cash') acc.totalPriceCash += price;
      if (item.course?.payment === 'PayNow') acc.totalPricePaynow += price;
      return acc;
    }, { totalPriceCash: 0, totalPricePaynow: 0 });
  
    const formattedTotalPriceCash = `$ ${totalPriceCash.toFixed(2)}`;
    const formattedTotalPricePaynow = `$ ${totalPricePaynow.toFixed(2)}`;
    const formattedTotalPrice = `$ ${(totalPricePaynow + totalPriceCash).toFixed(2)}`;
  
    // Empty and collection rows
    const emptyRow = new Array(headers.length).fill('');
    const collectionRow = new Array(headers.length).fill('');
    collectionRow[2] = 'dd-mm-yy'; 
    collectionRow[3] = `Collection by ${this.props.userName}`;
  
    // Total rows
    const cashRow = new Array(headers.length).fill('');
    cashRow[6] = `Total (Cash): ${formattedTotalPriceCash}`;
    const payNowRow = new Array(headers.length).fill('');
    payNowRow[6] = `Total (PayNow): ${formattedTotalPricePaynow}`;
    const totalRow = new Array(headers.length).fill('');
    totalRow[6] = `Total: ${formattedTotalPrice}`;
  
    // Create the sheet
    const sheetData = [headers, ...rows, emptyRow, collectionRow, emptyRow, cashRow, payNowRow, totalRow];
  
    // Determine column widths based on the longest content in each column
    const colWidths = headers.map((_, colIndex) => {
      let maxLength = headers[colIndex].length;
      sheetData.forEach(row => {
        const cellValue = row[colIndex]?.toString() || '';
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
      });
      return { wch: maxLength + 2 }; // Add padding to the width
    });
  
    // Create worksheet and workbook, then export as Excel file
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = colWidths;
  
    // Apply bold font for headers and collection row
    for (let col = 0; col < headers.length; col++) {
      ws[`${String.fromCharCode(65 + col)}1`].s = { font: { bold: true } };
    }
  
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice Report');
    XLSX.writeFile(wb, `Invoice Report - ${dateRange}.xlsx`);
  };
  

  handleChange = (event) => {
    const { name, value } = event.target;
    console.log("handleChange", name, event);
  
    this.setState({ [name]: value }, () => {
      if (name === 'selectedMonthYear') {
        // Filtering locations based on the input value
        const filteredMonthYearOptions = this.state.monthYearOptions.filter(monthYear =>
          monthYear.toLowerCase().includes(value.toLowerCase())
        );
  
        // Updating the state with the filtered locations and selected value
        this.setState({
          filteredMonthYearOptions,
          selectedMonthYear: value, // Assuming you want the name to be centrelocation
        });
      } else if (name === 'selectedSiteICLocation') {
        // Get available site options
        const siteICArray = Array.isArray(this.props.siteIC)
          ? this.props.siteIC
          : (typeof this.props.siteIC === 'string' && this.props.siteIC.includes(','))
            ? this.props.siteIC.split(',').map(s => s.trim()).filter(Boolean)
            : this.props.siteIC ? [this.props.siteIC] : [];

        const siteOptions = [];
        if (siteICArray.length > 1) {
          siteOptions.push('All Locations');
        }
        siteICArray.forEach(loc => {
          const trimmed = loc.split('-')[0].trim();
          siteOptions.push(trimmed);
        });

        // Filter site options based on input value
        const filteredSiteOptions = siteOptions.filter(site =>
          site.toLowerCase().includes(value.toLowerCase())
        );

        this.setState({
          filteredSiteOptions,
          selectedSiteICLocation: value,
        });
      }
    });
  };

  handleDropdownToggle = (dropdown) =>
  {
    console.log("Dropdown:", dropdown);
    if(dropdown === 'showMonthYearDropdown')
    {
      this.setState({
        showMonthYearDropdown: true
      });
    }
    else if(dropdown === 'showSiteDropdown')
    {
      this.setState({
        showSiteDropdown: true
      });
    }
  }

  handleSiteChange = (selectedSite) => 
  {
    console.log("Selected Site:", selectedSite);
    // Keep the actual selected value, including "All Locations"
    this.setState({ selectedSiteICLocation: selectedSite, showSiteDropdown: false}, async () => {
      await this.fetchSiteICDetails(this.state.fromDate, this.state.toDate);
      await this.calculateTotalPriceForDateRange();
    });
  };
  
  render() 
  {
    var {showMonthYearDropdown, filteredMonthYearOptions, updatedInvoiceData, showSiteICDropdown, selectedSiteICLocation, showSiteDropdown, filteredSiteOptions} = this.state;
    ModuleRegistry.registerModules([AllCommunityModule]);
    return (
      <>
        {this.props.reportType === "Monthly Report" && (
          <>
            {/* Title for Monthly Report */}
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Monthly Report</h1>
            <div
              id="month-year-selector1"
              name="monthYearSelector1"
              className={`dropdown-container1 ${showMonthYearDropdown ? 'open' : ''}`}
            >
              <input
                type="text"
                id="month-year-dropdown1"
                name="selectedMonthYear"
                value={this.state.selectedMonthYear}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showMonthYearDropdown')}
                placeholder={this.props.language === 'zh' ? '' : 'Click to select the month year'}
                autoComplete="off"
              />
              {showMonthYearDropdown && (
                <ul className="dropdown-list1">
                  {filteredMonthYearOptions.map((monthYear, index) => (
                    <li
                      key={index}
                      onClick={() => this.handleMonthYearChange(monthYear)}
                    >
                      {monthYear}
                    </li>
                  ))}
                </ul>
              )}
            </div>
      
            {/* Only display the table and export button if a month-year is selected */}
            {this.state.showTable && (
              <>
              {console.log("This props.1:", this.props)}
                <div className='report-container'>
                  {/* Show Site IC dropdown if applicable */}
                  {this.state.showSiteICDropdown && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '10px 0' }}>
                      <label style={{ fontWeight: 'bold', minWidth: '80px' }}>
                        Select Site:
                      </label>
                      <div
                        id="site-selector"
                        name="siteSelector"
                        className={`dropdown-container1 ${showSiteDropdown ? 'open' : ''}`}
                        style={{ flex: 1, maxWidth: '300px' }}
                      >
                        <input
                          type="text"
                          id="site-dropdown"
                          name="selectedSiteICLocation"
                          value={this.state.selectedSiteICLocation}
                          onChange={this.handleChange}
                          onClick={() => this.handleDropdownToggle('showSiteDropdown')}
                          placeholder="Click to select site"
                          autoComplete="off"
                        />
                        {showSiteDropdown && (
                          <ul className="dropdown-list1">
                            {(() => {
                              // Get available site options
                              const siteICArray = Array.isArray(this.props.siteIC)
                                ? this.props.siteIC
                                : (typeof this.props.siteIC === 'string' && this.props.siteIC.includes(','))
                                  ? this.props.siteIC.split(',').map(s => s.trim()).filter(Boolean)
                                  : this.props.siteIC ? [this.props.siteIC] : [];

                              const allSiteOptions = [];
                              if (siteICArray.length > 1) {
                                allSiteOptions.push('All Locations');
                              }
                              siteICArray.forEach(loc => {
                                const trimmed = loc.split('-')[0].trim();
                                allSiteOptions.push(trimmed);
                              });

                              // Use filtered options if available, otherwise show all
                              const optionsToShow = filteredSiteOptions.length > 0 ? filteredSiteOptions : allSiteOptions;

                              return optionsToShow.map((site, idx) => (
                                <li
                                  key={idx}
                                  onClick={() => this.handleSiteChange(site)}
                                >
                                  {site}
                                </li>
                              ));
                            })()}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <p>
                    <strong>
                      Report For {this.state.selectedMonthYear}
                    </strong>
                  </p>
                  <p>
                    <strong>
                      Status : {this.state.status}
                    </strong>
                  </p>
                  <p>
                    <strong>
                      Total : ${this.state.totalPrice}
                    </strong>
                  </p>
                </div>
      
                <div id="invoice-table-container" name="invoiceTableContainer">
                  {/* AG Grid for displaying invoices */}
                  <div
                    id="ag-grid-container"
                    name="agGridContainer"
                    className="ag-theme-alpine"
                  >
                    <AgGridReact
                      columnDefs={this.state.columnDefs}
                      rowData={this.state.updatedInvoiceData}
                      pagination={true}
                      paginationPageSize={this.state.updatedInvoiceData.length}
                      domLayout="normal"
                      onGridReady={this.onGridReady}
                    />
                  </div>
      
                  {/* Export Button */}
                  <div id="export-button-container" name="exportButtonContainer" style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      id="export-to-excel-button"
                      name="exportToExcelButton"
                      onClick={this.generateMonthlyReport}
                    >
                      Export to Excel
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      
        {this.props.reportType === "Payment Report" && (
          <>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Payment Report</h1>
            <div id="date-range-selector" name="dateRangeSelector" style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{fontWeight:"bold"}}>Date Range</p> {/* Add this line for the Date Range label */}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
                <div style={{ textAlign: 'left', width: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="from-date" style={{ display: 'block', marginBottom: '5px' }}>From</label>
                  <input
                    type="text"
                    id="from-date"
                    name="fromDate"
                    onChange={this.handleFromDateChange}
                    value={this.state.fromDate}
                    placeholder = "dd/mm/yyyy"
                    style={{ padding: '8px', fontSize: '1rem', width: '7vw',  border: '1px solid #000000', borderRadius: '4px'}}
                  />
                </div>

                <div style={{ textAlign: 'left', width: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="to-date" style={{ display: 'block', marginBottom: '5px' }}>To</label>
                  <input
                    type="text"
                    id="to-date"
                    name="toDate"
                    onChange={this.handleToDateChange}
                    value={this.state.toDate}
                    placeholder = "dd/mm/yyyy"
                    style={{ padding: '8px', fontSize: '1rem', width: '7vw',  border: '1px solid #000000', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <button className="generate-btn" onClick={() => this.generateReportButton()}>Generate</button>
                </div>
              </div>
            </div>
            {this.state.showReport && (
              <>
                <div className='report-container'>
                  {/* Show Site IC dropdown for Payment Report */}
                  {this.state.showSiteICDropdown  &&
                    this.props.siteIC !== null &&
                    this.props.siteIC !== undefined &&
                    this.props.siteIC !== "" && 
                    (Array.isArray(this.props.siteIC) && this.props.siteIC.length > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '10px 0' }}>
                      <label style={{ fontWeight: 'bold', minWidth: '80px' }}>
                        Select Site:
                      </label>
                      <div
                        id="site-selector-payment"
                        name="siteSelectorPayment"
                        className={`dropdown-container1 ${showSiteDropdown ? 'open' : ''}`}
                        style={{ flex: 1, maxWidth: '300px', marginLeft: '0px' }}
                      >
                        <input
                          type="text"
                          id="site-dropdown-payment"
                          name="selectedSiteICLocation"
                          value={this.state.selectedSiteICLocation}
                          onChange={this.handleChange}
                          onClick={() => this.handleDropdownToggle('showSiteDropdown')}
                          placeholder="Click to select site"
                          autoComplete="off"
                        />
                        {showSiteDropdown && (
                          <ul className="dropdown-list1">
                            {(() => {
                              // Get available site options
                              const siteICArray = Array.isArray(this.props.siteIC)
                                ? this.props.siteIC
                                : (typeof this.props.siteIC === 'string' && this.props.siteIC.includes(','))
                                  ? this.props.siteIC.split(',').map(s => s.trim()).filter(Boolean)
                                  : this.props.siteIC ? [this.props.siteIC] : [];

                              const allSiteOptions = [];
                              if (siteICArray.length > 1) {
                                allSiteOptions.push('All Locations');
                              }
                              siteICArray.forEach(loc => {
                                const trimmed = loc.split('-')[0].trim();
                                allSiteOptions.push(trimmed);
                              });

                              // Use filtered options if available, otherwise show all
                              const optionsToShow = filteredSiteOptions.length > 0 ? filteredSiteOptions : allSiteOptions;

                              return optionsToShow.map((site, idx) => (
                                <li
                                  key={idx}
                                  onClick={() => this.handleSiteChange(site)}
                                >
                                  {site}
                                </li>
                              ));
                            })()}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <p>
                    <strong>Report For {this.state.dateRange}</strong>
                  </p>
                  <p>
                    <strong>Status : {this.state.status}</strong>
                  </p>
                  <p style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <strong style={{ marginRight: '10px' }}>Total:</strong>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>${this.state.totalPrice} </span>
                      <span>${this.state.totalCash}   (Cash)</span>
                      <span> ${this.state.totalPayNow}   (PayNow)</span>
                    </span>
                  </p>
                </div>
                <div id="ag-grid-container" name="agGridContainer" className="ag-theme-alpine">
                  <AgGridReact
                    columnDefs={this.state.columnDefs}
                    rowData={this.state.updatedInvoiceData}
                    pagination={true}
                    paginationPageSize={this.state.updatedInvoiceData.length}  // Adjust to your preferred pagination size
                    domLayout="normal"  // Use "autoHeight" if you want dynamic height based on content
                    onGridReady={this.onGridReady}
                  />
                </div>
                 {/* Export Button */}
                 <div id="export-button-container" name="exportButtonContainer" style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                      id="export-to-excel-button"
                      name="exportToExcelButton"
                      onClick={this.generatePaymentReport}
                  >
                  Export to Excel
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {this.state.showTable && updatedInvoiceData.length === 0 && (
          <div style={{textAlign: 'center', color: 'red'}}>No data available for the selected period.</div>
        )}
      </>
      );   
    }   
}

export default ReportSection;