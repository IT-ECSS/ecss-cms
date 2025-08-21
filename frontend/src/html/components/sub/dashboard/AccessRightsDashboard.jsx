import React, { Component } from "react";
import axios from 'axios';
import '../../../../css/sub/dashboardSection.css';

class AccessRightsDashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            accessRightsData: [],
            loading: true,
            error: null,
            accessRightsStatistics: {
                totalAccessRights: 0,
                adminRights: 0,
                subAdminRights: 0,
                nsaInChargeRights: 0,
                opsInChargeRights: 0,
                siteInChargeRights: 0,
                financeRights: 0,
                socialWorkerRights: 0,
                fitnessTrainerRights: 0,
                otherRights: 0,
                fullAccessAccounts: 0,
                limitedAccessAccounts: 0
            }
        };
    }

    componentDidMount() {
        this.fetchAccessRightsData();
    }

    // Fetch access rights data from backend
    fetchAccessRightsData = async () => {
        try {
            this.setState({ loading: true, error: null });
            
            const response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/accessRights`, { 
                purpose: 'retrieve'
            });
            
            console.log('Access rights data loaded from API:', response.data);
            
            // Ensure response.data is an array
            const dataArray = Array.isArray(response.data) ? response.data : 
                             (response.data && Array.isArray(response.data.result)) ? response.data.result :
                             (response.data && Array.isArray(response.data.data)) ? response.data.data :
                             [];
            
            this.setState({ 
                accessRightsData: dataArray,
                loading: false 
            }, () => {
                this.calculateAccessRightsStatistics();
            });
        } catch (error) {
            console.error('Error fetching access rights data:', error);
            this.setState({ 
                loading: false, 
                error: 'Failed to load access rights data. Please try again later.' 
            });
        }
    };

    // Calculate access rights statistics for admin dashboard
    calculateAccessRightsStatistics = () => {
        const { accessRightsData } = this.state;
        
        if (!accessRightsData || accessRightsData.length === 0) {
            console.log('No access rights data available for statistics calculation');
            return;
        }

        const statistics = {
            totalAccessRights: accessRightsData.length,
            adminRights: 0,
            subAdminRights: 0,
            nsaInChargeRights: 0,
            opsInChargeRights: 0,
            siteInChargeRights: 0,
            financeRights: 0,
            socialWorkerRights: 0,
            fitnessTrainerRights: 0,
            otherRights: 0,
            fullAccessAccounts: 0,
            limitedAccessAccounts: 0
        };

        accessRightsData.forEach(accessRight => {
            const role = (accessRight.role || '').toLowerCase();
            const permissions = accessRight.permissions || [];

            // Count by role
            switch (role) {
                case 'admin':
                    statistics.adminRights++;
                    break;
                case 'sub admin':
                case 'subadmin':
                    statistics.subAdminRights++;
                    break;
                case 'nsa in-charge':
                case 'nsa in charge':
                case 'nsaincharge':
                    statistics.nsaInChargeRights++;
                    break;
                case 'ops in-charge':
                case 'ops in charge':
                case 'opsincharge':
                    statistics.opsInChargeRights++;
                    break;
                case 'site in-charge':
                case 'site in charge':
                case 'siteincharge':
                    statistics.siteInChargeRights++;
                    break;
                case 'finance':
                    statistics.financeRights++;
                    break;
                case 'social worker':
                case 'socialworker':
                    statistics.socialWorkerRights++;
                    break;
                case 'fitness trainer':
                case 'fitnesstrainer':
                    statistics.fitnessTrainerRights++;
                    break;
                default:
                    statistics.otherRights++;
                    break;
            }

            // Classify access level
            if (this.hasFullAccess(permissions)) {
                statistics.fullAccessAccounts++;
            } else {
                statistics.limitedAccessAccounts++;
            }
        });

        console.log('Calculated access rights statistics:', statistics);
        this.setState({ accessRightsStatistics: statistics });
    };

    // Helper function to determine if account has full access
    hasFullAccess = (permissions) => {
        if (!permissions || permissions.length === 0) return false;
        
        const fullAccessPermissions = ['read', 'write', 'delete', 'admin'];
        return fullAccessPermissions.every(permission => 
            permissions.some(p => p.toLowerCase().includes(permission))
        );
    };

    // Get access rights breakdown by role
    getAccessRightsBreakdownByRole = () => {
        const { accessRightsStatistics } = this.state;
        return [
            { role: 'Admin', total: accessRightsStatistics.adminRights },
            { role: 'Sub Admin', total: accessRightsStatistics.subAdminRights },
            { role: 'NSA In-charge', total: accessRightsStatistics.nsaInChargeRights },
            { role: 'Ops In-charge', total: accessRightsStatistics.opsInChargeRights },
            { role: 'Site In-charge', total: accessRightsStatistics.siteInChargeRights },
            { role: 'Finance', total: accessRightsStatistics.financeRights },
            { role: 'Social Worker', total: accessRightsStatistics.socialWorkerRights },
            { role: 'Fitness Trainer', total: accessRightsStatistics.fitnessTrainerRights },
            { role: 'Others', total: accessRightsStatistics.otherRights }
        ].filter(item => item.total > 0);
    };

    render() {
        const { loading, error, accessRightsStatistics } = this.state;

        if (loading) {
            return (
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading access rights data...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="dashboard-error">
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button onClick={this.fetchAccessRightsData} className="retry-btn">
                        Retry
                    </button>
                </div>
            );
        }

        return (
            <div className="access-rights-dashboard">
                {/* Access Rights Tab Content */}
                <div className="dashboard-content">
                    {/* Access Rights Statistics Cards */}
                    <div className="dashboard-stats">
                        {/* Access Rights Overview Group */}
                        <div className="stats-group">
                            <div className="stats-group-header">
                                <h4>Access Rights Overview</h4>
                            </div>
                            <div className="stats-grid">
                                <div className="stat-card primary">
                                    <div className="stat-icon">🔐</div>
                                    <div className="stat-content">
                                        <h3>Total Access Rights</h3>
                                        <p className="stat-number">{accessRightsStatistics.totalAccessRights}</p>
                                    </div>
                                </div>

                                <div className="stat-card success">
                                    <div className="stat-icon">✨</div>
                                    <div className="stat-content">
                                        <h3>Full Access</h3>
                                        <p className="stat-number">{accessRightsStatistics.fullAccessAccounts}</p>
                                    </div>
                                </div>

                                <div className="stat-card warning">
                                    <div className="stat-icon">⚡</div>
                                    <div className="stat-content">
                                        <h3>Limited Access</h3>
                                        <p className="stat-number">{accessRightsStatistics.limitedAccessAccounts}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Access Rights Distribution */}
                        <div className="stats-group enhanced-roles-section">
                            <div className="stats-group-header">
                                <h4>🔐 Access Rights Distribution by Role</h4>
                                <p className="section-subtitle">Comprehensive access rights breakdown across all organizational roles</p>
                            </div>

                            {/* Administrative Roles Category */}
                            <div className="role-category">
                                <div className="category-header">
                                    <h5>🎯 Administrative Access Rights</h5>
                                    <span className="category-description">System & Administrative Access</span>
                                </div>
                                <div className="role-cards-grid">
                                    <div className="stat-card admin-role enhanced-card">
                                        <div className="stat-icon">🔑</div>
                                        <div className="stat-content">
                                            <h3>Admin Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.adminRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">Full System Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.adminRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="stat-card sub-admin-role enhanced-card">
                                        <div className="stat-icon">👨‍💼</div>
                                        <div className="stat-content">
                                            <h3>Sub Admin Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.subAdminRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">Limited Admin Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.subAdminRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Management Roles Category */}
                            <div className="role-category">
                                <div className="category-header">
                                    <h5>👔 Management Access Rights</h5>
                                    <span className="category-description">Operational & Site Management Access</span>
                                </div>
                                <div className="role-cards-grid">
                                    <div className="stat-card management-role enhanced-card">
                                        <div className="stat-icon">🔐</div>
                                        <div className="stat-content">
                                            <h3>NSA In-charge Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.nsaInChargeRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">Security Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.nsaInChargeRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="stat-card management-role enhanced-card">
                                        <div className="stat-icon">⚙️</div>
                                        <div className="stat-content">
                                            <h3>Ops In-charge Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.opsInChargeRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">Operations Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.opsInChargeRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="stat-card management-role enhanced-card">
                                        <div className="stat-icon">🏢</div>
                                        <div className="stat-content">
                                            <h3>Site In-charge Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.siteInChargeRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">Site Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.siteInChargeRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Service Roles Category */}
                            <div className="role-category">
                                <div className="category-header">
                                    <h5>🏥 Service Access Rights</h5>
                                    <span className="category-description">Specialized Service Provider Access</span>
                                </div>
                                <div className="role-cards-grid">
                                    <div className="stat-card service-role enhanced-card">
                                        <div className="stat-icon">💰</div>
                                        <div className="stat-content">
                                            <h3>Finance Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.financeRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">Financial Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.financeRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="stat-card service-role enhanced-card">
                                        <div className="stat-icon">🤝</div>
                                        <div className="stat-content">
                                            <h3>Social Worker Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.socialWorkerRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">Social Services Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.socialWorkerRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="stat-card service-role enhanced-card">
                                        <div className="stat-icon">💪</div>
                                        <div className="stat-content">
                                            <h3>Fitness Trainer Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.fitnessTrainerRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">Fitness Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.fitnessTrainerRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* General Roles Category */}
                            <div className="role-category">
                                <div className="category-header">
                                    <h5>📋 General Access Rights</h5>
                                    <span className="category-description">Miscellaneous Staff Access</span>
                                </div>
                                <div className="role-cards-grid">
                                    <div className="stat-card general-role enhanced-card">
                                        <div className="stat-icon">👤</div>
                                        <div className="stat-content">
                                            <h3>Other Rights</h3>
                                            <p className="stat-number">{accessRightsStatistics.otherRights}</p>
                                            <div className="stat-details">
                                                <span className="role-description">General Access</span>
                                                <div className="percentage-badge">
                                                    {accessRightsStatistics.totalAccessRights > 0 
                                                        ? ((accessRightsStatistics.otherRights / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)
                                                        : 0}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Access Rights Summary Section */}
                    <div className="dashboard-summary">
                        <h3>Access Rights Summary</h3>
                        <div className="summary-content">
                            <p>
                                Total of <strong>{accessRightsStatistics.totalAccessRights}</strong> access right records in the system
                            </p>
                            
                            {accessRightsStatistics.totalAccessRights > 0 && (
                                <div className="summary-insights">
                                    <h4>Key Insights:</h4>
                                    <ul>
                                        <li>
                                            {accessRightsStatistics.fullAccessAccounts >= (accessRightsStatistics.totalAccessRights * 0.3) ? '⚠️' : '✅'} 
                                            Full access rate: {((accessRightsStatistics.fullAccessAccounts / accessRightsStatistics.totalAccessRights) * 100).toFixed(1)}%
                                        </li>
                                        <li>
                                            Most privileged role: {
                                                Math.max(
                                                    accessRightsStatistics.adminRights,
                                                    accessRightsStatistics.subAdminRights,
                                                    accessRightsStatistics.nsaInChargeRights,
                                                    accessRightsStatistics.opsInChargeRights,
                                                    accessRightsStatistics.siteInChargeRights,
                                                    accessRightsStatistics.financeRights,
                                                    accessRightsStatistics.socialWorkerRights,
                                                    accessRightsStatistics.fitnessTrainerRights,
                                                    accessRightsStatistics.otherRights
                                                ) === accessRightsStatistics.adminRights ? 'Admin' :
                                                Math.max(
                                                    accessRightsStatistics.subAdminRights,
                                                    accessRightsStatistics.nsaInChargeRights,
                                                    accessRightsStatistics.opsInChargeRights,
                                                    accessRightsStatistics.siteInChargeRights,
                                                    accessRightsStatistics.financeRights,
                                                    accessRightsStatistics.socialWorkerRights,
                                                    accessRightsStatistics.fitnessTrainerRights,
                                                    accessRightsStatistics.otherRights
                                                ) === accessRightsStatistics.siteInChargeRights ? 'Site In-charge' : 'Admin'
                                            }
                                        </li>
                                        {accessRightsStatistics.limitedAccessAccounts > 0 && (
                                            <li>🔒 {accessRightsStatistics.limitedAccessAccounts} account(s) with limited access permissions</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Access Rights Breakdown */}
                            <div className="breakdown-section">
                                <h4>Access Rights Distribution by Role:</h4>
                                <div className="breakdown-chart">
                                    {this.getAccessRightsBreakdownByRole().map((roleData, index) => {
                                        const percentage = accessRightsStatistics.totalAccessRights > 0 ? 
                                            (roleData.total / accessRightsStatistics.totalAccessRights) * 100 : 0;
                                        return (
                                            <div key={roleData.role} className="chart-bar-container">
                                                <div className="chart-label">
                                                    <span className="location-name">{roleData.role}</span>
                                                    <span className="location-stats">
                                                        {roleData.total} accounts ({percentage.toFixed(1)}% of total)
                                                    </span>
                                                </div>
                                                <div className="chart-bar">
                                                    <div 
                                                        className="chart-bar-fill"
                                                        style={{ 
                                                            width: `${percentage}%`,
                                                            backgroundColor: `hsl(${180 + (index * 40)}, 60%, 50%)`
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

export default AccessRightsDashboard;
