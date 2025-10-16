import React, { Component } from 'react';
  import { withRouter } from 'react-router-dom';
  import '../../css/homePage.css'; // Ensure your CSS paths are correct
  import AccountsSection from './sub/accountsSection';
  import CoursesSection from './sub/courseSection';
  import RegistrationPaymentSection from './sub/registrationPaymentSection';
  import Popup from './popup/popupMessage';
  import Search from './sub/searchSection';
  import ViewToggle from './sub/viewToggleSection';
  import CreateAccountsSection from './sub/createAccountsSection';
  import ReceiptSection from './sub/receiptSection';
  import SideBarContent from './sub/sideBarContent';
  import DashboardSection from './sub/dashboardSection';
  import AttendanceSection from './sub/AttendanceSection';
  import MembershipSection from './sub/MembershipSection';
  import FitnessSection from './sub/FitnessSection';
  import FundraisingTable from './sub/FundraisingTable';
  import FundraisingInventory from './sub/FundraisingInventory';
  import ReportSection from './sub/reportSection';
  import WelcomeSection from './sub/welcomeSection';
  import { withAuth } from '../../AuthContext';
  import axios from 'axios';  


  class HomePage extends Component {
    constructor(props) {
      super(props);

      const savedState = localStorage.getItem('myComponentState');
      var initialState = savedState ? JSON.parse(savedState) : {
        submenuVisible: null,
        language: 'en',
        courseType: null,
        isPopupOpen: false,
        popupMessage: '',
        popupType: '',
        sidebarVisible: false,
        locations: [],
        languages: [],
        types: [],
        names: [],
        status: '',
        selectedCourseLanguage: '',
        selectedCourseLocation: '',
        selectedCourseType: '',
        selectedCourseName: '',
        courseSearchQuery: '',
        selectedRegPaymentLanguage: '',
        selectedRegPaymentLocation: '',
        selectedQuarter: '',
        regPaymentSearchQuery: '',
        resetSearch: false,
        currentPage: 1,
        courseInfo: {},
        entriesPerPage: 100000000000,
        totalPages: 1,
        nofCourses: 0,
        noofDetails: 0,
        nofAccounts: 0,
        viewMode: 'full',
        isRegistrationPaymentVisible: false,
        isMembershipVisible: false,
        section: '',
        accountType: null,
        roles: [],
        createAccount: false,
        displayedName: '',
        isDropdownOpen: false,
        isReceiptVisible: false,
        attendanceVisibility: false,
        item: '',
        isInactive: false,
        refreshKey: 0,
        dashboard: false,
        deleteId: "",
        reportVisibility: false,
        reportType: "",
        quarters: [],
        attendanceFilterType: 'All Types',
        attendanceFilterCode: 'All Codes',
        attendanceFilterLocation: 'All Locations',
        attendanceSearchQuery: '',
        attendanceTypes: [],
        activityCodes: [],
        attendanceLocations: [],
        membershipTypes: ['All Types'],
        membershipType: 'All Types',
        membershipSearchQuery: '',
        searchQuery: '',
        resetMembershipTable: false,
        isFitnessVisible: false,
        fitnessSearchQuery: '',
        isFundraisingTableVisible: false,
        isFundraisingInventoryVisible: false,
        fundraisingSearchQuery: '',
        fundraisingPaymentMethod: 'All Payment Methods',
        fundraisingCollectionMode: 'All Collection Modes',
        fundraisingStatus: 'All Statuses',
        fundraisingPaymentMethods: [],
        fundraisingCollectionModes: [],
        fundraisingStatuses: [],
        accessRights: {} // Access rights from sidebar
      };
  
      // Always reset attendance filter/search state to defaults on page load
      initialState.attendanceFilterType = 'All Types';
      initialState.attendanceFilterCode = 'All Codes';
      initialState.attendanceFilterLocation = 'All Locations';
      initialState.attendanceSearchQuery = '';

      // Set the initial state
      this.state = initialState;

      this.handleDataFromChild = this.handleDataFromChild.bind(this);
      this.searchResultFromChild = this.searchResultFromChild.bind(this);
      this.handleSelectFromChild = this.handleSelectFromChild.bind(this);
      this.handleRegPaymentSelectFromChild = this.handleRegPaymentSelectFromChild.bind(this);
      this.handleRegPaymentSearchFromChild = this.handleRegPaymentSearchFromChild.bind(this);
      this.handleMembershipSelectFromChild = this.handleMembershipSelectFromChild.bind(this);
      this.handleMembershipSearchFromChild = this.handleMembershipSearchFromChild.bind(this);
      this.handleFitnessSearchFromChild = this.handleFitnessSearchFromChild.bind(this);
      this.handleFundraisingSearchFromChild = this.handleFundraisingSearchFromChild.bind(this);
      this.handlePageChange = this.handlePageChange.bind(this);
      this.toggleViewMode = this.toggleViewMode.bind(this); 
      this.toggleRegistrationPaymentComponent = this.toggleRegistrationPaymentComponent.bind(this);
      this.createAccountPopupMessage = this.createAccountPopupMessage.bind(this);
      this.inactivityTimeout = null;
      this.editAccountPopupMessage = this.editAccountPopupMessage.bind(this);
    }

    handleRefreshMembership = () => {
  // First reset the state values
  this.setState({
    membershipType: 'All Types',
    membershipSearchQuery: '',
    searchQuery: '',
    resetMembershipTable: true,
    // Add this to trigger the general search reset mechanism too
    resetSearch: true
  }, () => {
    // After state is updated, reset the search component's UI state
    this.setState({
      resetSearch: false
    });
  });
};

    // Function to handle data passed from the child
    handleDataFromChild = async (filter1, filter2, filter3, filter4) => {
      var {section} = this.state;
      console.log("Current Sections123:", section);
      console.log("Received filters:", { filter1, filter2, filter3, filter4 });
      
      if(section === "courses") {
        const filterLanguages = new Set(filter1);
        const filterLocations = new Set(filter2);
    
        this.setState({
          locations: Array.from(filterLanguages),
          languages: Array.from(filterLocations)
        });
      }
      else if(section === "membership") {
        // Handle membership data - filter1 should be the membership types array
        console.log("Processing membership types:", filter1);
        console.log("Type of filter1:", typeof filter1, Array.isArray(filter1));
        
        if (Array.isArray(filter1)) {
          const filterMembersType = new Set(filter1);
          console.log("Unique membership types:", Array.from(filterMembersType));
          this.setState({
            types: Array.from(filterMembersType),
            membershipTypes: ['All Types', ...Array.from(filterMembersType)] // Add 'All Types' as default
          }, () => {
            console.log("HomePage state updated with membership types:", this.state.membershipTypes);
          });
        } else {
          console.warn("Expected array for membership types, received:", typeof filter1, filter1);
        }
      }
      else if(section === "registration") {
        const filterLocations = new Set(filter1);
        const filterType = new Set(filter2);
        const filterCourse = new Set(filter3);
        const filterQuarters = new Set(filter4);
        console.log("Filter Course:", filterCourse);
        this.setState({
          locations: Array.from(filterLocations),
          types: Array.from(filterType),
          names: Array.from(filterCourse),
          quarters: Array.from(filterQuarters)
        });
      }
      else if(section === "accounts") {
        var filterRoles = new Set(filter1);
        this.setState({
          roles: Array.from(filterRoles)
        });
      }
    }
    
    handleSelectFromChild = async (updateState, dropdown) => {
      console.log("Selected Data:", updateState, dropdown);
      var {section} = this.state;
      if(section === "courses")
      {
        if (dropdown === "showLanguageDropdown") {
          this.setState({
            selectedLanguage: updateState.language
          });
        }
        else if (dropdown === "showLocationDropdown") {
          this.setState({
            selectedLocation: updateState.centreLocation
          });
        }
        else if(dropdown === "showTypeDropdown")
        {
          this.setState({
            selectedLocation: updateState.centreLocation
          });
        }
      }
      else if(section === "accounts")
      {
        if(dropdown === "showAccountTypeDropdown")
        {
          this.setState({
            selectedAccountType: updateState.role
          });
        }
      }
    }

    // Handle selection for registration payments
    handleRegPaymentSelectFromChild = async (updateState, dropdown) => 
    {
      console.log("Selected Data (Registration Payment):", updateState, dropdown);
      if(updateState.centreLocation)
      {
        this.setState({
          selectedLocation: updateState.centreLocation
        });
      }
      else if(updateState.courseType)
      {
        this.setState({
          selectedCourseType: updateState.courseType
        });
      }
      else if(updateState.courseName)
      {
        console.log("Hello");
        this.setState({
          selectedCourseName: updateState.courseName
        });
      }
      else if(updateState.quarter)
      {
        console.log("Hello");
        this.setState({
          selectedQuarter: updateState.quarter
        });
      }
    }

    toggleReportComponent = async(reportType) =>
    {
      try 
      {
          this.setState({ resetSearch: true, }, () => {
            this.setState({ resetSearch: false });
          });
    
         
          this.setState({
            courseType: null,
            sidebarVisible: false,
            isRegistrationPaymentVisible: false,
            section: "",
            accountType: null,
            createAccount: false,
            reportVisibility: true, 
            reportType: reportType,
            attendanceVisibility: false,
            isMembershipVisible: false,
            isFitnessVisible: false, // Added this
            isFundraisingTableVisible: false
          });
      } 
      catch (error) 
      {
        console.log(error);
      }
    }

    toggleAttendanceComponent = async(attendanceType) =>
    {
      try 
      {
          this.setState({ resetSearch: true, }, () => {
            this.setState({ resetSearch: false });
          });

      
          // First show loading popup
          this.setState({
            isPopupOpen: true,
            popupMessage: "Loading Attendance",
            popupType: "loading",
          }, () => {
            // After loading popup is shown, update the visibility states
            this.setState({
              courseType: null,
              sidebarVisible: false,
              isRegistrationPaymentVisible: false,
              isReceiptVisible: false, // Added this - was missing
              section: "attendance", // Set section name
              accountType: null,
              createAccount: false,
              reportVisibility: false,
              dashboard: false, // Added this - was missing
              attendanceVisibility: true,
              attendanceType: attendanceType,  // Added parameter to store attendance type,
              isMembershipVisible: false,
              isFitnessVisible: false,
              isFundraisingTableVisible: false
            });
          });
      } 
      catch (error) 
      {
        console.log(error);
        // Show error message
        this.setState({
          isPopupOpen: true,
          popupMessage: "Error loading attendance view",
          popupType: "error-message"
        });
      }
    }

    toggleMembershipComponent= async() =>
    {
      try 
      {
          // Reset search and filters
          this.setState({ resetSearch: true, }, () => {
            this.setState({ resetSearch: false });
          });
    
      
          // First show loading popup
          this.setState({
            isPopupOpen: true,
            popupMessage: "Loading Membership",
            popupType: "loading",
          }, () => {
            // After loading popup is shown, update the visibility states and reset membership filters
            this.setState({
              courseType: null,
              sidebarVisible: false,
              isRegistrationPaymentVisible: false,
              isReceiptVisible: false,
              section: "membership", // Set section name
              accountType: null,
              createAccount: false,
              reportVisibility: false,
              dashboard: false,
              attendanceVisibility: false,
              attendanceType: "",
              isMembershipVisible: true,
              isFitnessVisible: false, // Added this
              isFundraisingTableVisible: false,
              // Reset membership filtering state
              membershipType: 'All Types',
              membershipSearchQuery: '',
              searchQuery: '',
              membershipTypes: ['All Types'] // Reset to default, will be populated when data loads
            });
          });
      } 
      catch (error) 
      {
        console.log(error);
        // Show error message
        this.setState({
          isPopupOpen: true,
          popupMessage: "Error loading membership view",
          popupType: "error-message"
        });
      }
    }

    toggleFitnessComponent = async() => {
      console.log("toggleFitnessComponent called - starting fitness navigation");
      try {
        // Reset search and filters
        this.setState({ resetSearch: true, }, () => {
          this.setState({ resetSearch: false });
        });
    
        console.log("Showing loading popup for fitness module");
        // First show loading popup
        this.setState({
          isPopupOpen: true,
          popupMessage: "Loading Fitness Module",
          popupType: "loading",
        }, () => {
          console.log("Setting fitness visibility states");
          // After loading popup is shown, update the visibility states
          this.setState({
            // Explicitly set ALL other visibility flags to false
            courseType: null,
            accountType: null,
            createAccount: false,
            dashboard: false,
            isRegistrationPaymentVisible: false,
            isReceiptVisible: false,
            reportVisibility: false,
            attendanceVisibility: false,
            isMembershipVisible: false,
            
            // Set ONLY fitness to true
            isFitnessVisible: true,
            isFundraisingTableVisible: false,
            
            // Reset other states
            sidebarVisible: false,
            section: "fitness",
            attendanceType: "",
            
            // Reset fitness filtering state
            fitnessSearchQuery: '',
            searchQuery: ''
          }, () => {
            console.log("Fitness module state updated successfully - isFitnessVisible:", this.state.isFitnessVisible);
            console.log("All other visibility flags should be false:");
            console.log("- courseType:", this.state.courseType);
            console.log("- accountType:", this.state.accountType);
            console.log("- createAccount:", this.state.createAccount);
            console.log("- dashboard:", this.state.dashboard);
            console.log("- isRegistrationPaymentVisible:", this.state.isRegistrationPaymentVisible);
            console.log("- isReceiptVisible:", this.state.isReceiptVisible);
            console.log("- reportVisibility:", this.state.reportVisibility);
            console.log("- attendanceVisibility:", this.state.attendanceVisibility);
            console.log("- isMembershipVisible:", this.state.isMembershipVisible);
          });
        });
      } 
      catch (error) {
        console.log("Error in toggleFitnessComponent:", error);
        // Show error message
        this.setState({
          isPopupOpen: true,
          popupMessage: "Error loading fitness module",
          popupType: "error-message"
        });
      }
    }

    toggleFundraisingTableComponent = async() => {
      console.log("toggleFundraisingTableComponent called - showing fundraising table only");
      try {
        // Reset search and filters
        this.setState({ resetSearch: true, }, () => {
          this.setState({ resetSearch: false });
        });

        this.setState({
          // Explicitly set ALL other visibility flags to false
          courseType: null,
          accountType: null,
          createAccount: false,
          dashboard: false,
          isRegistrationPaymentVisible: false,
          isReceiptVisible: false,
          reportVisibility: false,
          attendanceVisibility: false,
          isMembershipVisible: false,
          isFitnessVisible: false,
          
          // Set table-only mode
          isFundraisingTableVisible: true,
          
          // Popup settings
          isPopupOpen: true,
          popupMessage: "Loading Fundraising Table",
          popupType: "loading",
          
          // Reset other states
          sidebarVisible: false,
          section: "fundraising-table",
          attendanceType: "",
          
          // Reset fundraising filtering state
          fundraisingSearchQuery: '',
          searchQuery: ''
        });
      } 
      catch (error) {
        console.log("Error in toggleFundraisingTableComponent:", error);
        // Show error message
        this.setState({
          isPopupOpen: true,
          popupMessage: "Error loading fundraising table",
          popupType: "error-message"
        });
      }
    }

    toggleFundraisingInventoryComponent = async() => {
      console.log("toggleFundraisingInventoryComponent called - showing fundraising inventory only");
      try {
        // Reset search and filters
        this.setState({ resetSearch: true, }, () => {
          this.setState({ resetSearch: false });
        });

        this.setState({
          // Explicitly set ALL other visibility flags to false
          courseType: null,
          accountType: null,
          createAccount: false,
          dashboard: false,
          isRegistrationPaymentVisible: false,
          isReceiptVisible: false,
          reportVisibility: false,
          attendanceVisibility: false,
          isMembershipVisible: false,
          isFitnessVisible: false,
          isFundraisingTableVisible: false,
          
          // Set inventory-only mode
          isFundraisingInventoryVisible: true,
          
          // Popup settings
          isPopupOpen: true,
          popupMessage: "Loading Fundraising Inventory",
          popupType: "loading",
          
          // Reset other states
          sidebarVisible: false,
          section: "fundraising-inventory",
          attendanceType: "",
          
          // Reset search state
          fundraisingSearchQuery: '',
          searchQuery: ''
        });
      } 
      catch (error) {
        console.log("Error in toggleFundraisingInventoryComponent:", error);
        // Show error message
        this.setState({
          isPopupOpen: true,
          popupMessage: "Error loading fundraising inventory",
          popupType: "error-message"
        });
      }
    }

    // Handle selection for registration payments
    handleRegPaymentSearchFromChild = async (data) => {
      this.setState({
        searchQuery: data
      });
    }


    searchResultFromChild = async (value) => {
     
      //console.log("Search Result:", value);
      this.setState({
        searchQuery: value
      });
    }

      // Search results for registration payments
      searchRegPaymentResultFromChild = async (value) => {
        console.log("Registration Payment Search Result:", value);
        this.setState({
          regPaymentSearchQuery: value
        });
      }


      toggleSubMenu = (index) => {
        this.setState((prevState) => ({
          submenuVisible: prevState.submenuVisible === index ? null : index
        }));
        //this.setState({viewMode: "full"});
      };

    toggleLanguage = () => {
      this.setState((prevState) => {
        const newLanguage = prevState.language === 'en' ? 'zh' : 'en';
        return {
          language: newLanguage
        };
      });
    };

    handleMouseLeave = () => {
      this.setState({ submenuVisible: null });
    };

    toggleSidebar = () => {
      this.setState((prevState) => ({
        sidebarVisible: !prevState.sidebarVisible
      }));
    };

    toggleCourseComponent = async (courseType) => {
      try {
        this.setState({ resetSearch: true, }, () => {
          this.setState({ resetSearch: false });
        });
    
        this.setState({
          isPopupOpen: true,
          popupMessage: "Loading In Progress",
          popupType: "loading",
          courseType: courseType,
          sidebarVisible: false,
          isRegistrationPaymentVisible: false ,
          section: "courses",
          accountType: "",
          createAccount: false,
          isReceiptVisible: false,
          reportVisibility: false,
          isMembershipVisible: false,
          isFitnessVisible: false, // Added this
          isFundraisingTableVisible: false
        });
      } catch (error) {
        console.log(error);
      }
    };

    componentDidMount = async () => {
      // Start the inactivity detection timeout
      //sessionStorage.clear();
      this.resetInactivity();
      // Adding event listeners to reset inactivity
      window.addEventListener('mousemove', this.resetInactivity);
      window.addEventListener('keypress', this.resetInactivity);
      window.addEventListener('click', this.resetInactivity);
      window.addEventListener('scroll', this.resetInactivity);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    // Add componentDidUpdate for state persistence
    componentDidUpdate(prevProps, prevState) {
      // Save state to localStorage whenever it changes (excluding certain volatile properties)
      const statesToSave = {
        ...this.state,
        // Exclude volatile/temporary states that shouldn't be persisted
        isPopupOpen: false,
        popupMessage: '',
        popupType: '',
        loading: false
      };
      localStorage.setItem('myComponentState', JSON.stringify(statesToSave));

      // Trigger child refresh after state is reset
      if (this.state.resetMembershipTable && !prevState.resetMembershipTable) {
        if (this.membershipSectionRef.current) {
          this.membershipSectionRef.current.refreshMembershipData();
        }
        this.setState({ resetMembershipTable: false });
      }
    }

    handleBeforeUnload = (event) => {
      // Save the current state to local storage before the page unloads
      localStorage.setItem('myComponentState', JSON.stringify(this.state));

      // Show a warning dialog when the user tries to refresh or close the page
     event.preventDefault();
     // event.returnValue = ''; // Trigger the confirmation dialog
    };
  
    componentWillUnmount() {
      // Cleanup the timeout and event listeners
      clearTimeout(this.inactivityTimeout); // Clear any existing timeouts
      window.removeEventListener('mousemove', this.resetInactivity);
      window.removeEventListener('keypress', this.resetInactivity);
      window.removeEventListener('click', this.resetInactivity);
      window.removeEventListener('scroll', this.resetInactivity);
     window.removeEventListener('beforeunload', this.handleBeforeUnload);
     localStorage.removeItem('myComponentState');
    }

    toggleDashboardComponent = () => {  // Removed async since it's not needed
      try {
        console.log("Dashboard Page");
        
        // Set the loading popup first
        this.setState({
          isPopupOpen: true,
          popupMessage: "Loading Dashboard",
          popupType: "loading",
        }, () => {
          // After the popup is shown, reset all component visibility flags
          this.setState({
            // Reset all section visibility flags
            courseType: null,
            sidebarVisible: false,
            isRegistrationPaymentVisible: false,
            isReceiptVisible: false,  // Added this - was missing
            section: "",
            accountType: null,
            createAccount: false,
            reportVisibility: false,
            attendanceVisibility: false,
            isMembershipVisible: false,
            isFitnessVisible: false, // Added this
            isFundraisingTableVisible: false,
            
            // Set dashboard to true
            dashboard: true,
            
            // Reset search state in a single operation
            resetSearch: false
          });
        });
      } catch (error) {
        console.log(error);
        // Consider showing an error message to the user
        this.setState({
          isPopupOpen: true,
          popupMessage: "Error loading dashboard",
          popupType: "error-message"
        });
      }
    };

    toggleAccountsComponent = async (accountType) => 
    {
      try 
      {
        if(accountType !== "Create Account")
        { 
          this.setState({ resetSearch: true, }, () => {
            this.setState({ resetSearch: false });
          });
    
          console.log("Account Type:", accountType);
    
          this.setState({
            isPopupOpen: true,
            popupMessage: "Loading In Progress",
            popupType: "loading",
            courseType: "",
            sidebarVisible: false,
            isRegistrationPaymentVisible: false ,
            section: "accounts",
            accountType: accountType,
            createAccount: false,
            reportVisibility: false,
            attendanceVisibility: false,
            isMembershipVisible: false,
            isFitnessVisible: false, // Added this
            isFundraisingTableVisible: false
          });
        }
        else
        {
          this.setState({
            isPopupOpen: true,
            popupMessage: "Loading In Progress",
            popupType: "loading",
            courseType: "",
            sidebarVisible: false,
            isRegistrationPaymentVisible: false ,
            section: "accounts",
            accountType: null,
            createAccount: true,
            reportVisibility: false,
            attendanceVisibility: false,
            isMembershipVisible: false,
            isFitnessVisible: false, // Added this
            isFundraisingTableVisible: false
          });
        }
      } 
      catch (error) 
      {
        console.log(error);
      }
    };


    toggleViewMode(mode) {
      var {section} = this.state;
      console.log("Toggle View Mode:", section);
      this.setState({ viewMode: mode });
      if (mode === 'full') 
      {
        if(section === "courses")
        {
          this.handleEntriesPerPageChange(this.state.nofCourses); // Reset table data when switching to full view
        }
        else if(section === "registration")
        {
          this.handleEntriesPerPageChange(this.state.noofDetails);
        }
        else if(section === "accounts")
        {
          this.handleEntriesPerPageChange(this.state.nofAccounts);
        }
      }
    }

    closePopup = () => {
      this.setState({
        isPopupOpen: false,
        popupMessage: '',
        popupType: '',
      });
    };

    closePopup2 = () => {
      // Open the popup with success message
      this.setState({
        isPopupOpen: true,  // Set popup to open
        popupMessage: "You have updated the entry successfully",  // Success message
        popupType: "success-message"  // Type of popup message
      });

      // Set timeout to close the popup after 5 seconds
      setTimeout(() => {
        this.setState({ 
          isPopupOpen: false  // Close the popup
        });
        this.refreshChild();  // Refresh or call any child method if needed
      }, 5000);  // 15 mins
    };

    closePopup3 = () => {
      // Open the popup with success message
      this.setState({
        isPopupOpen: true,  // Set popup to open
        popupMessage: "You have deleted the entry successfully",  // Success message
        popupType: "success-message"  // Type of popup message
      });

      // Set timeout to close the popup after 5 seconds
      setTimeout(() => {
        this.setState({ 
          isPopupOpen: false  // Close the popup
        });
      }, 5000);  // 15 mins
    };

    closePopup4 = () => {
      // Open the popup with success message
      this.setState({
        isPopupOpen: true,  // Set popup to open
        popupMessage: "You have send the payment advice message successfully",  // Success message
        popupType: "success-message"  // Type of popup message
      });

      // Set timeout to close the popup after 5 seconds
      setTimeout(() => {
        this.setState({ 
          isPopupOpen: false  // Close the popup
        });
      }, 5000);  // 15 mins
    };

    closePopup5 = () => {
      // Open the popup with success message
      this.setState({
        isPopupOpen: true,  // Set popup to open
        popupMessage: "You have port over the participants successfully",  // Success message
        popupType: "success-message"  // Type of popup message
      });

      // Set timeout to close the popup after 5 seconds
      setTimeout(() => {
        this.setState({ 
          isPopupOpen: false  // Close the popup
        });
      }, 5000);  // 15 mins
    };

    generateDeleteConfirmationPopup = (id) => {
      console.log("ID deleted:", id);
      this.setState({
        isPopupOpen: true,
        popupMessage: `Are you sure you want to delete this participant?`, // You can customize this based on your data
        popupType: "delete", // You can use this to style it differently if needed
        deleteId: id, // Store the row data to handle the deletion later
      });
    };

    generateSendDetailsConfirmationPopup = (id) => 
    {
        this.setState({
          isPopupOpen: true,
          popupMessage: `Are you sure you have send this participant the payment advice?`, // You can customize this based on your data
          popupType: "sendOver", // You can use this to style it differently if needed
          deleteId: id
        });
    };


    generatePortOverConfirmationPopup = (id, participantInfo, courseInfo, status) => {
      console.log("ID deleted:", id);
      console.log("Course Info:", courseInfo);
      console.log("Payment Status:", status);
      this.setState({
        isPopupOpen: true,
        popupMessage: `Are you sure you want to port over this participant?`, // You can customize this based on your data
        popupType: "portOver", // You can use this to style it differently if needed
        deleteId: id, // Store the row data to handle the deletion later
        courseInfo: courseInfo, // Store the row data to handle the deletion later
        participantInfo: participantInfo,
        status: status
      });
    };
    
    generateReceiptPopup = () => {
      this.setState({
        isPopupOpen: true,
        popupMessage: "Generating Receipt...",
        popupType: "loading"
      });
    };

      
    updateRemarksPopup = () => {
      this.setState({
        isPopupOpen: true,
        popupMessage: "Changing Payment Method...",
        popupType: "loading"
      });
    };

    updatePaymentPopup = () => {
      this.setState({
        isPopupOpen: true,
        popupMessage: "Updating Payment Status...",
        popupType: "loading"
      });
    };


    handlePageChange(page) {
      console.log("Total No Of Pages:", this.state.totalPages);
      if (page >= 1 && page <= this.state.totalPages) {
        this.setState({ currentPage: page });
      }
    }

    getPaginatedCourses = () => {
        const { currentPage, coursesPerPage } = this.state;
      const startIndex = (currentPage - 1) * coursesPerPage;
      return this.getFilteredCourses().slice(startIndex, startIndex + coursesPerPage);
    };

    getTotalNumberofCourses = async (total) =>
    {
      console.log(total);
      this.setState({ nofCourses: total });
    };

    toggleRegistrationPaymentComponent = (item) =>
    {
      console.log("Selected Item:", item);
      if(item === "Registration And Payment Table")
      {
        this.setState({ resetSearch: true, }, () => {
          this.setState({ resetSearch: false });
        });

        this.setState((prevState) => ({
            courseType: "",
            isRegistrationPaymentVisible: !prevState.isRegistrationPaymentVisible, // Toggle visibility
            isPopupOpen: true,
            popupMessage: "Loading In Progress",
            popupType: "loading",
            sidebarVisible: false,
            section: "registration",
            accountType: null,
            createAccount: false,
            isReceiptVisible: false,
            item: item,
            reportVisibility: false,
            attendanceVisibility: false,
            isMembershipVisible: false,
            isFitnessVisible: false, // Added this
            isFundraisingTableVisible: false
            //viewMode: "full"
        }));
      }
      else if(item === "Receipt Table")
      {
          this.setState({ resetSearch: true, }, () => {
            this.setState({ resetSearch: false });
          });

          this.setState((prevState) => ({
              courseType: "",
              isRegistrationPaymentVisible: false, // Toggle visibility
              isPopupOpen: true,
              popupMessage: "Loading In Progress",
              popupType: "loading",
              sidebarVisible: false,
              section: "registration",
              accountType: null,
              createAccount: false,
              isReceiptVisible: !prevState.isReceiptVisible,
              item: item,
              attendanceVisibility: false,
              isMembershipVisible: false,
              isFitnessVisible: false, // Added this
              isFundraisingTableVisible: false
              //viewMode: "full"
          }));
      }
    }

    getTotalNumberofDetails = async (total) =>
    {
        console.log("Registration:", total);
        this.setState({ noofDetails: total });
    };

    getTotalNumberofAccounts = async (total) =>
    {
        console.log("Total Number Of Accounts:", total);
        this.setState({ nofAccounts: total });
    };
  

    handleEntriesPerPageChange = (value) => 
    {
      value = Number(value);
      const { nofCourses, section, noofDetails, nofAccounts } = this.state;
      console.log("Entries Per Page:", value);
      console.log("Number of Courses:", nofAccounts);
      if(section === "courses")
      {
        this.setState(
          { entriesPerPage: value, currentPage: 1 }, // Reset to the first page
          () => {
            const totalPages = Math.ceil(nofCourses / value);
            console.log("Total Pages:", totalPages);
            this.setState({ totalPages });
          }
        )
      }
      else if(section === "registration")
      {
        this.setState(
          { entriesPerPage: value, currentPage: 1 }, // Reset to the first page
          () => {
            const totalPages = Math.ceil(noofDetails / value);
            console.log("Total Pages:", totalPages);
            this.setState({ totalPages });
          }
        )
      }
      else if(section === "accounts")
      {
          console.log("Number of Accounts:", nofAccounts);
          this.setState(
            { entriesPerPage: value, currentPage: 1 }, // Reset to the first page
            () => {
              const totalPages = Math.ceil(nofAccounts / value);
              console.log(" Accounts Total Pages:", totalPages);
              this.setState({ totalPages });
            }
          )
        }
    };

 
  
  onResetSearch = () =>
  {
    this.setState({ resetSearch: true, }, () => {
      this.setState({ resetSearch: false });
    });
  }

  logOut = async() =>
  {   
    //this.props.history.push('/');  
    this.setState({
      isPopupOpen: true,
      popupMessage: "Are you sure that you want to log out?",
      popupType: "logout",
      isDropdownOpen: false
    });
  }

  // This method is called when no activity is detected for the specified time
  noActivityDetected = async () => {
    this.setState({ isInactive: true });
    //console.log('User has been inactive for 1 minute.');
    this.setState({
      isPopupOpen: true,
      popupMessage: "",
      popupType: "no-activity"
    });
    //this.goBackHome();
  };

  // This method can be called to reset the inactivity state
  resetInactivity = () => {
    this.setState({ isInactive: false });
    //console.log('User is active again. Resetting inactivity timer.');
    clearTimeout(this.inactivityTimeout); // Clear the timeout if user becomes active

    // Restart the inactivity timeout
    //this.inactivityTimeout = setTimeout(this.noActivityDetected, 10000); // 1 minute*/
    this.inactivityTimeout = setTimeout(this.noActivityDetected, 15*60*1000); // 1 minute*/
  };

  goBackHome = async() =>
  {
    console.log("Logout");
    var response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/login`, { purpose: "logout", accountId: this.props.location.state?.accountId });
    if(response.data.message.message === "Logout successful")
    {
      this.props.auth.logout();
      this.props.history.push("/");
    }
  }


  createAccountPopupMessage(result, message, popupType)
  {
    console.log(result, message, popupType);
    this.setState({
      isPopupOpen: result,
      popupMessage: message,
      popupType: "success-message"
    });
    setTimeout(() => {
      this.setState({ isPopupOpen: false});
    }, 5000);
  }

  toggleDropdown = () => {
    this.setState((prevState) => ({
      isDropdownOpen: !prevState.isDropdownOpen,
    }));
  };

    editAccountPopupMessage(accountId) {
      // Log the account ID for debugging purposes
     // console.log("Account Id:", accountId);
    
      // Set the popup state with a relevant message
      this.setState({
        isPopupOpen: true,
        popupMessage: accountId, // Informative message
        popupType: "edit-account"
      });
    }

   closePopupMessage = async () => {
        // Close the popup
        this.setState({
            isPopupOpen: false
        }, () => {
            // Call refreshChild after the state has updated
            this.refreshChild();
        });
    };

    // Method to refresh the child component
    refreshChild = () => {
        this.setState((prevState) => ({
            refreshKey: prevState.refreshKey + 1 // Increment refreshKey to trigger a refresh
        }));
    };

    updateAccessRights = async(accessRight) =>
    {
      console.log("Updated Access Right:", accessRight);
      this.setState({
        isPopupOpen: true,
        popupMessage: accessRight, // Informative message
        popupType: "update-access-right"
      });
    }

    // Handle access rights data from sidebar
    handleAccessRightsData = (accessRights) => {
      this.setState({ accessRights });
    }

    warningPopUpMessage = async(message) =>
    {
        this.setState({
          isPopupOpen: true,
          popupMessage: message,
          popupType: "error-message",
        });
        // Redirect or perform other actions...
        setTimeout(() => {
          this.setState({ isPopupOpen: false, name: '', password: '', role: ''});
      }, 5000);
    } 

    loadingPopup = async () =>
    {
      this.setState({
        isPopupOpen: true,
        popupMessage: "Loading Dashboard",
        popupType: "loading",
      });
    }

    loadingPopup1 = async () =>
      {
        this.setState({
          isPopupOpen: true,
          popupMessage: "Loading In Progress",
          popupType: "loading",
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

    generateInvoicePopup = async() => 
    {
      this.setState({
        isPopupOpen: true,
        popupMessage: "Generating Invoice",
        popupType: "loading",
      });
    }

    showUpdatePopup = async(item)=>
    {
      console.log("Selected:", item);
      this.setState({
        isPopupOpen: true,
        popupMessage: item,
        popupType: "loading",
      });
    }

    generateInvoiceNumber = async() =>
    {
      this.setState({
        isPopupOpen: true,
        popupMessage: "Generating Invoice For SkillsFuture Payment",
        popupType: "loading",
      });
    }

    // Handle attendance type, activity code, and location selection
    handleAttendanceSelectFromChild = (updateState, dropdown) => {
      console.log("Selected Attendance Filter:", updateState, dropdown);
      
      if (dropdown === 'showAttendanceTypeDropdown') {
        this.setState({
          attendanceFilterType: updateState.attendanceType
        });
      } else if (dropdown === 'activityCode') {
        this.setState({
          attendanceFilterCode: updateState.activityCode
        });
      } else if (dropdown === 'showAttendanceLocationDropdown') {
        this.setState({
          attendanceFilterLocation: updateState.attendanceLocation
        });
      } else if (dropdown === 'showMembershipTypeDropdown') {
        this.setState({
          membershipType: updateState.membershipType
        });
      }
    };
    
    // Handle membership type selection
    handleMembershipSelectFromChild = (selectedType) => {
      console.log('Membership type selected:', selectedType);
      this.setState({
        membershipType: selectedType
      });
    };

    // Handler for membership search query from child components
    handleMembershipSearchFromChild = (searchQuery) => {
      console.log('Membership search query:', searchQuery);
      this.setState({
        membershipSearchQuery: searchQuery,
        searchQuery: searchQuery // Also update the general searchQuery for compatibility
      });
    };
    
    // Handler for fitness search query from child components
    handleFitnessSearchFromChild = (searchQuery) => {
      console.log('Fitness search query:', searchQuery);
      this.setState({
        fitnessSearchQuery: searchQuery,
        searchQuery: searchQuery // Also update the general searchQuery for compatibility
      });
    };

    handleFundraisingSearchFromChild = (searchQuery) => {
      console.log('Fundraising search query:', searchQuery);
      this.setState({
        fundraisingSearchQuery: searchQuery,
        searchQuery: searchQuery // Also update the general searchQuery for compatibility
      });
    };

    // Handle fundraising filter selection (payment method, collection mode, status)
    handleFundraisingSelectFromChild = (updateState, dropdown) => {
      console.log("Selected Fundraising Filter:", updateState, dropdown);
      
      if (dropdown === 'showPaymentMethodDropdown') {
        this.setState({
          fundraisingPaymentMethod: updateState.paymentMethod || updateState.fundraisingPaymentMethod
        });
      } else if (dropdown === 'showCollectionModeDropdown') {
        this.setState({
          fundraisingCollectionMode: updateState.collectionMode || updateState.fundraisingCollectionMode
        });
      } else if (dropdown === 'showStatusDropdown') {
        this.setState({
          fundraisingStatus: updateState.status || updateState.fundraisingStatus
        });
      }
    };

    // Add method to receive fundraising filter options from FundraisingTable
    handleFundraisingFiltersLoaded = (paymentMethods, collectionModes, statuses) => {
      console.log("Received payment methods:", paymentMethods);
      console.log("Received collection modes:", collectionModes);
      console.log("Received statuses:", statuses);
      
      this.setState({
        fundraisingPaymentMethods: paymentMethods || ['All Payment Methods'],
        fundraisingCollectionModes: collectionModes || ['All Collection Modes'],
        fundraisingStatuses: statuses || ['All Statuses']
      });
    };
    
    // Handle attendance search query
    handleAttendanceSearchFromChild = (data) => {
      console.log("Attendance Search Query:", data);
      this.setState({
        attendanceSearchQuery: data
      });
    };
    
    // Add this method to receive attendance types, codes, and locations from AttendanceSection
    handleAttendanceTypesLoaded = (types, activityCodes, locations) => {
      console.log("Received attendance types:", types);
      console.log("Received activity codes:", activityCodes);
      console.log("Received attendance locations:", locations);
      
      this.setState({
        attendanceTypes: types || ['All Types'],
        activityCodes: activityCodes || ['All Codes'],
        attendanceLocations: locations || ['All Locations']
      });
    };

    // Handle navigation from WelcomeSection action cards
    handleWelcomeNavigate = (section) => {
      console.log("Welcome navigation to:", section);
      
      switch(section) {
        case 'registration':
          this.toggleRegistrationPaymentComponent('Registration And Payment Table');
          break;
        case 'dashboard':
          this.toggleDashboardComponent();
          break;
        case 'courses':
        case 'nsa-courses':
          this.toggleCourseComponent('NSA');
          break;
        case 'ilp-courses':
          this.toggleCourseComponent('ILP');
          break;
        case 'marriage-preparation-programme-courses':
          this.toggleCourseComponent('Marriage Preparation Programme');
          break;
        case 'talks-and-seminar':
          this.toggleCourseComponent('Talks And Seminar');
          break;
        case 'attendance':
          this.toggleAttendanceComponent('All Types');
          break;
        case 'membership':
          this.toggleMembershipComponent();
          break;
        case 'reports':
        case 'monthly-report':
          this.toggleReportComponent('Monthly Report');
          break;
        case 'payment-report':
          this.toggleReportComponent('Payment Report');
          break;
        case 'create-account':
          this.toggleAccountsComponent('Create Account');
          break;
        case 'accounts':
          this.toggleAccountsComponent('Accounts');
          break;
        case 'access-rights':
          this.toggleAccountsComponent('Access Rights');
          break;
        case 'fitness':
        case 'fft-results':
          this.toggleFitnessComponent();
          break;
        case 'fundraising-table':
          this.toggleFundraisingTableComponent();
          break;
        case 'fundraising-inventory':
          this.toggleFundraisingInventoryComponent();
          break;
        default:
          console.log('Navigation section not found:', section);
      }
    };

    // Handle home navigation to reset to Welcome Section
    toggleHomeComponent = () => {
      console.log("Navigating to Home - showing Welcome Section");
      
      this.setState({
        accountType: null,
        courseType: null,
        isRegistrationPaymentVisible: false,
        createAccount: false,
        reportVisibility: false,
        dashboard: false,
        attendanceVisibility: false,
        isMembershipVisible: false,
        isFitnessVisible: false, // This one was already there
        isFundraisingTableVisible: false,
        isFundraisingInventoryVisible: false,
        isReceiptVisible: false,
        section: '',
        submenuVisible: null
      });
    };
    
    render() 
    {
      console.log("Props History Push", this.props);
      const userName = this.props.location.state?.name || 'User';
      const role = this.props.location.state?.role;
      const siteIC = this.props.location.state?.siteIC;
      const {membershipType, membershipTypes, membershipSearchQuery, isMembershipVisible, isFitnessVisible, fitnessSearchQuery, isFundraisingTableVisible, isFundraisingInventoryVisible, fundraisingSearchQuery, fundraisingPaymentMethod, fundraisingCollectionMode, fundraisingStatus, fundraisingPaymentMethods, fundraisingCollectionModes, fundraisingStatuses, attendanceVisibility, reportType, reportVisibility, participantInfo, status, item, isDropdownOpen, isReceiptVisible, dashboard, displayedName, submenuVisible, language, courseType, accountType, isPopupOpen, popupMessage, popupType, sidebarVisible, locations, languages, types, selectedLanguage, selectedLocation, selectedCourseType, searchQuery, resetSearch, viewMode, currentPage, totalPages, nofCourses,noofDetails, isRegistrationPaymentVisible, section, roles, selectedAccountType, nofAccounts, createAccount, names, selectedCourseName, courseInfo, selectedQuarter, quarters, attendanceFilterType, attendanceFilterCode, attendanceFilterLocation, attendanceSearchQuery, attendanceTypes, activityCodes, attendanceLocations} = this.state;

      return (
        <>
          <div className="dashboard">
            <div className="header">
              <button className="sidebar-toggle" onClick={this.toggleSidebar}>
                ☰
              </button>
              <div className="language-toggle">
                <button onClick={this.toggleLanguage}>
                  {language === 'en' ? '中文' : 'English'}
                </button>
              </div>
              <div className="user-dropdown">
                <div className="dropdown-toggle" onClick={this.toggleDropdown}>
                  <span className="displayedName">{userName}</span>
                  <i className='fas fa-user-alt'></i>
                </div>

                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    <ul>
                      {/*<li>Profile</li>
                      <li>Settings</li>*/}
                      <li onClick={this.logOut}>Logout</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className={`content ${sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
              <div
                className={`sidebar ${submenuVisible !== null ? 'expanded' : ''}`}
                onMouseLeave={this.handleMouseLeave}
              >
                <SideBarContent
                  accountId = {this.props.location.state?.accountId}
                  toggleHomeComponent = {this.toggleHomeComponent}
                  toggleDashboardComponent = {this.toggleDashboardComponent}
                  toggleAccountsComponent = {this.toggleAccountsComponent}
                  toggleCourseComponent = {this.toggleCourseComponent}
                  toggleRegistrationPaymentComponent = {this.toggleRegistrationPaymentComponent}
                  toggleReportComponent = {this.toggleReportComponent}
                  toggleAttendanceComponent = {this.toggleAttendanceComponent}
                  toggleMembershipComponent = {this.toggleMembershipComponent}
                  toggleFitnessComponent = {this.toggleFitnessComponent}
                  toggleFundraisingTableComponent = {this.toggleFundraisingTableComponent}
                  onAccessRightsUpdate = {this.handleAccessRightsData}
                  key={this.state.refreshKey}
                />
              </div>
              <div className="main-content">
              {/* Default Welcome Section - shows when no other section is active */}
              {
                accountType === null && 
                courseType === null && 
                isRegistrationPaymentVisible === false && 
                createAccount === false && 
                reportVisibility === false && 
                dashboard === false &&
                attendanceVisibility === false &&
                isMembershipVisible === false &&
                isFitnessVisible === false &&
                isFundraisingTableVisible === false &&
                isFundraisingInventoryVisible === false &&
                isReceiptVisible === false &&
                (
                  <>
                    <div className="welcome-section">
                      <WelcomeSection
                        userName={userName}
                        role={role}
                        accessRights={this.state.accessRights}
                        onNavigate={this.handleWelcomeNavigate}
                      />
                    </div>
                  </>
                )
              }
              {
                accountType === null && courseType === null && isRegistrationPaymentVisible === false && createAccount === false && reportVisibility === false && dashboard === true &&
                (
                  <>
                  <div className="dashboard-section">
                    {<DashboardSection
                      closePopup1={this.closePopup}
                      role={role}
                      siteIC={siteIC}
                     />}
                  </div>
                  </>
                )
              }
              {createAccount && (
                <>
                   <div className="create-account-section">
                      <CreateAccountsSection
                        language={language}
                        closePopup={this.closePopup}
                        createAccountPopupMessage={this.createAccountPopupMessage}
                      />
                    </div>
                </>
              )}
              {accountType && (
                  <>
                  <div className="search-section">
                      <Search
                        language={language}
                        closePopup={this.closePopup}
                        passSelectedValueToParent={this.handleSelectFromChild}
                        passSearchedValueToParent={this.searchResultFromChild}
                        resetSearch={resetSearch}
                        section={section}
                        roles={roles}
                        item={item}
                      />
                    </div>
                    <div className="account-section">
                      <AccountsSection
                        language={language}
                        accountType={accountType}
                        closePopup={this.closePopup}
                        passDataToParent={this.handleDataFromChild}
                        selectedAccountType ={selectedAccountType}
                        searchQuery={searchQuery}
                        getTotalNumberofAccounts={this.getTotalNumberofAccounts}
                        currentPage={currentPage} // Pass current page
                        entriesPerPage={this.state.entriesPerPage} // Pass entries per page
                        resetSearch={resetSearch} 
                        section={section}
                        edit = {this.editAccountPopupMessage}
                        updateAccessRights = {this.updateAccessRights}
                        key={this.state.refreshKey}
                      />
                    </div>
                  </>
                )}
                {courseType && (
                  <>
                    <div className="search-section">
                      <Search
                        language={language}
                        closePopup={this.closePopup}
                        languages={languages}
                        locations={locations}
                        passSelectedValueToParent={this.handleSelectFromChild}
                        passSearchedValueToParent={this.searchResultFromChild}
                        resetSearch={resetSearch}
                        section={section}
                        item={item}
                      />
                    </div>
                    <div className="courses-section">
                      <CoursesSection
                        language={language}
                        courseType={courseType}
                        closePopup={this.closePopup}
                        passDataToParent={this.handleDataFromChild}
                        selectedLanguage={selectedLanguage}
                        selectedLocation={selectedLocation}
                        searchQuery={searchQuery}
                        getTotalNumberofCourses={this.getTotalNumberofCourses}
                        currentPage={currentPage} // Pass current page
                        entriesPerPage={this.state.entriesPerPage} // Pass entries per page
                        resetSearch={resetSearch} 
                        section={section}
                        item={item}
                      />
                    </div>
                  </>
                )}
                {isMembershipVisible && 
                    <>
                        <div className="search-section">
                            <Search
                              section={section}
                              language={language}
                              resetSearch={resetSearch}
                              passSelectedValueToParent={this.handleMembershipSelectFromChild}
                              passSearchedValueToParent={this.handleMembershipSearchFromChild}
                              membershipTypes={membershipTypes}
                            />
                        </div>
                        <div className="membership-section">
                          <MembershipSection 
                            section={section}
                            userName={userName}
                            passDataToParent={this.handleDataFromChild}
                            loadingPopup1={this.loadingPopup1}
                            role={role}
                            siteIC={siteIC}
                            closePopup1={this.closePopup}
                            searchQuery={searchQuery}
                            membershipType={membershipType}
                            resetSearch={resetSearch}
                            language={language}
                            key={this.state.refreshKey}
                            refreshChild={this.refreshChild}
                          />
                        </div>
                    </>
                }
                {isFitnessVisible && 
                    <>
                        <div className="search-section">
                            <Search
                              section={section}
                              language={language}
                              resetSearch={resetSearch}
                              passSearchedValueToParent={this.handleFitnessSearchFromChild}
                            />
                        </div>
                          <FitnessSection 
                            section={section}
                            userName={userName}
                            role={role}
                            siteIC={siteIC}
                            closePopup1={this.closePopup}
                            searchQuery={searchQuery}
                            resetSearch={resetSearch}
                            language={language}
                            key={this.state.refreshKey}
                            refreshChild={this.refreshChild}
                            onDataLoaded={this.closePopup}
                          />
                    </>
                }
                {isFundraisingTableVisible && 
                    <>
                      <div className="search-section">
                            <Search
                              section={section}
                              language={language}
                              resetSearch={resetSearch}
                              passSelectedValueToParent={this.handleFundraisingSelectFromChild}
                              passSearchedValueToParent={this.handleFundraisingSearchFromChild}
                              fundraisingPaymentMethods={fundraisingPaymentMethods}
                              fundraisingCollectionModes={fundraisingCollectionModes}
                              fundraisingStatuses={fundraisingStatuses}
                            />
                        </div>
                        <div className="fundraising-section">
                          <FundraisingTable 
                            section={section}
                            userName={userName}
                            role={role}
                            siteIC={siteIC}
                            closePopup1={this.closePopup}
                            language={language}
                            key={this.state.refreshKey}
                            refreshChild={this.refreshChild}
                            onDataLoaded={this.closePopup}
                            paymentMethod={fundraisingPaymentMethod}
                            collectionMode={fundraisingCollectionMode}
                            status={fundraisingStatus}
                            searchQuery={fundraisingSearchQuery}
                            onFiltersLoaded={this.handleFundraisingFiltersLoaded}
                          />
                        </div>
                    </>
                }             
                {isFundraisingInventoryVisible && 
                <>
                  <div className="search-section">
                            <Search
                              section={section}
                              language={language}
                              resetSearch={resetSearch}
                              passSelectedValueToParent={this.handleFundraisingSelectFromChild}
                              passSearchedValueToParent={this.handleFundraisingSearchFromChild}
                              fundraisingPaymentMethods={fundraisingPaymentMethods}
                              fundraisingCollectionModes={fundraisingCollectionModes}
                              fundraisingStatuses={fundraisingStatuses}
                            />
                    </div>
                    <div className="fundraising-inventory-section">
                      <FundraisingInventory 
                        section={section}
                        userName={userName}
                        role={role}
                        siteIC={siteIC}
                        closePopup1={this.closePopup}
                        language={language}
                        key={this.state.refreshKey}
                        refreshChild={this.refreshChild}
                        onDataLoaded={this.closePopup}
                      />
                    </div>
                  </>
                }             
                { isRegistrationPaymentVisible&& 
                  <>
                  <div className="search-section">
                      <Search
                        locations={locations}
                        types={types}
                        courses={names}
                        quarters={quarters}
                        resetSearch={resetSearch}
                        section={section}
                        passSelectedValueToParent={this.handleRegPaymentSelectFromChild}
                        passSearchedValueToParent={this.handleRegPaymentSearchFromChild}
                        item={item}
                      />
                    </div>
                    <div className="registration-payment-section">
                    <RegistrationPaymentSection 
                        closePopup={this.closePopup}
                        section={section}
                        passDataToParent={this.handleDataFromChild}
                        selectedLocation={selectedLocation}
                        selectedCourseType={selectedCourseType}
                        selectedCourseName={selectedCourseName}
                        selectedQuarter = {selectedQuarter}
                        searchQuery={searchQuery}
                        resetSearch={resetSearch}
                        getTotalNumberofDetails={this.getTotalNumberofDetails}
                        currentPage={currentPage} // Pass current page
                        entriesPerPage={this.state.entriesPerPage} // Pass entries per page
                        userName = {userName}
                        siteIC = {siteIC}
                        role = {role}
                        key={this.state.refreshKey}
                        refreshChild={this.refreshChild}
                        generateReceiptPopup = {this.generateReceiptPopup}
                        updatePaymentPopup = {this.updatePaymentPopup}
                        updateRemarksPopup = {this.updateRemarksPopup}
                        warningPopUpMessage = {this.warningPopUpMessage}
                        showUpdatePopup = {this.showUpdatePopup}
                        generateInvoiceNumber = {this.generateInvoiceNumber}
                        onResetSearch = {this.onResetSearch}
                        closePopupMessage = {this.closePopupMessage}
                        generateDeleteConfirmationPopup = {this.generateDeleteConfirmationPopup}
                        generatePortOverConfirmationPopup = {this.generatePortOverConfirmationPopup}
                        generateSendDetailsConfirmationPopup = {this.generateSendDetailsConfirmationPopup}
                    />
                    </div>
                  </>}                 
                  {isReceiptVisible && 
                  <>
                  <div className="search-section">
                      <Search
                        locations={locations}
                        types={types}
                        resetSearch={resetSearch}
                        section={section}
                        passSelectedValueToParent={this.handleRegPaymentSelectFromChild}
                        passSearchedValueToParent={this.handleRegPaymentSearchFromChild}
                        item={item}
                      />
                    </div>
                    <div className="view-toggle-section">
                      <ViewToggle
                        language={language}
                        viewMode={viewMode}
                        onToggleView={this.toggleViewMode}
                        onEntriesPerPageChange={this.handleEntriesPerPageChange}  
                        getTotalNumber= {noofDetails}
                      />
                    </div>
                    <div className="receipt-section">
                    <ReceiptSection 
                        closePopup={this.closePopup}
                        section={section}
                        passDataToParent={this.handleDataFromChild}
                        selectedLocation={selectedLocation}
                        selectedCourseType={selectedCourseType}
                        searchQuery={searchQuery}
                        resetSearch={resetSearch}
                        getTotalNumberofDetails={this.getTotalNumberofDetails}
                        currentPage={currentPage} // Pass current page
                        entriesPerPage={this.state.entriesPerPage} // Pass entries per page
                        userName = {userName}
                    />
                    </div>
                  </>} 
                  {reportVisibility && 
                  <>
                    <div className="invoice-section">
                      <ReportSection 
                        userName = {userName}
                        closePopup1={this.closePopup}
                        loadingPopup1 = {this.loadingPopup1}
                        generateInvoicePopup = {this.generateInvoicePopup}
                        reportType = {reportType}
                        role = {role}
                        siteIC = {siteIC}
                        />
                    </div>
                  </>} 
                  {attendanceVisibility && 
                    <>
                        <Search
                            section="attendance"
                            language={language}
                            resetSearch={resetSearch}
                            passSelectedValueToParent={this.handleAttendanceSelectFromChild}
                            passSearchedValueToParent={this.handleAttendanceSearchFromChild}
                            attendanceTypes={attendanceTypes}
                            attendanceLocations={attendanceLocations}
                            activityCodes={activityCodes}
                            item="attendance"
                          />
                        <div className="attendance-section">
                          <AttendanceSection 
                            userName={userName}
                            loadingPopup1 = {this.loadingPopup1}
                            role={role}
                            siteIC={siteIC}
                            closePopup1={this.closePopup}
                            attendanceType={this.state.attendanceFilterType}
                            activityCode={this.state.attendanceFilterCode}
                            selectedLocation={this.state.attendanceFilterLocation}
                            searchQuery={this.state.attendanceSearchQuery}
                            onTypesLoaded={this.handleAttendanceTypesLoaded}
                          />
                        </div>
                    </>
          }             
              </div>
            </div>
            <div className="footer">
              <p>© 2024 En Community Service Society Company Management System.<br />
                All rights reserved.</p>
            </div>
          </div>
          <Popup isOpen={isPopupOpen} message={popupMessage} userName={userName} type={popupType} participantInfo={participantInfo} status={status} courseInfo={courseInfo} closePopup={this.closePopup} closePopup2={this.closePopup2} goBackLoginPage={this.goBackHome} closePopupMessage={this.closePopupMessage} id = {this.state.deleteId}/>
        </>
      );
    }
  }

  export default withAuth(HomePage);
