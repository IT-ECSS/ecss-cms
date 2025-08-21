import React, { Component } from "react";
import { DashboardController } from './dashboard';
import '../../../css/sub/dashboardSection.css';

class DashboardSection extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            error: null
        };
    }

    componentDidMount() {
        console.log('DashboardSection mounted');
        // Close any popup that might be open
        if (this.props.closePopup1) {
            this.props.closePopup1();
        }
    }

    render() {
        const { loading, error } = this.state;

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
            <div className="dashboard-section">
                <DashboardController 
                    {...this.props}
                />
            </div>
        );
    }
}

export default DashboardSection;
