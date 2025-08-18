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

    // Role-based quick actions mapping based on sidebar subkeys
    getRoleBasedActions = () => {
        const { role } = this.props;
        
        // Define action mappings based on common sidebar subkeys and roles
        const roleActions = {
            'Administrator': [
                { key: 'Create Account', title: 'Create Account', icon: 'fas fa-user-plus', description: 'Add new user accounts to the system', action: () => this.props.onNavigate('create-account') },
                { key: 'Account Table', title: 'Manage Accounts', icon: 'fas fa-users-cog', description: 'View and manage user accounts', action: () => this.props.onNavigate('accounts') },
                { key: 'Access Rights Table', title: 'Access Rights', icon: 'fas fa-shield-alt', description: 'Configure user permissions and access rights', action: () => this.props.onNavigate('access-rights') },
                { key: 'Registration And Payment Table', title: 'Registrations & Payments', icon: 'fas fa-credit-card', description: 'Manage course registrations and payments', action: () => this.props.onNavigate('registration') },
                { key: 'NSA Courses', title: 'NSA Courses', icon: 'fas fa-graduation-cap', description: 'Manage NSA course offerings', action: () => this.props.onNavigate('nsa-courses') },
                { key: 'ILP Courses', title: 'ILP Courses', icon: 'fas fa-book-open', description: 'Manage ILP course offerings', action: () => this.props.onNavigate('ilp-courses') }
            ],
            'Manager': [
                { key: 'Registration And Payment Table', title: 'Registrations & Payments', icon: 'fas fa-credit-card', description: 'Manage course registrations and payments', action: () => this.props.onNavigate('registration') },
                { key: 'View Attendance', title: 'View Attendance', icon: 'fas fa-clipboard-check', description: 'Monitor student attendance records', action: () => this.props.onNavigate('attendance') },
                { key: 'View Membership', title: 'View Membership', icon: 'fas fa-id-card', description: 'Manage member information and records', action: () => this.props.onNavigate('membership') },
                { key: 'Monthly Report', title: 'Monthly Report', icon: 'fas fa-chart-bar', description: 'Generate monthly analytics reports', action: () => this.props.onNavigate('monthly-report') },
                { key: 'Payment Report', title: 'Payment Report', icon: 'fas fa-file-invoice-dollar', description: 'Generate payment and financial reports', action: () => this.props.onNavigate('payment-report') },
                { key: 'NSA Courses', title: 'NSA Courses', icon: 'fas fa-graduation-cap', description: 'Manage NSA course offerings', action: () => this.props.onNavigate('nsa-courses') }
            ],
            'Staff': [
                { key: 'Registration And Payment Table', title: 'Registrations & Payments', icon: 'fas fa-credit-card', description: 'Handle course registrations and payments', action: () => this.props.onNavigate('registration') },
                { key: 'View Attendance', title: 'View Attendance', icon: 'fas fa-clipboard-check', description: 'Record and view student attendance', action: () => this.props.onNavigate('attendance') },
                { key: 'View Membership', title: 'View Membership', icon: 'fas fa-id-card', description: 'Access member information', action: () => this.props.onNavigate('membership') },
                { key: 'NSA Courses', title: 'NSA Courses', icon: 'fas fa-graduation-cap', description: 'View NSA course information', action: () => this.props.onNavigate('nsa-courses') },
                { key: 'ILP Courses', title: 'ILP Courses', icon: 'fas fa-book-open', description: 'View ILP course information', action: () => this.props.onNavigate('ilp-courses') },
                { key: 'Marriage Preparation Course', title: 'Marriage Preparation Course', icon: 'fas fa-heart', description: 'View Marriage Preparation course information', action: () => this.props.onNavigate('marriage-preparation-programme-courses') }
            ],
            'Instructor': [
                { key: 'View Attendance', title: 'Mark Attendance', icon: 'fas fa-clipboard-check', description: 'Mark and manage student attendance', action: () => this.props.onNavigate('attendance') },
                { key: 'NSA Courses', title: 'My NSA Courses', icon: 'fas fa-graduation-cap', description: 'View assigned NSA courses', action: () => this.props.onNavigate('nsa-courses') },
                { key: 'ILP Courses', title: 'My ILP Courses', icon: 'fas fa-book-open', description: 'View assigned ILP courses', action: () => this.props.onNavigate('ilp-courses') },
                { key: 'View Membership', title: 'Student Information', icon: 'fas fa-id-card', description: 'View student member information', action: () => this.props.onNavigate('membership') }
            ]
        };

        // Return actions for the current role, or default actions if role not found
        return roleActions[role] || roleActions['Staff'];
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
            "Attendances": 'fas fa-calendar-days'
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
            "View Membership": "Manage member information and records"
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
        // Update time every minute
        this.timeInterval = setInterval(() => {
            this.setState({ currentTime: new Date() });
        }, 60000);
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
                        <p>Welcome to ECSS Course Management System</p>
                        <div className="welcome-meta">
                            <div className="meta-item">
                                <i className="fas fa-calendar-day"></i>
                                <span>{this.formatDate()}</span>
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
