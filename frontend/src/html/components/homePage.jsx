import React, { Component } from 'react';
import { flushSync } from 'react-dom';
  import { withRouter } from 'react-router-dom';
  import '../../css/homePage.css'; // Ensure your CSS paths are correct
  import AccountsSection from './sub/accountsSection';
  import CoursesSection from './sub/courseSection';
  import RegistrationPaymentSection from './RegistrationAndPayment';
  import ApprovalPopup from './RegistrationAndPayment/approval/ApprovalPopup';
  import ApprovalQueueModal from './RegistrationAndPayment/approval/ApprovalQueueModal';
  import ApprovalStatusModal from './RegistrationAndPayment/approval/ApprovalStatusModal';
  import ExportApprovalModal from './RegistrationAndPayment/components/ExportApprovalModal';
  import SupervisorExportModal from './RegistrationAndPayment/components/SupervisorExportModal';
  import ApprovalQueueDecisionPopup from './popup/ApprovalQueueDecisionPopup';
  import BulkUpdateModal from './RegistrationAndPayment/components/BulkUpdateModal';
  import BulkUpdateReasonModal from './RegistrationAndPayment/components/BulkUpdateReasonModal';
  import UpdateProgressModal from './RegistrationAndPayment/components/UpdateProgressModal';
  import AnomalyModal from './RegistrationAndPayment/components/AnomalyModal';
  // import ValidationErrorModal from './RegistrationAndPayment/components/ValidationErrorModal';
  import PaymentRegistrationStatusModal from './RegistrationAndPayment/components/PaymentRegistrationStatusModal';
  import Popup from './popup/popupMessage';
  import Search from './sub/searchSection';
  import ViewToggle from './sub/viewToggleSection';
  import CreateAccountsSection from './sub/createAccountsSection';
  import ReceiptSection from './sub/receiptSection';
  import SideBarContent from './sub/sideBarContent';
  import DashboardSection from './sub/dashboardSection';
  import AttendanceSection from './sub/AttendanceSection';
  import MembershipSection from './sub/MembershipSection';
  import FitnessSection from './sub/FitnessResult/FitnessSection';
  import FundraisingOrders from './sub/FundraisingOrders';
  import FundraisingInventory from './sub/FundraisingInventory';
  import InventoryModules from './sub/InventoryModules';
  import CollectionDateCalendar from './sub/CollectionDateCalendar';
  import SalesReportModal from './sub/SalesReportModal';
  import PaymentReportModal from './sub/PaymentReportModal';
  import InvoiceModal from './sub/InvoiceModal';
  import FiscalBalanceReportModal from './sub/FiscalBalanceReportModal';
  import BulkOrderModal from './sub/BulkOrderModal';
  import FundraisingOrderItemsModal from './sub/FundraisingOrderItemsModal';
  import GoogleDriveUploadModal from './sub/GoogleDriveUploadModal';
  import GoogleDriveViewModal from './GoogleDriveViewModal';
  import ReportSection from './sub/reportSection';
  import WelcomeSection from './sub/welcomeSection';
  import ReceiptModal from './sub/ReceiptModal';
  import CourseFlyers from './sub/CourseFlyers';
  import CourseLink from './sub/CourseLink';
  import AuditLogsSection from './sub/AuditLogsSection';
  import BulkDownloadProgress from './sub/BulkDownloadProgress';
  import { logFilterChange } from '../../utils/auditLog';
  import BulkUpdateModalForFundraising from './sub/BulkUpdateModalForFundraising';
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
        isUpdating: false,
        updateProgress: { show: false, steps: [], receiptData: null },
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
        isCourseFlyersVisible: false,
        isCourseLinkVisible: false,
        courseLinkLocation: 'All Locations',
        courseLinkCategory: 'All Categories',
        courseLinkSearchQuery: '',
        courseLinkLocations: [],
        courseLinkCategories: [],
        isFundraisingTableVisible: false,
        isFundraisingInventoryVisible: false,
        isInventoryModulesVisible: false,
        isInventoryFormVisible: false,
        isAuditLogsVisible: false,
        inventoryTab: 'store',
        inventoryRefreshCounter: 0,
        fundraisingSearchQuery: '',
        fundraisingPaymentMethod: 'All Payment Methods',
        // fundraisingCollectionMode: 'All Collection Modes',
        fundraisingCollectionLocation: 'All Collection Locations',
        fundraisingStatus: 'All Statuses',
        fundraisingPaymentMethods: [],
        // fundraisingCollectionModes: [],
        fundraisingCollectionLocations: [],
        fundraisingStatuses: [],
        showCalendarModal: false,
        selectedOrderForCalendar: null,
        collectionSchedule: {},
        accessRights: {}, // Access rights from sidebar
        isSalesReportModalOpen: false,
        isPaymentReportModalOpen: false,
        isFiscalBalanceReportModalOpen: false,
        isBulkOrderModalOpen: false,
        bulkOrderLoading: false,
        bulkOrderError: null,
        bulkOrderData: null,
        showItemsModal: false,
        selectedItems: [],
        selectedRowData: null,
        wooCommerceProductDetails: [],
        showReceiptModal: false,
        selectedReceipt: null,
        showInvoiceModal: false,
        invoiceModalData: { invoiceNumber: '', orderData: null },
        showGoogleDriveUploadModal: false,
        showGoogleDriveViewModal: false,
        pendingApproval: null,
        exportApprovalPayload: null,
        supervisorExportPayload: null,
        pendingApprovalQueue: null,
        approvalStatusPayload: null,
        notifierPayload: null,
        registrationBulkUpdatePayload: null,
        showBulkUpdateReasonModal: false,
        bulkUpdateReason: '',
        bulkUpdateReasonContext: null,
        shouldAutoOpenQueue: false,
        showQueueDecisionPopup: false,
        queueDecisionContext: null, // 'logout' or 'inactivity'
        queueItemCount: 0,
        showingQueueDuringLogout: false,
        // isValidationErrorModalOpen: false,
        // validationErrors: [],
        // validationErrorDetails: {},
        isPaymentRegistrationStatusModalOpen: false,
        paymentRegistrationStatusModalData: {
          errorType: 'payment_status_change',
          attemptedValue: '',
          currentPaymentStatus: '',
          currentRegistrationStatus: '',
        },
      };
  
      // Always reset attendance filter/search state to defaults on page load
      initialState.attendanceFilterType = 'All Types';
      initialState.attendanceFilterCode = 'All Codes';
      initialState.attendanceFilterLocation = 'All Locations';
      initialState.attendanceSearchQuery = '';

      // Always reset modal states on page load
      initialState.isBulkOrderModalOpen = false;
      initialState.bulkOrderLoading = false;
      initialState.bulkOrderError = null;
      initialState.bulkOrderData = null;
      initialState.approvalStatusPayload = null;

      // Set the initial state
      this.state = initialState;

      // Create ref for FundraisingOrders
      this.fundraisingOrdersRef = React.createRef();
      this.fundraisingTableRef = React.createRef();

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

      this._progressSequence = 0;
      this._progressStartedAt = 0;
      this._progressCloseTimer = null;
      this._progressStepTimer = null;
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

  // Calendar modal methods
  openCalendarModal = (order, schedule) => {
    console.log('openCalendarModal called with order:', order);
    console.log('openCalendarModal called with schedule:', schedule);
    console.log('Current state before opening modal:', {
      showCalendarModal: this.state.showCalendarModal,
      selectedOrderForCalendar: this.state.selectedOrderForCalendar
    });
    
    this.setState({
      showCalendarModal: true,
      selectedOrderForCalendar: order,
      collectionSchedule: schedule
    }, () => {
      console.log('State after opening modal:', {
        showCalendarModal: this.state.showCalendarModal,
        selectedOrderForCalendar: this.state.selectedOrderForCalendar,
        collectionSchedule: this.state.collectionSchedule
      });
    });
  };

  closeCalendarModal = () => {
    this.setState({
      showCalendarModal: false,
      selectedOrderForCalendar: null,
      collectionSchedule: {}
    });
  };

  handleDateSelect = async (orderId, selectedDate) => {
    console.log('Date selected for order:', orderId, selectedDate);
    
    try {
      // Call the updateCollectionDetails method from FundraisingOrders
      if (this.fundraisingOrdersRef.current) {
        const result = await this.fundraisingOrdersRef.current.updateCollectionDetails(
          orderId, 
          selectedDate, 
          null, // collectionTime - keeping existing
          null  // location - keeping existing
        );
        
        if (result.success) {
          console.log('Collection date updated successfully');
        } else {
          console.error('Failed to update collection date');
        }
      }
    } catch (error) {
      console.error('Error updating collection date:', error);
    }
    
    // Close the calendar modal
    this.closeCalendarModal();
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
      const userName = this.props.location.state?.name || 'User';
      console.log("Selected Data (Registration Payment):", updateState, dropdown);
      if (dropdown === 'clearFilters') {
        this.handleClearRegPaymentFilters();
        return;
      }
      const filterConfigByDropdown = {
        showTypeDropdown: {
          stateKey: 'selectedCourseType',
          value: updateState?.courseType || '',
          filterType: 'Type',
          reset: {
            selectedLocation: '',
            selectedQuarter: '',
            selectedCourseName: '',
          },
        },
        showLocationDropdown: {
          stateKey: 'selectedLocation',
          value: updateState?.centreLocation || '',
          filterType: 'Location',
          reset: {
            selectedQuarter: '',
            selectedCourseName: '',
          },
        },
        showQuarterDropdown: {
          stateKey: 'selectedQuarter',
          value: updateState?.quarter || '',
          filterType: 'Quarter Year',
          reset: {
            selectedCourseName: '',
          },
        },
        showCourseDropdown: {
          stateKey: 'selectedCourseName',
          value: updateState?.courseName || '',
          filterType: 'Course',
          reset: {},
        },
      };

      const resolveConfigFromPayload = () => {
        if (Object.prototype.hasOwnProperty.call(updateState || {}, 'courseType')) {
          return filterConfigByDropdown.showTypeDropdown;
        }
        if (Object.prototype.hasOwnProperty.call(updateState || {}, 'centreLocation')) {
          return filterConfigByDropdown.showLocationDropdown;
        }
        if (Object.prototype.hasOwnProperty.call(updateState || {}, 'quarter')) {
          return filterConfigByDropdown.showQuarterDropdown;
        }
        if (Object.prototype.hasOwnProperty.call(updateState || {}, 'courseName')) {
          return filterConfigByDropdown.showCourseDropdown;
        }
        return null;
      };

      const cfg = filterConfigByDropdown[dropdown] || resolveConfigFromPayload();
      if (!cfg) return;

      const oldValue = this.state[cfg.stateKey];
      const hasValueChanged = oldValue !== cfg.value;
      if (hasValueChanged) {
        this.setState({
          ...cfg.reset,
          [cfg.stateKey]: cfg.value,
        });
      }

      if (hasValueChanged) {
        logFilterChange({
          userName,
          module: 'Registration And Payment',
          filterType: cfg.filterType,
          oldValue,
          newValue: cfg.value,
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
            isFundraisingTableVisible: false,
            isFundraisingInventoryVisible: false, // Added this missing line
            isInventoryModulesVisible: false,
            isInventoryFormVisible: false,
            isAuditLogsVisible: false
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
              isFundraisingTableVisible: false,
              isFundraisingInventoryVisible: false, // Added this missing line
              isInventoryModulesVisible: false,
              isInventoryFormVisible: false,
              isAuditLogsVisible: false
            });
          });
      } 
      catch (error) 
      {
        console.log(error);
        // Error loading attendance view - popup removed
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
              isFundraisingInventoryVisible: false, // Added this missing line
              isInventoryModulesVisible: false,
              isInventoryFormVisible: false,
              isAuditLogsVisible: false,
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
        // Error loading membership view - popup removed
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
          popupMessage: "Loading FFT Fitness Results",
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
            isFundraisingInventoryVisible: false, // Added this missing line
            isInventoryModulesVisible: false,
            isInventoryFormVisible: false,
            isAuditLogsVisible: false,
            
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
        // Error loading FFT Fitness Results - popup removed
      }
    }

    toggleFundraisingOrdersComponent = async() => {
      console.log("toggleFundraisingOrdersComponent called - showing fundraising orders only");
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
          isFundraisingInventoryVisible: false, // Added this missing line
          isInventoryModulesVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false,
          
          // Popup settings
          isPopupOpen: true,
          popupMessage: "Loading Fundraising Orders",
          popupType: "loading",
          
          // Reset other states
          sidebarVisible: false,
          section: "fundraising-table",
          attendanceType: "",
          
          // Reset fundraising filtering state to show all data
          fundraisingSearchQuery: '',
          searchQuery: '',
          fundraisingPaymentMethod: '',
          fundraisingCollectionLocation: '',
          fundraisingStatus: ''
        });
      } 
      catch (error) {
        console.log("Error in toggleFundraisingOrdersComponent:", error);
        // Error loading fundraising Orders - popup removed
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
          isInventoryModulesVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false,
          
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
        // Error loading fundraising inventory - popup removed
      }
    }

    toggleCourseLinkComponent = async() => {
      console.log("toggleCourseLinkComponent called - showing course links");
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
          isCourseFlyersVisible: false,
          isFundraisingTableVisible: false,
          isFundraisingInventoryVisible: false,
          isInventoryModulesVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false,
          
          // Set course link mode
          isCourseLinkVisible: true,
          
          // Popup settings
          isPopupOpen: true,
          popupMessage: "Loading Course Links",
          popupType: "loading",
          
          // Reset other states
          sidebarVisible: false,
          section: "course-link",
          attendanceType: "",
          
          // Reset search state
          searchQuery: ''
        });
      } 
      catch (error) {
        console.log("Error in toggleCourseLinkComponent:", error);
        // Error loading course links - popup removed
      }
    }

    toggleInventoryModulesComponent = async() => {
      console.log("toggleInventoryModulesComponent called - showing inventory modules");
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
          isFundraisingInventoryVisible: false,
          isCourseFlyersVisible: false,
          isCourseLinkVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false,
          
          // Set inventory modules mode
          isInventoryModulesVisible: true,
          inventoryTab: 'store',
          inventoryRefreshCounter: this.state.inventoryRefreshCounter + 1,
          
          // Reset other states
          sidebarVisible: false,
          section: "inventory-modules",
          attendanceType: "",
          
          // Reset search state
          searchQuery: ''
        }, () => {
          // Close the loading popup after state is set
          this.setState({ isPopupOpen: false });
        });
      } 
      catch (error) {
        console.log("Error in toggleInventoryModulesComponent:", error);
        // Error loading inventory store - popup removed
      }
    }

    toggleInventoryFormComponent = async() => {
      console.log("toggleInventoryFormComponent called - showing inventory form");
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
          isFundraisingInventoryVisible: false,
          isCourseFlyersVisible: false,
          isCourseLinkVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false,
          
          // Set inventory modules mode with form tab
          isInventoryModulesVisible: true,
          inventoryTab: 'form',
          inventoryRefreshCounter: this.state.inventoryRefreshCounter + 1,
          
          // Reset other states
          sidebarVisible: false,
          section: "inventory-form",
          attendanceType: "",
          
          // Reset search state
          searchQuery: ''
        }, () => {
          // Close the loading popup after state is set
          this.setState({ isPopupOpen: false });
        });
      } 
      catch (error) {
        console.log("Error in toggleInventoryFormComponent:", error);
        // Error loading inventory form - popup removed
      }
    }

    toggleInventoryRecordsComponent = async() => {
      console.log("toggleInventoryRecordsComponent called - showing inventory records");
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
          isFundraisingInventoryVisible: false,
          isCourseFlyersVisible: false,
          isCourseLinkVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false,
          
          // Set inventory modules mode with records tab
          isInventoryModulesVisible: true,
          inventoryTab: 'records',
          inventoryRefreshCounter: this.state.inventoryRefreshCounter + 1,
          
          // Reset other states
          sidebarVisible: false,
          section: "inventory-records",
          attendanceType: "",
          
          // Reset search state
          searchQuery: ''
        }, () => {
          // Close the loading popup after state is set
          this.setState({ isPopupOpen: false });
        });
      } 
      catch (error) {
        console.log("Error in toggleInventoryRecordsComponent:", error);
        // Error loading inventory records - popup removed
      }
    }

    toggleInventoryInvoicesComponent = async() => {
      console.log("toggleInventoryInvoicesComponent called - showing inventory invoices");
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
          isFundraisingInventoryVisible: false,
          isCourseFlyersVisible: false,
          isCourseLinkVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false,
          
          // Set inventory modules mode with invoices tab
          isInventoryModulesVisible: true,
          inventoryTab: 'invoices',
          inventoryRefreshCounter: this.state.inventoryRefreshCounter + 1,
          
          // Reset other states
          sidebarVisible: false,
          section: "inventory-invoices",
          attendanceType: "",
          
          // Reset search state
          searchQuery: ''
        }, () => {
          // Close the loading popup after state is set
          this.setState({ isPopupOpen: false });
        });
      } 
      catch (error) {
        console.log("Error in toggleInventoryInvoicesComponent:", error);
        // Error loading inventory invoices - popup removed
      }
    }

    toggleAuditLogsComponent = async() => {
      console.log("toggleAuditLogsComponent called - showing audit logs");
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
          isFundraisingInventoryVisible: false,
          isCourseFlyersVisible: false,
          isCourseLinkVisible: false,
          isInventoryModulesVisible: false,
          isInventoryFormVisible: false,
          
          // Set audit logs mode
          isAuditLogsVisible: true,
          
          // Popup settings
          isPopupOpen: true,
          popupMessage: "Loading Audit Logs",
          popupType: "loading",
          
          // Reset other states
          sidebarVisible: false,
          section: "audit-logs",
          attendanceType: "",
          
          // Reset search state
          searchQuery: ''
        });
      } 
      catch (error) {
        console.log("Error in toggleAuditLogsComponent:", error);
        // Error loading audit logs - popup removed
      }
    }

    toggleCourseFlyersComponent = async() => {
      console.log("toggleCourseFlyersComponent called - showing course flyers");
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
          isFundraisingInventoryVisible: false,
          isInventoryModulesVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false,
          
          // Set course flyers mode
          isCourseFlyersVisible: true,
          
          // Popup settings
          isPopupOpen: true,
          popupMessage: "Loading Course Flyers",
          popupType: "loading",
          
          // Reset other states
          sidebarVisible: false,
          section: "course-flyers",
          attendanceType: "",
          
          // Reset search state
          searchQuery: ''
        });
      } 
      catch (error) {
        console.log("Error in toggleCourseFlyersComponent:", error);
        // Error loading course flyers - popup removed
      }
    }

    // Handle selection for registration payments
    handleRegPaymentSearchFromChild = async (data) => {
      const oldValue = this.state.searchQuery;
      const userName = this.props.location.state?.name || 'User';
      this.setState({
        searchQuery: data
      });
      // Audit log for search filter change
      if (data !== oldValue) {
        logFilterChange({
          userName: userName,
          module: "Registration And Payment",
          filterType: "Search",
          oldValue: oldValue,
          newValue: data
        });
      }
    }

    handleClearRegPaymentFilters = () => {
      // Clear all filter state for Registration & Payment
      this.setState(
        {
          selectedLocation: '',
          selectedCourseType: '',
          selectedCourseName: '',
          selectedQuarter: '',
          searchQuery: '',
          regPaymentSearchQuery: ''
        },
        () => {
          // Trigger reset for SearchSection inputs
          this.setState({ resetSearch: true }, () => {
            this.setState({ resetSearch: false });
          });
        }
      );
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
          isFundraisingTableVisible: false,
          isFundraisingInventoryVisible: false, // Added this missing line
          isInventoryModulesVisible: false,
          isInventoryFormVisible: false,
          isAuditLogsVisible: false
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
      
      // Check for persisted approval queue on login
      const navEntries = (typeof performance !== 'undefined' && performance.getEntriesByType)
        ? performance.getEntriesByType('navigation')
        : [];
      const navType = navEntries && navEntries[0] ? navEntries[0].type : '';
      const isReload = navType === 'reload' || (performance.navigation && performance.navigation.type === 1);

      if (!isReload) {
        this.checkAndLoadPersistedQueue();
      }
    }

    // Add componentDidUpdate for state persistence
    componentDidUpdate(prevProps, prevState) {
      // Save state to localStorage whenever it changes (excluding certain volatile properties)
      const statesToSave = {
        ...this.state,
        resetSearch: false,

        // Exclude volatile/temporary states that shouldn't be persisted
        isPopupOpen: false,
        popupMessage: '',
        popupType: '',
        loading: false,
        pendingApproval: null,
        pendingApprovalQueue: null,
        approvalStatusPayload: null,
        shouldAutoOpenQueue: false, // Reset on every state update
        showingQueueDuringLogout: false,
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
      // Save a sanitized snapshot of state to local storage before the page unloads
      const sanitizedState = {
        ...this.state,
        resetSearch: false,
        isPopupOpen: false,
        popupMessage: '',
        popupType: '',
        loading: false,
        pendingApproval: null,
        pendingApprovalQueue: null
      };
      localStorage.setItem('myComponentState', JSON.stringify(sanitizedState));

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
            isFundraisingInventoryVisible: false, // Added this missing line
            isInventoryModulesVisible: false,
            isInventoryFormVisible: false,
            isAuditLogsVisible: false,
            
            // Set dashboard to true
            dashboard: true,
            
            // Reset search state in a single operation
            resetSearch: false
          });
        });
      } catch (error) {
        console.log(error);
        // Error loading dashboard - popup removed
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
            isFundraisingTableVisible: false,
            isFundraisingInventoryVisible: false, // Added this missing line
            isInventoryModulesVisible: false,
            isInventoryFormVisible: false,
            isAuditLogsVisible: false
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
            isFundraisingTableVisible: false,
            isFundraisingInventoryVisible: false, // Added this missing line
            isInventoryModulesVisible: false,
            isInventoryFormVisible: false,
            isAuditLogsVisible: false
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

    // Open Sales Report Modal
    openSalesReportModal = () => {
      this.setState({ isSalesReportModalOpen: true });
    };

    // Close Sales Report Modal
    closeSalesReportModal = () => {
      this.setState({ isSalesReportModalOpen: false });
    };

    // Open Payment Report Modal
    openPaymentReportModal = () => {
      this.setState({ isPaymentReportModalOpen: true });
    };

    // Close Payment Report Modal
    closePaymentReportModal = () => {
      this.setState({ isPaymentReportModalOpen: false });
    };

    // Open Fiscal Balance Report Modal
    openFiscalBalanceReportModal = () => {
      this.setState({ isFiscalBalanceReportModalOpen: true });
    };

    // Close Fiscal Balance Report Modal
    closeFiscalBalanceReportModal = () => {
      this.setState({ isFiscalBalanceReportModalOpen: false });
    };

    // Open Receipt Modal
    openReceiptModal = (receiptNumber, orderDetails = null) => {
      this.setState({
        showReceiptModal: true,
        selectedReceipt: receiptNumber,
        selectedOrderDetails: orderDetails
      });
    };

    // Close Receipt Modal
    closeReceiptModal = () => {
      this.setState({
        showReceiptModal: false,
        selectedReceipt: null,
        selectedOrderDetails: null
      });
    };

    // Open Invoice Modal
    openInvoiceModal = (invoiceNumber, orderData) => {
      this.setState({
        showInvoiceModal: true,
        invoiceModalData: { invoiceNumber, orderData }
      });
    };

    // Close Invoice Modal
    closeInvoiceModal = () => {
      this.setState({
        showInvoiceModal: false,
        invoiceModalData: { invoiceNumber: '', orderData: null }
      });
    };

    // Open Google Drive Upload Modal
    openGoogleDriveUploadModal = () => {
      this.setState({ showGoogleDriveUploadModal: true });
    };

    // Close Google Drive Upload Modal
    closeGoogleDriveUploadModal = () => {
      this.setState({ showGoogleDriveUploadModal: false });
    };

    // Open Google Drive View Modal
    openGoogleDriveViewModal = () => {
      this.setState({ showGoogleDriveViewModal: true });
    };

    // Close Google Drive View Modal
    closeGoogleDriveViewModal = () => {
      this.setState({ showGoogleDriveViewModal: false });
    };

    // NSA Approval Modal
    openApprovalPopup = (event, onConfirm, onCancel) => {
      this.setState({
        pendingApproval: {
          event,
          onConfirm: (reason, overrideNewValue) => { onConfirm(reason, overrideNewValue); this.setState({ pendingApproval: null }); },
          onCancel:  ()       => { onCancel();         this.setState({ pendingApproval: null }); },
        },
      });
    };

    openExportApprovalModal = (payload) => {
      this.setState({ exportApprovalPayload: payload || null });
    };

    closeExportApprovalModal = () => {
      this.setState({ exportApprovalPayload: null });
    };

    openSupervisorExportModal = (payload) => {
      this.setState({ supervisorExportPayload: payload || null });
    };

    closeSupervisorExportModal = () => {
      this.setState({ supervisorExportPayload: null });
    };

    openApprovalQueueModal = (payload) => {
      this.setState({ pendingApprovalQueue: payload || null });
    };

    openApprovalStatusModal = (payload) => {
      this.setState({ approvalStatusPayload: payload || null });
    };

    openNotifierQueueModal = (payload) => {
      this.setState({ notifierPayload: payload || null });
    };

    syncNotifierQueueModal = (changes) => {
      this.setState((prevState) => {
        if (!prevState.notifierPayload) return null;
        return {
          notifierPayload: {
            ...prevState.notifierPayload,
            changes: Array.isArray(changes) ? changes : [],
          },
        };
      });
    };

    closeNotifierQueueModal = () => {
      this.setState({ notifierPayload: null });
    };

    openRegistrationBulkUpdateModal = (payload) => {
      this.setState({ registrationBulkUpdatePayload: payload || null });
    };

    syncRegistrationBulkUpdateModal = (updates) => {
      this.setState((prevState) => {
        if (!prevState.registrationBulkUpdatePayload) return null;
        return {
          registrationBulkUpdatePayload: {
            ...prevState.registrationBulkUpdatePayload,
            ...(updates || {}),
          },
        };
      });
    };

    closeRegistrationBulkUpdateModal = () => {
      const payload = this.state.registrationBulkUpdatePayload;
      if (payload?.onClose) {
        payload.onClose();
      }
      this.setState({ registrationBulkUpdatePayload: null });
    };

    dismissRegistrationBulkUpdateModal = () => {
      this.setState({ registrationBulkUpdatePayload: null });
    };

    // handleValidationError = (validationErrors) => {
    //   if (!Array.isArray(validationErrors) || validationErrors.length === 0) {
    //     return;
    //   }

    //   // Get the first error for display in the modal
    //   const firstError = validationErrors[0];
    //   
    //   this.setState({
    //     isValidationErrorModalOpen: true,
    //     validationErrors,
    //     validationErrorDetails: {
    //       attemptedValue: firstError?.newPaymentStatus || '',
    //       currentPaymentStatus: firstError?.newPaymentStatus || '',
    //       currentRegistrationStatus: firstError?.currentRegistrationStatus || '',
    //     },
    //   });
    // };

    openBulkUpdateReasonModal = () => {
      this.setState({ showBulkUpdateReasonModal: true });
    };

    closeBulkUpdateReasonModal = () => {
      this.setState({
        showBulkUpdateReasonModal: false,
        bulkUpdateReason: '',
        bulkUpdateReasonContext: null,
      });
    };

    submitBulkUpdateReason = (reason) => {
      const context = this.state.bulkUpdateReasonContext || {};
      if (context.onReasonSubmit) {
        context.onReasonSubmit(reason);
      }
      this.closeBulkUpdateReasonModal();
    };

    // Open bulk order modal and start loading
    openBulkOrderModal = async () => {
      console.log("Opening bulk order modal and starting to load data...");
      this.setState({ isBulkOrderModalOpen: true, bulkOrderLoading: true, bulkOrderError: null });
      
      try {
        const response = await axios.post(
          `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/fundraising`,
          { purpose: 'bulk' }
        );


        if (response.data.result.success) {
          this.setState({
            bulkOrderData: response.data.result.data,
            bulkOrderLoading: false,
            bulkOrderError: ''
          });
        } else {
          this.setState({
            bulkOrderError: response.data.result?.message || 'Failed to fetch bulk order data',
            bulkOrderLoading: false
          });
        }
      } catch (error) {
        this.setState({
          bulkOrderError: error.response?.data?.result?.message || 'Error fetching bulk order data: ' + error.message,
          bulkOrderLoading: false
        });
      }
    };

    // Close bulk order modal
    closeBulkOrderModal = () => {
      this.setState({ isBulkOrderModalOpen: false, bulkOrderData: null, bulkOrderError: null });
    };

    // Open Items Modal for Fundraising Orders
    openItemsModal = (items, rowData, wooCommerceProductDetails) => {
      this.setState({
        showItemsModal: true,
        selectedItems: items,
        selectedRowData: rowData,
        wooCommerceProductDetails: wooCommerceProductDetails
      }, () => {
        console.log('setState callback - State updated:', {
          showItemsModal: this.state.showItemsModal,
          selectedItems: this.state.selectedItems,
          selectedRowData: this.state.selectedRowData,
          wooCommerceProductDetails: this.state.wooCommerceProductDetails
        });
        console.log('========== openItemsModal COMPLETE ==========');
      });
    };

    // Close Items Modal
    closeItemsModal = () => {
      this.setState({
        showItemsModal: false,
        selectedItems: [],
        selectedRowData: null
      });
    };

    openBulkUpdateModal = (selectedCount, selectedRows = []) => {
      this.setState({
        showBulkUpdateModal: true,
        bulkUpdateSelectedCount: selectedCount,
        bulkUpdateSelectedRows: selectedRows
      });
    };

    closeBulkUpdateModal = () => {
      // First, close the modal in the parent component (homePage)
      this.setState({
        showBulkUpdateModal: false
      });
      
      // Then call FundraisingOrders's closeBulkUpdateModal to reset checkboxes
      if (this.fundraisingTableRef?.current?.closeBulkUpdateModal) {
        this.fundraisingTableRef.current.closeBulkUpdateModal();
      }
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
            isFundraisingTableVisible: false,
            isFundraisingInventoryVisible: false, // Added this missing line
            isInventoryModulesVisible: false,
            isInventoryFormVisible: false,
            isAuditLogsVisible: false
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
              isFundraisingTableVisible: false,
              isFundraisingInventoryVisible: false, // Added this missing line
              isInventoryModulesVisible: false,
              isInventoryFormVisible: false,
              isAuditLogsVisible: false
              //viewMode: "full"
          }));
      }
    }

    getTotalNumberofDetails = async (total) =>
    {
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

  checkAndLoadPersistedQueue = () => {
    if (this.hasPersistedApprovalQueue()) {
      // ONLY set shouldAutoOpenQueue on login, NOT on page refresh
      // The refresh detection in componentDidMount prevents this from being called on refresh
      this.setState({
        isPopupOpen: false,
        popupMessage: '',
        popupType: '',
        isRegistrationPaymentVisible: true,
        section: "registration",
        sidebarVisible: false,
        courseType: "",
        accountType: null,
        createAccount: false,
        isReceiptVisible: false,
        item: "Registration & Payment Table",
        attendanceVisibility: false,
        isMembershipVisible: false,
        isFitnessVisible: false,
        isFundraisingTableVisible: false,
        isFundraisingInventoryVisible: false,
        isInventoryModulesVisible: false,
        isInventoryFormVisible: false,
        isAuditLogsVisible: false,
        shouldAutoOpenQueue: true, // Only set on login (after refresh check)
      });
    }
  }

  handleLoginQueueDecision = (action) => {
    if (action === 'open') {
      // Navigate to Registration & Payment and auto-open the queue modal
      this.setState({
        isPopupOpen: false,
        popupMessage: '',
        popupType: '',
        isRegistrationPaymentVisible: true,
        section: "registration",
        shouldAutoOpenQueue: true,
        sidebarVisible: false,
        courseType: "",
        accountType: null,
        createAccount: false,
        isReceiptVisible: false,
        item: "Registration And Payment Table",
        attendanceVisibility: false,
        isMembershipVisible: false,
        isFitnessVisible: false,
        isFundraisingTableVisible: false,
        isFundraisingInventoryVisible: false,
        isInventoryModulesVisible: false,
        isInventoryFormVisible: false,
        isAuditLogsVisible: false
      });
    } else {
      // User clicked "Later" - just close the popup and proceed normally
      this.setState({
        isPopupOpen: false,
        popupMessage: '',
        popupType: '',
        shouldAutoOpenQueue: false
      });
    }
  }

  getApprovalQueueStorageKey = () => {
    const email = (this.props.location.state?.email || 'unknown').toLowerCase();
    return `registrationApprovalQueue:${email}`;
  }

  hasPersistedApprovalQueue = () => {
    try {
      const raw = localStorage.getItem(this.getApprovalQueueStorageKey());
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch (_) {
      return false;
    }
  }

  clearPersistedApprovalQueue = () => {
    localStorage.removeItem(this.getApprovalQueueStorageKey());
  }

  logOut = async() =>
  {   
    // Check for queue FIRST before showing logout confirmation
    if (this.hasPersistedApprovalQueue()) {
      const count = (() => {
        try {
          const raw = localStorage.getItem(this.getApprovalQueueStorageKey());
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.length : 0;
        } catch (_) { return 0; }
      })();
      // Show the store-or-clear choice popup instead of the full queue modal
      this.setState({
        isPopupOpen: true,
        popupMessage: `You have ${count} pending approval request${count !== 1 ? 's' : ''} in the queue.`,
        popupType: 'logout-queue-choice',
        isDropdownOpen: false,
      });
      return;
    }
    
    // If no queue, show logout confirmation
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
    
    // Check for queue when inactivity detected
    if (this.hasPersistedApprovalQueue()) {
      // Show the full queue modal instead of small decision popup
      this.openLogoutQueueModal();
      return;
    }
    
    // If no queue, show inactivity popup
    this.setState({
      isPopupOpen: true,
      popupMessage: "",
      popupType: "no-activity"
    });
  };

  // This method can be called to reset the inactivity state
  resetInactivity = () => {
    // Throttle: Only update if inactive is true (avoid constant setState)
    if (this.state.isInactive === true) {
      this.setState({ isInactive: false });
    }
    
    //console.log('User is active again. Resetting inactivity timer.');
    clearTimeout(this.inactivityTimeout); // Clear the timeout if user becomes active

    // Restart the inactivity timeout
    //this.inactivityTimeout = setTimeout(this.noActivityDetected, 10000); // 1 minute*/
    this.inactivityTimeout = setTimeout(this.noActivityDetected, 15*60*1000); // 1 minute*/
  };

  handleQueueDecisionContinue = () => {
    // Keep queue in localStorage
    this.setState({
      showQueueDecisionPopup: false,
      queueDecisionContext: null
    }, () => {
      // Show logout confirmation after decision
      this.setState({
        isPopupOpen: true,
        popupMessage: "Are you sure that you want to log out?",
        popupType: "logout",
      });
    });
  }

  handleQueueDecisionClear = () => {
    // Clear queue before logout
    this.clearPersistedApprovalQueue();
    this.setState({
      showQueueDecisionPopup: false,
      queueDecisionContext: null
    }, () => {
      // Show logout confirmation after decision
      this.setState({
        isPopupOpen: true,
        popupMessage: "Are you sure that you want to log out?",
        popupType: "logout",
      });
    });
  }

  // Handlers for queue modal shown during logout
  handleQueueCloseFromLogout = () => {
    // Close queue modal and proceed to logout confirmation
    this.setState({
      pendingApprovalQueue: null,
      showingQueueDuringLogout: false
    }, () => {
      // Show logout confirmation
      this.setState({
        isPopupOpen: true,
        popupMessage: "Are you sure that you want to log out?",
        popupType: "logout",
      });
    });
  }

  handleQueueSendEmailFromLogout = () => {
    // Send approval email from logout queue
    // Get the current queue
    const queueData = JSON.parse(localStorage.getItem(this.getApprovalQueueStorageKey()));
    
    // TODO: Send email logic here if needed
    
    // Clear queue and proceed to logout
    this.clearPersistedApprovalQueue();
    this.setState({
      pendingApprovalQueue: null,
      showingQueueDuringLogout: false
    }, () => {
      // Show logout confirmation
      this.setState({
        isPopupOpen: true,
        popupMessage: "Are you sure that you want to log out?",
        popupType: "logout",
      });
    });
  }

  handleQueueRemoveFromLogout = (index) => {
    // Remove item from queue during logout
    const queueData = JSON.parse(localStorage.getItem(this.getApprovalQueueStorageKey()));
    if (Array.isArray(queueData)) {
      queueData.splice(index, 1);
      if (queueData.length > 0) {
        localStorage.setItem(this.getApprovalQueueStorageKey(), JSON.stringify(queueData));
      } else {
        this.clearPersistedApprovalQueue();
      }
    }
    
    // Update the modal with new queue data
    this.openLogoutQueueModal();
  }

  handleQueueUpdateReasonFromLogout = (index, reason) => {
    // Update reason for queue item during logout
    const queueData = JSON.parse(localStorage.getItem(this.getApprovalQueueStorageKey()));
    if (Array.isArray(queueData) && queueData[index]) {
      queueData[index].reason = reason;
      localStorage.setItem(this.getApprovalQueueStorageKey(), JSON.stringify(queueData));
    }
  }

  openLogoutQueueModal = () => {
    // Open the full queue modal for logout context
    const queueData = JSON.parse(localStorage.getItem(this.getApprovalQueueStorageKey())) || [];
    this.setState({
      pendingApprovalQueue: {
        queue: queueData,
        onSendEmail: this.handleQueueSendEmailFromLogout,
        onClose: this.handleQueueCloseFromLogout,
        onRemove: this.handleQueueRemoveFromLogout,
        onUpdateReason: this.handleQueueUpdateReasonFromLogout
      },
      showingQueueDuringLogout: true
    });
  }

  goBackHome = async(queueDecision = null) =>
  {
    if (queueDecision && typeof queueDecision === 'object' && typeof queueDecision.preventDefault === 'function') {
      queueDecision = null;
    }

    // If queue decision is made (from logout-queue-choice popup)
    if (queueDecision === 'clear') {
      this.clearPersistedApprovalQueue();
    }

    if (queueDecision) {
      // After handling queue decision, show logout confirmation
      this.setState({
        isPopupOpen: true,
        popupMessage: "Are you sure that you want to log out?",
        popupType: "logout",
      });
      return;
    }

    // If we reach here, it's the final logout confirmation (popupType === "logout")
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

   closePopupMessage = async (success, message) => {
        // Close the current popup
        this.setState({
            isPopupOpen: false
        }, () => {
            // Show feedback message if provided
            if (message) {
                const messageType = success ? "success-message" : "error-message";
                this.setState({
                    isPopupOpen: true,
                    popupMessage: message,
                    popupType: messageType
                });
                
                // Auto-close the feedback message after 3 seconds
                setTimeout(() => {
                    this.setState({ isPopupOpen: false });
                }, 3000);
            }
            
            // Refresh child components to show updated data
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

    successPopUpMessage = async(message) =>
    {
        this.setState({
          isPopupOpen: true,
          popupMessage: message,
          popupType: "success-message",
        });
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
      const isCompletionMsg = /all updates completed|approval request sent|sent to|updated successfully/i.test(item);
      this.setState({
        isPopupOpen: true,
        popupMessage: item,
        popupType: isCompletionMsg ? "success-message" : "loading",
        isUpdating: !isCompletionMsg,
      });
      if (isCompletionMsg) {
        setTimeout(() => {
          this.setState({ isPopupOpen: false, popupMessage: '', popupType: '', isUpdating: false });
        }, 2500);
      }
    }

    closeRegPaymentPopup = () => {
      if (this.state.isUpdating) {
        this.setState({
          popupMessage: 'Update completed successfully',
          popupType: 'success-message',
          isUpdating: false,
        });
        setTimeout(() => {
          this.setState({ isPopupOpen: false, popupMessage: '', popupType: '' });
        }, 2000);
      } else {
        this.closePopup();
      }
    };

    showPaymentRegistrationStatusModal = (data) => {
      console.log('🔴 [Payment/Registration Status Validation Error]', data);
      this.setState({
        isPaymentRegistrationStatusModalOpen: true,
        paymentRegistrationStatusModalData: {
          errorType: data.errorType || 'payment_status_change',
          attemptedValue: data.attemptedValue || '',
          currentPaymentStatus: data.currentPaymentStatus || '',
          currentRegistrationStatus: data.currentRegistrationStatus || '',
        },
      });
    };

    // ── Update progress tracker (multi-step modal for R&P table) ──────────────

    _progressStart = (stepLabels) => {
      this._progressSequence += 1;
      this._progressStartedAt = Date.now();
      if (this._progressCloseTimer) {
        clearTimeout(this._progressCloseTimer);
        this._progressCloseTimer = null;
      }
      if (this._progressStepTimer) {
        clearTimeout(this._progressStepTimer);
        this._progressStepTimer = null;
      }

      const labels = Array.isArray(stepLabels)
        ? stepLabels.map((label) => String(label || '').trim()).filter(Boolean)
        : [];

      if (labels.length === 0) {
        this.setState((prev) => ({
          updateProgress: {
            show: false,
            steps: [],
            receiptData: prev.updateProgress?.receiptData ?? null,
          },
        }));
        return;
      }

      flushSync(() => {
        this.setState((prev) => ({
          updateProgress: {
            receiptData: null,
            show: true,
            steps: labels.map((label, i) => ({
              label,
              status: i === 0 ? 'running' : 'pending',
            })),
          },
        }));
      });
    };

    _progressAdvance = () => {
      flushSync(() => {
        this.setState((prev) => {
          const steps = (prev.updateProgress?.steps || []).map((s) => ({ ...s }));
          const runningIdx = steps.findIndex((s) => s.status === 'running');
          if (runningIdx >= 0) steps[runningIdx].status = 'done';
          const nextIdx = steps.findIndex((s, i) => i > runningIdx && s.status === 'pending');
          if (nextIdx >= 0) steps[nextIdx].status = 'running';
          return {
            updateProgress: {
              ...prev.updateProgress,
              show: true,
              steps,
            },
          };
        });
      });
    };

    _progressFinish = (receiptData = null, options = {}) => {
      const { immediateClose = false } = options;
      const seq = this._progressSequence;
      const MIN_VISIBLE_MS = 2200;
      const STEP_ANIMATION_MS = 320;

      const runStepCompletion = () => {
        if (seq !== this._progressSequence) return;

        let hasMoreWork = false;
        flushSync(() => {
          this.setState((prev) => {
            const steps = (prev.updateProgress?.steps || []).map((s) => ({ ...s }));
            if (!steps.length) return prev;

            const runningIdx = steps.findIndex((s) => s.status === 'running');
            if (runningIdx >= 0) {
              steps[runningIdx].status = 'done';
            }

            const nextPendingIdx = steps.findIndex((s) => s.status === 'pending');
            if (nextPendingIdx >= 0) {
              steps[nextPendingIdx].status = 'running';
              hasMoreWork = true;
            }

            return {
              updateProgress: {
                ...prev.updateProgress,
                show: true,
                steps,
              },
            };
          });
        });

        if (hasMoreWork) {
          this._progressStepTimer = setTimeout(runStepCompletion, STEP_ANIMATION_MS);
          return;
        }

        const elapsed = Date.now() - this._progressStartedAt;
        // Use passed receiptData parameter (which was set just before calling finish)
        const hasReceipt = Boolean(receiptData || this.state.updateProgress?.receiptData);

        if (hasReceipt && receiptData) {
          // Store receipt data in state BEFORE triggering download/preview
          this.setState((prev) => ({
            updateProgress: {
              ...prev.updateProgress,
              receiptData,
            },
          }), () => {
            // Imperatively trigger download + preview after a short delay so the
            // final step animation is visible before the actions fire.
            setTimeout(() => {
              if (seq !== this._progressSequence) return;
              this._progressDownloadReceipt();
              this._progressPreviewReceipt();
            }, 400);
          });
        } else if (hasReceipt) {
          // Receipt data already in state, just trigger download/preview
          setTimeout(() => {
            if (seq !== this._progressSequence) return;
            this._progressDownloadReceipt();
            this._progressPreviewReceipt();
          }, 400);
        }

        const closeDelay = immediateClose ? 0 : (hasReceipt ? 4000 : Math.max(600, MIN_VISIBLE_MS - elapsed));
        this._progressCloseTimer = setTimeout(() => {
          if (seq !== this._progressSequence) return;
          this.setState((prev) => ({
            updateProgress: {
              ...prev.updateProgress,
              show: false,
              steps: [],
            },
          }));
        }, closeDelay);
      };

      runStepCompletion();
    };

    _progressError = () => {
      if (this._progressCloseTimer) {
        clearTimeout(this._progressCloseTimer);
        this._progressCloseTimer = null;
      }
      if (this._progressStepTimer) {
        clearTimeout(this._progressStepTimer);
        this._progressStepTimer = null;
      }
      this.setState((prev) => ({
        updateProgress: {
          ...prev.updateProgress,
          show: false,
          steps: [],
          receiptData: null,
        },
      }));
    };

    getProgressTracker = () => ({
      start:   this._progressStart,
      advance: this._progressAdvance,
      finish:  (receiptData, options) => this._progressFinish(receiptData, options),
      error:   this._progressError,
      setReceiptData: this._progressSetReceiptData,
    });

    _progressClose = () => {
      this.setState({ updateProgress: { show: false, steps: [], receiptData: null } });
    };

    _progressSetReceiptData = (receiptData) => {
      this.setState((prev) => ({
        updateProgress: {
          ...prev.updateProgress,
          receiptData,
        },
      }));
    };

    _progressPreviewReceipt = () => {
      const receiptData = this.state.updateProgress?.receiptData;
      if (!receiptData || !receiptData.blob) {
        console.warn('No receipt data available for preview');
        return;
      }

      try {
        const blobUrl = window.URL.createObjectURL(receiptData.blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          console.warn('Popup blocked: Please allow popups to view the PDF receipt');
          alert('Popup blocked. Please allow popups in your browser settings.');
        }
      } catch (error) {
        console.error('Error previewing receipt:', error);
        alert('Error opening preview. Please try again.');
      }
    };

    _progressDownloadReceipt = () => {
      const receiptData = this.state.updateProgress?.receiptData;
      if (!receiptData || !receiptData.blob) {
        console.warn('No receipt data available for download');
        return;
      }

      try {
        const blobUrl = window.URL.createObjectURL(receiptData.blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = receiptData.filename || 'receipt.pdf';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup: revoke URL and remove element after download
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
          document.body.removeChild(a);
        }, 100);
      } catch (error) {
        console.error('Error downloading receipt:', error);
        alert('Error downloading file. Please try again.');
      }
    };

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

    // Handle fundraising filter selection (payment method, collection location, status)
    handleFundraisingSelectFromChild = (updateState, dropdown) => {
      console.log("Selected Fundraising Filter:", updateState, dropdown);
      
      if (dropdown === 'showPaymentMethodDropdown') {
        this.setState({
          fundraisingPaymentMethod: updateState.paymentMethod || updateState.fundraisingPaymentMethod
        });
      } else if (dropdown === 'showCollectionLocationDropdown') {
        this.setState({
          fundraisingCollectionLocation: updateState.collectionLocation || updateState.fundraisingCollectionLocation
        });
      } else if (dropdown === 'showStatusDropdown') {
        this.setState({
          fundraisingStatus: updateState.status || updateState.fundraisingStatus
        });
      }
    };

    // Add method to receive fundraising filter options from FundraisingTable
    handleFundraisingFiltersLoaded = (paymentMethods, collectionLocations, statuses) => {
      console.log("Received payment methods:", paymentMethods);
      console.log("Received collection locations:", collectionLocations);
      console.log("Received statuses:", statuses);
      
      this.setState({
        fundraisingPaymentMethods: paymentMethods || ['All Payment Methods'],
        // fundraisingCollectionModes: collectionModes || ['All Collection Modes'],
        fundraisingCollectionLocations: collectionLocations || ['All Collection Locations'],
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

    // Handler for course link search query from child components
    handleCourseLinkSearchFromChild = (searchQuery) => {
      console.log('Course link search query:', searchQuery);
      this.setState({
        courseLinkSearchQuery: searchQuery,
        searchQuery: searchQuery
      });
    };

    // Handler for course link filter selection (location, category)
    handleCourseLinkSelectFromChild = (updateState, dropdown) => {
      console.log("Selected Course Link Filter:", updateState, dropdown);
      
      if (dropdown === 'showLocationDropdown') {
        this.setState({
          courseLinkLocation: updateState.centreLocation || updateState.courseLinkLocation
        });
      } else if (dropdown === 'showCategoryDropdown') {
        this.setState({
          courseLinkCategory: updateState.category || updateState.courseLinkCategory
        });
      }
    };

    // Handler to receive course link filter options
    handleCourseLinkFiltersLoaded = (locations, categories) => {
      console.log("Received course link locations:", locations);
      console.log("Received course link categories:", categories);
      
      this.setState({
        courseLinkLocations: locations || ['All Locations'],
        courseLinkCategories: categories || ['All Categories']
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
        case 'course-coordinator-report':
          this.toggleReportComponent('Course Coordinator Report');
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
        case 'fundraising-orders':
          this.toggleFundraisingOrdersComponent();
          break;
        case 'fundraising-inventory':
          this.toggleFundraisingInventoryComponent();
          break;
        case 'inventory-modules':
          this.toggleInventoryModulesComponent();
          break;
        case 'inventory-form':
          this.toggleInventoryFormComponent();
          break;
        case 'inventory-records':
          this.toggleInventoryRecordsComponent();
          break;
        case 'inventory-invoices':
          this.toggleInventoryInvoicesComponent();
          break;
        case 'audit-logs':
          this.toggleAuditLogsComponent();
          break;
        case 'view-course-flyers':
          this.toggleCourseFlyersComponent();
          break;
        case 'course-link':
          this.toggleCourseLinkComponent();
          break;
        default:
          console.log('Navigation section not found:', section);
      }
    };

    // Handle home navigation to reset to Welcome Section
    toggleHomeComponent = () => {
      console.log("Navigating to Home - showing Welcome Section only");
      
      this.setState({
        accountType: null,
        courseType: null,
        isRegistrationPaymentVisible: false,
        createAccount: false,
        reportVisibility: false,
        dashboard: false,
        attendanceVisibility: false,
        isMembershipVisible: false,
        isFitnessVisible: false,
        isFundraisingTableVisible: false,
        isFundraisingInventoryVisible: false,
        isInventoryModulesVisible: false,
        isInventoryFormVisible: false,
        isCourseFlyersVisible: false,
        isReceiptVisible: false,
        isCourseLinkVisible: false,
        isAuditLogsVisible: false,
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
      const rawUserEmail = this.props.location.state?.email || '';
      const normalizedName = String(userName || '').trim().toLowerCase();
      const fallbackEmailByName = {
        'testing a': 'testinga@ecss.org.sg',
        'testinga': 'testinga@ecss.org.sg',
        'testing b': 'testingb@ecss.org.sg',
        'testingb': 'testingb@ecss.org.sg',
        'lee xuan yao moses': 'mossleegermany@gmail.com',
        'lee xuan yao moseds': 'mossleegermany@gmail.com',
      };
      const userEmail = rawUserEmail || fallbackEmailByName[normalizedName] || '';
      const {membershipType, membershipTypes, membershipSearchQuery, isMembershipVisible, isFitnessVisible, fitnessSearchQuery, isCourseFlyersVisible, isCourseLinkVisible, isFundraisingTableVisible, isFundraisingInventoryVisible, isInventoryModulesVisible, isInventoryFormVisible, isAuditLogsVisible, inventoryTab, fundraisingSearchQuery, fundraisingPaymentMethod, fundraisingCollectionLocation, fundraisingStatus, fundraisingPaymentMethods, fundraisingCollectionLocations, fundraisingStatuses, showCalendarModal, selectedOrderForCalendar, collectionSchedule, attendanceVisibility, reportType, reportVisibility, participantInfo, status, item, isDropdownOpen, isReceiptVisible, dashboard, displayedName, submenuVisible, language, courseType, accountType, isPopupOpen, popupMessage, popupType, sidebarVisible, locations, languages, types, selectedLanguage, selectedLocation, selectedCourseType, searchQuery, resetSearch, viewMode, currentPage, totalPages, nofCourses,noofDetails, isRegistrationPaymentVisible, section, roles, selectedAccountType, nofAccounts, createAccount, names, selectedCourseName, courseInfo, selectedQuarter, quarters, attendanceFilterType, attendanceFilterCode, attendanceFilterLocation, attendanceSearchQuery, attendanceTypes, activityCodes, attendanceLocations, isSalesReportModalOpen, isPaymentReportModalOpen, isFiscalBalanceReportModalOpen, showItemsModal, selectedItems, selectedRowData, wooCommerceProductDetails, showReceiptModal, selectedReceipt, showInvoiceModal, invoiceModalData} = this.state;

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
                  toggleFundraisingOrdersComponent = {this.toggleFundraisingOrdersComponent}
                  toggleFundraisingInventoryComponent = {this.toggleFundraisingInventoryComponent}
                  toggleInventoryModulesComponent = {this.toggleInventoryModulesComponent}
                  toggleInventoryFormComponent = {this.toggleInventoryFormComponent}
                  toggleInventoryRecordsComponent = {this.toggleInventoryRecordsComponent}
                  toggleInventoryInvoicesComponent = {this.toggleInventoryInvoicesComponent}
                  toggleCourseflyersComponent = {this.toggleCourseFlyersComponent}
                  toggleCourseLinkComponent = {this.toggleCourseLinkComponent}
                  toggleAuditLogsComponent = {this.toggleAuditLogsComponent}
                  onAccessRightsUpdate = {this.handleAccessRightsData}
                  key={this.state.refreshKey}
                />
              </div>
              <div className="main-content">
              {/* Default Welcome Section - shows when no other section is active */}
              {/* Course Flyers must NOT be seen with any section home page - enforced via explicit condition */}
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
                isInventoryModulesVisible === false &&
                isInventoryFormVisible === false &&
                isCourseFlyersVisible === false &&
                isReceiptVisible === false &&
                isCourseLinkVisible === false &&
                isAuditLogsVisible === false &&
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
                        refreshKey={this.state.refreshKey}
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
                       {/* <div className="search-section">
                            <Search
                              section={section}
                              language={language}
                              resetSearch={resetSearch}
                              passSearchedValueToParent={this.handleFitnessSearchFromChild}
                            />
                        </div>*/}
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
                {isAuditLogsVisible && 
                    <>
                          <AuditLogsSection 
                            section={section}
                            userName={userName}
                            role={role}
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
                              // fundraisingCollectionModes={fundraisingCollectionModes}
                              fundraisingCollectionLocations={fundraisingCollectionLocations}
                              fundraisingStatuses={fundraisingStatuses}
                            />
                        </div>
                        <div className="fundraising-section">
                          <FundraisingOrders
                            ref={this.fundraisingTableRef}
                            section={section}
                            userName={userName}
                            role={role}
                            siteIC={siteIC}
                            closePopup1={this.closePopup}
                            language={language}
                            key={this.state.refreshKey}
                            refreshChild={this.refreshChild}
                            onDataLoaded={this.closePopup}
                            isVisible={isFundraisingTableVisible}
                            paymentMethod={fundraisingPaymentMethod}
                            // collectionMode={fundraisingCollectionMode}
                            collectionLocation={fundraisingCollectionLocation}
                            status={fundraisingStatus}
                            searchQuery={fundraisingSearchQuery}
                            onFiltersLoaded={this.handleFundraisingFiltersLoaded}
                            openCalendarModal={this.openCalendarModal}
                            openSalesReportModal={this.openSalesReportModal}
                            openPaymentReportModal={this.openPaymentReportModal}
                            openFiscalBalanceReportModal={this.openFiscalBalanceReportModal}
                            openBulkOrderModal={this.openBulkOrderModal}
                            openItemsModal={this.openItemsModal}
                            openReceiptModal={this.openReceiptModal}
                            openInvoiceModal={this.openInvoiceModal}
                            closeInvoiceModal={this.closeInvoiceModal}
                            openGoogleDriveUploadModal={this.openGoogleDriveUploadModal}
                            openGoogleDriveViewModal={this.openGoogleDriveViewModal}
                            openBulkUpdateModal={this.openBulkUpdateModal}
                            onDownloadReceipts={this.handleDownloadReceipts}
                          />
                        </div>
                        
                        {/* Calendar Modal for Fundraising */}
                        {console.log('Calendar render check - showCalendarModal:', showCalendarModal, 'selectedOrderForCalendar:', selectedOrderForCalendar)}
                        <CollectionDateCalendar
                          showCalendarModal={showCalendarModal}
                          selectedOrderForCalendar={selectedOrderForCalendar}
                          collectionSchedule={collectionSchedule}
                          onDateSelect={this.handleDateSelect}
                          onClose={this.closeCalendarModal}
                        />
                    </>
                }             
                {isFundraisingInventoryVisible && 
                <>
                  <div className="search-section">
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
                {isInventoryModulesVisible && 
                <>
                  <div className="search-section">
                    </div>
                    <div className="inventory-modules-section">
                      <InventoryModules 
                        section={section}
                        userName={userName}
                        role={role}
                        siteIC={siteIC}
                        closePopup1={this.closePopup}
                        language={language}
                        key={this.state.refreshKey}
                        refreshChild={this.refreshChild}
                        onDataLoaded={this.closePopup}
                        initialTab={inventoryTab}
                        inventoryRefreshCounter={this.state.inventoryRefreshCounter}
                      />
                    </div>
                  </>
                }
                {/* Course Flyers section - must be isolated and not shown with any other section home page */}
                {isCourseFlyersVisible && 
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
                      <div className="search-section">
                      </div>
                      <div className="course-flyers-section-container">
                        <CourseFlyers
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
                )
                }
                {/* Course Link section - must be isolated and not shown with any other section home page */}
                {isCourseLinkVisible && 
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
                    isCourseFlyersVisible === false &&
                    (
                    <>
                      <div className="search-section">
                        <Search
                          section="courselinks"
                          language={language}
                          courseLinkLocations={this.state.courseLinkLocations}
                          courseLinkCategories={this.state.courseLinkCategories}
                          passSelectedValueToParent={this.handleCourseLinkSelectFromChild}
                          passSearchedValueToParent={this.handleCourseLinkSearchFromChild}
                        />
                      </div>
                      <div className="course-link-section-container">
                        <CourseLink
                          section={section}
                          userName={userName}
                          role={role}
                          siteIC={siteIC}
                          closePopup1={this.closePopup}
                          language={language}
                          key={this.state.refreshKey}
                          refreshChild={this.refreshChild}
                          onDataLoaded={this.closePopup}
                          onFiltersLoaded={this.handleCourseLinkFiltersLoaded}
                          passSelectedValueToParent={this.handleCourseLinkSelectFromChild}
                          passSearchedValueToParent={this.handleCourseLinkSearchFromChild}
                          courseLinkSearchQuery={this.state.courseLinkSearchQuery}
                          courseLinkLocation={this.state.courseLinkLocation}
                          courseLinkCategory={this.state.courseLinkCategory}
                        />
                        <BulkDownloadProgress />
                      </div>
                    </>
                )
                }             
                { isRegistrationPaymentVisible&& 
                  <>
                  <div className="search-section registration-payment-search-section">
                      <Search
                        locations={locations}
                        types={types}
                        courses={names}
                        quarters={quarters}
                        selectedCourseType={selectedCourseType}
                        selectedLocation={selectedLocation}
                        selectedQuarter={selectedQuarter}
                        selectedCourseName={selectedCourseName}
                        selectedSearchQuery={searchQuery}
                        role={role}
                        userEmail={userEmail}
                        userName={userName}
                        resetSearch={resetSearch}
                        section={section}
                        passSelectedValueToParent={this.handleRegPaymentSelectFromChild}
                        passSearchedValueToParent={this.handleRegPaymentSearchFromChild}
                        onClearFilters={this.handleClearRegPaymentFilters}
                        item={item}
                      />
                    </div>
                    <div className="registration-payment-section">
                    <RegistrationPaymentSection 
                        closePopup={this.closeRegPaymentPopup}
                        openLoadingPopup={() => this.setState({ isPopupOpen: true, popupMessage: 'Loading In Progress', popupType: 'loading' })}
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
                        userEmail = {userEmail}
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
                        onClearFilters = {this.handleClearRegPaymentFilters}
                        closePopupMessage = {this.closePopupMessage}
                        generateDeleteConfirmationPopup = {this.generateDeleteConfirmationPopup}
                        generatePortOverConfirmationPopup = {this.generatePortOverConfirmationPopup}
                        onPendingExportApproval={this.openExportApprovalModal}
                        onSupervisorExportConfirm={this.openSupervisorExportModal}
                        generateSendDetailsConfirmationPopup={this.generateSendDetailsConfirmationPopup}
                        onApprovalRequired={this.openApprovalPopup}
                        onApprovalQueueRequired={this.openApprovalQueueModal}
                        onApprovalStatusRequired={this.openApprovalStatusModal}
                        onNotifierQueueRequired={this.openNotifierQueueModal}
                        onNotifierQueueSync={this.syncNotifierQueueModal}
                        onBulkUpdateModalRequired={this.openRegistrationBulkUpdateModal}
                        onBulkUpdateModalSync={this.syncRegistrationBulkUpdateModal}
                        onBulkUpdateModalDismiss={this.dismissRegistrationBulkUpdateModal}
                        shouldAutoOpenQueue={this.state.shouldAutoOpenQueue}
                        progressModalOpen={Boolean(this.state.updateProgress?.show)}
                        progressTracker={this.getProgressTracker()}
                        onAnomalyDetected={(list) => this.setState({ showAnomalyModal: true, anomalyList: list })}
                        onAnomalyListChanged={(list) => this.setState({ anomalyList: list })}
                        onOpenAnomalyModal={() => this.setState({ showAnomalyModal: true })}
                        showPaymentRegistrationStatusModal={this.showPaymentRegistrationStatusModal}
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
          <ApprovalQueueDecisionPopup 
            isOpen={this.state.showQueueDecisionPopup}
            queueCount={this.state.queueItemCount}
            onContinueStore={this.handleQueueDecisionContinue}
            onClearLogout={this.handleQueueDecisionClear}
          />
          <Popup isOpen={isPopupOpen} message={popupMessage} userName={userName} type={popupType} participantInfo={participantInfo} status={status} courseInfo={courseInfo} closePopup={this.closePopup} closePopup2={this.closePopup2} goBackLoginPage={this.goBackHome} closePopupMessage={this.closePopupMessage} id = {this.state.deleteId} onLoginQueueDecision={this.handleLoginQueueDecision}/>
          <UpdateProgressModal
            isOpen={this.state.updateProgress?.show ?? false}
            steps={this.state.updateProgress?.steps ?? []}
          />
          <SalesReportModal 
            isOpen={isSalesReportModalOpen}
            onClose={this.closeSalesReportModal}
            userRole={role}
            fundraisingData={this.fundraisingTableRef?.current?.state?.fundraisingData || []}
          />
          <PaymentReportModal 
            isOpen={isPaymentReportModalOpen}
            onClose={this.closePaymentReportModal}
            fundraisingData={this.fundraisingTableRef?.current?.state?.fundraisingData || []}
          />
          <FiscalBalanceReportModal 
                isOpen={isFiscalBalanceReportModalOpen}
                onClose={this.closeFiscalBalanceReportModal}
                fundraisingData={this.fundraisingTableRef?.current?.state?.fundraisingData || []}
                wooCommerceProductDetails={this.fundraisingTableRef?.current?.state?.wooCommerceProductDetails || []}
          />
            <BulkOrderModal 
                 isOpen={this.state.isBulkOrderModalOpen}
                  onClose={this.closeBulkOrderModal}
                  loading={this.state.bulkOrderLoading}
                  error={this.state.bulkOrderError}
                  backendData={this.state.bulkOrderData}
            />
          <FundraisingOrderItemsModal
            isOpen={showItemsModal}
            onClose={this.closeItemsModal}
            selectedItems={selectedItems}
            selectedRowData={selectedRowData}
            wooCommerceProductDetails={wooCommerceProductDetails}
          />
          <ReceiptModal
            isOpen={showReceiptModal}
            receiptNumber={selectedReceipt}
            onClose={this.closeReceiptModal}
            receiptUrl={null}
            orderDetails={this.state.selectedOrderDetails}
          />
          <InvoiceModal
            isOpen={showInvoiceModal}
            onClose={this.closeInvoiceModal}
            invoiceNumber={invoiceModalData.invoiceNumber}
            orderData={invoiceModalData.orderData}
          />
          <GoogleDriveUploadModal
            isOpen={this.state.showGoogleDriveUploadModal}
            onClose={this.closeGoogleDriveUploadModal}
          />
          <GoogleDriveViewModal
            isOpen={this.state.showGoogleDriveViewModal}
            onClose={this.closeGoogleDriveViewModal}
          />
          <BulkUpdateModalForFundraising
            show={this.state.showBulkUpdateModal}
            selectedCount={this.state.bulkUpdateSelectedCount || 0}
            selectedRows={this.state.bulkUpdateSelectedRows || []}
            onClose={this.closeBulkUpdateModal}
            onDownloadInvoices={this.handleDownloadInvoices}
            wooCommerceProductDetails={this.fundraisingTableRef?.current?.state?.wooCommerceProductDetails || []}
          />
          {this.state.registrationBulkUpdatePayload && (
            <BulkUpdateModal
              selectedRows={this.state.registrationBulkUpdatePayload.selectedRows || []}
              bulkUpdateField={this.state.registrationBulkUpdatePayload.bulkUpdateField || ''}
              bulkUpdateStatus={this.state.registrationBulkUpdatePayload.bulkUpdateStatus || ''}
              bulkUpdateMethod={this.state.registrationBulkUpdatePayload.bulkUpdateMethod || ''}
              bulkUpdateValue={this.state.registrationBulkUpdatePayload.bulkUpdateValue || ''}
              bulkUpdateRowValues={this.state.registrationBulkUpdatePayload.bulkUpdateRowValues || {}}
              onFieldChange={this.state.registrationBulkUpdatePayload.onFieldChange}
              onStatusChange={this.state.registrationBulkUpdatePayload.onStatusChange}
              onMethodChange={this.state.registrationBulkUpdatePayload.onMethodChange}
              onValueChange={this.state.registrationBulkUpdatePayload.onValueChange}
              onRowValueChange={this.state.registrationBulkUpdatePayload.onRowValueChange}
              onUpdate={this.state.registrationBulkUpdatePayload.onUpdate}
              onValidationError={this.handleValidationError}
              onUpdateClick={() => {
                this.setState({
                  showBulkUpdateReasonModal: true,
                  bulkUpdateReasonContext: {
                    onReasonSubmit: (reason) => {
                      this.state.registrationBulkUpdatePayload.onUpdate(reason);
                    },
                  },
                });
              }}
              onClose={this.closeRegistrationBulkUpdateModal}
            />
          )}
          {this.state.showBulkUpdateReasonModal && (
            <BulkUpdateReasonModal
              selectedRows={this.state.registrationBulkUpdatePayload?.selectedRows || []}
              bulkUpdateField={this.state.registrationBulkUpdatePayload?.bulkUpdateField || ''}
              onReasonSubmit={this.submitBulkUpdateReason}
              onCancel={this.closeBulkUpdateReasonModal}
            />
          )}
          {this.state.pendingApproval && (
            <ApprovalPopup
              serialNo={this.state.pendingApproval.event.data?.sn ?? this.state.pendingApproval.event.rowIndex + 1}
              columnName={this.state.pendingApproval.event.colDef.headerName}
              oldValue={this.state.pendingApproval.event.oldValue}
              newValue={this.state.pendingApproval.event.newValue ?? this.state.pendingApproval.event.value}
              participantName={this.state.pendingApproval.event.data?.participantInfo?.name}
              courseName={this.state.pendingApproval.event.data?.courseInfo?.courseEngName}
              courseLocation={this.state.pendingApproval.event.data?.courseInfo?.courseLocation}
              onConfirm={this.state.pendingApproval.onConfirm}
              onCancel={this.state.pendingApproval.onCancel}
            />
          )}
          {this.state.exportApprovalPayload && (
            <ExportApprovalModal
              isOpen={true}
              pendingExport={this.state.exportApprovalPayload}
              requesterName={userName}
              requesterEmail={userEmail}
              warningPopUpMessage={this.warningPopUpMessage}
              onClose={this.closeExportApprovalModal}
              onSuccess={(msg) => {
                this.closeExportApprovalModal();
                this.successPopUpMessage(msg);
              }}
            />
          )}
          {this.state.supervisorExportPayload && (
            <SupervisorExportModal
              isOpen={true}
              pendingExport={this.state.supervisorExportPayload}
              exporterName={userName}
              exporterEmail={userEmail}
              warningPopUpMessage={this.warningPopUpMessage}
              onClose={this.closeSupervisorExportModal}
              onSuccess={(msg) => {
                this.closeSupervisorExportModal();
                this.successPopUpMessage(msg);
              }}
            />
          )}
          {this.state.pendingApprovalQueue && (
            <ApprovalQueueModal
              queue={this.state.pendingApprovalQueue.queue || []}
              onSendEmail={this.state.pendingApprovalQueue.onSendEmail}
              onClose={this.state.pendingApprovalQueue.onClose}
              onRemove={this.state.pendingApprovalQueue.onRemove}
              onUpdateReason={this.state.pendingApprovalQueue.onUpdateReason}
            />
          )}
          {this.state.approvalStatusPayload && (
            <ApprovalStatusModal
              isOpen={true}
              requests={this.state.approvalStatusPayload.requests || []}
              onClose={this.state.approvalStatusPayload.onClose}
            />
          )}
          {this.state.showAnomalyModal && (
            <AnomalyModal
              anomalies={this.state.anomalyList}
              onClose={() => this.setState({ showAnomalyModal: false })}
            />
          )}
          {this.state.isPaymentRegistrationStatusModalOpen && (
            <PaymentRegistrationStatusModal
              isOpen={this.state.isPaymentRegistrationStatusModalOpen}
              errorType={this.state.paymentRegistrationStatusModalData?.errorType}
              attemptedValue={this.state.paymentRegistrationStatusModalData?.attemptedValue}
              currentPaymentStatus={this.state.paymentRegistrationStatusModalData?.currentPaymentStatus}
              currentRegistrationStatus={this.state.paymentRegistrationStatusModalData?.currentRegistrationStatus}
              onClose={() => this.setState({ isPaymentRegistrationStatusModalOpen: false })}
            />
          )}
        </>
      );
    }
  }

  export default withAuth(HomePage);
