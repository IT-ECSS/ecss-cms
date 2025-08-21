import React, { Component } from "react";
import axios from 'axios';
import '../../../../css/sub/dashboardSection.css';

class RegistrationDashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            registrationData: [],
            loading: true,
            error: null,
            selectedQuarter: 'All',
            selectedLocation: 'All',
            selectedCourse: 'All',
            selectedCourseType: 'All',
            selectedLocationTab: 'All',
            selectedCourseLocations: {}, // Store selected location for each course
            selectedStatusTab: 'payment', // New state for status tabs: 'payment', 'confirmation', 'methods'
            selectedCourseTypeOverviewTab: 'NSA', // New state for course type overview: 'NSA', 'ILP', etc.
            selectedNSASubTab: 'payment', // New state for NSA sub-tabs: 'payment', 'methods'
            selectedMarriagePrepSubTab: 'payment', // New state for Marriage Prep sub-tabs: 'payment', 'methods'
            selectedILPSubTab: 'confirmation', // New state for ILP sub-tabs: 'confirmation', 'status'
            selectedILPSubTab: 'registration', // New state for ILP sub-tabs: 'registration', 'attendance'
            statistics: {
                totalRegistrations: 0,
                totalPaid: 0,
                totalNotPaid: 0,
                totalRefunded: 0,
                totalConfirmed: 0,
                totalPending: 0,
                totalCancelled: 0,
                totalWithdrawn: 0,
                totalRevenue: 0,
                pendingPayments: 0,
                cashPayments: 0,
                paynowPayments: 0,
                skillsfuturePayments: 0,
                paymentCompletionRate: 0
            }
        };
    }

    componentDidMount() {
        this.fetchRegistrationData();
    }

    // Fetch registration data from backend
    fetchRegistrationData = async () => {
        try {
            this.setState({ loading: true, error: null });
            
            // Get user role and siteIC from props, localStorage, or default values
            const role = this.props.role || localStorage.getItem('userRole') || 'admin';
            const siteIC = this.props.siteIC || localStorage.getItem('siteIC') || '';
            
            console.log('Fetching registration data with role:', role, 'and siteIC:', siteIC);
            
            const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`, { 
                purpose: 'retrieve', 
                role, 
                siteIC 
            });
            
            console.log('Registration data loaded from API:', response.data);
            
            // Enhanced Debug: Show complete raw data structure
            console.log('=== RAW BACKEND DATA ANALYSIS ===');
            console.log('Response type:', typeof response.data);
            console.log('Response is array:', Array.isArray(response.data));
            console.log('Response keys if object:', response.data && typeof response.data === 'object' ? Object.keys(response.data) : 'N/A');
            console.log('Raw response.data:', JSON.stringify(response.data, null, 2));
            
            // Ensure response.data is an array - handle different API response structures
            const dataArray = Array.isArray(response.data) ? response.data : 
                             (response.data && Array.isArray(response.data.result)) ? response.data.result :
                             (response.data && Array.isArray(response.data.data)) ? response.data.data :
                             [];
            
            console.log('=== PROCESSED DATA ANALYSIS ===');
            console.log('Final dataArray length:', dataArray.length);
            console.log('Final dataArray type:', typeof dataArray);
            
            // Debug: Log the structure of the first few registrations
            if (dataArray.length > 0) {
                console.log('=== REGISTRATION DATA STRUCTURE ===');
                console.log('Sample registration structure:', JSON.stringify(dataArray.slice(0, 2), null, 2));
                console.log('Available course types:', [...new Set(dataArray
                    .filter(reg => reg.course && reg.course.courseType)
                    .map(reg => reg.course.courseType))]);
                console.log('Available courses:', [...new Set(dataArray
                    .filter(reg => reg.course && reg.course.courseEngName)
                    .map(reg => reg.course.courseEngName))].slice(0, 10));
                console.log('Available locations:', [...new Set(dataArray
                    .filter(reg => reg.course && reg.course.courseLocation)
                    .map(reg => reg.course.courseLocation))]);
            } else {
                console.log('=== NO DATA AVAILABLE ===');
                console.log('dataArray is empty or invalid');
            }
            
            this.setState({ 
                registrationData: dataArray,
                loading: false 
            }, () => {
                this.calculateStatistics();
            });
        } catch (error) {
            console.error('Error fetching registration data:', error);
            this.setState({ 
                loading: false, 
                error: 'Failed to load registration data. Please try again later.' 
            });
        }
    };

    // Calculate statistics
    calculateStatistics = () => {
        const { registrationData, selectedQuarter, selectedLocation, selectedCourse, selectedCourseType } = this.state;
        
        // Filter data based on current selections
        let filteredData = registrationData.filter(registration => {
            // Quarter filter - only apply if a specific quarter is selected (not 'All')
            let matchesQuarter = true;
            if (selectedQuarter && selectedQuarter !== 'All' && registration.course && registration.course.courseDuration) {
                try {
                    const courseDuration = registration.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    const startDate = new Date(startDateStr);
                    
                    if (!isNaN(startDate.getTime())) {
                        const month = startDate.getMonth();
                        const year = startDate.getFullYear();
                        
                        let quarter;
                        if (month >= 0 && month <= 2) {
                            quarter = `Q1 January - March ${year}`;
                        } else if (month >= 3 && month <= 5) {
                            quarter = `Q2 April - June ${year}`;
                        } else if (month >= 6 && month <= 8) {
                            quarter = `Q3 July - September ${year}`;
                        } else {
                            quarter = `Q4 October - December ${year}`;
                        }
                        
                        matchesQuarter = quarter === selectedQuarter;
                    } else {
                        matchesQuarter = false;
                    }
                } catch (error) {
                    matchesQuarter = false;
                    console.log('Quarter filter error for:', registration.course.courseDuration, error);
                }
            }
            
            // Location filter - only apply if a specific location is selected (not 'All')
            let matchesLocation = true;
            if (selectedLocation && selectedLocation !== 'All' && registration.course) {
                matchesLocation = registration.course.courseLocation === selectedLocation;
            }
            
            // Course filter - only apply if a specific course is selected (not 'All')
            let matchesCourse = true;
            if (selectedCourse && selectedCourse !== 'All' && registration.course) {
                matchesCourse = registration.course.courseEngName === selectedCourse;
            }
            
            // Course type filter - only apply if a specific course type is selected (not 'All')
            let matchesCourseType = true;
            if (selectedCourseType && selectedCourseType !== 'All' && registration.course) {
                matchesCourseType = registration.course.courseType === selectedCourseType;
            }
            
            return matchesQuarter && matchesLocation && matchesCourse && matchesCourseType;
        });

        // Calculate statistics
        const stats = {
            totalRegistrations: filteredData.length,
            totalPaid: 0,
            totalNotPaid: 0,
            totalRefunded: 0,
            totalConfirmed: 0,
            totalPending: 0,
            totalCancelled: 0,
            totalWithdrawn: 0,
            cashPayments: 0,
            paynowPayments: 0,
            skillsfuturePayments: 0,
            paymentCompletionRate: 0
        };

        console.log('=== CALCULATE STATISTICS DEBUG ===');
        console.log('RAW registrationData length:', registrationData.length);
        console.log('FILTERED data length:', filteredData.length);
        console.log('Applied filters:', { selectedQuarter, selectedLocation, selectedCourse, selectedCourseType });
        console.log('Sample filtered records:', filteredData.slice(0, 3));

        filteredData.forEach(registration => {
            const status = registration.status || '';
            const paymentStatus = registration.paymentStatus || '';
            const paymentMethod = registration.course && registration.course.payment 
                ? registration.course.payment.toLowerCase() 
                : '';

            // Check if status is "Paid" or "SkillsFuture Done" (consistent with quarterly sales logic)
            const isPaidStatus = status === 'Paid' || 
                                paymentStatus === 'Paid' ||
                                status === 'SkillsFuture Done' ||
                                paymentStatus === 'SkillsFuture Done';

            // Payment Status counts
            if (isPaidStatus) {
                stats.totalPaid++;
            } else if (status.toLowerCase() === 'refunded') {
                stats.totalRefunded++;
            } else {
                stats.totalNotPaid++;
            }

            // Confirmation Status counts
            const statusLower = status.toLowerCase();
            if (statusLower === 'confirmed' || isPaidStatus) {
                stats.totalConfirmed++;
            } else if (statusLower === 'pending') {
                stats.totalPending++;
            } else if (statusLower === 'cancelled') {
                stats.totalCancelled++;
            } else if (statusLower === 'withdrawn') {
                stats.totalWithdrawn++;
            }

            // Payment method counts (only for paid registrations)
            if (isPaidStatus) {
                if (paymentMethod.includes('cash')) {
                    stats.cashPayments++;
                } else if (paymentMethod.includes('paynow') || paymentMethod.includes('pay now')) {
                    stats.paynowPayments++;
                } else if (paymentMethod.includes('skillsfuture') || paymentMethod.includes('skills future') ||
                          status === 'SkillsFuture Done' || paymentStatus === 'SkillsFuture Done') {
                    stats.skillsfuturePayments++;
                }
            }
        });

        // Calculate payment completion rate
        stats.paymentCompletionRate = stats.totalRegistrations > 0 
            ? (stats.totalPaid / stats.totalRegistrations) * 100 
            : 0;

        console.log('Calculated registration statistics:', stats);
        console.log('Sample registration for location debug:', this.state.registrationData.slice(0, 2));
        this.setState({ statistics: stats });
    };

    // Get available course types
    getAvailableCourseTypes = () => {
        const { registrationData, selectedCourse, selectedQuarter, selectedLocation } = this.state;
        const courseTypes = new Set();
        
        registrationData.forEach(registration => {
            if (registration.course && registration.course.courseType) {
                // Check if course name filter matches (if a specific course is selected)
                let matchesCourse = true;
                if (selectedCourse && selectedCourse !== 'All') {
                    matchesCourse = registration.course.courseEngName === selectedCourse;
                }
                
                // Check quarter filter if selected
                let matchesQuarter = true;
                if (selectedQuarter && selectedQuarter !== 'All' && registration.course.courseDuration) {
                    try {
                        const courseDuration = registration.course.courseDuration;
                        const startDateStr = courseDuration.split(' - ')[0].trim();
                        const startDate = new Date(startDateStr);
                        
                        if (!isNaN(startDate.getTime())) {
                            const month = startDate.getMonth();
                            const year = startDate.getFullYear();
                            
                            let quarter;
                            if (month >= 0 && month <= 2) {
                                quarter = `Q1 January - March ${year}`;
                            } else if (month >= 3 && month <= 5) {
                                quarter = `Q2 April - June ${year}`;
                            } else if (month >= 6 && month <= 8) {
                                quarter = `Q3 July - September ${year}`;
                            } else {
                                quarter = `Q4 October - December ${year}`;
                            }
                            
                            matchesQuarter = quarter === selectedQuarter;
                        }
                    } catch (error) {
                        matchesQuarter = false;
                    }
                }
                
                // Check location filter if selected
                let matchesLocation = true;
                if (selectedLocation && selectedLocation !== 'All') {
                    matchesLocation = registration.course.courseLocation === selectedLocation;
                }
                
                if (matchesCourse && matchesQuarter && matchesLocation) {
                    courseTypes.add(registration.course.courseType);
                }
            }
        });
        
        return Array.from(courseTypes).sort();
    };

    // Get available quarters
    // Get available quarters based on course duration
    getAvailableQuarters = () => {
        const { registrationData } = this.state;
        const quarters = new Set();
        
        registrationData.forEach(registration => {
            if (registration.course && registration.course.courseDuration) {
                try {
                    // Extract start date from course duration
                    const courseDuration = registration.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    const startDate = new Date(startDateStr);
                    
                    if (!isNaN(startDate.getTime())) {
                        const month = startDate.getMonth();
                        const year = startDate.getFullYear();
                        
                        let quarter;
                        if (month >= 0 && month <= 2) {
                            quarter = `Q1 January - March ${year}`;
                        } else if (month >= 3 && month <= 5) {
                            quarter = `Q2 April - June ${year}`;
                        } else if (month >= 6 && month <= 8) {
                            quarter = `Q3 July - September ${year}`;
                        } else {
                            quarter = `Q4 October - December ${year}`;
                        }
                        
                        quarters.add(quarter);
                    }
                } catch (error) {
                    console.error('Error parsing course duration:', registration.course.courseDuration, error);
                }
            }
        });
        
        return Array.from(quarters).sort();
    };

    // Get available locations
    getAvailableLocations = () => {
        const { registrationData, selectedQuarter, selectedCourseType, selectedCourse } = this.state;
        const locations = new Set();
        
        registrationData.forEach(registration => {
            if (registration.course && registration.course.courseLocation) {
                // Check course name filter if selected (if a specific course is selected)
                let matchesCourse = true;
                if (selectedCourse && selectedCourse !== 'All') {
                    matchesCourse = registration.course.courseEngName === selectedCourse;
                }
                
                // Check quarter filter if selected (only apply if not 'All')
                let matchesQuarter = true;
                if (selectedQuarter && selectedQuarter !== 'All' && registration.course.courseDuration) {
                    try {
                        const courseDuration = registration.course.courseDuration;
                        const startDateStr = courseDuration.split(' - ')[0].trim();
                        const startDate = new Date(startDateStr);
                        
                        if (!isNaN(startDate.getTime())) {
                            const month = startDate.getMonth();
                            const year = startDate.getFullYear();
                            
                            let quarter;
                            if (month >= 0 && month <= 2) {
                                quarter = `Q1 January - March ${year}`;
                            } else if (month >= 3 && month <= 5) {
                                quarter = `Q2 April - June ${year}`;
                            } else if (month >= 6 && month <= 8) {
                                quarter = `Q3 July - September ${year}`;
                            } else {
                                quarter = `Q4 October - December ${year}`;
                            }
                            
                            matchesQuarter = quarter === selectedQuarter;
                        }
                    } catch (error) {
                        matchesQuarter = false;
                    }
                }
                
                // Check course type filter if selected
                let matchesCourseType = true;
                if (selectedCourseType && selectedCourseType !== 'All' && registration.course) {
                    matchesCourseType = registration.course.courseType === selectedCourseType;
                }
                
                if (matchesCourse && matchesQuarter && matchesCourseType) {
                    locations.add(registration.course.courseLocation);
                }
            }
        });
        
        return Array.from(locations).sort();
    };

    // Get available courses
    getAvailableCourses = () => {
        const { registrationData, selectedQuarter, selectedLocation, selectedCourseType, selectedCourse } = this.state;
        
        // If a specific course is selected, only show that course
        if (selectedCourse && selectedCourse !== 'All') {
            return [selectedCourse];
        }
        
        const courses = new Set();
        
        registrationData.forEach(registration => {
            if (registration.course && registration.course.courseEngName) {
                // Check quarter filter if selected (only apply if not 'All')
                let matchesQuarter = true;
                if (selectedQuarter && selectedQuarter !== 'All' && registration.course.courseDuration) {
                    try {
                        const courseDuration = registration.course.courseDuration;
                        const startDateStr = courseDuration.split(' - ')[0].trim();
                        const startDate = new Date(startDateStr);
                        
                        if (!isNaN(startDate.getTime())) {
                            const month = startDate.getMonth();
                            const year = startDate.getFullYear();
                            
                            let quarter;
                            if (month >= 0 && month <= 2) {
                                quarter = `Q1 January - March ${year}`;
                            } else if (month >= 3 && month <= 5) {
                                quarter = `Q2 April - June ${year}`;
                            } else if (month >= 6 && month <= 8) {
                                quarter = `Q3 July - September ${year}`;
                            } else {
                                quarter = `Q4 October - December ${year}`;
                            }
                            
                            matchesQuarter = quarter === selectedQuarter;
                        }
                    } catch (error) {
                        matchesQuarter = false;
                    }
                }
                
                // Check location filter if selected (only apply if not 'All')
                let matchesLocation = true;
                if (selectedLocation && selectedLocation !== 'All') {
                    matchesLocation = registration.course.courseLocation === selectedLocation;
                }
                
                // Check course type filter if selected (only apply if not 'All')
                let matchesCourseType = true;
                if (selectedCourseType && selectedCourseType !== 'All' && registration.course) {
                    matchesCourseType = registration.course.courseType === selectedCourseType;
                }
                
                if (matchesQuarter && matchesLocation && matchesCourseType) {
                    courses.add(registration.course.courseEngName);
                }
            }
        });
        
        return Array.from(courses).sort();
    };

    // Reset all filters
    resetAllFilters = () => {
        this.setState({
            selectedQuarter: 'All',
            selectedLocation: 'All',
            selectedCourse: 'All',
            selectedCourseType: 'All'
        }, () => {
            this.calculateStatistics();
        });
    };

    // Handle filter changes
    handleQuarterChange = (event) => {
        this.setState({ 
            selectedQuarter: event.target.value,
            selectedLocation: 'All', // Reset dependent filters
            selectedCourse: 'All'
        }, () => {
            this.calculateStatistics();
        });
    };

    handleLocationChange = (event) => {
        this.setState({ 
            selectedLocation: event.target.value,
            selectedCourse: 'All' // Reset dependent filter
        }, () => {
            this.calculateStatistics();
        });
    };

    handleCourseChange = (event) => {
        this.setState({ selectedCourse: event.target.value }, () => {
            this.calculateStatistics();
        });
    };

    handleCourseTypeChange = (event) => {
        this.setState({ 
            selectedCourseType: event.target.value,
            selectedQuarter: 'All', // Reset dependent filters
            selectedLocation: 'All',
            selectedCourse: 'All'
        }, () => {
            this.calculateStatistics();
        });
    };

    // Handle location tab changes for quarterly sales
    handleLocationTabChange = (locationTab) => {
        this.setState({ selectedLocationTab: locationTab });
    };

    // Handle status tab changes
    handleStatusTabChange = (statusTab) => {
        this.setState({ selectedStatusTab: statusTab });
    };

    // Handle course type overview tab changes
    handleCourseTypeOverviewTabChange = (courseTypeTab) => {
        this.setState({ selectedCourseTypeOverviewTab: courseTypeTab });
    };

    // Handle NSA sub-tab changes
    handleNSASubTabChange = (subTab) => {
        this.setState({ selectedNSASubTab: subTab });
    };

    // Handle Marriage Prep sub-tab changes
    handleMarriagePrepSubTabChange = (subTab) => {
        this.setState({ selectedMarriagePrepSubTab: subTab });
    }

    // Handler for ILP sub-tab changes
    handleILPSubTabChange = (subTab) => {
        this.setState({ selectedILPSubTab: subTab });
    };

    // Calculate statistics for a specific course type
    calculateStatisticsByCourseType = (courseType) => {
        const { registrationData, selectedQuarter, selectedLocation, selectedCourse } = this.state;
        
        const filteredData = registrationData.filter(registration => {
            if (!registration.course) return false;
            
            // Filter by course type (if not 'All')
            if (courseType !== 'All' && registration.course.courseType !== courseType) {
                return false;
            }
            
            // Apply other filters
            let matchesQuarter = true;
            if (selectedQuarter && selectedQuarter !== 'All' && registration.course.courseDuration) {
                try {
                    const courseDuration = registration.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    const startDate = new Date(startDateStr);
                    
                    if (!isNaN(startDate.getTime())) {
                        const month = startDate.getMonth();
                        const year = startDate.getFullYear();
                        
                        let quarter;
                        if (month >= 0 && month <= 2) {
                            quarter = `Q1 January - March ${year}`;
                        } else if (month >= 3 && month <= 5) {
                            quarter = `Q2 April - June ${year}`;
                        } else if (month >= 6 && month <= 8) {
                            quarter = `Q3 July - September ${year}`;
                        } else {
                            quarter = `Q4 October - December ${year}`;
                        }
                        
                        matchesQuarter = quarter === selectedQuarter;
                    }
                } catch (error) {
                    matchesQuarter = false;
                }
            }
            
            let matchesLocation = true;
            if (selectedLocation && selectedLocation !== 'All') {
                matchesLocation = registration.course.courseLocation === selectedLocation;
            }
            
            let matchesCourse = true;
            if (selectedCourse && selectedCourse !== 'All') {
                matchesCourse = registration.course.courseEngName === selectedCourse;
            }
            
            return matchesQuarter && matchesLocation && matchesCourse;
        });
        
        // Calculate statistics for this course type
        const totalRegistrations = filteredData.length;
        const totalPaid = filteredData.filter(r => r.paymentStatus === 'Paid').length;
        const totalNotPaid = filteredData.filter(r => r.paymentStatus === 'Not Paid').length;
        const totalRefunded = filteredData.filter(r => r.paymentStatus === 'Refunded').length;
        
        // For ILP courses, use 'status' field instead of 'confirmationStatus'
        let totalConfirmed, totalPending, totalCancelled, totalWithdrawn;
        
        if (courseType === 'ILP') {
            totalConfirmed = filteredData.filter(r => r.status === 'Confirmed').length;
            totalPending = filteredData.filter(r => r.status === 'Pending').length;
            totalCancelled = filteredData.filter(r => r.status === 'Cancelled').length;
            totalWithdrawn = filteredData.filter(r => r.status === 'Withdrawn').length;
        } else {
            totalConfirmed = filteredData.filter(r => r.confirmationStatus === 'Confirmed').length;
            totalPending = filteredData.filter(r => r.confirmationStatus === 'Pending').length;
            totalCancelled = filteredData.filter(r => r.confirmationStatus === 'Cancelled').length;
            totalWithdrawn = filteredData.filter(r => r.confirmationStatus === 'Withdrawn').length;
        }
        
        return {
            totalRegistrations,
            totalPaid,
            totalNotPaid,
            totalRefunded,
            totalConfirmed,
            totalPending,
            totalCancelled,
            totalWithdrawn
        };
    };

    // Handle location tab changes for individual course cards
    handleCourseLocationTabChange = (courseName, location) => {
        this.setState(prevState => ({
            selectedCourseLocations: {
                ...prevState.selectedCourseLocations,
                [courseName]: location
            }
        }));
    };

    // Determine which status sections to show based on course type
    getStatusSectionsToShow = () => {
        const { selectedCourseType } = this.state;
        
        switch (selectedCourseType) {
            case 'NSA':
                return {
                    showPaymentStatus: true,
                    showConfirmationStatus: true,
                    showPaymentMethods: true,
                    showSkillsFuture: true,
                    useTabs: false
                };
            case 'ILP':
                return {
                    showPaymentStatus: false,
                    showConfirmationStatus: true,
                    showPaymentMethods: false,
                    showSkillsFuture: false,
                    useTabs: false
                };
            case 'Marriage Preparation Programme':
                return {
                    showPaymentStatus: true,
                    showConfirmationStatus: true,
                    showPaymentMethods: true,
                    showSkillsFuture: false,
                    useTabs: false
                };
            case 'All':
            default:
                return {
                    showPaymentStatus: true,
                    showConfirmationStatus: true,
                    showPaymentMethods: true,
                    showSkillsFuture: true,
                    useTabs: true
                };
        }
    };

    // Get registration breakdown by location
    getRegistrationBreakdownByLocation = () => {
        const { registrationData, selectedQuarter, selectedCourse, selectedCourseType } = this.state;
        const locationCounts = {};
        
        // Filter data based on current selections
        let filteredData = registrationData.filter(registration => {
            // Quarter filter
            let matchesQuarter = true;
            if (selectedQuarter && selectedQuarter !== 'All' && registration.course && registration.course.courseDuration) {
                try {
                    const courseDuration = registration.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    const startDate = new Date(startDateStr);
                    
                    if (!isNaN(startDate.getTime())) {
                        const month = startDate.getMonth();
                        const year = startDate.getFullYear();
                        
                        let quarter;
                        if (month >= 0 && month <= 2) {
                            quarter = `Q1 January - March ${year}`;
                        } else if (month >= 3 && month <= 5) {
                            quarter = `Q2 April - June ${year}`;
                        } else if (month >= 6 && month <= 8) {
                            quarter = `Q3 July - September ${year}`;
                        } else {
                            quarter = `Q4 October - December ${year}`;
                        }
                        
                        matchesQuarter = quarter === selectedQuarter;
                    }
                } catch (error) {
                    matchesQuarter = false;
                }
            }

            // Course filter
            let matchesCourse = true;
            if (selectedCourse && selectedCourse !== 'All' && registration.course) {
                matchesCourse = registration.course.courseEngName === selectedCourse;
            }

            // Course type filter
            let matchesCourseType = true;
            if (selectedCourseType && selectedCourseType !== 'All' && registration.course) {
                matchesCourseType = registration.course.courseType === selectedCourseType;
            }

            return matchesQuarter && matchesCourse && matchesCourseType;
        });
        
        filteredData.forEach(registration => {
            // Use the correct path to get location from the registration data
            const location = (registration.course && registration.course.courseLocation) 
                ? registration.course.courseLocation 
                : 'Unknown';
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        });
        
        return Object.entries(locationCounts)
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count);
    };

    // Get registration breakdown by course type
    getRegistrationBreakdownByCourseType = () => {
        const { registrationData, selectedQuarter, selectedLocation, selectedCourse } = this.state;
        const courseTypeCounts = {};
        
        // Filter data based on current selections
        let filteredData = registrationData.filter(registration => {
            // Quarter filter
            let matchesQuarter = true;
            if (selectedQuarter && registration.course && registration.course.courseDuration) {
                try {
                    const courseDuration = registration.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    const startDate = new Date(startDateStr);
                    
                    if (!isNaN(startDate.getTime())) {
                        const month = startDate.getMonth();
                        const year = startDate.getFullYear();
                        
                        let quarter;
                        if (month >= 0 && month <= 2) {
                            quarter = `Q1 January - March ${year}`;
                        } else if (month >= 3 && month <= 5) {
                            quarter = `Q2 April - June ${year}`;
                        } else if (month >= 6 && month <= 8) {
                            quarter = `Q3 July - September ${year}`;
                        } else {
                            quarter = `Q4 October - December ${year}`;
                        }
                        
                        matchesQuarter = quarter === selectedQuarter;
                    }
                } catch (error) {
                    matchesQuarter = false;
                }
            }

            // Location filter
            let matchesLocation = true;
            if (selectedLocation && registration.course) {
                matchesLocation = registration.course.courseLocation === selectedLocation;
            }

            // Course filter
            let matchesCourse = true;
            if (selectedCourse && registration.course) {
                matchesCourse = registration.course.courseEngName === selectedCourse;
            }

            return matchesQuarter && matchesLocation && matchesCourse;
        });

        console.log('Filtered data for course breakdown:', filteredData.length);

        // Count registrations by course type
        filteredData.forEach(registration => {
            const courseType = registration.course && registration.course.courseType ? 
                registration.course.courseType : 'Unknown';
            courseTypeCounts[courseType] = (courseTypeCounts[courseType] || 0) + 1;
        });
        
        return Object.entries(courseTypeCounts)
            .map(([courseType, count]) => ({ courseType, count }))
            .sort((a, b) => b.count - a.count);
    };

    // Get registration breakdown by individual courses
    getRegistrationBreakdownByCourse = () => {
        const { registrationData, selectedQuarter, selectedLocation, selectedCourseType } = this.state;
        const courseCounts = {};
        
        // Filter data based on current selections
        let filteredData = registrationData.filter(registration => {
            // Quarter filter
            let matchesQuarter = true;
            if (selectedQuarter && selectedQuarter !== 'All' && registration.course && registration.course.courseDuration) {
                try {
                    const courseDuration = registration.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    const startDate = new Date(startDateStr);
                    
                    if (!isNaN(startDate.getTime())) {
                        const month = startDate.getMonth();
                        const year = startDate.getFullYear();
                        
                        let quarter;
                        if (month >= 0 && month <= 2) {
                            quarter = `Q1 January - March ${year}`;
                        } else if (month >= 3 && month <= 5) {
                            quarter = `Q2 April - June ${year}`;
                        } else if (month >= 6 && month <= 8) {
                            quarter = `Q3 July - September ${year}`;
                        } else {
                            quarter = `Q4 October - December ${year}`;
                        }
                        
                        matchesQuarter = quarter === selectedQuarter;
                    }
                } catch (error) {
                    matchesQuarter = false;
                }
            }

            // Location filter
            let matchesLocation = true;
            if (selectedLocation && selectedLocation !== 'All' && registration.course) {
                matchesLocation = registration.course.courseLocation === selectedLocation;
            }

            // Course Type filter
            let matchesCourseType = true;
            if (selectedCourseType && selectedCourseType !== 'All' && registration.course) {
                matchesCourseType = registration.course.courseType === selectedCourseType;
            }

            return matchesQuarter && matchesLocation && matchesCourseType;
        });

        console.log('Filtered data for individual course breakdown:', filteredData.length);

        // Count registrations by individual course
        filteredData.forEach(registration => {
            const courseName = registration.course && registration.course.courseEngName ? 
                registration.course.courseEngName : 'Unknown Course';
            courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
        });
        
        return Object.entries(courseCounts)
            .map(([courseName, count]) => ({ courseName, count }))
            .sort((a, b) => b.count - a.count);
    };

    // Get quarterly sales breakdown
    getQuarterlySalesData = () => {
        const { registrationData, selectedLocation, selectedCourse, selectedCourseType } = this.state;
        const quarterlySales = {};
        
        // Filter data based on current selections (excluding quarter filter for this analysis)
        let filteredData = registrationData.filter(registration => {
            // Location filter
            let matchesLocation = true;
            if (selectedLocation && registration.course) {
                matchesLocation = registration.course.courseLocation === selectedLocation;
            }

            // Course filter
            let matchesCourse = true;
            if (selectedCourse && registration.course) {
                matchesCourse = registration.course.courseEngName === selectedCourse;
            }

            // Course Type filter
            let matchesCourseType = true;
            if (selectedCourseType && selectedCourseType !== 'All' && registration.course) {
                matchesCourseType = registration.course.courseType === selectedCourseType;
            }

            return matchesLocation && matchesCourse && matchesCourseType;
        });

        // Group sales by quarter
        filteredData.forEach(registration => {
            if (registration.course && registration.course.courseDuration) {
                try {
                    const courseDuration = registration.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    const startDate = new Date(startDateStr);
                    
                    if (!isNaN(startDate.getTime())) {
                        const month = startDate.getMonth();
                        const year = startDate.getFullYear();
                        
                        let quarter;
                        if (month >= 0 && month <= 2) {
                            quarter = `Q1 ${year}`;
                        } else if (month >= 3 && month <= 5) {
                            quarter = `Q2 ${year}`;
                        } else if (month >= 6 && month <= 8) {
                            quarter = `Q3 ${year}`;
                        } else {
                            quarter = `Q4 ${year}`;
                        }
                        
                        if (!quarterlySales[quarter]) {
                            quarterlySales[quarter] = {
                                totalRegistrations: 0,
                                paidRegistrations: 0,
                                totalRevenue: 0,
                                avgRevenuePerRegistration: 0
                            };
                        }
                        
                        quarterlySales[quarter].totalRegistrations++;
                        
                        // Check if registration is paid (including SkillsFuture) and calculate revenue
                        const isPaid = registration.paymentStatus === 'Paid' || 
                                      registration.paymentStatus === 'paid' || 
                                      registration.paymentStatus === 'SkillsFuture' || 
                                      registration.paymentStatus === 'skillsfuture' ||
                                      registration.paymentStatus === 'Skillsfuture';
                        
                        if (isPaid) {
                            quarterlySales[quarter].paidRegistrations++;
                            
                            // Estimate revenue (you may need to adjust this based on your data structure)
                            const estimatedRevenue = registration.course.courseFee || 100; // Default fee if not available
                            quarterlySales[quarter].totalRevenue += parseFloat(estimatedRevenue) || 0;
                        }
                    }
                } catch (error) {
                    console.error('Error parsing course duration for sales analysis:', error);
                }
            }
        });

        // Calculate averages
        Object.keys(quarterlySales).forEach(quarter => {
            const data = quarterlySales[quarter];
            data.avgRevenuePerRegistration = data.totalRegistrations > 0 ? 
                (data.totalRevenue / data.totalRegistrations).toFixed(2) : 0;
        });

        return Object.entries(quarterlySales)
            .map(([quarter, data]) => ({ quarter, ...data }))
            .sort((a, b) => a.quarter.localeCompare(b.quarter));
    };

    // Get quarterly sales breakdown by individual courses
    getQuarterlySalesByCourse = () => {
        const { registrationData, selectedLocation, selectedCourse, selectedCourseType, selectedLocationTab } = this.state;
        const coursesQuarterlyData = {};
        
        console.log('Quarterly Sales Filters:', {
            selectedLocation,
            selectedCourse,
            selectedCourseType,
            selectedLocationTab,
            totalData: registrationData.length
        });
        
        // Filter data based on current selections (excluding quarter filter)
        let filteredData = registrationData.filter(registration => {
            // Location tab filter (for quarterly sales display)
            let matchesLocationTab = true;
            if (selectedLocationTab && selectedLocationTab !== 'All' && registration.course) {
                matchesLocationTab = registration.course.courseLocation === selectedLocationTab;
            }

            // Location filter (for the regular location filter)
            let matchesLocation = true;
            if (selectedLocation && registration.course) {
                matchesLocation = registration.course.courseLocation === selectedLocation;
            }

            // Course filter
            let matchesCourse = true;
            if (selectedCourse && registration.course) {
                matchesCourse = registration.course.courseEngName === selectedCourse;
            }

            // Course Type filter
            let matchesCourseType = true;
            if (selectedCourseType && selectedCourseType !== 'All' && registration.course) {
                matchesCourseType = registration.course.courseType === selectedCourseType;
            }

            return matchesLocationTab && matchesLocation && matchesCourse && matchesCourseType;
        });

        console.log('Filtered data for quarterly sales:', filteredData.length);

        // Group sales by course first, then by location, then by quarter
        filteredData.forEach(registration => {
            if (registration.course && registration.course.courseDuration && registration.course.courseEngName && registration.course.courseLocation) {
                try {
                    const courseDuration = registration.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    const startDate = new Date(startDateStr);
                    const courseName = registration.course.courseEngName;
                    const courseLocation = registration.course.courseLocation;
                    
                    if (!isNaN(startDate.getTime())) {
                        const month = startDate.getMonth();
                        const year = startDate.getFullYear();
                        
                        let quarter;
                        if (month >= 0 && month <= 2) {
                            quarter = `Q1 ${year}`;
                        } else if (month >= 3 && month <= 5) {
                            quarter = `Q2 ${year}`;
                        } else if (month >= 6 && month <= 8) {
                            quarter = `Q3 ${year}`;
                        } else {
                            quarter = `Q4 ${year}`;
                        }
                        
                        // Create nested structure: course -> location -> quarter -> data
                        if (!coursesQuarterlyData[courseName]) {
                            coursesQuarterlyData[courseName] = {
                                courseName: courseName,
                                locations: {}
                            };
                        }
                        
                        if (!coursesQuarterlyData[courseName].locations[courseLocation]) {
                            // Use coursePrice field and convert from string to float for display
                            let displayPrice = 100; // Default
                            if (registration.course.coursePrice) {
                                const priceString = registration.course.coursePrice.toString().replace(/[$,]/g, '');
                                displayPrice = parseFloat(priceString) || 100;
                            }
                            
                            coursesQuarterlyData[courseName].locations[courseLocation] = {
                                location: courseLocation,
                                courseFee: displayPrice,
                                quarters: {}
                            };
                        }
                        
                        if (!coursesQuarterlyData[courseName].locations[courseLocation].quarters[quarter]) {
                            coursesQuarterlyData[courseName].locations[courseLocation].quarters[quarter] = {
                                quarter: quarter,
                                totalRegistrations: 0,
                                paidRegistrations: 0,
                                totalRevenue: 0
                            };
                        }
                        
                        coursesQuarterlyData[courseName].locations[courseLocation].quarters[quarter].totalRegistrations++;
                        
                        // Check if registration status is "Paid" or "SkillsFuture Done"
                        const isPaid = registration.status === 'Paid' || 
                                      registration.paymentStatus === 'Paid' ||
                                      registration.status === 'SkillsFuture Done' ||
                                      registration.paymentStatus === 'SkillsFuture Done';
                        
                        if (isPaid) {
                            coursesQuarterlyData[courseName].locations[courseLocation].quarters[quarter].paidRegistrations++;
                            
                            // Use course.coursePrice field and convert from string to float
                            let coursePrice = 0;
                            if (registration.course.coursePrice) {
                                // Remove $ symbol and any other non-numeric characters, then convert to float
                                const priceString = registration.course.coursePrice.toString().replace(/[$,]/g, '');
                                coursePrice = parseFloat(priceString) || 0;
                            }
                            
                            coursesQuarterlyData[courseName].locations[courseLocation].quarters[quarter].totalRevenue += coursePrice;
                        }
                    }
                } catch (error) {
                    console.error('Error parsing course duration for course sales analysis:', error);
                }
            }
        });

        // Convert to array format and structure for display
        const result = Object.values(coursesQuarterlyData).map(courseData => ({
            courseName: courseData.courseName,
            locations: Object.values(courseData.locations).map(locationData => ({
                ...locationData,
                quarters: Object.values(locationData.quarters).sort((a, b) => a.quarter.localeCompare(b.quarter))
            }))
        })).sort((a, b) => a.courseName.localeCompare(b.courseName));

        return result;
    };

    render() {
        const { 
            loading, 
            error, 
            selectedQuarter, 
            selectedLocation, 
            selectedCourse, 
            selectedCourseType,
            statistics 
        } = this.state;

        if (loading) {
            return (
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading registration data...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="dashboard-error">
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button onClick={this.fetchRegistrationData} className="retry-btn">
                        Retry
                    </button>
                </div>
            );
        }

        const availableQuarters = this.getAvailableQuarters();
        const availableLocations = this.getAvailableLocations();
        const availableCourses = this.getAvailableCourses();
        const availableCourseTypes = this.getAvailableCourseTypes();

        console.log('Available course types for render:', availableCourseTypes);
        console.log('Available courses count:', availableCourses.length);
        console.log('Available locations count:', availableLocations.length);
        console.log('Sample courses:', availableCourses.slice(0, 5));
        console.log('Sample locations:', availableLocations.slice(0, 5));

        return (
            <div className="registration-dashboard">
                {/* Dashboard Header with Quarter Selector */}
                <div className="dashboard-header">
                    <div className="header-left">
                        <h2>Registration Dashboard</h2>
                        <p className="header-subtitle">Course Registration Analytics</p>
                    </div>
                    <div className="header-right">
                        <div className="quarter-selector">
                            <select 
                                className="quarter-dropdown-small"
                                value={selectedQuarter}
                                onChange={this.handleQuarterChange}
                            >
                                <option value="All">Quarter: All Quarters</option>
                                {availableQuarters.map(quarter => (
                                    <option key={quarter} value={quarter}>
                                        Quarter: {quarter}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="dashboard-filters">
                    <div className="filters-header">
                        <div className="course-type-filter">
                            <label className="filter-label">Course Type:</label>
                            <div className="filter-badges">
                                <button 
                                    className={`filter-badge ${selectedCourseType === 'All' ? 'active' : ''}`}
                                    onClick={() => this.handleCourseTypeChange({ target: { value: 'All' } })}
                                >
                                    All Types
                                </button>
                                {availableCourseTypes.map(courseType => (
                                    <button 
                                        key={courseType}
                                        className={`filter-badge ${selectedCourseType === courseType ? 'active' : ''}`}
                                        onClick={() => this.handleCourseTypeChange({ target: { value: courseType } })}
                                    >
                                        {courseType}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button 
                            className="refresh-badge"
                            onClick={this.resetAllFilters}
                            title="Reset All Filters"
                        >
                            🔄 Reset
                        </button>
                    </div>

                    {/* Course Name Filter - Second */}
                    <div className="filter-section">
                        <label className="filter-label">Course Name:</label>
                        <div className="filter-badges">
                            <button 
                                className={`filter-badge ${selectedCourse === 'All' ? 'active' : ''}`}
                                onClick={() => this.handleCourseChange({ target: { value: 'All' } })}
                                disabled={availableCourses.length === 0}
                            >
                                All Courses
                            </button>
                            {availableCourses.map(course => (
                                <button 
                                    key={course}
                                    className={`filter-badge ${selectedCourse === course ? 'active' : ''}`}
                                    onClick={() => this.handleCourseChange({ target: { value: course } })}
                                    title={course}
                                >
                                    {course}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Center Name Filter - Third */}
                    <div className="filter-section">
                        <label className="filter-label">Center Name:</label>
                        <div className="filter-badges">
                            <button 
                                className={`filter-badge ${selectedLocation === 'All' ? 'active' : ''}`}
                                onClick={() => this.handleLocationChange({ target: { value: 'All' } })}
                                disabled={availableLocations.length === 0}
                            >
                                All Centers
                            </button>
                            {availableLocations.map(location => (
                                <button 
                                    key={location}
                                    className={`filter-badge ${selectedLocation === location ? 'active' : ''}`}
                                    onClick={() => this.handleLocationChange({ target: { value: location } })}
                                >
                                    {location}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Registration Statistics */}
                <div className="dashboard-content">
                    <div className="dashboard-stats">
                        {/* Overview Stats */}
                        <div className="stats-group">
                            <div className="stats-group-header">
                                <h4>📊 Registration Overview</h4>
                            </div>
                            <div className="stats-grid">
                                <div className="stat-card primary">
                                    <div className="stat-icon">📝</div>
                                    <div className="stat-content">
                                        <h3>Total Registrations</h3>
                                        <p className="stat-number">{statistics.totalRegistrations}</p>
                                    </div>
                                </div>

                                <div className="stat-card success">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-content">
                                        <h3>Confirmed</h3>
                                        <p className="stat-number">{statistics.totalConfirmed}</p>
                                        <p className="stat-percentage">
                                            {statistics.totalRegistrations > 0 
                                                ? ((statistics.totalConfirmed / statistics.totalRegistrations) * 100).toFixed(1)
                                                : 0}%
                                        </p>
                                    </div>
                                </div>

                                <div className="stat-card info">
                                    <div className="stat-icon">💹</div>
                                    <div className="stat-content">
                                        <h3>Completion Rate</h3>
                                        <p className="stat-number">
                                            {(statistics.paymentCompletionRate || 0).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Status Sections based on Course Type */}
                        {(() => {
                            const statusConfig = this.getStatusSectionsToShow();
                            const { selectedCourseTypeOverviewTab } = this.state;
                            const availableCourseTypes = this.getAvailableCourseTypes();

                            if (statusConfig.useTabs) {
                                // Show course type tabbed interface
                                return (
                                    <div className="stats-group">
                                        <div className="stats-group-header">
                                            <h4>📊 Status Overview</h4>
                                            <div className="status-tabs">
                                                {availableCourseTypes.map(courseType => (
                                                    <button 
                                                        key={courseType}
                                                        className={`status-tab ${selectedCourseTypeOverviewTab === courseType ? 'active' : ''}`}
                                                        onClick={() => this.handleCourseTypeOverviewTabChange(courseType)}
                                                    >
                                                        {courseType === 'NSA' ? '🎓 NSA' : 
                                                         courseType === 'ILP' ? '💼 ILP' : 
                                                         courseType === 'Marriage Prep' ? '💒 Marriage Prep' : 
                                                         `📚 ${courseType}`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Course Type Statistics Display */}
                                        {(() => {
                                            const courseTypeStats = this.calculateStatisticsByCourseType(selectedCourseTypeOverviewTab);
                                            const { selectedNSASubTab } = this.state;
                                            
                                            // If NSA is selected, show sub-tabs
                                            if (selectedCourseTypeOverviewTab === 'NSA') {
                                                return (
                                                    <div>
                                                        {/* NSA Sub-tabs */}
                                                        <div className="sub-tabs">
                                                            <button 
                                                                className={`sub-tab ${selectedNSASubTab === 'payment' ? 'active' : ''}`}
                                                                onClick={() => this.handleNSASubTabChange('payment')}
                                                            >
                                                                💰 Payment Status
                                                            </button>
                                                            <button 
                                                                className={`sub-tab ${selectedNSASubTab === 'methods' ? 'active' : ''}`}
                                                                onClick={() => this.handleNSASubTabChange('methods')}
                                                            >
                                                                💳 Payment Methods
                                                            </button>
                                                        </div>

                                                        {/* NSA Payment Status Sub-tab */}
                                                        {selectedNSASubTab === 'payment' && (
                                                            <div className="stats-grid">
                                                                <div className="stat-card info">
                                                                    <div className="stat-icon">📋</div>
                                                                    <div className="stat-content">
                                                                        <h3>Total Registrations</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalRegistrations}</p>
                                                                        <p className="stat-percentage">100%</p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card success">
                                                                    <div className="stat-icon">💚</div>
                                                                    <div className="stat-content">
                                                                        <h3>Paid</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalPaid}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalRegistrations > 0 
                                                                                ? ((courseTypeStats.totalPaid / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card warning">
                                                                    <div className="stat-icon">⏳</div>
                                                                    <div className="stat-content">
                                                                        <h3>Not Paid</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalNotPaid}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalRegistrations > 0 
                                                                                ? ((courseTypeStats.totalNotPaid / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card danger">
                                                                    <div className="stat-icon">🔄</div>
                                                                    <div className="stat-content">
                                                                        <h3>Refunded</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalRefunded}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalRegistrations > 0 
                                                                                ? ((courseTypeStats.totalRefunded / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* NSA Payment Methods Sub-tab */}
                                                        {selectedNSASubTab === 'methods' && (
                                                            <div className="stats-grid">
                                                                <div className="stat-card info">
                                                                    <div className="stat-icon">💵</div>
                                                                    <div className="stat-content">
                                                                        <h3>Cash</h3>
                                                                        <p className="stat-number">{statistics.cashPayments}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalPaid > 0 
                                                                                ? ((statistics.cashPayments / courseTypeStats.totalPaid) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card info">
                                                                    <div className="stat-icon">📱</div>
                                                                    <div className="stat-content">
                                                                        <h3>PayNow</h3>
                                                                        <p className="stat-number">{statistics.paynowPayments}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalPaid > 0 
                                                                                ? ((statistics.paynowPayments / courseTypeStats.totalPaid) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card info">
                                                                    <div className="stat-icon">🎓</div>
                                                                    <div className="stat-content">
                                                                        <h3>SkillsFuture</h3>
                                                                        <p className="stat-number">{statistics.skillsfuturePayments}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalPaid > 0 
                                                                                ? ((statistics.skillsfuturePayments / courseTypeStats.totalPaid) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            } else if (selectedCourseTypeOverviewTab === 'Marriage Preparation Programme') {
                                                // Marriage Prep sub-tabs (payment-focused like NSA)
                                                const { selectedMarriagePrepSubTab } = this.state;
                                                return (
                                                    <div>
                                                        {/* Marriage Prep Sub-tabs */}
                                                        <div className="sub-tabs">
                                                            <button 
                                                                className={`sub-tab ${selectedMarriagePrepSubTab === 'payment' ? 'active' : ''}`}
                                                                onClick={() => this.handleMarriagePrepSubTabChange('payment')}
                                                            >
                                                                💰 Payment Status
                                                            </button>
                                                            <button 
                                                                className={`sub-tab ${selectedMarriagePrepSubTab === 'methods' ? 'active' : ''}`}
                                                                onClick={() => this.handleMarriagePrepSubTabChange('methods')}
                                                            >
                                                                💳 Payment Methods
                                                            </button>
                                                        </div>

                                                        {/* Marriage Prep Payment Status Sub-tab */}
                                                        {selectedMarriagePrepSubTab === 'payment' && (
                                                            <div className="stats-grid">
                                                                <div className="stat-card info">
                                                                    <div className="stat-icon">📋</div>
                                                                    <div className="stat-content">
                                                                        <h3>Total Registrations</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalRegistrations}</p>
                                                                        <p className="stat-percentage">100%</p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card success">
                                                                    <div className="stat-icon">💚</div>
                                                                    <div className="stat-content">
                                                                        <h3>Paid</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalPaid}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalRegistrations > 0 
                                                                                ? ((courseTypeStats.totalPaid / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card warning">
                                                                    <div className="stat-icon">⏳</div>
                                                                    <div className="stat-content">
                                                                        <h3>Not Paid</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalNotPaid}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalRegistrations > 0 
                                                                                ? ((courseTypeStats.totalNotPaid / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card danger">
                                                                    <div className="stat-icon">🔄</div>
                                                                    <div className="stat-content">
                                                                        <h3>Refunded</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalRefunded}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalRegistrations > 0 
                                                                                ? ((courseTypeStats.totalRefunded / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Marriage Prep Payment Methods Sub-tab */}
                                                        {selectedMarriagePrepSubTab === 'methods' && (
                                                            <div className="stats-grid">
                                                                <div className="stat-card info">
                                                                    <div className="stat-icon">💵</div>
                                                                    <div className="stat-content">
                                                                        <h3>Cash</h3>
                                                                        <p className="stat-number">{statistics.cashPayments}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalPaid > 0 
                                                                                ? ((statistics.cashPayments / courseTypeStats.totalPaid) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card info">
                                                                    <div className="stat-icon">📱</div>
                                                                    <div className="stat-content">
                                                                        <h3>PayNow</h3>
                                                                        <p className="stat-number">{statistics.paynowPayments}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalPaid > 0 
                                                                                ? ((statistics.paynowPayments / courseTypeStats.totalPaid) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card info">
                                                                    <div className="stat-icon">💳</div>
                                                                    <div className="stat-content">
                                                                        <h3>Other Methods</h3>
                                                                        <p className="stat-number">{courseTypeStats.totalPaid - statistics.cashPayments - statistics.paynowPayments}</p>
                                                                        <p className="stat-percentage">
                                                                            {courseTypeStats.totalPaid > 0 
                                                                                ? (((courseTypeStats.totalPaid - statistics.cashPayments - statistics.paynowPayments) / courseTypeStats.totalPaid) * 100).toFixed(1)
                                                                                : 0}%
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            } else if (selectedCourseTypeOverviewTab === 'ILP') {
                                                // ILP - Direct confirmation status view (no sub-tabs needed)
                                                return (
                                                    <div className="stats-grid">
                                                        <div className="stat-card info">
                                                            <div className="stat-icon">📋</div>
                                                            <div className="stat-content">
                                                                <h3>Total Registrations</h3>
                                                                <p className="stat-number">{courseTypeStats.totalRegistrations}</p>
                                                                <p className="stat-percentage">100%</p>
                                                            </div>
                                                        </div>

                                                        <div className="stat-card success">
                                                            <div className="stat-icon">✅</div>
                                                            <div className="stat-content">
                                                                <h3>Confirmed</h3>
                                                                <p className="stat-number">{courseTypeStats.totalConfirmed}</p>
                                                                <p className="stat-percentage">
                                                                    {courseTypeStats.totalRegistrations > 0 
                                                                        ? ((courseTypeStats.totalConfirmed / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="stat-card warning">
                                                            <div className="stat-icon">⏳</div>
                                                            <div className="stat-content">
                                                                <h3>Pending</h3>
                                                                <p className="stat-number">{courseTypeStats.totalPending}</p>
                                                                <p className="stat-percentage">
                                                                    {courseTypeStats.totalRegistrations > 0 
                                                                        ? ((courseTypeStats.totalPending / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="stat-card info">
                                                            <div className="stat-icon">🚪</div>
                                                            <div className="stat-content">
                                                                <h3>Withdrawn</h3>
                                                                <p className="stat-number">{courseTypeStats.totalWithdrawn}</p>
                                                                <p className="stat-percentage">
                                                                    {courseTypeStats.totalRegistrations > 0 
                                                                        ? ((courseTypeStats.totalWithdrawn / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                // For other course types, show all statistics
                                                return (
                                                    <div className="stats-grid">
                                                        <div className="stat-card info">
                                                            <div className="stat-icon">📋</div>
                                                            <div className="stat-content">
                                                                <h3>Total Registrations</h3>
                                                                <p className="stat-number">{courseTypeStats.totalRegistrations}</p>
                                                                <p className="stat-percentage">100%</p>
                                                            </div>
                                                        </div>

                                                        <div className="stat-card success">
                                                            <div className="stat-icon">💚</div>
                                                            <div className="stat-content">
                                                                <h3>Paid</h3>
                                                                <p className="stat-number">{courseTypeStats.totalPaid}</p>
                                                                <p className="stat-percentage">
                                                                    {courseTypeStats.totalRegistrations > 0 
                                                                        ? ((courseTypeStats.totalPaid / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="stat-card warning">
                                                            <div className="stat-icon">⏳</div>
                                                            <div className="stat-content">
                                                                <h3>Not Paid</h3>
                                                                <p className="stat-number">{courseTypeStats.totalNotPaid}</p>
                                                                <p className="stat-percentage">
                                                                    {courseTypeStats.totalRegistrations > 0 
                                                                        ? ((courseTypeStats.totalNotPaid / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="stat-card success">
                                                            <div className="stat-icon">✅</div>
                                                            <div className="stat-content">
                                                                <h3>Confirmed</h3>
                                                                <p className="stat-number">{courseTypeStats.totalConfirmed}</p>
                                                                <p className="stat-percentage">
                                                                    {courseTypeStats.totalRegistrations > 0 
                                                                        ? ((courseTypeStats.totalConfirmed / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="stat-card warning">
                                                            <div className="stat-icon">⏳</div>
                                                            <div className="stat-content">
                                                                <h3>Pending</h3>
                                                                <p className="stat-number">{courseTypeStats.totalPending}</p>
                                                                <p className="stat-percentage">
                                                                    {courseTypeStats.totalRegistrations > 0 
                                                                        ? ((courseTypeStats.totalPending / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="stat-card danger">
                                                            <div className="stat-icon">🔄</div>
                                                            <div className="stat-content">
                                                                <h3>Refunded</h3>
                                                                <p className="stat-number">{courseTypeStats.totalRefunded}</p>
                                                                <p className="stat-percentage">
                                                                    {courseTypeStats.totalRegistrations > 0 
                                                                        ? ((courseTypeStats.totalRefunded / courseTypeStats.totalRegistrations) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                );
                            } else {
                                // Show direct sections based on course type
                                return (
                                    <>
                                        {/* Payment Status Section */}
                                        {statusConfig.showPaymentStatus && (
                                            <div className="stats-group">
                                                <div className="stats-group-header">
                                                    <h4>💰 Payment Status</h4>
                                                </div>
                                                <div className="stats-grid">
                                                    <div className="stat-card success">
                                                        <div className="stat-icon">💚</div>
                                                        <div className="stat-content">
                                                            <h3>Paid</h3>
                                                            <p className="stat-number">{statistics.totalPaid}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalRegistrations > 0 
                                                                    ? ((statistics.totalPaid / statistics.totalRegistrations) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="stat-card warning">
                                                        <div className="stat-icon">⏳</div>
                                                        <div className="stat-content">
                                                            <h3>Not Paid</h3>
                                                            <p className="stat-number">{statistics.totalNotPaid}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalRegistrations > 0 
                                                                    ? ((statistics.totalNotPaid / statistics.totalRegistrations) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="stat-card danger">
                                                        <div className="stat-icon">🔄</div>
                                                        <div className="stat-content">
                                                            <h3>Refunded</h3>
                                                            <p className="stat-number">{statistics.totalRefunded}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalRegistrations > 0 
                                                                    ? ((statistics.totalRefunded / statistics.totalRegistrations) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Confirmation Status Section */}
                                        {statusConfig.showConfirmationStatus && (
                                            <div className="stats-group">
                                                <div className="stats-group-header">
                                                    <h4>✅ Confirmation Status</h4>
                                                </div>
                                                <div className="stats-grid">
                                                    <div className="stat-card success">
                                                        <div className="stat-icon">✅</div>
                                                        <div className="stat-content">
                                                            <h3>Confirmed</h3>
                                                            <p className="stat-number">{statistics.totalConfirmed}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalRegistrations > 0 
                                                                    ? ((statistics.totalConfirmed / statistics.totalRegistrations) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="stat-card warning">
                                                        <div className="stat-icon">⏳</div>
                                                        <div className="stat-content">
                                                            <h3>Pending</h3>
                                                            <p className="stat-number">{statistics.totalPending}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalRegistrations > 0 
                                                                    ? ((statistics.totalPending / statistics.totalRegistrations) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="stat-card danger">
                                                        <div className="stat-icon">❌</div>
                                                        <div className="stat-content">
                                                            <h3>Cancelled</h3>
                                                            <p className="stat-number">{statistics.totalCancelled}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalRegistrations > 0 
                                                                    ? ((statistics.totalCancelled / statistics.totalRegistrations) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="stat-card info">
                                                        <div className="stat-icon">🚪</div>
                                                        <div className="stat-content">
                                                            <h3>Withdrawn</h3>
                                                            <p className="stat-number">{statistics.totalWithdrawn}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalRegistrations > 0 
                                                                    ? ((statistics.totalWithdrawn / statistics.totalRegistrations) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Methods Section */}
                                        {statusConfig.showPaymentMethods && (
                                            <div className="stats-group">
                                                <div className="stats-group-header">
                                                    <h4>💳 Payment Methods</h4>
                                                </div>
                                                <div className="stats-grid">
                                                    <div className="stat-card info">
                                                        <div className="stat-icon">💵</div>
                                                        <div className="stat-content">
                                                            <h3>Cash</h3>
                                                            <p className="stat-number">{statistics.cashPayments}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalPaid > 0 
                                                                    ? ((statistics.cashPayments / statistics.totalPaid) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="stat-card info">
                                                        <div className="stat-icon">📱</div>
                                                        <div className="stat-content">
                                                            <h3>PayNow</h3>
                                                            <p className="stat-number">{statistics.paynowPayments}</p>
                                                            <p className="stat-percentage">
                                                                {statistics.totalPaid > 0 
                                                                    ? ((statistics.paynowPayments / statistics.totalPaid) * 100).toFixed(1)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {statusConfig.showSkillsFuture && (
                                                        <div className="stat-card info">
                                                            <div className="stat-icon">🎓</div>
                                                            <div className="stat-content">
                                                                <h3>SkillsFuture</h3>
                                                                <p className="stat-number">{statistics.skillsfuturePayments}</p>
                                                                <p className="stat-percentage">
                                                                    {statistics.totalPaid > 0 
                                                                        ? ((statistics.skillsfuturePayments / statistics.totalPaid) * 100).toFixed(1)
                                                                        : 0}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            }
                        })()}
                    </div>

                    {/* Registration Summary */}
                    <div className="dashboard-summary">
                        <h3>📈 Registration Summary</h3>
                        <div className="summary-content">
                            <p>
                                <strong>Current View:</strong> {statistics.totalRegistrations} registrations
                                {selectedQuarter && ` for ${selectedQuarter}`}
                                {selectedLocation && ` at ${selectedLocation}`}
                                {selectedCourse && ` for ${selectedCourse}`}
                            </p>
                            
                            {statistics.totalRegistrations > 0 && (
                                <div className="summary-insights" style={{display: 'none'}}>
                                    <h4 style={{display: 'none'}}>Key Metrics Removed</h4>
                                    <div className="insights-grid">
                                        <div className="insight-card success">
                                            <div className="insight-icon">�</div>
                                            <div className="insight-content">
                                                <h5>Course Types Available</h5>
                                                <p className="insight-value">{this.getAvailableCourseTypes().length}</p>
                                                <small>Different course categories offered</small>
                                            </div>
                                        </div>

                                        <div className="insight-card info">
                                            <div className="insight-icon">�</div>
                                            <div className="insight-content">
                                                <h5>Total Courses</h5>
                                                <p className="insight-value">{this.getAvailableCourses().length}</p>
                                                <small>Individual courses available</small>
                                            </div>
                                        </div>

                                        <div className="insight-card warning">
                                            <div className="insight-icon">�</div>
                                            <div className="insight-content">
                                                <h5>Avg Enrollment</h5>
                                                <p className="insight-value">
                                                    {this.getAvailableCourses().length > 0 
                                                        ? Math.round(statistics.totalRegistrations / this.getAvailableCourses().length)
                                                        : 0}
                                                </p>
                                                <small>Average registrations per course</small>
                                            </div>
                                        </div>

                                        <div className="insight-card primary">
                                            <div className="insight-icon">�</div>
                                            <div className="insight-content">
                                                <h5>Most Popular Type</h5>
                                                <p className="insight-value">
                                                    {(() => {
                                                        const courseTypeCounts = {};
                                                        this.state.registrationData.forEach(reg => {
                                                            if (reg.course && reg.course.courseType) {
                                                                courseTypeCounts[reg.course.courseType] = (courseTypeCounts[reg.course.courseType] || 0) + 1;
                                                            }
                                                        });
                                                        const mostPopular = Object.keys(courseTypeCounts).reduce((a, b) => 
                                                            courseTypeCounts[a] > courseTypeCounts[b] ? a : b, 'N/A');
                                                        return mostPopular.length > 15 ? mostPopular.substring(0, 12) + '...' : mostPopular;
                                                    })()}
                                                </p>
                                                <small>Most enrolled course category</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Course Breakdown */}
                            <div className="breakdown-section">
                                <h4>📚 Registration Distribution by Individual Courses:</h4>
                                <div className="breakdown-chart scrollable-chart">
                                    {this.getRegistrationBreakdownByCourse().map((courseData, index) => {
                                        const percentage = statistics.totalRegistrations > 0 ? 
                                            (courseData.count / statistics.totalRegistrations) * 100 : 0;
                                        return (
                                            <div key={courseData.courseName} className="chart-bar-container">
                                                <div className="chart-label">
                                                    <span className="location-name">{courseData.courseName}</span>
                                                    <span className="location-stats">
                                                        {courseData.count} registrations ({percentage.toFixed(1)}% of total)
                                                    </span>
                                                </div>
                                                <div className="chart-bar">
                                                    <div 
                                                        className="chart-bar-fill"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: `hsl(${200 + (index * 40)}, 70%, 50%)`
                                                        }}
                                                    ></div>
                                                    <span className="chart-percentage">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Location Breakdown */}
                            <div className="breakdown-section">
                                <h4>🌍 Registration Distribution by Location:</h4>
                                <div className="breakdown-chart">
                                    {this.getRegistrationBreakdownByLocation().map((locationData, index) => {
                                        const percentage = statistics.totalRegistrations > 0 ? 
                                            (locationData.count / statistics.totalRegistrations) * 100 : 0;
                                        return (
                                            <div key={locationData.location} className="chart-bar-container">
                                                <div className="chart-label">
                                                    <span className="location-name">{locationData.location}</span>
                                                    <span className="location-stats">
                                                        {locationData.count} registrations ({percentage.toFixed(1)}% of total)
                                                    </span>
                                                </div>
                                                <div className="chart-bar">
                                                    <div 
                                                        className="chart-bar-fill"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: `hsl(${120 + (index * 30)}, 60%, 50%)`
                                                        }}
                                                    ></div>
                                                    <span className="chart-percentage">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default RegistrationDashboard;
