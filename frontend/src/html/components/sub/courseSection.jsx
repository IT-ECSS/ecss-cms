import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/courseSection.css';
import '../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
import * as XLSX from 'xlsx';

class CoursesSection extends Component {
    constructor(props) {
      super(props);
      this.state = {
        courses: [], // All fetched courses
        filteredCourses: [], // Courses filtered based on user inputs
        loading: false,
        columnDefs: this.getColumnDefs(),
        rowData: [],
        expandedRowIndex: null,
      };
      this.tableWrapperRef = React.createRef();
    }

    handleEntriesPerPageChange = (e) => {
      this.setState({
        entriesPerPage: parseInt(e.target.value, 10),
        currentPage: 1 // Reset to the first page when changing entries per page
      });
    }

    getColumnDefs = () => {
      // Base columns definition
      const columns = [
        {
          headerName: "Course ID",
          field: "courseId",
          width: 100,
        },
        {
          headerName: "Course Name",
          field: "courseName",
          width: 350,
        },
        {
          headerName: "Centre Location",
          field: "centreLocation",
          width: 150,
        },
        {
          headerName: "Course Mode",
          field: "courseMode",
          width: 150,
        },
        {
          headerName: "Current",
          field: "current",
          width: 100,
        },
        {
          headerName: "Projected",
          field: "projected",
          width: 100,
        },
        {
          headerName: "Maximum",
          field: "maximum",
          width: 150,
        },
        {
          headerName: "Status",
          field: "status",
          width: 200,
          cellRenderer: (params) => {
            const statusStyles = {
              Ongoing: "#FF6347",  // Red (Tomato)
              Available: "#32CD32",  // Green (LimeGreen)
              Ended: "#A9A9A9",  // Gray (DarkGray)
              Full: "#4682B4",  // Blue (SteelBlue)
            };
      
            const backgroundColor = statusStyles[params.value] || "#D3D3D3"; // Default light gray for unknown values
      
            return (
              <span
                style={{
                  fontWeight: "bold",
                  color: "white",
                  textAlign: "center",
                  display: "inline-block",
                  borderRadius: "20px",
                  paddingLeft: "30px",
                  paddingRight: "30px",
                  width: "fit-content",
                  lineHeight: "30px",
                  whiteSpace: "nowrap",
                  backgroundColor: backgroundColor
                }}
              >
                {params.value}
              </span>
            );
          }
        },
        {
          headerName: "Course Duration",
          field: "courseDuration",
          width: 250,
        },
        {
          headerName: "Course Timing",
          field: "courseTiming",
          width: 180,
        }
      ];
      // Only add "SkillsFuture Credit Eligibility" column if courseType is NSA
      if (this.props.courseType === 'NSA') {
        columns.push({
          headerName: "SkillsFuture Credit Eligibility",
          field: "eligibility",
          width: 250,
          cellRenderer: (params) => {
            const imageSrc = params.value
              ? "https://upload.wikimedia.org/wikipedia/commons/2/29/Tick-green.png" // ✅ Green Tick
              : "https://upload.wikimedia.org/wikipedia/commons/5/5f/Red_X.svg"; // ❌ Red Cross
        
            return <img src={imageSrc} alt={params.value ? 'Eligible' : 'Not Eligible'} width="20" height="20" />;
          }
        });
      }
    
      return columns;
    };
    
    // Method to get all languages
    getAllLanguages= async(courses)  =>  {
      return [...new Set(courses.map(course => {
        var courseDetails = this.getSelectedDetails(course.short_description);
        console.log("Course Details123:", JSON.parse(courseDetails).language);
        return JSON.parse(courseDetails).language;
      }))];
    }

    async fetchCourses(courseType) {
      try {
        this.setState({ loading: true });
        var response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/courses/`, { courseType });
        var courses = response.data.courses;
        console.log("From Django:", courses);
        

        // Extract locations and languages
        var locations = await this.getAllLocations(courses);
        var languages = await this.getAllLanguages(courses);

        console.log("Locations123:", locations);
        console.log("Languages123:", languages);

        this.props.passDataToParent(locations, languages);

        // Update state with fetched data
        this.setState({
          courses: courses,
          filteredCourses: courses, // Initially, show all fetched courses
          loading: false,
          locations: locations, // Set locations in state
          languages: languages  // Set languages in state
        });

        this.props.closePopup();
        await this.props.getTotalNumberofCourses(courses.length);

        this.getRowData(courses);
      } catch (error) {
        console.error('Error fetching data:', error);
        this.setState({ loading: false });
        this.props.closePopup();
      }
    }

  getRowData = (filteredCourse) => 
  {
    console.log("Get Row Data", filteredCourse);
    const locationMap = {
      "Tampines 253 Centre": "T-253",
      "Pasir Ris West Wellness Centre": "PRW",
      "Tampines North Community Centre": "TNCC",
      "CT Hub": "CTH"
    };        

    const rowData = filteredCourse.map((item, index) => {
      console.log("Course Details:", item);
      var displayedDetails = JSON.parse(this.getSelectedDetails(item.short_description, item.stock_quantity));
      console.log("Displayed Details:", displayedDetails);
    
      // Split the name by <br/> or <br /> and use a ternary operator
      const splitName = item.name.split(/<br\s*\/?>/);
      console.log("Split Name:", splitName);

  
      return {
        courseId: item.id,
        courseName: splitName.length === 3 ? splitName[1] : (splitName.length === 2 ? splitName[0] : item.name),
        centreLocation: splitName.length === 3 ? locationMap[splitName[2].replace(/[()]/g, '').trim()] || splitName[2].replace(/[()]/g, '').trim() : splitName.length === 2 ? locationMap[splitName[1].replace(/[()]/g, '').trim()] || splitName[1].replace(/[()]/g, '').trim(): '',
        courseMode: item?.attributes?.[2]?.options?.[0] === "Face-to-Face" ? "F2F" : item?.attributes?.[2]?.options?.[0],
        current: item.stock_quantity,
        projected: displayedDetails.vacancies,
        maximum: displayedDetails.vacancies === "" ? "" : Math.ceil(parseInt(displayedDetails.vacancies) * 1.5),
        noLesson: displayedDetails.noOfLesson,
        language: displayedDetails.language,
        status: displayedDetails.status,
        courseDuration: displayedDetails.startDate+" - "+displayedDetails.endDate,
        courseTiming: displayedDetails.startTime+" - "+displayedDetails.endTime,
        eligibility: displayedDetails.eligibility
      };
    });
  
    console.log("All Rows Data:", rowData);
  
    // Set the state with the new row data
    this.setState({ courses: rowData, filteredCourse: rowData, rowData });
  };
  
    getSelectedDetails(short_description, vacancy) {
      let array = short_description.split('<p>');
      if (array[0] === '') {
        array.shift();
    }

  array = array.flatMap(element => element.split('</p>')).filter(element => element.trim() !== '');

  let noOfLesson = array.find(item => item.toLowerCase().includes("lesson")) || "";
  noOfLesson = noOfLesson.split("<br />")[1] || "";
  noOfLesson = noOfLesson.replace(/\n|<b>|<\/b>/g, "").match(/\d+/);
  noOfLesson = noOfLesson ? parseInt(noOfLesson[0], 10) : "";

  console.log("No. of Lesson:", noOfLesson);

  let language = array
    .map(item => item.replace(/\n|<b>|<\/b>/g, ""))
    .find(item => item.toLowerCase().includes("language")) || "";
  language = language.split("<br />").pop()?.trim() || "";

  let vacancies = array
    .map(item => item.replace(/\n|<b>|<\/b>/g, ""))
    .find(item => item.toLowerCase().includes("vacancy")) || "";
  vacancies = vacancies.split("<br />").pop()?.trim().split("/")[2] || "";
  let vacanciesMatch = vacancies.match(/\d+/) ? parseInt(vacancies.match(/\d+/)[0], 10) : "";

  let startDate = array
    .map(item => item.replace(/\<strong>|\<\/strong>|\n|<b>|<\/b>/g, ""))
    .find(item => item.toLowerCase().includes("start date")) || "";
  startDate = startDate.split("<br />").pop()?.trim() || "";
  let [day, monthStr, year] = startDate.split(" ");
  day = parseInt(day) || 1;
  year = parseInt(year) || new Date().getFullYear();
  let month = this.changeMonthToNumber(monthStr || "");

  let endDate = array
    .map(item => item.replace(/\<strong>|\<\/strong>|\n|<b>|<\/b>/g, ""))
    .find(item => item.toLowerCase().includes("end date")) || "";
  endDate = endDate.split("<br />").pop()?.trim() || "";
  let [day1, monthStr1, year1] = endDate.split(" ");
  day1 = parseInt(day1) || 1;
  year1 = parseInt(year1) || new Date().getFullYear();
  let month1 = this.changeMonthToNumber(monthStr1 || "");

  console.log("Course End Date:", startDate, endDate);

  let timing = array
    .map(item => item.replace(/\<strong>|\<\/strong>|\n|<b>|<\/b>/g, ""))
    .find(item => item.toLowerCase().includes("lesson schedule")) || "";
  timing = timing.split("<br />").pop()?.trim() || "";

  let startTime = "";
  let endTime = "";

  if (timing) {
    if (timing.includes("&#8211;")) {
      [startTime, endTime] = timing.split("&#8211;").map(t => t.trim());
    } else if (timing.includes("–")) {
      [startTime, endTime] = timing.split("–").map(t => t.trim());
    }

    if (startTime.includes(",")) {
      startTime = startTime.split(",")[1]?.trim() || startTime;
    }
  }

  const startDateTime = new Date(year, month - 1, day);
  const { hours: startHours, minutes: startMinutes } = this.convertTo24HourWithHrs(startTime || "") || { hours: 0, minutes: 0 };
  startDateTime.setHours(startHours);
  startDateTime.setMinutes(startMinutes);
  startDateTime.setSeconds(0);

  const endDateTime = new Date(year1, month1 - 1, day1);
  const { hours: endHours, minutes: endMinutes } = this.convertTo24HourWithHrs(endTime || "") || { hours: 0, minutes: 0 };
  endDateTime.setHours(endHours);
  endDateTime.setMinutes(endMinutes);
  endDateTime.setSeconds(0);

  console.log("Start Date Course:", year, month, day, startDateTime);
  console.log("End Date Time:", endDate, endDateTime);

  let status = "";
  const currentDate = new Date();

  if (vacancy === 0) {
    status = "Full";
  } else if (vacancy > 0) {
    if (currentDate < startDateTime) {
      status = "Available";
    } else if (currentDate >= endDateTime) {
      status = "Ended";
    } else {
      status = "Ongoing";
    }
  }

  startDate = this.shorternMonth(startDate || "");
  endDate = this.shorternMonth(endDate || "");

  return JSON.stringify({
    noOfLesson: noOfLesson || "",
    language: language || "",
    vacancies: vacanciesMatch || "",
    startDate: startDate || "",
    endDate: endDate || "",
    startTime: startTime || "",
    endTime: endTime || "",
    status: status || "",
    eligibility: short_description.includes("SkillsFuture")
  });
}

    
  courseNameAndDetails(product_name) {
    var regex = /<br\s*\/?>/gi;
    var array = product_name.split(regex);
    if (array.length === 3) {
      array[2] = array[2].replace(/[()]/g, '');
      return { "engName": array[1], "chiName": array[0], "location": array[2] };
    }
    if (array.length === 2) {
      array[1] = array[1].replace(/[()]/g, '');
      return { "engName": array[0], "chiName": array[0], "location": array[1] };
    }
  }

  // Method to get all locations
  getAllLocations = async(courses)  => {
    return [...new Set(courses.map(course => {
      var nameDetails = this.courseNameAndDetails(course.name);
      return nameDetails.location;
    }))];
  }
  
  updateRowData(paginatedDetails) {
    this.setState({ filteredCourse: paginatedDetails });
  }
  
  filterCourses() {
    const { section, selectedLocation, searchQuery } = this.props;
    console.log("Section:", section);
  
    if (section === "courses") {
      const { courses } = this.state;
      console.log("Original Data:", courses);
      console.log("Get Row Data");
  
      const locationMap = {
        "T-253": "Tampines 253 Centre",
        "PRW": "Pasir Ris West Wellness Centre",
        "TNCC": "Tampines North Community Centre",
        "CTH": "CT Hub"
      };
  
      let filteredDetails = courses;
  
      // If you want to filter by location
      if (selectedLocation && selectedLocation !== "All Locations") {
        filteredDetails = filteredDetails.filter(item => {
          return locationMap[item.centreLocation] === selectedLocation;
        });
      }

      // Normalize search query to lowercase for case-insensitive comparison
      const normalizedSearchQuery = searchQuery ? searchQuery.toLowerCase().trim() : '';

      // Apply search query if it's provided
      if (normalizedSearchQuery) {
        filteredDetails = filteredDetails.filter(item => {
          // Get location full name safely
          //const locationFullName = locationMap[item.centreLocation] || item.centreLocation || '';
          
          // Check all fields that could be searched
          return (
            // Text fields
            (item.courseName.toLowerCase() && item.courseName.toLowerCase().includes(normalizedSearchQuery))
          );
        });
      }
    
      // Map filteredDetails to rowData
      const rowData = filteredDetails.map((item) => {
        console.log("Filtered Course Details:", item);
        console.log("Maximum Capacity", item.maximum);
        // Return mapped data
        return {
          courseId: item.courseId,
          courseName: item.courseName,
          centreLocation: item.centreLocation,  // Only display the code like "T-253"
          courseMode: item?.attributes?.[2]?.options?.[0] === "Face-to-Face" ? "F2F" : item?.attributes?.[2]?.options?.[0],
          noLesson: item.noLesson,
          current: item.current,
          projected: item.projected,
          maximum: item.maximum,
          status: item.status,
          courseDuration: item.courseDuration,
          courseTiming: item.courseTiming,
          language: item.language,
          eligibility: item.eligibility
        };
      });
  
      console.log(" :", rowData);
  
      this.setState({ rowData });
    }
  }
  
  // Function to get CSRF token from cookies
  getCsrfToken = async () => 
  {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(`${name}=`)) {
        return cookie.substring(name.length + 1);
      }
    }
    return null;
  };

  // Axios instance with CSRF token attached
  axiosInstance = axios.create({
    baseURL: `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/`,
    withCredentials: true
  });
  

  componentDidMount = async () => 
  {
    // Attach CSRF token to Axios request headers
    this.axiosInstance.interceptors.request.use(config => {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;  // Attach CSRF token to headers
      }
      return config;
    });
  
    const { courseType } = this.props;
  
    // Fetch data if not already fetched
    if (courseType && !this.state.dataFetched) {
      await this.fetchCourses(courseType);
    }
  };
    
  componentDidUpdate(prevProps)
  {
    var { courseType, selectedLanguage, selectedLocation, searchQuery, language } = this.props;

    // Check if any of the relevant props have changed
    if (
      courseType !== prevProps.courseType
    ) {
      this.setState({ filteredCourses: [], columnDefs: this.getColumnDefs() });
      this.fetchCourses(courseType);
    }
    else if (
      selectedLanguage !== prevProps.selectedLanguage ||
      selectedLocation !== prevProps.selectedLocation ||
      searchQuery !== prevProps.searchQuery 
    ) {
      this.filterCourses(); // Filter courses based on updated props
    }
  }
    
  changeMonthToNumber(month) {
    const monthMap = {
      'January': 1,
      'February': 2,
      'March': 3,
      'April': 4,
      'May': 5,
      'June': 6,
      'July': 7,
      'August': 8,
      'September': 9,
      'October': 10,
      'November': 11,
      'December': 12,
      '一月': 1,
      '二月': 2,
      '三月': 3,
      '四月': 4,
      '五月': 5,
      '六月': 6,
      '七月': 7,
      '八月': 8,
      '九月': 9,
      '十月': 10,
      '十一月': 11,
      '十二月': 12,
    };
  
    return monthMap[month] || 0; // Return 0 for invalid month
  }

  convertTo24HourWithHrs(time12) {
    // Match hours, optional separator (: or .), minutes, and AM/PM
    const match = time12.match(/(\d{1,2})[:.]?(\d{2})?\s?(am|pm)/i);
    if (!match) return { hours: null, minutes: null }; // Return null if invalid format
  
    let [, hours, minutes, modifier] = match;
    hours = parseInt(hours, 10);
    minutes = minutes ? parseInt(minutes, 10) : 0; // Default minutes to 0 if not provided
  
    if (modifier.toLowerCase() === "pm" && hours < 12) {
      hours += 12; // Convert PM hours
    } else if (modifier.toLowerCase() === "am" && hours === 12) {
      hours = 0; // Midnight case
    }
  
    console.log("24 hr Format11:", hours, "Minutes11:", minutes);
    return { hours, minutes };
  }
  
  
  
  shorternMonth(dateString)
  {
    const date = new Date(dateString);
    const day = date.getDate(); // Extract the day
    const month = date.toLocaleString("en-US", { month: "short" }); // Shortened month
    const year = date.getFullYear(); // Full year
    return `${day} ${month} ${year}`; // Combine into the desired format
  }

  handleValueClick = async (event) =>
  {
    console.log("handleValueClick");

    const rowIndex = event.rowIndex; // Get the clicked row index
    const columnName = event.colDef.headerName;
    const expandedRowIndex = this.state.expandedRowIndex;

    try {
      if(columnName === "Course Name")
        {
          // Optional: Handle additional logic here if necessary
          console.log("Cell clicked", event);
          // Check if clicked on a row and handle expansion
          if (expandedRowIndex === rowIndex) {
            // If the same row is clicked, collapse it
            this.setState({ expandedRowIndex: null });
          } else {
            // Expand the new row
            this.setState({ expandedRowIndex: rowIndex });
          }
        }
      }
      catch (error) {
        console.error('Error during submission:', error);
      }
    }

  // This function exports data to Excel using the XLSX library
  saveData = async (rowData) => {
    console.log("Course Data:", rowData);
    
    try {
      // Define custom headers
      const customHeaders = [
        'Course Id', 
        'Course Name', 
        'Course Mode', 
        'Current Capacity', 
        'Projected Capacity', 
        'Maximum Capacity', 
        'No. of Lesson', 
        'Language', 
        'Status', 
        'Course Duration', 
        'Course Timing', 
        'SkillsFuture Eligibility'
      ];
      
      // Map data fields to our custom headers
      const worksheetData = [customHeaders]; // Start with headers
      
      rowData.forEach(item => {
        const rowValues = [
          item.courseId,
          item.courseName,
          item.courseMode || '',
          item.current,
          // Convert projected from ["12"] to 12
          Array.isArray(item.projected) ? parseInt(item.projected[0]) : item.projected,
          item.maximum,
          item.noLesson,
          item.language,
          item.status,
          item.courseDuration,
          item.courseTiming,
          item.eligibility === true ? '✓' : item.eligibility === false ? '✗' : item.eligibility
        ];
        
        worksheetData.push(rowValues);
      });
      
      // Create a new workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-fit columns (basic width setting)
      const cols = customHeaders.map(() => ({ wch: 15 })); // Set default width
      worksheet['!cols'] = cols;
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');
      
      // Generate Excel file and download
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      const fileName = `Course_Listing_${formattedDate}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      
      console.log("Excel export completed successfully");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  render() 
  {
    ModuleRegistry.registerModules([AllCommunityModule]);  
    return (
      <div className="nsa-course-container">
        <div className="nsa-course-heading">
          <h1 style={{ textAlign: 'center' }}>
            {this.props.courseType === "NSA" ? "NSA Courses" : this.props.courseType === "ILP" ? "ILP Courses" : this.props.courseType === "Marriage Preparation Programme" ? "Marriage Preparation Programme" : this.props.courseType === "Talks And Seminar" ? "Talks And Seminar" : "Courses"}
          </h1>
          <div className="button-row4">
            <button className="save-btn" onClick={() => this.saveData(this.state.rowData)}>
              Export To Excel
            </button>
          </div>
            <div className="course-table-wrapper">
              <AgGridReact
                columnDefs={this.state.columnDefs}
                rowData={this.state.rowData}
                domLayout="normal"
                statusBar={false}
                pagination={true}
                paginationPageSize={this.state.rowData.length}
                defaultColDef={{
                  resizable: true, // Make columns resizable
                }}
                sortable={true} 
                onCellClicked={this.handleValueClick}
              />
            </div>
        </div>
        {this.state.expandedRowIndex !== null && (
            <div
            style={{
              padding: '10px',
              backgroundColor: '#F9E29B',
              maxWidth: '1320px',
              width: '1320px', 
              height: 'fit-content',
              borderRadius: '15px', // Make the border more rounded
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', // Optional: Add a subtle shadow for a floating effect
            }}
            >
              {/* Custom content you want to display */}
              <p style={{textAlign:"left"}}><h2 style={{color:'#000000'}}>More Information</h2></p>
              <p style={{textAlign:"left"}}>
                <strong>No Of Lesson: </strong>{this.state.rowData[this.state.expandedRowIndex].noLesson+" Lesson(s)"}
              </p>
              <p style={{textAlign:"left"}}>
                <strong>Languages: </strong>{this.state.rowData[this.state.expandedRowIndex].language}
              </p>
            </div>
          )} 
      </div>
    );
  }  
}

export default CoursesSection;
