import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import '../../../css/sub/registrationPayment.css';
import '../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import { io } from 'socket.io-client';

// Register the community modules
ModuleRegistry.registerModules([AllCommunityModule]);

class RegistrationPaymentSection extends Component {
    constructor(props) {
      super(props);
      this.state = {
        hideMarriagePrepFields: true, // Hide Marriage Prep fields by default
        registerationDetails: [],
        isLoading: true,
        focusedInputIndex: null,
        originalData: [],
        currentPage: 1, // Add this
        entriesPerPage: 100, // Add this
        remarks: "", // Remarks for each row
        paginatedDetails: [],
        columnDefs: [], // Initialize as empty array, will be set after data loads
        rowData: [],
        expandedRowIndex: null,
        editedRowIndex: "",
        aiSearchQuery: '',
        aiSuggestions: [],
        anomalyThreshold: 0.8,
        phoneNumber: '',
        message: '',
        status: '',
        isAlertShown: false,
        selectedRows: [],
        showBulkUpdateModal: false,
        bulkUpdateStatus: '',
        bulkUpdateMethod: ''
      };
      this.tableRef = React.createRef();
      this.gridRef = React.createRef();
    }

    toggleRow = (index) => {
      this.setState((prevState) => ({
        expandedRow: prevState.expandedRow === index ? null : index,
      }));
    };  

    toggleHideMarriagePrepFields = () => {
      console.log('Toggle button clicked - current state:', this.state.hideMarriagePrepFields);
      this.setState(prevState => ({
        hideMarriagePrepFields: !prevState.hideMarriagePrepFields
      }), () => {
        console.log('State updated - new hideMarriagePrepFields value:', this.state.hideMarriagePrepFields);
        // Regenerate column definitions after state change
        const newColumnDefs = this.getColumnDefs(this.state.rowData);
        console.log('New column definitions generated, count:', newColumnDefs.length);
        this.setState({ columnDefs: newColumnDefs });
      });
    };

    handleEntriesPerPageChange = (e) => {
      this.setState({
        entriesPerPage: parseInt(e.target.value, 100),
        currentPage: 1 // Reset to the first page when changing entries per page
      });
    }

    convertToChineseDate(dateStr) {
      const monthMap = {
        January: 1, February: 2, March: 3, April: 4,
        May: 5, June: 6, July: 7, August: 8,
        September: 9, October: 10, November: 11, December: 12,
      };

      const [day, month, year] = dateStr.split(' ');
      const monthNumber = monthMap[month];

      return `${year}年${monthNumber}月${parseInt(day)}日`;
    }

    fetchCourseRegistrations = async (language) => {
      try {
        var {siteIC, role, userName} = this.props;  
        
        // Handle siteIC as either string or array for backend compatibility
        let processedSiteIC = siteIC;
        if (Array.isArray(siteIC)) {
          processedSiteIC = siteIC; // Keep as array for backend
        } else if (typeof siteIC === 'string' && siteIC.includes(',')) {
          processedSiteIC = siteIC.split(',').map(site => site.trim()); // Convert to array
        } else if (typeof siteIC === 'string') {
          processedSiteIC = siteIC; // Keep as single string
        }
        
        const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`, { purpose: 'retrieve', role, siteIC: processedSiteIC});
        const response1 = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`, { purpose: 'retrieve', role: "admin", siteIC: ""});
        
        const data = this.languageDatabase(response.data.result, language);
        const data1 = this.languageDatabase(response1.data.result, language);
        
        return {data, data1};
    
      } catch (error) {
        console.error('=== ERROR FETCHING COURSE REGISTRATIONS ===', error);
        console.error('Error details:', error.response?.data || error.message);
        return {data: [], data1: []}; // Return proper object structure
      }
    };

    languageDatabase(array, language) {
      if (!Array.isArray(array)) return [];
      
      for (let i = 0; i < array.length; i++) {
        if (language === 'en') {
          const participant = array[i].participant;
          participant.residentialStatus = participant.residentialStatus.split(' ')[0];
          participant.race = participant.race.split(' ')[0];

          if (participant.educationLevel.split(' ').length === 3) {
            participant.educationLevel = participant.educationLevel.split(' ').slice(0, 2).join(' ');
          } else {
            participant.educationLevel = participant.educationLevel.split(' ')[0];
          }

          if (participant.workStatus.split(' ').length === 3) {
            participant.workStatus = participant.workStatus.split(' ').slice(0, 2).join(' ');
          } else {
            participant.workStatus = participant.workStatus.split(' ')[0];
          }

          array[i].agreement = array[i].agreement.split(' ')[0];
        } else if (language === 'zh') {
          const participant = array[i].participant;
          participant.residentialStatus = participant.residentialStatus.split(' ')[1];
          participant.race = participant.race.split(' ')[1];

          participant.gender = (participant.gender === 'M') ? '男' : (participant.gender === 'F') ? '女' : participant.gender;

          if (participant.educationLevel.split(' ').length === 3) {
            participant.educationLevel = participant.educationLevel.split(' ')[2];
          } else {
            participant.educationLevel = participant.educationLevel.split(' ')[1];
          }

          if (participant.workStatus.split(' ').length === 3) {
            participant.workStatus = participant.workStatus.split(' ')[2];
          } else {
            participant.workStatus = participant.workStatus.split(' ')[1];
          }

          const startDate = array[i].course.courseDuration.split('-')[0].trim();
          const endDate = array[i].course.courseDuration.split('-')[1].trim();
          array[i].course.courseEngName = array[i].course.courseChiName;
        }
      }
      return array;
    }

    async componentDidMount() 
    {
      await this.fetchAndSetRegistrationData();

      // --- Live update via Socket.IO ---
      this.socket = io(
        window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : "https://ecss-backend-node.azurewebsites.net"
      );
      this.socket.on('registration', (data) => {
        console.log("Socket event received", data);
        this.fetchAndSetRegistrationData();
      });
    }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  async fetchAndSetRegistrationData() {
    // Save current scroll position and page
    const gridContainer = document.querySelector('.ag-body-viewport');
    const currentScrollTop = gridContainer ? gridContainer.scrollTop : 0;
    const currentPage = (this.gridApi && typeof this.gridApi.paginationGetCurrentPage === 'function') 
      ? this.gridApi.paginationGetCurrentPage() : 0;

    const { language, siteIC, role } = this.props;
    const { data, data1 } = await this.fetchCourseRegistrations(language);
    console.log('All Courses Registration: ', data);

    var locations = await this.getAllLocations(data);
    var types = await this.getAllTypes(data);
    var names = await this.getAllNames(data);
    var quarters = await this.getAllQuarters(data);
    this.props.passDataToParent(locations, types, names, quarters);

    await this.props.getTotalNumberofDetails(data.length);

    const inputValues = {};
    data.forEach((item, index) => {
      // Set initial status based on course type and payment method
      let initialStatus = item.status || "Pending";
      
      // If no payment method is available (empty or null) and course type is ILP or free Talks And Seminar
      if ((!item.course?.payment || item.course.payment === '') && 
          (item.course?.courseType === "ILP" || 
           (item.course?.courseType === "Talks And Seminar" && item.course?.coursePrice === 0))) {
        initialStatus = item.status || "Pending"; // Keep existing logic but ensure ILP courses can have their status
      }
      
      inputValues[index] = initialStatus;
    });

    const inputValues1 = {};
    data.forEach((item, index) => {
      inputValues1[index] = item.official.remarks;
    });

    this.setState({
      originalData: data,
      registerationDetails: data,
      isLoading: false,
      inputValues: inputValues,
      remarks: inputValues1,
      locations: locations,
      names: names,
    }, async () => {
      console.log("Initial data loaded, originalData length:", data?.length || 0);
      await this.getRowData(data);

      // Apply initial filtering if any filters are already set
      console.log("Applying initial filtering");
      this.filterRegistrationDetails();

      // Restore scroll position and page after data is set
      if (gridContainer) {
        gridContainer.scrollTop = currentScrollTop;
      }
      if (this.gridApi && typeof this.gridApi.paginationGoToPage === 'function') {
        try {
          this.gridApi.paginationGoToPage(currentPage);
        } catch (error) {
          console.warn("Error setting pagination page:", error);
        }
      }

      if (!this.state.isAlertShown) {
        await this.anomalitiesAlert(data);
        this.setState({ isAlertShown: true });
      }
      this.props.closePopup();
    });
  }

    getAnomalyRowStyles = (data) => {
      const styles = {};
      const seen = [];
    
      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        const name = item.participantInfo.name;
        const courseName = item.courseInfo.courseEngName;
        const location = item.courseInfo.courseLocation;
    
        for (let i = 0; i < index; i++) {
          const prev = data[i];
    
          // Check for anomalies where the same person is registered for the same course but at different locations
          if (
            prev.participantInfo.name === name &&
            prev.courseInfo.courseEngName === courseName &&
            prev.courseInfo.courseLocation !== location
          ) {
            styles[index] = { backgroundColor: '#FFDDC1' };
            styles[i] = { backgroundColor: '#FFDDC1' };
    
            // Alert with the anomaly details (name, course name, and locations)
            //alert(`Anomaly detected! Name: ${name}, Course: ${courseName}, Locations: ${prev.courseInfo.courseLocation} and ${location}`);
          }
          else if (
            prev.participantInfo.name === name &&
            prev.courseInfo.courseEngName === courseName &&
            prev.courseInfo.courseLocation === location
          ) {
            styles[index] = { backgroundColor: '	#87CEEB' };
            styles[i] = { backgroundColor: '	#87CEEB' };
    
            // Alert with the anomaly details (name, course name, and locations)
            //alert(`Anomaly detected! Name: ${name}, Course: ${courseName}, Locations: ${prev.courseInfo.courseLocation} and ${location}`);
          }
        }
      }
    
      return styles;
    };

    anomalitiesAlert = (data) => {
      const anomalies = []; // Collect anomalies
            
      // Loop through your data to find anomalies and collect them
      for (let index = 0; index < data.length; index++) {
        const item = data[index];
        const name = item.participant.name;
        const courseName = item.course.courseEngName;
        const location = item.course.courseLocation;
              
        for (let i = 0; i < index; i++) {
          const prev = data[i];
                  
          if (
            prev.participant.name === name &&
            prev.course.courseEngName === courseName &&
            prev.course.courseLocation !== location
          ) {
            anomalies.push({
              originalIndex: index+1,
              name: name,
              course: courseName,
              locations: `${prev.course.courseLocation} (index: ${i+1}) and ${location} (index: ${index+1})`,
              type: "Person registered same course in different locations"
            });
          }
          else if(
            prev.participant.name === name &&
            prev.course.courseEngName === courseName &&
            prev.course.courseLocation === location
          ) {
            anomalies.push({
              originalIndex: index+1,
              name: name,
              course: courseName,
              locations: `${prev.course.courseLocation} (index: ${i+1}) and ${location} (index: ${index+1})`,
              type: "Person registered same course in same location"
            });
          }
        }
      }
            
      // Show alert only once with unique anomalies
      if (anomalies.length > 0) {
        // Remove duplicates based on a unique identifier
        const seen = new Set();
        const uniqueAnomalies = anomalies.filter(item => {
          const key = `${item.name}-${item.course}-${item.locations}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        // Create a pre-formatted string with sequential S/N
        let alertMessage = "Anomalies detected:\n\n";
        uniqueAnomalies.forEach((anomaly, index) => {
          alertMessage += `S/N: ${index+1}\n`;
          alertMessage += `Name: ${anomaly.name}, `;
          alertMessage += `Course: ${anomaly.course}\n`;
          alertMessage += `Locations: ${anomaly.locations}\n`;
          alertMessage += `Anomaly Type: ${anomaly.type}\n\n`;
        });
        
        alert(alertMessage);
      }
    };
    updateRowData(paginatedDetails) {
     // this.props.onResetSearch();
      // Update the state with the newly formatted rowData
      //console.log("Row Datawe:", paginatedDetails);
      this.setState({registerationDetails: paginatedDetails});
    }

    decodeHtmlEntities(text) 
    {
      const parser = new DOMParser();
      const decodedString = parser.parseFromString(`<!doctype html><body>${text}`, "text/html").body.textContent;
      return decodedString;
    }
    
          
    updateWooCommerceForRegistrationPayment = async (chi, eng, location, updatedStatus) => {
      console.log("Updated Status:", updatedStatus); 
      try {
        // Check if the value is "Paid" or "Generate SkillsFuture Invoice"
        if (updatedStatus === "Paid" || updatedStatus === "SkillsFuture Done" || updatedStatus === "Cancelled" || updatedStatus === "Withdrawn" || updatedStatus === "Confirmed") {
          // Proceed to update WooCommerce stock
          const stockResponse = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/update_stock/`, { type: 'update', page: { "courseChiName": chi, "courseEngName": eng, "courseLocation": location }, status: updatedStatus, location: location });

          console.log("WooCommerce stock update response:", stockResponse.data);
        
          // If WooCommerce stock update is successful, generate receipt
          if (stockResponse.data.success === true) {
            console.log("Stock updated successfully.");
            // Call the function to generate receipt or perform other action
          } else {
            console.error("Error updating WooCommerce stock:", stockResponse.data);
          }
        } else {
          console.log("No update needed for the given status.");
        }
      } catch (error) {
        console.error("Error during the update process:", error);
      }
    };

    // Method to get all locations
    getAllLocations = async (datas) => {
      return [...new Set(datas.map(data => {
        //console.log(data.course)
        return data.course.courseLocation;
      }))];
    }

    getAllQuarters = async (datas) => {
      const quarters = datas.map(data => {
        if (!data?.course?.courseDuration) return null; // Handle missing data
    
        const firstDate = data.course.courseDuration.split(' - ')[0]; // Extract "2 May 2025"
        const [day, monthStr, year] = firstDate.split(' '); // Split into components
    
        // Convert month string to a number
        const monthMap = {
          "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
          "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
        };
    
        const month = monthMap[monthStr];
        if (!month || !year) return null; // Skip if month or year is missing
    
        // Determine the quarter
        let quarter = "";
        if (month >= 1 && month <= 3) quarter = `Q1 ${year}`;
        if (month >= 4 && month <= 6) quarter = `Q2 ${year}`;
        if (month >= 7 && month <= 9) quarter = `Q3 ${year}`;
        if (month >= 10 && month <= 12) quarter = `Q4 ${year}`;
    
        return quarter;
      });
    
      // Remove null values and sort chronologically
      return [...new Set(quarters.filter(Boolean))].sort((a, b) => {
        const [qA, yearA] = a.split(" ");
        const [qB, yearB] = b.split(" ");
        return yearA - yearB || qA.localeCompare(qB); // Sort by year first, then by quarter
      });
    };      

      // Method to get all locations
      getAllTypes = async (datas) => {
        return [...new Set(datas.map(data => data.course.courseType))];
      }
  
      // Method to get all languages
      getAllNames = async (datas) => {
         return [...new Set(datas.map(data => {
          console.log("Course Name:", data.course.courseEngName); 
          return data.course.courseEngName;
        }))];
      }

      generateReceiptNumber = async (course, newMethod, courseType, courseEngName, courseDuration) => 
      {
        const courseLocation = newMethod === "SkillsFuture" ? "ECSS/SFC/" : course.courseLocation;
        console.log("Course Location123:", courseLocation);
        const centreLocation = course.courseLocation;
        console.log("Centre Location123:", centreLocation);
        try {
          //console.log("Fetching receipt number for location:", courseLocation);
          const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/receipt`, { purpose: "getReceiptNo", courseLocation, centreLocation, courseType, courseEngName, courseDuration });
          console.log("Response from receipt number API:", response);
    
          if (response?.data?.result?.success) {
            console.log("Fetched receipt number:", response.data.result.receiptNumber);
            return response.data.result.receiptNumber;
          } else {
            throw new Error("Failed to fetch receipt number from response");
          }
        } catch (error) {
          console.error("Error fetching receipt number:", error);
          throw error;
        }
      };

      generatePDFReceipt = async (id, participant, course, receiptNo, status) => {
        try {
          const pdfResponse = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`, { purpose: "addReceiptNumber", id, participant, course, staff: this.props.userName, receiptNo, status });
          console.log("generatePDFReceipt:", pdfResponse);
          return pdfResponse;
        } catch (error) {
          console.error("Error generating PDF receipt:", error);
          throw error;
        }
      };


      receiptShown = async (participant, course, receiptNo, officialInfo) => {
        try {
          // Define the purpose based on payment type
          let purpose = course.payment === "Cash" || course.payment === "PayNow" ? "receipt" : "invoice";
      
          // Send request to backend to generate PDF
          const pdfResponse = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
            {
              purpose,
              participant,
              course,
              staff: this.props.userName,
              receiptNo,
              officialInfo
            },
            { responseType: "blob" }
          );

          console.log("PDF Response:", pdfResponse);  // Debugging
      
          // Dynamically generate filename based on participant name, payment type, and receipt number
          const filename = `${participant.name}-${course.payment}-${receiptNo}.pdf`;
          console.log("Generated Filename:", filename);  // Debugging
      
          // Create a Blob from the PDF data
          const blob = new Blob([pdfResponse.data], { type: "application/pdf" });
      
          // Create a Blob URL
          const blobUrl = window.URL.createObjectURL(blob);
      
          // Open the PDF in a new tab for viewing
          const pdfWindow = window.open(blobUrl, "_blank");
      
          // Fallback if popups are blocked
          if (!pdfWindow) {
            alert("Please allow popups to view the PDF receipt.");
          }
      
          // Create a temporary <a> element to trigger the download
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;  // Set the filename for download
          a.click();  // Programmatically click to download the PDF
      
          // Clean up by revoking the Blob URL after download is triggered
          window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.error("Error generating PDF receipt:", error);
        }
      };      

      async getNextReceiptNumber(databaseName, collectionName, courseLocation, centreLocation) {
        const db = this.client.db(databaseName);
        const collection = db.collection(collectionName);
        console.log("Centre:", centreLocation);
    
        // Get the current two-digit year
        const currentYear = new Date().getFullYear().toString().slice(-2);
    
        // Retrieve all receipts matching the specified courseLocation
        const existingReceipts = await collection.find({
            receiptNo: { $regex: `^${courseLocation}` } // Match all receipts starting with courseLocation
        }).toArray();
    
        console.log("Existing receipts:", existingReceipts);
    
        // Filter receipts to determine if a reset is needed for ECSS/SFC
        const validReceipts = existingReceipts.filter(receipt => {
            if (courseLocation === "ECSS/SFC/") {
                // Match receipts for the current year
                const regex = new RegExp(`^${courseLocation}\\d+/(${currentYear})$`);
                return regex.test(receipt.receiptNo);
            }
            return true; // For other prefixes, year isn't relevant
        });
    
        // Separate out receipts for "CT Hub"
        const cthubReceipts = validReceipts.filter(receipt => receipt.location === "CT Hub");
    
        // Get the highest receipt number for CT Hub (if any)
        const cthubReceiptNumbers = cthubReceipts.map(receipt => {
            if (courseLocation === "ECSS/SFC/") {
                // Match format: ECSS/SFC/037/2024
                const regex = new RegExp(`^${courseLocation}(\\d+)/\\d+$`);
                const match = receipt.receiptNo.match(regex);
                return match ? parseInt(match[1], 10) : null;
            } else {
                // Match format: XXX - 0001
                const regex = new RegExp(`^${courseLocation} - (\\d+)$`);
                const match = receipt.receiptNo.match(regex);
                return match ? parseInt(match[1], 10) : null;
            }
        }).filter(num => num !== null);
    
        const maxCthubNumber = cthubReceiptNumbers.length > 0 ? Math.max(...cthubReceiptNumbers) : 0;
    
        // Separate out receipts for other locations
        const otherReceipts = validReceipts.filter(receipt => receipt.location !== "CT Hub");
    
        // Get the highest receipt number for other locations
        const otherReceiptNumbers = otherReceipts.map(receipt => {
            if (courseLocation === "ECSS/SFC/") {
                // Match format: ECSS/SFC/037/2024
                const regex = new RegExp(`^${courseLocation}(\\d+)/\\d+$`);
                const match = receipt.receiptNo.match(regex);
                return match ? parseInt(match[1], 10) : null;
            } else {
                // Match format: XXX - 0001
                const regex = new RegExp(`^${courseLocation} - (\\d+)$`);
                const match = receipt.receiptNo.match(regex);
                return match ? parseInt(match[1], 10) : null;
            }
        }).filter(num => num !== null);

        const maxOtherNumber = otherReceiptNumbers.length > 0 ? Math.max(...otherReceiptNumbers) : 0;
    
        // Now, determine the next receipt number
        if (currentYear === "25") {
            // If the current year is 25, and the centre is "CT Hub"
            if (centreLocation === "CT Hub") {
                const nextNumber = maxCthubNumber > 0 ? maxCthubNumber + 1 : 109; // Start from 109 if no CT Hub receipts exist
                return courseLocation === "ECSS/SFC/"
                    ? `${courseLocation}${String(nextNumber).padStart(3, '0')}/${currentYear}`
                    : `${courseLocation} - ${String(nextNumber).padStart(4, '0')}`;
            } else {
                // For other centres, continue from the highest number for other locations
                const nextNumber = maxOtherNumber > 0 ? maxOtherNumber + 1 : 1; // Start from 1 if no other receipts exist
                return courseLocation === "ECSS/SFC/"
                    ? `${courseLocation}${String(nextNumber).padStart(3, '0')}/${currentYear}`
                    : `${courseLocation} - ${String(nextNumber).padStart(4, '0')}`;
            }
        } else {
            // For other years, reset numbers
            if (centreLocation === "CT Hub") {
                const nextNumber = maxCthubNumber > 0 ? maxCthubNumber + 1 : 109; // Start from 109 if no CT Hub receipts exist
                return courseLocation === "ECSS/SFC/"
                    ? `${courseLocation}${String(nextNumber).padStart(3, '0')}/${currentYear}`
                    : `${courseLocation} - ${String(nextNumber).padStart(4, '0')}`;
            } else {
                const nextNumber = maxOtherNumber > 0 ? maxOtherNumber + 1 : 1; // Start from 1 if no other receipts exist
                return courseLocation === "ECSS/SFC/"
                    ? `${courseLocation}${String(nextNumber).padStart(3, '0')}/${currentYear}`
                    : `${courseLocation} - ${String(nextNumber).padStart(4, '0')}`;
            }
        }
    }

    generatePDFInvoice = async (id, participant, course, receiptNo, status) => 
    {
      try {
        const pdfResponse = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
          { purpose: "addInvoiceNumber", id, participant, course, staff: this.props.userName, receiptNo, status }
        );        
        return pdfResponse;
      } catch (error) {
        console.error("Error generating PDF receipt:", error);
        throw error;
      }
    };
  
    // Helper to send WhatsApp message
  generatedWhatsappMessage = async (participantInfo, courseInfo, template, purpose) => {
    try {
      console.log("Sending WhatsApp message with template", participantInfo, courseInfo, template, purpose);
      const payload = {
        phoneNumber: participantInfo.contactNumber,
        name: participantInfo.name,
        course: courseInfo.courseEngName,
        location: courseInfo.courseLocation,
        date: courseInfo.courseDuration.split(' - ')[0],
        template,
        purpose
      };
      await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/whatsapp`,
        payload
      );
      console.log("WhatsApp message sent successfully");
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error?.response?.data || error.message);
    }
  }

    createReceiptInDatabase = async (receiptNo, location, registration_id, url) => {
      try {
        console.log("Creating receipt in database:", {
          receiptNo,
          registration_id,
          url,
        });
  
        const receiptCreationResponse = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/receipt`,
          {
            purpose: "createReceipt",
            receiptNo,
            location, 
            registration_id,
            url,
            staff: this.props.userName,
          }
        );        
  
        console.log("Receipt creation response:", receiptCreationResponse.data);
      } catch (error) {
        console.error("Error creating receipt in database:", error);
        throw error;
      }
    };
    

    receiptGenerator = async (id, participant, course, official, value) => {
        console.log("Selected Parameters:", { course, official, value });
    
        if (value === "Paid") 
        {
          if (course.payment === "Cash" || course.payment === "PayNow") 
          {
            try 
            {
              if(course.courseType === "Marriage Preparation Programme")
              {
                console.log(`${value} For This Course123:`, course);
        
                //const registration_id = id;
                const receiptNo = await this.generateReceiptNumber(course, course.payment, course.courseType, course.courseEngName, course.courseDuration);
                console.log("Receipt N11o:", receiptNo);
                await this.generatePDFReceipt(id, participant, course, receiptNo, value);
                await this.createReceiptInDatabase(receiptNo, course.courseLocation, id, "");
              }
              else
              {
                console.log(`${value} For This Course:`, course);
        
                //const registration_id = id;
                const receiptNo = await this.generateReceiptNumber(course, course.payment, "", "", "");
                console.log("Receipt N11o:", receiptNo);
                await this.generatePDFReceipt(id, participant, course, receiptNo, value);
                await this.createReceiptInDatabase(receiptNo, course.courseLocation, id, "");  
              }
            }
            catch (error) 
            {
              console.error("Error during receipt generation:", error);
            }
          }
        } 
        else if (value === "Generating SkillsFuture Invoice") {
            try {
              console.log("Generating SkillsFuture invoice for course:", course);
              const invoiceNo = await this.generateReceiptNumber(course, "", "", "", "");
              console.log("Invoice No:", invoiceNo);
              await this.generatePDFInvoice(id, participant, course, invoiceNo, value);  
              await this.createReceiptInDatabase(invoiceNo, course.courseLocation, id, ""); 
            } catch (error) {
              console.error("Error during SkillsFuture invoice generation:", error);
            }
        }
      };

      //this.autoReceiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue, "Paid")
      autoReceiptGenerator = async (id, participant, course, official, newMethod, value) => {
        console.log("Selected Parameters:", { course, official, newMethod, value });
    
        if (newMethod === "Cash" || newMethod === "PayNow") 
        {
          if (value === "Paid") 
          {
            try 
            {
              if(course.courseType === "Marriage Preparation Programme")
              {
                 console.log(`${value} For This Course12345:`, course);
        
                //const registration_id = id;
                const receiptNo = await this.generateReceiptNumber(course, newMethod, course.courseType, course.courseEngName, course.courseDuration);
                console.log("Receipt N111o:", receiptNo);
                await this.generatePDFReceipt(id, participant, course, receiptNo, value);
                await this.createReceiptInDatabase(receiptNo, course.courseLocation, id, "");  
              }
              else
              {
                console.log(`${value} For This Course:`, course);
        
                //const registration_id = id;
                const receiptNo = await this.generateReceiptNumber(course, newMethod, "", "", "");
                console.log("Receipt N11o:", receiptNo);
                await this.generatePDFReceipt(id, participant, course, receiptNo, value);
                await this.createReceiptInDatabase(receiptNo, course.courseLocation, id, "");  
              }
            } 
            catch (error) 
            {
              console.error("Error during receipt generation:", error);
            }
          }
        } 
        else if(newMethod === "SkillsFuture")
        {
          try 
          {
            console.log("Generating receipt for course:", course);
    
            const registration_id = id;
            const invoiceNo = await this.generateReceiptNumber(course, newMethod, "", "", "");
            console.log("Invoice No:", invoiceNo);
            await this.generatePDFReceipt(id, participant, course, invoiceNo, value);
            await this.createReceiptInDatabase(invoiceNo, course.courseLocation, id, "");    
          } 
          catch (error) 
          {
            console.error("Error during receipt generation:", error);
          }
        }
      };
      
      
    /*async saveData(paginatedDetails) {
        console.log("Save Data:", paginatedDetails);
    
        // Prepare the data for Excel
        const preparedData = [];

        // Define the sub-headers
        const headers = [
          "S/N", "Participant Name", "Participant NRIC", "Participant Residential Status", 
          "Participant Race", "Participant Gender", "Participant Date of Birth",
          "Participant Contact Number", "Participant Email", "Participant Postal Code", 
          "Participant Education Level", "Participant Work Status",
          "Course Type", "Course English Name", "Course Chinese Name", "Course Location",
          "Course Mode", "Course Price", "Course Duration", "Payment", 
          "Registration Date", "Agreement", "Payment Status", "Confirmation Status", 
          "Refunded Date", "WhatsApp Message Sent",
          "Staff Name", "Received Date", "Received Time", "Receipt/Invoice Number", "Remarks"
      ];
    
        preparedData.push(headers);
    
        // Add the values
        paginatedDetails.forEach((index, detail) => {
            const row = [
                index + 1,
                detail.participantInfo.name,
                detail.participantInfo.nric,
                detail.participantInfo.residentialStatus,
                detail.participantInfo.race,
                detail.participantInfo.gender,
                detail.participantInfo.dateOfBirth,
                detail.participantInfo.contactNumber,
                detail.participantInfo.email,
                detail.participantInfo.postalCode,
                detail.participantInfo.educationLevel,
                detail.participantInfo.workStatus,
                detail.courseInfo.courseType,
                detail.courseInfo.courseEngName,
                detail.courseInfo.courseChiName,
                detail.courseInfo.courseLocation,
                detail.course.courseMode,
                detail.courseInfo.coursePrice,
                detail.courseInfo.courseDuration,
                detail.registrationDate,
                detail.courseInfo.payment,
                detail.agreement,
                detail.status,
                detail.registrationDate,
                detail.officialInfo?.refundedDate,
                detail.sendingWhatsappMessage,
                detail.officialInfo?.name,
                detail.officialInfo?.date,
                detail.officialInfo?.time,
                detail.officialInfo?.receiptNo,
                detail.officialInfo?.remarks
            ];
            preparedData.push(row);
        });
    
        // Convert the prepared data into a worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(preparedData);
    
        // Create a new workbook and add the worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Exported Data");

        // Prompt user for filename input
        var date = new Date();
        const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
        const fileName = `exported data ${formattedDate}`;
    
        // Generate a binary string
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
        // Create a blob from the binary string
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
    
        // Create a link element for downloading
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${fileName}.xlsx`; // Specify the file name with .xlsx extension
        link.click(); // Trigger the download
    }*/

    convertDateFormat1(dateString) {
      const months = {
        January: '01',
        February: '02',
        Feburary: '02',
        March: '03',
        April: '04',
        May: '05',
        June: '06',
        July: '07',
        August: '08',
        September: '09',
        October: '10',
        November: '11',
        December: '12'
      };
    
      // Regular expression to match the input format
      const regex = /^(\d{1,2})\s([A-Za-z]+)\s(\d{4})$/;
    
      // Test the input against the regex
      const match = dateString.trim().match(regex);
    
      if (!match) {
        console.error('Invalid date format:', dateString);
        return 'Invalid date format';
      }
    
      // Extract day, month, and year from the regex groups
      const [, day, month, year] = match;
    
      // Validate the month
      const monthNumber = months[month];
      if (!monthNumber) {
        console.error('Invalid month name:', month);
        return 'Invalid date format';
      }
    
      // Return the formatted date
      return `${day.padStart(2, '0')}/${monthNumber}/${year}`;
    }
    

    handleEdit = async(item, index) =>
    {
      console.log("Handle Edit:", item);
      this.props.showEditPopup(item)
    }

    convertDateFormat(dateString) {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0'); // Ensure two-digit day
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (0-based index)
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    }

    convertDateFormat3(dateString) {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0'); // Ensure two-digit day
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure two-digit month (0-based index)
      const year = date.getFullYear();
      
      return `${day}${month}${year}`;
    }

    exportToLOP = async () => {
      try {
        const { selectedRows } = this.state;
        if (!selectedRows.length) {
          return this.props.warningPopUpMessage("No rows selected. Please select rows to export.");
        }
    
        // Determine file and format by courseType of the first selected row
        const firstType = selectedRows[0]?.courseInfo?.courseType;
        let filePath, outputFileName;
        if (firstType === "ILP") {
          const [startDate, endDate] = selectedRows[0].courseInfo.courseDuration.split(" - ");
          filePath = '/external/OSG ILP List of participants (20250401).xlsx';
          //outputFileName = `OSG ILP List of participants (20250401) as of ${this.getCurrentDateTime()}.xlsx`;
          outputFileName = `OSG ILP List of participants (20250401) as of ${this.convertDateFormat3(startDate)}.xlsx`;
        } else {
          filePath = '/external/OSG NSA List of participants (20250401).xlsx';
          outputFileName = `OSG NSA List of participants (20250401) as of ${this.getCurrentDateTime()}.xlsx`;
        }
    
        // Fetch the Excel file
        const response = await fetch(filePath);
        if (!response.ok) {
          return this.props.warningPopUpMessage("Error fetching the Excel file.");
        }
    
        const data = await response.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
    
        const sourceSheet = workbook.getWorksheet('LOP');
        if (!sourceSheet) {
          return this.props.warningPopUpMessage("Sheet 'LOP' not found!");
        }
    
        const originalRow = sourceSheet.getRow(9); // Row 9 is the template row to copy
        const startRow = 9;

        console.log("Selected Rows:", selectedRows);
    
        // Filter to only include rows with specific payment statuses
        const filteredRows = selectedRows.filter(row => {
          const paymentStatus = row.paymentStatus;
          if (firstType === "NSA") {
            return paymentStatus === "Paid" || paymentStatus === "SkillsFuture Done";
          } else {
            return paymentStatus === "Confirmed";
          }
        });
        // Sort participants alphabetically
        filteredRows.sort((a, b) => {
          const nameA = a.participantInfo.name.trim().toLowerCase();
          const nameB = b.participantInfo.name.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });
    
        filteredRows.forEach((detail, index) => {
          const rowIndex = startRow + index;
          const newDataRow = sourceSheet.getRow(rowIndex);
          newDataRow.height = originalRow.height;
    
          if (firstType === "NSA") {
            // --- NSA FORMAT (keep your existing logic) ---
            sourceSheet.getCell(`A${rowIndex}`).value = index + 1; // Start from 1 for filtered results
            sourceSheet.getCell(`B${rowIndex}`).value = detail.participantInfo.name;
            sourceSheet.getCell(`C${rowIndex}`).value = detail.participantInfo.nric;
            sourceSheet.getCell(`D${rowIndex}`).value = detail.participantInfo.residentialStatus.substring(0, 2);
    
            const dob = detail?.participantInfo?.dateOfBirth;
            if (dob) {
              const [day, month, year] = dob.split("/");
              sourceSheet.getCell(`E${rowIndex}`).value = day?.trim();
              sourceSheet.getCell(`F${rowIndex}`).value = month?.trim();
              sourceSheet.getCell(`G${rowIndex}`).value = year?.trim();
            }
    
            sourceSheet.getCell(`H${rowIndex}`).value = detail.participantInfo.gender.split(" ")[0];
            sourceSheet.getCell(`I${rowIndex}`).value = detail.participantInfo.race.split(" ")[0][0];
            sourceSheet.getCell(`J${rowIndex}`).value = detail.participantInfo.contactNumber;
            sourceSheet.getCell(`K${rowIndex}`).value = detail.participantInfo.email;
            sourceSheet.getCell(`L${rowIndex}`).value = detail.participantInfo.postalCode;
    
            //const educationParts = detail.participantInfo.educationLevel.split(" ");
            let educationValue = detail.participantInfo.educationLevel
            .replace(/[\u4e00-\u9fa5]+/g, '') // Remove Chinese characters
            .replace(/No Formal Education.*/, 'No formal education')
            .replace(/Primary.*/, 'Primary')
            .replace(/Secondary.*/, 'Secondary')
            .replace(/Post-Secondary.*|Post Secondary.*/, 'Post Secondary')
            .replace(/Diploma.*/, 'Diploma')
            .replace(/Bachelor'?s Degree.*/, "Bachelor’s Degree")
            .replace(/Master'?s Degree.*/, "Masters/Doctorate")
            .replace(/Masters.*/, "Masters/Doctorate")
            .replace(/Others?.*/, "Others")
            .trim();
           // let educationValue = educationParts.length === 3 ? educationParts[0] + " " + educationParts[1] : educationParts[0];
            //if (educationValue === "Master's Degree") educationValue = "Masters/Doctorate";
            sourceSheet.getCell(`M${rowIndex}`).value = educationValue;
    
            const workParts = detail.participantInfo.workStatus.split(" ");
            sourceSheet.getCell(`N${rowIndex}`).value = workParts.length === 3 ? workParts[0] + " " + workParts[1] : workParts[0];
    
            let courseEngName = detail.courseInfo.courseEngName;
            let courseChiName = detail.courseInfo.courseChiName;
            let courseCode = this.ecssChineseCourseCode(courseChiName) || this.ecssEnglishCourseCode(courseEngName);
            sourceSheet.getCell(`O${rowIndex}`).value = courseCode.trim();
            let courseName = courseChiName || courseEngName;
            let languages = courseName.split("–").pop().trim();
            if (!((languages === "English") || (languages === "Mandarin"))) {
              sourceSheet.getCell(`P${rowIndex}`).value = courseName.trim();
            } else {
              sourceSheet.getCell(`P${rowIndex}`).value = courseName.split("–")[0].trim();
            }
            sourceSheet.getCell(`Q${rowIndex}`).value = `$${(parseFloat(detail.courseInfo.coursePrice.replace('$', ''))*5).toFixed(2)}`;
            sourceSheet.getCell(`R${rowIndex}`).value = `$${(parseFloat(detail.courseInfo.coursePrice.replace('$', ''))*4).toFixed(2)}`;
            const [startDate, endDate] = detail.courseInfo.courseDuration.split(" - ");
            sourceSheet.getCell(`S${rowIndex}`).value = this.convertDateFormat1(startDate);
            sourceSheet.getCell(`T${rowIndex}`).value = this.convertDateFormat1(endDate);
            sourceSheet.getCell(`U${rowIndex}`).value = detail.courseInfo.courseMode === "Face-to-Face" ? "F2F" : detail.courseInfo.courseMode;
    
            sourceSheet.getCell(`W${rowIndex}`).value = detail.courseInfo.coursePrice;
            sourceSheet.getCell(`X${rowIndex}`).value = detail.courseInfo.payment === "SkillsFuture" ? "SFC" : detail.courseInfo.payment;
            sourceSheet.getCell(`AD${rowIndex}`).value = detail.officialInfo.receiptNo;
            sourceSheet.getCell(`V${rowIndex}`).value = detail.courseInfo.courseLocation === "Pasir Ris West Wellness Centre" ? "510605," : "";
    
            // Copy styles from the original row
            originalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              const newCell = newDataRow.getCell(colNumber);
              newCell.style = cell.style;
            });
          } else if (firstType === "ILP") {
            // --- ILP FORMAT (customize as needed) ---
            // Example: Only fill in a few columns, adjust as per your ILP template
            sourceSheet.getCell(`A${rowIndex}`).value = rowIndex - startRow + 1;
            sourceSheet.getCell(`B${rowIndex}`).value = detail.participantInfo.name;
            sourceSheet.getCell(`C${rowIndex}`).value = detail.participantInfo.nric;
            sourceSheet.getCell(`D${rowIndex}`).value = detail.participantInfo.residentialStatus.substring(0, 2);
    
            const dob = detail?.participantInfo?.dateOfBirth;
            if (dob) {
              const [day, month, year] = dob.split("/");
              sourceSheet.getCell(`E${rowIndex}`).value = year?.trim();
            }
    
            sourceSheet.getCell(`F${rowIndex}`).value = detail.participantInfo.gender.split(" ")[0];
            sourceSheet.getCell(`G${rowIndex}`).value = detail.participantInfo.race.split(" ")[0][0];
            sourceSheet.getCell(`H${rowIndex}`).value = detail.participantInfo.contactNumber;
            sourceSheet.getCell(`I${rowIndex}`).value = detail.participantInfo.email;
            let educationValue = detail.participantInfo.educationLevel
            .replace(/[\u4e00-\u9fa5]+/g, '') // Remove Chinese characters
            .replace(/No Formal Education.*/, 'No formal education')
            .replace(/Primary.*/, 'Primary')
            .replace(/Secondary.*/, 'Secondary')
            .replace(/Post-Secondary.*|Post Secondary.*/, 'Post Secondary')
            .replace(/Diploma.*/, 'Diploma')
            .replace(/Bachelor'?s Degree.*/, "Bachelor’s Degree")
            .replace(/Master'?s Degree.*/, "Masters/Doctorate")
            .replace(/Masters.*/, "Masters/Doctorate")
            .replace(/Others?.*/, "Others")
            .trim();
            sourceSheet.getCell(`J${rowIndex}`).value = educationValue;
            /*const educationParts = detail.participantInfo.educationLevel.split(" ");
            let educationValue = educationParts.length === 3 ? educationParts[0] + " " + educationParts[1] : educationParts[0];
            if (educationValue === "Master's Degree") educationValue = "Masters/Doctorate";
            sourceSheet.getCell(`J${rowIndex}`).value = educationValue;*/

            // ILP-specific: Course code and name
            let courseEngName = detail.courseInfo.courseEngName;
            sourceSheet.getCell(`K${rowIndex}`).value = courseEngName;

            // ILP-specific: Hide columns not needed
            sourceSheet.getCell(`L${rowIndex}`).value = "";
            const [startDate, endDate] = detail.courseInfo.courseDuration.split(" - ");
            sourceSheet.getCell(`M${rowIndex}`).value = this.convertDateFormat1(startDate);
            sourceSheet.getCell(`N${rowIndex}`).value = this.convertDateFormat1(endDate);

            sourceSheet.getCell(`O${rowIndex}`).value = detail.courseInfo.courseMode === "Face-to-Face" ? "F2F" : detail.courseInfo.courseMode;
    
            // Copy styles from the original row
            originalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              const newCell = newDataRow.getCell(colNumber);
              newCell.style = cell.style;
            });
          }
        });
    
        // Total calculation (NSA only, skip for ILP if not needed)
        if (firstType === "NSA") {
          let total = filteredRows.reduce((sum, item) => {
            let priceStr = item?.courseInfo?.coursePrice || "$0";
            let numeric = parseFloat(priceStr.replace('$', ''));
            return sum + (isNaN(numeric) ? 0 : numeric);
          }, 0);
          let formattedTotal = `$${total.toFixed(2)}`;
          sourceSheet.getCell(`R5`).value = formattedTotal;
        }
    
        // Save and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, outputFileName);
      } catch (error) {
        console.error("Error exporting LOP:", error);
        this.props.warningPopUpMessage("An error occurred during export.");
      }
    };

    convertDateToYYYYMMDD = (dateString) => 
    {
      if (!dateString) return '';
      
      try {
        // Split the dd/mm/yyyy format
        const [day, month, year] = dateString.split('/');
        
        // Validate the parts exist
        if (!day || !month || !year) return dateString;
        
        // Return in yyyy/mm/dd format
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } catch (error) {
        console.error('Error converting date format:', error);
        return dateString; // Return original if conversion fails
      }
  };

  exportToMarriagePreparationProgramme = async () => {
    try {
      const { selectedRows } = this.state;
      if (!selectedRows.length) {
        return this.props.warningPopUpMessage("No rows selected. Please select rows to export.");
      }
  
      let filePath, outputFileName;
      const firstType = selectedRows[0]?.courseInfo?.courseType;
      
      if (firstType === "Marriage Preparation Programme") {
        filePath = '/external/default-template-Marriage_Preparation_Programme.xlsx';
        outputFileName = `default-template-Marriage_Preparation_Programme as of ${this.getCurrentDateTime()}.xlsx`;
      }
    
      // Fetch the Excel file
      const response = await fetch(filePath);
      if (!response.ok) {
        return this.props.warningPopUpMessage("Error fetching the Excel file.");
      }
  
      const data = await response.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
  
      const sourceSheet = workbook.getWorksheet('Template');
      if (!sourceSheet) {
        return this.props.warningPopUpMessage("Sheet 'Template' not found!");
      }
  
      const originalRow = sourceSheet.getRow(4); // Row 4 is the template row to copy
      const startRow = 4;
  
      console.log("Selected Rows:", selectedRows);
  
      // Filter to only include rows with specific payment statuses
      const filteredRows = selectedRows.filter(row => {
        const paymentStatus = row.paymentStatus;
        if (firstType === "Marriage Preparation Programme") {
          return paymentStatus === "Paid";
        }
      });
  
      // Sort participants alphabetically
      filteredRows.sort((a, b) => {
        const nameA = a.participantInfo.name.trim().toLowerCase();
        const nameB = b.participantInfo.name.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  
      filteredRows.forEach((detail, index) => {
        const rowIndex = startRow + index;
        const newDataRow = sourceSheet.getRow(rowIndex);
        newDataRow.height = originalRow.height;
  
        if (firstType === "Marriage Preparation Programme") {
          sourceSheet.getCell(`C${rowIndex}`).value = detail.participantInfo.nric;
          sourceSheet.getCell(`D${rowIndex}`).value = detail.participantInfo.name;
          sourceSheet.getCell(`E${rowIndex}`).value = detail.participantInfo.email;
          sourceSheet.getCell(`F${rowIndex}`).value = detail.participantInfo.contactNumber;
          sourceSheet.getCell(`G${rowIndex}`).value = detail.courseInfo.courseEngName;
          sourceSheet.getCell(`J${rowIndex}`).value = this.convertDateToYYYYMMDD(detail.participantInfo.dateOfBirth);
          sourceSheet.getCell(`K${rowIndex}`).value = detail.participantInfo.residentialStatus;
          sourceSheet.getCell(`L${rowIndex}`).value = detail.participantInfo.gender;
          sourceSheet.getCell(`M${rowIndex}`).value = detail.participantInfo.race;
          sourceSheet.getCell(`N${rowIndex}`).value = detail.marriageDetails?.maritalStatus;
          sourceSheet.getCell(`O${rowIndex}`).value = detail.participantInfo.postalCode;
          sourceSheet.getCell(`P${rowIndex}`).value = detail.participantInfo.educationLevel;
          sourceSheet.getCell(`Q${rowIndex}`).value = detail.marriageDetails?.housingType;
          sourceSheet.getCell(`R${rowIndex}`).value = detail.marriageDetails?.grossMonthlyIncome;
          sourceSheet.getCell(`S${rowIndex}`).value = detail.marriageDetails?.marriageDuration;
          sourceSheet.getCell(`T${rowIndex}`).value = detail.marriageDetails?.typeOfMarriage;
          sourceSheet.getCell(`U${rowIndex}`).value = detail.marriageDetails?.hasChildren;
          sourceSheet.getCell(`V${rowIndex}`).value = detail.spouse?.name;
          sourceSheet.getCell(`W${rowIndex}`).value = detail.spouse?.nric;
          sourceSheet.getCell(`X${rowIndex}`).value = this.convertDateToYYYYMMDD(detail.spouse?.dateOfBirth);
          sourceSheet.getCell(`Y${rowIndex}`).value = detail.spouse?.residentialStatus;
          sourceSheet.getCell(`Z${rowIndex}`).value = detail.spouse?.sex;
          sourceSheet.getCell(`AA${rowIndex}`).value = detail.spouse?.ethnicity;
          sourceSheet.getCell(`AB${rowIndex}`).value = detail.spouse?.maritalStatus;
          sourceSheet.getCell(`AC${rowIndex}`).value = detail.spouse?.postalCode;
          sourceSheet.getCell(`AD${rowIndex}`).value = detail.spouse?.mobile;
          sourceSheet.getCell(`AE${rowIndex}`).value = detail.spouse?.email;
          sourceSheet.getCell(`AF${rowIndex}`).value = detail.spouse?.education;
          sourceSheet.getCell(`AG${rowIndex}`).value = detail.spouse?.housingType;
          sourceSheet.getCell(`AH${rowIndex}`).value = detail.marriageDetails?.howFoundOut;
          sourceSheet.getCell(`AI${rowIndex}`).value = detail.marriageDetails?.howFoundOutOthers;
          sourceSheet.getCell(`AJ${rowIndex}`).value = detail.marriageDetails?.sourceOfReferral;
          sourceSheet.getCell(`AK${rowIndex}`).value = detail.consent?.marriagePrepConsent1 
            ? 'I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above'
            : '';
          sourceSheet.getCell(`AL${rowIndex}`).value = detail.consent?.marriagePrepConsent2 
            ? 'I confirm that I have read and understood the Terms of Consent as set out in the link above'
            : '';
        }
      });

      // Auto-adjust column widths for better visibility
      sourceSheet.columns.forEach((column, index) => {
        let maxLength = 0;
        
        // Check all cells in the column to find the maximum content length
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length;
          }
        });
        
        // Set column width with some padding
        // Minimum width of 10, maximum of 100 for very long content
        const width = Math.min(Math.max(maxLength + 2, 10), 100);
        column.width = width;
      });
      
      // Manually set wider widths for consent columns (columns AK and AL)
      if (sourceSheet.getColumn('AK')) {
        sourceSheet.getColumn('AK').width = 150; // Very wide for consent text
      }
      if (sourceSheet.getColumn('AL')) {
        sourceSheet.getColumn('AL').width = 150; // Very wide for consent text
      }
  
      // Save and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      saveAs(blob, outputFileName);
    } catch (error) {
      console.error("Error exporting Marriage Preparation Programme:", error);
      this.props.warningPopUpMessage("An error occurred during export.");
    }
  };

  ecssChineseCourseCode(course)
  {
    if (!course) return "";
    course = course.trim();

    switch (course) {
        case "不和慢性病做朋友":
            return "ECSS-CBO-M-016C";
        case "我的故事":
            return "ECSS-CBO-M-016C";
        case "和谐粉彩绘画基础班":
            return "ECSS-CBO-M-019C";
        case "和谐粉彩绘画体验班":
            return "ECSS-CBO-M-018C";
        case "疗愈水彩画基础班":
            return "ECSS-CBO-M-024E";
        case "中文书法中级班":
            return "ECSS-CBO-M-021C";
        case "中文书法初级班":
            return "ECSS-CBO-M-020C";
        case "音乐祝福社区四弦琴班":
            return "ECSS-CBO-M-004C";
        case "音乐祝福社区四弦琴班第2阶":
            return "ECSS-CBO-M-037C";
        case "音乐祝福社区歌唱班":
            return "ECSS-CBO-M-003C";
        case "自我养生保健":
            return "ECSS-CBO-M-001C";
        case "汉语拼音基础班":
            return "ECSS-CBO-M-011C";
        case "汉语拼音中级班":
            return "ECSS-CBO-M-025C";
        case "汉语拼音之–《唐诗三百首》":
            return "ECSS-CBO-M-036C";
        case "人生休止符":
            return "ECSS-CBO-M-023C";
        case "食疗与健康":
            return "ECSS-CBO-M-010C";
        case "疗愈基础素描":
            return "ECSS-CBO-M-030E";
        case "健康心灵，健康生活":
            return "ECSS-CBO-M-028C";
        case "智能手机摄影":
            return "ECSS-CBO-M-038C";
        case "掌握沟通艺术。 拥有快乐的家":
            return "ECSS-CBO-M-031C";
        case "和谐粉彩绘画基础班-第2阶":
            return "ECSS-CBO-M-039C";
        case "中级疗愈水彩班":
            return "ECSS-CBO-M-040C";
        case "自我成长":
            return "ECSS-CBO-M-013C";
        case "如何退而不休活得精彩":
            return "ECSS-CBO-M-006C";
        case "活跃乐龄大使":
            return "ECSS-CBO-M-005C";
        case "预防跌倒与功能强化训练":
            return "ECSS-CBO-M-002C";
        case "C3A心理健康课程: 以微笑应万变":
            return "ECSS-CBO-M-017C";
        case "智慧理财基础知识":
            return "ECSS-CBO-M-029C";
        case "盆栽课程":
            return "ECSS-CBO-M-034C";
        case "乐龄儿孙乐":
            return "ECSS-CBO-M-035C";
        default:
            return "";
    }
}
      

      ecssEnglishCourseCode(course) {
        if (!course) return "";
        course = course.trim();
    
        switch (course) {
            case "Community Ukulele – Mandarin L2":
              return "ECSS-CBO-M-037C";
            case "Community Ukulele – Mandarin L2A":
              return "ECSS-CBO-M-037C";
            case "Community Ukulele – Mandarin L2B":
              return "ECSS-CBO-M-037C";
            case "TCM – Don’t be a friend of Chronic Diseases":
                return "ECSS-CBO-M-016C";
            case "Nagomi Pastel Art Basic":
                return "ECSS-CBO-M-019C";
            case "Nagomi Pastel Art Appreciation":
                return "ECSS-CBO-M-018C";
            case "Therapeutic Watercolour Painting for Beginners":
                return "ECSS-CBO-M-024E";
            case "Chinese Calligraphy Intermediate":
                return "ECSS-CBO-M-021C";
            case "Chinese Calligraphy Basic":
                return "ECSS-CBO-M-020C";
            case "Community Ukulele – Mandarin":
                return "ECSS-CBO-M-004C";
            case "Community Ukulele Level 2 – Mandarin":
                return "ECSS-CBO-M-037C";
            case "Community Singing – Mandarin":
                return "ECSS-CBO-M-003C";
            case "Self-Care TCM Wellness – Mandarin":
                return "ECSS-CBO-M-001C";
            case "Hanyu Pinyin for Beginners":
                return "ECSS-CBO-M-011C";
            case "Hanyu Pinyin Intermediate":
                return "ECSS-CBO-M-025C";
            case "Hanyu Pinyin – 300 Tang Poems":
                return "ECSS-CBO-M-036C";
            case "The Rest Note of Life – Mandarin":
                return "ECSS-CBO-M-023C";
            case "TCM Diet & Therapy":
                return "ECSS-CBO-M-010C";
            case "Therapeutic Basic Line Work":
                return "ECSS-CBO-M-030E";
            case "Healthy Minds, Healthy Lives – Mandarin":
                return "ECSS-CBO-M-028C";
            case "C3A AgeMAP – Healthy Minds for Healthy Lives":
                return "ECSS-CBO-M-028E";
            case "Smartphone Photography":
                return "ECSS-CBO-M-038C";
            case "Art of Positive Communication builds happy homes":
                return "ECSS-CBO-M-031C";
            case "Nagomi Pastel Art Basic – Level 2":
                return "ECSS-CBO-M-039C";
            case "Intermediate Therapeutic Watercolour":
                return "ECSS-CBO-M-040C";
            case "My Growth":
                return "ECSS-CBO-M-013C";
            case "My Story":
                return "ECSS-CBO-M-007C";
            case "How to Retire & Live Wonderfully":
                return "ECSS-CBO-M-006C";
            case "Active Ageing Ambassadors":
                return "ECSS-CBO-M-005C";
            case "Fall Prevention & Functional Improvement Training":
                return "ECSS-CBO-M-002E";
            case "C3A Mental Wellbeing Curriculum – Riding the Waves of Change Smiling":
                return "ECSS-CBO-M-017E";
            case "C3A Mental Wellbeing Curriculum – Riding the Waves of Change Smiling (Malay)":
                return "ECSS-CBO-M-017M";
            case "Basics of Smart Money Management":
                return "ECSS-CBO-M-029E";
            case "The Art of Paper Quilling":
                return "ECSS-CBO-M-032E";
            case "Community Cajon Foundation 1":
                return "ECSS-CBO-M-033E";
            case "Bonsai Course":
                return "ECSS-CBO-M-034C";
            case "Happy Grandparenting":
                return "ECSS-CBO-M-035C";
            default:
                return "";
        }
      }
    
    exportAttendance = async () => {
      var { selectedRows } = this.state;
      console.log("Export Attendance - Selected Data:", selectedRows);
      
    
      if (selectedRows.length === 0) {
        return this.props.warningPopUpMessage("No rows selected. Please select rows to export.");
      }

      // Determine course type and apply filtering
      const firstType = selectedRows[0]?.courseInfo?.courseType;
      const filteredRows = selectedRows.filter(row => {
        const paymentStatus = row.paymentStatus;
        if (firstType === "NSA") {
          return paymentStatus === "Paid" || paymentStatus === "SkillsFuture Done";
        } else {
          return paymentStatus === "Confirmed";
        }
      });

      // Check if there are any filtered rows
      if (filteredRows.length === 0) {
        const statusMessage = firstType === "NSA" 
          ? "No rows with payment status 'Paid' or 'SkillsFuture Done' found." 
          : "No rows with payment status 'Confirmed' found.";
        return this.props.warningPopUpMessage(statusMessage);
      }
    
     try {
        if(firstType === "NSA")
        {
          // Fetch the Excel file from public folder
          const filePath = '/external/Attendance.xlsx';
          const response = await fetch(filePath);
      
          if (!response.ok) {
            return this.props.warningPopUpMessage("Error fetching the Excel file.");
          }
      
          const data = await response.arrayBuffer();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data);
      
          const sourceSheet = workbook.getWorksheet('Sheet1');
          if (!sourceSheet) {
            return this.props.warningPopUpMessage("Sheet 'Sheet1' not found!");
          }
      
          // Get course name and location from first filtered row
          const firstRow = filteredRows[0];
          const courseName = firstRow.course?.courseEngName || firstRow.courseInfo?.courseEngName || "Unknown Course";
          const courseLocation = firstRow.course?.courseLocation || firstRow.courseInfo?.courseLocation || "Unknown Location";
      
          // Set Course Title in A1
          const cellA1 = sourceSheet.getCell('A1');
          cellA1.value = `Course Title: ${courseName}`;
          cellA1.font = { name: 'Calibri', size: 18, bold: true };
      
          // Set Course Commencement Date in A2 - Add null check to prevent errors
          let courseCommencementDate = '';
          // Check if courseDuration exists and handle the case where it might be undefined
          const courseDuration = firstRow.course?.courseDuration || firstRow.courseInfo?.courseDuration;
          if (courseDuration) {
            const parts = courseDuration.split("-");
            if (parts && parts.length > 0) {
              courseCommencementDate = parts[0].trim();
            }
          }
          
          console.log("Course Commerce Date:", courseCommencementDate);
      
          const cellA2 = sourceSheet.getCell('A2');
          cellA2.value = `Course Commencement Date: ${courseCommencementDate}`;
          cellA2.font = { name: 'Calibri', size: 18, bold: true };
      
          // Set Venue in A3 based on location
          const cellA3 = sourceSheet.getCell('A3');
          if (courseLocation === "Tampines 253 Centre") {
            cellA3.value = `Venue: Blk 253 Tampines St 21 #01-406 Singapore 521253`;
          } else if (courseLocation === "CT Hub") {
            cellA3.value = `Venue: En Community Services Society 2 Kallang Avenue CT Hub #06-14 Singapore 339407`;
          } else if (courseLocation === "Tampines North Community Centre") {
            cellA3.value = `Venue: Tampines North Community Club Blk 421 Tampines St 41 #01-132 Singapore 520420`;
          } else if (courseLocation === "Pasir Ris West Wellness Centre") {
            cellA3.value = `Venue: Pasir Ris West Wellness Centre Blk 605 Elias Road #01-200 Singapore 510605`;
          } else {
            cellA3.value = `Venue: ${courseLocation}`;
          }
          cellA3.font = { name: 'Calibri', size: 18, bold: true };
      
          // Sort participants alphabetically by name - add null checks
          let sortedParticipants = [...filteredRows]
            .sort((a, b) => {
              const nameA = (a.participant?.name || a.participantInfo?.name || "").trim().toLowerCase();
              const nameB = (b.participant?.name || b.participantInfo?.name || "").trim().toLowerCase();
              return nameA.localeCompare(nameB);
            });
          console.log("Sorted Participants:", sortedParticipants);
      
          // Loop for S/N and Name starting from row 6
          let rowIndex = 6;
          let participantIndex = 1;
          for (let i = 0; i < sortedParticipants.length; i++) {
            const item = sortedParticipants[i];
            const cellA = sourceSheet.getCell(`A${rowIndex}`);
            const cellB = sourceSheet.getCell(`B${rowIndex}`);
      
            cellA.value = participantIndex;
            // Use optional chaining to avoid errors
            cellB.value = item.participant?.name || item.participantInfo?.name || "Unknown";
      
            cellA.font = { name: 'Calibri', size: 18, bold: true };
            cellB.font = { name: 'Calibri', size: 18, bold: true };
      
            rowIndex++;
            participantIndex++;
          }        // Set Weekly labels in row 4 (D4 onwards) - Add proper error handling
          const [startDate, endDate] = (courseDuration || "").split(" - ");
          // Default to current date if no valid start date
          let start = startDate ? new Date(startDate) : new Date();
          // Default to a month later if no valid end date
          let end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

          // Handle invalid dates
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.error("Invalid course dates:", { startDate, endDate });
            // Use current date as fallback
            const today = new Date();
            start = today;
            end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          }
      
          // Calculate weeks
          let weekIndex = 1;
          let currentDate = new Date(start);
          const row = sourceSheet.getRow(4);
          let lessonColumns = [];
      
          // Loop for lessons (L1, L2, L3, etc.)
          for (let col = 4; col <= 42; col += 2) {
            if (currentDate <= end) {
              const lessonLabel = `L${weekIndex}: ${formatDateToDDMMYYYY(currentDate)}`;
              const cell = row.getCell(col);
              
              cell.value = lessonLabel;
              cell.font = { name: 'Calibri', size: 16, bold: true };
              
              lessonColumns.push(col);
              
              currentDate.setDate(currentDate.getDate() + 7);
              weekIndex++;
            }
          }
    
          // Create a new file and trigger download
          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
      
          // Trigger the file download with a new name
          saveAs(blob, `Attendance (Course) ECSS${formatDateToDDMMYYYY1(start)} ${courseName}.xlsx`);
        }
        else if(firstType === "ILP")
        {
          const firstRow = filteredRows[0];
          
          // Fetch the Excel file from public folder
          const filePath = '/external/2025 ILP Course Name Site Name Date of event.xlsx';
          const response = await fetch(filePath);
      
          if (!response.ok) {
            return this.props.warningPopUpMessage("Error fetching the Excel file.");
          }

          const data = await response.arrayBuffer();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data);
      
          const sourceSheet = workbook.getWorksheet('Sheet1');
          if (!sourceSheet) {
            return this.props.warningPopUpMessage("Sheet 'Sheet1' not found!");
          }
      
          const courseName = firstRow.course?.courseEngName || firstRow.courseInfo?.courseEngName || "Unknown Course";
          const courseLocation = firstRow.course?.courseLocation || firstRow.courseInfo?.courseLocation || "Unknown Location";
      
          // Set Course Title in A1
          const cellA1 = sourceSheet.getCell('A1');
          cellA1.value = `Course Title: ${courseName}`;
      
          // Set Course Commencement Date in A2 - Add null check to prevent errors
          let courseCommencementDate = '';
          // Check if courseDuration exists and handle the case where it might be undefined
          const courseDuration = firstRow.course?.courseDuration || firstRow.courseInfo?.courseDuration;
          if (courseDuration) {
            const parts = courseDuration.split("-");
            if (parts && parts.length > 0) {
              courseCommencementDate = parts[0].trim();
            }
          }
          
          console.log("Course Commerce Date:", courseCommencementDate);
      
          const cellA2 = sourceSheet.getCell('A2');
          cellA2.value = `Course Commencement Date: ${courseCommencementDate}`;
      
          // Set Venue in A3 based on location
          const cellA3 = sourceSheet.getCell('A3');
          if (courseLocation === "CT Hub") {
            cellA3.value = `Venue: En Community Services Society 2 Kallang Avenue CT Hub #06-14 Singapore 339407`;
          } else if (courseLocation === "Tampines North Community Centre") {
            cellA3.value = `Venue: Tampines North Community Club Blk 421 Tampines St 41 #01-132 Singapore 520420`;
          } else if (courseLocation === "Pasir Ris West Wellness Centre") {
            cellA3.value = `Venue: Pasir Ris West Wellness Centre Blk 605 Elias Road #01-200 Singapore 510605`;
          } else {
            cellA3.value = `Venue: ${courseLocation}`;
          }

          const cellC2 = sourceSheet.getCell('C2');
          cellC2.value = "Tel: 67886625";

          const cellC3 = sourceSheet.getCell('C3');
          cellC3.value = "Submitted by: " + this.props.userName;

          const cellC4 = sourceSheet.getCell('C4');
          cellC4.value = "Date: "+ formatDateToDDMMYYYY2(new Date());

                    // Sort participants alphabetically by name - add null checks
          let sortedParticipants = [...filteredRows]
            .sort((a, b) => {
              const nameA = (a.participant?.name || a.participantInfo?.name || "").trim().toLowerCase();
              const nameB = (b.participant?.name || b.participantInfo?.name || "").trim().toLowerCase();
              return nameA.localeCompare(nameB);
            });
          console.log("Sorted Participants:", sortedParticipants);
      
          // Loop for S/N and Name starting from row 6
          let rowIndex = 6;
          let participantIndex = 1;
          for (let i = 0; i < sortedParticipants.length; i++) {
            const item = sortedParticipants[i];
            const cellA = sourceSheet.getCell(`A${rowIndex}`);
            cellA.value = participantIndex++;
            const cellB = sourceSheet.getCell(`B${rowIndex}`);
            cellB.value = item.participant?.name || item.participantInfo?.name || "";
            rowIndex++;
          }


          // Create a new file and trigger download
          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
      
          // Trigger the file download with a new name
          saveAs(blob, `2025 ILP ${courseName} ${courseLocation} ${courseCommencementDate}.xlsx`);
        }

         function formatDateToDDMMYYYY(date) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }

        function formatDateToDDMMYYYY1(date) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}${month}${year}`;
        }

        function formatDateToDDMMYYYY2(date) {
                const months = [
                  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ];
                
                const day = String(date.getDate()).padStart(2, '0');
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                
                return `${day} ${month} ${year}`;
          }
            
      } catch (error) {
        console.error("Error exporting attendance:", error);
        this.props.warningPopUpMessage("An error occurred during export: " + error.message);
      }
    };

    getCurrentDateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(2);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
    
      return `${day}${month}${year}`;
    };
  
  // Custom Cell Renderer for Slide Button
  slideButtonRenderer = (params) => {
    const paymentMethod = params.data.paymentMethod; // Get payment method for the row

    // Return null or empty if the payment method is not 'SkillsFuture'
    if (paymentMethod !== 'SkillsFuture') {
      return null;
    }

    // Otherwise, return JSX for the slide button (checkbox)
    const checked = params.value;  // Set checkbox state based on the current value of 'confirmed'
    
    const handleChange = (event) => {
      const newValue = event.target.checked;
      params.api.getRowNode(params.node.id).setDataValue('confirmed', newValue);
      console.log('Slide button toggled:', newValue);
    };

    return (
      <div className="slide-button-container">
        <input 
          type="checkbox"
          className="slide-button"
          checked={checked}
          onChange={handleChange}
        />
      </div>
    );
  };
  
  // Custom cell renderer for Payment Method with Buttons
 /* paymentMethodRenderer = (params, courseName, location, type) => {
    const currentPaymentMethod = params.value; // Get the current payment method value

    let paymentMethods;
    if((type === "NSA") || (type === "Marriage Preparation Programme"))
    {
      // List of payment methods
      if(location === "Pasir Ris West Wellness Centre")
      {
        if(courseName !== "Community Ukulele – Mandarin")
        {
          paymentMethods = ['PayNow', 'SkillsFuture'];
        }
        else
        {
          paymentMethods = ['PayNow'];
        }
      }
      if(location === "Pasir Ris West Wellness Centre")
      {
        if(courseName !== "Community Ukulele – Mandarin")
        {
          paymentMethods = ['PayNow', 'SkillsFuture'];
        }
      }
      else
      {
        if(courseName !== "Community Ukulele – Mandarin")
        {
          paymentMethods = ['Cash', 'PayNow', 'SkillsFuture'];
        }
        else
        {
          paymentMethods = ['Cash', 'PayNow'];
        }
      }
    }
    else
    {
      paymentMethods = [];
    }

    // Handle button click to update the payment method in the row
    const handleButtonClick = (method) => {
      params.api.getRowNode(params.node.id).setDataValue('paymentMethod', method);
      console.log('Payment method changed to:', method);
    };

    return (
      <div className="payment-method-buttons-container">
        {paymentMethods.map((method) => (
          <button
            key={method}
            className={`payment-method-button ${method === currentPaymentMethod ? 'active' : ''}`}
            onClick={() => handleButtonClick(method)}
          >
            {method}
          </button>
        ))}
      </div>
    );
  };*/

    // Custom cell renderer for Payment Method with Buttons
  paymentMethodRenderer = (params, courseName, location, type) => {
    const currentPaymentMethod = params.value; // Get the current payment method value
    const { courseInfo } = params.data; // Get course info to access price
  
    let paymentMethods;
    if(type === "NSA")
    {
      console.log("Type:", type, "Location:", location);
      // List of payment methods
      if(location === "Pasir Ris West Wellness Centre")
      {
        if((courseName !== "Community Ukulele – Mandarin") && (courseName !== "My Story – Mandarin"))
        {
          paymentMethods = ['PayNow', 'SkillsFuture'];
        }
        else
        {
          paymentMethods = ['PayNow'];
        }
      }
      else
      {
        if((courseName !== "Community Ukulele – Mandarin") && (courseName !== "My Story – Mandarin"))
        {
          paymentMethods = ['Cash', 'PayNow', 'SkillsFuture'];
        }
        else
        {
          paymentMethods = ['Cash', 'PayNow'];
        }
      }
    }
    else if(type === "Marriage Preparation Programme")
    {
      paymentMethods = ['Cash', 'PayNow'];
    }
    else if(type === "Talks And Seminar")
    {
      // Check if the course price is greater than 0
      const coursePrice = parseFloat((courseInfo?.coursePrice || '0').replace('$', ''));
      if(coursePrice > 0)
      {
        paymentMethods = ['Cash', 'PayNow']; // No SkillsFuture for paid Talks And Seminar
      }
      else
      {
        paymentMethods = []; // No payment methods for free Talks And Seminar
      }
    }
    else
    {
      paymentMethods = [];
    }
  
    // Handle button click to update the payment method in the row
    const handleButtonClick = (method) => {
      params.api.getRowNode(params.node.id).setDataValue('paymentMethod', method);
      console.log('Payment method changed to:', method);
    };
  
    return (
      <div className="payment-method-buttons-container">
        {paymentMethods.map((method) => (
          <button
            key={method}
            className={`payment-method-button ${method === currentPaymentMethod ? 'active' : ''}`}
            onClick={() => handleButtonClick(method)}
          >
            {method}
          </button>
        ))}
      </div>
    );
  };
  
  // Custom header component for select all checkbox
  selectAllHeaderComponent = (params) => {
    const handleSelectAll = () => {
      if (this.gridApi) {
        // Get current selected rows from the grid API
        const currentSelectedRows = this.gridApi.getSelectedRows();
        const totalRows = this.gridApi.getDisplayedRowCount();
        
        if (currentSelectedRows.length === totalRows && totalRows > 0) {
          // Deselect all rows
          this.gridApi.deselectAll();
        } else {
          // Select all rows
          this.gridApi.selectAll();
        }
        
        // Force header refresh
        setTimeout(() => {
          if (this.gridApi) {
            this.gridApi.refreshHeader();
          }
        }, 10);
      }
    };

    // Get current selection state from grid API if available
    let allSelected = false;
    if (this.gridApi) {
      const selectedRows = this.gridApi.getSelectedRows();
      const totalRows = this.gridApi.getDisplayedRowCount();
      allSelected = totalRows > 0 && selectedRows.length === totalRows;
    }

    return React.createElement('div', {
      style: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        width: '100%',
        cursor: 'pointer'
      },
      onClick: handleSelectAll,
      title: allSelected ? 'Deselect all' : 'Select all'
    });
  };
  
 getColumnDefs = (optionalRowData = null) => {
  const { role, siteIC, selectedCourseType } = this.props; // Get the role and selectedCourseType from props
  console.log("Props123455:", siteIC);
  
  // Check if we're filtering by ILP or Talks And Seminar course type
  const isFilteringILP = selectedCourseType === 'ILP';
  const isFilteringTalksAndSeminar = selectedCourseType === 'Talks And Seminar';
  const shouldHidePaymentColumns = isFilteringILP || isFilteringTalksAndSeminar;
  
  // Check if we should hide Course Time column for NSA, ILP, and Marriage Preparation Programme
  const isFilteringNSA = selectedCourseType === 'NSA';
  const isFilteringMarriagePrepForCourseTime = selectedCourseType === 'Marriage Preparation Programme';
  // Remove course time hiding - always show course time
  const shouldHideCourseTimeColumn = false;
  
  // Debug: Check current state for Marriage Preparation Programme data
  // Use optionalRowData if provided, otherwise fall back to state
  const { rowData: debugRowData } = this.state;
  const dataToCheck = optionalRowData || debugRowData;
  if (dataToCheck && dataToCheck.length > 0) {
    const marriagePrepData = dataToCheck.filter(row => row.courseInfo?.courseType === 'Marriage Preparation Programme');
    console.log('getColumnDefs - Marriage Preparation Programme entries found:', marriagePrepData.length);
    if (marriagePrepData.length > 0) {
      console.log('getColumnDefs - Sample Marriage Preparation Programme data:', marriagePrepData[0]);
      console.log('getColumnDefs - Marriage Preparation Programme field values:', {
        spouseName: marriagePrepData[0].spouseName,
        maritalStatus: marriagePrepData[0].maritalStatus,
        intendedMarriageDate: marriagePrepData[0].intendedMarriageDate,
        housingType: marriagePrepData[0].housingType,
        spouseContact: marriagePrepData[0].spouseContact
      });
    }
  }

  // Start with your fixed columns array
  const columnDefs = [
    {
      headerName: "S/N",
      field: "sn",
      width: 100,
      pinned: "left",
    },
    {
      headerName: "Name",
      field: "name",
      width: 300,
      editable: true,
      pinned: "left",
    },
    {
      headerName: "Contact Number",
      field: "contactNo",
      width: 150,
      editable: true,
      pinned: "left",
    },
    {
      headerName: "Course Name",
      field: "course",
      width: 750,
    },
    {
      headerName: "Course Mode",
      field: "courseMode",
      width: 150,
    },
    {
      headerName: "Course Time",
      field: "courseTime",
      width: 300,
      hide: shouldHideCourseTimeColumn, // Always visible now
    },
    {
      headerName: "Payment Method",
      field: "paymentMethod",
      cellRenderer: (params) => {
        const { courseInfo } = params.data;
        const { course, courseInfo: ci } = params.data;
        return this.paymentMethodRenderer(
          params,
          course,
          ci.courseLocation,
          ci.courseType
        );
      },
      editable: false,
      width: 500,
      hide: shouldHidePaymentColumns // Hide Payment Method column when filtering by ILP or Talks And Seminar
    },
    {
      headerName: "Confirmation",
      field: "confirmed",
      cellRenderer: (params) => this.slideButtonRenderer(params),
      editable: false,
      width: 180,
      cellStyle: (params) =>
        params.data.paymentMethod !== "SkillsFuture" ? { display: "none" } : {},
      hide: shouldHidePaymentColumns // Hide Confirmation column when filtering by ILP or Talks And Seminar
    },
    {
      headerName: "Receipt/Invoice Number",
      field: "recinvNo",
      width: 500,
      hide: shouldHidePaymentColumns // Hide Receipt/Invoice Number column when filtering by ILP or Talks And Seminar
    },
    {
      headerName: "Payment Date",
      field: "paymentDate",
      width: 350,
      editable: true,
      hide: shouldHidePaymentColumns // Hide Payment Date column when filtering by ILP or Talks And Seminar
    },
    {
      headerName: "Refunded Date",
      field: "refundedDate",
      width: 350,
      editable: true,
      hide: shouldHidePaymentColumns // Hide Refunded Date column when filtering by ILP or Talks And Seminar
    },
 {
      headerName: (() => {
        // Determine header name based on course types in the data
        if (dataToCheck && dataToCheck.length > 0) {
          const courseTypes = dataToCheck.map(row => row.courseInfo?.courseType);
          const hasNSA = courseTypes.includes('NSA');
          const hasMarriagePrep = courseTypes.includes('Marriage Preparation Programme');
          const hasILP = courseTypes.includes('ILP');
          const hasTalksAndSeminar = courseTypes.includes('Talks And Seminar');
          
          // If filtering by specific course type
          if (selectedCourseType === 'NSA' || selectedCourseType === 'Marriage Preparation Programme') {
            return "Payment Status";
          } else if (selectedCourseType === 'ILP' || selectedCourseType === 'Talks And Seminar') {
            return "Registration Status";
          }
        }
        
        // Default fallback
        return "Registration and Payment Status";
      })(),
      field: "paymentStatus",
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => {
        const { paymentMethod, courseInfo, paymentStatus } = params.data;
        const courseType = courseInfo.courseType;
        const coursePrice = courseInfo.coursePrice;

        let initialOptions;
        
        if (courseType === "NSA") {
          initialOptions = paymentMethod === "SkillsFuture"
            ? [
                "Pending",
                "Generating SkillsFuture Invoice",
                "SkillsFuture Done",
                "Cancelled",
                "Withdrawn",
                "Refunded",
              ]
            : ["Pending", "Paid", "Cancelled", "Withdrawn", "Refunded", "Not Successful"];
        } else if (courseType === "ILP" || (courseType === "Talks And Seminar" && parseFloat((coursePrice || '0').replace('$', '')) === 0)) {
          initialOptions = ["Pending", "Confirmed", "Withdrawn", "Not Successful"];
        } else if (courseType === "Talks And Seminar" && parseFloat((coursePrice || '0').replace('$', '')) > 0) {
          initialOptions = ["Pending", "Paid", "Cancelled", "Withdrawn", "Refunded", "Not Successful"];
        } else {
          initialOptions = ["Pending", "Paid", "Withdrawn", "Refunded", "Not Successful"];
        }

        let options;
        if (paymentStatus === "Pending") {
          options = initialOptions.filter(
            (status) => status !== "Withdrawn" && status !== "Refunded"
          );
        } else if (paymentStatus === "Paid") {
          options = initialOptions.filter(
            (status) => status !== "Cancelled" && status !== "Refunded"
          );
        } else if (paymentStatus === "Withdrawn") {
          options = initialOptions.filter((status) => status !== "Cancelled");
        } else {
          options = initialOptions;
        }

        const filteredOptions = options.filter((status) => status !== paymentStatus);

        return { values: filteredOptions };
      },
      cellRenderer: (params) => {
        const statusStyles = {
          Pending: "#FFA500",
          "Generating SkillsFuture Invoice": "#00CED1",
          "SkillsFuture Done": "#008000",
          Cancelled: "#FF0000",
          Withdrawn: "#800000",
          Paid: "#008000",
          Confirmed: "#008000",
          Refunded: "#D2691E",
          "Not Successful": "#A9A9A9", // Adding ILP status color
        };
        const statusText = params.value;
        const backgroundColor = statusStyles[statusText] || "#D3D3D3";

        return (
          <span
            style={{
              display: "inline-block",
              padding: "0.25em 1.2em",
              borderRadius: "999px",
              fontWeight: "bold",
              color: "#fff",
              fontSize: "0.95em",
              textAlign: "center",
             
              minWidth: "100px",
              backgroundColor,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              letterSpacing: "0.02em",
              lineHeight: "1.8",
            }}
          >
            {statusText}
          </span>
        );
      },
      editable: true,
      width:  350,
    },
        {
      headerName: "Sending Message Details",
      field: "sendDetails",
      width: 300,
      cellRenderer: (params) => {
        const isSent = params.data?.sendDetails;
        if (isSent === undefined) return null;
        const imageSrc = isSent
          ? "https://upload.wikimedia.org/wikipedia/commons/2/29/Tick-green.png"
          : "https://upload.wikimedia.org/wikipedia/commons/5/5f/Red_X.svg";
        return (
          <img
            src={imageSrc}
            alt={isSent ? "Sent" : "Not Sent"}
            width="20"
            height="20"
          />
        );
      },
    },
    {
      headerName: "Remarks",
      field: "remarks",
      width: 300,
      editable: (params) => {
        return !(
          params.data.paymentStatus === "Withdrawn" ||
          params.data.paymentStatus === "Cancelled" ||
          params.data.paymentStatus === "Refunded"
        );
      },
    },
  ];

  // Conditionally add "Course Location" column only if not hiding cells
  if ((Array.isArray(siteIC) || !siteIC) && !this.state.hideMarriagePrepFields) {
    columnDefs.splice(
      4,
           0,
      {
        headerName: "Course Location",
        field: "location",
        width: 300,
        cellRenderer: (params) => {
          // If siteIC is NOT an array or is falsy (null/undefined/empty string),
          // just show the value as is (no filter)
          if (!Array.isArray(siteIC)) {
            return params.value;
          }

          // If siteIC is an array, check if params.value is in the siteIC array
          for (let i = 0; i < siteIC.length; i++) {
            if (params.value === siteIC[i]) {
              return params.value; // matched — show the value
            }
          }

          // If no match found, return empty string to hide the value
          return "";
        },
      }
    );
  }

  // Always add checkbox column (essential for selection)
  columnDefs.push({
    headerName: "", // blank header (no text)
    field: "checkbox",
    checkboxSelection: true,
    width: 50,
    pinned: "right",
    headerComponent: this.selectAllHeaderComponent,
  });

  // Only add Marriage Preparation Programme specific columns if there are Marriage Preparation Programme entries
  // Check if current filtered data contains any Marriage Preparation Programme courses
  const { rowData: currentRowData } = this.state;
  
  // If specifically filtering by NSA or ILP, don't show Marriage Preparation Programme columns
  const isFilteringNSAorILP = selectedCourseType === 'NSA' || selectedCourseType === 'ILP';
  
  // If specifically filtering by Marriage Preparation Programme, always show Marriage Prep columns
  const isFilteringMarriagePrep = selectedCourseType === 'Marriage Preparation Programme';
  
  // Check for Marriage Preparation Programme data in current displayed data - use dataToCheck for real-time filtering
  const hasMarriagePrepData = !isFilteringNSAorILP && 
    dataToCheck && dataToCheck.length > 0 && 
    dataToCheck.some(row => row.courseInfo?.courseType === 'Marriage Preparation Programme');
  
  // Show Marriage Preparation Programme columns if:
  // 1. Specifically filtering by Marriage Preparation Programme, OR
  // 2. There's Marriage Prep data AND hideMarriagePrepFields is false
  const shouldShowMarriagePrepColumns = isFilteringMarriagePrep || (hasMarriagePrepData && !this.state.hideMarriagePrepFields);
  
  console.log('Column generation debug:', {
    hasMarriagePrepData,
    hideMarriagePrepFields: this.state.hideMarriagePrepFields,
    shouldShowMarriagePrepColumns,
    isFilteringNSAorILP,
    isFilteringMarriagePrep,
    selectedCourseType
  });
  
  if (shouldShowMarriagePrepColumns) {
    const reason = isFilteringMarriagePrep 
      ? 'specifically filtering by Marriage Preparation Programme' 
      : 'Marriage Preparation Programme data detected and toggle is showing columns';
    console.log(`Adding Marriage Preparation Programme columns - ${reason}`);
    // Insert Marriage Preparation Programme columns before the checkbox column
    const checkboxColumnIndex = columnDefs.length - 1;
    
    columnDefs.splice(checkboxColumnIndex, 0, 
      {
        headerName: "Spouse Name",
        field: "spouseName",
        width: 200,
        cellRenderer: (params) => {
          // Enhanced debugging and display for spouse name
          const value = params.value || '';
          const rawData = params.data;
          
          // Debug logging for Marriage Preparation Programme entries
          if (rawData.courseInfo?.courseType === 'Marriage Preparation Programme') {
            console.log('Spouse Name - Raw data:', {
              spouseName: rawData.spouseName,
              spouseObject: rawData.spouse,
              marriageDetails: rawData.marriageDetails,
              courseType: rawData.courseInfo?.courseType
            });
          }
          
          return value || '';
        },
      },
      {
        headerName: "Marital Status",
        field: "maritalStatus", 
        width: 150,
        cellRenderer: (params) => {
          // Enhanced debugging and display for marital status
          const value = params.value || '';
          const rawData = params.data;
          
          // Debug logging for Marriage Preparation Programme entries
          if (rawData.courseInfo?.courseType === 'Marriage Preparation Programme') {
            console.log('Marital Status - Raw data:', {
              maritalStatus: rawData.maritalStatus,
              marriageDetailsMaritalStatus: rawData.marriageDetails?.maritalStatus,
              courseType: rawData.courseInfo?.courseType
            });
          }
          
          return value || '';
        },
      },
      {
        headerName: "Marriage Duration",
        field: "intendedMarriageDate",
        width: 200,
        cellRenderer: (params) => {
          // Enhanced debugging and display for marriage duration
          const value = params.value || '';
          const rawData = params.data;
          
          // Debug logging for Marriage Preparation Programme entries
          if (rawData.courseInfo?.courseType === 'Marriage Preparation Programme') {
            console.log('Marriage Duration - Raw data:', {
              intendedMarriageDate: rawData.intendedMarriageDate,
              marriageDetailsMarriageDuration: rawData.marriageDetails?.marriageDuration,
              courseType: rawData.courseInfo?.courseType
            });
          }
          
          return value || '';
        },
      },
      {
        headerName: "Housing Type",
        field: "housingType",
        width: 350,
        cellRenderer: (params) => {
          const value = params.value || '';
          const rawData = params.data;
          
          // Debug logging for Marriage Preparation Programme entries
          if (rawData.courseInfo?.courseType === 'Marriage Preparation Programme') {
            console.log('Housing Type - Raw data:', {
              housingType: rawData.housingType,
              marriageDetailsHousingType: rawData.marriageDetails?.housingType,
              courseType: rawData.courseInfo?.courseType
            });
          }
          
          return value || '';
        },
      },
      {
        headerName: "Spouse Contact",
        field: "spouseContact",
        width: 150,
        cellRenderer: (params) => {
          const value = params.value || '';
          const rawData = params.data;
          
          // Debug logging for Marriage Preparation Programme entries
          if (rawData.courseInfo?.courseType === 'Marriage Preparation Programme') {
            console.log('Spouse Contact - Raw data:', {
              spouseContact: rawData.spouseContact,
              spouseMobile: rawData.spouse?.mobile,
              spouseContactNumber: rawData.spouse?.contactNumber,
              courseType: rawData.courseInfo?.courseType
            });
          }
          
          return value || '';
        },
      },
      // Additional useful Marriage Preparation Programme columns
      {
        headerName: "Gross Monthly Income",
        field: "grossMonthlyIncome",
        width: 180,
        cellRenderer: (params) => {
          const value = params.value || '';
          return value || '';
        },
      },
      {
        headerName: "Type of Marriage",
        field: "typeOfMarriage",
        width: 1000,
        cellRenderer: (params) => {
          const value = params.value || '';
          return value || '';
        },
      },
      {
        headerName: "Has Children",
        field: "hasChildren",
        width: 120,
        cellRenderer: (params) => {
          const value = params.value || '';
          return value || '';
        },
      },
      {
        headerName: "How Found Out",
        field: "howFoundOut",
        width: 550,
        cellRenderer: (params) => {
          const value = params.value || '';
          return value || '';
        },
      },
      {
        headerName: "Spouse NRIC",
        field: "spouseNric",
        width: 150,
        cellRenderer: (params) => {
          const value = params.value || '';
          return value || '';
        },
      },
      {
        headerName: "Spouse Email",
        field: "spouseEmail",
        width: 200,
        cellRenderer: (params) => {
          const value = params.value || '';
          return value || '';
        },
      },
      {
        headerName: "Marriage Prep Consent 1",
        field: "marriagePrepConsent1",
        width: 1500,
        cellRenderer: (params) => {
          const value = params.value;
          const rawData = params.data;
          
          // Debug logging for Marriage Preparation Programme entries
          if (rawData.courseInfo?.courseType === 'Marriage Preparation Programme') {
            console.log('Marriage Prep Consent 1 - Raw data:', {
              marriagePrepConsent1: rawData.marriagePrepConsent1,
              consentObject: rawData.consent,
              courseType: rawData.courseInfo?.courseType
            });
          }
          
          // Display Yes/No for boolean values
          if (typeof value === 'boolean') {
            return value ? 'I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above' : '';
          }
          return value || '';
        },
      },
      {
        headerName: "Marriage Prep Consent 2", 
        field: "marriagePrepConsent2",
        width: 1000,
        cellRenderer: (params) => {
          const value = params.value;
          const rawData = params.data;
          
          // Debug logging for Marriage Preparation Programme entries
          if (rawData.courseInfo?.courseType === 'Marriage Preparation Programme') {
            console.log('Marriage Prep Consent 2 - Raw data:', {
              marriagePrepConsent2: rawData.marriagePrepConsent2,
              consentObject: rawData.consent,
              courseType: rawData.courseInfo?.courseType
            });
          }
          
          // Display Yes/No for boolean values
          if (typeof value === 'boolean') {
            return value ? 'I confirm that I have read and understood the Terms of Consent as set out in the link above' : '';
          }
          return value || '';
        },
      }
    );
  } else {
    if (isFilteringNSAorILP) {
      console.log(`Skipping Marriage Preparation Programme columns - filtering by ${selectedCourseType}`);
    } else {
      console.log('Skipping Marriage Preparation Programme columns - no Marriage Preparation Programme data found');
    }
  }

  return columnDefs;
};

// Debug helper method to verify Marriage Preparation Programme data
debugMarriagePrepData = () => {
  const { rowData: debugRowData } = this.state;
  if (!debugRowData) return;
  
  const marriagePrepData = debugRowData.filter(row => row.courseInfo?.courseType === 'Marriage Preparation Programme');
  console.log('=== Marriage Preparation Programme Debug Information ===');
  console.log('Total Marriage Preparation Programme registrations:', marriagePrepData.length);
  
  marriagePrepData.forEach((row, index) => {
    console.log(`Marriage Preparation Programme Entry ${index + 1}:`, {
      id: row.id,
      participantName: row.name,
      courseName: row.course,
      courseType: row.courseInfo?.courseType,
      spouseName: row.spouseName,
      maritalStatus: row.maritalStatus,
      marriageDuration: row.intendedMarriageDate,
      housingType: row.housingType,
      spouseContact: row.spouseContact,
      grossMonthlyIncome: row.grossMonthlyIncome,
      typeOfMarriage: row.typeOfMarriage,
      hasChildren: row.hasChildren,
      howFoundOut: row.howFoundOut,
      spouseNric: row.spouseNric,
      spouseEmail: row.spouseEmail,
      // Marriage Preparation Programme consent information
      marriagePrepConsent1: row.marriagePrepConsent1,
      marriagePrepConsent2: row.marriagePrepConsent2,
      // Raw nested objects
      rawSpouse: row.spouse,
      rawMarriageDetails: row.marriageDetails,
      rawConsent: row.consent
    });
  });
  console.log('=== End Marriage Preparation Programme Debug ===');
};

  
  
  handleDelete = async(id) =>
  {
    //console.log("Registration Id:", id);
    await this.props.generateDeleteConfirmationPopup(id);
  }

  handlePortOver = async(id, participantsInfo, courseInfo, status) =>
  {
    //console.log("Params1:", official);
    console.log("Params1:", id, participantsInfo, courseInfo, status);
    await this.props.generatePortOverConfirmationPopup(id, participantsInfo, courseInfo, status);
  }
  
  getPaginatedDetails() {
    const { registerationDetails } = this.state;
    const { currentPage, entriesPerPage } = this.props;
    
    // Calculate the index range for pagination
    const indexOfLastCourse = currentPage * entriesPerPage;
    const indexOfFirstCourse = indexOfLastCourse - entriesPerPage;
  
    // Return the paginated slice of the filtered registerationDetails
    return registerationDetails.slice(indexOfFirstCourse, indexOfLastCourse);
  }

  getRowData = (registerationDetails) => 
  {
    // Optimize memory usage by avoiding large console logs
    const rowData = registerationDetails.map((item, index) => ({
      id: item._id,
      sn: index + 1,
      name: item.participant.name,
      contactNo: item.participant.contactNumber,
      course: item.course.courseEngName,
      courseChi: item.course.courseChiName,
      location: item.course.courseLocation,
      courseMode: item.course.courseMode === "Face-to-Face" ? "F2F" : item.course?.courseMode,
      courseTime: item.course.courseTime || '',
      paymentMethod: item.course.payment,
      confirmed: item.official.confirmed,
      paymentStatus: item.status,
      recinvNo: item.official.receiptNo,
      participantInfo: item.participant,
      courseInfo: item.course,
      officialInfo: item.official,
      agreement: item.agreement,
      status: item.status,
      registrationDate: item.registrationDate,
      refundedDate: item.official?.refundedDate || "",
      remarks: item.official?.remarks || "",
      paymentDate: item.official?.date || "",
      // Marriage Preparation Programme specific fields - include all nested data
      marriageDetails: item.marriageDetails || null,
      spouse: item.spouse || null,
      consent: item.consent || null,
      marriagePrepConsent: item.marriagePrepConsent || null,
      // Quick display fields for Marriage Preparation Programme - always show actual values with fallbacks
      spouseName: item.spouse?.name || item.spouseName || '',
      maritalStatus: item.marriageDetails?.maritalStatus || item.maritalStatus || '',
      intendedMarriageDate: item.marriageDetails?.marriageDuration || item.intendedMarriageDate || '',
      // Additional Marriage Preparation Programme fields for comprehensive display
      housingType: item.marriageDetails?.housingType || item.housingType || '',
      grossMonthlyIncome: item.marriageDetails?.grossMonthlyIncome || item.grossMonthlyIncome || '',
      typeOfMarriage: item.marriageDetails?.typeOfMarriage || item.typeOfMarriage || '',
      hasChildren: item.marriageDetails?.hasChildren || item.hasChildren || '',
      howFoundOut: item.marriageDetails?.howFoundOut || item.howFoundOut || '',
      sourceOfReferral: item.marriageDetails?.sourceOfReferral || item.sourceOfReferral || '',
      spouseNric: item.spouse?.nric || item.spouseNric || '',
      spouseContact: item.spouse?.mobile || item.spouse?.contactNumber || item.spouseContact || '',
      spouseEmail: item.spouse?.email || item.spouseEmail || '',
      // Marriage Preparation Programme consent fields
      marriagePrepConsent1: item.consent?.marriagePrepConsent1 || item.marriagePrepConsent1 || false,
      marriagePrepConsent2: item.consent?.marriagePrepConsent2 || item.marriagePrepConsent2 || false
    }));
    
    // Debug: Check if we have Marriage Preparation Programme data
    const marriagePrepCount = rowData.filter(row => row.courseInfo?.courseType === 'Marriage Preparation Programme').length;
    console.log('Marriage Preparation Programme registrations found:', marriagePrepCount);
    
    // Debug courseTime values
    const courseTimeDebug = rowData.slice(0, 3).map(row => ({
      courseName: row.course,
      courseTime: row.courseTime,
      originalCourseTime: registerationDetails.find(item => item._id === row.id)?.course?.courseTime
    }));
    console.log('Course Time Debug (first 3 rows):', courseTimeDebug);
    
    if (marriagePrepCount > 0) {
      const marriagePrepSample = rowData.find(row => row.courseInfo?.courseType === 'Marriage Preparation Programme');
      console.log('Marriage Preparation Programme data sample:', marriagePrepSample);
      console.log('Marriage Preparation Programme spouse data:', marriagePrepSample?.spouse);
      console.log('Marriage Preparation Programme marriage details:', marriagePrepSample?.marriageDetails);
      console.log('Marriage Preparation Programme quick fields:', {
        spouseName: marriagePrepSample?.spouseName,
        maritalStatus: marriagePrepSample?.maritalStatus,
        intendedMarriageDate: marriagePrepSample?.intendedMarriageDate
      });
    }
    
    // Keep original data structure separate from row data for grid display
    // Update column definitions after setting row data
    this.setState({ 
      rowData,
      columnDefs: this.getColumnDefs()
    }, () => {
      // Debug Marriage Preparation Programme data after state update
      this.debugMarriagePrepData();
    });
  };


  handleValueClick = async (event) =>
  {
    console.log("Event (column header name):", event.colDef.headerName);
    const id = event.data.id;
    const columnName = event.colDef.headerName;
    const receiptInvoice = event.data.recinvNo;
    const participantInfo = event.data.participantInfo;
    const courseInfo = event.data.courseInfo;
    const officialInfo = event.data.officialInfo;

    const rowIndex = event.rowIndex; // Get the clicked row index
    const expandedRowIndex = this.state.expandedRowIndex;

    try {
      if(columnName === "S/N")
        {
          // Check if clicked on a row and handle expansion
          if (expandedRowIndex === rowIndex) {
            // If the same row is clicked, collapse it
            this.setState({ expandedRowIndex: null }, () => {
              // Remove the detail view
              const detailElement = document.getElementById(`detail-view-${rowIndex}`);
              if (detailElement) {
                ReactDOM.unmountComponentAtNode(detailElement);
                detailElement.remove();
              }
            });
          } else {
            // Remove any existing detail views first
            if (expandedRowIndex !== null) {
              const oldDetailElement = document.getElementById(`detail-view-${expandedRowIndex}`);
              if (oldDetailElement) {
                ReactDOM.unmountComponentAtNode(oldDetailElement);
                oldDetailElement.remove();
              }
            }
            
            // Expand the new row
            this.setState({ expandedRowIndex: rowIndex }, () => {
              // Apply the renderer after state is updated
              if (this.gridApi && typeof this.gridApi.getRowNode === 'function') {
                try {
                  const rowNode = this.gridApi.getRowNode(event.node.id);
                  // Handle rowNode if needed
                } catch (error) {
                  console.warn("Error getting row node:", error);
                }
              }
            });
          }
  
        }
        else if (columnName === "Receipt/Invoice Number")
        {
          console.log()
          if(receiptInvoice !== "")
          {
            this.props.showUpdatePopup("In Progress... Please wait...");
            await this.receiptShown(participantInfo, courseInfo, receiptInvoice, officialInfo);
            this.props.closePopup();
          }
        }
        else if (columnName === "Sending Message Details")
        {
          console.log("Entry (Sending Payment Details):", event.data.sendDetails);
            console.log("Entry (Contact Number):", event.data.paymentStatus,  courseType);
            if(participantInfo && participantInfo.contactNumber && courseInfo.payment === "SkillsFuture")
            {
              const phoneNumber = participantInfo.contactNumber.replace(/\D/g, ""); // Remove non-numeric characters
              const message = `${participantInfo.name} - ${courseInfo.courseEngName} invoice for your SkillsFuture submission
              Please ensure that the details are accurate before submission.
              🔴 Please send us a screenshot of your submission once done.
              More Information: https://ecss.org.sg/wp-content/uploads/2025/07/Step-by-step-guide-on-how-to-do-Skillsfuture-claim-submission.pdf`;

              const whatsappWebURL = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
              window.open(whatsappWebURL, "_blank"); // Opens in a new browser tab              
            }
            else if (
              participantInfo &&
              participantInfo.contactNumber &&
              (courseInfo.payment === "PayNow" || courseInfo.payment === "Cash")
              && courseInfo.courseType === "NSA" 
            ) {
              console.log("Open Whatsapp Web for PayNow or Cash - NSA");
              const phoneNumber = participantInfo.contactNumber.replace(/\D/g, ""); // Remove non-numeric characters
              let message = `${courseInfo.courseEngName} - ${courseInfo.courseDuration.split("–")[0]}
              Course subsidy applies to only Singaporeans and PRs aged 50yrs and above
              Hi ${participantInfo.name}, 
              Thank you for signing up for the above-mentioned class. 
              Details are as follows:
              Price: ${courseInfo.coursePrice}
              Payment to be made via Paynow to UEN no: T03SS0051L (En Community Services Society) 
              Under the "reference portion", kindly insert your name as per NRIC. 
              Once payment has gone through, take a screenshot of the payment receipt on your phone and send it over to us. 
              Thank you.`;
              const whatsappWebURL = `https://web.whatsapp.com/send?phone=+65${phoneNumber}&text=${encodeURIComponent(message)}`;
              window.open(whatsappWebURL, "_blank");
              console.log("Whatsapp Link:", whatsappWebURL)
            }
              else if (
              participantInfo &&
              participantInfo.contactNumber &&
              event.data.paymentStatus === "Pending"  
            ) {
              const phoneNumber = participantInfo.contactNumber.replace(/\D/g, ""); // Remove non-numeric characters
              let message = `Hi ${participantInfo.name},
                            Thank you for registering for ${courseInfo.courseEngName}.
                            We’re sorry to inform you that the course is currently full.

                            We appreciate your interest and will be in touch should a spot become available.`;
              const whatsappWebURL = `https://web.whatsapp.com/send?phone=+65${phoneNumber}&text=${encodeURIComponent(message)}`;
              console.log("Whatsapp Link:", whatsappWebURL)
              window.open(whatsappWebURL, "_blank"); // Opens in a new browser tab
            }
            else if (
              participantInfo &&
              participantInfo.contactNumber &&
              event.data.paymentStatus === "Confirmed" &&
              courseInfo.courseType === "ILP" 
            ) {
              const phoneNumber = participantInfo.contactNumber.replace(/\D/g, ""); // Remove non-numeric characters
              let message = `Hi ${participantInfo.name},
                            Thank you for your your support.
                           We wish to confirm your place for  ${courseInfo.courseEngName} on ${courseInfo.courseDuration.split("-")[0]} ${courseInfo.courseTime.split("–")[0]} at ${courseInfo.courseLocation}.
                           Please contact this number if your require more information.
                           Thank you `;
              const whatsappWebURL = `https://web.whatsapp.com/send?phone=+65${phoneNumber}&text=${encodeURIComponent(message)}`;
              console.log("Whatsapp Link:", whatsappWebURL)
              window.open(whatsappWebURL, "_blank"); // Opens in a new browser tab
            }
             else if (
              participantInfo &&
              participantInfo.contactNumber &&
              event.data.paymentStatus === "Confirmed" &&
              courseInfo.courseType === "Talks And Seminar" 
            ) {
              const phoneNumber = participantInfo.contactNumber.replace(/\D/g, ""); // Remove non-numeric characters
              let message = `Hi ${participantInfo.name},
                            Thank you for your your support.
                           We wish to confirm your place for  ${courseInfo.courseEngName} on ${courseInfo.courseDuration.split("-")[0]} ${courseInfo.courseTime.split("–")[0]} at ${courseInfo.courseLocation}.
                           Please contact this number if your require more information.
                           Thank you `;
              const whatsappWebURL = `https://web.whatsapp.com/send?phone=+65${phoneNumber}&text=${encodeURIComponent(message)}`;
              console.log("Whatsapp Link:", whatsappWebURL)
              window.open(whatsappWebURL, "_blank"); // Opens in a new browser tab
            }
            console.log("Submitted Id:", id);
             await this.sendDetails(id);
            //await this.refreshChild();
        }
      }
      catch (error) {
        console.error('Error during submission:', error);
      }
  }

  // Define the Master/Detail grid options
  getDetailGridOptions = () => {
    return {
      columnDefs: [
        { headerName: "Detail Info", field: "detailInfo", width: 500 },
        { headerName: "More Info", field: "moreInfo", width: 500 },
      ],
      domLayout: "autoHeight", // Allows dynamic expansion
    };
  };

  
    getRowStyle = (params) => {
    const { expandedRowIndex, rowData } = this.state;
    const rowIndex = params.rowIndex;
    const row = rowData && rowData[rowIndex];
  
    // Highlight expanded row
    if (expandedRowIndex !== null && expandedRowIndex === rowIndex) {
      return {
        background: '#f1f1f1',
        borderBottom: '1px solid #ddd'
      };
    }
  
    // ILP: soft pastel green
    if (row && row.courseInfo && row.courseInfo.courseType === "ILP") {
      return {
        background: '#d0f5e8' // soft pastel green
      };
    }

    // ILP: soft pastel green
    if (row && row.courseInfo && row.courseInfo.courseType === "Marriage Preparation Programme") {
      return {
        background: '#fff9c4' // soft pastel yellow
      };
    }

    if (row && row.courseInfo && row.courseInfo.courseType === "Talks And Seminar") 
    {
      return {
        background: '#D8D8D8' // soft pastel yellow
      };
    }
  
    // Anomaly for non-ILP (optional, keep your old logic if needed)
    const anomalyStyles = this.getAnomalyRowStyles(rowData);
    if (anomalyStyles && anomalyStyles[rowIndex]) {
      return anomalyStyles[rowIndex];
    }
  
    return null;
  };

    // Render the detailed view of a row when expanded
    renderDetailView = (rowData) => {
      console.log('Rendering detail view for row data:', rowData);
      if (!rowData) return null;
      
      const { participantInfo, courseInfo, officialInfo, status, id, marriageDetails, spouse, consent } = rowData;
      const isMarriagePrep = courseInfo.courseType === 'Marriage Preparation Programme';
      
      return (
        <div className="detail-view-container">
          <div className="detail-view-header">
            <h3>Registration Details</h3>
          </div>
          
          <div className="detail-view-content">
            <div className="detail-view-section">
              <h4>Participant Information</h4>
              <div className="detail-view-grid">
                <div className="detail-field">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{participantInfo.name}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">NRIC:</span>
                  <span className="detail-value">{participantInfo.nric}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Contact:</span>
                  <span className="detail-value">{participantInfo.contactNumber}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{participantInfo.email}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{participantInfo.gender}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">DOB:</span>
                  <span className="detail-value">{participantInfo.dateOfBirth}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Residential Status:</span>
                  <span className="detail-value">{participantInfo.residentialStatus}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Race:</span>
                  <span className="detail-value">{participantInfo.race}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Postal Code:</span>
                  <span className="detail-value">{participantInfo.postalCode}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Education Level:</span>
                  <span className="detail-value">{participantInfo.educationLevel}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Work Status:</span>
                  <span className="detail-value">{participantInfo.workStatus}</span>
                </div>
              </div>
            </div>

            {/* Marriage Preparation Programme Specific Fields */}
            {isMarriagePrep && marriageDetails && (
              <div className="detail-view-section">
                <h4>Marriage Details</h4>
                <div className="detail-view-grid">
                  <div className="detail-field">
                    <span className="detail-label">Marital Status:</span>
                    <span className="detail-value">{marriageDetails.maritalStatus || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Housing Type:</span>
                    <span className="detail-value">{marriageDetails.housingType || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Gross Monthly Income:</span>
                    <span className="detail-value">{marriageDetails.grossMonthlyIncome || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Marriage Duration:</span>
                    <span className="detail-value">{marriageDetails.marriageDuration || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Type of Marriage:</span>
                    <span className="detail-value">{marriageDetails.typeOfMarriage || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Has Children:</span>
                    <span className="detail-value">{marriageDetails.hasChildren || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">How Found Out:</span>
                    <span className="detail-value">{marriageDetails.howFoundOut || 'N/A'}</span>
                  </div>
                  {marriageDetails.howFoundOutOthers && (
                    <div className="detail-field">
                      <span className="detail-label">How Found Out (Others):</span>
                      <span className="detail-value">{marriageDetails.howFoundOutOthers}</span>
                    </div>
                  )}
                  <div className="detail-field">
                    <span className="detail-label">Source of Referral:</span>
                    <span className="detail-value">{marriageDetails.sourceOfReferral || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Spouse Information for Marriage Preparation Programme */}
            {isMarriagePrep && spouse && (
              <div className="detail-view-section">
                <h4>Spouse Information</h4>
                <div className="detail-view-grid">
                  <div className="detail-field">
                    <span className="detail-label">Spouse Name:</span>
                    <span className="detail-value">{spouse.name || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse NRIC:</span>
                    <span className="detail-value">{spouse.nric || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Contact:</span>
                    <span className="detail-value">{spouse.mobile || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Email:</span>
                    <span className="detail-value">{spouse.email || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Sex:</span>
                    <span className="detail-value">{spouse.sex || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse DOB:</span>
                    <span className="detail-value">{spouse.dateOfBirth || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Ethnicity:</span>
                    <span className="detail-value">{spouse.ethnicity || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Residential Status:</span>
                    <span className="detail-value">{spouse.residentialStatus || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Marital Status:</span>
                    <span className="detail-value">{spouse.maritalStatus || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Education:</span>
                    <span className="detail-value">{spouse.education || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Housing Type:</span>
                    <span className="detail-value">{spouse.housingType || 'N/A'}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Spouse Postal Code:</span>
                    <span className="detail-value">{spouse.postalCode || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Consent Information for Marriage Preparation Programme */}
            {isMarriagePrep && consent && (
              <div className="detail-view-section">
                <h4>Consent & Agreements</h4>
                <div className="detail-view-grid">
                  <div className="detail-field">
                    <span className="detail-label">I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above:</span>
                    <span className="detail-value">{consent.marriagePrepConsent1 ? 'I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above' : ''}</span>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">I confirm that I have read and understood the Terms of Consent as set out in the link above:</span>
                    <span className="detail-value">{consent.marriagePrepConsent2 ? 'I confirm that I have read and understood the Terms of Consent as set out in the link above' : ''}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="detail-view-section">
              <h4>Course Information</h4>
              <div className="detail-view-grid">
                <div className="detail-field">
                  <span className="detail-label">Course Type:</span>
                  <span className="detail-value">{courseInfo.courseType}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">English Name:</span>
                  <span className="detail-value">{courseInfo.courseEngName}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Chinese Name:</span>
                  <span className="detail-value">{courseInfo.courseChiName}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{courseInfo.courseLocation}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Mode:</span>
                  <span className="detail-value">{courseInfo.courseMode}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Price:</span>
                  <span className="detail-value">{courseInfo.coursePrice}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">{courseInfo.courseDuration}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Course Time:</span>
                  <span className="detail-value">{courseInfo.courseTime}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-view-section">
              <h4>Payment Information</h4>
              <div className="detail-view-grid">
                <div className="detail-field">
                  <span className="detail-label">Payment Method:</span>
                  <span className="detail-value">{courseInfo.payment}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Payment Status:</span>
                  <span className="detail-value">{status}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Confirmation Status:</span>
                  <span className="detail-value">{officialInfo.confirmed ? 'Confirmed' : 'Not Confirmed'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Receipt/Invoice Number:</span>
                  <span className="detail-value">{officialInfo.receiptNo || 'N/A'}</span>
                </div>
                {officialInfo.refundedDate && (
                  <div className="detail-field">
                    <span className="detail-label">Refunded Date:</span>
                    <span className="detail-value">{officialInfo.refundedDate}</span>
                  </div>
                )}
                <div className="detail-field">
                  <span className="detail-label">Staff Name:</span>
                  <span className="detail-value">{officialInfo.name || 'N/A'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Received Date:</span>
                  <span className="detail-value">{officialInfo.date || 'N/A'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Received Time:</span>
                  <span className="detail-value">{officialInfo.time || 'N/A'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Remarks:</span>
                  <span className="detail-value">{officialInfo.remarks || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  

  onCellValueChanged = async (event) => {
    const columnName = event.colDef.headerName;
    const id = event.data.id;
    const sn = event.data.sn;
    const courseName = event.data.course;
    const courseChiName = event.data.courseChi;
    const courseLocation = event.data.location;
    const newValue = event.value;
    const participantInfo = event.data.participantInfo;
    const courseInfo = event.data.courseInfo;
    const officialInfo = event.data.officialInfo;
    const confirmed = event.data.confirmed;
    const paymentMethod = event.data.paymentMethod;
    const paymentStatus = event.data.paymentStatus;
    const oldPaymentStatus = event.oldValue;

    try 
    {
        if (columnName === "Payment Method") 
        {
          this.props.showUpdatePopup("Updating in progress... Please wait ...");
          await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
            {
              purpose: 'updatePaymentMethod',
              id: id,
              newUpdatePayment: newValue,
              staff: this.props.userName
            }
          );          
          //Automatically Update Status
          console.log("newPaymentMethod:", newValue);
          if(newValue === "Cash" || newValue === "PayNow")
          {
              const response = await axios.post(
                `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
                { 
                  purpose: 'updatePaymentStatus', 
                  id: id, 
                  newUpdateStatus: "Paid", 
                  staff: this.props.userName 
                }
              );
            
              if (response.data.result === true) 
              {
                  // Define the parallel tasks function
                  const performParallelTasks = async () => {
                    try {
                      // Run the two functions in parallel using Promise.all
                      await Promise.all([
                        this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, "Paid"),
                        //console.log("Course Info:", courseInfo)
                        this.autoReceiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue, "Paid"),
                        //this.generatedWhatsappMessage(participantInfo, courseInfo, "course_reservation_successful_om", "payment")
                      ]);
                      console.log("Updated Successfully");
                    } catch (error) {
                      console.error("Error occurred during parallel task execution:", error);
                    }
                };
                await performParallelTasks();
              } 
          }
        }
        else if (columnName === "Confirmation") 
        {
          this.props.showUpdatePopup("Updating in progress... Please wait ...")
          console.log('Cell clicked', event);
          const response = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
            { 
              purpose: 'updateConfirmationStatus', 
              id: id, 
              newConfirmation: newValue, 
              staff: this.props.userName 
            }
          );          
          console.log(`${columnName}: ${newValue}`);
          if(paymentMethod === "SkillsFuture" && newValue === true)
          {
              if (response.data.result === true) 
              {
                console.log("Auto Generate SkillsFuture Invoice");
                // Define the parallel tasks function
                const response = await axios.post(
                  `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`, 
                  { 
                    purpose: 'updatePaymentStatus', 
                    id: id, 
                    newUpdateStatus: "Generating SkillsFuture Invoice", 
                    staff: this.props.userName 
                  }
                );
                if (response.data.result === true) 
                  {
                      // Define the parallel tasks function
                      const performParallelTasks = async () => {
                        try {
                          // Run the two functions in parallel using Promise.all
                          await Promise.all([
                            this.autoReceiptGenerator(id, participantInfo, courseInfo, officialInfo, paymentMethod, "Generating SkillsFuture Invoice")
                          ]);
                          console.log("Updated Successfully");
                        } catch (error) {
                          console.error("Error occurred during parallel task execution:", error);
                        }};
                        await performParallelTasks();
                  } 
              }
          }
          console.log("Change SkillsFuture Confirmation");
        }
        else if (columnName === "Registration And Payment Status" || columnName === "Registration Status" || columnName === "Payment Status") 
        {
          this.props.showUpdatePopup("Updating in progress... Please wait ...");
          
          console.log('Cell clicked', event);
          const response = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
            {
              purpose: 'updatePaymentStatus',
              id: id,
              newUpdateStatus: newValue,
              staff: this.props.userName
            }
          );
            console.log("Response for Payment Status1:", response);
            if (response.data.result === true) 
            {
              console.log("New Payment Status:", newValue);
              if(paymentMethod === "Cash" || paymentMethod === "PayNow")
              {
                console.log("Update Payment Status Success1");
                if(newValue === "Withdrawn")
                {
                    console.log("Old Payment Status:", oldPaymentStatus);
                    if(oldPaymentStatus === "Paid")
                    {
                      const performParallelTasks = async () => {
                        try {
                        // Run the two functions in parallel using Promise.all
                          await Promise.all([
                            this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                          ]);
                          console.log("Both tasks completed successfully.");
                          const response = await axios.post(
                            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
                            {
                              id: id,
                              purpose: 'removedRefundedDate'
                            }
                          );
                        } catch (error) {
                          console.error("Error occurred during parallel task execution:", error);
                        }};
                        await performParallelTasks();
                    }
                }
                else if(newValue === "Refunded")
                {
                  //console.log("Refunding in progress");
                  const response = await axios.post(
                    `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
                    {
                      id: id,
                      purpose: 'addRefundedDate'
                    }
                  );
                  console.log("Response Add Refunded Date:", response);
                }
                else
                {
                  // Define the parallel tasks function
                  const performParallelTasks = async () => {
                    try {
                      // Run the two functions in parallel using Promise.all
                      await Promise.all([
                        this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                        this.receiptGenerator(id, participantInfo, courseInfo, officialInfo, newValue),
                        // WhatsApp automation for Paid status
                        /*newValue === "Paid" ? this.generatedWhatsappMessage(participantInfo, courseInfo, "course_reservation_successful_om", "payment") : */Promise.resolve()
                      ]);
                      console.log("Both tasks completed successfully.");
                    } catch (error) {
                      console.error("Error occurred during parallel task execution:", error);
                    }};
                  await performParallelTasks();
                }
              }
              else if(paymentMethod === "SkillsFuture")
              {
                if(newValue === "SkillsFuture Done")
                {
                  const performParallelTasks = async () => {
                    try {
                      // Run the two functions in parallel using Promise.all
                      await Promise.all([
                        this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                      ]);
                      console.log("Both tasks completed successfully.");
                    } catch (error) {
                      console.error("Error occurred during parallel task execution:", error);
                    }};
                    await performParallelTasks();
                }
                else if(newValue === "Cancelled" || newValue === "Refunded" || newValue === "Withdrawn")
                {
                  console.log("SkillsFuture, Old Payment Status:", oldPaymentStatus);
                  if(oldPaymentStatus === "SkillsFuture Done")
                  {
                    const performParallelTasks = async () => {
                      try {
                        // Run the two functions in parallel using Promise.all
                        await Promise.all([
                          this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                        ]);
                        console.log("Both tasks completed successfully.");
                        const response = await axios.post(
                          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
                          {
                            id: id,
                            purpose: 'removedRefundedDate'
                          }
                        );
                        console.log("Response Add Refunded Date:", response);
                      } catch (error) {
                        console.error("Error occurred during parallel task execution:", error);
                      }};
                      await performParallelTasks();
                }
                else if(newValue === "Refunded")
                {
                  //console.log("Refunding in progress");
                  const response = await axios.post(
                    `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
                    {
                      id: id,
                      purpose: 'addRefundedDate'
                    }
                  );
                  console.log("Response Add Refunded Date:", response);
                }
                else
                {
                  console.log("SkillsFuture: Do not need to update Woocommerce");
                }
              } 
            }
            else if(courseInfo.courseType === "ILP")
            {
              console.log("ILP Course Type - Payment Status Change"); 
              if(newValue === "Confirmed")
              { 
                console.log("Confirm ILP Course")
                const performParallelTasks = async () => {
                  try {
                    // Run the two functions in parallel using Promise.all
                    await Promise.all([
                      this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                      //this.generatedWhatsappMessage(participantInfo, courseInfo, "course_reservation_successful_ilp", "payment")
                    ]);
                    console.log("Both tasks completed successfully.");
                  } catch (error) {
                    console.error("Error occurred during parallel task execution:", error);
                  }};
                  await performParallelTasks();
              }
              else if(newValue === "Cancelled" || newValue === "Withdrawn")
              { 
                console.log("Cancel/Withdraw ILP Course")
                const performParallelTasks = async () => {
                  try {
                    // Run the two functions in parallel using Promise.all
                    await Promise.all([
                      this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                    ]);
                    console.log("Both tasks completed successfully.");
                  } catch (error) {
                    console.error("Error occurred during parallel task execution:", error);
                  }};
                  await performParallelTasks();
              }
              else if(newValue === "Not Successful")
              {
                console.log("ILP Course - Not Successful");
                const performParallelTasks = async () => {
                  try {
                    // Run the two functions in parallel using Promise.all
                    await Promise.all([
                      this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                    ]);
                    console.log("Both tasks completed successfully.");
                  } catch (error) {
                    console.error("Error occurred during parallel task execution:", error);
                  }};
                  await performParallelTasks()
              }
            }
            else if(courseInfo.courseType === "Talks And Seminar")
            {
              if(newValue === "Confirmed")
              { 
                console.log("Confirm Talks And Seminar")
                const performParallelTasks = async () => {
                  try {
                    // Run the two functions in parallel using Promise.all
                    await Promise.all([
                      this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                      //this.generatedWhatsappMessage(participantInfo, courseInfo, "course_reservation_successful_ilp", "payment")
                    ]);
                    console.log("Both tasks completed successfully.");
                  } catch (error) {
                    console.error("Error occurred during parallel task execution:", error);
                  }};
                  await performParallelTasks();
              }
              else if(newValue === "Paid")
              { 
                console.log("Confirm Talks And Seminar")
                const performParallelTasks = async () => {
                  try {
                    // Run the two functions in parallel using Promise.all
                    await Promise.all([
                      this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                      //this.generatedWhatsappMessage(participantInfo, courseInfo, "course_reservation_successful_ilp", "payment")
                    ]);
                    console.log("Both tasks completed successfully.");
                  } catch (error) {
                    console.error("Error occurred during parallel task execution:", error);
                  }};
                  await performParallelTasks();
              }
              else if(newValue === "Cancelled" || newValue === "Withdrawn")
              { 
                console.log("Cancel/Withdraw ILP Course")
                const performParallelTasks = async () => {
                  try {
                    // Run the two functions in parallel using Promise.all
                    await Promise.all([
                      this.updateWooCommerceForRegistrationPayment(courseChiName, courseName, courseLocation, newValue),
                    ]);
                    console.log("Both tasks completed successfully.");
                  } catch (error) {
                    console.error("Error occurred during parallel task execution:", error);
                  }};
                  await performParallelTasks();
              }
            }
          }
        }
        else if (columnName === "Remarks")
        {
          console.log("Now editing remarks", newValue);
          if(newValue !== "")
          {
            const response = await axios.post(
              `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
              {
                purpose: 'addCancelRemarks',
                id: id,
                editedValue: newValue
              });
          }
          else
          {
            alert("No remarks added");
          }
        }
        else
        {
          console.log("Updated Particulars:", event.colDef.field, newValue);
          const response = await axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
            {
              purpose: 'edit',
              id: id,
              field: event.colDef.field,
              editedValue: newValue
            }
          )  
        }
        this.refreshChild(); 
    } catch (error) {
      console.error('Error during submission:', error);
      this.props.closePopup();
    }
  };

  refreshChild = async () => 
  {
    const { language } = this.props;
    
    console.log("RefreshChild called - fetching new data");
    
    // Save scroll information before fetching data
    const gridContainer = document.querySelector('.ag-body-viewport');
    const currentScrollTop = gridContainer ? gridContainer.scrollTop : 0;
    
    try {
      // Fetch new data
      const {data, data1} = await this.fetchCourseRegistrations(language);
      
      console.log("Fetched data length:", data?.length || 0);
      
      // Update original data state first
      this.setState({
        originalData: data || [],
        registerationDetails: data || []
      }, () => {
        console.log("Original data updated, generating row data");
        // Generate row data from the original data
        this.getRowData(data || []);
        
        // Re-apply current filters after data refresh
        console.log("Re-applying filters after data refresh");
        this.filterRegistrationDetails();
        
        // Restore scroll position
        if (gridContainer) {
          gridContainer.scrollTop = currentScrollTop;
        }
        
        this.props.closePopup();
      });
    } catch (error) {
      console.error("Error in refreshChild:", error);
      this.props.closePopup();
    }
  };

 // Update is called after the component has updated (re-rendered)
  componentDidUpdate(prevProps, prevState) {
    const { selectedLocation, selectedCourseType, searchQuery, selectedCourseName, selectedQuarter} = this.props;
    console.log("ComponentDidUpdate - Current Props:", { selectedLocation, selectedCourseType, searchQuery, selectedCourseName, selectedQuarter });
    console.log("ComponentDidUpdate - Previous Props:", { 
      selectedLocation: prevProps.selectedLocation, 
      selectedCourseType: prevProps.selectedCourseType, 
      searchQuery: prevProps.searchQuery, 
      selectedCourseName: prevProps.selectedCourseName, 
      selectedQuarter: prevProps.selectedQuarter 
    });
    
    // Check if the relevant props have changed
    if (
      selectedLocation !== prevProps.selectedLocation ||
      selectedCourseType !== prevProps.selectedCourseType ||
      selectedCourseName !== prevProps.selectedCourseName ||
      selectedQuarter !== prevProps.selectedQuarter ||
      searchQuery !== prevProps.searchQuery
    ) {
      console.log("Filter props changed - triggering filterRegistrationDetails");
      
      // If course type specifically changed, we need to update column definitions
      if (selectedCourseType !== prevProps.selectedCourseType) {
        console.log(`Course type filter changed from ${prevProps.selectedCourseType} to ${selectedCourseType} - updating column definitions`);
        // Update column definitions first, then filter - use current rowData
        this.setState({ 
          columnDefs: this.getColumnDefs(this.state.rowData) 
        }, () => {
          // Filter after column definitions are updated
          this.filterRegistrationDetails();
        });
      } else {
        // Call the filter method when other relevant props change
        this.filterRegistrationDetails();
      }
    }
  }

  
  sendDetails = async (id) =>
  {
    await this.props.generateSendDetailsConfirmationPopup(id);
  }

  filterRegistrationDetails() {
    const { section, selectedLocation, selectedCourseType, selectedCourseName, searchQuery, selectedQuarter } = this.props;
    console.log("FilterRegistrationDetails called with section:", section);
    console.log("Current state - originalData length:", this.state.originalData?.length || 0);

    if (section === "registration") {
      const { originalData } = this.state;

      if (!originalData || originalData.length === 0) {
        console.log("No original data available for filtering");
        // Set empty state when no data
        this.setState({
          registerationDetails: [],
          rowData: []
        });
        return;
      }

      console.log("Original Data sample:", originalData[0]);
      console.log("Filters Applied:", { selectedLocation, selectedCourseType, searchQuery, selectedCourseName, selectedQuarter });

      // Normalize the search query
      const normalizedSearchQuery = searchQuery ? searchQuery.toLowerCase().trim() : '';

      // Define filter conditions - fix the comparison strings
      const filters = {
        location: selectedLocation && selectedLocation !== "All Locations" ? selectedLocation : null,
        courseType: selectedCourseType && selectedCourseType !== "All Courses Types" ? selectedCourseType : null,
        courseName: selectedCourseName && selectedCourseName !== "All Courses Name" ? selectedCourseName : null,
        quarter: selectedQuarter && selectedQuarter !== "All Quarters" ? selectedQuarter : null,
        searchQuery: normalizedSearchQuery || null,
      };

      console.log("Active filters:", filters);

      // Apply filters step by step - create a copy to avoid mutation
      let filteredDetails = [...originalData];
      console.log("Starting with originalData length:", filteredDetails.length);

      // Apply location filter
      if (filters.location) {
        filteredDetails = filteredDetails.filter(data => {
          const courseLocation = data.course?.courseLocation;
          const matches = courseLocation === filters.location;
          if (!matches) {
            console.log(`Location filter: ${courseLocation} !== ${filters.location}`);
          }
          return matches;
        });
        console.log("After location filter:", filteredDetails.length);
      }

      // Apply course type filter
      if (filters.courseType) {
        filteredDetails = filteredDetails.filter(data => {
          const courseType = data.course?.courseType;
          const matches = courseType === filters.courseType;
          if (!matches) {
            console.log(`Course type filter: ${courseType} !== ${filters.courseType}`);
          }
          return matches;
        });
        console.log("After courseType filter:", filteredDetails.length);
      }
      
      // Apply course name filter
      if (filters.courseName) {
        filteredDetails = filteredDetails.filter(data => {
          const courseEngName = data.course?.courseEngName;
          const matches = courseEngName === filters.courseName;
          if (!matches) {
            console.log(`Course name filter: ${courseEngName} !== ${filters.courseName}`);
          }
          return matches;
        });
        console.log("After courseName filter:", filteredDetails.length);
      }

      // Apply quarter filter
      if (filters.quarter) {
        const beforeQuarterFilter = filteredDetails.length;
        filteredDetails = filteredDetails.filter(data => {
          const courseDuration = data.course?.courseDuration;
          if (!courseDuration) {
            console.log("Quarter filter: No course duration found");
            return false; // Skip if courseDuration is missing
          }
      
          try {
            const firstDate = courseDuration.split(' - ')[0]; // Extract "2 May 2025"
            const [day, monthStr, year] = firstDate.split(' '); // Split into components
        
            // Convert month string to a number
            const monthMap = {
              "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
              "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
            };        
        
            const month = monthMap[monthStr];
            if (!month || !year) {
              console.log(`Quarter filter: Invalid month/year - ${monthStr}/${year}`);
              return false; // Skip if month or year is missing
            }
      
            // Determine the quarter
            let quarter = "";
            if (month >= 1 && month <= 3) quarter = `Q1 ${year}`;
            if (month >= 4 && month <= 6) quarter = `Q2 ${year}`;
            if (month >= 7 && month <= 9) quarter = `Q3 ${year}`;
            if (month >= 10 && month <= 12) quarter = `Q4 ${year}`;
      
            const matches = quarter === filters.quarter;
            if (!matches) {
              console.log(`Quarter filter: ${quarter} !== ${filters.quarter}`);
            }
            return matches;
          } catch (error) {
            console.log("Quarter filter error:", error, "for duration:", courseDuration);
            return false;
          }
        });
        console.log(`After quarter filter (${filters.quarter}): ${filteredDetails.length} (was ${beforeQuarterFilter})`);
      }    

      // Apply search query filter
      if (filters.searchQuery) {
        const beforeSearchFilter = filteredDetails.length;
        filteredDetails = filteredDetails.filter(data => {
          const searchFields = [
            (data.participant?.name || "").toLowerCase(),
            (data.participant?.nric || "").toLowerCase(),
            (data.participant?.contactNumber || "").toLowerCase(),
            (data.participant?.email || "").toLowerCase(),
            (data.course?.courseLocation || "").toLowerCase(),
            (data.course?.courseType || "").toLowerCase(),
            (data.course?.courseEngName || "").toLowerCase(),
            (data.course?.courseChiName || "").toLowerCase(),
            (data.course?.courseDuration || "").toLowerCase(),
            (data.course?.payment || "").toLowerCase(),
            (data.status || "").toLowerCase(),
            (data.official?.receiptNo || "").toLowerCase(),
            // Include Marriage Preparation Programme fields in search
            (data.spouse?.name || "").toLowerCase(),
            (data.marriageDetails?.maritalStatus || "").toLowerCase(),
            (data.marriageDetails?.marriageDuration || "").toLowerCase(),
            (data.marriageDetails?.housingType || "").toLowerCase(),
            (data.marriageDetails?.typeOfMarriage || "").toLowerCase(),
            (data.spouse?.nric || "").toLowerCase(),
            (data.spouse?.mobile || data.spouse?.contactNumber || "").toLowerCase(),
            (data.spouse?.email || "").toLowerCase(),
            // Additional Marriage Preparation Programme search fields
            (data.marriageDetails?.grossMonthlyIncome || "").toLowerCase(),
            (data.marriageDetails?.hasChildren || "").toLowerCase(),
            (data.marriageDetails?.howFoundOut || "").toLowerCase(),
            (data.marriageDetails?.sourceOfReferral || "").toLowerCase(),
            // Marriage Preparation Programme consent fields for search
            (data.consent?.marriagePrepConsent1 ? 'yes' : 'no'),
            (data.consent?.marriagePrepConsent2 ? 'yes' : 'no'),
            (data.marriagePrepConsent1 ? 'yes' : 'no'),
            (data.marriagePrepConsent2 ? 'yes' : 'no')
          ];
          
          const matchFound = searchFields.some(field => field.includes(filters.searchQuery));
          if (matchFound) {
            const matchingFields = searchFields.filter(field => field.includes(filters.searchQuery));
            console.log(`Search match found for: "${filters.searchQuery}" in fields:`, matchingFields);
          }
          return matchFound;
        });
        console.log(`After search filter ("${filters.searchQuery}"): ${filteredDetails.length} (was ${beforeSearchFilter})`);
      }

      // Log filtered results
      console.log("Final Filtered Details:", filteredDetails.length, "entries");
      if (filteredDetails.length > 0) {
        console.log("Sample filtered entry:", filteredDetails[0]);
      }

      // Convert filtered data to row format
      const rowData = filteredDetails.map((item, index) => {
        try {
          return {
            id: item._id,
            sn: index + 1,  // Serial number (S/N)
            name: item.participant?.name || '',  // Participant's name
            contactNo: item.participant?.contactNumber || '',  // Contact number
            course: item.course?.courseEngName || '',  // Course English name
            courseChi: item.course?.courseChiName || '',  // Course Chinese name
            location: item.course?.courseLocation || '',  // Course location
            courseMode: item.course?.courseMode === "Face-to-Face" ? "F2F" : (item.course?.courseMode || ''),
            courseTime: item.course?.courseTime || '',  // Ensure courseTime is included
            paymentMethod: item.course?.payment || '',  // Payment method
            confirmed: item.official?.confirmed || false,  // Confirmation status
            paymentStatus: item.status || '',  // Payment status
            recinvNo: item.official?.receiptNo || '',  // Receipt number
            participantInfo: item.participant || {},  // Participant details
            courseInfo: item.course || {},  // Course details
            officialInfo: item.official || {},  // Official details
            refundedDate: item.official?.refundedDate || '', 
            agreement: item.agreement || '',
            registrationDate: item.registrationDate || '',
            sendDetails: item.sendingWhatsappMessage || false,
            remarks: item.official?.remarks || "",
            paymentDate: item.official?.date || "",
            // Marriage Preparation Programme specific fields - include all nested data
            marriageDetails: item.marriageDetails || null,
            spouse: item.spouse || null,
            consent: item.consent || null,
            marriagePrepConsent: item.marriagePrepConsent || null,
            // Quick display fields for Marriage Preparation Programme - always show actual values with multiple fallback paths
            spouseName: item.spouse?.name || item.spouseName || '',
            maritalStatus: item.marriageDetails?.maritalStatus || item.maritalStatus || '',
            intendedMarriageDate: item.marriageDetails?.marriageDuration || item.intendedMarriageDate || '',
            // Additional Marriage Preparation Programme fields for comprehensive display
            housingType: item.marriageDetails?.housingType || item.housingType || '',
            grossMonthlyIncome: item.marriageDetails?.grossMonthlyIncome || item.grossMonthlyIncome || '',
            typeOfMarriage: item.marriageDetails?.typeOfMarriage || item.typeOfMarriage || '',
            hasChildren: item.marriageDetails?.hasChildren || item.hasChildren || '',
            howFoundOut: item.marriageDetails?.howFoundOut || item.howFoundOut || '',
            sourceOfReferral: item.marriageDetails?.sourceOfReferral || item.sourceOfReferral || '',
            spouseNric: item.spouse?.nric || item.spouseNric || '',
            spouseContact: item.spouse?.mobile || item.spouse?.contactNumber || item.spouseContact || '',
            spouseEmail: item.spouse?.email || item.spouseEmail || '',
            // Marriage Preparation Programme consent fields
            marriagePrepConsent1: item.consent?.marriagePrepConsent1 || item.marriagePrepConsent1 || false,
            marriagePrepConsent2: item.consent?.marriagePrepConsent2 || item.marriagePrepConsent2 || false
          };
        } catch (error) {
          console.error("Error mapping row data for item:", item, error);
          return null;
        }
      }).filter(row => row !== null); // Remove any null entries from mapping errors

      console.log("Final Row Data length:", rowData.length);
      console.log("Marriage Preparation Programme entries in filtered data:", rowData.filter(row => row.courseInfo?.courseType === 'Marriage Preparation Programme').length);

      // Safely update state - ensure we have valid data
      const newState = {
        registerationDetails: filteredDetails,
        rowData: rowData
      };

      // Update column definitions if needed - pass the filtered row data
      const newColumnDefs = this.getColumnDefs(rowData);
      if (newColumnDefs && newColumnDefs.length > 0) {
        newState.columnDefs = newColumnDefs;
      }

      console.log("Updating state with:", { 
        filteredDetailsLength: newState.registerationDetails.length,
        rowDataLength: newState.rowData.length,
        hasColumnDefs: !!newState.columnDefs
      });

      // Update state
      this.setState(newState, () => {
        console.log("State updated successfully. New rowData length:", this.state.rowData.length);
        
        // Debug Marriage Preparation Programme data after filtering
        this.debugMarriagePrepData();
        
        // Force grid refresh if API is available - the rowData will be updated through React state
        if (this.gridApi && typeof this.gridApi.refreshCells === 'function') {
          console.log("Refreshing grid API");
          try {
            // In ag-Grid v33, rowData is managed through React state, just refresh cells
            this.gridApi.refreshCells();
          } catch (error) {
            console.warn("Error refreshing grid cells:", error);
          }
        } else {
          console.log("Grid API not available or refreshCells method not found");
        }
      });
    }
  }

  // Bulk update methods
  openBulkUpdateModal = () => {
    if (this.state.selectedRows.length === 0) {
      alert('Please select at least one row to update.');
      return;
    }
    this.setState({ showBulkUpdateModal: true });
  };

  closeBulkUpdateModal = () => {
    this.setState({ 
      showBulkUpdateModal: false,
      bulkUpdateStatus: '',
      bulkUpdateMethod: ''
    });
  };

  handleBulkUpdate = async () => {
    const { selectedRows, bulkUpdateStatus, bulkUpdateMethod } = this.state;
    
    if (!bulkUpdateStatus && !bulkUpdateMethod) {
      alert('Please select a status or payment method to update.');
      return;
    }
  
    this.props.showUpdatePopup(`Updating ${selectedRows.length} records... Please wait...`);
  
    try {
      // Prepare bulk update data
      const bulkUpdateData = {
        purpose: 'bulkUpdate',
        updates: selectedRows.map(row => ({
          id: row.id,
          paymentStatus: bulkUpdateStatus || null,
          paymentMethod: bulkUpdateMethod || null
        })),
        staff: this.props.userName
      };
  
      // Send single request to backend
      const response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`,
        bulkUpdateData
      );
  
      if (response.data.result === true) 
      {
        this.closeBulkUpdateModal();
        
        if (bulkUpdateStatus) 
        {
          // Update popup message for WooCommerce updates
          this.props.showUpdatePopup(`Database updated successfully. Now updating WooCommerce for ${selectedRows.length} records... Please wait...`);
          
          console.log(`Updating WooCommerce for ${selectedRows.length} records with status: ${bulkUpdateStatus}`);
        
          // Process WooCommerce updates one by one in sequence
          for (let i = 0; i < selectedRows.length; i++) {
            const row = selectedRows[i];
            try {
              // Update popup with current progress
              this.props.showUpdatePopup(`Updating WooCommerce... Processing record ${i + 1} of ${selectedRows.length}`);
              
              await this.updateWooCommerceForRegistrationPayment(
                row.courseChi || row.courseInfo?.courseChiName,
                row.course || row.courseInfo?.courseEngName,
                row.location || row.courseInfo?.courseLocation,
                bulkUpdateStatus
              );
            } catch (error) {
              console.error(`Failed to update WooCommerce for row ${row.id}:`, error);
              // Continue with next row even if one fails
            }
          }
          
          console.log('WooCommerce bulk updates completed');
          
          // Final success popup
          this.props.showUpdatePopup(`All updates completed successfully! ${selectedRows.length} records updated.`);
          
          // Close popup after a brief delay to show success message
          setTimeout(() => {
            this.props.closePopup();
            alert(`Successfully updated ${selectedRows.length} records.`);
          }, 1500);
        } else {
          this.props.closePopup();
          alert(`Successfully updated ${selectedRows.length} records.`);
        }
      } else {
        throw new Error(response.data.message || 'Bulk update failed');
      }
    } catch (error) {
      console.error('Error during bulk update:', error);
      this.props.closePopup();
      alert('Error occurred during bulk update. Please try again.');
    }
  };

  // Handle selection changes in the grid
  onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    this.setState({ selectedRows });
    
    // Force header refresh to update select all checkbox state
    setTimeout(() => {
      if (event.api && typeof event.api.refreshHeader === 'function') {
        event.api.refreshHeader();
      }
    }, 10);
  };

  // Grid API initialization
  onGridReady = (params) => {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    
    console.log("Grid API initialized successfully");
  };

  // Archive data method
  archiveData = async () => {
    const { registerationDetails } = this.state;
    const { selectedCourseType } = this.props;
    
    if (registerationDetails.length === 0) {
      alert('No data available to archive.');
      return;
    }

    try {
      // Check if there are any Marriage Preparation Programme entries in the current data
      const hasMarriagePrepData = registerationDetails.some(detail => 
        detail.course?.courseType === 'Marriage Preparation Programme'
      );

      // Determine if we should include Marriage Prep fields based on filter and data
      // Include Marriage Prep fields if:
      // 1. "All Courses Types" is selected AND there are Marriage Prep entries in the data, OR
      // 2. "Marriage Preparation Programme" is specifically selected as filter, OR  
      // 3. No specific course type filter is applied (default view) AND there are Marriage Prep entries
      const shouldIncludeMarriagePrepFields = (
        (selectedCourseType === "All Courses Types" && hasMarriagePrepData) ||
        (selectedCourseType === "Marriage Preparation Programme") ||
        (!selectedCourseType && hasMarriagePrepData)
      );

      // Prepare the data for Excel export
      const preparedData = [];

      // Define the base headers
      const baseHeaders = [
        "S/N", "Participant Name", "Participant NRIC", "Participant Residential Status", 
        "Participant Race", "Participant Gender", "Participant Date of Birth",
        "Participant Contact Number", "Participant Email", "Participant Postal Code", 
        "Participant Education Level", "Participant Work Status",
        "Course Type", "Course English Name", "Course Chinese Name", "Course Location",
        "Course Mode", "Course Price", "Course Duration", "Payment Method", 
        "Registration Date", "Agreement", "Payment Status", "Confirmation Status", 
        "Refunded Date", "WhatsApp Message Sent",
        "Staff Name", "Received Date", "Received Time", "Receipt/Invoice Number", "Remarks"
      ];

      // Marriage Preparation Programme specific headers - only add if there's Marriage Prep data
      const marriagePrepHeaders = [
        "Spouse Name", "Marital Status", "Marriage Duration", "Housing Type", 
        "Gross Monthly Income", "Type of Marriage", "Has Children", "How Found Out",
        "Source of Referral", "Spouse NRIC", "Spouse Contact", "Spouse Email",
        "Spouse Sex", "Spouse DOB", "Spouse Ethnicity", "Spouse Residential Status",
        "Spouse Marital Status", "Spouse Education", "Spouse Housing Type", "Spouse Postal Code",
        "I confirm that I have read and understood the Terms of Consent as set out in the link above", "I confirm that I have read and understood the Terms of Consent as set out in the link above"
      ];

      // Combine headers conditionally
      const headers = shouldIncludeMarriagePrepFields ? [...baseHeaders, ...marriagePrepHeaders] : baseHeaders;
      preparedData.push(headers);

      // Add the values from all registration details
      registerationDetails.forEach((detail, index) => {
        const baseRow = [
          index + 1,
          detail.participant.name,
          detail.participant.nric,
          detail.participant.residentialStatus,
          detail.participant.race,
          detail.participant.gender,
          detail.participant.dateOfBirth,
          detail.participant.contactNumber,
          detail.participant.email,
          detail.participant.postalCode,
          detail.participant.educationLevel,
          detail.participant.workStatus,
          detail.course.courseType,
          detail.course.courseEngName,
          detail.course.courseChiName,
          detail.course.courseLocation,
          detail.course.courseMode,
          detail.course.coursePrice,
          detail.course.courseDuration,
          detail.course.payment,
          detail.registrationDate,
          detail.agreement,
          detail.status,
          detail.official?.confirmed || false,
          detail.official?.refundedDate || "",
          detail.sendingWhatsappMessage || false,
          detail.official?.name || "",
          detail.official?.date || "",
          detail.official?.time || "",
          detail.official?.receiptNo || "",
          detail.official?.remarks || ""
        ];

        // Marriage Preparation Programme specific fields - only add if should include Marriage Prep fields
        const marriagePrepRow = shouldIncludeMarriagePrepFields ? [
          detail.spouseName || detail.spouse?.name || "",
          detail.maritalStatus || detail.marriageDetails?.maritalStatus || "",
          detail.intendedMarriageDate || detail.marriageDetails?.marriageDuration || "",
          detail.housingType || detail.marriageDetails?.housingType || "",
          detail.grossMonthlyIncome || detail.marriageDetails?.grossMonthlyIncome || "",
          detail.typeOfMarriage || detail.marriageDetails?.typeOfMarriage || "",
          detail.hasChildren || detail.marriageDetails?.hasChildren || "",
          detail.howFoundOut || detail.marriageDetails?.howFoundOut || "",
          detail.sourceOfReferral || detail.marriageDetails?.sourceOfReferral || "",
          detail.spouseNric || detail.spouse?.nric || "",
          detail.spouseContact || detail.spouse?.mobile || detail.spouse?.contactNumber || "",
          detail.spouseEmail || detail.spouse?.email || "",
          detail.spouseSex || detail.spouse?.sex || "",
          detail.spouseDob || detail.spouse?.dob || "",
          detail.spouseEthnicity || detail.spouse?.ethnicity || "",
          detail.spouseResidentialStatus || detail.spouse?.residentialStatus || "",
          detail.spouseMaritalStatus || detail.spouse?.maritalStatus || "",
          detail.spouseEducation || detail.spouse?.education || "",
          detail.spouseHousingType || detail.spouse?.housingType || "",
          detail.spousePostalCode || detail.spouse?.postalCode || "",
          (detail.marriagePrepConsent1 || detail.consent?.marriagePrepConsent1) ? "I confirm that my spouse/spouse-to-be and I understand and agree to the collection, use and disclosure of our Personal Information as set out in the link above" : "",
          (detail.marriagePrepConsent2 || detail.consent?.marriagePrepConsent2) ? "I confirm that I have read and understood the Terms of Consent as set out in the link above" : ""
        ] : [];

        // Combine row data conditionally
        const row = [...baseRow, ...marriagePrepRow];
        preparedData.push(row);
      });

      // Convert the prepared data into a worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(preparedData);

      // Create a new workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Archived Data");

      // Generate filename with current date and Marriage Prep indicator
      const date = new Date();
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
      const marriagePrepSuffix = shouldIncludeMarriagePrepFields ? '_with_marriage_prep' : '';
      const filterSuffix = selectedCourseType && selectedCourseType !== "All Courses Types" ? `_${selectedCourseType.replace(/\s+/g, '_')}` : '';
      const fileName = `archived_data_${formattedDate}${marriagePrepSuffix}${filterSuffix}`;

      // Generate a binary string
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      // Create a blob from the binary string
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Create a link element for downloading
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${fileName}.xlsx`;
      link.click();

      // Clean up
      window.URL.revokeObjectURL(link.href);

      this.props.closePopup();
      const marriagePrepCount = registerationDetails.filter(detail => 
        detail.course?.courseType === 'Marriage Preparation Programme'
      ).length;
      
      // Create more detailed alert message based on filter and data
      let alertMessage;
      if (shouldIncludeMarriagePrepFields && marriagePrepCount > 0) {
        const filterContext = selectedCourseType === "All Courses Types" ? "all course types" : selectedCourseType || "current filter";
        alertMessage = `Successfully archived ${registerationDetails.length} records from ${filterContext} (including ${marriagePrepCount} Marriage Preparation Programme entries with extended fields).`;
      } else if (selectedCourseType && selectedCourseType !== "All Courses Types") {
        alertMessage = `Successfully archived ${registerationDetails.length} records for ${selectedCourseType}.`;
      } else {
        alertMessage = `Successfully archived ${registerationDetails.length} records.`;
      }
      alert(alertMessage);

    } catch (error) {
      console.error('Error during archive:', error);
      this.props.closePopup();
      alert('Error occurred during archive. Please try again.');
    }
  };

  render() {
    const { selectedRows, showBulkUpdateModal, bulkUpdateStatus, bulkUpdateMethod, expandedRowIndex } = this.state;

    return (
      <div className="registration-payment-container">
        <div className="registration-payment-heading">
          <h2>Registration & Payment Details</h2>
        </div>

        <div className="button-row">
          {/* Show button when there are Marriage Preparation Programme entries in the data, but NOT when specifically filtering by Marriage Preparation Programme */}
          {this.state.rowData && 
           this.state.rowData.some(row => row.courseInfo?.courseType === 'Marriage Preparation Programme') && 
           this.props.selectedCourseType !== 'Marriage Preparation Programme' && (
            <button 
              className="toggle-btn" 
              onClick={this.toggleHideMarriagePrepFields}
              style={{
                backgroundColor: this.state.hideMarriagePrepFields ? '#4CAF50' : '#ff6b6b', // Reversed: Green when hidden, Red when shown
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px',
                fontSize: '14px',
                whiteSpace: "nowrap"
              }}
            >
              {this.state.hideMarriagePrepFields ? 'Show Marriage Prep Fields' : 'Hide Marriage Prep Fields'}
            </button>
          )}
          <button className="save-btn" onClick={() => this.archiveData()}>
            Archive Data
          </button>
         {this.props.role !== "Social Worker" && (
            <>
              <button className="export-btn" 
                      onClick={this.exportToLOP}
                      disabled={selectedRows.length === 0}>
                Export to LOP
              </button>
              <button 
                className="attendance-btn" 
                onClick={this.exportAttendance}
              >
                Export Attendance
              </button>
            </>
          )}
          {(this.props.role === "Social Worker" || this.props.role === "Admin" || this.props.role === "Sub Admin")  && (
            <button className="export-btn2" 
                    onClick={this.exportToMarriagePreparationProgramme}
                    disabled={selectedRows.length === 0}>
              Export to Marriage Preparation Programme
            </button>
          )}
          <button 
            className="bulk-update-btn" 
            onClick={this.openBulkUpdateModal}
            disabled={selectedRows.length === 0}
          >
            Bulk Update ({selectedRows.length})
          </button>
        </div>

        <div className="grid-container">
          <AgGridReact
            ref={this.gridRef}
            rowData={this.state.rowData}
            columnDefs={this.state.columnDefs}
            rowSelection="multiple"
            onGridReady={this.onGridReady}
            onSelectionChanged={this.onSelectionChanged}
            onCellValueChanged={this.onCellValueChanged}
            onCellClicked={this.handleValueClick}
            suppressRowClickSelection={true}
            pagination={true}
            paginationPageSize={this.state.rowData.length}
            domLayout="normal"
            getRowStyle={this.getRowStyle}
          />
        </div>
        
        {/* Bulk Update Modal */}
        {showBulkUpdateModal && (
          <div className="modal-overlay" onClick={this.closeBulkUpdateModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Bulk Update Selected Records</h3>
              <div className="bulk-update-options">
                <div className="update-section">
                  <label htmlFor="bulkStatus">Payment Status:</label>
                  <select
                    id="bulkStatus"
                    value={bulkUpdateStatus}
                    onChange={(e) => this.setState({ bulkUpdateStatus: e.target.value })}
                  >
                    <option value="">-- No Change --</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Refunded">Refunded</option>
                    <option value="Generating SkillsFuture Invoice">Generating SkillsFuture Invoice</option>
                    <option value="SkillsFuture Done">SkillsFuture Done</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              <div className="modal-buttons">
                <button className="update-btn" onClick={this.handleBulkUpdate}>
                  Update {selectedRows.length} Records
                </button>
                <button className="cancel-btn" onClick={this.closeBulkUpdateModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Row Detail View */}
        {(() => {
          console.log('Expanded Row Debug:', {
            expandedRowIndex,
            hasRowData: !!this.state.rowData,
            rowDataLength: this.state.rowData?.length || 0,
            isValidIndex: expandedRowIndex !== null && expandedRowIndex < (this.state.rowData?.length || 0)
          });
          
          return expandedRowIndex !== null && 
                 this.state.rowData && 
                 this.state.rowData.length > 0 && 
                 expandedRowIndex < this.state.rowData.length && (
               <div className="expanded-row-detail">
                  {this.renderDetailView(this.state.rowData[expandedRowIndex])}
                </div>
              );
        })()}
      </div>
    );
  }
}

export default RegistrationPaymentSection;