import React, { Component } from "react";
import AccountsDashboard from './AccountsDashboard';
import AccessRightsDashboard from './AccessRightsDashboard';
import RegistrationDashboard from './RegistrationDashboard';
import '../../../../css/sub/dashboardSection.css';

class DashboardController extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 'accounts', // For admin dashboard tabs (accounts/access-rights/registration)
            loading: false,
            error: null
        };
    }

    componentDidMount() {
        // Determine initial tab based on user role
        const role = this.props.role || localStorage.getItem('userRole') || 'admin';
        const initialTab = this.getInitialTab(role);
        this.setState({ activeTab: initialTab });
    }

    // Determine initial tab based on role
    getInitialTab = (role) => {
        if (this.shouldShowAccountsDashboard(role)) {
            return 'accounts';
        }
        return 'registration';
    };

    // Check if user should see accounts dashboard
    shouldShowAccountsDashboard = (role) => {
        const accountsRoles = ['admin', 'sub admin', 'subadmin'];
        const normalizedRole = role.toLowerCase().trim();
        console.log('Checking role for accounts dashboard:', { originalRole: role, normalizedRole, accountsRoles });
        const shouldShow = accountsRoles.includes(normalizedRole);
        console.log('Should show accounts dashboard:', shouldShow);
        return shouldShow;
    };

    // Handle tab change
    handleTabChange = (tab) => {
        console.log('Dashboard tab changed to:', tab);
        this.setState({ activeTab: tab });
    };

    // Get available tabs based on user role
    getAvailableTabs = (role) => {
        const tabs = [];
        
        if (this.shouldShowAccountsDashboard(role)) {
            tabs.push(
                { id: 'accounts', label: 'Accounts', icon: '👥' },
                { id: 'access-rights', label: 'Access Rights', icon: '🔐' }
            );
        }
        
        // All roles can see registration dashboard
        tabs.push({ id: 'registration', label: 'Registration', icon: '📝' });
        
        return tabs;
    };

    // Render tab content based on active tab
    renderTabContent = () => {
        const { activeTab } = this.state;
        
        switch (activeTab) {
            case 'accounts':
                return <AccountsDashboard {...this.props} />;
            case 'access-rights':
                return <AccessRightsDashboard {...this.props} />;
            case 'registration':
                return <RegistrationDashboard {...this.props} />;
            default:
                return <RegistrationDashboard {...this.props} />;
        }
    };

    render() {
        const { loading, error, activeTab } = this.state;
        const role = this.props.role || localStorage.getItem('userRole') || 'admin';
        const availableTabs = this.getAvailableTabs(role);

        if (loading) {
            return (
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="dashboard-error">
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="retry-btn">
                        Retry
                    </button>
                </div>
            );
        }

        return (
            <div className="dashboard-controller">
                <div className="dashboard-header">
                    <div className="header-left">
                        <h2>
                            {this.shouldShowAccountsDashboard(role) ? 'Admin Dashboard' : 'Registration Dashboard'}
                        </h2>
                        <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
                            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
                        </p>
                    </div>
                    
                    {/* Tab Navigation */}
                    {availableTabs.length > 1 && (
                        <div className="dashboard-tabs">
                            {availableTabs.map(tab => (
                                <button 
                                    key={tab.id}
                                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => this.handleTabChange(tab.id)}
                                >
                                    <span className="tab-icon">{tab.icon}</span>
                                    <span className="tab-label">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tab Content */}
                <div className="dashboard-content-wrapper">
                    {this.renderTabContent()}
                </div>

                {/* Dashboard Styles */}
                <style jsx>{`
                    .dashboard-controller {
                        width: 100%;
                        min-height: 100vh;
                        background-color: #f8f9fa;
                    }

                    .dashboard-header {
                        background: white;
                        padding: 20px 30px;
                        border-bottom: 1px solid #e9ecef;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 20px;
                    }

                    .header-left h2 {
                        margin: 0;
                        color: #2c3e50;
                        font-size: 28px;
                        font-weight: 600;
                    }

                    .dashboard-tabs {
                        display: flex;
                        gap: 5px;
                        background: #f8f9fa;
                        padding: 5px;
                        border-radius: 8px;
                        border: 1px solid #e9ecef;
                    }

                    .tab-button {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 10px 16px;
                        border: none;
                        background: transparent;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        font-weight: 500;
                        color: #6c757d;
                        white-space: nowrap;
                    }

                    .tab-button:hover {
                        background: #e9ecef;
                        color: #495057;
                    }

                    .tab-button.active {
                        background: #007bff;
                        color: white;
                        box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
                    }

                    .tab-icon {
                        font-size: 16px;
                    }

                    .tab-label {
                        font-size: 14px;
                    }

                    .dashboard-content-wrapper {
                        padding: 0;
                        min-height: calc(100vh - 90px);
                    }

                    .dashboard-loading,
                    .dashboard-error {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 400px;
                        text-align: center;
                        padding: 40px;
                    }

                    .loading-spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #007bff;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .retry-btn {
                        margin-top: 15px;
                        padding: 10px 20px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    }

                    .retry-btn:hover {
                        background: #0056b3;
                    }

                    @media (max-width: 768px) {
                        .dashboard-header {
                            flex-direction: column;
                            align-items: flex-start;
                            padding: 15px 20px;
                        }

                        .dashboard-tabs {
                            width: 100%;
                            justify-content: flex-start;
                            overflow-x: auto;
                        }

                        .tab-button {
                            min-width: auto;
                            flex-shrink: 0;
                        }

                        .header-left h2 {
                            font-size: 24px;
                        }
                    }
                `}</style>
            </div>
        );
    }
}

export default DashboardController;
