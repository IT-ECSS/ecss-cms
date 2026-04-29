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
import SubmissionInProgressPopup from './SubmissionInProgressPopup';

// Constant to enable/disable MyInfo error testing
const FORCE_MYINFO_ERROR = false; // Set to true to force MyInfo errors for testing

class FormPage extends Component {
  constructor(props) {
    super(props);
    this.isSubmitting = false; // Prevent duplicate submissions
    this.state = {
      currentSection: 0,
      loading: false,
      loadingPhase: 'initial', // 'initial' -> 'background' -> 'form' -> 'complete'
      isAuthenticated: false,
      bgColor: '#F5F5F5', // Default light gray - will update to course type color
      formContainerBg: '', // Background for form container
      singPassPopulatedFields: {}, // Add this to track SingPass populated fields
      courseCategories: [], // Store course categories for section 0
      courseData: null, // Store full course data for pre-loading
      // Add MyInfo error handling state
      myInfoError: false,
      showMyInfoErrorModal: false,
      myInfoErrorMessage: '',
      // Real-time monitoring state
      myInfoServiceStatus: 'unknown',
      networkOnline: navigator.onLine,
      showStatusIndicator: true,
      serviceRecommendations: [],
      showSubmissionInProgress: false,
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
        payment: '',
        agreement: '',
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
      age: 0,
      courseDataLoaded: false // Flag to prevent duplicate API calls
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

    // Default to XX unless we find a valid code
    let raceCode = 'XX';

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
      'XX': 'Others 其他'
    };

    return raceMap[raceCode] || 'Others 其他';
  };


  // Add helper function to format gender
  formatGender = (gender) => {
    console.log("Formatting gender:", gender);
    if (!gender) return '';
    
    // Handle if gender is already formatted
    if (typeof gender === 'string' && (gender.includes('男') || gender.includes('女'))) {
      return gender;
    }
    
    // Extract code if it's a SingPass structured object
    let genderCode = gender;
    if (typeof gender === 'object') {
      if (gender.code) {
        genderCode = gender.code;
      } else if (gender.value) {
        genderCode = gender.value;
      }
    }
    
    // Format according to your requirements
    const genderMap = {
      'M': 'M 男',
      'F': 'F 女'
    };
    
    return genderMap[genderCode] || '';
  };

  // Updated formatResidentialStatus method to handle the classification property correctly
  formatResidentialStatus = (status) => {
    console.log("Residential Status:", status);
    
    if (!status) return '';
    
    // Handle if status is already a string code
    if (typeof status === 'string' && (status === 'SC' || status === 'C' || status === 'PR' || status === 'P')) {
      // Standardize: C->SC, P->PR, then return bilingual format
      const code = status === 'C' ? 'SC' : status === 'P' ? 'PR' : status;
      return code === 'SC' ? 'SC 新加坡公民' : code === 'PR' ? 'PR 永久居民' : '';
    }
    
    // Extract the correct status code from SingPass structured object
    let statusCode = status;
    if (typeof status === 'object') {
      // Try to extract code in order of preference: code > classification > value
      if (status.code) {
        statusCode = status.code;
      } else if (status.classification) {
        statusCode = status.classification;
      } else if (status.value) {
        statusCode = status.value;
      }
    }
    
    console.log("Status Code extracted:", statusCode);
    
    // Standardize the codes and return bilingual format: C->SC, P->PR
    if (statusCode === 'C') {
      return 'SC 新加坡公民';
    } else if (statusCode === 'P') {
      return 'PR 永久居民';
    } else if (statusCode === 'SC') {
      return 'SC 新加坡公民';
    } else if (statusCode === 'PR') {
      return 'PR 永久居民';
    }
    
    return '';
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

  // Helper function to extract category from URL parameter
  getCategoryFromURL = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const category = params.get('category');
      console.log('📦 Category from URL parameter:', category);
      return category ? decodeURIComponent(category) : null;
    } catch (error) {
      console.error('Error extracting category from URL:', error);
      return null;
    }
  };

  // Helper function to map category to course type
  mapCategoryToType = (category) => {
    if (!category) return null;
    
    const categoryMap = {
      'ILP': 'ILP',
      'NSA': 'NSA',
      'Talks And Seminar': 'Talks And Seminar',
      'Marriage Preparation Programme': 'Marriage Preparation Programme'
    };
    
    const type = categoryMap[category];
    console.log(`📦 Mapped category "${category}" to type "${type}"`);
    return type || null;
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
    
    // Check URL parameters for section override, course link, and category
    const params = new URLSearchParams(window.location.search);
    let link = decodeURIComponent(params.get("link"));
    const sectionParam = params.get('section');
    console.log('📦 Section parameter from URL:', sectionParam);
    const categoryFromURL = this.getCategoryFromURL();
    const courseTypeFromCategory = categoryFromURL ? this.mapCategoryToType(categoryFromURL) : null;
    
    console.log('📦 Course type from category:', courseTypeFromCategory);
    
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
        loading: false,  // Form HIDDEN initially - will show after background loads
        loadingPhase: 'background', // Start with background loading
        currentSection: initialSection,
        bgColor: '#F5F5F5' // Will update to course type when data loads
      });
      
      // Pre-populate form with SingPass data
      this.populateFormWithSingPassData();
    } else {
      console.log('User not authenticated, proceeding without SingPass data');
      this.setState({ 
        isAuthenticated: false,
        loading: false,  // Form HIDDEN initially - will show after background loads
        loadingPhase: 'background', // Start with background loading
        currentSection: initialSection,
        bgColor: '#F5F5F5' // Will update to course type when data loads
      });
    }

    // Load course data IMMEDIATELY (no Promise.resolve delay) to get background color ASAP
    console.log('🎯 [Form] Fetching course data for background color immediately...');
    
    this.loadCourseData(link, hasSectionParam, courseTypeFromCategory)
    .then(() => {
      console.log('✅ [Form] Course data loaded - background color set, now showing form');
      // Now that background is set, show the form
      if (this._isMounted) {
        this.setState({ 
          loadingPhase: 'form',
          loading: true 
        });
      }
    })
    .then(() => {
      // Mark as complete immediately - no fade-in delay
      if (this._isMounted) {
        this.setState({ loadingPhase: 'complete' });
      }
    })
    .catch(err => {
      console.error('❌ [Form] Course load error:', err);
      // Still display form with default color even if load fails
      if (this._isMounted) {
        this.setState({ 
          loadingPhase: 'complete',
          loading: true 
        });
      }
    });
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

  // Fast method: fetch a single course directly by its permalink (1 API call instead of paginating all products)
  async fetchCourseByLink(link) {
    try {
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net";
      console.log(`🔍 Fetching course from: ${baseUrl}/course_by_link/`);
      console.log(`📍 Link parameter: ${link}`);
      const response = await axios.post(`${baseUrl}/course_by_link/`, { link });
      console.log("📊 Backend response status:", response.status);
      console.log("📦 Backend response data:", response.data);
      const course = response.data.course;
      console.log("✅ Fetched course by link:", course);
      if (!course) {
        console.warn("⚠️ Backend returned null course");
      }
      return course || null;
    } catch (error) {
      console.error("❌ Error fetching course by link:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      return null;
    }
  }

  // Optimised loadCourseData — fetches a single course by link/slug instead of loading ALL courses
  loadCourseData = async (link, hasSectionParam = false, courseTypeFromCategory = null) => {
    // Prevent duplicate API calls
    if (this.state.courseDataLoaded) {
      console.log('⚠️  Course data already loaded, skipping duplicate fetch');
      return;
    }

    // Use provided link or try to get from sessionStorage
    if (!link) {
      link = sessionStorage.getItem("courseLink");
    }

    console.log('Loading course data with link:', link);
    console.log('Has section param:', hasSectionParam);
    console.log('Course type from category:', courseTypeFromCategory);

    if (link) {
      // Ensure the link is properly decoded
      let decodedLink = link;
      try {
        if (link.includes('%')) {
          decodedLink = decodeURIComponent(link);
        }
      } catch (error) {
        console.warn('Could not decode link, using original:', error);
        decodedLink = link;
      }

      console.log('Decoded course link for processing:', decodedLink);

      // Directly fetch only the matching course by its link (fast — single API call)
      const matchedCourse = await this.fetchCourseByLink(decodedLink);
      console.log("Matched Course:", matchedCourse);

      if (matchedCourse) {
        // Store categories for section 0 IMMEDIATELY and cache full course data
        if (this._isMounted) {
          this.setState({ 
            courseCategories: matchedCourse.categories || [], 
            courseData: matchedCourse,
            courseDataLoaded: true // Mark course data as loaded
          });
          console.log('✅ [Section 0] Categories and course data loaded and cached');
        }
        
        // Robust extraction of course type - search ALL categories for known type patterns
        let type = '';
        if (
          matchedCourse.categories &&
          Array.isArray(matchedCourse.categories) &&
          matchedCourse.categories.length > 0
        ) {
          for (const cat of matchedCourse.categories) {
            if (cat && typeof cat.name === 'string') {
              const catName = cat.name.trim();
              if (catName === 'Talks And Seminar') {
                type = 'Talks And Seminar';
                break;
              }
              if (catName === 'Marriage Preparation Programme') {
                type = 'Marriage Preparation Programme';
                break;
              }
              if (catName.includes(':')) {
                const nameParts = catName.split(':');
                if (nameParts.length > 1) {
                  const extracted = nameParts[1].trim();
                  if (extracted === 'NSA' || extracted === 'ILP') {
                    type = extracted;
                    break;
                  }
                }
              }
            }
          }
        }
        console.log("✅ Matched Course Name:", matchedCourse.name);
        console.log("🏷️ Course Type:", type);
        console.log("📋 Course Categories:", matchedCourse.categories);
        console.log("💰 Course Price:", matchedCourse.price);
        console.log("📝 Course Attributes:", matchedCourse.attributes);

        // Determine background color based on course type
        let bgColor = '';
        if (type === 'ILP') {
          bgColor = '#006400'; // Dark Green
        } else if (type === 'NSA') {
          bgColor = '#003366'; // Dark Blue
        } else if (type === 'Talks And Seminar') {
          bgColor = '#DAA520'; // Gold
        } else if (type === 'Marriage Preparation Programme') {
          bgColor = '#DBDBDC'; // Maroon
        } else {
          bgColor = '#F5F5F5'; // Default gray
        }
        console.log('🎨 [BackgroundColor] Set to:', bgColor, 'for course type:', type);
        
        let formContainerBg = '';
        
        // Apply special styling for Marriage Prep if needed
        if (type === 'Marriage Preparation Programme') {
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
            if (!timingParagraph.includes("–")) {
              timingParagraph = this.decodeHtmlEntities(timingParagraph);
            }
            const timePattern = /(\d{1,2}[:.]\d{2}[ap]m\s*[–-]\s*\d{1,2}[:.]\d{2}[ap]m)/i;
            const timeMatch = timingParagraph.match(timePattern);
            if (timeMatch && timeMatch[0]) {
              courseTime = timeMatch[0];
              console.log("Successfully extracted timing:", courseTime);
            } else {
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
          const fullDescription = this.decodeHtmlEntities(shortDescription);
          const lines = fullDescription.split(/[<>]/g).filter(line => line.trim().length > 0);

          for (let line of lines) {
            const cleanLine = line.replace(/<[^>]*>/g, '').trim();
            if (cleanLine.match(/(?:地点\s*)?(?:Lokasi\s*)?Location:\s*(.+)|(?:地点|Lokasi):\s*(.+)/i)) {
              const locationMatch = cleanLine.match(/(?:地点\s*)?(?:Lokasi\s*)?Location:\s*(.+)|(?:地点|Lokasi):\s*(.+)/i);
              if (locationMatch && locationMatch[1]) {
                courseLocation = locationMatch[1].trim();
                break;
              } else if (locationMatch && locationMatch[2]) {
                courseLocation = locationMatch[2].trim();
                break;
              }
            }
            if (cleanLine.includes('Singapore') ||
                cleanLine.match(/\d+[A-Z]?\s+[A-Za-z\s]+(?:Road|Street|Avenue|Drive|Lane|Walk|Close|Crescent|Place|Way|Boulevard|Circuit|Park|View|Gardens?|Centre|Building|Tower|Plaza|Square|Mall|Hub)/i) ||
                cleanLine.match(/^\d+[A-Z]?\s+.+\s+Singapore\s+\d{6}$/i) ||
                cleanLine.match(/Block\s+\d+/i) ||
                cleanLine.match(/\d{6}$/i) ||
                (cleanLine.includes('Level') || cleanLine.includes('Floor')) && cleanLine.length > 20) {
              courseLocation = cleanLine;
              break;
            }
          }

          if (!courseLocation && type === 'Talks And Seminar') {
            for (let line of lines) {
              const cleanLine = line.replace(/<[^>]*>/g, '').trim();
              if (cleanLine.length > 15 &&
                  !cleanLine.match(/^\d{1,2}[:.]\d{2}[ap]m/i) &&
                  !cleanLine.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) &&
                  !cleanLine.includes('http') &&
                  !cleanLine.includes('Contact Number') &&
                  !cleanLine.includes('Fee') &&
                  !cleanLine.includes('$') &&
                  (cleanLine.includes('Centre') || cleanLine.includes('Building') ||
                   cleanLine.includes('Hall') || cleanLine.includes('Room') ||
                   cleanLine.includes('Level') || cleanLine.includes('Floor') ||
                   cleanLine.includes('Block') || cleanLine.includes('Unit') ||
                   cleanLine.includes('Community') || cleanLine.includes('Club') ||
                   cleanLine.match(/\d{6}/))) {
                courseLocation = cleanLine;
                break;
              }
            }
          }

          if (courseLocation && !courseLocation.match(/\d{6}/)) {
            for (let line of lines) {
              const cleanLine = line.replace(/<[^>]*>/g, '').trim();
              const postalCodeMatch = cleanLine.match(/\b(\d{6})\b/);
              if (postalCodeMatch && postalCodeMatch[1]) {
                if (cleanLine.length < 50 && !cleanLine.includes('Contact') && !cleanLine.includes('Fee') && !cleanLine.includes('$')) {
                  courseLocation += ` Singapore ${postalCodeMatch[1]}`;
                  break;
                }
              }
            }
          }

          if (courseLocation) {
            courseLocation = this.standardizeLocationAddress(courseLocation, selectedLocation);
          }
        } catch (error) {
          console.error("Error extracting course location:", error);
        }

        const cleanedStartDate = startDateParagraph.replace("<strong>", "").replace("</strong>", "").replace("</p>", "").split("<br />")[2];
        const cleanedEndDate = endDateParagraph.replace("<strong>", "").replace("</strong>", "").replace("</p>", "").split("<br />")[2];
        const courseDuration = `${cleanedStartDate.replace(/\n/g, "")} - ${cleanedEndDate.replace(/\n/g, "")}`;

        // Parse course name parts
        const courseParts = matchedCourse.name.split(/<br\s*\/?>/).map(part => part.trim());
        const formattedPrice = matchedCourse.price ? `$${parseFloat(matchedCourse.price).toFixed(2)}` : "$0.00";

        // Check language attribute
        let languageOptions = [];
        if (matchedCourse.attributes &&
            matchedCourse.attributes[0] &&
            matchedCourse.attributes[0].slug === 'pa_language' &&
            matchedCourse.attributes[0].options &&
            matchedCourse.attributes[0].options.length > 0) {
          languageOptions = matchedCourse.attributes[0].options;
        }

        const isChineseLanguage = languageOptions.some(option => option.includes('Mandarin'));
        const isMalayLanguage = languageOptions.some(option => option.includes('Malay'));
        const categoryCourseLocation = selectedLocation;

        // Build courseData based on name parts and language
        let courseData = {};

        if (courseParts.length === 3) {
          if (isChineseLanguage) {
            courseData = { chineseName: courseParts[0], englishName: courseParts[1], location: selectedLocation, price: formattedPrice, type, courseDuration, courseTime, courseMode, courseLocation: categoryCourseLocation };
          } else if (isMalayLanguage) {
            courseData = { englishName: courseParts[1], chineseName: courseParts[0], isMalayLanguage: true, location: selectedLocation, price: formattedPrice, type, courseDuration, courseTime, courseMode, courseLocation: categoryCourseLocation };
          } else {
            courseData = { chineseName: courseParts[0], englishName: courseParts[1], location: selectedLocation, price: formattedPrice, type, courseDuration, courseTime, courseMode, courseLocation: categoryCourseLocation };
          }
        } else if (courseParts.length === 2) {
          if (isChineseLanguage) {
            courseData = { englishName: courseParts[0] || '', chineseName: courseParts[1] || '', location: selectedLocation, price: formattedPrice, type, courseDuration, courseTime, courseMode, courseLocation: categoryCourseLocation };
          } else if (isMalayLanguage) {
            courseData = { englishName: courseParts[0] || '', chineseName: courseParts[1] || '', isMalayLanguage: true, location: selectedLocation, price: formattedPrice, type, courseDuration, courseTime, courseMode, courseLocation: categoryCourseLocation };
          } else {
            const processedNames = this.processCourseName(courseParts);
            courseData = { englishName: processedNames.englishName, chineseName: processedNames.chineseName || '', location: selectedLocation, price: formattedPrice, type, courseDuration, courseTime, courseMode, courseLocation: categoryCourseLocation };
          }
        } else if (courseParts.length === 1) {
          courseData = { englishName: courseParts[0], chineseName: '', location: selectedLocation, price: formattedPrice, type, courseDuration, courseTime, courseMode, courseLocation: categoryCourseLocation };
        }

        const shouldStartAtSection1 = type === 'Marriage Preparation Programme' && !hasSectionParam;

        if (this._isMounted) {
          console.log('📝 [Form] About to update formData with:');
          console.log('   - englishName:', courseData.englishName);
          console.log('   - chineseName:', courseData.chineseName);
          console.log('   - courseLocation:', courseData.courseLocation);
          console.log('   - price:', courseData.price);
          console.log('   - type:', courseData.type);
          console.log('   - courseDuration:', courseData.courseDuration);
          console.log('   - courseTime:', courseData.courseTime);
          console.log('   - courseMode:', courseData.courseMode);
          console.log('🎨 [Form] Setting background color to:', bgColor);
          this.setState((prevState) => ({
            formData: { ...prevState.formData, ...courseData },
            loading: true,
            bgColor: bgColor,
            formContainerBg: formContainerBg,
            currentSection: shouldStartAtSection1 ? 1 : prevState.currentSection
          }), () => {
            console.log('✨ [Form] State updated');
            console.log('Current formData after update:', this.state.formData);
          });
        } else {
          this.state = {
            ...this.state,
            formData: { ...this.state.formData, ...courseData },
            loading: true,
            bgColor: bgColor,
            formContainerBg: formContainerBg,
            currentSection: shouldStartAtSection1 ? 1 : this.state.currentSection
          };
        }

        if (shouldStartAtSection1) {
          console.log('Marriage Preparation Programme detected, starting from section 1');
        }
      } else {
        console.log("❌ No matching course found for link:", decodedLink);
        console.log("📌 Attempted link:", decodedLink);
        console.log("🔄 Fallback: Using course type from category:", courseTypeFromCategory);
        
        // Fallback: Use course type from category if available
        if (courseTypeFromCategory) {
          // Determine background color based on category
          let bgColor = '';
          if (courseTypeFromCategory === 'ILP') {
            bgColor = '#006400'; // Dark Green
          } else if (courseTypeFromCategory === 'NSA') {
            bgColor = '#003366'; // Dark Blue
          } else if (courseTypeFromCategory === 'Talks And Seminar') {
            bgColor = '#DAA520'; // Gold
          } else if (courseTypeFromCategory === 'Marriage Preparation Programme') {
            bgColor = '#800000'; // Maroon
          } else {
            bgColor = '#F5F5F5'; // Default gray
          }
          
          let formContainerBg = '';
          if (courseTypeFromCategory === 'Marriage Preparation Programme') {
            formContainerBg = '#40E0D0';
          }
          
          const shouldStartAtSection1 = courseTypeFromCategory === 'Marriage Preparation Programme' && !hasSectionParam;
          
          if (this._isMounted) {
            this.setState((prevState) => ({
              formData: { ...prevState.formData, type: courseTypeFromCategory },
              loading: true,
              bgColor: bgColor,
              formContainerBg: formContainerBg,
              currentSection: shouldStartAtSection1 ? 1 : prevState.currentSection
            }), () => console.log('✨ [Form] State updated with category fallback'));
          } else {
            this.state = {
              ...this.state,
              formData: { ...this.state.formData, type: courseTypeFromCategory },
              loading: true,
              bgColor: bgColor,
              formContainerBg: formContainerBg,
              currentSection: shouldStartAtSection1 ? 1 : this.state.currentSection
            };
          }
        } else {
          this.setState({ loading: true });
        }
      }
    } else {
      console.log("No course link provided, loading form without course data");
      
      // Fallback: Use course type from category if available and no link
      if (courseTypeFromCategory) {
        console.log('📦 Using course type from category (no link provided):', courseTypeFromCategory);
        
        let bgColor = '';
        if (courseTypeFromCategory === 'ILP') {
          bgColor = '#006400';
        } else if (courseTypeFromCategory === 'NSA') {
          bgColor = '#003366';
        } else if (courseTypeFromCategory === 'Talks And Seminar') {
          bgColor = '#DAA520';
        } else if (courseTypeFromCategory === 'Marriage Preparation Programme') {
          bgColor = '#800000';
        } else {
          bgColor = '#F5F5F5';
        }
        
        let formContainerBg = '';
        if (courseTypeFromCategory === 'Marriage Preparation Programme') {
          formContainerBg = '#40E0D0';
        }
        
        const shouldStartAtSection1 = courseTypeFromCategory === 'Marriage Preparation Programme' && !hasSectionParam;
        
        if (this._isMounted) {
          this.setState((prevState) => ({
            formData: { ...prevState.formData, type: courseTypeFromCategory },
            loading: true,
            bgColor: bgColor,
            formContainerBg: formContainerBg,
            currentSection: shouldStartAtSection1 ? 1 : prevState.currentSection
          }), () => console.log('✨ [Form] State updated with category fallback (no link)'));
        } else {
          this.state = {
            ...this.state,
            formData: { ...this.state.formData, type: courseTypeFromCategory },
            loading: true,
            bgColor: bgColor,
            formContainerBg: formContainerBg,
            currentSection: shouldStartAtSection1 ? 1 : this.state.currentSection
          };
        }
      } else {
        this.setState({ loading: true });
      }
      console.log('✅ [Form] No course data needed - form displays with defaults');
    }
  };

  /* ===================== OLD loadCourseData (commented out) =====================
   * This version fetched ALL courses then searched for the matching one by permalink.
   * Replaced with the optimised version above that fetches a single course by slug.
   *
  loadCourseData_old = async (link, hasSectionParam = false) => {
      console.log("Matched Course:", matchedCourse);

      if (matchedCourse) {
        // Robust extraction of course type - search ALL categories for known type patterns
        let type = '';
        if (
          matchedCourse.categories &&
          Array.isArray(matchedCourse.categories) &&
          matchedCourse.categories.length > 0
        ) {
          // Search through all categories for a known course type
          for (const cat of matchedCourse.categories) {
            if (cat && typeof cat.name === 'string') {
              const catName = cat.name.trim();
              // Check for "Talks And Seminar"
              if (catName === 'Talks And Seminar') {
                type = 'Talks And Seminar';
                break;
              }
              // Check for "Marriage Preparation Programme"
              if (catName === 'Marriage Preparation Programme') {
                type = 'Marriage Preparation Programme';
                break;
              }
              // Check for "Tri-Love Elderly: NSA" or "Tri-Love Elderly: ILP"
              if (catName.includes(':')) {
                const nameParts = catName.split(':');
                if (nameParts.length > 1) {
                  const extracted = nameParts[1].trim();
                  if (extracted === 'NSA' || extracted === 'ILP') {
                    type = extracted;
                    break;
                  }
                }
              }
            }
          }
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
            if (cleanLine.match(/(?:地点\s*)?(?:Lokasi\s*)?Location:\s*(.+)|(?:地点|Lokasi):\s*(.+)/i)) {
              const locationMatch = cleanLine.match(/(?:地点\s*)?(?:Lokasi\s*)?Location:\s*(.+)|(?:地点|Lokasi):\s*(.+)/i);
              if (locationMatch && locationMatch[1]) {
                courseLocation = locationMatch[1].trim();
                console.log("Successfully extracted location from Lokasi/Location pattern:", courseLocation);
                break;
              } else if (locationMatch && locationMatch[2]) {
                courseLocation = locationMatch[2].trim();
                console.log("Successfully extracted location from 地点/Lokasi pattern:", courseLocation);
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
  ===================== END OLD loadCourseData ===================== */

  // Add helper method to get SingPass user data safely
  getSingPassUserData = () => {
    try {
      const userDataJson = sessionStorage.getItem('singpass_user_data_json');
      console.log('Retrieved SingPass user data JSON:', userDataJson);
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
      return [];
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
          
          // Auto-extract postal codes from any format (e.g., "Singapore 123456" → "123456")
          const postalCodeFields = ['postalCode', 'spousePostalCode'];
          for (const field of postalCodeFields) {
            if (newData[field]) {
              const extracted = this.extractPostalCode(newData[field]);
              if (extracted) {
                updatedFormData[field] = extracted;
                console.log(`✅ Extracted postal code from ${field}: "${newData[field]}" → "${extracted}"`);
              }
            }
          }
          
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
  
      // Build address string - handle both flat string and structured object
      let address = '';
      let postalCode = '';
      if (userData.regadd) {
        if (typeof userData.regadd === 'string') {
          // Backend already formatted it as a flat string
          address = userData.regadd;
          // Try to extract postal from the string (e.g. "SINGAPORE 429974")
          const postalMatch = userData.regadd.match(/SINGAPORE\s+(\d{6})/);
          if (postalMatch) postalCode = postalMatch[1];
        } else if (typeof userData.regadd === 'object') {
          // Raw structured object from SingPass
          const getVal = (field) => {
            if (!field) return '';
            if (typeof field === 'string') return field;
            return field.value || field.desc || '';
          };
          const block = getVal(userData.regadd.block);
          const street = getVal(userData.regadd.street);
          const floor = getVal(userData.regadd.floor);
          const unit = getVal(userData.regadd.unit);
          const building = getVal(userData.regadd.building);
          const country = userData.regadd.country ? (userData.regadd.country.desc || userData.regadd.country.value || '') : '';
          postalCode = getVal(userData.regadd.postal);
          address = `${block} ${street} #${floor}-${unit}, ${building}, ${country} ${postalCode}`;
          address = address.replace(/, ,/g, ',').replace(/ ,/g, ',').replace(/,,/g, ',');
          address = address.replace(/(,\s*)+/g, ', ').replace(/,\s*$/, '');
        }
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
        postalCode: postalCode,
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
        postalCode: !!postalCode,
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
    
    // Debug: Show which fields are missing/invalid
    if (Object.keys(errors).length > 0) {
      console.warn('❌ Validation failed for fields:', Object.keys(errors));
      Object.entries(errors).forEach(([key, value]) => {
        console.warn(`   - ${key}: ${value}`);
      });
    }

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
        this.setState({ validationErrors: errors }, () => {
          // Scroll to first error field
          const firstErrorField = Object.keys(errors)[0];
          console.log('🔴 First validation error field:', firstErrorField);
          
          // Try multiple ways to find the error element
          let errorElement = document.getElementById(`validation-error-${firstErrorField}`);
          if (!errorElement) {
            errorElement = document.getElementById(firstErrorField);
          }
          if (!errorElement) {
            // Try to find the input field and scroll to it
            errorElement = document.querySelector(`input[name="${firstErrorField}"], select[name="${firstErrorField}"], textarea[name="${firstErrorField}"]`);
          }
          
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorElement.focus && errorElement.focus();
            console.log('📍 Scrolled to error field:', firstErrorField);
          } else {
            console.warn('⚠️  Could not find error element for field:', firstErrorField);
            // Fallback: scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
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

  isCurrentSectionValid = () => {
    const { currentSection, formData } = this.state;

    const isPaidTalks =
      formData.type === 'Talks And Seminar' &&
      parseFloat((formData.price || '0').replace('$', '')) > 0;

    // NSA payment step
    if (formData.type === 'NSA' && currentSection === 2) {
      return !!formData.payment;
    }

    // Paid Talks payment step (button is Submit on section 2)
    if (isPaidTalks && currentSection === 2) {
      return !!formData.payment;
    }

    if (formData.type !== 'Marriage Preparation Programme') {
      // Talks And Seminar section 1 — Personal Info required fields
      if (formData.type === 'Talks And Seminar' && currentSection === 1) {
        const required = ['pName', 'cNO', 'dOB', 'rESIDENTIALSTATUS', 'postalCode'];
        return required.every(f => formData[f] !== '' && formData[f] !== null && formData[f] !== undefined);
      }
      // ILP / NSA section 1 — Personal Info required fields
      if ((formData.type === 'ILP' || formData.type === 'NSA') && currentSection === 1) {
        const required = ['pName', 'nRIC', 'rESIDENTIALSTATUS', 'rACE', 'gENDER', 'dOB', 'cNO', 'eMAIL', 'address', 'eDUCATION', 'wORKING'];
        return required.every(f => formData[f] !== '' && formData[f] !== null && formData[f] !== undefined);
      }
      // ILP / NSA section 3 — Agreement required
      if ((formData.type === 'ILP' || formData.type === 'NSA') && currentSection === 3) {
        return !!(formData.agreement);
      }
      // Non-marriage-prep flows validate on click.
      return true;
    }

    const effectiveSection = currentSection === 0 ? 1 : currentSection;

    if (effectiveSection === 1) {
      const requiredFields = [
        'pName', 'nRIC', 'dOB', 'cNO', 'rESIDENTIALSTATUS', 'gENDER', 'rACE',
        'mARITALSTATUS', 'postalCode', 'hOUSINGTYPE', 'gROSSMONTHLYINCOME',
        'mARRIAGEDURATION', 'tYPEOFMARRIAGE', 'hASCHILDREN'
      ];

      return requiredFields.every((field) => {
        const value = formData[field];
        return value !== '' && value !== null && value !== undefined;
      });
    }

    if (effectiveSection === 2) {
      const requiredFields = [
        'spouseName', 'spouseNRIC', 'spouseDOB', 'spouseResidentialStatus',
        'spouseSex', 'spouseEthnicity', 'spouseMaritalStatus', 'spousePostalCode',
        'spouseMobile', 'spouseEmail', 'spouseEducation', 'spouseHousingType'
      ];

      return requiredFields.every((field) => {
        const value = formData[field];
        return value !== '' && value !== null && value !== undefined;
      });
    }

    if (effectiveSection === 3) {
      return !!formData.payment;
    }

    if (effectiveSection === 4) {
      return !!formData.marriagePrepConsent1 && !!formData.marriagePrepConsent2;
    }

    return true;
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
      'Tampines North Community Centre': '529204',
      'Tampines 253 Centre': '520253',
      '恩 Project@253': '520253',
      'Pasir Ris West Wellness Centre': '519639',
      'Pasir Ris West': '519639'
    };
    
    // If we have a clean location string that already looks like a proper address, use it
    if (location) {
      const cleanLocation = location
        .replace(/^(?:地点\s*)?(?:Lokasi\s*)?Location:\s*/i, '')
        .replace(/^(?:地点|Lokasi):\s*/i, '')
        .trim();
      
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

  // Process course name parts to extract English and Chinese/Malay names
  processCourseName = (courseParts) => {
    console.log("Processing course name parts:", courseParts);
    // Default behavior - attempt to detect language in content
    let englishName = '';
    let chineseName = '';
    
    if (courseParts.length == 3) {
      // Assume first part is one language, second is another
      englishName = courseParts[2] || '';
      chineseName = courseParts[1] || '';
    } 
    else if (courseParts.length == 2) {
      // Assume first part is one language, second is another
      englishName = courseParts[0] || '';
      chineseName = '';
    }
    
    return {
      englishName: englishName.trim(),
      chineseName: chineseName.trim()
    };
  };

  handleSubmit = () => {
    const { formData } = this.state;

    // Comprehensive validation - check all required fields before submission
    const requiredFieldErrors = {};
    
    // Check personal information fields based on course type
    if (formData.type === 'Marriage Preparation Programme') {
      // Marriage Prep: Check sections 0/1 and 2 personal info
      const section0_1Fields = [
        'pName', 'nRIC', 'dOB', 'cNO', 'rESIDENTIALSTATUS', 'gENDER', 'rACE', 
        'mARITALSTATUS', 'postalCode', 'hOUSINGTYPE', 'gROSSMONTHLYINCOME', 
        'mARRIAGEDURATION', 'tYPEOFMARRIAGE', 'hASCHILDREN'
      ];
      const section2Fields = [
        'spouseName', 'spouseNRIC', 'spouseDOB', 'spouseResidentialStatus', 
        'spouseSex', 'spouseEthnicity', 'spouseMaritalStatus', 'spousePostalCode', 
        'spouseMobile', 'spouseEmail', 'spouseEducation', 'spouseHousingType'
      ];
      
      section0_1Fields.forEach(field => {
        if (!formData[field] || formData[field] === '') {
          requiredFieldErrors[field] = `${field} is required`;
        }
      });
      
      section2Fields.forEach(field => {
        if (!formData[field] || formData[field] === '') {
          requiredFieldErrors[field] = `${field} is required`;
        }
      });
      
      // Check payment
      if (!formData.payment || formData.payment === '') {
        requiredFieldErrors.payment = 'Payment method is required';
      }
    } else if (formData.type === 'Talks And Seminar') {
      // Talks And Seminar: Check sections 0/1
      const requiredFields = ['pName', 'cNO', 'dOB', 'rESIDENTIALSTATUS', 'postalCode'];
      requiredFields.forEach(field => {
        if (!formData[field] || formData[field] === '') {
          requiredFieldErrors[field] = `${field} is required`;
        }
      });
    } else if (formData.type === 'NSA' || formData.type === 'ILP') {
      // NSA/ILP: Check section 1 personal info
      const requiredFields = [
        'pName', 'nRIC', 'rESIDENTIALSTATUS', 'rACE', 'gENDER', 'dOB', 
        'cNO', 'eMAIL', 'address', 'eDUCATION', 'wORKING'
      ];
      requiredFields.forEach(field => {
        if (!formData[field] || formData[field] === '') {
          requiredFieldErrors[field] = `${field} is required`;
        }
      });
      
      // Check payment for NSA only (ILP doesn't show payment section)
      if (formData.type === 'NSA' && (!formData.payment || formData.payment === '')) {
        requiredFieldErrors.payment = 'Payment method is required';
      }
    }
    
    // Check agreement/consent based on course type
    if (formData.type === 'Marriage Preparation Programme') {
      if (!formData.marriagePrepConsent1 || !formData.marriagePrepConsent2) {
        requiredFieldErrors.agreement = 'Both consent options must be selected to proceed.';
      }
    } else if (formData.type !== 'Talks And Seminar' && (!formData.agreement || formData.agreement === '')) {
      requiredFieldErrors.agreement = 'You must agree to proceed';
    }
    
    // If there are missing required fields, show error and don't submit
    if (Object.keys(requiredFieldErrors).length > 0) {
      console.error('❌ Form submission blocked - missing required fields:', requiredFieldErrors);
      this.setState({ 
        validationErrors: requiredFieldErrors,
        showSubmissionInProgress: false 
      });
      alert('Please fill in all required fields before submitting.');
      this.isSubmitting = false;
      return;
    }

    // Prevent double submission
    if (this.isSubmitting) {
      console.warn('⚠️ Form submission already in progress. Ignoring duplicate submission.');
      return;
    }

    // Set submitting flag
    this.isSubmitting = true;
    
    // Show submission in progress popup
    this.setState({ showSubmissionInProgress: true });

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
        // Hide submission popup on success
        this.setState({ showSubmissionInProgress: false });
        
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
        // Hide submission popup on error
        this.setState({ showSubmissionInProgress: false });
        alert("Error during submission");
        // Reset submitting flag on error
        this.isSubmitting = false;
      })
      .finally(() => {
        // Reset submitting flag after request completes
        if (this.isSubmitting) {
          this.isSubmitting = false;
        }
      });
    
  };

  isValidNRIC(nric) {
    // Check if NRIC is empty
    if (!nric) {
        return { isValid: false, error: 'NRIC/FIN is required (9 characters, e.g., S1234567D). NRIC/FIN 是必填项（9 个字符，例如 S1234567D）。' };
    }
    // Check if NRIC is exactly 9 characters long
    if (nric.length !== 9) {
        return { isValid: false, error: 'NRIC/FIN must be exactly 9 characters (e.g., S1234567D). NRIC/FIN 必须恰好是 9 个字符（例如 S1234567D）。' };
    }
    // Check if NRIC follows the correct format (first letter + 7 digits + last letter)
    if (!/^[STFG]\d{7}[A-Z]$/.test(nric)) {
        return { isValid: false, error: 'Invalid NRIC format. Must start with S, T, F or G, followed by 7 digits, and end with a letter (e.g., S1234567D). NRIC 格式无效。必须以 S、T、F 或 G 开头，后跟 7 位数字，以字母结尾（例如 S1234567D）。' };
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
    
    // For Marriage Preparation Programme and NSA/ILP - just check basic format, no component validation yet
    if (!dob) {
      return { isValid: false, error: 'Date of Birth is required (dd/mm/yyyy format). 出生日期是必填项（dd/mm/yyyy 格式）。' };
    }
    
    // Check basic format only (no component validation here - that's in validateForm)
    if (!dob.match(/^\d{2}\/\d{2}\/\d{4}$/) && !dob.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      return { isValid: false, error: 'Date of Birth must be in dd/mm/yyyy or yyyy/mm/dd format. 出生日期必须采用 dd/mm/yyyy 或 yyyy/mm/dd 格式。' };
    }
    
    // Basic date validity check
    const dateParts = dob.split('/');
    let dobDate;
    if (dob.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      dobDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
    } else {
      dobDate = new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
    }
    
    if (isNaN(dobDate.getTime())) {
      return { isValid: false, error: 'Invalid Date of Birth. 出生日期无效。' };
    }
    
    const currentYear = new Date().getFullYear();
    const birthYear = dobDate.getFullYear();
    const age = currentYear - birthYear;
    if (this._isMounted) {
      this.setState({ age });
    } else {
      this.state.age = age;
    }
    return { isValid: true, error: null };
  }
  
  // Validate DOB date components (day 01-31, month 01-12) - only for form validation
  isValidDOBComponents(dob) {
    if (!dob) return { isValid: true, error: null };
    
    const dateParts = dob.split('/');
    
    if (dob.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      // dd/mm/yyyy format
      const dd = parseInt(dateParts[0], 10);
      const mm = parseInt(dateParts[1], 10);
      
      if (dd < 1 || dd > 31) {
        return { isValid: false, error: 'Date of Birth day must be between 01 and 31 (e.g., 15/01/1990). 出生日期的日期必须在 01 到 31 之间（例如 15/01/1990）。' };
      }
      if (mm < 1 || mm > 12) {
        return { isValid: false, error: 'Date of Birth month must be between 01 and 12 (e.g., 15/01/1990). 出生日期的月份必须在 01 到 12 之间（例如 15/01/1990）。' };
      }
    } else if (dob.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      // yyyy/mm/dd format
      const mm = parseInt(dateParts[1], 10);
      const dd = parseInt(dateParts[2], 10);
      
      if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
        return { isValid: false, error: 'Date of Birth is invalid. 出生日期的月份必须在 01 到 12 之间。' };
      }
      if (dd < 1 || dd > 31) {
        return { isValid: false, error: 'Date of Birth day must be between 01 and 31. 出生日期的日期必须在 01 到 31 之间。' };
      }
    }
    
    return { isValid: true, error: null };
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

  // Helper function to extract postal code (6 digits) from any format
  // Accepts: "123456", "Singapore 123456", "Blk 123 Clementi Ave Singapore 123456", etc.
  // Returns: "123456" or null if not found
  extractPostalCode = (postalCodeInput) => {
    if (!postalCodeInput) return null;
    const match = postalCodeInput.toString().match(/\b(\d{6})\b/);
    console.log("Postal Code:", match ? match[1] : null)
    return match ? match[1] : null;
  };

  validateForm = () => {
    const { currentSection, formData } = this.state;
    const errors = {};
    
    // For Talks And Seminar section 0, skip validation (it's just intro/FormDetails with no form fields)
    if (formData.type === 'Talks And Seminar' && currentSection === 0) {
      return errors; // No validation needed for FormDetails section
    }
    
    // For Marriage Preparation Programme, treat section 0 as section 1 for validation
    const effectiveSection = (formData.type === 'Marriage Preparation Programme' && currentSection === 0) ? 1 : currentSection;
    
    if (effectiveSection === 0) {
      return errors;
    }
    if (effectiveSection === 1) {
      // Validation for Marriage Preparation Programme - Sections 0 & 1 (Personal Info)
      if (formData.type === 'Marriage Preparation Programme') {
        // Only validate format for non-empty fields (empty fields are already blocked by disabled Next button)
        if (formData.nRIC) {
          const { isValid, error } = this.isValidNRIC(formData.nRIC);
          if (!isValid) {
            errors.nRIC = error;
          }
        }
        if (formData.dOB) {
          const { isValid, error } = this.isValidDOB(formData.dOB, formData.type);
          if (!isValid) {
            errors.dOB = error;
          } else {
            // Check date components (day 01-31, month 01-12)
            const { isValid: isComponentValid, error: componentError } = this.isValidDOBComponents(formData.dOB);
            if (!isComponentValid) {
              errors.dOB = componentError;
            }
          }
        }
        if (formData.postalCode) {
          const extractedPostalCode = this.extractPostalCode(formData.postalCode);
          if (!extractedPostalCode) {
            errors.postalCode = 'Postal Code must contain 6 digits. 邮编必须包含6位数字。';
          }
        }
        if (formData.cNO && !/^\d+$/.test(formData.cNO)) {
          errors.cNO = 'Mobile Number must contain only numbers. 手机号码只能包含数字。';
        }
        if (formData.cNO && formData.cNO.length !== 8) {
          errors.cNO = 'Mobile Number must be exactly 8 digits (e.g., 81234567). 手机号码必须恰好是 8 位数字（例如 81234567）。';
        }
        if (formData.cNO && !/^[89]/.test(formData.cNO)) {
          errors.cNO = 'Mobile Number must start with 8 or 9. 手机号码必须以 8 或 9 开头。';
        }
        return errors;
      }
      
      // Validation for Talks And Seminar courses
      if (formData.type === 'Talks And Seminar') {
        // Only validate format for non-empty fields (empty fields are already blocked by disabled Next button)
        if (formData.cNO && !/^\d+$/.test(formData.cNO)) {
          errors.cNO = this.getErrorMessage('Contact No. must contain only numbers.', '联系号码只能包含数字。', 'No. Telefon hanya boleh mengandungi nombor.');
        }
        if (formData.cNO && formData.cNO.length !== 8) {
          errors.cNO = this.getErrorMessage('Contact No. must be exactly 8 digits.', '联系号码必须是8位数字。', 'No. Telefon mesti tepat 8 digit.');
        }
        if (formData.cNO && !/^[089]/.test(formData.cNO)) {
          errors.cNO = this.getErrorMessage('Contact No. must start with 8 or 9.', '联系号码必须8或9开头。', 'No. Telefon mesti bermula dengan 8 atau 9.');
        }
        if (formData.dOB) {
          const { isValid, error } = this.isValidDOB(formData.dOB, formData.type);
          if (!isValid) {
            errors.dOB = error;
          } else {
            // Check date components (day 01-31, month 01-12)
            const { isValid: isComponentValid, error: componentError } = this.isValidDOBComponents(formData.dOB);
            if (!isComponentValid) {
              errors.dOB = componentError;
            }
          }
        }
        if (formData.postalCode) {
          const extractedPostalCode = this.extractPostalCode(formData.postalCode);
          if (!extractedPostalCode) {
            errors.postalCode = this.getErrorMessage('Postal Code must contain 6 digits (e.g., "Singapore 123456" or "123456").', '邮编必须包含6位数字。', 'Poskod mesti mengandungi 6 digit.');
          }
        }
        return errors;
      }
      
      // NSA/ILP validation only - format validation for non-empty fields
      if (!formData.pName || formData.pName === '') {
        errors.pName = 'Name is required. 名字是必填项。';
      }
      if (!formData.nRIC || formData.nRIC === '') {
        errors.nRIC = 'NRIC is required. NRIC 是必填项。';
      }
      if (!formData.rESIDENTIALSTATUS || formData.rESIDENTIALSTATUS === '') {
        errors.rESIDENTIALSTATUS = 'Residential Status is required. 居住状态是必填项。';
      }
      if (!formData.rACE || formData.rACE === '') {
        errors.rACE = 'Race is required. 种族是必填项。';
      }
      if (!formData.gENDER || formData.gENDER === '') {
        errors.gENDER = 'Gender is required. 性别是必填项。';
      }
      if (!formData.dOB || formData.dOB === '') {
        errors.dOB = 'Date of Birth is required. 出生日期是必填项。';
      }
      if (!formData.cNO || formData.cNO === '') {
        errors.cNO = 'Contact Number is required. 联系号码是必填项。';
      }
      if (!formData.eMAIL || formData.eMAIL === '') {
        errors.eMAIL = 'Email is required. 电子邮件是必填项。';
      }
      if (!formData.address || formData.address === '') {
        errors.address = 'Address is required. 地址是必填项。';
      }
      if (!formData.eDUCATION || formData.eDUCATION === '') {
        errors.eDUCATION = 'Education Level is required. 教育水平是必填项。';
      }
      if (!formData.wORKING || formData.wORKING === '') {
        errors.wORKING = 'Work Status is required. 工作状态是必填项。';
      }

      // Format validation only if field is filled
      if (formData.nRIC) {
        const { isValid, error } = this.isValidNRIC(formData.nRIC);
        if (!isValid) {
          errors.nRIC = error;
        }
      }
      if (formData.dOB && !/^\d{2}\/\d{2}\/\d{4}$/.test(formData.dOB)) {
        errors.dOB = 'Date of Birth must be in dd/mm/yyyy format (e.g., 15/01/1990). 出生日期必须采用 dd/mm/yyyy 格式（例如 15/01/1990）。';
      }
      if (formData.dOB && !errors.dOB) {
        const { isValid, error } = this.isValidDOB(formData.dOB, formData.type);
        if (!isValid) {
          errors.dOB = error;
        } else {
          // Check date components (day 01-31, month 01-12)
          const { isValid: isComponentValid, error: componentError } = this.isValidDOBComponents(formData.dOB);
          if (!isComponentValid) {
            errors.dOB = componentError;
          }
        }
      }
      if (formData.cNO && !/^\d+$/.test(formData.cNO)) {
        errors.cNO = 'Contact Number must contain only numbers. 联系号码只能包含数字。';
      }
      if (formData.cNO && formData.cNO.length !== 8) {
        errors.cNO = 'Contact Number must be exactly 8 digits (e.g., 81234567). 联系号码必须恰好是 8 位数字（例如 81234567）。';
      }
      if (formData.cNO && !/^[89]/.test(formData.cNO)) {
        errors.cNO = 'Contact Number must start with 8 or 9. 联系号码必须以 8 或 9 开头。';
      }
    }
    
    // Section 2 validation for Marriage Preparation Programme (Spouse Info)
    if (effectiveSection === 2 && formData.type === 'Marriage Preparation Programme') {
      // Only validate format for non-empty fields (empty fields are already blocked by disabled Next button)
      if (formData.spouseNRIC) {
        const { isValid, error } = this.isValidNRIC(formData.spouseNRIC);
        if (!isValid) {
          errors.spouseNRIC = error;
        }
      }
      if (formData.spouseDOB) {
        const { isValid, error } = this.isValidDOB(formData.spouseDOB, formData.type);
        if (!isValid) {
          errors.spouseDOB = error;
        } else {
          // Check date components (day 01-31, month 01-12)
          const { isValid: isComponentValid, error: componentError } = this.isValidDOBComponents(formData.spouseDOB);
          if (!isComponentValid) {
            errors.spouseDOB = componentError;
          }
        }
      }
      if (formData.spousePostalCode) {
        const extractedPostalCode = this.extractPostalCode(formData.spousePostalCode);
        if (!extractedPostalCode) {
          errors.spousePostalCode = 'Spouse Postal Code must contain 6 digits (e.g., 123456 or Singapore 123456). 配偶邮编必须包含6位数字（例如123456或Singapore123456）。';
        }
      }
      if (formData.spouseMobile && !/^\d+$/.test(formData.spouseMobile)) {
        errors.spouseMobile = 'Spouse Mobile Number must contain only numbers. 配偶手机号码只能包含数字。';
      }
      if (formData.spouseMobile && formData.spouseMobile.length !== 8) {
        errors.spouseMobile = 'Spouse Mobile Number must be exactly 8 digits (e.g., 81234567). 配偶手机号码必须恰好是 8 位数字（例如 81234567）。';
      }
      if (formData.spouseMobile && !/^[89]/.test(formData.spouseMobile)) {
        errors.spouseMobile = 'Spouse Mobile Number must start with 8 or 9. 配偶手机号码必须以 8 或 9 开头。';
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
    const { currentSection, formData, validationErrors, bgColor, loading, isAuthenticated, age, loadingPhase } = this.state;
    console.log('Current Age:', age);
    console.log('🎨 [Render] Current bgColor:', bgColor);
    console.log('📋 [Render] Loading:', loading);

    // Show form immediately - course data loads in background (no loading spinner)
    // This ensures the form appears instantly for better UX
    
    // Render loading indicator with phases
    // const renderLoadingIndicator = () => {
    //   if (loadingPhase === 'complete' || (loading && loadingPhase === 'form')) {
    //     return null; // Hide when loading is done
    //   }

    //   const phaseMessages = {
    //     'initial': 'Loading...',
    //     'background': '🎨 Loading background...',
    //     'form': '📝 Loading form...'
    //   };

    //   return (
    //     <div className="loading-overlay">
    //       <div className="loading-content">
    //         <div className="loading-spinner"></div>
    //         <p className="loading-text">{phaseMessages[loadingPhase] || 'Loading...'}</p>
    //       </div>
    //     </div>
    //   );
    // };

    // Helper function to get language-appropriate button labels for Talks And Seminar
    const getButtonLabel = (english, chinese, malay) => {
      // For Talks And Seminar courses with Malay language option, show English and Malay
      if (formData.type === 'Talks And Seminar' && formData.isMalayLanguage && malay) {
        return `${english} ${malay}`;
      }
      return `${english} ${chinese}`;
    };
  
    return (
      <>
        {formData.type && (
          <div className="formwholepage" style={{ backgroundColor: bgColor }}>
            {/* {renderLoadingIndicator()} */}
            <div className="form-page">
              {/* Section stepper — shown after section 0 for ILP, NSA, and Talks And Seminar, outside form-container */}
              {currentSection > 0 && (formData.type === 'ILP' || formData.type === 'NSA' || formData.type === 'Talks And Seminar') && (() => {
                const steps = formData.type === 'Talks And Seminar'
                  ? [
                      { num: 1, label: 'Personal Info', chinese: '个人资料' },
                      { num: 2, label: 'Course Details', chinese: '课程详情' },
                      { num: 3, label: 'Submit', chinese: '提交' },
                    ]
                  : [
                      { num: 1, label: 'Personal Info', chinese: '个人资料' },
                      { num: 2, label: 'Course Details', chinese: '课程详情' },
                      { num: 3, label: 'Agreement', chinese: '协议' },
                      { num: 4, label: 'Submit', chinese: '提交' },
                    ];
                return (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 0, marginBottom: 24, marginTop: 8, position: 'relative' }}>
                    {steps.map((step, idx) => {
                      const isActive = currentSection === step.num;
                      const isDone = currentSection > step.num;
                      const circleColor = '#000000';
                      const lineColor = currentSection > step.num ? '#000000' : '#e0e0e0';
                      return (
                        <React.Fragment key={step.num}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 96 }}>
                            <span style={{ fontSize: '1.08rem', fontWeight: 800, color: circleColor, marginBottom: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {step.label}
                            </span>
                            <div style={{
                              width: 54, height: 54, borderRadius: '50%',
                              backgroundColor: isActive ? circleColor : isDone ? circleColor : '#e0e0e0',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '1.43rem',
                              boxShadow: isActive ? '0 0 0 3px #888' : 'none',
                              transition: 'background-color 0.2s',
                            }}>
                              {isDone ? '✓' : step.num}
                            </div>
                            <span style={{ fontSize: '1.02rem', fontWeight: 800, color: circleColor, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {step.chinese}
                            </span>
                          </div>
                          {idx < steps.length - 1 && (
                            <div style={{ flex: 1, height: 2, backgroundColor: lineColor, alignSelf: 'center', marginBottom: 24, minWidth: 20 }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()}
              {/* Section stepper — shown from section 0 for Marriage Preparation Programme, outside form-container */}
              {formData.type === 'Marriage Preparation Programme' && (() => {
                const mppSteps = [
                  { num: 0, label: 'Personal Info', chinese: '个人资料' },
                  { num: 2, label: 'Spouse Info', chinese: '配偶资料' },
                  { num: 3, label: 'Course Details', chinese: '课程详情' },
                  { num: 4, label: 'Agreement', chinese: '协议' },
                  { num: 5, label: 'Submit', chinese: '提交' },
                ];
                return (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 0, marginBottom: 24, marginTop: 8, position: 'relative' }}>
                    {mppSteps.map((step, idx) => {
                      const isActive = currentSection === step.num || (step.num === 0 && currentSection === 1);
                      const isDone = currentSection > step.num && !(step.num === 0 && currentSection === 1);
                      const circleColor = '#000000';
                      const lineColor = isDone ? '#000000' : '#e0e0e0';
                      return (
                        <React.Fragment key={step.num}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 96 }}>
                            <span style={{ fontSize: '1.08rem', fontWeight: 800, color: circleColor, marginBottom: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {step.label}
                            </span>
                            <div style={{
                              width: 54, height: 54, borderRadius: '50%',
                              backgroundColor: isActive ? circleColor : isDone ? circleColor : '#e0e0e0',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '1.43rem',
                              boxShadow: isActive ? '0 0 0 3px #888' : 'none',
                              transition: 'background-color 0.2s',
                            }}>
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <span style={{ fontSize: '1.02rem', fontWeight: 800, color: circleColor, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {step.chinese}
                            </span>
                          </div>
                          {idx < mppSteps.length - 1 && (
                            <div style={{ flex: 1, height: 2, backgroundColor: lineColor, alignSelf: 'center', marginBottom: 24, minWidth: 20 }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()}
          <div className={`form-container ${(formData.type === 'NSA' || formData.type === 'ILP') ? 'nsa-ilp-form' : ''}`} style={this.state.formContainerBg ? { backgroundColor: this.state.formContainerBg } : {}}>
            {/* MyInfo Service Status Indicator */}
            <MyInfoStatusIndicator 
              status={this.state.myInfoServiceStatus}
              isOnline={this.state.networkOnline}
              recommendations={this.state.serviceRecommendations}
              compact={true}
            />
            {formData.type && (
              <>
                {currentSection === 0 && formData.type !== 'Marriage Preparation Programme' && (
                  <FormDetails 
                    courseType={formData.type} 
                    courseCategories={this.state.courseCategories}
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
                    extractedLocation={formData.courseLocation}
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
                  />
                }
              </>
            )}
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

            {/**
             * Localize the SingPass button text according to course language selection.
             * `formData.isMalayLanguage` is set when the course is Malay; otherwise we
             * assume Chinese if a Chinese name exists, else English.
             */}
            {(() => {
              return (
                <SingPassButton 
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
              );
            })()}
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
              {getButtonLabel('OK', '可以', 'Baik')}
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

        {/* Submission In Progress Popup */}
        <SubmissionInProgressPopup 
          isOpen={this.state.showSubmissionInProgress}
        />
          </div>
        )}
      </>
    );
  }  
}

export default FormPage;
