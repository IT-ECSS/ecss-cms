import React, { Component } from "react";
import axios from 'axios';
import '../../../../css/sub/dashboardSection.css';

class AccountsDashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            accountsData: [],
            loading: true,
            error: null,
            selectedMonth: '',
            accountStatistics: {
                totalAccounts: 0,
                adminAccounts: 0,
                subAdminAccounts: 0,
                nsaInChargeAccounts: 0,
                opsInChargeAccounts: 0,
                siteInChargeAccounts: 0,
                financeAccounts: 0,
                socialWorkerAccounts: 0,
                fitnessTrainerAccounts: 0,
                otherAccounts: 0,
                activeAccounts: 0,
                firstTimeLogInAccounts: 0
            }
        };
    }

    componentDidMount() {
        this.fetchAccountsData();
    }

    // Fetch accounts data from backend
    fetchAccountsData = async () => {
        try {
            this.setState({ loading: true, error: null });
            
            const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/accountDetails`, { 
                purpose: 'retrieve'
            });
            
            console.log('Accounts data loaded from API:', response.data);
            
            // Ensure response.data is an array
            const dataArray = Array.isArray(response.data) ? response.data : 
                             (response.data && Array.isArray(response.data.result)) ? response.data.result :
                             (response.data && Array.isArray(response.data.data)) ? response.data.data :
                             [];
            
            this.setState({ 
                accountsData: dataArray,
                loading: false 
            }, () => {
                this.calculateAccountStatistics();
            });
        } catch (error) {
            console.error('Error fetching accounts data:', error);
            this.setState({ 
                loading: false, 
                error: 'Failed to load accounts data. Please try again later.' 
            });
        }
    };

    // Calculate account statistics for admin dashboard
    calculateAccountStatistics = () => {
        const { accountsData } = this.state;
        
        if (!accountsData || accountsData.length === 0) {
            console.log('No accounts data available for statistics calculation');
            return;
        }

        const statistics = {
            totalAccounts: accountsData.length,
            adminAccounts: 0,
            subAdminAccounts: 0,
            nsaInChargeAccounts: 0,
            opsInChargeAccounts: 0,
            siteInChargeAccounts: 0,
            financeAccounts: 0,
            socialWorkerAccounts: 0,
            fitnessTrainerAccounts: 0,
            otherAccounts: 0,
            activeAccounts: 0,
            firstTimeLogInAccounts: 0
        };

        accountsData.forEach(account => {
            const role = (account.role || '').toLowerCase();
            const status = (account.status || '').toLowerCase();
            const lastLogin = account.lastLogin;

            // Count by role
            switch (role) {
                case 'admin':
                    statistics.adminAccounts++;
                    break;
                case 'sub admin':
                case 'subadmin':
                    statistics.subAdminAccounts++;
                    break;
                case 'nsa in-charge':
                case 'nsa in charge':
                case 'nsaincharge':
                    statistics.nsaInChargeAccounts++;
                    break;
                case 'ops in-charge':
                case 'ops in charge':
                case 'opsincharge':
                    statistics.opsInChargeAccounts++;
                    break;
                case 'site in-charge':
                case 'site in charge':
                case 'siteincharge':
                    statistics.siteInChargeAccounts++;
                    break;
                case 'finance':
                    statistics.financeAccounts++;
                    break;
                case 'social worker':
                case 'socialworker':
                    statistics.socialWorkerAccounts++;
                    break;
                case 'fitness trainer':
                case 'fitnesstrainer':
                    statistics.fitnessTrainerAccounts++;
                    break;
                default:
                    statistics.otherAccounts++;
                    break;
            }

            // Count active accounts
            if (status === 'active') {
                statistics.activeAccounts++;
            }

            // Count first-time login accounts (no last login or very recent)
            if (!lastLogin || this.isFirstTimeLogin(lastLogin)) {
                statistics.firstTimeLogInAccounts++;
            }
        });

        console.log('Calculated account statistics:', statistics);
        this.setState({ accountStatistics: statistics });
    };

    // Helper function to determine if it's a first-time login
    isFirstTimeLogin = (lastLogin) => {
        if (!lastLogin) return true;
        
        const lastLoginDate = new Date(lastLogin);
        const now = new Date();
        const diffInDays = (now - lastLoginDate) / (1000 * 60 * 60 * 24);
        
        return diffInDays < 1; // Consider as first-time if login was within 24 hours
    };

    // Get available months for filtering
    getAvailableMonths = () => {
        const { accountsData } = this.state;
        const months = new Set();
        
        accountsData.forEach(account => {
            if (account.createdAt) {
                const date = new Date(account.createdAt);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months.add(monthYear);
            }
        });
        
        return Array.from(months).sort().reverse();
    };

    // Handle month filter change
    handleMonthChange = (event) => {
        this.setState({ selectedMonth: event.target.value });
    };

    // Get accounts breakdown by role
    getAccountsBreakdownByRole = () => {
        const { accountStatistics } = this.state;
        return [
            { role: 'Admin', total: accountStatistics.adminAccounts },
            { role: 'Sub Admin', total: accountStatistics.subAdminAccounts },
            { role: 'NSA In-charge', total: accountStatistics.nsaInChargeAccounts },
            { role: 'Ops In-charge', total: accountStatistics.opsInChargeAccounts },
            { role: 'Site In-charge', total: accountStatistics.siteInChargeAccounts },
            { role: 'Finance', total: accountStatistics.financeAccounts },
            { role: 'Social Worker', total: accountStatistics.socialWorkerAccounts },
            { role: 'Fitness Trainer', total: accountStatistics.fitnessTrainerAccounts },
            { role: 'Others', total: accountStatistics.otherAccounts }
        ].filter(item => item.total > 0);
    };

    render() {
        const { loading, error, selectedMonth, accountStatistics } = this.state;

        if (loading) {
            return (
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading accounts data...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="dashboard-error">
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button onClick={this.fetchAccountsData} className="retry-btn">
                        Retry
                    </button>
                </div>
            );
        }

        const availableMonths = this.getAvailableMonths();

        return (
            <div className="accounts-dashboard">
                {/* Accounts Tab Content */}
                <div className="dashboard-content">
                    {/* Accounts Statistics Cards */}
                    <div className="dashboard-stats">
                        {/* Account Overview Group */}
                        <div className="stats-group">
                            <div className="stats-group-header">
                                <h4>📊 Account Overview</h4>
                            </div>
                            <div className="stats-grid">
                                <div className="stat-card primary">
                                    <div className="stat-icon">👥</div>
                                    <div className="stat-content">
                                        <h3>Total Accounts</h3>
                                        <p className="stat-number">{accountStatistics.totalAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card success">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-content">
                                        <h3>Active Accounts</h3>
                                        <p className="stat-number">{accountStatistics.activeAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card info">
                                    <div className="stat-icon">🆕</div>
                                    <div className="stat-content">
                                        <h3>First Time Login</h3>
                                        <p className="stat-number">{accountStatistics.firstTimeLogInAccounts}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Accounts by Role Group */}
                        <div className="stats-group">
                            <div className="stats-group-header">
                                <h4>👤 Accounts by Role</h4>
                            </div>
                            <div className="stats-grid role-grid">
                                <div className="stat-card admin-role">
                                    <div className="stat-icon">🔑</div>
                                    <div className="stat-content">
                                        <h3>Admin</h3>
                                        <p className="stat-number">{accountStatistics.adminAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card sub-admin-role">
                                    <div className="stat-icon">👨‍💼</div>
                                    <div className="stat-content">
                                        <h3>Sub Admin</h3>
                                        <p className="stat-number">{accountStatistics.subAdminAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card management-role">
                                    <div className="stat-icon">🔐</div>
                                    <div className="stat-content">
                                        <h3>NSA In-charge</h3>
                                        <p className="stat-number">{accountStatistics.nsaInChargeAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card management-role">
                                    <div className="stat-icon">⚙️</div>
                                    <div className="stat-content">
                                        <h3>Ops In-charge</h3>
                                        <p className="stat-number">{accountStatistics.opsInChargeAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card management-role">
                                    <div className="stat-icon">🏢</div>
                                    <div className="stat-content">
                                        <h3>Site In-charge</h3>
                                        <p className="stat-number">{accountStatistics.siteInChargeAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card service-role">
                                    <div className="stat-icon">💰</div>
                                    <div className="stat-content">
                                        <h3>Finance</h3>
                                        <p className="stat-number">{accountStatistics.financeAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card service-role">
                                    <div className="stat-icon">🤝</div>
                                    <div className="stat-content">
                                        <h3>Social Worker</h3>
                                        <p className="stat-number">{accountStatistics.socialWorkerAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card service-role">
                                    <div className="stat-icon">💪</div>
                                    <div className="stat-content">
                                        <h3>Fitness Trainer</h3>
                                        <p className="stat-number">{accountStatistics.fitnessTrainerAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card general-role">
                                    <div className="stat-icon">👤</div>
                                    <div className="stat-content">
                                        <h3>Others</h3>
                                        <p className="stat-number">{accountStatistics.otherAccounts}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comprehensive Account Summary */}
                    <div className="dashboard-summary">
                        <h3>📊 Comprehensive Account Summary</h3>
                        <div className="summary-content">
                            <p>
                                <strong>Total System Overview:</strong> {accountStatistics.totalAccounts} accounts across all time periods
                            </p>
                            
                            {accountStatistics.totalAccounts > 0 && (
                                <div className="summary-insights">
                                    <h4>🔍 Key Performance Insights:</h4>
                                    <div className="insights-grid">
                                        <div className="insight-card success">
                                            <div className="insight-icon">✅</div>
                                            <div className="insight-content">
                                                <h5>Account Activation Rate</h5>
                                                <p className="insight-value">
                                                    {((accountStatistics.activeAccounts / accountStatistics.totalAccounts) * 100).toFixed(1)}%
                                                </p>
                                                <small>{accountStatistics.activeAccounts} of {accountStatistics.totalAccounts} accounts are active</small>
                                            </div>
                                        </div>

                                        <div className="insight-card warning">
                                            <div className="insight-icon">👑</div>
                                            <div className="insight-content">
                                                <h5>Most Common Role</h5>
                                                <p className="insight-value">
                                                    {Math.max(
                                                        accountStatistics.adminAccounts,
                                                        accountStatistics.subAdminAccounts,
                                                        accountStatistics.nsaInChargeAccounts,
                                                        accountStatistics.opsInChargeAccounts,
                                                        accountStatistics.siteInChargeAccounts,
                                                        accountStatistics.financeAccounts,
                                                        accountStatistics.socialWorkerAccounts,
                                                        accountStatistics.fitnessTrainerAccounts,
                                                        accountStatistics.otherAccounts
                                                    ) === accountStatistics.siteInChargeAccounts ? 'Site In-charge' :
                                                    Math.max(
                                                        accountStatistics.adminAccounts,
                                                        accountStatistics.subAdminAccounts,
                                                        accountStatistics.nsaInChargeAccounts,
                                                        accountStatistics.opsInChargeAccounts,
                                                        accountStatistics.financeAccounts,
                                                        accountStatistics.socialWorkerAccounts,
                                                        accountStatistics.fitnessTrainerAccounts,
                                                        accountStatistics.otherAccounts
                                                    ) === accountStatistics.adminAccounts ? 'Admin' : 'Site In-charge'
                                                }
                                                </p>
                                                <small>Highest account distribution by role</small>
                                            </div>
                                        </div>

                                        <div className="insight-card info">
                                            <div className="insight-icon">🆕</div>
                                            <div className="insight-content">
                                                <h5>First-Time Users</h5>
                                                <p className="insight-value">
                                                    {accountStatistics.firstTimeLogInAccounts}
                                                </p>
                                                <small>{((accountStatistics.firstTimeLogInAccounts / accountStatistics.totalAccounts) * 100).toFixed(1)}% need initial setup</small>
                                            </div>
                                        </div>

                                        <div className="insight-card primary">
                                            <div className="insight-icon">⚡</div>
                                            <div className="insight-content">
                                                <h5>System Health</h5>
                                                <p className="insight-value">
                                                    {accountStatistics.activeAccounts >= (accountStatistics.totalAccounts * 0.8) ? 'Excellent' : 
                                                     accountStatistics.activeAccounts >= (accountStatistics.totalAccounts * 0.6) ? 'Good' : 'Needs Attention'}
                                                </p>
                                                <small>Overall account system status</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Account Distribution by Role */}
                            <div className="breakdown-section">
                                <h4>📈 Account Distribution by Role:</h4>
                                <div className="breakdown-chart">
                                    {this.getAccountsBreakdownByRole().map((roleData, index) => {
                                        const percentage = accountStatistics.totalAccounts > 0 ? 
                                            (roleData.total / accountStatistics.totalAccounts) * 100 : 0;
                                        return (
                                            <div key={roleData.role} className="chart-bar-container">
                                                <div className="chart-label">
                                                    <span className="role-name">{roleData.role}</span>
                                                    <span className="role-stats">
                                                        {roleData.total} accounts ({percentage.toFixed(1)}% of total)
                                                    </span>
                                                </div>
                                                <div className="chart-bar">
                                                    <div 
                                                        className="chart-bar-fill"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: `hsl(${200 + (index * 30)}, 70%, 50%)`
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

export default AccountsDashboard;
