import React, { Component } from 'react';
import '../../css/formPage.css';
import '../../css/myinfo-testing.css';
import FormDetails from './sub/registrationForm/formDetails';
import PersonalInfo from './sub/registrationForm/personalInfo';
import SpouseInfo from './sub/registrationForm/spouseInfo';
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
        courseTime: '',
        courseLocation: '', // Add courseLocation to store venue location from course data
        // Marriage Preparation Programme specific fields
        mARITALSTATUS: '',
        hOUSINGTYPE: '',
        gROSSMONTHLYINCOME: '',
        mARRIAGEDURATION: '',
        tYPEOFMARRIAGE: '',
        hASCHILDREN: '',
        // Spouse fields
        spouseName: '',
        spouseNRIC: '',
        spouseDOB: '',
        spouseResidentialStatus: '',
        spouseSex: '',
        spouseEthnicity: '',
        spouseMaritalStatus: '',
        spousePostalCode: '',
        spouseMobile: '',
        spouseEmail: '',
        spouseEducation: '',
        spouseHousingType: '',
        howFoundOut: '',
        howFoundOutOthers: '',
        sourceOfReferral: '',
        // Marriage Preparation Programme consent checkboxes
        marriagePrepConsent1: false,
        marriagePrepConsent2: false
      },
      validationErrors: {},
      age: 0
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
    if (typeof status === 'string' && (status.includes('新加坡公民') || status.includes('永久居民') || status.includes('Warganegara') || status.includes('Pemastautin'))) {
      return status;
    }
    
    // Extract the correct status code from SingPass structured object
    let statusCode = status;
    if (typeof status === 'object' ) {
      // Use classification if available, otherwise use code
      statusCode = status.classification || status.code || status.value;
    }
    
    console.log("Status Code:", statusCode);
    
    // Check if this is for Talks And Seminar course type to determine format
    const courseType = this.state?.formData?.type;
    const isTalksAndSeminar = courseType === 'Talks And Seminar';
    
    // Format according to course type
    let statusMap;
    if (isTalksAndSeminar) {
      // English + Malay format for Talks And Seminar
      statusMap = {
        'SC': 'SC Warganegara Singapura',
        'PR': 'PR Pemastautin Tetap'
      };
    } else {
      // English + Chinese format for other courses
      statusMap = {
        'SC': 'SC 新加坡公民',
        'PR': 'PR 永久居民'
      };
    }
    
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
    // Set mounted flag to prevent setState warnings
    this._isMounted = true;
    
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
    let initialSection = sectionParam ? parseInt(sectionParam) : 0;
    const hasSectionParam = !!sectionParam; // Track if section was explicitly set via URL
    
    console.log('Final Course Link:', link);
    console.log('Section Parameter:', sectionParam);
    console.log('Initial Section (before course type check):', initialSection);
    console.log('Has Section Param:', hasSectionParam);
    
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

    // Load course data with the decoded link, passing hasSectionParam to preserve explicit sections
    await this.loadCourseData(link, hasSectionParam);
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
    if (this._isMounted) {
      this.setState({ currentSection: section });
    }
  };

  // Update loadCourseData to handle both encoded and decoded links
  loadCourseData = async (link, hasSectionParam = false) => {
    // Use provided link or try to get from sessionStorage
    if (!link) {
      link = sessionStorage.getItem("courseLink");
    }
    
    console.log('Loading course data with link:', link);
    console.log('Has section param:', hasSectionParam);

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
          matchedCourse.categories.length === 2
        ) {
          // Handle the case where there are exactly 2 categories
          // Check if first category is "Talks And Seminar"
          if (matchedCourse.categories[0] && 
              typeof matchedCourse.categories[0].name === 'string' &&
              matchedCourse.categories[0].name === 'Talks And Seminar') {
            type = 'Talks And Seminar';
          }
          // Check second category for other course types (NSA, ILP, Marriage Preparation Programme)
          else if (matchedCourse.categories[1] && 
                   typeof matchedCourse.categories[1].name === 'string') {
            const nameParts = matchedCourse.categories[1].name.split(":");
            if (nameParts.length > 1 && typeof nameParts[1] === 'string') {
              type = nameParts[1].trim();
            } else {
              type = nameParts[0].trim();
            }
          }
        } else if (
          matchedCourse.categories &&
          Array.isArray(matchedCourse.categories) &&
          matchedCourse.categories[1] &&
          typeof matchedCourse.categories[1].name === 'string'
        ) {
          // Original logic for backward compatibility
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
        
        // Prepare background color based on course type
        let bgColor = '';
        let formContainerBg = '';
        if (type === 'ILP') {
          bgColor = '#006400';
        } else if (type === 'NSA') {
          bgColor = '#003366';
        }
        else if (type === 'Talks And Seminar') {
          bgColor = '#DAA520';
        }
         else if (type === 'Marriage Preparation Programme') {
          bgColor = '#800000';     
          formContainerBg = '#40E0D0';
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

        // Extract course location from short_description
        let courseLocation = '';
        try {
          console.log("Extracting location from short description:", shortDescription);
          
          // Look for location patterns in the entire short description
          const fullDescription = this.decodeHtmlEntities(shortDescription);
          console.log("Decoded description:", fullDescription);
          
          // Split by common separators and look for location patterns
          const lines = fullDescription.split(/[<>]/g).filter(line => line.trim().length > 0);
          
          // First, try to find location with specific keywords
          for (let line of lines) {
            const cleanLine = line.replace(/<[^>]*>/g, '').trim();
            
            // Look for "Lokasi Location:" pattern followed by address
            if (cleanLine.match(/(?:Lokasi|Location):\s*(.+)/i)) {
              const locationMatch = cleanLine.match(/(?:Lokasi|Location):\s*(.+)/i);
              if (locationMatch && locationMatch[1]) {
                courseLocation = locationMatch[1].trim();
                console.log("Successfully extracted location from Lokasi/Location pattern:", courseLocation);
                break;
              }
            }
            
            // Look for Singapore addresses or common location patterns with postal codes
            if (cleanLine.includes('Singapore') || 
                cleanLine.match(/\d+[A-Z]?\s+[A-Za-z\s]+(?:Road|Street|Avenue|Drive|Lane|Walk|Close|Crescent|Place|Way|Boulevard|Circuit|Park|View|Gardens?|Centre|Building|Tower|Plaza|Square|Mall|Hub)/i) ||
                cleanLine.match(/^\d+[A-Z]?\s+.+\s+Singapore\s+\d{6}$/i) ||
                cleanLine.match(/Block\s+\d+/i) ||
                cleanLine.match(/\d{6}$/i) || // Lines ending with 6-digit postal code
                (cleanLine.includes('Level') || cleanLine.includes('Floor')) && cleanLine.length > 20) {
              
              courseLocation = cleanLine;
              console.log("Successfully extracted location from address pattern:", courseLocation);
              break;
            }
          }
          
          // If no location found with strict patterns, look for any line that might contain location info
          if (!courseLocation && type === 'Talks And Seminar') {
            for (let line of lines) {
              const cleanLine = line.replace(/<[^>]*>/g, '').trim();
              
              // Look for lines that might contain venue information, including postal codes
              if (cleanLine.length > 15 && 
                  !cleanLine.match(/^\d{1,2}[:.]\d{2}[ap]m/i) && // Not a time
                  !cleanLine.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) && // Not a date
                  !cleanLine.includes('http') && // Not a URL
                  !cleanLine.includes('Contact Number') && // Not contact info
                  !cleanLine.includes('Fee') && // Not fee info
                  !cleanLine.includes('$') && // Not price info
                  (cleanLine.includes('Centre') || cleanLine.includes('Building') || 
                   cleanLine.includes('Hall') || cleanLine.includes('Room') ||
                   cleanLine.includes('Level') || cleanLine.includes('Floor') ||
                   cleanLine.includes('Block') || cleanLine.includes('Unit') ||
                   cleanLine.includes('Community') || cleanLine.includes('Club') ||
                   cleanLine.match(/\d{6}/))) { // Also include lines with postal codes
                
                courseLocation = cleanLine;
                console.log("Found potential location:", courseLocation);
                break;
              }
            }
          }
          
          // Additional enhancement: Try to find and append postal code if missing
          if (courseLocation && !courseLocation.match(/\d{6}/)) {
            console.log("Location found but no postal code detected, searching for postal code...");
            for (let line of lines) {
              const cleanLine = line.replace(/<[^>]*>/g, '').trim();
              const postalCodeMatch = cleanLine.match(/\b(\d{6})\b/);
              if (postalCodeMatch && postalCodeMatch[1]) {
                // Check if this postal code line seems related to the location
                if (cleanLine.length < 50 && // Short line likely just postal code or address fragment
                    !cleanLine.includes('Contact') && 
                    !cleanLine.includes('Fee') && 
                    !cleanLine.includes('$')) {
                  courseLocation += ` Singapore ${postalCodeMatch[1]}`;
                  console.log("Enhanced location with postal code:", courseLocation);
                  break;
                }
              }
            }
          }
          
          if (!courseLocation) {
            console.log("Could not extract location from short description");
          }
          
          // Standardize the extracted course location address format
          if (courseLocation) {
            courseLocation = this.standardizeLocationAddress(courseLocation, selectedLocation);
            console.log("Standardized course location:", courseLocation);
          }
          
        } catch (error) {
          console.error("Error extracting course location:", error);
        }

        const cleanedStartDate = startDateParagraph.replace("<strong>", "").replace("</strong>", "").replace("</p>", "").split("<br />")[2];
        const cleanedEndDate = endDateParagraph.replace("<strong>", "").replace("</strong>", "").replace("</p>", "").split("<br />")[2];
        
        console.log("Start Date:", cleanedStartDate);
        console.log("End Date:", cleanedEndDate);
        const courseDuration = `${cleanedStartDate.replace(/\n/g, "")} - ${cleanedEndDate.replace(/\n/g, "")}`;

        // Parse course name parts
        const courseParts = matchedCourse.name.split(/<br\s*\/?>/).map(part => part.trim());
        const formattedPrice = matchedCourse.price ? `$${parseFloat(matchedCourse.price).toFixed(2)}` : "$0.00";

        // Check language attribute to determine naming strategy
        let languageOptions = [];
        if (matchedCourse.attributes && 
            matchedCourse.attributes[0] && 
            matchedCourse.attributes[0].slug === 'pa_language' &&
            matchedCourse.attributes[0].options && 
            matchedCourse.attributes[0].options.length > 0) {
          languageOptions = matchedCourse.attributes[0].options;
          console.log("Course language attributes:", languageOptions);
        }

        // Determine if this is English+Chinese or English+Malay based on language attributes
        // Check if any language option contains 'Chinese' or 'Malay'
        const isChineseLanguage = languageOptions.some(option => option.includes('Mandarin'));
        const isMalayLanguage = languageOptions.some(option => option.includes('Malay'));
        
        // Log language detection for debugging
        if (type === 'Talks And Seminar') {
          console.log("Talks And Seminar course detected");
          console.log("Language options:", languageOptions);
          console.log("Is Chinese Language:", isChineseLanguage);
          console.log("Is Malay Language:", isMalayLanguage);
        }

        // Update course details in state - consolidated to avoid setState before mount
        let courseData = {};
        
        if (courseParts.length === 3) {
          if (isChineseLanguage) {
            // Chinese + English - keep both
            courseData = {
              chineseName: courseParts[0],
              englishName: courseParts[1],
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode,
              courseLocation
            };
          } else if (isMalayLanguage) {
            // Malay + English - store Malay in chineseName field
            courseData = {
              englishName: courseParts[1],
              chineseName: courseParts[0], // Store Malay name in chineseName field
              isMalayLanguage: true, // Flag to indicate this is Malay content
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode,
              courseLocation
            };
          } else {
            // Default behavior
            courseData = {
              chineseName: courseParts[0],
              englishName: courseParts[1],
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode,
              courseLocation
            };
          }
        } else if (courseParts.length === 2) {
          if (isChineseLanguage) {
            // English + Chinese - keep both
            courseData = {
              englishName: courseParts[0] || '',
              chineseName: courseParts[1] || '',
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode,
              courseLocation
            };
          } else if (isMalayLanguage) {
            // English + Malay - store Malay in chineseName field
            courseData = {
              englishName: courseParts[0] || '',
              chineseName: courseParts[1] || '', // Store Malay name in chineseName field
              isMalayLanguage: true, // Flag to indicate this is Malay content
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode,
              courseLocation
            };
          } else {
            // Default behavior - detect language in content
            const processedNames = this.processCourseName(courseParts);
            courseData = {
              englishName: processedNames.englishName,
              chineseName: processedNames.chineseName || '',
              location: selectedLocation,
              price: formattedPrice,
              type,
              courseDuration,
              courseTime,
              courseMode,
              courseLocation
            };
          }
        } else if (courseParts.length === 1) {
          courseData = {
            englishName: courseParts[0],
            chineseName: '',
            location: selectedLocation,
            price: formattedPrice,
            type,
            courseDuration,
            courseTime,
            courseMode,
            courseLocation
          };
        }

        // Determine initial section for Marriage Preparation Programme only if no explicit section param
        const shouldStartAtSection1 = type === 'Marriage Preparation Programme' && !hasSectionParam;
        
        // Single setState call to avoid setState before mount warnings
        if (this._isMounted) {
          this.setState((prevState) => ({
            formData: {
              ...prevState.formData,
              ...courseData
            },
            loading: true,
            bgColor: bgColor,
            formContainerBg: formContainerBg,
            currentSection: shouldStartAtSection1 ? 1 : prevState.currentSection
          }));
        } else {
          // If component not mounted yet, update state directly
          this.state = {
            ...this.state,
            formData: {
              ...this.state.formData,
              ...courseData
            },
            loading: true,
            bgColor: bgColor,
            formContainerBg: formContainerBg,
            currentSection: shouldStartAtSection1 ? 1 : this.state.currentSection
          };
        }
        
        // Log when Marriage Preparation Programme section adjustment happens
        if (shouldStartAtSection1) {
          console.log('Marriage Preparation Programme detected, starting from section 1');
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
      console.log("Fetched Courses:", courses);
      return courses;
    }
    catch(error) {
      console.error("Error:", error)
    }
  }

  handleDataChange = (newData) => {
    try {
      if (this._isMounted) {
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
    }
    catch(error) {
      console.log(error);
    }
  };

  // Add new method to handle SingPass authentication success
  handleSingPassSuccess = () => {
    console.log('SingPass authentication successful');
    
    // Log SingPass values
    const singPassData = this.getSingPassUserData();
    if (singPassData) {
      console.log('📋 SingPass User Data:',singPassData, {
        name: singPassData.name,
        uinfin: singPassData.uinfin,
        residentialstatus: singPassData.residentialstatus,
        race: singPassData.race,
        sex: singPassData.sex,
        dob: singPassData.dob,
        mobileno: singPassData.mobileno,
        email: singPassData.email,
        regadd: singPassData.regadd,
        source: singPassData.source,
        endpointUsed: singPassData.endpointUsed,
        timestamp: singPassData.timestamp ? new Date(singPassData.timestamp).toLocaleString() : 'N/A'
      });
    }
    
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
    
    if (this._isMounted) {
      this.setState({ isAuthenticated: true });
    }
  };

  populateFormWithSingPassData = () => {
    try {
      const userData = this.getSingPassUserData();
      
      // Skip SingPass population for Marriage Preparation Programme and Talks And Seminar
      if (this.state.formData.type === 'Marriage Preparation Programme' || 
          this.state.formData.type === 'Talks And Seminar') {
        console.log(`${this.state.formData.type} detected, skipping SingPass data population`);
        this.navigateToSection(1);
        return;
      }
      
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
  
      if (this._isMounted) {
        this.setState(prevState => ({
          formData: {
            ...prevState.formData,
            ...formattedData
          },
          singPassPopulatedFields: singPassPopulatedFields
        }));
      }
  
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
    // Skip clearing for Marriage Preparation Programme and Talks And Seminar since they don't use SingPass
    if (this.state.formData.type === 'Marriage Preparation Programme' || 
        this.state.formData.type === 'Talks And Seminar') {
      console.log(`${this.state.formData.type} detected, SingPass clearing not applicable`);
      return;
    }
    
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
    if (this._isMounted) {
      this.setState({
        isAuthenticated: false,
        singPassPopulatedFields: {},
        formData: clearedFormData,
        validationErrors: {}
      });
    }

    console.log('SingPass data cleared successfully');
  };

  // Handle MyInfo/SingPass error
  handleMyInfoError = (errorMessage = 'MyInfo is currently unavailable.') => {
    console.log('MyInfo error occurred:', errorMessage);
    if (this._isMounted) {
      this.setState({
        myInfoError: true,
        showMyInfoErrorModal: true,
        myInfoErrorMessage: errorMessage
      });
    }
  };

  // Handle closing MyInfo error modal and proceed with manual entry
  handleCloseMyInfoErrorModal = () => {
    if (this._isMounted) {
      this.setState({
        showMyInfoErrorModal: false
      });
    }
  };

  // Handle proceeding with manual form entry after MyInfo error
  handleProceedManually = () => {
    if (this._isMounted) {
      this.setState({
        showMyInfoErrorModal: false,
        isAuthenticated: true,
        currentSection: 1 // Move to personal info section for manual entry
      });
    }
  };

  handleNext = () => {
    console.log("Pressed Next");
    const { currentSection, formData } = this.state;
    console.log("Current Section:", currentSection);
    console.log("Form Data:", formData);

    // Special case: For Talks And Seminar in section 0, skip validation and go directly to next section
    if (formData.type === 'Talks And Seminar' && currentSection === 0) {
      console.log("Talks And Seminar section 0 - skipping validation, going to section 1");
      this.navigateToSection(1);
      window.scrollTo(0, 0);
      return;
    }

    // For all other cases, run validation
    const errors = this.validateForm();
    console.log("Validation Errors:", errors);

    // For Marriage Preparation Programme and Talks And Seminar, treat section 0 as section 1 for validation
    const effectiveSection = ((formData.type === 'Marriage Preparation Programme' || formData.type === 'Talks And Seminar') && currentSection === 0) ? 1 : currentSection;

    // Validation logic for different sections based on course type
    if (formData.type === 'Marriage Preparation Programme') {
      // Marriage Preparation Programme flow: 0/1 -> 2 -> 3 -> 4 -> 5
      if (effectiveSection === 3) {
        // Course details section for Marriage Preparation Programme
        if (this.props.type === "NSA" && !this.courseDetailsRef.state.selectedPayment) {
          errors.selectedPayment = 'Please select a payment option.';
          this.courseDetailsRef.setState({ paymentTouched: true });
        }
      }
      if (effectiveSection === 4) {
        // Agreement section validation for Marriage Preparation Programme (checkboxes)
        if (!this.agreementDetailsRef.state.marriagePrepConsent1 || !this.agreementDetailsRef.state.marriagePrepConsent2) {
          errors.agreement = 'Both consent options must be selected to proceed.';
          this.agreementDetailsRef.setState({ marriagePrepInteracted: true });
        }
      }
    } else if (formData.type === 'Talks And Seminar') {
      // Talks And Seminar flow: 0 (PersonalInfo) -> 1 (CourseDetails) -> 2 -> 3 (Submit)
      // No additional validation needed for course details section
      console.log("Talks And Seminar - Go Next");
    } else {
      // Original flow for NSA/ILP: 0 -> 1 -> 2 -> 3 -> 4
      if (effectiveSection === 2) {
        if (this.props.type === "NSA" && !this.courseDetailsRef.state.selectedPayment) {
          errors.selectedPayment = 'Please select a payment option.';
          this.courseDetailsRef.setState({ paymentTouched: true });
        } 
        else if (this.props.type === "ILP") {
          console.log("Go Next");
        }
      }
      if (effectiveSection === 3 && !this.agreementDetailsRef.state.selectedChoice) {
        errors.agreement = 'Please choose the declaration.';
        this.agreementDetailsRef.setState({ isSelected: true });
      }
    }

    if (Object.keys(errors).length === 0) {
      let nextSection = this.state.currentSection + 1;
      
      // For Marriage Preparation Programme, skip section 1 if starting from section 0
      if (formData.type === 'Marriage Preparation Programme' && currentSection === 0) {
        nextSection = 2; // Skip section 1 (PersonalInfo is shown in section 0)
      }
      
      this.navigateToSection(nextSection);
      window.scrollTo(0, 0);
    } else {
      if (this._isMounted) {
        this.setState({ validationErrors: errors });
      }
    }
  };

  // Update handleBack to use URL parameters and handle Marriage Preparation Programme
  handleBack = () => {
    const { currentSection, formData } = this.state;
    
    // For Marriage Preparation Programme, don't allow going back to section 0
    if (formData.type === 'Marriage Preparation Programme' && currentSection === 1) {
      return; // Don't go back from section 1 for Marriage Preparation Programme
    }
    
    if (currentSection > 0) {
      const prevSection = currentSection - 1;
      this.navigateToSection(prevSection); // Use URL navigation method
    }
  };

  // Update the isCurrentSectionValid method to handle Marriage Preparation Programme
  isCurrentSectionValid = () => {
    const { currentSection, formData } = this.state;
    
    console.log("isCurrentSectionValid check - currentSection:", currentSection, "formData.type:", formData.type);
    
    // For Marriage Preparation Programme and Talks And Seminar, allow navigation without validation
    if (formData.type === 'Marriage Preparation Programme' || formData.type === 'Talks And Seminar') {
      console.log("Returning true for Marriage Prep or Talks And Seminar");
      return true;
    }
    
    switch (currentSection) {
      case 0: // FormDetails section
        return true; // Remove authentication requirement for other course types
    
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

  // Function to dynamically standardize course location addresses
  standardizeLocationAddress = (location, locationName) => {
    if (!location && !locationName) return '';
    
    console.log('Standardizing location:', { location, locationName });
    
    // Venue postal code lookup for cases where postal code is missing
    const venuePostalCodes = {
      'CT Hub': '529684',
      'Our Tampines Hub': '529684', 
      'Tampines Hub': '529684',
      'Tampines North Community Centre': '529204',
      'Tampines North CC': '529204',
      'Tampines North Community Club': '529204',
      'Tampines 253 Centre': '520253',
      '恩 Project@253': '520253',
      'Pasir Ris West Wellness Centre': '519639',
      'Pasir Ris West': '519639'
    };
    
    // If we have a clean location string that already looks like a proper address, use it
    if (location) {
      const cleanLocation = location.trim();
      
      // Check if it already has a good format (contains street number, name, and postal code)
      const hasStreetNumber = /^\d+[A-Z]?\s/.test(cleanLocation);
      const hasPostalCode = /\d{6}/.test(cleanLocation);
      const hasStreetName = /(?:Street|Road|Avenue|Drive|Lane|Walk|Close|Crescent|Place|Way|Boulevard|Circuit|Park|View|Gardens?|Centre|Building|Tower|Plaza|Square|Mall|Hub)/i.test(cleanLocation);
      
      if (hasStreetNumber && hasPostalCode && hasStreetName) {
        // Address looks complete, just ensure proper formatting
        let standardized = cleanLocation;
        
        // Ensure "Singapore" is included before postal code if not present
        if (!standardized.includes('Singapore')) {
          standardized = standardized.replace(/(\d{6})/, 'Singapore $1');
        }
        
        // Clean up extra spaces and ensure proper comma placement
        standardized = standardized
          .replace(/\s+/g, ' ')                    // Multiple spaces to single space
          .replace(/,\s*,/g, ',')                  // Remove double commas
          .replace(/,\s*Singapore/g, ', Singapore') // Ensure comma before Singapore
          .trim();
        
        console.log('Address already well-formatted:', standardized);
        return standardized;
      }
      
      // Try to extract components from a less formatted address
      const components = this.extractAddressComponents(cleanLocation);
      
      // If no postal code found but we have venue name, try to add it
      if (!components.postalCode && locationName && venuePostalCodes[locationName]) {
        components.postalCode = venuePostalCodes[locationName];
        console.log(`Added postal code ${components.postalCode} for venue: ${locationName}`);
      }
      
      // Also check if the location text itself contains a venue name
      if (!components.postalCode) {
        for (const [venueName, postal] of Object.entries(venuePostalCodes)) {
          if (cleanLocation.toLowerCase().includes(venueName.toLowerCase())) {
            components.postalCode = postal;
            console.log(`Found venue ${venueName} in location text, added postal code: ${postal}`);
            break;
          }
        }
      }
      
      if (components.streetNumber && components.streetName) {
        const formatted = this.formatAddressComponents(components);
        console.log('Formatted extracted components:', formatted);
        return formatted;
      }
      
      // If we still don't have a complete address but have some components, format what we have
      if (components.streetNumber || components.streetName || components.buildingName) {
        // Add postal code if we can identify the venue
        if (!components.postalCode && locationName && venuePostalCodes[locationName]) {
          components.postalCode = venuePostalCodes[locationName];
        }
        
        const formatted = this.formatAddressComponents(components);
        if (formatted) {
          console.log('Formatted partial components:', formatted);
          return formatted;
        }
      }
    }
    
    // If locationName exists and we have a postal code for it, try to construct a basic address
    if (locationName && venuePostalCodes[locationName]) {
      const basicAddress = `${locationName}, Singapore ${venuePostalCodes[locationName]}`;
      console.log('Created basic address from venue name:', basicAddress);
      return basicAddress;
    }
    
    console.log('Using original location as fallback:', location || locationName || '');
    return location || locationName || '';
  };

  // Extract address components from unformatted text
  extractAddressComponents = (text) => {
    const components = {
      streetNumber: '',
      streetName: '',
      unitNumber: '',
      buildingName: '',
      postalCode: '',
      country: 'Singapore'
    };
    
    console.log('Extracting components from:', text);
    
    // Extract postal code (6 digits anywhere in the text)
    const postalMatch = text.match(/\b(\d{6})\b/);
    if (postalMatch) {
      components.postalCode = postalMatch[1];
      console.log('Found postal code:', components.postalCode);
    }
    
    // Extract street number (number at the beginning or after common prefixes)
    const streetNumberMatch = text.match(/(?:^|\s)(\d+[A-Z]?)\s+(?:Tampines|Pasir Ris|Block|Street|Road|Avenue)/i) || 
                             text.match(/^(\d+[A-Z]?)\s/);
    if (streetNumberMatch) {
      components.streetNumber = streetNumberMatch[1];
      console.log('Found street number:', components.streetNumber);
    }
    
    // Extract unit number (format like #01-03, #B1-31, etc.)
    const unitMatch = text.match(/#([^,\s]+)/);
    if (unitMatch) {
      components.unitNumber = unitMatch[1];
      console.log('Found unit number:', components.unitNumber);
    }
    
    // Extract street name (more flexible patterns)
    let streetNameMatch = text.match(/\d+[A-Z]?\s+([^#,]+?)(?:\s+#|\s*,|\s+Singapore|\s*\d{6}|\s*$)/i);
    if (!streetNameMatch) {
      // Try alternative patterns for street names
      streetNameMatch = text.match(/(?:Tampines|Pasir Ris)\s+([^#,]+?)(?:\s+#|\s*,|$)/i) ||
                       text.match(/Block\s+\d+[A-Z]?\s+([^#,]+?)(?:\s+#|\s*,|$)/i) ||
                       text.match(/(\w+\s+(?:Street|Road|Avenue|Drive|Lane|Walk|Close|Crescent|Place|Way|Boulevard|Circuit|Park|View))/i);
    }
    if (streetNameMatch) {
      components.streetName = streetNameMatch[1].trim();
      console.log('Found street name:', components.streetName);
    }
    
    // Extract building name (text after unit number or descriptive building names)
    let buildingMatch = text.match(/#[^,]*,?\s*([^,]+?)(?:\s*,\s*Singapore|\s*Singapore|\s*\d{6}|\s*$)/i);
    if (!buildingMatch) {
      // Try alternative patterns for building names
      buildingMatch = text.match(/(?:Community Centre|Community Club|Centre|Building|Hub|Tower|Plaza|Mall)([^,]*)/i) ||
                     text.match(/([^,]*(?:Community Centre|Community Club|Centre|Building|Hub|Tower|Plaza|Mall))/i);
    }
    if (buildingMatch) {
      const building = buildingMatch[1].trim();
      // Exclude single digit numbers, postal codes, or meaningless fragments
      if (building && 
          !building.match(/^\d{6}$/) && // Not a postal code
          !building.match(/^\d{1,2}$/) && // Not a single/double digit number
          building.length > 2 && // Must be longer than 2 characters
          !building.match(/^[,\s]+$/)) { // Not just punctuation and spaces
        components.buildingName = building;
        console.log('Found building name:', components.buildingName);
      }
    }
    
    // If no specific building name found, but we have descriptive text, use it
    if (!components.buildingName) {
      // Look for venue-specific names
      const venueMatch = text.match(/(CT Hub|Our Tampines Hub|Tampines Hub|Community Centre|Community Club|Wellness Centre)/i);
      if (venueMatch) {
        components.buildingName = venueMatch[1];
        console.log('Found venue name:', components.buildingName);
      }
    }
    
    console.log('Extracted components:', components);
    return components;
  };

  // Format address components into standardized format
  formatAddressComponents = (components) => {
    const parts = [];
    
    console.log('Formatting components:', components);
    
    // Street number and name
    if (components.streetNumber && components.streetName) {
      parts.push(`${components.streetNumber} ${components.streetName}`);
    } else if (components.streetNumber) {
      // If we have street number but no street name, still include it
      parts.push(components.streetNumber);
    } else if (components.streetName) {
      // If we have street name but no number, still include it
      parts.push(components.streetName);
    }
    
    // Unit number
    if (components.unitNumber) {
      parts.push(`#${components.unitNumber}`);
    }
    
    // Building name
    if (components.buildingName) {
      parts.push(components.buildingName);
    }
    
    // Country and postal code
    if (components.postalCode) {
      parts.push(`${components.country} ${components.postalCode}`);
    } else if (parts.length > 0) {
      // If we have address parts but no postal code, still add Singapore
      parts.push(components.country);
    }
    
    const formatted = parts.join(', ');
    console.log('Formatted address:', formatted);
    return formatted;
  };
  

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
    // courseChiName contains either Chinese name or Malay name depending on language
    var courseChiName = this.decodeHtmlEntities(formData.chineseName);
    var courseLocation = formData.location; // Use simple location name, not detailed address
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
          courseTime: courseTime,
          courseMode: courseMode,
          payment: payment
      },
      agreement: agreement,
      status: "Pending", 
    };

    // Add Marriage Preparation Programme specific fields if applicable
    if (courseType === 'Marriage Preparation Programme') {
      participantDetails.marriageDetails = {
        maritalStatus: formData.mARITALSTATUS,
        housingType: formData.hOUSINGTYPE,
        grossMonthlyIncome: formData.gROSSMONTHLYINCOME,
        marriageDuration: formData.mARRIAGEDURATION,
        typeOfMarriage: formData.tYPEOFMARRIAGE,
        hasChildren: formData.hASCHILDREN,
        howFoundOut: formData.howFoundOut,
        howFoundOutOthers: formData.howFoundOutOthers,
        sourceOfReferral: formData.sourceOfReferral
      };
      
      participantDetails.spouse = {
        name: formData.spouseName,
        nric: formData.spouseNRIC,
        dateOfBirth: formData.spouseDOB,
        residentialStatus: formData.spouseResidentialStatus,
        sex: formData.spouseSex,
        ethnicity: formData.spouseEthnicity,
        maritalStatus: formData.spouseMaritalStatus,
        postalCode: formData.spousePostalCode,
        mobile: formData.spouseMobile,
        email: formData.spouseEmail,
        education: formData.spouseEducation,
        housingType: formData.spouseHousingType
      };

      participantDetails.consent = {
        marriagePrepConsent1: formData.marriagePrepConsent1,
        marriagePrepConsent2: formData.marriagePrepConsent2
      };
    }

    console.log('Participants Details', participantDetails);
    
    // Example of sending data to the server using Axios
    axios.post(
      `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`, 
      { participantDetails, purpose: "insert" }
    )
      .then((response) => {
        console.log('Form submitted successfully', response.data);
        if (response.data) {
          // Navigate to SubmitDetailsSection after successful submission
          const { formData } = this.state;
          let nextSection;
          
          if (formData.type === 'Marriage Preparation Programme') {
            nextSection = 5; // Section 5 for Marriage Preparation Programme
          } else if (formData.type === 'Talks And Seminar') {
            nextSection = 3; // Section 3 for Talks And Seminar
          } else {
            nextSection = 4; // Section 4 for regular courses (NSA/ILP)
          }
          
          // Navigate to the submit details section
          this.navigateToSection(nextSection);
          window.scrollTo(0, 0);
          
          // Clear session storage after successful submission
          // Send WhatsApp registration message via backend using Interakt template "course_registration_submission"
          /*axios.post(
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
          })*/


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
    // Special handling for Talks And Seminar - year only format (yyyy)
    if (courseType === 'Talks And Seminar') {
      if (!dob) {
        return { isValid: false, error: this.getErrorMessage('Birth Year is required.', '出生年份是必填项。', 'Tahun Lahir diperlukan.') };
      }
      // Check if it's a 4-digit year
      if (!/^\d{4}$/.test(dob)) {
        return { isValid: false, error: this.getErrorMessage('Birth Year must be a 4-digit year.', '出生年份必须是4位数字。', 'Tahun Lahir mesti 4 digit.') };
      }
      const year = parseInt(dob, 10);
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 10) {
        return { isValid: false, error: this.getErrorMessage(`Birth Year must be between 1900 and ${currentYear + 10}.`, `出生年份必须在1900年至${currentYear + 10}年之间。`, `Tahun Lahir mesti antara 1900 dan ${currentYear + 10}.`) };
      }
      return { isValid: true, error: null };
    }
    
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
      if (this._isMounted) {
        this.setState({ age });
      } else {
        this.state.age = age;
      }
      /*if (age < 50) {
        return { isValid: false, error: 'Age must be at least 50 years. 年龄必须至少为50岁。' };
      }*/
     if (age < 50) {
        return { isValid: true, error: null };
      }
      return { isValid: true, error: null };
    }
    if (dob.formattedDate1) {
      const currentYear = new Date().getFullYear();
      const birthYear = new Date(dob.formattedDate1).getFullYear();
      const age = currentYear - birthYear;
      if (this._isMounted) {
        this.setState({ age });
      } else {
        this.state.age = age;
      }
      /*if (age < 50) {
        return { isValid: false, error: 'Age must be at least 50 years. 年龄必须至少为50岁。' };
      }*/
      if (age < 50) {
        return { isValid: true, error: null };
      }
      return { isValid: true, error: null };
    }
    return { isValid: false, error: 'Date of Birth is required. 出生日期是必填项。' };
  }

  // Helper function to get language-appropriate error messages for Talks And Seminar
  getErrorMessage = (english, chinese, malay) => {
    const { formData } = this.state;
    console.log("Form Data:", formData);
    // For Talks And Seminar courses with Malay language option, show English and Malay
    if (formData.type === 'Talks And Seminar' && formData.isMalayLanguage) {
      return `${english} ${malay}`;
    }
    else
    {
     return `${english} ${chinese}`;
    }
  };

  validateForm = () => {
    const { currentSection, formData } = this.state;
    const errors = {};
    
    // For Marriage Preparation Programme and Talks And Seminar, treat section 0 as section 1 for validation
    const effectiveSection = ((formData.type === 'Marriage Preparation Programme' || formData.type === 'Talks And Seminar') && currentSection === 0) ? 1 : currentSection;
    
    if (effectiveSection === 0) {
      return errors;
    }
    if (effectiveSection === 1) {
      // Skip all validation for Marriage Preparation Programme - allow direct navigation
      if (formData.type === 'Marriage Preparation Programme') {
        // No validation required for Marriage Preparation Programme
        return errors;
      }
      
      // Validation for Talks And Seminar courses
      if (formData.type === 'Talks And Seminar') {
        // Required fields for Talks And Seminar: Name, Contact No., Birth Year, Residential Status, Postal Code
        if (!formData.pName) {
          errors.pName = this.getErrorMessage('Name is required.', '姓名是必填项。', 'Nama diperlukan.');
        }
        if (!formData.cNO) {
          errors.cNO = this.getErrorMessage('Contact No. is required.', '联系号码是必填项。', 'No. Telefon diperlukan.');
        }
        if (formData.cNO && !/^\d+$/.test(formData.cNO)) {
          errors.cNO = this.getErrorMessage('Contact No. must contain only numbers.', '联系号码只能包含数字。', 'No. Telefon hanya boleh mengandungi nombor.');
        }
        if (formData.cNO && formData.cNO.length !== 8) {
          errors.cNO = this.getErrorMessage('Contact No. must be exactly 8 digits.', '联系号码必须是8位数字。', 'No. Telefon mesti tepat 8 digit.');
        }
        if (formData.cNO && !/^[89]/.test(formData.cNO)) {
          errors.cNO = this.getErrorMessage('Contact No. must start with 8 or 9.', '联系号码必须以8或9开头。', 'No. Telefon mesti bermula dengan 8 atau 9.');
        }
        if (!formData.dOB) {
          errors.dOB = this.getErrorMessage('Birth Year is required.', '出生年份是必填项。', 'Tahun Lahir diperlukan.');
        }
        if (formData.dOB) {
          const { isValid, error } = this.isValidDOB(formData.dOB, formData.type);
          if (!isValid) {
            errors.dOB = error;
          }
        }
        if (!formData.rESIDENTIALSTATUS) {
          errors.rESIDENTIALSTATUS = this.getErrorMessage('Residential Status is required.', '居民身份是必填项。', 'Status Kediaman diperlukan.');
        }
        if (!formData.postalCode) {
          errors.postalCode = this.getErrorMessage('Postal Code is required.', '邮编是必填项。', 'Poskod diperlukan.');
        }
        if (formData.postalCode && !/^\d{6}$/.test(formData.postalCode)) {
          errors.postalCode = this.getErrorMessage('Postal Code must be exactly 6 digits.', '邮编必须是6位数字。', 'Poskod mesti tepat 6 digit.');
        }
        return errors;
      }
      
      // NSA/ILP validation only
      if (!formData.pName) {
        errors.pName = 'Name is required. 姓名是必填项。';
      }
      if (!formData.nRIC) {
        errors.nRIC = 'NRIC Number is required. 身份证号码是必填项。';
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
      if (!formData.location) {
        errors.location = 'Location is required. 地点是必填项。';
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
    if (this._isMounted) {
      this.setState({
        myInfoError: true,
        showMyInfoErrorModal: true,
        myInfoErrorMessage: message,
        serviceRecommendations: this.myInfoErrorHandler.getErrorRecommendations()
      });
    }

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
      if (this._isMounted) {
        this.setState({
          myInfoServiceStatus: status,
          serviceRecommendations: this.myInfoErrorHandler.getErrorRecommendations()
        });
      }
    } else if (type === 'network') {
      if (this._isMounted) {
        this.setState({
          networkOnline: status === 'online'
        });
      }
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
    // Set mounted flag to false
    this._isMounted = false;
    
    console.log('🔍 Stopping MyInfo real-time monitoring...');
    if (this.myInfoErrorHandler) {
      this.myInfoErrorHandler.destroy();
    }
    
    // Remove event listeners
    if (process.env.NODE_ENV === 'development' && this.handleKeyPress) {
      document.removeEventListener('keydown', this.handleKeyPress);
    }
  };

  render() {
    const { currentSection, formData, validationErrors, bgColor, loading, isAuthenticated, age } = this.state;
    console.log('Current Age:', age);

    // Render the loading spinner or content depending on loading state
    if (loading === false) {
      return (
        <div className="loading-spinner1" style={{ textAlign: 'center', marginTop: '20px' }}>
          <div className="spinner1"></div>
          <p style={{ fontSize: '18px', color: '#333', fontWeight: '600', marginTop: '10px' }}>Loading...</p>
        </div>
      );
    }     

    // Helper function to get language-appropriate button labels for Talks And Seminar
    const getButtonLabel = (english, chinese, malay) => {
      // For Talks And Seminar courses with Malay language option, show English and Malay
      if (formData.type === 'Talks And Seminar' && formData.isMalayLanguage && malay) {
        return `${english} ${malay}`;
      }
      return `${english} ${chinese}`;
    };
  
    return (
      <div className="formwholepage" style={{ backgroundColor: bgColor }}>
        <div className="form-page">
          <div className={`form-container ${(formData.type === 'NSA' || formData.type === 'ILP') ? 'nsa-ilp-form' : ''}`} style={this.state.formContainerBg ? { backgroundColor: this.state.formContainerBg } : {}}>
            {/* MyInfo Service Status Indicator */}
            <MyInfoStatusIndicator 
              status={this.state.myInfoServiceStatus}
              isOnline={this.state.networkOnline}
              recommendations={this.state.serviceRecommendations}
              compact={true}
            />
            {currentSection === 0 && formData.type !== 'Marriage Preparation Programme' && (
              <FormDetails 
                courseType={formData.type} 
                isAuthenticated={isAuthenticated}
                onAuthenticationChange={(authStatus) => this.setState({ isAuthenticated: authStatus })}
                onProceedWithoutSingPass={this.handleProceedWithoutSingPass}
                validationErrors={validationErrors}
                hideSingPass={formData.type === 'Talks And Seminar'}
              />
            )}
            {(currentSection === 1 || (currentSection === 0 && formData.type === 'Marriage Preparation Programme')) && (
              <PersonalInfo
                data={formData}
                onChange={this.handleDataChange}
                errors={validationErrors}
                singPassPopulatedFields={formData.type === 'Marriage Preparation Programme' || formData.type === 'Talks And Seminar' ? {} : this.state.singPassPopulatedFields}
                onClearSingPassData={formData.type === 'Marriage Preparation Programme' || formData.type === 'Talks And Seminar' ? null : this.clearSingPassData}
                hideMyInfoOptions={formData.type === 'Marriage Preparation Programme' || formData.type === 'Talks And Seminar'}
                showLimitedFields={formData.type === 'Talks And Seminar'}
                isMalayLanguage={formData.isMalayLanguage || false} // Pass Malay language flag
              />
            )}
            {currentSection === 2 && formData.type === 'Marriage Preparation Programme' && (
              <SpouseInfo
                data={formData}
                onChange={this.handleDataChange}
                errors={validationErrors}
              />
            )}
            {currentSection === 2 && formData.type !== 'Marriage Preparation Programme' && (
              <CourseDetails
                ref={(ref) => (this.courseDetailsRef = ref)}
                courseEnglishName={formData.englishName}
                courseChineseName={formData.chineseName}
                extractedLocation={formData.courseLocation}
                coursePrice={formData.price}
                courseType={formData.type}
                courseDuration={formData.courseDuration}
                courseMode={formData.courseMode}
                courseTime={formData.courseTime}
                courseLocation={formData.location}
                payment={formData.payment}
                onChange={this.handleDataChange}
                age={this.state.age}
                isMalayLanguage={formData.isMalayLanguage || false}
              />
            )}
            {currentSection === 3 && formData.type === 'Marriage Preparation Programme' && (
              <CourseDetails
                ref={(ref) => (this.courseDetailsRef = ref)}
                courseEnglishName={formData.englishName}
                courseChineseName={formData.chineseName}
                extractedLocation={formData.location}
                coursePrice={formData.price}
                courseType={formData.type}
                courseDuration={formData.courseDuration}
                courseMode={formData.courseMode}
                courseTime={formData.courseTime}
                courseLocation={formData.courseLocation}
                payment={formData.payment}
                onChange={this.handleDataChange}
                isMalayLanguage={formData.isMalayLanguage || false}
              />
            )}
            {currentSection === 3 && formData.type !== 'Marriage Preparation Programme' && formData.type !== 'Talks And Seminar' && (
              <AgreementDetailsSection
                ref={(ref) => (this.agreementDetailsRef = ref)}
                agreement={formData.agreement}
                onChange={this.handleDataChange}
                errors={validationErrors}
                courseType={formData.type}
              />
            )}
            {currentSection === 4 && formData.type === 'Marriage Preparation Programme' && (
              <AgreementDetailsSection
                ref={(ref) => (this.agreementDetailsRef = ref)}
                agreement={formData.agreement}
                onChange={this.handleDataChange}
                errors={validationErrors}
                courseType={formData.type}
              />
            )}
            {((currentSection === 4 && formData.type !== 'Marriage Preparation Programme' && formData.type !== 'Talks And Seminar') ||
              (currentSection === 5 && formData.type === 'Marriage Preparation Programme') ||
              (currentSection === 3 && formData.type === 'Talks And Seminar')) && 
              <SubmitDetailsSection 
                courseType={formData.type}
                isMalayLanguage={formData.isMalayLanguage || false}
              />}
          </div>
        </div>

        {/* Show Next button for Talks And Seminar (with SingPass hidden) */}
        {currentSection === 0 && formData.type === 'Talks And Seminar' && (
          <div className="button-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button 
              onClick={this.handleNext} 
              disabled={!this.isCurrentSectionValid()}
              className="next-button"
            >
              {getButtonLabel('Next', '下一步', 'Seterusnya')}
            </button>
          </div>
        )}

        {/* Simplified button structure - remove authentication logic */}
        {currentSection === 0 && formData.type !== 'Marriage Preparation Programme' && formData.type !== 'Talks And Seminar' && (
          <div className="flex-button-container">
            <button 
              onClick={this.handleNext} 
              disabled={!this.isCurrentSectionValid()}
              className="next-button"
            >
              {getButtonLabel('Next', '下一步', 'Seterusnya')}
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
        {((currentSection > 0 && currentSection < 4 && !(currentSection === 3 && formData.type === 'Talks And Seminar')) || 
          (currentSection === 4 && formData.type === 'Marriage Preparation Programme')) && (
          <div className="button-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Hide back button only for PersonalInfo section (section 1) of Marriage Preparation Programme */}
            {!(formData.type === 'Marriage Preparation Programme' && (currentSection === 0 || currentSection === 1)) ? (
              <button 
                onClick={this.handleBack} 
                disabled={currentSection === 0}
              >
                {getButtonLabel('Back', '返回', 'Kembali')}
              </button>
            ) : (
              <div></div> // Empty div to maintain flex spacing
            )}
            <button 
              onClick={(currentSection === 3 && formData.type !== 'Marriage Preparation Programme' && formData.type !== 'Talks And Seminar') || 
                       (currentSection === 4 && formData.type === 'Marriage Preparation Programme') ||
                       (currentSection === 2 && formData.type === 'Talks And Seminar') ? 
                       this.handleSubmit : this.handleNext} 
              disabled={!this.isCurrentSectionValid()}
              style={{ marginLeft: 'auto' }}
            >
              {(currentSection === 3 && formData.type !== 'Marriage Preparation Programme') || 
               (currentSection === 4 && formData.type === 'Marriage Preparation Programme') ||
               (currentSection === 2 && formData.type === 'Talks And Seminar') ? 
               getButtonLabel('Submit', '提交', 'Hantar') : getButtonLabel('Next', '下一步', 'Seterusnya')}
            </button>
          </div>
        )}

        {/* Continue button for Submit Details section */}
        {((currentSection === 4 && formData.type !== 'Marriage Preparation Programme' && formData.type !== 'Talks And Seminar') ||
          (currentSection === 5 && formData.type === 'Marriage Preparation Programme') ||
          (currentSection === 3 && formData.type === 'Talks And Seminar')) && (
          <div className="button-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button 
              className="submit-details-button" 
              onClick={() => {
                window.location.href = 'https://ecss.org.sg/product-category/courses/';
              }}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.3s ease',
                minWidth: '100px'
              }}
            >
              {getButtonLabel('OK', 'OK', 'Baik')}
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
