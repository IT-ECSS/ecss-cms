import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/sideBar.css'; // Import a CSS file for styling

class SideBarContent extends Component {
    constructor(props) {
        super(props);
        this.state = {
            accessRights: {}, // State to hold access rights
            openKey: null, // State to manage which main key is open
            accessRightsUpdated: false
        };
    }

    componentDidMount = async () => {
        const { accountId } = this.props;
        await this.getAccessRight(accountId);
    }

    // Helper function to compare access rights
    isEqual = (obj1, obj2) => {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) {
            return false; // Different number of keys
        }

        for (const key of keys1) {
            if (obj1[key] !== obj2[key]) {
                return false; // Values are different
            }
        }

        return true; // Objects are equal
    }

    componentDidUpdate = async (prevProps, prevState) => {
        // Check if accountId has changed
        if (prevProps.accountId !== this.props.accountId) {
            await this.getAccessRight(this.props.accountId);
        }
    }

    getAccessRight = async (accountId) => {
        try {
            const response = await axios.post(
                `${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/accessRights`,
                {
                    "purpose": "retrieveAccessRight",
                    "accountId": accountId
                }
            );          
            console.log("Access Rights Response:", response);

            // Store the access rights in state
            this.setState({ accessRights: response.data.result });
            
            // Pass access rights to parent component
            if (this.props.onAccessRightsUpdate) {
                this.props.onAccessRightsUpdate(response.data.result);
            }
        } catch (error) {
            console.error("Error retrieving access rights:", error);
        }
    }

    toggleMainMenu = (mainItem) => {
        this.setState((prevState) => ({
            openKey: prevState.openKey === mainItem ? null : mainItem, // Toggle the active main key
        }));
    }
    
    toggleDashboard = () => {
        this.props.toggleDashboardComponent();
    }

    toggleHome = () => {
        this.props.toggleHomeComponent();
    }

    handleSubKeyClick = (subKey) => {
        console.log("Selected:", subKey);
        if(subKey === "Create Account") {
            this.props.toggleAccountsComponent(subKey);
        }
        else if(subKey === "Account Table") {
            subKey = "Accounts";
            this.props.toggleAccountsComponent(subKey);
        }
        else if(subKey === "Access Rights Table") {
            subKey = "Access Rights";
            this.props.toggleAccountsComponent(subKey);
        } 
        else if(subKey === "NSA Courses") {
            subKey = "NSA";
            this.props.toggleCourseComponent(subKey);
        }
        else if(subKey === "ILP Courses") {
            subKey = "ILP";
            this.props.toggleCourseComponent(subKey);
        }
        else if(subKey === "Marriage Preparation Programme Courses") {
            subKey = "Marriage Preparation Programme";
            this.props.toggleCourseComponent(subKey);
        }
        else if(subKey === "Registration And Payment Table") {
            this.props.toggleRegistrationPaymentComponent(subKey);
        }
        else if(subKey === "Monthly Report") {
            this.props.toggleReportComponent(subKey);
        }
        else if(subKey === "Payment Report") {
            this.props.toggleReportComponent(subKey);
        }
        else if(subKey === "View Attendance") {
            console.log("View Attendance clicked");
            this.props.toggleAttendanceComponent(subKey);
        }
        else if(subKey === "View Membership") {
            console.log("View Membership clicked");
            this.props.toggleMembershipComponent(subKey);
        }
        else if(subKey === "FFT Results") {
            console.log("FFT Results clicked in sidebar");
            console.log("toggleFitnessComponent function exists:", !!this.props.toggleFitnessComponent);
            if (this.props.toggleFitnessComponent) {
                console.log("Calling toggleFitnessComponent...");
                this.props.toggleFitnessComponent(subKey);
            } else {
                console.error("toggleFitnessComponent function not found in props");
            }
        }
    }

    closeSubMenu = () => {
        this.setState({ openKey: null }); 
    }

    render() {
        const { accessRights, openKey } = this.state;
        console.log("Access Rights (Now):", accessRights);

        // Map of icons for each main item
        const iconMap = {
            "Home": 'fa-solid fa-house-user',
            "Dashboard": 'fa-solid fa-dashboard',
            "Account": 'fa-solid fa-users',
            "Courses": "fa-solid fa-chalkboard-user",
            "Registration And Payment": 'fa-solid fa-brands fa-wpforms',
            "Membership": 'fa-solid fas fa-address-card',
            "QR Code": 'fa-solid fa-qrcode',
            "Reports": 'fa-solid fa-table',
            "Attendances": 'fa-solid fa-calendar-days',
            "Fitness": 'fa-solid fa-dumbbell'
        };

        return (
            <div className="sidebar-content" onMouseLeave={this.closeSubMenu}>
                <ul>
                    <div style={{marginBottom: "-20px"}}> 
                        <li key={"Home"} onClick={() => this.toggleHome()}>
                            <i className={iconMap["Home"]} aria-hidden="true"></i>
                            <span style={{marginLeft: "5px"}}>Home</span>
                        </li>
                    </div>
                    <div style={{marginBottom: "-20px"}}> 
                        <li key={"Dashboard"} onClick={() => this.toggleDashboard()}>
                            <i className={iconMap["Dashboard"]} aria-hidden="true"></i>
                            <span style={{marginLeft: "5px"}}>Dashboard</span>
                        </li>
                    </div>
                    {Object.keys(accessRights).map((key) => {
                        const value = accessRights[key];
                        console.log("Rendering main key123:", key, value);
                        
                        // Handle both boolean values and objects
                        if (value === true) {
                            // Simple boolean true value - show the menu item
                            return (
                                <li key={key} onClick={() => this.toggleMainMenu(key)}>
                                    <i className={iconMap[key]} aria-hidden="true"></i>
                                    <span style={{marginLeft: "5px"}}>{key}</span>
                                </li>
                            );
                        } else if (typeof value === 'object' && value !== null) {
                            // Object with sub-keys - only show if at least one sub-key is true
                            const enabledSubKeys = Object.keys(value).filter(subKey => value[subKey] === true);
                            
                            // Only render the main menu if there are enabled sub-keys
                            if (enabledSubKeys.length > 0) {
                                return (
                                    <li key={key}>
                                        <div onClick={() => this.toggleMainMenu(key)}>
                                            <i className={iconMap[key]} aria-hidden="true"></i>
                                            <span style={{marginLeft: "5px"}}>{key}</span>
                                        </div>
                                        {openKey === key && (
                                            <ul>
                                                {enabledSubKeys.map(subKey => (
                                                    <li 
                                                        key={subKey} 
                                                        onClick={() => this.handleSubKeyClick(subKey)}
                                                        className="enabled-item"
                                                    >
                                                        <span>{subKey}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                );
                            }
                        }
                        // If value is false or no enabled sub-keys, don't render anything
                        return null;
                    })}
                </ul>
            </div>
        );
    }
}

export default SideBarContent;