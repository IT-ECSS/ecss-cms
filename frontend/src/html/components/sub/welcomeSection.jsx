import React, { Component } from 'react';
import '../../../css/sub/welcomeSection.css';

class WelcomeSection extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentTime: new Date(),
            expandedCard: null
        };
    }

    // Role-based quick actions mapping based on actual user sub-access rights
    getRoleBasedActions = () => {
        const { accessRights = {} } = this.props;
        
        // Debug logging to see what access rights are being received
        console.log('Access Rights received in welcomeSection:', accessRights);
        
        // Define all possible actions with their access right mappings
        const allActions = [
            { 
                key: 'Create Account', 
                title: 'Create Account', 
                icon: 'fas fa-user-plus', 
                description: 'Add new user accounts to the system', 
                action: () => this.props.onNavigate('create-account'),
                accessKey: 'Create Account',
                parentKey: 'Account'
            },
            { 
                key: 'Account Table', 
                title: 'Manage Accounts', 
                icon: 'fas fa-users-cog', 
                description: 'View and manage user accounts', 
                action: () => this.props.onNavigate('accounts'),
                accessKey: 'Account Table',
                parentKey: 'Account'
            },
            { 
                key: 'Access Rights Table', 
                title: 'Access Rights', 
                icon: 'fas fa-shield-alt', 
                description: 'Configure user permissions and access rights', 
                action: () => this.props.onNavigate('access-rights'),
                accessKey: 'Access Rights Table',
                parentKey: 'Account'
            },
            { 
                key: 'Registration And Payment Table', 
                title: 'Registrations & Payments', 
                icon: 'fas fa-credit-card', 
                description: 'Manage course registrations and payments', 
                action: () => this.props.onNavigate('registration'),
                accessKey: 'Registration And Payment Table',
                parentKey: 'Registration And Payment'
            },
            { 
                key: 'NSA Courses', 
                title: 'NSA Courses', 
                icon: 'fas fa-graduation-cap', 
                description: 'Manage NSA course offerings', 
                action: () => this.props.onNavigate('nsa-courses'),
                accessKey: 'NSA Courses',
                parentKey: 'Courses'
            },
            { 
                key: 'ILP Courses', 
                title: 'ILP Courses', 
                icon: 'fas fa-book-open', 
                description: 'Manage ILP course offerings', 
                action: () => this.props.onNavigate('ilp-courses'),
                accessKey: 'ILP Courses',
                parentKey: 'Courses'
            },
            { 
                key: 'Marriage Preparation Programme Courses', 
                title: 'Marriage Preparation Course', 
                icon: 'fas fa-heart', 
                description: 'Manage Marriage Preparation course offerings', 
                action: () => this.props.onNavigate('marriage-preparation-programme-courses'),
                accessKey: 'Marriage Preparation Programme Courses',
                parentKey: 'Courses'
            },
            { 
                key: 'Talks And Seminar', 
                title: 'Talks And Seminar', 
                icon: 'fas fa-microphone', 
                description: 'Manage talks and seminar offerings', 
                action: () => this.props.onNavigate('talks-and-seminar'),
                accessKey: 'Talks And Seminar',
                parentKey: 'Courses'
            },
            { 
                key: 'View Attendance', 
                title: 'View Attendance', 
                icon: 'fas fa-clipboard-check', 
                description: 'Monitor and record student attendance', 
                action: () => this.props.onNavigate('attendance'),
                accessKey: 'View Attendance',
                parentKey: 'Attendances',
                alternateParentKey: 'Attendance'
            },
            { 
                key: 'View Membership', 
                title: 'View Membership', 
                icon: 'fas fa-id-card', 
                description: 'Manage member information and records', 
                action: () => this.props.onNavigate('membership'),
                accessKey: 'View Membership',
                parentKey: 'Membership',
                alternateParentKey: 'membership'
            },
            { 
                key: 'Monthly Report', 
                title: 'Monthly Report', 
                icon: 'fas fa-chart-bar', 
                description: 'Generate monthly analytics reports', 
                action: () => this.props.onNavigate('monthly-report'),
                accessKey: 'Monthly Report',
                parentKey: 'Reports'
            },
            { 
                key: 'Payment Report', 
                title: 'Payment Report', 
                icon: 'fas fa-file-invoice-dollar', 
                description: 'Generate payment and financial reports', 
                action: () => this.props.onNavigate('payment-report'),
                accessKey: 'Payment Report',
                parentKey: 'Reports'
            },
            { 
                key: 'Upload Courses', 
                title: 'Upload Courses', 
                icon: 'fas fa-upload', 
                description: 'Upload new course data', 
                action: () => this.props.onNavigate('upload-courses'),
                accessKey: 'Upload Courses',
                parentKey: 'Courses'
            },
            { 
                key: 'Create QR Code', 
                title: 'Create QR Code', 
                icon: 'fas fa-qrcode', 
                description: 'Generate QR codes for courses', 
                action: () => this.props.onNavigate('qr-code'),
                accessKey: 'Create QR Code',
                parentKey: 'QR Code'
            },
            { 
                key: 'QR Code Table', 
                title: 'QR Code Management', 
                icon: 'fas fa-table', 
                description: 'Manage QR code records', 
                action: () => this.props.onNavigate('qr-code-table'),
                accessKey: 'QR Code Table',
                parentKey: 'QR Code'
            },
            { 
                key: 'Invoice Table', 
                title: 'Invoice Management', 
                icon: 'fas fa-file-invoice', 
                description: 'Manage invoices and billing', 
                action: () => this.props.onNavigate('invoice'),
                accessKey: 'Invoice Table',
                parentKey: 'Registration And Payment'
            },
            { 
                key: 'Update Courses', 
                title: 'Update Courses', 
                icon: 'fas fa-edit', 
                description: 'Update existing course information', 
                action: () => this.props.onNavigate('update-courses'),
                accessKey: 'Update Courses',
                parentKey: 'Courses'
            },
            { 
                key: 'Delete Courses', 
                title: 'Delete Courses', 
                icon: 'fas fa-trash-alt', 
                description: 'Remove courses from system', 
                action: () => this.props.onNavigate('delete-courses'),
                accessKey: 'Delete Courses',
                parentKey: 'Courses'
            },
            { 
                key: 'Update QR Code', 
                title: 'Update QR Code', 
                icon: 'fas fa-edit', 
                description: 'Update existing QR codes', 
                action: () => this.props.onNavigate('update-qr-code'),
                accessKey: 'Update QR Code',
                parentKey: 'QR Code'
            },
            { 
                key: 'Delete QR Code', 
                title: 'Delete QR Code', 
                icon: 'fas fa-trash', 
                description: 'Remove QR codes from system', 
                action: () => this.props.onNavigate('delete-qr-code'),
                accessKey: 'Delete QR Code',
                parentKey: 'QR Code'
            },
            { 
                key: 'FFT Results', 
                title: 'FFT Results', 
                icon: 'fas fa-file-alt', 
                description: 'View fitness assessment results and tracking', 
                action: () => this.props.onNavigate('fitness'),
                accessKey: 'FFT Results',
                parentKey: 'Fitness'
            },
            { 
                key: 'Fundraising Table', 
                title: 'Fundraising Table', 
                icon: 'fa-solid fa-hand-holding-dollar', 
                description: 'Manage fundraising orders and products', 
                action: () => this.props.onNavigate('fundraising-table'),
                accessKey: 'Fundraising Table',
                parentKey: 'Fundraising'
            }
        ];

        // Helper function to check if user has access to a specific sub-key
        const hasAccess = (action) => {
            const { parentKey, accessKey, alternateParentKey } = action;
            
            // Debug logging for each action check
            console.log(`Checking access for ${action.title}: ${parentKey}.${accessKey}`);
            
            // Check primary parent key
            if (accessRights[parentKey] && 
                typeof accessRights[parentKey] === 'object' && 
                accessRights[parentKey][accessKey] === true) {
                console.log(`✅ Access granted for ${action.title}`);
                return true;
            }
            
            // Check alternate parent key if provided
            if (alternateParentKey && 
                accessRights[alternateParentKey] && 
                typeof accessRights[alternateParentKey] === 'object' && 
                accessRights[alternateParentKey][accessKey] === true) {
                console.log(`✅ Access granted for ${action.title} (alternate path)`);
                return true;
            }
            
            // Handle special case where Registration And Payment might be a boolean
            if (parentKey === 'Registration And Payment' && 
                accessRights[parentKey] === true && 
                accessKey === 'Registration And Payment Table') {
                console.log(`✅ Access granted for ${action.title} (boolean path)`);
                return true;
            }
            
            console.log(`❌ Access denied for ${action.title}`);
            return false;
        };

        // Filter actions based on user's actual sub-access rights
        const userActions = allActions.filter(action => hasAccess(action));
        console.log('Filtered user actions:', userActions.map(a => a.title));

        // Prioritize actions based on importance
        const prioritizeActions = (actions) => {
            const priority = {
                'Registration And Payment Table': 10,
                'NSA Courses': 9,
                'ILP Courses': 8,
                'Marriage Preparation Programme Courses': 8,
                'View Attendance': 7,
                'View Membership': 6,
                'Create Account': 5,
                'Account Table': 5,
                'Access Rights Table': 4,
                'Monthly Report': 3,
                'Payment Report': 3,
                'Invoice Table': 3,
                'Upload Courses': 2,
                'Update Courses': 2,
                'Fundraising Table': 4,
                'FFT Results': 2,
                'Create QR Code': 1,
                'QR Code Table': 1,
                'Update QR Code': 1,
                'Delete QR Code': 1,
                'Delete Courses': 1
            };

            return actions.sort((a, b) => {
                const priorityA = priority[a.key] || 0;
                const priorityB = priority[b.key] || 0;
                return priorityB - priorityA;
            });
        };

        // Sort by priority and limit to top 6 most relevant actions
        const prioritizedActions = prioritizeActions(userActions);
        
        // Add any additional dynamic actions from database that aren't in the predefined list
        const dynamicActions = [];
        const iconMapping = {
            'Create Account': 'fas fa-user-plus',
            'Account Table': 'fas fa-users-cog',
            'Access Rights Table': 'fas fa-shield-alt',
            'NSA Courses': 'fas fa-graduation-cap',
            'ILP Courses': 'fas fa-book-open',
            'Marriage Preparation Programme Courses': 'fas fa-heart',
            'Talks And Seminar': 'fas fa-microphone',
            'Registration And Payment Table': 'fas fa-credit-card',
            'Monthly Report': 'fas fa-chart-bar',
            'Payment Report': 'fas fa-file-invoice-dollar',
            'Upload Courses': 'fas fa-upload',
            'Create QR Code': 'fas fa-qrcode',
            'QR Code Table': 'fas fa-table',
            'Delete QR Code': 'fas fa-trash-alt',
            'View Attendance': 'fas fa-calendar-check',
            'View Membership': 'fas fa-id-card'
        };

        const navigationMapping = {
            'Create Account': 'create-account',
            'Account Table': 'accounts',
            'Access Rights Table': 'access-rights',
            'NSA Courses': 'nsa-courses',
            'ILP Courses': 'ilp-courses',
            'Marriage Preparation Programme Courses': 'marriage-courses',
            'Talks And Seminar': 'talks-and-seminar',
            'Registration And Payment Table': 'registration',
            'Monthly Report': 'monthly-report',
            'Payment Report': 'payment-report',
            'Upload Courses': 'upload-courses',
            'Create QR Code': 'qr-code',
            'QR Code Table': 'qr-code-table',
            'Delete QR Code': 'delete-qr-code',
            'View Attendance': 'attendance',
            'View Membership': 'membership'
        };

        // Scan database access rights for any subkeys not in predefined actions
        Object.keys(accessRights).forEach((mainKey) => {
            const value = accessRights[mainKey];
            
            if (typeof value === 'object' && value !== null) {
                Object.keys(value).forEach((subKey) => {
                    if (value[subKey] === true) {
                        // Check if this subkey is not already in prioritizedActions
                        const exists = prioritizedActions.find(action => action.key === subKey);
                        if (!exists) {
                            dynamicActions.push({
                                key: subKey,
                                title: subKey,
                                icon: iconMapping[subKey] || 'fas fa-cog',
                                description: `Access ${subKey} functionality`,
                                action: () => {
                                    const navKey = navigationMapping[subKey] || subKey.toLowerCase().replace(/\s+/g, '-');
                                    this.props.onNavigate(navKey);
                                }
                            });
                        }
                    }
                });
            }
        });

        // Combine predefined and dynamic actions, prioritize predefined ones
        const allDynamicActions = [...prioritizedActions, ...dynamicActions];
        
        console.log('Final actions (predefined + dynamic):', allDynamicActions.map(a => a.title));
        
        return allDynamicActions;
    };

    // Get navigation cards based on access rights (simulating sidebar structure)
    getNavigationCards = () => {
        const { accessRights = {} } = this.props;
        
        // Icon mapping for main navigation items
        const iconMap = {
            "Account": 'fas fa-users',
            "Courses": "fas fa-chalkboard-user",
            "Registration And Payment": 'fas fa-wpforms',
            "Membership": 'fas fa-address-card',
            "QR Code": 'fas fa-qrcode',
            "Reports": 'fas fa-table',
            "Attendances": 'fas fa-calendar-days',
            "Fitness": 'fas fa-dumbbell',
            "Fundraising": 'fa-solid fa-gift'
        };

        // Define sub-key descriptions
        const subKeyDescriptions = {
            "Create Account": "Add new user accounts to the system",
            "Account Table": "View and manage existing accounts", 
            "Access Rights Table": "Configure user permissions and access rights",
            "NSA Courses": "Manage NSA courses offerings and schedules",
            "ILP Courses": "Manage ILP courses offerings and programs",
            "Marriage Preparation Course": "Manage Marriage Preparation courses offerings and programs",
            "Registration And Payment Table": "Handle course registrations and payments",
            "Monthly Report": "Generate monthly analytics and reports",
            "Payment Report": "View payment summaries and financial reports",
            "View Attendance": "Monitor and record student attendance",
            "View Membership": "Manage member information and records",
            "FFT Results": "View fitness assessment results and tracking",
            "Fundraising Table": "Manage fundraising orders and products"
        };

        const navigationCards = [];

        Object.keys(accessRights).forEach((mainKey) => {
            const value = accessRights[mainKey];
            
            if (value === true) {
                // Single item navigation
                navigationCards.push({
                    key: mainKey,
                    title: mainKey,
                    icon: iconMap[mainKey] || 'fas fa-folder',
                    description: `Access ${mainKey} functionality`,
                    subKeys: [],
                    hasSubKeys: false
                });
            } else if (typeof value === 'object' && value !== null) {
                // Multi-item navigation with sub-keys
                const subKeys = Object.keys(value).filter(subKey => value[subKey] === true);
                if (subKeys.length > 0) {
                    navigationCards.push({
                        key: mainKey,
                        title: mainKey,
                        icon: iconMap[mainKey] || 'fas fa-folder',
                        description: `Manage ${mainKey} options (${subKeys.length} items)`,
                        subKeys: subKeys.map(subKey => ({
                            key: subKey,
                            title: subKey,
                            description: subKeyDescriptions[subKey] || `Access ${subKey} functionality`,
                            action: () => this.handleSubKeyNavigation(subKey)
                        })),
                        hasSubKeys: true
                    });
                }
            }
        });

        return navigationCards;
    };

    

    // Toggle navigation card expansion
    toggleNavigationCard = (cardKey) => {
        this.setState(prevState => ({
            expandedCard: prevState.expandedCard === cardKey ? null : cardKey
        }));
    };

    componentDidMount() {
        // Update time every second to show seconds
        this.timeInterval = setInterval(() => {
            this.setState({ currentTime: new Date() });
        }, 1000);
    }

    componentWillUnmount() {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
        }
    }

    getGreeting = () => {
        const hour = this.state.currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    formatDate = () => {
        return this.state.currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    formatTime = () => {
        // Use Singapore timezone directly
        const singaporeTime = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Singapore",
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        return singaporeTime;
    };

  handleSubKeyNavigation = (subKey) => {
    if (this.props.onNavigate) {
        let navigationKey = subKey;
        switch (subKey) {
            case "Create Account":
                navigationKey = "create-account";
                break;
            case "Account Table":
                navigationKey = "accounts";
                break;
            case "Access Rights Table":
                navigationKey = "access-rights";
                break;
            case "NSA Courses":
                navigationKey = "nsa-courses";
                break;
            case "Marriage Preparation Programme Courses":
                navigationKey = "marriage-preparation-programme-courses";
                break;
            case "ILP Courses":
                navigationKey = "ilp-courses";
                break;
            case "Registration And Payment Table":
                navigationKey = "registration";
                break;
            case "Monthly Report":
                navigationKey = "monthly-report";
                break;
            case "Payment Report":
                navigationKey = "payment-report";
                break;
            case "View Attendance":
                navigationKey = "attendance";
                break;
            case "View Membership":
                navigationKey = "membership";
                break;
            case "Fundraising Table":
                navigationKey = "fundraising-table";
                break;
            default:
                navigationKey = subKey;
        }
        this.props.onNavigate(navigationKey);
    }
  };

    render() {
        const { userName, role, onNavigate } = this.props;
        const roleBasedActions = this.getRoleBasedActions();
        const navigationCards = this.getNavigationCards();
        const { expandedCard } = this.state;

        return (
            <div className="welcome-section">
                {/* Welcome Header - No Background */}
                <div className="welcome-header">
                    <div className="welcome-content">
                        <h1>{this.getGreeting()}, {userName}!</h1>
                        <p></p>
                        <div className="welcome-meta">
                            <div className="meta-item">
                                <i className="fas fa-calendar-day"></i>
                                <span>{this.formatDate()}</span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-clock"></i>
                                <span>{this.formatTime()}</span>
                            </div>
                            <div className="meta-item">
                                <i className="fas fa-user-shield"></i>
                                <span>Role: {role || 'Administrator'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="welcome-decoration">
                        <i className="fas fa-graduation-cap"></i>
                    </div>
                </div>

                {/* Main Navigation Cards */}
                {navigationCards.length > 0 && (
                    <div className="navigation-section">
                        <h2>Your Navigation</h2>
                        <div className="navigation-cards-grid">
                            {navigationCards.map((card) => (
                                <div key={card.key} className={`navigation-card ${card.hasSubKeys ? 'expandable' : 'single'} ${expandedCard === card.key ? 'expanded' : ''}`}>
                                    <div 
                                        className="navigation-card-header" 
                                        onClick={() => card.hasSubKeys ? this.toggleNavigationCard(card.key) : this.handleSubKeyNavigation(card.key)}
                                    >
                                        <div className="card-icon">
                                            <i className={card.icon}></i>
                                        </div>
                                        <div className="card-content">
                                            <h3>{card.title}</h3>
                                            <p>{card.description}</p>
                                        </div>
                                        {card.hasSubKeys && (
                                            <div className="expand-icon">
                                                <i className={`fas fa-chevron-${expandedCard === card.key ? 'up' : 'down'}`}></i>
                                            </div>
                                        )}
                                    </div>
                                    {card.hasSubKeys && expandedCard === card.key && (
                                        <div className="navigation-subkeys">
                                            {card.subKeys.map((subKey) => (
                                                <div key={subKey.key} className="subkey-item" onClick={subKey.action}>
                                                    <div className="subkey-content">
                                                        <h4>{subKey.title}</h4>
                                                        <p>{subKey.description}</p>
                                                    </div>
                                                    <div className="subkey-arrow">
                                                        <i className="fas fa-arrow-right"></i>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Personalized Quick Actions */}
                <div className="quick-actions-section">
                    <h2>Your Quick Actions</h2>
                    <div className="action-cards-grid">
                        {roleBasedActions.map((action, index) => (
                            <div key={action.key} className="action-card" onClick={action.action}>
                                <div className="card-icon">
                                    <i className={action.icon}></i>
                                </div>
                                <div className="card-content">
                                    <h3>{action.title}</h3>
                                    <p>{action.description}</p>
                                    <div className="card-footer">
                                        <span className="action-text">Access</span>
                                        <i className="fas fa-arrow-right"></i>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}

export default WelcomeSection;
