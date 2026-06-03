import React, { Component } from 'react';
import '../../../css/sub/search.css'; // Ensure you have this CSS file for styling

const languageTranslations = {
  "English": '英语',
  "Mandarin": '中文',
  "English and Mandarin": '英文和中文',
  "All Languages": '所有语言',
  "All Locations": '所有地点'
}

class SearchSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
    searchQuery: props.selectedSearchQuery || '',
    centreLocation: props.selectedLocation || '',
    language: '',
    status: '',
    courseType: props.selectedCourseType || '',
    course: '',
    registrationStatus: props.selectedRegistrationStatus || '',
    locations: [], // Default to props if available
    languages: [], // Default to props if available
    statuses: [], // Default to props if available
    types: [], // Default to props if available
    roles: [],
    quarters: [],
    coursesName: [],
    filteredLocations: [],
    filteredLanguages: [],
    filteredStatuses: [],
    filteredTypes: [],
    filteredRoles: [],
    filteredCoursesName: [],
    filteredQuarters: [],
    filteredCoursesQuarters: [],
    filteredRegistrationStatuses: [],
    showLocationDropdown: false,
    showLanguageDropdown: false,
    showTypeDropdown: false,
    showCourseDropdown: false,
    showAccountTypeDropdown: false,
    showQuarterDropdown: false,
    showRegistrationStatusDropdown: false,
    role: '',
    staffName: '',
    courseName: props.selectedCourseName || '',
    quarter: props.selectedQuarter || '',
    attendanceType: '',
    activityCode: '',
    attendanceLocation: '',
    attendanceTypes: [],  // Initialize with just the default option
    filteredAttendanceTypes: [],  // Initialize with just the default option
    attendanceLocations: [],  // Initialize attendance locations
    filteredAttendanceLocations: [],  // Initialize filtered attendance locations
    showAttendanceTypeDropdown: false,
    showAttendanceLocationDropdown: false,
    showActivityCodeDropdown: false,
    filteredActivityCodes: [],  // Add this for filtered activity codes
    membershipType: '', // Add for membership type
    membershipTypes: [], // Default membership types
    filteredMembershipTypes: [], // Default filtered membership types
    showMembershipTypeDropdown: false, // Add for membership type dropdown
    // Registration Status filter states
    registrationStatus: props.selectedRegistrationStatus || '',
    registrationStatuses: [],
    filteredRegistrationStatuses: [],
    showRegistrationStatusDropdown: false,
    // Fundraising filter states
    paymentMethod: '',
    // collectionMode: '',
    collectionLocation: '',
    fundraisingStatus: '',
    fundraisingPaymentMethods: ['All Payment Methods'],
    // fundraisingCollectionModes: ['All Collection Modes'],
    fundraisingCollectionLocations: ['All Collection Locations'],
    fundraisingStatuses: ['All Statuses'],
    filteredPaymentMethods: ['All Payment Methods'],
    // filteredCollectionModes: ['All Collection Modes'],
    filteredCollectionLocations: ['All Collection Locations'],
    filteredFundraisingStatuses: ['All Statuses'],
    showPaymentMethodDropdown: false,
    // showCollectionModeDropdown: false,
    showCollectionLocationDropdown: false,
    showStatusDropdown: false,
    // CourseLinks category filter states
    category: '',
    categories: ['All Categories'],
    filteredCategories: ['All Categories'],
    showCategoryDropdown: false,
  };
  this.locationDropdownRef = React.createRef();
  this.languageDropdownRef = React.createRef();
  this.accountTypeDropdownRef = React.createRef();
  this.categoryDropdownRef = React.createRef();
  this.typeDropdownRef = React.createRef();
  this.courseDropdownRef = React.createRef();
  this.quarterDropdownRef = React.createRef();
  this.registrationStatusDropdownRef = React.createRef(); // Add this ref for the registration status dropdown
  this.attendanceTypeDropdownRef = React.createRef(); // Add this ref for the attendance type dropdown
  this.attendanceLocationDropdownRef = React.createRef(); // Add this ref for the attendance location dropdown
  this.activityCodeDropdownRef = React.createRef(); // Add this ref for the activity code dropdown
  this.membershipTypeDropdownRef = React.createRef(); // Add this ref for the membership type dropdown
  this.paymentMethodDropdownRef = React.createRef(); // Add this ref for the payment method dropdown
  // this.collectionModeDropdownRef = React.createRef(); // Add this ref for the collection mode dropdown
  this.collectionLocationDropdownRef = React.createRef(); // Add this ref for the collection location dropdown
  this.statusDropdownRef = React.createRef(); // Add this ref for the status dropdown
  this.searchInputRef = React.createRef(); // Make sure the search field has a ref
}

hasSpecificSelection = (value) => {
  const text = String(value || '').trim();
  return !!text && !/^all\b/i.test(text);
};

shouldHideOthersInRegistration = () => {
  if (this.props.section !== 'registration') return false;

  const role = String(this.props.role || '').trim().toLowerCase();
  return role.includes('nsa');
};

getRegistrationTypes = (inputTypes) => {
  const source = Array.isArray(inputTypes) ? inputTypes : [];
  const withoutOthers = this.shouldHideOthersInRegistration()
    ? source.filter((type) => String(type || '').trim().toLowerCase() !== 'others')
    : source;

  const unique = [...new Set(withoutOthers)];
  return ['All Courses Types', ...unique];
};

isTestingAAccount = () => {
  const email = String(this.props.userEmail || '').trim().toLowerCase();
  const userName = String(this.props.userName || '').trim().toLowerCase();
  return (
    email === 'testinga@ecss.org.sg' ||
    email === 'testingb@ecss.org.sg' ||
    userName === 'testing a' ||
    userName === 'testinga' ||
    userName === 'testing b' ||
    userName === 'testingb'
  );
};

shouldAutoFillSingleRegistrationFilters = () => {
  return this.props.section === 'registration' && this.isTestingAAccount();
};

getSpecificOptions = (options) => {
  const list = Array.isArray(options) ? options : [];
  return list.filter((item) => !/^all\b/i.test(String(item || '').trim()));
};


// Translate languages to Chinese if the selected language is 'zh'
translateLanguages = (languages) => {
  if (this.props.language === 'zh') {
    return languages.map(lang => languageTranslations[lang] || lang);
  }
  return languages;
};

handleChange = (event) => {
  const { name, value } = event.target;
  console.log("handleChange", name,event)
  this.setState({ [name]: value }, () => {
    if (name === 'centreLocation') {
      this.setState({
        filteredLocations: this.state.locations.filter(location =>
          location.toLowerCase().includes(value.toLowerCase())
        ),
        centrelocation: value
      });
      // Notify parent handler if it exists
      if (this.props.section === 'courselinks' && this.props.passSelectedValueToParent) {
        this.props.passSelectedValueToParent({ centreLocation: value }, 'showLocationDropdown');
      }
    } else if (name === 'language') {
      this.setState({
        filteredLanguages: this.state.languages.filter(lang =>
          lang.toLowerCase().includes(value.toLowerCase())
        ),
        language: value
      });
    }  else if (name === 'courseType') {
      console.log("Course Types:", value);
      this.setState({
        filteredTypes: this.state.types.filter(type =>
          type.toLowerCase().includes(value.toLowerCase())
        ),
        courseType: value
      });
    } 
    else if (name === 'courseName') {
      console.log("Selected Course Name:", value, this.state.coursesName);
      this.setState({
        filteredCoursesName: this.state.coursesName.filter(courseName =>
          //console.log("Course Name:", value, courseName, courseName.toLowerCase().includes(value.toLowerCase()))
          courseName.toLowerCase().includes(value.toLowerCase())
        ),
        courseName: value
      });
    }
    else if (name === 'accountType') {
      console.log(name, value);
      this.setState({
        filteredRoles: this.state.roles.filter(role =>
          role.toLowerCase().includes(value.toLowerCase())
        ),
        role: value
      });
    }
    else if (name === 'quarter') 
    {
      console.log("We do Course Quarter", this.state.quarters);
      console.log(name, value);
      this.setState({
        filteredQuarters: this.state.quarters.filter(quarter =>
          quarter.toLowerCase().includes(value.toLowerCase())
        ),
        quarter: value
      });
    }
    else if (name === 'searchQuery') {
      console.log(name, value);
      this.props.passSearchedValueToParent(value);
    }
    else if (name === 'category') {
      this.setState({
        filteredCategories: this.state.categories.filter(cat =>
          cat.toLowerCase().includes(value.toLowerCase())
        ),
        category: value
      });
      // Notify parent handler if it exists
      if (this.props.section === 'courselinks' && this.props.passSelectedValueToParent) {
        this.props.passSelectedValueToParent({ category: value }, 'showCategoryDropdown');
      }
    }
    else if (name === 'attendanceType') {
      this.setState({
        filteredAttendanceTypes: this.state.attendanceTypes.filter(type =>
          type.toLowerCase().includes(value.toLowerCase())
        ),
        attendanceType: value
      });
    }
    else if (name === 'attendanceLocation') {
      this.setState({
        filteredAttendanceLocations: this.state.attendanceLocations.filter(location =>
          location.toLowerCase().includes(value.toLowerCase())
        ),
        attendanceLocation: value
      }, () => {
        // After location changes, filter activity codes based on location
        this.filterActivityCodesByLocation(value);
      });
    }
    else if (name === 'membershipType') {
      console.log("Membership Type123:", value);
      this.setState({
        filteredMembershipTypes: this.state.membershipTypes.filter(type =>
          type.toLowerCase().includes(value.toLowerCase())
        ),
        membershipType: value
      });
    }
    else if (name === 'registrationStatus') {
      this.setState({
        filteredRegistrationStatuses: this.state.registrationStatuses.filter(status =>
          status.toLowerCase().includes(value.toLowerCase())
        ),
        registrationStatus: value
      });
    }
    else if (name === 'paymentMethod') {
      this.setState({
        filteredPaymentMethods: this.state.fundraisingPaymentMethods.filter(method =>
          method.toLowerCase().includes(value.toLowerCase())
        ),
        paymentMethod: value
      });
    }
    /*
    else if (name === 'collectionMode') {
      this.setState({
        filteredCollectionModes: this.state.fundraisingCollectionModes.filter(mode =>
          mode.toLowerCase().includes(value.toLowerCase())
        ),
        collectionMode: value
      });
    }
    */
    else if (name === 'collectionLocation') {
      console.log("Collection Location input changed:", value);
      console.log("Current fundraisingCollectionLocations:", this.state.fundraisingCollectionLocations);
      this.setState({
        filteredCollectionLocations: this.state.fundraisingCollectionLocations.filter(location =>
          location.toLowerCase().includes(value.toLowerCase())
        ),
        collectionLocation: value
      });
    }
    else if (name === 'fundraisingStatus') {
      this.setState({
        filteredFundraisingStatuses: this.state.fundraisingStatuses.filter(status =>
          status.toLowerCase().includes(value.toLowerCase())
        ),
        fundraisingStatus: value
      });
    }
  });
};

handleClearFilters = () => {
  // Reset all filter inputs
  this.setState(
    {
      searchQuery: '',
      centreLocation: '',
      language: '',
      role: '',
      courseType: '',
      courseName: '',
      quarter: '',
      registrationStatus: '',
      paymentMethod: '',
      collectionLocation: '',
      fundraisingStatus: '',
      attendanceType: '',
      activityCode: '',
      membershipType: '',
      showLocationDropdown: false,
      showLanguageDropdown: false,
      showTypeDropdown: false,
      showCourseDropdown: false,
      showAccountTypeDropdown: false,
      showQuarterDropdown: false,
      showRegistrationStatusDropdown: false,
      showPaymentMethodDropdown: false,
      showCollectionLocationDropdown: false,
      showStatusDropdown: false
    },
    () => {
      // Reset filter results (parent and component state)
      if (this.props.passSearchedValueToParent) {
        this.props.passSearchedValueToParent('');
      }
      if (this.props.section === 'registration' && this.props.passSelectedValueToParent) {
        this.props.passSelectedValueToParent({ courseType: '' }, 'showTypeDropdown');
        this.props.passSelectedValueToParent({ centreLocation: '' }, 'showLocationDropdown');
        this.props.passSelectedValueToParent({ quarter: '' }, 'showQuarterDropdown');
        this.props.passSelectedValueToParent({ courseName: '' }, 'showCourseDropdown');
        this.props.passSelectedValueToParent({ clear: true }, 'clearFilters');
      } else if (this.props.passSelectedValueToParent) {
        this.props.passSelectedValueToParent({ clear: true }, 'clearFilters');
      }
      if (typeof this.props.onClearFilters === 'function') {
        this.props.onClearFilters();
      }

      // Reset dropdown result lists to their full set
      this.setState({
        filteredLocations: this.state.locations,
        filteredLanguages: this.state.languages,
        filteredTypes: this.state.types,
        filteredRoles: this.state.roles,
        filteredCoursesName: this.state.coursesName,
        filteredQuarters: this.state.quarters,
        filteredAttendanceTypes: this.state.attendanceTypes,
        filteredAttendanceLocations: this.state.attendanceLocations,
        filteredPaymentMethods: this.state.fundraisingPaymentMethods,
        filteredCollectionLocations: this.state.fundraisingCollectionLocations,
        filteredFundraisingStatuses: this.state.fundraisingStatuses,
        filteredMembershipTypes: this.state.membershipTypes
      });
    }
  );
};

handleDropdownToggle = (dropdown) => {
  console.log("Dropdown:", dropdown);

  // Keep only one dropdown open at a time
  const dropdownKeys = [
    'showLocationDropdown',
    'showLanguageDropdown',
    'showTypeDropdown',
    'showCourseDropdown',
    'showQuarterDropdown',
    'showAccountTypeDropdown',
    'showAttendanceTypeDropdown',
    'showAttendanceLocationDropdown',
    'showActivityCodeDropdown',
    'showMembershipTypeDropdown',
    'showRegistrationStatusDropdown',
    'showPaymentMethodDropdown',
    'showCollectionLocationDropdown',
    'showStatusDropdown'
  ];

  this.setState((prevState) => {
    const willOpen = !prevState[dropdown];
    const nextState = {};

    // Close all dropdowns
    dropdownKeys.forEach((key) => {
      nextState[key] = false;
    });

    // Open the requested dropdown if it was previously closed
    if (willOpen) {
      nextState[dropdown] = true;
    }

    return nextState;
  });
};

handleOptionSelect = (value, dropdown) => {
  console.log("Selected value for filtered:", value, dropdown);
  const isMandarin = this.props.language === "zh"; 
  let updatedState = {};

    // Update state based on dropdown type
    if (dropdown === 'showLocationDropdown') {
      updatedState = {
        centreLocation: value,
        quarter: '',
        courseName: '',
        filteredQuarters: this.state.quarters,
        filteredCoursesName: [],
        showLocationDropdown: false, // Close the location dropdown
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showCourseDropdown: false,
        showAccountTypeDropdown: false,
        showQuarterDropdown: false
      };
    } else if (dropdown === 'showLanguageDropdown') {
      updatedState = {
        language: value,
        showLocationDropdown: false,
        showLanguageDropdown: false, // Close the language dropdown
        showTypeDropdown: false,
        showCourseDropdown: false,
        showAccountTypeDropdown: false,
        showQuarterDropdown: false
      };
    } else if (dropdown === 'showTypeDropdown') {
      updatedState = {
        courseType: value,
        centreLocation: '',
        quarter: '',
        courseName: '',
        filteredLocations: this.state.locations,
        filteredQuarters: [],
        filteredCoursesName: [],
        showLocationDropdown: false,
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showCourseDropdown: false,
        showQuarterDropdown: false,
        showAccountTypeDropdown: false // Close the type dropdown
      };
    }
    else if (dropdown === 'showAccountTypeDropdown') {
      console.log(value);
      updatedState = {
        role: value,
        showLocationDropdown: false,
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showAccountTypeDropdown: false,
        showCourseDropdown: false,
        showQuarterDropdown: false
      };
    }
    else if(dropdown === 'showCourseDropdown')
    {
      updatedState = ({
          courseName: value,
          showLocationDropdown: false,
          showLanguageDropdown: false,
          showTypeDropdown: false,
          showCourseDropdown: false,
          showAccountTypeDropdown: false,
          showQuarterDropdown: false
        });
    }
    else if(dropdown === 'showQuarterDropdown')
    {
        console.log("Setting quarter filter to", value);
        updatedState = ({
          quarter: value,
          courseName: '',
          filteredCoursesName: this.state.coursesName,
          showLocationDropdown: false,
          showLanguageDropdown: false,
          showTypeDropdown: false,
          showCourseDropdown: false,
          showAccountTypeDropdown: false,
          showQuarterDropdown: false
        });
    }
    else if (dropdown === 'showAttendanceTypeDropdown') {
      updatedState = {
        attendanceType: value,
        showLocationDropdown: false,
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showCourseDropdown: false,
        showAccountTypeDropdown: false,
        showQuarterDropdown: false,
        showAttendanceTypeDropdown: false,
        showAttendanceLocationDropdown: false
      };
    }
    else if (dropdown === 'showAttendanceLocationDropdown') {
      updatedState = {
        attendanceLocation: value,
        showLocationDropdown: false,
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showCourseDropdown: false,
        showAccountTypeDropdown: false,
        showQuarterDropdown: false,
        showAttendanceTypeDropdown: false,
        showAttendanceLocationDropdown: false
      };
      
      // After setting the state, filter activity codes by location
      this.setState(updatedState, () => {
        this.filterActivityCodesByLocation(value);
        this.props.passSelectedValueToParent(updatedState, dropdown);
      });
      return; // Early return to prevent duplicate state setting
    }
    else if (dropdown === 'showActivityCodeDropdown') {
      updatedState = {
        activityCode: value,
        showActivityCodeDropdown: false
      };
    }
    else if (dropdown === 'showMembershipTypeDropdown') {
      updatedState = {
        membershipType: value,
        showMembershipTypeDropdown: false,
        showLocationDropdown: false,
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showCourseDropdown: false,
        showAccountTypeDropdown: false,
        showQuarterDropdown: false,
        showAttendanceTypeDropdown: false,
        showAttendanceLocationDropdown: false,
        showActivityCodeDropdown: false
      };
    }
    else if (dropdown === 'showRegistrationStatusDropdown') {
      updatedState = {
        registrationStatus: value,
        showRegistrationStatusDropdown: false,
        showLocationDropdown: false,
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showCourseDropdown: false,
        showAccountTypeDropdown: false,
        showQuarterDropdown: false
      };
    }
    else if (dropdown === 'showPaymentMethodDropdown') {
      updatedState = {
        paymentMethod: value,
        showPaymentMethodDropdown: false,
        // showCollectionModeDropdown: false,
        showCollectionLocationDropdown: false,
        showStatusDropdown: false
      };
    }
    /*
    else if (dropdown === 'showCollectionModeDropdown') {
      updatedState = {
        collectionMode: value,
        showPaymentMethodDropdown: false,
        showCollectionModeDropdown: false,
        showStatusDropdown: false
      };
    }
    */
    else if (dropdown === 'showCollectionLocationDropdown') {
      updatedState = {
        collectionLocation: value,
        showPaymentMethodDropdown: false,
        showCollectionLocationDropdown: false,
        showStatusDropdown: false
      };
    }
    else if (dropdown === 'showStatusDropdown') {
      updatedState = {
        fundraisingStatus: value,
        showPaymentMethodDropdown: false,
        // showCollectionModeDropdown: false,
        showCollectionLocationDropdown: false,
        showStatusDropdown: false
      };
    }
    else if (dropdown === 'showCategoryDropdown') {
      updatedState = {
        category: value,
        showCategoryDropdown: false,
        showLocationDropdown: false
      };
    }


    this.setState(updatedState, () => {
      console.log("Updated States:", updatedState, dropdown);
      // Notify parent with the updated state
      this.props.passSelectedValueToParent(updatedState, dropdown);
    });
}

handleClickOutside = (event) => {
  const isOutside = (ref) => !ref?.current || !ref.current.contains(event.target);
  const nextState = {};

  if (isOutside(this.locationDropdownRef)) nextState.showLocationDropdown = false;
  if (isOutside(this.languageDropdownRef)) nextState.showLanguageDropdown = false;
  if (isOutside(this.typeDropdownRef)) nextState.showTypeDropdown = false;
  if (isOutside(this.courseDropdownRef)) nextState.showCourseDropdown = false;
  if (isOutside(this.accountTypeDropdownRef)) nextState.showAccountTypeDropdown = false;
  if (isOutside(this.quarterDropdownRef)) nextState.showQuarterDropdown = false;
  if (isOutside(this.registrationStatusDropdownRef)) nextState.showRegistrationStatusDropdown = false;
  if (isOutside(this.attendanceTypeDropdownRef)) nextState.showAttendanceTypeDropdown = false;
  if (isOutside(this.attendanceLocationDropdownRef)) nextState.showAttendanceLocationDropdown = false;
  if (isOutside(this.activityCodeDropdownRef)) nextState.showActivityCodeDropdown = false;
  if (isOutside(this.membershipTypeDropdownRef)) nextState.showMembershipTypeDropdown = false;
  if (isOutside(this.paymentMethodDropdownRef)) nextState.showPaymentMethodDropdown = false;
  if (isOutside(this.collectionLocationDropdownRef)) nextState.showCollectionLocationDropdown = false;
  if (isOutside(this.statusDropdownRef)) nextState.showStatusDropdown = false;
  if (isOutside(this.categoryDropdownRef)) nextState.showCategoryDropdown = false;

  if (Object.keys(nextState).length > 0) {
    this.setState(nextState);
  }
};

  componentDidMount() {
    document.addEventListener('pointerdown', this.handleClickOutside, true);
    this.updateUniqueLocationsLanguagesRolesTypes(this.props);
    
    // Initialize filtered activity codes
    this.setState({
      filteredActivityCodes: this.props.activityCodes || []
    });
    
    // Initialize courselink locations and categories from props if available
    if (this.props.section === 'courselinks') {
      const locations = this.props.courseLinkLocations || ['All Locations'];
      console.log("Course Link Locations in SearchSection:", locations);
      const categories = this.props.courseLinkCategories || ['All Categories'];
      this.setState({
        filteredLocations: locations,
        categories: categories,
        filteredCategories: categories
      });
    }
    
    // Initialize membership types if available
    if (this.props.membershipTypes) {
      const membershipTypes = this.props.membershipTypes || ['All Types'];
      this.setState({
        membershipTypes: membershipTypes,
        filteredMembershipTypes: membershipTypes
      });
    }

    // Initialize fundraising filter options if available
    // Initialize fundraising filter options if available
    if (this.props.fundraisingPaymentMethods) {
      const paymentMethods = this.props.fundraisingPaymentMethods || ['All Payment Methods'];
      this.setState({
        fundraisingPaymentMethods: paymentMethods,
        filteredPaymentMethods: paymentMethods
      });
    }
    
    /*
    if (this.props.fundraisingCollectionModes) {
      const collectionModes = this.props.fundraisingCollectionModes || ['All Collection Modes'];
      this.setState({
        fundraisingCollectionModes: collectionModes,
        filteredCollectionModes: collectionModes
      });
    }
    */
    
    if (this.props.fundraisingCollectionLocations) {
      const collectionLocations = this.props.fundraisingCollectionLocations || ['All Collection Locations'];
      this.setState({
        fundraisingCollectionLocations: collectionLocations,
        filteredCollectionLocations: collectionLocations
      });
    }
    
    if (this.props.fundraisingStatuses) {
      const statuses = this.props.fundraisingStatuses || ['All Statuses'];
      this.setState({
        fundraisingStatuses: statuses,
        filteredFundraisingStatuses: statuses
      });
    }
    
    // Initialize registration statuses if available
    if (this.props.registrationStatuses) {
      const registrationStatuses = this.props.registrationStatuses || ['All Statuses'];
      this.setState({
        registrationStatuses: registrationStatuses,
        filteredRegistrationStatuses: registrationStatuses
      });
    }
  }

  componentDidUpdate(prevProps) {
    console.log("Update:", this.props);  
    if (
      this.props.section === 'registration' &&
      (
        this.props.selectedCourseType !== prevProps.selectedCourseType ||
        this.props.selectedLocation !== prevProps.selectedLocation ||
        this.props.selectedQuarter !== prevProps.selectedQuarter ||
        this.props.selectedCourseName !== prevProps.selectedCourseName ||
        this.props.selectedSearchQuery !== prevProps.selectedSearchQuery
      )
    ) {
      const nextSearchQuery = this.props.selectedSearchQuery || '';
      const nextCourseType = this.props.selectedCourseType || '';
      const nextLocation = this.props.selectedLocation || '';
      const nextQuarter = this.props.selectedQuarter || '';
      const nextCourseName = this.props.selectedCourseName || '';

      if (
        nextSearchQuery !== this.state.searchQuery ||
        nextCourseType !== this.state.courseType ||
        nextLocation !== this.state.centreLocation ||
        nextQuarter !== this.state.quarter ||
        nextCourseName !== this.state.courseName
      ) {
        this.setState({
          searchQuery: nextSearchQuery,
          courseType: nextCourseType,
          centreLocation: nextLocation,
          quarter: nextQuarter,
          courseName: nextCourseName,
        });
      }
    }

    if ((this.props.resetSearch && prevProps.resetSearch !== this.props.resetSearch)) {
      this.setState({
        searchQuery: '',
        centreLocation: '',
        language: '',
        role: '',
        courseType: '',
        courseName: '',
        quarter: '',
        paymentMethod: '',
        // collectionMode: '',
        collectionLocation: '',
        fundraisingStatus: '',
        attendanceType: '',
        activityCode: '',
        membershipType: '',
        showLocationDropdown: false,
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showAccountTypeDropdown: false,
        showCourseDropdown: false,
        showQuarterDropdown: false,
        showPaymentMethodDropdown: false,
        // showCollectionModeDropdown: false,
        showCollectionLocationDropdown: false,
        showStatusDropdown: false
      });
    }
  
    if (this.props.locations !== prevProps.locations) {
      const uniqueLocations = ["All Locations", ...new Set(this.props.locations)];
      const specificLocations = this.getSpecificOptions(uniqueLocations);
      const shouldAutoSelectLocation =
        this.shouldAutoFillSingleRegistrationFilters() &&
        this.hasSpecificSelection(this.state.courseType) &&
        specificLocations.length === 1;
      const resolvedLocation = shouldAutoSelectLocation ? specificLocations[0] : this.state.centreLocation;
      this.setState({
        locations: uniqueLocations,
        filteredLocations: uniqueLocations,
        centreLocation: resolvedLocation
      }, () => {
        if (shouldAutoSelectLocation && this.props.passSelectedValueToParent) {
          this.props.passSelectedValueToParent({ centreLocation: resolvedLocation }, 'showLocationDropdown');
        }
      });
    }
  
    if (this.props.languages !== prevProps.languages) {
      const uniqueLanguages = ["All Languages", ...new Set(this.props.languages)];
      this.setState({
        languages: uniqueLanguages,
        filteredLanguages: uniqueLanguages
      }); 
    }  

              
    if (this.props.types !== prevProps.types) {
      const uniqueTypes = this.getRegistrationTypes(this.props.types);
      const specificTypes = this.getSpecificOptions(uniqueTypes);
      const shouldAutoSelectSingleType =
        this.shouldAutoFillSingleRegistrationFilters() && specificTypes.length === 1;

      this.setState({
        types: uniqueTypes,
        filteredTypes: uniqueTypes,
        courseType: shouldAutoSelectSingleType ? specificTypes[0] : this.state.courseType
      }, () => {
        if (shouldAutoSelectSingleType && this.props.passSelectedValueToParent) {
          this.props.passSelectedValueToParent({ courseType: specificTypes[0] }, 'showTypeDropdown');
        }
      }); 
    }  

    if (this.props.courses !== prevProps.courses) {
      const uniqueCoursesName = ["All Courses Name", ...new Set(this.props.courses)];
      const isRegistrationSection = this.props.section === 'registration';
      const allowCourseOptions = !isRegistrationSection || this.hasSpecificSelection(this.state.quarter);
      const specificCourses = this.getSpecificOptions(uniqueCoursesName);
      const shouldAutoSelectCourse =
        this.shouldAutoFillSingleRegistrationFilters() &&
        this.hasSpecificSelection(this.state.quarter) &&
        specificCourses.length === 1;
      const resolvedCourse = shouldAutoSelectCourse ? specificCourses[0] : this.state.courseName;
      this.setState({
        coursesName: uniqueCoursesName,
        filteredCoursesName: allowCourseOptions ? uniqueCoursesName : [],
        courseName: resolvedCourse
      }, () => {
        if (shouldAutoSelectCourse && this.props.passSelectedValueToParent) {
          this.props.passSelectedValueToParent({ courseName: resolvedCourse }, 'showCourseDropdown');
        }
      }); 
    }  

              
    if (this.props.roles !== prevProps.roles) {
      const uniqueRoles = ["All Roles", ...new Set(this.props.roles)];
      this.setState({
        roles: uniqueRoles,
        filteredRoles: uniqueRoles
      }); 
    }  

    if (this.props.quarters !== prevProps.quarters) {
      const uniqueQuarters = ["All Quarters", ...new Set(this.props.quarters)];
      const allowQuarterOptions =
        this.props.section !== 'registration' ||
        (this.hasSpecificSelection(this.state.courseType) &&
          this.hasSpecificSelection(this.state.centreLocation));
      const specificQuarters = this.getSpecificOptions(uniqueQuarters);
      const shouldAutoSelectQuarter =
        this.shouldAutoFillSingleRegistrationFilters() &&
        allowQuarterOptions &&
        specificQuarters.length === 1;
      const resolvedQuarter = shouldAutoSelectQuarter ? specificQuarters[0] : this.state.quarter;
      this.setState({
        quarters: uniqueQuarters,
        filteredQuarters: allowQuarterOptions ? uniqueQuarters : [],
        quarter: resolvedQuarter
      }, () => {
        if (shouldAutoSelectQuarter && this.props.passSelectedValueToParent) {
          this.props.passSelectedValueToParent({ quarter: resolvedQuarter }, 'showQuarterDropdown');
        }
      }); 
    }  


      console.log("Attendance Types:", this.props.attendanceTypes);
      
    // Check if attendance types from props have changed
    if (this.props.attendanceTypes !== prevProps.attendanceTypes) {
      // Make sure we have the 'All Types' as first option
      const types = this.props.attendanceTypes || ['All Types'];
      if (!types.includes('All Types')) {
        types.unshift('All Types');
      }
      
      this.setState({
        attendanceTypes: types,
        filteredAttendanceTypes: types
      });
    }

    // Check if attendance locations from props have changed
    if (this.props.attendanceLocations !== prevProps.attendanceLocations) {
      // Make sure we have the 'All Locations' as first option
      const locations = this.props.attendanceLocations || ['All Locations'];
      if (!locations.includes('All Locations')) {
        locations.unshift('All Locations');
      }
      
      this.setState({
        attendanceLocations: locations,
        filteredAttendanceLocations: locations
      });
    }

    // Check if activity codes from props have changed
    if (this.props.activityCodes !== prevProps.activityCodes) {
      this.setState({
        filteredActivityCodes: this.props.activityCodes || []
      }, () => {
        // If a location is already selected, filter the activity codes
        if (this.state.attendanceLocation && this.state.attendanceLocation !== 'All Locations') {
          this.filterActivityCodesByLocation(this.state.attendanceLocation);
        }
      });
    }
    
    // Check if membership types from props have changed
    if (this.props.membershipTypes !== prevProps.membershipTypes) {
      console.log('SearchSection: Membership types props changed:', {
        prevTypes: prevProps.membershipTypes,
        newTypes: this.props.membershipTypes
      });
      
      const membershipTypes = this.props.membershipTypes || ['All Types'];
      if (!membershipTypes.includes('All Types')) {
        membershipTypes.unshift('All Types');
      }
      
      console.log('SearchSection: Setting membership types to state:', membershipTypes);
      
      this.setState({
        membershipTypes: membershipTypes,
        filteredMembershipTypes: membershipTypes
      });
    }

    // Check if registration statuses from props have changed
    if (this.props.registrationStatuses !== prevProps.registrationStatuses) {
      console.log('SearchSection: Registration statuses props changed:', {
        prevStatuses: prevProps.registrationStatuses,
        newStatuses: this.props.registrationStatuses
      });
      
      const registrationStatuses = this.props.registrationStatuses || ['All Statuses'];
      if (!registrationStatuses.includes('All Statuses')) {
        registrationStatuses.unshift('All Statuses');
      }
      
      console.log('SearchSection: Setting registration statuses to state:', registrationStatuses);
      
      this.setState({
        registrationStatuses: registrationStatuses,
        filteredRegistrationStatuses: registrationStatuses
      });
    }

    // Check if fundraising payment methods from props have changed
    if (this.props.fundraisingPaymentMethods !== prevProps.fundraisingPaymentMethods) {
      const paymentMethods = this.props.fundraisingPaymentMethods || ['All Payment Methods'];
      if (!paymentMethods.includes('All Payment Methods')) {
        paymentMethods.unshift('All Payment Methods');
      }
      
      this.setState({
        fundraisingPaymentMethods: paymentMethods,
        filteredPaymentMethods: paymentMethods
      });
    }

    /*
    // Check if fundraising collection modes from props have changed
    if (this.props.fundraisingCollectionModes !== prevProps.fundraisingCollectionModes) {
      const collectionModes = this.props.fundraisingCollectionModes || ['All Collection Modes'];
      if (!collectionModes.includes('All Collection Modes')) {
        collectionModes.unshift('All Collection Modes');
      }
      
      this.setState({
        fundraisingCollectionModes: collectionModes,
        filteredCollectionModes: collectionModes
      });
    }
    */

    // Check if fundraising collection locations from props have changed
    if (this.props.fundraisingCollectionLocations !== prevProps.fundraisingCollectionLocations) {
      console.log("Collection locations updated from props:", this.props.fundraisingCollectionLocations);
      const collectionLocations = this.props.fundraisingCollectionLocations || ['All Collection Locations'];
      if (!collectionLocations.includes('All Collection Locations')) {
        collectionLocations.unshift('All Collection Locations');
      }
      
      console.log("Setting collection locations in state:", collectionLocations);
      this.setState({
        fundraisingCollectionLocations: collectionLocations,
        filteredCollectionLocations: collectionLocations
      });
    }

    // Check if fundraising statuses from props have changed
    if (this.props.fundraisingStatuses !== prevProps.fundraisingStatuses) {
      const statuses = this.props.fundraisingStatuses || ['All Statuses'];
      if (!statuses.includes('All Statuses')) {
        statuses.unshift('All Statuses');
      }
      
      this.setState({
        fundraisingStatuses: statuses,
        filteredFundraisingStatuses: statuses
      });
    }

    // Check if categories from props have changed (for courselinks)
    if (this.props.categories !== prevProps.categories) {
      const categories = this.props.categories || ['All Categories'];
      if (!categories.includes('All Categories')) {
        categories.unshift('All Categories');
      }
      
      this.setState({
        categories: categories,
        filteredCategories: categories
      });
    }

    // Check if courselink locations from props have changed
    if (this.props.courseLinkLocations !== prevProps.courseLinkLocations) {
      const locations = this.props.courseLinkLocations || ['All Locations'];
      if (!locations.includes('All Locations') && locations.length > 0) {
        locations.unshift('All Locations');
      }
      
      this.setState({
        filteredLocations: locations
      });
    }

    // Check if courselink categories from props have changed
    if (this.props.courseLinkCategories !== prevProps.courseLinkCategories) {
      const categories = this.props.courseLinkCategories || ['All Categories'];
      if (!categories.includes('All Categories') && categories.length > 0) {
        categories.unshift('All Categories');
      }
      
      this.setState({
        categories: categories,
        filteredCategories: categories
      });
    }

    // Reset search input field when searchQuery changes to empty string
    if (prevProps.searchQuery !== this.props.searchQuery && this.props.searchQuery === '') {
      // Clear the input field
      if (this.searchInputRef && this.searchInputRef.current) {
        this.searchInputRef.current.value = '';
      }
    }
    
    // Reset dropdown when membershipType is reset to default
    if (prevProps.membershipType !== this.props.membershipType && 
        this.props.membershipType === 'All Types' &&
        this.state.selectedMembershipType !== 'All Types') {
      this.setState({
        selectedMembershipType: 'All Types'
      });
    }
  }
  
  // Method to handle updating locations and languages
updateUniqueLocationsLanguagesRolesTypes(props) {
  const autoEnabled = this.shouldAutoFillSingleRegistrationFilters();
  const uniqueRoles = ["All Roles", ...new Set(props.roles)];
  const uniqueLocations = ["All Locations", ...new Set(props.locations)];
  const uniqueLanguages = ["All Languages", ...new Set(props.languages)];
  const uniqueTypes = this.getRegistrationTypes(props.types);
  const uniqueCoursesName = ["All Courses Name", ...new Set(props.courses)];
  const uniqueCoursesQuarters = ["All Courses Quarters", ...new Set(props.quarters)];
  const specificTypes = this.getSpecificOptions(uniqueTypes);
  const resolvedType =
    autoEnabled && specificTypes.length === 1
      ? specificTypes[0]
      : this.state.courseType;
  const specificLocations = this.getSpecificOptions(uniqueLocations);
  const canResolveLocation = autoEnabled && this.hasSpecificSelection(resolvedType);
  const resolvedLocation =
    canResolveLocation && specificLocations.length === 1
      ? specificLocations[0]
      : this.state.centreLocation;
  const specificQuarters = this.getSpecificOptions(uniqueCoursesQuarters);
  const canResolveQuarter = autoEnabled && this.hasSpecificSelection(resolvedLocation);
  const resolvedQuarter =
    canResolveQuarter && specificQuarters.length === 1
      ? specificQuarters[0]
      : this.state.quarter;
  const specificCourses = this.getSpecificOptions(uniqueCoursesName);
  const canResolveCourse = autoEnabled && this.hasSpecificSelection(resolvedQuarter);
  const resolvedCourse =
    canResolveCourse && specificCourses.length === 1
      ? specificCourses[0]
      : this.state.courseName;
  console.log("Props:", props);
  console.log("Unique: ", uniqueCoursesQuarters); 

  this.setState({
    courseType: resolvedType,
    centreLocation: resolvedLocation,
    quarter: resolvedQuarter,
    courseName: resolvedCourse,
    locations: uniqueLocations,
    filteredLocations: uniqueLocations,
    languages: this.translateLanguages(uniqueLanguages), // Translate if necessary
    filteredLanguages: this.translateLanguages(uniqueLanguages), // Translate if necessary
    types: uniqueTypes, // Translate if necessary
    filteredTypes: uniqueTypes, // Translate if 
    roles: uniqueRoles, 
    filteredRoles: uniqueRoles,
    quarters: uniqueCoursesQuarters, 
    filteredQuarters: canResolveLocation ? uniqueCoursesQuarters : [],
    filteredCoursesName: (props.section === 'registration' && !this.hasSpecificSelection(resolvedQuarter))
      ? []
      : this.translateLanguages(uniqueCoursesName), // Translate if necessary
    filteredActivityCodes: props.activityCodes || [] // Initialize filtered activity codes
  }, () => {
    if (!props.passSelectedValueToParent) return;
    if (autoEnabled && specificTypes.length === 1) {
      props.passSelectedValueToParent({ courseType: resolvedType }, 'showTypeDropdown');
    }
    if (autoEnabled && canResolveLocation && specificLocations.length === 1) {
      props.passSelectedValueToParent({ centreLocation: resolvedLocation }, 'showLocationDropdown');
    }
    if (autoEnabled && canResolveQuarter && specificQuarters.length === 1) {
      props.passSelectedValueToParent({ quarter: resolvedQuarter }, 'showQuarterDropdown');
    }
    if (autoEnabled && canResolveCourse && specificCourses.length === 1) {
      props.passSelectedValueToParent({ courseName: resolvedCourse }, 'showCourseDropdown');
    }
  });
} 

// Method to filter activity codes based on selected location
filterActivityCodesByLocation = (selectedLocation) => {
  const allActivityCodes = this.props.activityCodes || [];

  console.log("Filtered Activity Codes:", allActivityCodes);
  
  if (!selectedLocation || selectedLocation === 'All Locations') {
    // If no location selected or "All Locations" selected, show all activity codes
    this.setState({
      filteredActivityCodes: allActivityCodes
    });
    return;
  }

  // Map location display names to their corresponding codes that appear in activity codes
  const locationCodeMap = {
    'CT Hub': 'CTH',
    'Tampines 253': '253',
    'Tampines North Community Centre': 'TNC', 
    'Pasir Ris West Wellness Centre': 'PRW'
  };

  const locationCode = locationCodeMap[selectedLocation];
  
  if (locationCode) {
    // Filter activity codes that start with the location code
    const filteredCodes = allActivityCodes.filter(code => 
      code && code.startsWith(locationCode)
    );
    
    this.setState({
      filteredActivityCodes: filteredCodes,
      activityCode: '' // Clear the current activity code selection when location changes
    });
    
    // Notify parent about the activity code being cleared
    this.props.passSelectedValueToParent({ activityCode: '' }, 'activityCode');
  } else {
    // If location not recognized, show all codes
    this.setState({
      filteredActivityCodes: allActivityCodes
    });
  }
};

componentWillUnmount() {
  document.removeEventListener('pointerdown', this.handleClickOutside, true);
}

  
render() 
{
  const { membershipType, showNameDropdown, typename, filteredName, staffName, searchQuery, centreLocation, language, quarter, quarters, courseQuarters, filteredQuarters, filteredLocations, filteredLanguages, filteredTypes, showLocationDropdown, showLanguageDropdown, showTypeDropdown, courseType, showAccountTypeDropdown, role, roles, filteredRoles, coursesName, showCourseDropdown, filteredCoursesName, courseName, showQuarterDropdown, paymentMethod, collectionLocation, fundraisingStatus, filteredPaymentMethods, filteredCollectionLocations, filteredFundraisingStatuses, showPaymentMethodDropdown, showCollectionLocationDropdown, showStatusDropdown } = this.state;
  const { section } = this.props; // Destructure section from props

  const hasSpecificSelection = (value) => {
    const text = String(value || '').trim();
    return !!text && !/^all\b/i.test(text);
  };

  const canChooseLocation = hasSpecificSelection(courseType);
  const canChooseQuarter = canChooseLocation && hasSpecificSelection(centreLocation);
  const canChooseCourse = canChooseQuarter && hasSpecificSelection(quarter);
  const locationOptions = canChooseLocation ? filteredLocations : [];
  const quarterOptions = canChooseQuarter
    ? (filteredQuarters.length > 0 ? filteredQuarters : quarters)
    : [];
  const courseOptions = canChooseCourse
    ? (filteredCoursesName.length > 0 ? filteredCoursesName : coursesName)
    : [];

  console.log("Course Name List:", this.state);
  console.log("Section:", section);
  return (
  <div className={`ss-filter-wrapper ${section === 'registration' ? 'ss-filter-wrapper-registration' : ''}`.trim()}> {/* Same class name for both ¸sxderftyio */}
    <div className={`ss-controls-row ${section === 'registration' ? 'ss-controls-row-registration' : ''}`.trim()} >
      {section === "accounts" && ( // Content for "registration"
        <>
        <div className="ss-field-group">
            <label htmlFor="accountType">{this.props.language === 'zh' ? '' : 'Account Type'}</label>
            <div
              className={`ss-dropdown-wrap ${showAccountTypeDropdown ? 'open' : ''}`}
              ref={this.accountTypeDropdownRef}
            >
              <input
                type="text"
                id="accountType"
                name="accountType"
                value={role}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showAccountTypeDropdown')}
                placeholder={this.props.language === 'zh' ? '' : 'Filter by account type'}
                autoComplete="off"
              />
              {showAccountTypeDropdown && (
                <ul className="ss-options-list">
                  {filteredRoles.map((role, index) => (
                    <li
                      key={index}
                      onClick={() => this.handleOptionSelect(role, 'showAccountTypeDropdown')}
                    >
                      {role}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>
            <div className="ss-field-group ss-field-group-registration-search">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="ss-search-wrap">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search ss-magnifier-icon"></i>
            </div>
          </div>
        </>            
      )}

      {section === "courses" && ( // Content for "courses"
        <>
          <div className="ss-field-group">
            <label htmlFor="centreLocation">{this.props.language === 'zh' ? '中心位置' : 'Locations'}</label>
            <div
              className={`ss-dropdown-wrap ${showLocationDropdown ? 'open' : ''}`}
              ref={this.locationDropdownRef}
            >
              <input
                type="text"
                id="centreLocation"
                name="centreLocation"
                value={centreLocation}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showLocationDropdown')}
                placeholder={this.props.language === 'zh' ? '按地点筛选' : 'Filter by location'}
                autoComplete="off"
              />
              {showLocationDropdown && (
                <ul className="ss-options-list">
                  {filteredLocations.map((location, index) => (
                    <li
                      key={index}
                      onClick={() => this.handleOptionSelect(location, 'showLocationDropdown')}
                    >
                      {location}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>
          <div className="ss-field-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="ss-search-wrap">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search ss-magnifier-icon"></i>
            </div>
          </div>
        </>
      )}

      {section === "courselinks" && ( // Content for "courselinks"
        <>
          <div className="ss-field-group">
            <label htmlFor="centreLocation">{this.props.language === 'zh' ? '中心位置' : 'Location'}</label>
            <div
              className={`ss-dropdown-wrap ${showLocationDropdown ? 'open' : ''}`}
              ref={this.locationDropdownRef}
            >
              <input
                type="text"
                id="centreLocation"
                name="centreLocation"
                value={centreLocation}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showLocationDropdown')}
                placeholder={this.props.language === 'zh' ? '按地点筛选' : 'Filter by location'}
                autoComplete="off"
              />
              {showLocationDropdown && (
                <ul className="ss-options-list">
                  {filteredLocations.map((location, index) => (
                    <li
                      key={index}
                      onClick={() => this.handleOptionSelect(location, 'showLocationDropdown')}
                    >
                      {location}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>

          <div className="ss-field-group">
            <label htmlFor="category">{this.props.language === 'zh' ? '分类' : 'Category'}</label>
            <div
              className={`ss-dropdown-wrap ${this.state.showCategoryDropdown ? 'open' : ''}`}
              ref={this.categoryDropdownRef}
            >
              <input
                type="text"
                id="category"
                name="category"
                value={this.state.category}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showCategoryDropdown')}
                placeholder={this.props.language === 'zh' ? '按分类筛选' : 'Filter by category'}
                autoComplete="off"
              />
              {this.state.showCategoryDropdown && (
                <ul className="ss-options-list">
                  {this.state.filteredCategories.map((cat, index) => (
                    <li
                      key={index}
                      onClick={() => this.handleOptionSelect(cat, 'showCategoryDropdown')}
                    >
                      {cat}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>

          <div className="ss-field-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="ss-search-wrap">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search ss-magnifier-icon"></i>
            </div>
          </div>
        </>
      )}
      
      {section === "registration" &&  ( // Content for "registration"
        <>
        <div className="ss-field-group">
              <label htmlFor="courseType">{this.props.language === 'zh' ? '' : 'Type'}</label>
              <div
                className={`ss-dropdown-wrap ${showTypeDropdown ? 'open' : ''}`}
                ref={this.typeDropdownRef}
              >
                <input
                  type="text"
                  id="courseType"
                  name="courseType"
                  value={courseType}
                  onChange={this.handleChange}
                  onClick={() => this.handleDropdownToggle('showTypeDropdown')}
                  placeholder={this.props.language === 'zh' ? '' : 'Filter by type'}
                  autoComplete="off"
                />
                {showTypeDropdown && (
                  <ul className="ss-options-list">
                    {filteredTypes.map((type, index) => (
                      <li
                        key={index}
                        onClick={() => this.handleOptionSelect(type, 'showTypeDropdown')}
                      >
                        {type}
                      </li>
                    ))}
                  </ul>
                )}
                <i className="fas fa-angle-down ss-chevron-icon"></i>
              </div>
            </div>
            <div className="ss-field-group">
              <label htmlFor="centreLocation">{this.props.language === 'zh' ? '中心位置' : 'Locations'}</label>
              <div
                className={`ss-dropdown-wrap ${showLocationDropdown ? 'open' : ''}`}
                ref={this.locationDropdownRef}
              >
                <input
                  type="text"
                  id="centreLocation"
                  name="centreLocation"
                  value={centreLocation}
                  onChange={this.handleChange}
                  onClick={() => canChooseLocation && this.handleDropdownToggle('showLocationDropdown')}
                  placeholder={
                    this.props.language === 'zh'
                      ? '按地点筛选'
                      : canChooseLocation
                        ? 'Filter by location'
                        : 'Select Type first'
                  }
                  disabled={!canChooseLocation}
                  autoComplete="off"
                />
                {showLocationDropdown && (
                  <ul className="ss-options-list">
                    {locationOptions.map((location, index) => (
                      <li
                        key={index}
                        onClick={() => this.handleOptionSelect(location, 'showLocationDropdown')}
                      >
                        {location}
                      </li>
                    ))}
                  </ul>
                )}
                <i className="fas fa-angle-down ss-chevron-icon"></i>
              </div>
            </div>
            <div className="ss-field-group">
              <label htmlFor="courseQuarter">{this.props.language === 'zh' ? '中心位置' : 'Quarter Year'}</label>
              <div
                className={`ss-dropdown-wrap ${showQuarterDropdown ? 'open' : ''}`}
                ref={this.quarterDropdownRef}
              >
                <input
                  type="text"
                  id="quarter"
                  name="quarter"
                  value={quarter}
                  onChange={this.handleChange}
                  onClick={() => canChooseQuarter && this.handleDropdownToggle('showQuarterDropdown')}
                  placeholder={
                    this.props.language === 'zh'
                      ? '按地点筛选'
                      : canChooseQuarter
                        ? 'Filter by course quarter'
                        : 'Select Location first'
                  }
                  disabled={!canChooseQuarter}
                  autoComplete="off"
                />
                {showQuarterDropdown && (
                  <ul className="ss-options-list">
                    {quarterOptions.map((quarter, index) => (
                      <li
                        key={index}
                        onClick={() => this.handleOptionSelect(quarter, 'showQuarterDropdown')}
                      >
                        {quarter}
                      </li>
                    ))}
                  </ul>
                )}
                <i className="fas fa-angle-down ss-chevron-icon"></i>
              </div>
            </div>
            <div className="ss-field-group ss-field-group-registration-course">
            <label htmlFor="course">{this.props.language === 'zh' ? '': 'Course'}</label>
            <div
              className={`ss-dropdown-wrap ${showCourseDropdown ? 'open' : ''}`}
              ref={this.courseDropdownRef}
            >
            <input
              type="text"
              id="courseName"
              name="courseName"
              value={courseName} // Show only the first selected course or empty string
              onChange={this.handleChange}
              onClick={() => canChooseCourse && this.handleDropdownToggle('showCourseDropdown')}
              placeholder={
                this.props.language === 'zh'
                  ? ''
                  : canChooseCourse
                    ? 'Filter by course'
                    : 'Select Quarter Year first'
              }
              disabled={!canChooseCourse}
              autoComplete="off"
            />
              {showCourseDropdown && (
                <ul className="ss-options-list">
                  {courseOptions.map((name, index) => (
                    <li
                      key={index}
                      onClick={() => this.handleOptionSelect(name, 'showCourseDropdown')}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
            </div>
            <div className="ss-field-group">
            <label htmlFor="registrationStatus">{this.props.language === 'zh' ? '': 'Registration Status'}</label>
            <div
              className={`ss-dropdown-wrap ${this.state.showRegistrationStatusDropdown ? 'open' : ''}`}
              ref={this.registrationStatusDropdownRef}
            >
            <input
              type="text"
              id="registrationStatus"
              name="registrationStatus"
              value={this.state.registrationStatus}
              onChange={this.handleChange}
              onClick={() => this.handleDropdownToggle('showRegistrationStatusDropdown')}
              placeholder={
                this.props.language === 'zh'
                  ? ''
                  : 'Filter by registration status'
              }
              autoComplete="off"
            />
              {this.state.showRegistrationStatusDropdown && (
                <ul className="ss-options-list">
                  {this.state.filteredRegistrationStatuses.map((status, index) => (
                    <li
                      key={index}
                      onClick={() => this.handleOptionSelect(status, 'showRegistrationStatusDropdown')}
                    >
                      {status}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
            </div>
            <div className="ss-field-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="ss-search-wrap">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search ss-magnifier-icon"></i>
            </div>
          </div>
          <div className={`ss-field-group ${section === 'registration' ? 'ss-field-group-clear' : ''}`.trim()}>
            <button type="button" className="ss-clear-filters-button" onClick={this.handleClearFilters}>
              {this.props.language === 'zh' ? '清除筛选' : 'Clear Filters'}
            </button>
          </div>
        </>            
      )}

      {section === "attendance" && (
        <>
          <div className="ss-field-group">
            <label htmlFor="attendanceType">{this.props.language === 'zh' ? '类型' : 'Type'}</label>
            <div
              className={`ss-dropdown-wrap ${this.state.showAttendanceTypeDropdown ? 'open' : ''}`}
              ref={this.attendanceTypeDropdownRef}
            >
              <input
                type="text"
                id="attendanceType"
                name="attendanceType"
                value={this.state.attendanceType}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showAttendanceTypeDropdown')}
                placeholder={this.props.language === 'zh' ? '按类型筛选' : 'Filter by type'}
                autoComplete="off"
              />
              {this.state.showAttendanceTypeDropdown && (
                <ul className="ss-options-list">
                  {this.state.filteredAttendanceTypes.map((type, index) => (
                    <li
                      key={index}
                      onMouseDown={() => this.handleOptionSelect(type, 'showAttendanceTypeDropdown')}
                    >
                      {type}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>

          <div className="ss-field-group">
            <label htmlFor="attendanceLocation">{this.props.language === 'zh' ? '地点' : 'Location'}</label>
            <div
              className={`ss-dropdown-wrap ${this.state.showAttendanceLocationDropdown ? 'open' : ''}`}
              ref={this.attendanceLocationDropdownRef}
            >
              <input
                type="text"
                id="attendanceLocation"
                name="attendanceLocation"
                value={this.state.attendanceLocation}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showAttendanceLocationDropdown')}
                placeholder={this.props.language === 'zh' ? '按地点筛选' : 'Filter by location'}
                autoComplete="off"
              />
              {this.state.showAttendanceLocationDropdown && (
                <ul className="ss-options-list">
                  {this.state.filteredAttendanceLocations.map((location, index) => (
                    <li
                      key={index}
                      onMouseDown={() => this.handleOptionSelect(location, 'showAttendanceLocationDropdown')}
                    >
                      {location}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>
          
          <div className="ss-field-group">
            <label htmlFor="activityCode">{this.props.language === 'zh' ? '活动代码' : 'Activity Code'}</label>
            <div  className={`ss-dropdown-wrap ${this.state.showActivityCodeDropdown ? 'open' : ''}`} style={{ position: 'relative' }} ref={this.activityCodeDropdownRef}>
              <input
                type="text"
                id="activityCode"
                name="activityCode"
                value={this.state.activityCode}
                onChange={e => {
                  const value = e.target.value;
                  this.setState({ activityCode: value, showActivityCodeDropdown: true });
                }}
                onFocus={() => this.setState({ showActivityCodeDropdown: true })}
                onBlur={() => setTimeout(() => this.setState({ showActivityCodeDropdown: false }, () => {
                  this.props.passSelectedValueToParent({ activityCode: this.state.activityCode }, 'activityCode');
                }), 150)}
                placeholder={this.props.language === 'zh' ? '按活动代码筛选' : 'Filter by activity code'}
                autoComplete="off"
                style={{ padding: '6px 12px', fontSize: 16, borderRadius: 4, border: '1px solid #ccc', minWidth: 160 }}
              />
              {this.state.showActivityCodeDropdown && this.state.filteredActivityCodes.filter(code =>
                !this.state.activityCode || code.toLowerCase().includes(this.state.activityCode.toLowerCase())
              ).length > 0 && (
                <ul className="ss-options-list" style={{ position: 'absolute', zIndex: 10, width: '100%' }}>
                  {this.state.filteredActivityCodes.filter(code =>
                    !this.state.activityCode || code.toLowerCase().includes(this.state.activityCode.toLowerCase())
                  ).map((code, idx) => (
                    <li
                      key={code + idx}
                      onMouseDown={() => {
                        this.setState({ activityCode: code, showActivityCodeDropdown: false }, () => {
                          this.props.passSelectedValueToParent({ activityCode: code }, 'activityCode');
                        });
                      }}
                      style={{ cursor: 'pointer', padding: '6px 12px' }}
                    >
                      {code}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>
          
          <div className="ss-field-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="ss-search-wrap">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search ss-magnifier-icon"></i>
            </div>
          </div>
        </>
      )}

      {section === "membership" && (
        <>
          {console.log("Membership Type:", this.state.membershipType)}
          {console.log("Membership Types in state:", this.state.membershipTypes)}
          {console.log("Filtered Membership Types:", this.state.filteredMembershipTypes)}
          {console.log("Show Dropdown:", this.state.showMembershipTypeDropdown)}
          <div className="ss-field-group">
            <label htmlFor="membershipType">{this.props.language === 'zh' ? '会员类型' : 'Membership Type'}</label>
            <div
              className={`ss-dropdown-wrap ${this.state.showMembershipTypeDropdown ? 'open' : ''}`}
              ref={this.membershipTypeDropdownRef}
            >
              <input
                type="text"
                id="membershipType"
                name="membershipType"
                value={membershipType}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showMembershipTypeDropdown')}
                placeholder={this.props.language === 'zh' ? '按会员类型筛选' : 'Filter by membership type'}
                autoComplete="off"
                ref={this.searchInputRef} // Add ref to the search input
              />
              {this.state.showMembershipTypeDropdown && (
                <ul className="ss-options-list">
                  {console.log("Rendering dropdown with types:", this.state.filteredMembershipTypes)}
                  {this.state.filteredMembershipTypes.map((type, index) => (
                    <li
                      key={index}
                      onMouseDown={() => this.handleOptionSelect(type, 'showMembershipTypeDropdown')}
                    >
                      {type}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>
          
          <div className="ss-field-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="ss-search-wrap">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索会员' : 'Search membership'}
                autoComplete="off"
              />
              <i className="fas fa-search ss-magnifier-icon"></i>
            </div>
          </div>
        </>
      )}

      {section === "fundraising-table" && (
        <>
          <div className="ss-field-group">
            <label htmlFor="paymentMethod">{this.props.language === 'zh' ? '付款方式' : 'Payment Method'}</label>
            <div
              className={`ss-dropdown-wrap ${this.state.showPaymentMethodDropdown ? 'open' : ''}`}
              ref={this.paymentMethodDropdownRef}
            >
              <input
                type="text"
                id="paymentMethod"
                name="paymentMethod"
                value={paymentMethod}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showPaymentMethodDropdown')}
                placeholder={this.props.language === 'zh' ? '按付款方式筛选' : 'Filter by payment method'}
                autoComplete="off"
              />
              {showPaymentMethodDropdown && (
                <ul className="ss-options-list">
                  {filteredPaymentMethods.map((method, index) => (
                    <li
                      key={index}
                      onMouseDown={() => this.handleOptionSelect(method, 'showPaymentMethodDropdown')}
                    >
                      {method}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>

          {/*
          <div className="ss-field-group">
            <label htmlFor="collectionMode">{this.props.language === 'zh' ? '收集方式' : 'Collection Mode'}</label>
            <div
              className={`ss-dropdown-wrap ${showCollectionModeDropdown ? 'open' : ''}`}
              ref={this.collectionModeDropdownRef}
            >
              <input
                type="text"
                id="collectionMode"
                name="collectionMode"
                value={collectionMode}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showCollectionModeDropdown')}
                placeholder={this.props.language === 'zh' ? '按收集方式筛选' : 'Filter by collection mode'}
                autoComplete="off"
              />
              {showCollectionModeDropdown && (
                <ul className="ss-options-list">
                  {filteredCollectionModes.map((mode, index) => (
                    <li
                      key={index}
                      onMouseDown={() => this.handleOptionSelect(mode, 'showCollectionModeDropdown')}
                    >
                      {mode}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>
          */}

          <div className="ss-field-group">
            <label htmlFor="collectionLocation">{this.props.language === 'zh' ? '收集地点' : 'Collection Location'}</label>
            <div
              className={`ss-dropdown-wrap ${showCollectionLocationDropdown ? 'open' : ''}`}
              ref={this.collectionLocationDropdownRef}
            >
              <input
                type="text"
                id="collectionLocation"
                name="collectionLocation"
                value={collectionLocation}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showCollectionLocationDropdown')}
                placeholder={this.props.language === 'zh' ? '按收集地点筛选' : 'Filter by collection location'}
                autoComplete="off"
              />
              {showCollectionLocationDropdown && (
                <ul className="ss-options-list">
                  {filteredCollectionLocations.map((location, index) => (
                    <li
                      key={index}
                      onMouseDown={() => this.handleOptionSelect(location, 'showCollectionLocationDropdown')}
                    >
                      {location}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>

          <div className="ss-field-group">
            <label htmlFor="fundraisingStatus">{this.props.language === 'zh' ? '状态' : 'Status'}</label>
            <div
              className={`ss-dropdown-wrap ${showStatusDropdown ? 'open' : ''}`}
              ref={this.statusDropdownRef}
            >
              <input
                type="text"
                id="fundraisingStatus"
                name="fundraisingStatus"
                value={fundraisingStatus}
                onChange={this.handleChange}
                onClick={() => this.handleDropdownToggle('showStatusDropdown')}
                placeholder={this.props.language === 'zh' ? '按状态筛选' : 'Filter by status'}
                autoComplete="off"
              />
              {showStatusDropdown && (
                <ul className="ss-options-list">
                  {filteredFundraisingStatuses.map((status, index) => (
                    <li
                      key={index}
                      onMouseDown={() => this.handleOptionSelect(status, 'showStatusDropdown')}
                    >
                      {status}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down ss-chevron-icon"></i>
            </div>
          </div>

          <div className="ss-field-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="ss-search-wrap">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索...' : 'Search...'}
                autoComplete="off"
              />
              <i className="fas fa-search ss-magnifier-icon"></i>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
  );
  }
}
export default SearchSection;
