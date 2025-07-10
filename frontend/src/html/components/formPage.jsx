import React, { Component } from 'react';
import '../../css/formPage.css';
import '../../css/myinfo-testing.css';
import FormDetails from './sub/registrationForm/formDetails';
import PersonalInfo from './sub/registrationForm/personalInfo';
import CourseDetails from './sub/registrationForm/courseDetails';
import AgreementDetailsSection from './sub/registrationForm/agreementDetails';
import SubmitDetailsSection from './sub/registrationForm/submitDetails';
import axios from 'axios';
import SingPassButton from './sub/SingPassButton';
import Popup from './popup/popupMessage';
import RealTimeMyInfoErrorHandler from '../../services/RealTimeMyInfoErrorHandler';
import MyInfoStatusIndicator from './MyInfoStatusIndicator';

// Constant to enable/disable MyInfo error testing
const FORCE_MYINFO_ERROR = false; // Set to true to force MyInfo errors for testing

class FormPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentSection: 0,
      loading: false,
      isAuthenticated: false, // Remove the hardcoded true value
      singPassPopulatedFields: {}, // Add this to track SingPass populated fields
      // Add MyInfo error handling state
      myInfoError: false,
      showMyInfoErrorModal: false,
      myInfoErrorMessage: '',
      // Real-time monitoring state
      myInfoServiceStatus: 'unknown',
      networkOnline: navigator.onLine,
      showStatusIndicator: true,
      serviceRecommendations: [],
      formData: {
        englishName: '',
        chineseName: '',
        location: '',
        nRIC: '',
        rESIDENTIALSTATUS: '',
        rACE: '',
        gENDER: '',
        dOB: '',
        cNO: '',
        eMAIL: '',
        address: '',
        postalCode: '',
        eDUCATION: '',
        wORKING: '',
        courseDate: '',
        agreement: '',
        bgColor: '',
        courseMode: '',
        courseTime: ''
      },
      validationErrors: {}
    };

    // Initialize real-time error handler
    this.myInfoErrorHandler = new RealTimeMyInfoErrorHandler({
      enableRealTimeMonitoring: true,
      enableProactiveChecking: true,
      enableAutoRetry: true,
      maxRetryAttempts: 3
    });

    // Set up error handler listeners
    this.setupErrorHandlerListeners();
  }

  // Check if user is authenticated with SingPass
  checkSingPassAuthentication = () => {
    try {
      const userDataJson = sessionStorage.getItem('singpass_user_data_json');
      const accessToken = sessionStorage.getItem('singpass_access_token');
      
      if (userDataJson && accessToken) {
        const userData = JSON.parse(userDataJson);
        return userData && userData.name;
      }
      return false;
    } catch (error) {
      console.error('Error checking SingPass authentication:', error);
      return false;
    }
  };

  // Handle manual proceed without SingPass (optional)
  handleProceedWithoutSingPass = () => {
    this.setState({ 
      isAuthenticated: true,
      currentSection: 1 // Move to next section
    });
  };

  formatRace = (race) => {
    if (!race) return '';

    // If already formatted in Chinese/English mix, return as is
    if (
      typeof race === 'string' &&
      (race.includes('华') || race.includes('印') || race.includes('马') || race.includes('其他'))
    ) {
      return race;
    }

    // Default to OT unless we find a valid code
    let raceCode = 'OT';

    // Try to extract race code from structured object
    if (typeof race === 'object') {
      if (race.code) {
        raceCode = race.code;
      } else if (race.value) {
        raceCode = race.value;
      }
    } else if (typeof race === 'string') {
      raceCode = race;
    }

    const raceMap = {
      'CN': 'Chinese 华',
      'IN': 'Indian 印',
      'MY': 'Malay 马',
      'OT': 'Others 其他'
    };

    return raceMap[raceCode] || raceMap['OT'];
  };


  // Add helper function to format gender
  formatGender = (gender) => {
    console.log("Formatting gender:", gender);
    if (!gender) return '';
    
    // Handle if gender is already formatted
    if (typeof gender === 'string' && (gender.includes('男') || gender.includes('女'))) {
      return gender;
    }
    
    // Extract value if it's a SingPass structured object
    let genderCode = gender.code;
    if (typeof gender === 'object' && gender.value !== undefined) {
      genderCode = gender.code;
    }
    
    // Format according to your requirements
    const genderMap = {
      'M': 'M 男',
      'F': 'F 女'
    };
    
    return genderMap[genderCode] || genderCode;
  };

  // Updated formatResidentialStatus method to handle the classification property correctly
  formatResidentialStatus = (status) => {
    console.log("Residential Status:", status);
    
    if (!status) return '';
    
    // Handle if status is already formatted
    if (typeof status === 'string' && (status.includes('新加坡公民') || status.includes('永久居民'))) {
      return status;
    }
    
    // Extract the correct status code from SingPass structured object
    let statusCode = status;
    if (typeof status === 'object' ) {
      // Use classification if available, otherwise use code
      statusCode = status.classification || status.code || status.value;
    }
    
    console.log("Status Code:", statusCode);
    
    // Format according to your requirements
    const statusMap = {
      'SC': 'SC 新加坡公民',
      'C': 'SC 新加坡公民',
      'PR': 'PR 永久居民',
      'P': 'PR 永久居民'
    };
    
    return statusMap[statusCode] || statusCode;
  };

  // Add helper function to extract mobile number properly
  extractMobileNumber = (mobileData) => {
    if (!mobileData) return '';
    
    // Handle SingPass mobile structure: {areacode, prefix, nbr}
    if (typeof mobileData === 'object' && mobileData.nbr) {
      // Extract just the number from nbr.value
      if (mobileData.nbr.value) {
        return mobileData.nbr.value;
      }
      return mobileData.nbr;
    }
    
    // Handle simple string/number
    if (typeof mobileData === 'string' || typeof mobileData === 'number') {
      let mobile = String(mobileData).trim();
      // Remove +65 country code if present
      if (mobile.startsWith('+65')) {
        mobile = mobile.substring(3);
      }
      if (mobile.startsWith('65') && mobile.length === 10) {
        mobile = mobile.substring(2);
      }
      return mobile;
    }
    
    return '';
  };

  componentDidMount = async () => {
    window.scrollTo(0, 0);

    // Development: Add keyboard shortcut for error testing
    if (process.env.NODE_ENV === 'development') {
      this.handleKeyPress = (event) => {
        // Ctrl+Shift+E to trigger MyInfo error
        if (event.ctrlKey && event.shiftKey && event.key === 'E') {
          console.log('🧪 Keyboard shortcut triggered: MyInfo error simulation');
          this.simulateMyInfoError();
        }
      };
      
      document.addEventListener('keydown', this.handleKeyPress);
      console.log('🧪 Development mode: Press Ctrl+Shift+E to simulate MyInfo error');
    }
    
    // Check URL parameters for section override and course link
    const params = new URLSearchParams(window.location.search);
    let link = decodeURIComponent(params.get("link"));
    const sectionParam = params.get('section');
    
    // Decode the link if it exists in URL
    if (link) {
      try {
        link = decodeURIComponent(link);
        console.log('Decoded course link from URL:', link);
        // Save the decoded link to sessionStorage
        sessionStorage.setItem("courseLink", link);
        console.log('Saved decoded course link to sessionStorage:', link);
      } catch (error) {
        console.error('Error decoding URL:', error);
        // Fallback to original link if decoding fails
        sessionStorage.setItem("courseLink", link);
      }
    } else {
      // If no link in URL, try to get from sessionStorage
      link = sessionStorage.getItem("courseLink");
      console.log('Retrieved course link from sessionStorage:', link);
    }
    
    // Set initial section based on URL parameter or default to 0
    const initialSection = sectionParam ? parseInt(sectionParam) : 0;
    
    console.log('Final Course Link:', link);
    console.log('Section Parameter:', sectionParam);
    console.log('Initial Section:', initialSection);
    
    // Check if user is already authenticated with SingPass
    const isAuthenticatedWithSingPass = this.checkSingPassAuthentication();
    
    if (isAuthenticatedWithSingPass) {
      console.log('User already authenticated with SingPass');
      this.setState({ 
        isAuthenticated: true, 
        loading: false,
        currentSection: initialSection // Set section from URL parameter
      });
      
      // Pre-populate form with SingPass data
      this.populateFormWithSingPassData();
    } else {
      console.log('User not authenticated, proceeding without SingPass data');
      this.setState({ 
        isAuthenticated: false,
        currentSection: initialSection // Set section from URL parameter
      });
    }

    // Load course data with the decoded link
    await this.loadCourseData(link);
  };

  // Add method to navigate with section parameter while preserving course link
  navigateToSection = (section) => {
    const params = new URLSearchParams(window.location.search);
    
    // Ensure course link is always present in URL
    const courseLink = sessionStorage.getItem("courseLink");
    if (courseLink) {
      // Encode the course link for URL safety
      params.set('link', decodeURIComponent(courseLink));
    }
    
    params.set('section', section);
    const newUrl = `${window.location.pathname}?${decodeURIComponent(params.toString())}`;
    window.history.pushState(null, '', newUrl);
    this.setState({ currentSection: section });
  };

  // Update loadCourseData to handle both encoded and decoded links
  loadCourseData = async (link) => {
    // Use provided link or try to get from sessionStorage
    if (!link) {
      link = sessionStorage.getItem("courseLink");
    }
    
    console.log('Loading course data with link:', link);

    if (link) {
      // Ensure the link is properly decoded for comparison
      let decodedLink = link;
      try {
        // Try to decode if it appears to be encoded
        if (link.includes('%')) {
          decodedLink = decodeURIComponent(link);
        }
      } catch (error) {
        console.warn('Could not decode link, using original:', error);
        decodedLink = link;
      }
      
      console.log('Decoded course link for processing:', decodedLink);
      
      // Fetching courses
      var courseType = "";
      var allCourses = await this.fetchCourses(courseType);
      console.log("All Courses:", allCourses);

      // Function to find the course by name
      function findCourseByName(courseList) {
        return courseList.find(course => {
          // Decode both the input link and the course permalink for comparison
          const coursePermalink = decodeURIComponent(course.permalink);
          console.log("Comparing:");
          console.log("Input Link:", decodedLink);
          console.log("Course Permalink:", coursePermalink);
          
          return decodedLink === coursePermalink;
        });
      }

      // Find the matching course
      var matchedCourse = findCourseByName(allCourses);
      console.log("Matched Course:", matchedCourse);

      if (matchedCourse) {
        // Robust extraction of course type
        let type = '';
        if (
          matchedCourse.categories &&
          Array.isArray(matchedCourse.categories) &&
          matchedCourse.categories[1] &&
          typeof matchedCourse.categories[1].name === 'string'
        ) {
          const nameParts = matchedCourse.categories[1].name.split(":");
          if (nameParts.length > 1 && typeof nameParts[1] === 'string') {
            type = nameParts[1].trim();
          } else {
            type = nameParts[0].trim();
          }
        } else if (
          matchedCourse.categories &&
          Array.isArray(matchedCourse.categories) &&
          matchedCourse.categories[0] &&
          typeof matchedCourse.categories[0].name === 'string'
        ) {
          // Fallback to first category name if second is missing
          type = matchedCourse.categories[0].name.trim();
        } else {
          type = '';
        }
        console.log("Course Type:", type);
        
        // Setting background color based on course type
        if (type === 'ILP') {
          this.setState({ bgColor: '#006400' });
        } else if (type === 'NSA') {
          this.setState({ bgColor: '#003366' });
        } else if (type === 'Marriage Preparation Programme') {
          this.setState({ bgColor: '#f5f5f5', formContainerBg: '#f5f5f5' }); // Set both page and form-container bg
        }
        
        let selectedLocation = matchedCourse.attributes[1].options[0];
        selectedLocation = selectedLocation === 'CT Hub' ? 'CT Hub' :
                          selectedLocation === '恩 Project@253' ? 'Tampines 253 Centre' :
                          selectedLocation === 'Pasir Ris West' ? 'Pasir Ris West Wellness Centre' :
                          selectedLocation === 'Tampines North CC' ? 'Tampines North Community Centre' :
                          selectedLocation;
        
        console.log("Selected Course Details:", matchedCourse.name.split(/<br\s*\/?>/));
        console.log("Selected Course Price:", matchedCourse.price);
        const shortDescription = matchedCourse.short_description;
        console.log("Short Description:", shortDescription);

        let courseMode = '';
        if (
          matchedCourse &&
          Array.isArray(matchedCourse.attributes) &&
          matchedCourse.attributes[2] &&
          Array.isArray(matchedCourse.attributes[2].options) &&
          matchedCourse.attributes[2].options.length > 0
        ) {
          courseMode = matchedCourse.attributes[2].options[0];
        }

        console.log("Course Mode:", courseMode);

        // Parse course duration
        const paragraphs = shortDescription.split("<p>");
        const startDateParagraph = paragraphs[paragraphs.length - 2];
        const endDateParagraph = paragraphs[paragraphs.length - 1];

        // Extract course timing
        let courseTime = '';
        try {
          if (paragraphs && paragraphs.length >= 3) {
            let timingParagraph = paragraphs[paragraphs.length - 3];
            console.log("Timing Paragraph", timingParagraph);
            
            // Decode entities if needed
            if (!timingParagraph.includes("–")) {
              timingParagraph = this.decodeHtmlEntities(timingParagraph);
            }
            
            // Updated regex to match both colon and period formats
            const timePattern = /(\d{1,2}[:.]\d{2}[ap]m\s*[–-]\s*\d{1,2}[:.]\d{2}[ap]m)/i;
            const timeMatch = timingParagraph.match(timePattern);
            
            if (timeMatch && timeMatch[0]) {
              courseTime = timeMatch[0];
              console.log("Successfully extracted timing:", courseTime);
            } else {
              console.log("No time pattern found with standard format, trying alternative pattern");
              
              // Try an alternative pattern that's more flexible
              const altPattern = /(\d{1,2}[:.]\d{2}[ap]m).+?(\d{1,2}[:.]\d{2}[ap]m)/i;
              const altMatch = timingParagraph.match(altPattern);
              
              if (altMatch) {
                courseTime = `${altMatch[1]} – ${altMatch[2]}`;
                console.log("Found time with alternative pattern:", courseTime);
              } else {
                console.log("Could not extract timing from paragraph:", timingParagraph);
              }
            }
          } else {
            console.warn("Not enough paragraphs to extract timing information");
          }
        } catch (error) {
          console.error("Error extracting course time:", error);
        }

        const cleanedStartDate = startDateParagraph.replace("<strong>", "").replace("</strong>", "").replace("</p>", "").split("<br />")[2];
        const cleanedEndDate = endDateParagraph.replace("<strong>", "").replace("</strong>", "").replace("</p>", "").split("<br />")[2];
        
        console.log("Start Date:", cleanedStartDate);
        console.log("End Date:", cleanedEndDate);
        const courseDuration = `${cleanedStartDate.replace(/\n/g, "")} - ${cleanedEndDate.replace(/\n/g, "")}`;

        // Parse course name parts
        const courseParts = matchedCourse.name.split(/<br\s*\/?>/).map(part => part.trim());
        const formattedPrice = matchedCourse.price ? `$${parseFloat(matchedCourse.price).toFixed(2)}` : "$0.00";

        // Update course details in state
        if (courseParts.length === 3) {
          this.setState((prevState) => ({
            formData: {
              ...prevState.formData,
              chineseName: courseParts[0],
              englishName: courseParts[1],
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode
            },
            loading: true
          }));
        } else if (courseParts.length === 2) {
          this.setState((prevState) => ({
            formData: {
              ...prevState.formData,
              englishName: courseParts[0] || '',
              //chineseName: courseParts[1] || '',
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode
            },
            loading: true
          }));
        } else if (courseParts.length === 1) {
          this.setState((prevState) => ({
            formData: {
              ...prevState.formData,
              englishName: courseParts[0],
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode
            },
            loading: true
          }));
        }
      } else {
        console.log("No matching course found");
        this.setState({ loading: true });
      }
    } else {
      console.log("No course link provided, loading form without course data");
      this.setState({ loading: true });
    }
  };

  // Add helper method to get SingPass user data safely
  getSingPassUserData = () => {
    try {
      const userDataJson = sessionStorage.getItem('singpass_user_data_json');
      return userDataJson ? JSON.parse(userDataJson) : null;
    } catch (error) {
      console.error('Error retrieving SingPass user data:', error);
      return null;
    }
  }

  async fetchCourses(courseType) {
    try {
      var response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/courses/`, {courseType});
      var courses = response.data.courses;
      return courses;
    }
    catch(error) {
      console.error("Error:", error)
    }
  }

  handleDataChange = (newData) => {
    try {
      this.setState((prevState) => {
        const updatedFormData = {
          ...prevState.formData,
          ...newData,
        };
        
        const key = Object.keys(newData)[0];
        const updatedValidationErrors = { ...prevState.validationErrors };
    
        if (updatedValidationErrors[key]) {
          delete updatedValidationErrors[key];
        }
    
        return {
          formData: updatedFormData,
          validationErrors: updatedValidationErrors,
        };
      });
    }
    catch(error) {
      console.log(error);
    }
  };

  // Add new method to handle SingPass authentication success
  handleSingPassSuccess = () => {
    console.log('SingPass authentication successful');
    
    // TESTING: Force MyInfo error if FORCE_MYINFO_ERROR is true
    if (FORCE_MYINFO_ERROR) {
      console.log('🧪 Forcing MyInfo error for testing');
      this.handleMyInfoError('MyInfo service is temporarily unavailable. Please try again later.');
      return; // Stop execution here
    }
    
    // Populate form with SingPass data
    this.populateFormWithSingPassData();
    
    // Navigate to section 1 with URL update (this will preserve course link)
    this.navigateToSection(1);
    window.scrollTo(0, 0);
    
    this.setState({ isAuthenticated: true });
  };

    populateFormWithSingPassData = () => {
    try {
      const userData = this.getSingPassUserData();
      this.navigateToSection(1);
  
      if (!userData) {
        console.log('No SingPass user data available');
        return;
      }
  
      // Build address string and remove any ', ,'
      let address = '';
      if (userData.regadd) {
        address = `${userData.regadd.block.value} ${userData.regadd.street.value} #${userData.regadd.floor.value}-${userData.regadd.unit.value}, ${userData.regadd.building.value}, ${userData.regadd.country.desc} ${userData.regadd.postal.value}`;
        address = address.replace(/, ,/g, ',').replace(/ ,/g, ',').replace(/,,/g, ','); // Remove double commas and extra spaces before commas
        address = address.replace(/(,\s*)+/g, ', ').replace(/,\s*$/, ''); // Clean up trailing commas
      }

      console.log('SingPass user data:', userData);
  
      const formattedData = {
        pName: userData.name || '',
        nRIC: userData.uinfin || '',
        rESIDENTIALSTATUS: this.formatResidentialStatus(userData.residentialstatus),
        rACE: this.formatRace(userData.race),
        gENDER: this.formatGender(userData.sex),
        dOB: userData.dob ? userData.dob.formattedDate1 || userData.dob : '',
        cNO: this.extractMobileNumber(userData.mobileno),
        eMAIL: userData.email ? userData.email.replace(/^([^@]*)@/, (match, p1) => p1.toLowerCase() + '@'): "",
        address: address,
        postalCode: userData.regadd && userData.regadd.postal ? userData.regadd.postal.value : '',
      };
  
      // ...rest of your code (no changes needed)
      const singPassPopulatedFields = {
        pName: !!userData.name,
        nRIC: !!userData.uinfin,
        rESIDENTIALSTATUS: !!userData.residentialstatus,
        rACE: !!userData.race,
        gENDER: !!userData.sex,
        dOB: !!userData.dob,
        address: !!(userData.regadd),
        postalCode: !!(userData.regadd && userData.regadd.postal),
        cNO: false,
        eMAIL: false
      };
  
      this.setState(prevState => ({
        formData: {
          ...prevState.formData,
          ...formattedData
        },
        singPassPopulatedFields: singPassPopulatedFields
      }));
  
      console.log('Form populated with SingPass data successfully');
    } catch (error) {
      console.error('Error populating form with SingPass data:', error);
    }
  };

  // Add method to clear session storage when needed
  clearCourseData = () => {
    sessionStorage.removeItem("courseLink");
    sessionStorage.removeItem("singpass_user_data_json");
    sessionStorage.removeItem("singpass_access_token");
  };

  // Add method to clear SingPass data without reloading
  clearSingPassData = () => {
    // Clear SingPass session data
    sessionStorage.removeItem("singpass_user_data_json");
    sessionStorage.removeItem("singpass_access_token");
    console.log("Form data", this.state.formData);

    // Reset form data to empty values for SingPass populated fields
    const clearedFormData = {
      ...this.state.formData,
      pName: '',
      nRIC: '',
      rESIDENTIALSTATUS: '',
      rACE: '',
      gENDER: '',
      dOB: '',
      address: '',
      postalCode: '',
      cNO: '',
      eMAIL: ''
    };

    // Reset state
    this.setState({
      isAuthenticated: false,
      singPassPopulatedFields: {},
      formData: clearedFormData,
      validationErrors: {}
    });

    console.log('SingPass data cleared successfully');
  };

  // Handle MyInfo/SingPass error
  handleMyInfoError = (errorMessage = 'MyInfo is currently unavailable.') => {
    console.log('MyInfo error occurred:', errorMessage);
    this.setState({
      myInfoError: true,
      showMyInfoErrorModal: true,
      myInfoErrorMessage: errorMessage
    });
  };

  // Handle closing MyInfo error modal and proceed with manual entry
  handleCloseMyInfoErrorModal = () => {
    this.setState({
      showMyInfoErrorModal: false
    });
  };

  // Handle proceeding with manual form entry after MyInfo error
  handleProceedManually = () => {
    this.setState({
      showMyInfoErrorModal: false,
      isAuthenticated: true,
      currentSection: 1 // Move to personal info section for manual entry
    });
  };

  handleNext = () => {
    console.log("Pressed Next");
    const errors = this.validateForm();
    const { currentSection } = this.state;
    console.log("Current Section:", currentSection);

    // Existing validation logic for other sections
    if (currentSection === 2) {
      if (this.props.type === "NSA" && !this.courseDetailsRef.state.selectedPayment) {
        errors.selectedPayment = 'Please select a payment option.';
        this.courseDetailsRef.setState({ paymentTouched: true });
      } 
      else if (this.props.type === "ILP") {
        console.log("Go Next");
      }
    }

    if (currentSection === 3 && !this.agreementDetailsRef.state.selectedChoice) {
      errors.agreement = 'Please choose the declaration.';
      this.agreementDetailsRef.setState({ isSelected: true });
    }

    if (Object.keys(errors).length === 0) {
      if (this.state.currentSection < 4) { // Added missing opening parenthesis
        const nextSection = this.state.currentSection + 1;
        this.navigateToSection(nextSection); // Use URL navigation method
        window.scrollTo(0, 0);
      } 
      if (this.state.currentSection === 3) {
        this.handleSubmit();
      } 
    } else {
      this.setState({ validationErrors: errors });
    }
  };

  // Update handleBack to use URL parameters
  handleBack = () => {
    if (this.state.currentSection > 0) {
      const prevSection = this.state.currentSection - 1;
      this.navigateToSection(prevSection); // Use URL navigation method
    }
  };

  // Update the isCurrentSectionValid method to remove authentication requirement
  isCurrentSectionValid = () => {
    const { currentSection, formData } = this.state;
    
    switch (currentSection) {
      case 0: // FormDetails section - always allow proceeding
        return true; // Remove authentication requirement
    
      case 1: // Personal Info section
        return formData.pName && formData.nRIC && formData.rESIDENTIALSTATUS && 
               formData.rACE && formData.gENDER && formData.dOB && 
               formData.cNO && formData.eMAIL && formData.address && 
               formData.eDUCATION && formData.wORKING;
    
      case 2: // Course Details section
        if (formData.type === 'NSA') {
          return formData.payment; // NSA courses need payment selection
        }
        return true; // ILP courses don't need payment selection
    
      case 3: // Agreement section
        return formData.agreement;
    
      default:
        return true;
    }
  };

  decodeHtmlEntities(text) 
  {
    const parser = new DOMParser();
    const decodedString = parser.parseFromString(`<!doctype html><body>${text}`, "text/html").body.textContent;
    return decodedString;
  }
  

  handleSubmit = () => {
    const { formData } = this.state;

    // Participants Details
    var name = formData.pName;
    var nric = formData.nRIC;
    var residentalStatus = formData.rESIDENTIALSTATUS;
    var race = formData.rACE;
    var gender = formData.gENDER;
    var dateOfBirth = formData.dOB;
    var contactNumber = formData.cNO;
    var email = formData.eMAIL;
    var postalCode = formData.postalCode;
    if (!postalCode && formData.address) postalCode = (formData.address.match(/Singapore\s*(\d{6})/i) || [])[1] || "";
    var educationLevel = formData.eDUCATION;
    var workStatus = formData.wORKING;

    // Course 
    var courseType = formData.type;
    var courseEngName = this.decodeHtmlEntities(formData.englishName);
    var courseChiName = this.decodeHtmlEntities(formData.chineseName);
    var courseLocation = formData.location;
    var coursePrice = formData.price; 
    var courseDuration = formData.courseDuration;
    var courseMode = formData.courseMode;
    var courseTime = formData.courseTime;
    var payment = formData.payment;

    // Agreement
    var agreement = formData.agreement; // Use the corrected key

    var participantDetails = {
      participant: {
          name: name,
          nric: nric,
          residentialStatus: residentalStatus,
          race: race,
          gender: gender,
          dateOfBirth: dateOfBirth,
          contactNumber: contactNumber,
          email: email,
          postalCode: postalCode,
          educationLevel: educationLevel,
          workStatus: workStatus
      },
      course: {
          courseType: courseType,
          courseEngName: courseEngName,
          courseChiName: courseChiName,
          courseLocation: courseLocation,
          coursePrice: coursePrice,
          courseDuration: courseDuration,
          courseMode: courseMode,
          courseTime: courseTime,
          payment: payment
      },
      agreement: agreement,
      status: "Pending", 
    };

    console.log('Participants Details', participantDetails);
    
    // Example of sending data to the server using Axios
    axios.post(
      `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`, 
      { participantDetails, purpose: "insert" }
    )
      .then((response) => {
        console.log('Form submitted successfully', response.data);
        if (response.data) {
          // Clear session storage after successful submission
          // Send WhatsApp registration message via backend using Interakt template "course_registration_submission"
          axios.post(
            `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/whatsapp`,
            {
              phoneNumber: participantDetails.participant.contactNumber,
              name: participantDetails.participant.name,
              course: participantDetails.course.courseEngName,
              template: "course_registration_submission",
              purpose: "registration"
            }
          ).then(() => {
            // Optionally handle success, e.g. show a message or log
            console.log('WhatsApp registration message sent successfully');
            this.clearCourseData();
                      // Set a 10-second timeout to close the window after success
              setTimeout(() => {
                //window.close(); // This will close the window after 10 seconds
              }, 10000);
          }).catch(err => {
            // Optionally handle error
            console.error('Failed to send WhatsApp registration message:', err);
             console.log('WhatsApp registration message sent successfully');
            this.clearCourseData();
                      // Set a 10-second timeout to close the window after success
              setTimeout(() => {
                //window.close(); // This will close the window after 10 seconds
              }, 10000);
          });


          // Success alert
          // alert("Success");
    
        } else {
          // Handle failure if necessary
          alert("Error during submission");
        }
      })
      .catch((error) => {
        console.error('Error submitting form:', error);
        alert("Error during submission");
      });
    
  };

  isValidNRIC(nric) {
    // Check if NRIC is empty
    if (!nric) {
        return { isValid: false, error: 'NRIC Number is required. 身份证号码是必填项。' };
    }
    // Check if NRIC is exactly 9 characters long
    if (nric.length !== 9) {
        return { isValid: false, error: 'NRIC must be exactly 9 characters. NRIC 必须是9个字符。' };
    }
    // Check if NRIC follows the correct format (first letter + 7 digits + last letter)
    if (!/^[STFG]\d{7}[A-Z]$/.test(nric)) {
        return { isValid: false, error: 'Invalid NRIC format. 必须符合新加坡身份证格式，例如 S1234567D。' };
    }
    // If the format is correct, return as valid
    return { isValid: true, error: null }; // NRIC format is valid, but checksum is not checked
  }

  isValidDOB(dob, courseType) {
    // Only enforce 50+ age restriction for ILP and NSA
    if (courseType !== 'ILP' && courseType !== 'NSA') {
      // For Marriage Preparation Programme and other types, just check DOB is present and valid format
      if (!dob) {
        return { isValid: false, error: 'Date of Birth is required. 出生日期是必填项。' };
      }
      // Accept any valid date format (dd/mm/yyyy or yyyy/mm/dd)
      const dateParts = dob.split('/');
      let dobDate;
      if (dob.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        dobDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      } else if (dob.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        dobDate = new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
      } else {
        return { isValid: false, error: 'Invalid Date of Birth format. 日期格式无效，必须符合：dd/mm/yyyy, yyyy/mm/dd, yyyy/dd/mm, mm/dd/yyyy。' };
      }
      if (isNaN(dobDate.getTime())) {
        return { isValid: false, error: 'Invalid Date of Birth format. 日期格式无效。' };
      }
      return { isValid: true, error: null };
    }
    // First, check if dob is a non-empty string
    if (typeof dob === 'string') {
      const dateParts = dob.split('/');
      let dobDate;
      if (dob.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        dobDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      } else if (dob.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
        dobDate = new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
      } else {
        return { isValid: false, error: 'Invalid Date of Birth format. 日期格式无效，必须符合：dd/mm/yyyy, yyyy/mm/dd, yyyy/dd/mm, mm/dd/yyyy。' };
      }
      const currentYear = new Date().getFullYear();
      const birthYear = dobDate.getFullYear();
      const age = currentYear - birthYear;
      if (age < 50) {
        return { isValid: false, error: 'Age must be at least 50 years. 年龄必须至少为50岁。' };
      }
      return { isValid: true, error: null };
    }
    if (dob.formattedDate1) {
      const currentYear = new Date().getFullYear();
      const birthYear = new Date(dob.formattedDate1).getFullYear();
      const age = currentYear - birthYear;
      if (age < 50) {
        return { isValid: false, error: 'Age must be at least 50 years. 年龄必须至少为50岁。' };
      }
      return { isValid: true, error: null };
    }
    return { isValid: false, error: 'Date of Birth is required. 出生日期是必填项。' };
  }
  

  validateForm = () => {
    const { currentSection, formData } = this.state;
    const errors = {};
    if (currentSection === 0) {
      return errors;
    }
    if (currentSection === 1) {
      if (!formData.pName) {
        errors.pName = 'Name is required. 姓名是必填项。';
      }
      if (!formData.location) {
        errors.location = 'Location is required. 地点是必填项。';
      }
      if (formData.nRIC) {
        const { isValid, error } = this.isValidNRIC(formData.nRIC);
        if (!isValid) {
          errors.nRIC = error;
        }
      }
      if (!formData.rESIDENTIALSTATUS) {
        errors.rESIDENTIALSTATUS = 'Residential Status is required. 居民身份是必填项。';
      }
      if (!formData.rACE) {
        errors.rACE = 'Race is required. 种族是必填项。';
      }
      if (!formData.gENDER) {
        errors.gENDER = 'Gender is required. 性别是必填项。';
      }
      if (!formData.dOB) {
        errors.dOB = 'Date of Birth is required. 出生日期是必填项。';
      }
      if (formData.dOB) {
        const { isValid, error } = this.isValidDOB(formData.dOB, formData.type);
        if (!isValid) {
          errors.dOB = error;
        }
      }
      if (!formData.cNO) {
        errors.cNO = 'Contact No. is required. 联系号码是必填项。';
      }
      if (formData.cNO && !/^\d+$/.test(formData.cNO)) {
        errors.cNO = 'Contact No. must contain only numbers. 联系号码只能包含数字。';
      }
      if (formData.cNO && formData.cNO.length !== 8) {
        errors.cNO = 'Contact No. must be exactly 8 digits. 联系号码必须是8位数字。';
      }
      if (formData.cNO && !/^[89]/.test(formData.cNO)) {
        errors.cNO = 'Contact No. must start with 8 or 9. 联系号码必须以8或9开头。';
      }
      if (!formData.eMAIL) {
        errors.eMAIL = 'Email is required. 电子邮件是必填项。';
      }
      if (!formData.address) {
        errors.address = 'Address is required. 地址是必填项。';
      }
      if (!formData.eDUCATION) {
        errors.eDUCATION = 'Education Level is required. 教育水平是必填项。';
      }
      if (!formData.wORKING) {
        errors.wORKING = 'Work Status is required. 工作状态是必填项。';
      }
    }
    

    return errors;
  };

  // Test method to simulate MyInfo error (for development/testing)
  simulateMyInfoError = () => {
    const errorScenarios = [
      {
        message: 'MyInfo service is temporarily unavailable. Please try again later.',
        type: 'service_unavailable'
      },
      {
        message: 'Unable to retrieve your data from MyInfo at this time.',
        type: 'data_retrieval_failed'
      },
      {
        message: 'MyInfo is currently undergoing maintenance. Service will be restored shortly.',
        type: 'maintenance'
      },
      {
        message: 'Connection to MyInfo service failed. Please check your internet connection and try again.',
        type: 'connection_failed'
      },
      {
        message: 'MyInfo authentication timed out. Please try again.',
        type: 'timeout'
      },
      {
        message: 'MyInfo service is experiencing high traffic. Please wait a moment and try again.',
        type: 'high_traffic'
      }
    ];
    
    const randomScenario = errorScenarios[Math.floor(Math.random() * errorScenarios.length)];
    console.log('🧪 Simulating MyInfo error:', randomScenario.type, '-', randomScenario.message);
    this.handleMyInfoError(randomScenario.message);
  };

  // Set up error handler listeners
  setupErrorHandlerListeners = () => {
    // Listen for real-time errors
    this.myInfoErrorHandler.onError((errorInfo) => {
      console.log('🚨 Real-time MyInfo error detected:', errorInfo);
      this.handleRealTimeMyInfoError(errorInfo);
    });

    // Listen for status changes
    this.myInfoErrorHandler.onStatusChange((statusInfo) => {
      console.log('📊 MyInfo status changed:', statusInfo);
      this.handleServiceStatusChange(statusInfo);
    });

    // Listen for retry attempts
    this.myInfoErrorHandler.onRetryAttempt((retryInfo) => {
      console.log('🔄 MyInfo retry attempt:', retryInfo);
      this.handleRetryAttempt(retryInfo);
    });
  };

  // Handle real-time MyInfo errors
  handleRealTimeMyInfoError = (errorInfo) => {
    const { message, severity, category, suggestedAction } = errorInfo;
    
    // Update state with error information
    this.setState({
      myInfoError: true,
      showMyInfoErrorModal: true,
      myInfoErrorMessage: message,
      serviceRecommendations: this.myInfoErrorHandler.getErrorRecommendations()
    });

    // Log for debugging
    console.error('Real-time MyInfo error:', {
      category,
      severity,
      suggestedAction,
      technicalDetails: errorInfo.technicalDetails
    });
  };

  // Handle service status changes
  handleServiceStatusChange = (statusInfo) => {
    const { type, status } = statusInfo;
    
    if (type === 'service') {
      this.setState({
        myInfoServiceStatus: status,
        serviceRecommendations: this.myInfoErrorHandler.getErrorRecommendations()
      });
    } else if (type === 'network') {
      this.setState({
        networkOnline: status === 'online'
      });
    }
  };

  // Handle retry attempts
  handleRetryAttempt = (retryInfo) => {
    const { attempt, maxAttempts } = retryInfo;
    console.log(`🔄 Retry attempt ${attempt}/${maxAttempts} in progress...`);
    
    // You could show a loading indicator or toast message here
    // For now, we'll just log it
  };

  // Proactive MyInfo availability check before authentication
  checkMyInfoAvailabilityBeforeAuth = async () => {
    try {
      console.log('🔍 Checking MyInfo service availability before authentication...');
      const availability = await this.myInfoErrorHandler.checkServiceAvailability();
      
      if (!availability.available) {
        console.warn('⚠️ MyInfo service not available:', availability.error);
        this.handleRealTimeMyInfoError(availability.error);
        return false;
      }
      
      console.log('✅ MyInfo service is available for authentication');
      return true;
    } catch (error) {
      console.error('🚨 Error checking MyInfo availability:', error);
      this.handleMyInfoError('Unable to verify MyInfo service status. You can proceed with manual entry.');
      return false;
    }
  };

  // Enhanced SingPass authentication with real-time monitoring
  handleSingPassAuthenticationWithMonitoring = async () => {
    // First, check if MyInfo service is available
    const isAvailable = await this.checkMyInfoAvailabilityBeforeAuth();
    
    if (!isAvailable) {
      // Service is not available, user can still proceed manually
      return;
    }

    // Proceed with authentication
    try {
      // This would be the actual authentication function
      const authFunction = async () => {
        // Simulate authentication process
        // In real implementation, this would call the actual SingPass auth
        console.log('🔐 Starting SingPass authentication...');
        
        // For testing, we can simulate different scenarios
        if (FORCE_MYINFO_ERROR) {
          throw new Error('MyInfo service is temporarily unavailable. Please try again later.');
        }
        
        // Actual authentication logic would go here
        return { success: true };
      };

      const result = await this.myInfoErrorHandler.handleAuthenticationError(
        new Error('Simulated auth for testing'), 
        authFunction
      );

      if (result.success) {
        console.log('✅ SingPass authentication successful');
        this.handleSingPassSuccess();
      } else {
        console.error('❌ SingPass authentication failed after retries');
        // Error is already handled by the error handler
      }
    } catch (error) {
      console.error('🚨 Unexpected error during authentication:', error);
      this.handleMyInfoError(error.message);
    }
  };

  // Component cleanup
  componentWillUnmount() {
    console.log('🔍 Stopping MyInfo real-time monitoring...');
    if (this.myInfoErrorHandler) {
      this.myInfoErrorHandler.destroy();
    }
  };

  render() {
    const { currentSection, formData, validationErrors, bgColor, loading, isAuthenticated } = this.state;
  
    // Render the loading spinner or content depending on loading state
    if (loading === false) {
      return (
        <div className="loading-spinner1" style={{ textAlign: 'center', marginTop: '20px' }}>
          <div className="spinner1"></div>
          <p style={{ fontSize: '18px', color: '#333', fontWeight: '600', marginTop: '10px' }}>Loading...</p>
        </div>
      );
    }     
  
    return (
      <div className="formwholepage" style={{ backgroundColor: bgColor }}>
        <div className="form-page">
          <div className="form-container" style={this.state.formContainerBg ? { backgroundColor: this.state.formContainerBg } : {}}>
            {/* MyInfo Service Status Indicator */}
            <MyInfoStatusIndicator 
              status={this.state.myInfoServiceStatus}
              isOnline={this.state.networkOnline}
              recommendations={this.state.serviceRecommendations}
              compact={true}
            />
            {currentSection === 0 && (
              <FormDetails 
                courseType={formData.type} 
                isAuthenticated={isAuthenticated}
                onAuthenticationChange={(authStatus) => this.setState({ isAuthenticated: authStatus })}
                onProceedWithoutSingPass={this.handleProceedWithoutSingPass}
                validationErrors={validationErrors}
              />
            )}
            {currentSection === 1 && (
              <PersonalInfo
                data={formData}
                onChange={this.handleDataChange}
                errors={validationErrors}
                singPassPopulatedFields={this.state.singPassPopulatedFields}
                onClearSingPassData={this.clearSingPassData} // Add clear function prop
              />
            )}
            {currentSection === 2 && (
              <CourseDetails
                ref={(ref) => (this.courseDetailsRef = ref)}
                courseEnglishName={formData.englishName}
                courseChineseName={formData.chineseName}
                courseLocation={formData.location}
                coursePrice={formData.price}
                courseType={formData.type}
                courseDuration={formData.courseDuration}
                courseMode={formData.courseMode}
                payment={formData.payment}
                onChange={this.handleDataChange}
              />
            )}
            {currentSection === 3 && (
              <AgreementDetailsSection
                ref={(ref) => (this.agreementDetailsRef = ref)}
                agreement={formData.agreement}
                onChange={this.handleDataChange}
                errors={validationErrors}
                courseType={formData.type}
              />
            )}
            {currentSection === 4 && <SubmitDetailsSection />}
          </div>
        </div>

        {/* Simplified button structure - remove authentication logic */}
        {currentSection === 0 && (
          <div className="flex-button-container">
            <button 
              onClick={this.handleNext} 
              disabled={!this.isCurrentSectionValid()}
              className="next-button"
            >
              Next 下一步
            </button>
            <SingPassButton 
              buttonText="Retrieve Myinfo with" 
              onAuthenticationSuccess={this.handleSingPassSuccess}
              onMyInfoError={this.handleMyInfoError}
              errorHandler={this.realTimeErrorHandler}
              onError={(error) => {
                console.error('SingPass error:', error);
                // Handle general SingPass errors
                if (error.message?.includes('MyInfo') || error.message?.includes('unavailable')) {
                  this.handleMyInfoError(error.message);
                }
              }}
            />
            {/* Testing mode indicator - only shows when FORCE_MYINFO_ERROR is true */}
            {FORCE_MYINFO_ERROR && (
              <></>
            )}
            {/* Development only - Test MyInfo Error Modal */}
          </div>
        )}

        {/* Show regular Next/Back buttons for other sections */}
        {currentSection > 0 && currentSection < 4 && (
          <div className="button-container">
            <button onClick={this.handleBack} disabled={currentSection === 0}>
              Back 返回
            </button>
            <button onClick={this.handleNext} disabled={!this.isCurrentSectionValid()}>
              {currentSection === 3 ? 'Submit 提交' : 'Next 下一步'}
            </button>
          </div>
        )}


        {/* MyInfo Error Testing Mode Indicator */}
        {FORCE_MYINFO_ERROR && (
          <></>
        )}
        
        {/* MyInfo error modal using the Popup component */}
        <Popup 
          isOpen={this.state.showMyInfoErrorModal}
          closePopup={this.handleCloseMyInfoErrorModal}
          onProceedManually={this.handleProceedManually}
          title="MyInfo Unavailable"
          message={this.state.myInfoErrorMessage}
          type="myinfo-error"
          icon="⚠️"
        />
      </div>
    );
  }  
}

export default FormPage;
