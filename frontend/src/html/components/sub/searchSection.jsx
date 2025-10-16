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
    searchQuery: '',
    centreLocation: '',
    language: '',
    status: '',
    courseType: '',
    course: '',
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
    filteredCoursesQuarters: [],
    showLocationDropdown: false,
    showLanguageDropdown: false,
    showTypeDropdown: false,
    showCourseDropdown: false,
    showAccountTypeDropdown: false,
    showQuarterDropdown: false,
    role: '',
    staffName: '',
    quarter: '',
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
    // Fundraising filter states
    paymentMethod: '',
    collectionMode: '',
    fundraisingStatus: '',
    fundraisingPaymentMethods: ['All Payment Methods'],
    fundraisingCollectionModes: ['All Collection Modes'],
    fundraisingStatuses: ['All Statuses'],
    filteredPaymentMethods: ['All Payment Methods'],
    filteredCollectionModes: ['All Collection Modes'],
    filteredFundraisingStatuses: ['All Statuses'],
    showPaymentMethodDropdown: false,
    showCollectionModeDropdown: false,
    showStatusDropdown: false,
  };
  this.locationDropdownRef = React.createRef();
  this.languageDropdownRef = React.createRef();
  this.accountTypeDropdownRef = React.createRef();
  this.typeDropdownRef = React.createRef();
  this.courseDropdownRef = React.createRef();
  this.quarterDropdownRef = React.createRef();
  this.attendanceTypeDropdownRef = React.createRef(); // Add this ref for the attendance type dropdown
  this.attendanceLocationDropdownRef = React.createRef(); // Add this ref for the attendance location dropdown
  this.activityCodeDropdownRef = React.createRef(); // Add this ref for the activity code dropdown
  this.membershipTypeDropdownRef = React.createRef(); // Add this ref for the membership type dropdown
  this.paymentMethodDropdownRef = React.createRef(); // Add this ref for the payment method dropdown
  this.collectionModeDropdownRef = React.createRef(); // Add this ref for the collection mode dropdown
  this.statusDropdownRef = React.createRef(); // Add this ref for the status dropdown
  this.searchInputRef = React.createRef(); // Make sure the search field has a ref
}


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
    else if (name === 'paymentMethod') {
      this.setState({
        filteredPaymentMethods: this.state.fundraisingPaymentMethods.filter(method =>
          method.toLowerCase().includes(value.toLowerCase())
        ),
        paymentMethod: value
      });
    }
    else if (name === 'collectionMode') {
      this.setState({
        filteredCollectionModes: this.state.fundraisingCollectionModes.filter(mode =>
          mode.toLowerCase().includes(value.toLowerCase())
        ),
        collectionMode: value
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

handleDropdownToggle = (dropdown) =>
{
  console.log("Dropdown:", dropdown);
  // Only toggle the requested dropdown, do not close the other
  if(dropdown === 'showLocationDropdown')
  {
    this.setState({ showLocationDropdown: true });
  }
  else if(dropdown === 'showLanguageDropdown')
    {
      this.setState({ showLanguageDropdown: true });
    }
    else if(dropdown === 'showTypeDropdown')
    {
        this.setState({ showTypeDropdown: true });
    }
    else if(dropdown === 'showCourseDropdown')
    {
        console.log("Show");
        this.setState({ showCourseDropdown: true });
    }
    else if(dropdown === 'showCourseQuarter')
    {
        console.log("Show");
        this.setState({ showQuarterDropdown: true });
    }
    else if(dropdown === 'showAccountTypeDropdown')
      {
        this.setState({ showAccountTypeDropdown: true });
    }
    else if(dropdown === 'showAttendanceTypeDropdown')
    {
      this.setState({ showAttendanceTypeDropdown: true });
    }
    else if(dropdown === 'showAttendanceLocationDropdown')
    {
      this.setState({ showAttendanceLocationDropdown: true });
    }
    else if(dropdown === 'showActivityCodeDropdown')
    {
      this.setState({ showActivityCodeDropdown: true });
    }
    else if(dropdown === 'showMembershipTypeDropdown')
    {
      this.setState({ showMembershipTypeDropdown: true });
    }
    else if(dropdown === 'showPaymentMethodDropdown')
    {
      console.log("Toggling payment method dropdown");
      this.setState({ showPaymentMethodDropdown: true });
    }
    else if(dropdown === 'showCollectionModeDropdown')
    {
      console.log("Toggling collection mode dropdown");
      this.setState({ showCollectionModeDropdown: true });
    }
    else if(dropdown === 'showStatusDropdown')
    {
      console.log("Toggling status dropdown");
      this.setState({ showStatusDropdown: true });
    }
}

handleOptionSelect = (value, dropdown) => {
  console.log("Selected value for filtered:", value, dropdown);
  const isMandarin = this.props.language === "zh"; 
  let updatedState = {};

    // Update state based on dropdown type
    if (dropdown === 'showLocationDropdown') {
      updatedState = {
        centreLocation: value,
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
    else if(dropdown === 'showCourseQuarter')
    {
        console.log("Show");
        updatedState = ({
          quarter: value,
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
    else if (dropdown === 'showPaymentMethodDropdown') {
      updatedState = {
        paymentMethod: value,
        showPaymentMethodDropdown: false,
        showCollectionModeDropdown: false,
        showStatusDropdown: false
      };
    }
    else if (dropdown === 'showCollectionModeDropdown') {
      updatedState = {
        collectionMode: value,
        showPaymentMethodDropdown: false,
        showCollectionModeDropdown: false,
        showStatusDropdown: false
      };
    }
    else if (dropdown === 'showStatusDropdown') {
      updatedState = {
        fundraisingStatus: value,
        showPaymentMethodDropdown: false,
        showCollectionModeDropdown: false,
        showStatusDropdown: false
      };
    }


    this.setState(updatedState, () => {
      console.log("Updated States:", updatedState, dropdown);
      // Notify parent with the updated state
      this.props.passSelectedValueToParent(updatedState, dropdown);
    });
}

handleClickOutside = (event) => {
  // Only close dropdowns if click is outside their respective refs
  if (
    this.locationDropdownRef.current &&
    !this.locationDropdownRef.current.contains(event.target) &&
    this.languageDropdownRef.current &&
    !this.languageDropdownRef.current.contains(event.target) &&  
    this.typeDropdownRef.current &&
    !this.typeDropdownRef.current.contains(event.target) &&
    this.courseDropdownRef.current &&
    !this.courseDropdownRef.current.contains(event.target) &&
    this.accountTypeDropdownRef.current &&
    !this.accountTypeDropdownRef.current.contains(event.target) &&
    this.quarterDropdownRef.current &&
    !this.quarterDropdownRef.current.contains(event.target) &&
    this.attendanceTypeDropdownRef.current &&
    !this.attendanceTypeDropdownRef.current.contains(event.target) &&
    this.attendanceLocationDropdownRef.current &&
    !this.attendanceLocationDropdownRef.current.contains(event.target) &&
    this.activityCodeDropdownRef.current &&
    !this.activityCodeDropdownRef.current.contains(event.target) &&
    this.membershipTypeDropdownRef.current &&
    !this.membershipTypeDropdownRef.current.contains(event.target) &&
    (!this.paymentMethodDropdownRef.current || !this.paymentMethodDropdownRef.current.contains(event.target)) &&
    (!this.collectionModeDropdownRef.current || !this.collectionModeDropdownRef.current.contains(event.target)) &&
    (!this.statusDropdownRef.current || !this.statusDropdownRef.current.contains(event.target))
  ) {
    this.setState({
      showLocationDropdown: false,
      showLanguageDropdown: false,
      showTypeDropdown: false,
      showAccountTypeDropdown: false,
      showCourseDropdown: false,
      showQuarterDropdown: false,
      showAttendanceTypeDropdown: false,
      showAttendanceLocationDropdown: false,
      showActivityCodeDropdown: false,
      showMembershipTypeDropdown: false,
      showPaymentMethodDropdown: false,
      showCollectionModeDropdown: false,
      showStatusDropdown: false
    });
  }

  if (
    this.attendanceTypeDropdownRef.current &&
    !this.attendanceTypeDropdownRef.current.contains(event.target)
  ) {
    this.setState({ showAttendanceTypeDropdown: false });
  }
  if (
    this.attendanceLocationDropdownRef &&
    this.attendanceLocationDropdownRef.current &&
    !this.attendanceLocationDropdownRef.current.contains(event.target)
  ) {
    this.setState({ showAttendanceLocationDropdown: false });
  }
  if (
    this.activityCodeDropdownRef &&
    this.activityCodeDropdownRef.current &&
    !this.activityCodeDropdownRef.current.contains(event.target)
  ) {
    this.setState({ showActivityCodeDropdown: false });
  }
  if (
    this.membershipTypeDropdownRef &&
    this.membershipTypeDropdownRef.current &&
    !this.membershipTypeDropdownRef.current.contains(event.target)
  ) {
    this.setState({ showMembershipTypeDropdown: false });
  }
  if (
    this.paymentMethodDropdownRef &&
    this.paymentMethodDropdownRef.current &&
    !this.paymentMethodDropdownRef.current.contains(event.target)
  ) {
    this.setState({ showPaymentMethodDropdown: false });
  }
  if (
    this.collectionModeDropdownRef &&
    this.collectionModeDropdownRef.current &&
    !this.collectionModeDropdownRef.current.contains(event.target)
  ) {
    this.setState({ showCollectionModeDropdown: false });
  }
  if (
    this.statusDropdownRef &&
    this.statusDropdownRef.current &&
    !this.statusDropdownRef.current.contains(event.target)
  ) {
    this.setState({ showStatusDropdown: false });
  }
};

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    this.updateUniqueLocationsLanguagesRolesTypes(this.props);
    
    // Initialize filtered activity codes
    this.setState({
      filteredActivityCodes: this.props.activityCodes || []
    });
    
    // Initialize membership types if available
    if (this.props.membershipTypes) {
      console.log('SearchSection componentDidMount: Initializing membership types:', this.props.membershipTypes);
      const membershipTypes = this.props.membershipTypes || ['All Types'];
      if (!membershipTypes.includes('All Types')) {
        membershipTypes.unshift('All Types');
      }
      
      this.setState({
        membershipTypes: membershipTypes,
        filteredMembershipTypes: membershipTypes
      });
    }

    // Initialize fundraising filter options if available
    if (this.props.fundraisingPaymentMethods) {
      const paymentMethods = this.props.fundraisingPaymentMethods || ['All Payment Methods'];
      this.setState({
        fundraisingPaymentMethods: paymentMethods,
        filteredPaymentMethods: paymentMethods
      });
    }
    
    if (this.props.fundraisingCollectionModes) {
      const collectionModes = this.props.fundraisingCollectionModes || ['All Collection Modes'];
      this.setState({
        fundraisingCollectionModes: collectionModes,
        filteredCollectionModes: collectionModes
      });
    }
    
    if (this.props.fundraisingStatuses) {
      const statuses = this.props.fundraisingStatuses || ['All Statuses'];
      this.setState({
        fundraisingStatuses: statuses,
        filteredFundraisingStatuses: statuses
      });
    }
  }

  componentDidUpdate(prevProps) {
    console.log("Update:", this.props);  
    if ((this.props.resetSearch && prevProps.resetSearch !== this.props.resetSearch)) {
      this.setState({
        searchQuery: '',
        centreLocation: '',
        language: '',
        role: '',
        courseName: '',
        quarter: '',
        paymentMethod: '',
        collectionMode: '',
        fundraisingStatus: '',
        showLocationDropdown: false,
        showLanguageDropdown: false,
        showTypeDropdown: false,
        showAccountTypeDropdown: false,
        showCourseDropdown: false,
        showQuarterDropdown: false,
        showPaymentMethodDropdown: false,
        showCollectionModeDropdown: false,
        showStatusDropdown: false
      });
    }
  
    if (this.props.locations !== prevProps.locations) {
      const uniqueLocations = ["All Locations", ...new Set(this.props.locations)];
      this.setState({
        locations: uniqueLocations,
        filteredLocations: uniqueLocations
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
      const uniqueTypes = ["All Courses Types", ...new Set(this.props.types)];
      this.setState({
        types: uniqueTypes,
        filteredTypes: uniqueTypes
      }); 
    }  

    if (this.props.courses !== prevProps.courses) {
      const uniqueCoursesName = ["All Courses Name", ...new Set(this.props.courses)];
      this.setState({
        coursesName: uniqueCoursesName,
        filteredCoursesName: uniqueCoursesName
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
      this.setState({
        quarters: uniqueQuarters,
        filteredQuarters: uniqueQuarters
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
  const uniqueRoles = ["All Roles", ...new Set(props.roles)];
  const uniqueLocations = ["All Locations", ...new Set(props.locations)];
  const uniqueLanguages = ["All Languages", ...new Set(props.languages)];
  const uniqueTypes = ["All Courses Type", ...new Set(props.types)];
  const uniqueCoursesName = ["All Courses Name", ...new Set(props.courses)];
  const uniqueCoursesQuarters = ["All Courses Quarters", ...new Set(props.quarters)];
  console.log("Props:", props);
  console.log("Unique: ", uniqueCoursesQuarters); 

  this.setState({
    locations: uniqueLocations,
    filteredLocations: uniqueLocations,
    languages: this.translateLanguages(uniqueLanguages), // Translate if necessary
    filteredLanguages: this.translateLanguages(uniqueLanguages), // Translate if necessary
    types: uniqueTypes, // Translate if necessary
    filteredTypes: uniqueTypes, // Translate if 
    roles: uniqueRoles, 
    filteredRoles: uniqueRoles,
    quarters: uniqueCoursesQuarters, 
    filteredQuarters: uniqueCoursesQuarters,
    filteredCoursesName: this.translateLanguages(uniqueCoursesName), // Translate if necessary
    filteredActivityCodes: props.activityCodes || [] // Initialize filtered activity codes
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
  document.removeEventListener('mousedown', this.handleClickOutside);
}

  
render() 
{
  const { membershipType, showNameDropdown, typename, filteredName, staffName, searchQuery, centreLocation, language, quarter, courseQuarters, filteredQuarters, filteredLocations, filteredLanguages, filteredTypes, showLocationDropdown, showLanguageDropdown, showTypeDropdown, courseType, showAccountTypeDropdown, role, roles, filteredRoles, coursesName, showCourseDropdown, filteredCoursesName, courseName, showQuarterDropdown, paymentMethod, collectionMode, fundraisingStatus, filteredPaymentMethods, filteredCollectionModes, filteredFundraisingStatuses, showPaymentMethodDropdown, showCollectionModeDropdown, showStatusDropdown } = this.state;
  const { section } = this.props; // Destructure section from props

  console.log("Course Name List:", this.state);
  console.log("Section:", section);
  return (
  <div className="filter-section"> {/* Same class name for both sections */}
    <div className="form-group-row" >
      {section === "accounts" && ( // Content for "registration"
        <>
        <div className="form-group">
            <label htmlFor="accountType">{this.props.language === 'zh' ? '' : 'Account Type'}</label>
            <div
              className={`dropdown-container ${showAccountTypeDropdown ? 'open' : ''}`}
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
                <ul className="dropdown-list">
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>
            <div className="form-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="search-container">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search search-icon"></i>
            </div>
          </div>
        </>            
      )}

      {section === "courses" && ( // Content for "courses"
        <>
          <div className="form-group">
            <label htmlFor="centreLocation">{this.props.language === 'zh' ? '中心位置' : 'Locations'}</label>
            <div
              className={`dropdown-container ${showLocationDropdown ? 'open' : ''}`}
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
                <ul className="dropdown-list">
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="search-container">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search search-icon"></i>
            </div>
          </div>
        </>
      )}
      
      {section === "registration" &&  ( // Content for "registration"
        <>
        <div className="form-group">
              <label htmlFor="courseType">{this.props.language === 'zh' ? '' : 'Type'}</label>
              <div
                className={`dropdown-container ${showTypeDropdown ? 'open' : ''}`}
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
                  <ul className="dropdown-list">
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
                <i className="fas fa-angle-down dropdown-icon"></i>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="centreLocation">{this.props.language === 'zh' ? '中心位置' : 'Locations'}</label>
              <div
                className={`dropdown-container ${showLocationDropdown ? 'open' : ''}`}
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
                  <ul className="dropdown-list">
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
                <i className="fas fa-angle-down dropdown-icon"></i>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="courseQuarter">{this.props.language === 'zh' ? '中心位置' : 'Quarter Year'}</label>
              <div
                className={`dropdown-container ${showLocationDropdown ? 'open' : ''}`}
                ref={this.quarterDropdownRef}
              >
                <input
                  type="text"
                  id="quarter"
                  name="quarter"
                  value={quarter}
                  onChange={this.handleChange}
                  onClick={() => this.handleDropdownToggle('showCourseQuarter')}
                  placeholder={this.props.language === 'zh' ? '按地点筛选' : 'Filter by course quarter'}
                  autoComplete="off"
                />
                {showQuarterDropdown && (
                  <ul className="dropdown-list">
                    {filteredQuarters.map((quarter, index) => (
                      <li
                        key={index}
                        onClick={() => this.handleOptionSelect(quarter, 'showCourseQuarter')}
                      >
                        {quarter}
                      </li>
                    ))}
                  </ul>
                )}
                <i className="fas fa-angle-down dropdown-icon"></i>
              </div>
            </div>
            <div className="form-group">
            <label htmlFor="course">{this.props.language === 'zh' ? '': 'Course'}</label>
            <div
              className={`dropdown-container ${showCourseDropdown ? 'open' : ''}`}
              ref={this.courseDropdownRef}
            >
            <input
              type="text"
              id="courseName"
              name="courseName"
              value={courseName} // Show only the first selected course or empty string
              onChange={this.handleChange}
              onClick={() => this.handleDropdownToggle('showCourseDropdown')}
              placeholder={this.props.language === 'zh' ? '' : 'Filter by course'}
              autoComplete="off"
            />
              {showCourseDropdown && (
                <ul className="dropdown-list">
                  {filteredCoursesName.map((name, index) => (
                    <li
                      key={index}
                      onClick={() => this.handleOptionSelect(name, 'showCourseDropdown')}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
            </div>
            <div className="form-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="search-container">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search search-icon"></i>
            </div>
          </div>
        </>            
      )}

      {section === "attendance" && (
        <>
          <div className="form-group">
            <label htmlFor="attendanceType">{this.props.language === 'zh' ? '类型' : 'Type'}</label>
            <div
              className={`dropdown-container ${this.state.showAttendanceTypeDropdown ? 'open' : ''}`}
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
                <ul className="dropdown-list">
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="attendanceLocation">{this.props.language === 'zh' ? '地点' : 'Location'}</label>
            <div
              className={`dropdown-container ${this.state.showAttendanceLocationDropdown ? 'open' : ''}`}
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
                <ul className="dropdown-list">
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="activityCode">{this.props.language === 'zh' ? '活动代码' : 'Activity Code'}</label>
            <div  className={`dropdown-container ${this.state.showActivityCodeDropdown ? 'open' : ''}`} style={{ position: 'relative' }} ref={this.activityCodeDropdownRef}>
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
                <ul className="dropdown-list" style={{ position: 'absolute', zIndex: 10, width: '100%' }}>
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="search-container">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索' : 'Search'}
                autoComplete="off"
              />
              <i className="fas fa-search search-icon"></i>
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
          <div className="form-group">
            <label htmlFor="membershipType">{this.props.language === 'zh' ? '会员类型' : 'Membership Type'}</label>
            <div
              className={`dropdown-container ${this.state.showMembershipTypeDropdown ? 'open' : ''}`}
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
                <ul className="dropdown-list">
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="search-container">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索会员' : 'Search membership'}
                autoComplete="off"
              />
              <i className="fas fa-search search-icon"></i>
            </div>
          </div>
        </>
      )}

      {section === "fundraising-table" && (
        <>
          <div className="form-group">
            <label htmlFor="paymentMethod">{this.props.language === 'zh' ? '付款方式' : 'Payment Method'}</label>
            <div
              className={`dropdown-container ${this.state.showPaymentMethodDropdown ? 'open' : ''}`}
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
                <ul className="dropdown-list">
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="collectionMode">{this.props.language === 'zh' ? '收集方式' : 'Collection Mode'}</label>
            <div
              className={`dropdown-container ${showCollectionModeDropdown ? 'open' : ''}`}
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
                <ul className="dropdown-list">
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fundraisingStatus">{this.props.language === 'zh' ? '状态' : 'Status'}</label>
            <div
              className={`dropdown-container ${showStatusDropdown ? 'open' : ''}`}
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
                <ul className="dropdown-list">
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
              <i className="fas fa-angle-down dropdown-icon"></i>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="searchQuery">{this.props.language === 'zh' ? '搜寻' : 'Search'}</label>
            <div className="search-container">
              <input
                type="text"
                id="searchQuery"
                name="searchQuery"
                value={searchQuery}
                onChange={this.handleChange}
                placeholder={this.props.language === 'zh' ? '搜索...' : 'Search...'}
                autoComplete="off"
              />
              <i className="fas fa-search search-icon"></i>
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
