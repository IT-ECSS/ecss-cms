import React, { Component } from "react";
import axios from 'axios';
import '../../../css/sub/dashboardSection.css';

class DashboardSection extends Component {
    constructor(props) {
        super(props);
        this.state = {
            registrationData: [],
            loading: true,
            error: null,
            selectedQuarter: '',
            selectedLocation: '',
            selectedCourse: '',
            selectedCourseType: 'All', // Default to All courses
            statistics: {
                totalRegistrations: 0,
                totalPaid: 0,
                totalNotPaid: 0,
                totalRefunded: 0,
                totalConfirmed: 0,
                cashPayments: 0,
                paynowPayments: 0,
                skillsfuturePayments: 0,
                paymentCompletionRate: 0
            }
        };
    }

    componentDidMount = async() =>
    {
        console.log('DashboardSection mounted');
        await this.fetchRegistrationData();
        //console.log("This props:", this.props);
        this.props.closePopup1();
    }

    // Fetch registration data from backend
    fetchRegistrationData = async () => {
        try {
            // Get user role and siteIC from props, localStorage, or default values
            const role = this.props.role || localStorage.getItem('userRole') || 'admin';
            console.log("User Role:", role);
            const siteIC = this.props.siteIC || localStorage.getItem('siteIC') || '';
            
            console.log('Fetching data with role:', role, 'and siteIC:', siteIC);
            
            const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/courseregistration`, { 
                purpose: 'retrieve', 
                role, 
                siteIC 
            });

            console.log('Registration data loaded from API:', response.data);
            
            // Ensure response.data is an array - handle different API response structures
            const dataArray = Array.isArray(response.data) ? response.data : 
                             (response.data && Array.isArray(response.data.result)) ? response.data.result :
                             (response.data && Array.isArray(response.data.data)) ? response.data.data :
                             [];
            
            console.log('Processed registration data array:', dataArray);
            
            // Filter data based on siteIC
            const filteredData = this.filterDataBySiteIC(dataArray, siteIC);
            console.log('Filtered data based on siteIC:', filteredData);
            
            this.setState({
                registrationData: filteredData,
                loading: false
            }, () => {
                // Set the earliest quarter as default
                const quarters = this.getAvailableQuarters();
                if (quarters.length > 0 && !this.state.selectedQuarter) {
                    this.setState({ selectedQuarter: quarters[0] }, () => {
                        this.calculateStatistics();
                    });
                } else {
                    this.calculateStatistics();
                }
            });

        } catch (error) {
            console.error('Error fetching registration data:', error);
            this.setState({
                error: 'Failed to load registration data. Please try again.',
                loading: false
            });
        }
    };

    // Filter data based on siteIC
    filterDataBySiteIC = (dataArray, siteIC) => {
        console.log('Filtering data with siteIC:', siteIC);
        
        // If siteIC is empty string, show all data
        if (!siteIC || siteIC === '') {
            console.log('siteIC is empty, showing all data');
            return dataArray;
        }
        
        // If siteIC is an array and has more than one element, show all data
        if (Array.isArray(siteIC) && siteIC.length > 1) {
            console.log('siteIC is an array with more than one element, showing all data');
            return dataArray;
        }
        
        // If siteIC is an array with only one element, filter for that site
        if (Array.isArray(siteIC) && siteIC.length === 1) {
            console.log('siteIC is an array with one element, filtering for site:', siteIC[0]);
            return dataArray.filter(record => {
                const recordSite = record.course?.courseLocation || record.siteIC || '';
                return recordSite === siteIC[0];
            });
        }
        
        // If siteIC is a specific value, show only data for that site
        console.log('siteIC is a specific value, filtering for site:', siteIC);
        return dataArray.filter(record => {
            const recordSite = record.course?.courseLocation || record.siteIC || '';
            return recordSite === siteIC;
        });
    };

    // Get quarter from date string
    getQuarterFromDate = (dateString) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.warn('Invalid date string:', dateString);
                return null;
            }

            const month = date.getMonth();
            const year = date.getFullYear();
            
            if (month >= 0 && month <= 2) {
                return `Q1 January - March ${year}`;
            } else if (month >= 3 && month <= 5) {
                return `Q2 April - June ${year}`;
            } else if (month >= 6 && month <= 8) {
                return `Q3 July - September ${year}`;
            } else {
                return `Q4 October - December ${year}`;
            }
        } catch (error) {
            console.error('Error parsing date for quarter calculation:', dateString, error);
            return null;
        }
    };

    // Get available quarters from registration data
    getAvailableQuarters = () => {
        const { registrationData } = this.state;
        const quarters = new Set();

        // Ensure registrationData is an array
        if (!Array.isArray(registrationData)) {
            console.warn('registrationData is not an array:', registrationData);
            return [];
        }

        registrationData.forEach(record => {
            if (record.course && record.course.courseDuration) {
                try {
                    const courseDuration = record.course.courseDuration;
                    const startDateStr = courseDuration.split(' - ')[0].trim();
                    
                    const quarter = this.getQuarterFromDate(startDateStr);
                    if (quarter) {
                        console.log(`Course: ${record.course.courseEngName}, Start Date: ${startDateStr}, Quarter: ${quarter}`);
                        quarters.add(quarter);
                    }
                } catch (error) {
                    console.error('Error processing courseDuration:', record.course.courseDuration, error);
                }
            }
        });
        
        // Convert to array and sort with earliest first
        const sortedQuarters = Array.from(quarters).sort((a, b) => {
            const getYearAndQuarter = (quarterStr) => {
                const year = parseInt(quarterStr.match(/\d{4}/)[0]);
                const qNum = parseInt(quarterStr.match(/Q(\d)/)[1]);
                return { year, quarter: qNum };
            };
            
            const aData = getYearAndQuarter(a);
            const bData = getYearAndQuarter(b);
            
            if (aData.year !== bData.year) {
                return aData.year - bData.year; // Earliest year first
            }
            return aData.quarter - bData.quarter; // Earliest quarter first
        });
        
        console.log('Available quarters:', sortedQuarters);
        return sortedQuarters;
    };

    // Get available locations from registration data based on selected course type and quarter
    getAvailableLocations = () => {
        const { registrationData, selectedCourseType, selectedQuarter } = this.state;
        const locations = new Set();

        // Ensure registrationData is an array
        if (!Array.isArray(registrationData)) {
            console.warn('registrationData is not an array:', registrationData);
            return [];
        }

        registrationData.forEach(record => {
            if (record.course && 
                record.course.courseLocation && 
                (selectedCourseType === 'All' || record.course.courseType === selectedCourseType)) {
                
                // Check quarter filter
                let quarterMatch = true;
                if (selectedQuarter && record.course && record.course.courseDuration) {
                    const startDateStr = record.course.courseDuration.split(' - ')[0].trim();
                    const recordQuarter = this.getQuarterFromDate(startDateStr);
                    quarterMatch = recordQuarter === selectedQuarter;
                } else if (selectedQuarter) {
                    quarterMatch = false;
                }
                
                if (quarterMatch) {
                    locations.add(record.course.courseLocation);
                }
            }
        });

        const locationArray = Array.from(locations).sort();
        console.log(`Available locations for course type ${selectedCourseType} and quarter ${selectedQuarter}:`, locationArray);
        return locationArray;
    };

    // Get available courses from registration data based on selected course type, location, and quarter
    getAvailableCourses = () => {
        const { registrationData, selectedCourseType, selectedLocation, selectedQuarter } = this.state;
        const courses = new Set();

        // Ensure registrationData is an array
        if (!Array.isArray(registrationData)) {
            console.warn('registrationData is not an array:', registrationData);
            return [];
        }

        registrationData.forEach(record => {
            if (record.course && 
                record.course.courseEngName && 
                (selectedCourseType === 'All' || record.course.courseType === selectedCourseType) &&
                (selectedLocation === '' || record.course.courseLocation === selectedLocation)) {
                
                // Check quarter filter
                let quarterMatch = true;
                if (selectedQuarter && record.course && record.course.courseDuration) {
                    const startDateStr = record.course.courseDuration.split(' - ')[0].trim();
                    const recordQuarter = this.getQuarterFromDate(startDateStr);
                    quarterMatch = recordQuarter === selectedQuarter;
                } else if (selectedQuarter) {
                    quarterMatch = false;
                }
                
                if (quarterMatch) {
                    courses.add(record.course.courseEngName);
                }
            }
        });

        const courseArray = Array.from(courses).sort();
        console.log(`Available courses for course type ${selectedCourseType}, location ${selectedLocation}, and quarter ${selectedQuarter}:`, courseArray);
        return courseArray;
    };

    // Calculate statistics based on filters
    calculateStatistics = () => {
        const { registrationData, selectedQuarter, selectedLocation, selectedCourse, selectedCourseType } = this.state;
        
        console.log(`Calculating statistics for ${selectedCourseType} courses`);
        
        // Ensure registrationData is an array
        if (!Array.isArray(registrationData)) {
            console.warn('registrationData is not an array:', registrationData);
            this.setState({
                statistics: {
                    totalRegistrations: 0,
                    totalPaid: 0,
                    totalNotPaid: 0,
                    totalRefunded: 0,
                    totalConfirmed: 0,
                    cashPayments: 0,
                    paynowPayments: 0,
                    skillsfuturePayments: 0,
                    paymentCompletionRate: 0
                }
            });
            return;
        }
        
        const filteredData = registrationData.filter(record => {
            // Course type filter
            const hasCourse = record.course && (selectedCourseType === 'All' || record.course.courseType === selectedCourseType);
            
            // Quarter filter
            let quarterMatch = true;
            if (selectedQuarter && record.course && record.course.courseDuration) {
                const startDateStr = record.course.courseDuration.split(' - ')[0].trim();
                const recordQuarter = this.getQuarterFromDate(startDateStr);
                quarterMatch = recordQuarter === selectedQuarter;
            } else if (selectedQuarter) {
                quarterMatch = false;
            }
            
            // Location filter
            let locationMatch = true;
            if (selectedLocation && record.course && record.course.courseLocation) {
                locationMatch = record.course.courseLocation === selectedLocation;
            } else if (selectedLocation) {
                locationMatch = false;
            }
            
            // Course filter
            let courseMatch = true;
            if (selectedCourse && record.course && record.course.courseEngName) {
                courseMatch = record.course.courseEngName === selectedCourse;
            } else if (selectedCourse) {
                courseMatch = false;
            }
            
            return hasCourse && quarterMatch && locationMatch && courseMatch;
        });

        const totalRegistrations = filteredData.length;
        
        // Debug: Log all unique statuses to understand the data
        const allStatuses = filteredData.map(record => (record.status || '').toString().toLowerCase());
        const uniqueStatuses = [...new Set(allStatuses)];
        console.log('Unique statuses found in data:', uniqueStatuses);
        
        // Count different statuses - ensure they are mutually exclusive
        const paidCount = filteredData.filter(record => {
            const status = (record.status || '').toString().toLowerCase();
            return status === 'paid';
        }).length;

        const confirmedCount = filteredData.filter(record => {
            const status = (record.status || '').toString().toLowerCase();
            return status === 'confirmed';
        }).length;

        const refundedCount = filteredData.filter(record => {
            const status = (record.status || '').toString().toLowerCase();
            return status === 'refunded';
        }).length;

        const unpaidCount = filteredData.filter(record => {
            const status = (record.status || '').toString().toLowerCase();
            return status === 'pending' || status === 'not paid' || status === 'unpaid' || status === '';
        }).length;

        // Total paid includes both 'paid' and 'confirmed' for payment method counting
        const totalPaidCount = paidCount + confirmedCount;

        // Payment method counting - only count from paid and confirmed registrations
        const paidAndConfirmedRecords = filteredData.filter(record => {
            const status = (record.status || '').toString().toLowerCase();
            return status === 'paid' || status === 'confirmed';
        });

        // Debug: Log payment methods to understand the data
        const allPayments = paidAndConfirmedRecords.map(record => record.course?.payment || 'no payment info');
        const uniquePayments = [...new Set(allPayments)];
        console.log('Unique payment methods found in paid records:', uniquePayments);
        console.log('Total paid and confirmed records:', paidAndConfirmedRecords.length);

        const cashCount = paidAndConfirmedRecords.filter(record => {
            const payment = record.course && record.course.payment ? 
                record.course.payment.toString().toLowerCase() : '';
            return payment.includes('cash');
        }).length;

        const paynowCount = paidAndConfirmedRecords.filter(record => {
            const payment = record.course && record.course.payment ? 
                record.course.payment.toString().toLowerCase() : '';
            return payment.includes('paynow') || payment.includes('pay now');
        }).length;

        const skillsfutureCount = paidAndConfirmedRecords.filter(record => {
            const payment = record.course && record.course.payment ? 
                record.course.payment.toString().toLowerCase() : '';
            return payment.includes('skillsfuture') || payment.includes('skills future') || payment.includes('sf');
        }).length;

        console.log('Payment method counts - Cash:', cashCount, 'PayNow:', paynowCount, 'SkillsFuture:', skillsfutureCount);

        const completionRate = totalRegistrations > 0 ? (totalPaidCount / totalRegistrations) * 100 : 0;

        // Add debug logging to verify the math
        console.log('Status counts - Paid:', paidCount, 'Confirmed:', confirmedCount, 'Pending:', unpaidCount, 'Refunded:', refundedCount);
        console.log('Total from status counts:', paidCount + confirmedCount + unpaidCount + refundedCount, 'vs Total Registrations:', totalRegistrations);

        const statistics = {
            totalRegistrations,
            totalPaid: totalPaidCount,
            totalNotPaid: unpaidCount,
            totalRefunded: refundedCount,
            totalConfirmed: confirmedCount,
            cashPayments: cashCount,
            paynowPayments: paynowCount,
            skillsfuturePayments: skillsfutureCount,
            paymentCompletionRate: completionRate
        };

        this.setState({ statistics });
        return statistics;
    };

    // Get detailed course breakdown for summary
    getCourseBreakdown = () => {
        const { registrationData, selectedQuarter, selectedLocation, selectedCourseType } = this.state;
        const courseStats = {};

        if (!Array.isArray(registrationData)) {
            return [];
        }

        const filteredData = registrationData.filter(record => {
            const hasCourse = record.course && (selectedCourseType === 'All' || record.course.courseType === selectedCourseType);
            
            let quarterMatch = true;
            if (selectedQuarter && record.course && record.course.courseDuration) {
                const startDateStr = record.course.courseDuration.split(' - ')[0].trim();
                const recordQuarter = this.getQuarterFromDate(startDateStr);
                quarterMatch = recordQuarter === selectedQuarter;
            } else if (selectedQuarter) {
                quarterMatch = false;
            }
            
            let locationMatch = true;
            if (selectedLocation && record.course && record.course.courseLocation) {
                locationMatch = record.course.courseLocation === selectedLocation;
            } else if (selectedLocation) {
                locationMatch = false;
            }
            
            return hasCourse && quarterMatch && locationMatch;
        });

        filteredData.forEach(record => {
            const courseName = record.course?.courseEngName || 'Unknown Course';
            const location = record.course?.courseLocation || 'Unknown Location';
            const status = (record.status || '').toString().toLowerCase();
            
            if (!courseStats[courseName]) {
                courseStats[courseName] = {
                    name: courseName,
                    location: location,
                    total: 0,
                    paid: 0,
                    pending: 0,
                    refunded: 0
                };
            }
            
            courseStats[courseName].total += 1;
            
            if (status === 'paid' || status === 'confirmed') {
                courseStats[courseName].paid += 1;
            } else if (status === 'refunded') {
                courseStats[courseName].refunded += 1;
            } else {
                courseStats[courseName].pending += 1;
            }
        });

        return Object.values(courseStats).sort((a, b) => b.total - a.total);
    };

    // Get location breakdown
    getLocationBreakdown = () => {
        const { registrationData, selectedCourseType, selectedQuarter } = this.state;
        const locationStats = {};

        if (!Array.isArray(registrationData)) {
            return [];
        }

        const filteredData = registrationData.filter(record => {
            const hasCourse = record.course && (selectedCourseType === 'All' || record.course.courseType === selectedCourseType);
            
            let quarterMatch = true;
            if (selectedQuarter && record.course && record.course.courseDuration) {
                const startDateStr = record.course.courseDuration.split(' - ')[0].trim();
                const recordQuarter = this.getQuarterFromDate(startDateStr);
                quarterMatch = recordQuarter === selectedQuarter;
            } else if (selectedQuarter) {
                quarterMatch = false;
            }
            
            return hasCourse && quarterMatch;
        });

        filteredData.forEach(record => {
            const location = record.course?.courseLocation || 'Unknown Location';
            const status = (record.status || '').toString().toLowerCase();
            
            if (!locationStats[location]) {
                locationStats[location] = {
                    name: location,
                    total: 0,
                    paid: 0,
                    pending: 0,
                    refunded: 0
                };
            }
            
            locationStats[location].total += 1;
            
            if (status === 'paid' || status === 'confirmed') {
                locationStats[location].paid += 1;
            } else if (status === 'refunded') {
                locationStats[location].refunded += 1;
            } else {
                locationStats[location].pending += 1;
            }
        });

        return Object.values(locationStats).sort((a, b) => b.total - a.total);
    };

    // Handle filter changes
    handleQuarterChange = (event) => {
        console.log('Quarter changed to:', event.target.value);
        // Reset dependent filters when quarter changes
        this.setState({ 
            selectedQuarter: event.target.value,
            selectedLocation: '', // Reset location when quarter changes
            selectedCourse: ''    // Reset course when quarter changes
        }, () => {
            this.calculateStatistics();
        });
    };

    handleLocationChange = (event) => {
        console.log('Location changed to:', event.target.value);
        this.setState({ 
            selectedLocation: event.target.value,
            selectedCourse: '' // Reset course selection when location changes
        }, () => {
            console.log('Location filter applied, course reset');
            this.calculateStatistics();
        });
    };

    handleCourseChange = (event) => {
        console.log('Course changed to:', event.target.value);
        this.setState({ selectedCourse: event.target.value }, () => {
            this.calculateStatistics();
        });
    };

    handleCourseTypeChange = (event) => {
        console.log('Course type changed to:', event.target.value);
        this.setState({ 
            selectedCourseType: event.target.value,
            selectedLocation: '', // Reset location selection when type changes
            selectedCourse: '' // Reset course selection when type changes
        }, () => {
            console.log('Course type filter applied, location and course reset');
            this.calculateStatistics();
        });
    };

    // Reset all filters
    resetFilters = () => {
        this.setState({
            selectedQuarter: '',
            selectedLocation: '',
            selectedCourse: '',
            selectedCourseType: 'All'
        }, () => {
            this.calculateStatistics();
        });
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
                    <p>Loading dashboard data...</p>
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

        return (
            <>
                <div className="dashboard-header">
                    <div className="header-left">
                        <h2>Registration Dashboard</h2>
                    </div>
                    <div className="header-right">
                        <div className="quarter-display">
                            <select 
                                className="quarter-dropdown"
                                value={selectedQuarter}
                                onChange={this.handleQuarterChange}
                            >
                                <option value="">All Quarters</option>
                                {availableQuarters.map(quarter => (
                                    <option key={quarter} value={quarter}>
                                        {quarter}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="dashboard-filters">
                    <h3>Filters</h3>
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Course Type:</label>
                            <div className="button-group">
                                <button 
                                    className={`filter-btn ${selectedCourseType === 'All' ? 'active' : ''}`}
                                    onClick={() => this.handleCourseTypeChange({ target: { value: 'All' } })}
                                >
                                    All Courses
                                </button>
                                <button 
                                    className={`filter-btn ${selectedCourseType === 'NSA' ? 'active' : ''}`}
                                    onClick={() => this.handleCourseTypeChange({ target: { value: 'NSA' } })}
                                >
                                    NSA
                                </button>
                                <button 
                                    className={`filter-btn ${selectedCourseType === 'ILP' ? 'active' : ''}`}
                                    onClick={() => this.handleCourseTypeChange({ target: { value: 'ILP' } })}
                                >
                                    ILP
                                </button>
                            </div>
                        </div>

                        <div className="filter-group">
                            <label>Location:</label>
                            <div className="button-group">
                                <button 
                                    className={`filter-btn ${selectedLocation === '' ? 'active' : ''}`}
                                    onClick={() => this.handleLocationChange({ target: { value: '' } })}
                                >
                                    All Locations
                                </button>
                                {availableLocations.map(location => (
                                    <button 
                                        key={location}
                                        className={`filter-btn ${selectedLocation === location ? 'active' : ''}`}
                                        onClick={() => this.handleLocationChange({ target: { value: location } })}
                                    >
                                        {location}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="filter-group">
                            <label>Courses:</label>
                            <div className="button-group">
                                <button 
                                    className={`filter-btn ${selectedCourse === '' ? 'active' : ''}`}
                                    onClick={() => this.handleCourseChange({ target: { value: '' } })}
                                >
                                    All Courses
                                </button>
                                {availableCourses.map(course => (
                                    <button 
                                        key={course}
                                        className={`filter-btn ${selectedCourse === course ? 'active' : ''}`}
                                        onClick={() => this.handleCourseChange({ target: { value: course } })}
                                        title={course}
                                    >
                                        {course}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="dashboard-stats">
                    {/* Registration Overview Group */}
                    <div className="stats-group">
                        <div className="stats-group-header">
                            <h4>Registration Overview</h4>
                            {selectedLocation && (
                                <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                                    📍 Location: {selectedLocation}
                                </p>
                            )}
                            {!selectedLocation && availableLocations.length > 0 && (
                                <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                                    📍 All Locations ({availableLocations.length} locations)
                                </p>
                            )}
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card primary">
                                <div className="stat-icon">📊</div>
                                <div className="stat-content">
                                    <h3>Total Registrations</h3>
                                    <p className="stat-number">{statistics.totalRegistrations}</p>
                                    {selectedLocation && (
                                        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
                                            at {selectedLocation}
                                        </p>
                                    )}
                                    {!selectedLocation && availableLocations.length > 0 && (
                                        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
                                            across {availableLocations.length} location{availableLocations.length !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status Group */}
                    <div className="stats-group">
                        <div className="stats-group-header">
                            <h4>Payment Status</h4>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card success">
                                <div className="stat-icon">✅</div>
                                <div className="stat-content">
                                    <h3>Paid</h3>
                                    <p className="stat-number">{statistics.totalPaid}</p>
                                </div>
                            </div>

                            <div className="stat-card warning">
                                <div className="stat-icon">⏳</div>
                                <div className="stat-content">
                                    <h3>Pending</h3>
                                    <p className="stat-number">{statistics.totalNotPaid}</p>
                                </div>
                            </div>

                            <div className="stat-card danger">
                                <div className="stat-icon">💰</div>
                                <div className="stat-content">
                                    <h3>Refunded</h3>
                                    <p className="stat-number">{statistics.totalRefunded}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods Group */}
                    <div className="stats-group">
                        <div className="stats-group-header">
                            <h4>Payment Methods</h4>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card info">
                                <div className="stat-icon">💵</div>
                                <div className="stat-content">
                                    <h3>Cash Payments</h3>
                                    <p className="stat-number">{statistics.cashPayments}</p>
                                </div>
                            </div>

                            <div className="stat-card info">
                                <div className="stat-icon">📱</div>
                                <div className="stat-content">
                                    <h3>PayNow Payments</h3>
                                    <p className="stat-number">{statistics.paynowPayments}</p>
                                </div>
                            </div>

                            <div className="stat-card info">
                                <div className="stat-icon">🎓</div>
                                <div className="stat-content">
                                    <h3>SkillsFuture</h3>
                                    <p className="stat-number">{statistics.skillsfuturePayments}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="dashboard-summary">
                    <h3>Summary</h3>
                    <div className="summary-content">
                        <p>
                            Showing statistics for <strong>{selectedCourseType === 'All' ? 'All' : selectedCourseType}</strong> courses
                            {selectedQuarter && ` in ${selectedQuarter}`}
                            {selectedLocation && ` at ${selectedLocation}`}
                            {selectedCourse && ` for "${selectedCourse}"`}
                        </p>
                        
                        {statistics.totalRegistrations > 0 && (
                            <div className="summary-insights">
                                <h4>Key Insights:</h4>
                                <ul>
                                    <li>
                                        {statistics.paymentCompletionRate >= 80 ? '✅' : statistics.paymentCompletionRate >= 60 ? '⚠️' : '❌'} 
                                        Payment completion rate: {statistics.paymentCompletionRate.toFixed(1)}%
                                    </li>
                                    <li>
                                        Most popular payment method: {
                                            Math.max(statistics.cashPayments, statistics.paynowPayments, statistics.skillsfuturePayments) === statistics.cashPayments ? 'Cash' :
                                            Math.max(statistics.paynowPayments, statistics.skillsfuturePayments) === statistics.paynowPayments ? 'PayNow' : 'SkillsFuture'
                                        }
                                    </li>
                                    {statistics.totalRefunded > 0 && (
                                        <li>⚠️ {statistics.totalRefunded} refund(s) processed</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Location Breakdown */}
                        {!selectedLocation && (
                            <div className="breakdown-section">
                                <h4>Registration by Location:</h4>
                                <div className="breakdown-chart">
                                    {this.getLocationBreakdown().map((location, index) => {
                                        const percentage = statistics.totalRegistrations > 0 ? 
                                            (location.total / statistics.totalRegistrations) * 100 : 0;
                                        return (
                                            <div key={location.name} className="chart-bar-container">
                                                <div className="chart-label">
                                                    <span className="location-name">{location.name}</span>
                                                    <span className="location-stats">
                                                        {location.total} total ({location.paid} paid, {location.pending} pending)
                                                    </span>
                                                </div>
                                                <div className="chart-bar">
                                                    <div 
                                                        className="chart-bar-fill"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: `hsl(${210 + (index * 30)}, 70%, 50%)`
                                                        }}
                                                    ></div>
                                                    <span className="chart-percentage">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Course Breakdown */}
                        {!selectedCourse && (
                            <div className="breakdown-section">
                                <h4>Registration by Course:</h4>
                                <div className="breakdown-chart">
                                    {this.getCourseBreakdown().slice(0, 10).map((course, index) => {
                                        const percentage = statistics.totalRegistrations > 0 ? 
                                            (course.total / statistics.totalRegistrations) * 100 : 0;
                                        return (
                                            <div key={course.name} className="chart-bar-container">
                                                <div className="chart-label">
                                                    <span className="course-name" title={course.name}>
                                                        {course.name}
                                                    </span>
                                                    <span className="course-details">
                                                        📍 {course.location} | {course.total} total 
                                                        ({course.paid} paid, {course.pending} pending
                                                        {course.refunded > 0 && `, ${course.refunded} refunded`})
                                                    </span>
                                                </div>
                                                <div className="chart-bar">
                                                    <div 
                                                        className="chart-bar-fill"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: `hsl(${120 + (index * 25)}, 60%, 50%)`
                                                        }}
                                                    ></div>
                                                    <span className="chart-percentage">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {this.getCourseBreakdown().length > 10 && (
                                    <p className="breakdown-note">
                                        Showing top 10 courses out of {this.getCourseBreakdown().length} total courses
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }
}

export default DashboardSection;
