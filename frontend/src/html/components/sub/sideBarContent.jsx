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

    componentWillUpdate = async (prevProps, prevState) => {
        // Check if accountId has changed
       if (prevProps.accountId !== this.props.accountId) {
            this.getAccessRight(this.props.accountId);
        }
        
        // Only refresh when accessRights differ and it's the first call after accountId change
        if (prevState.accessRights !== this.state.accessRights) {
            // Avoid calling getAccessRight again if accessRights is already being updated
            if (!this.accessRightsUpdated) {
                this.accessRightsUpdated = true; // Set the flag to indicate we've called it
                this.getAccessRight(this.props.accountId);
                //this.props.refreshChild();
            }
        } else {
            // Reset the flag if accountId hasn't changed
            this.accessRightsUpdated = false;
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
    
    toggleDashboard = () =>
    {
        this.props.toggleDashboardComponent();
    }

    toggleHome = () =>
    {
        this.props.toggleHomeComponent();
    }

    handleSubKeyClick = (subKey) => {
        // Add any additional functionality you want to execute on sub-menu item click
       // console.log(`${subKey} clicked`); // Example of handling sub-key click
       console.log("Selected:", subKey);
       if(subKey === "Create Account")
       {
         this.props.toggleAccountsComponent(subKey);
       }
       else if(subKey === "Account Table")
       {
            subKey = "Accounts";
            this.props.toggleAccountsComponent(subKey);
       }
       else if(subKey === "Access Rights Table")
       {
        subKey = "Access Rights";
        this.props.toggleAccountsComponent(subKey);
       } 
       else if(subKey === "NSA Courses")
       {
        subKey = "NSA";
        this.props.toggleCourseComponent(subKey);
       }
       else if(subKey === "ILP Courses")
       {
         subKey = "ILP";
         this.props.toggleCourseComponent(subKey);
       }
        else if(subKey === "Marriage Preparation Programme Courses")
       {
         subKey = "Marriage Preparation Programme";
         this.props.toggleCourseComponent(subKey);
       }
       else if(subKey === "Registration And Payment Table")
       {
          this.props.toggleRegistrationPaymentComponent(subKey);
       }
       else if(subKey === "Monthly Report")
       {
         this.props.toggleReportComponent(subKey);
       }
       else if(subKey === "Payment Report")
       {
        this.props.toggleReportComponent(subKey);
       }
       else if(subKey === "View Attendance")
       {
        console.log("View Attendance clicked");
        this.props.toggleAttendanceComponent(subKey);
       }
       else if(subKey === "View Membership")
       {
        console.log("View Membership clicked");
        this.props.toggleMembershipComponent(subKey);
       }
    }

    closeSubMenu = () =>
    {
        this.setState({ openKey: null }); 
    }

    render() {
        const { accessRights, openKey } = this.state;
        console.log("Access Rights:", accessRights);

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
            "Attendances": 'fa-solid fa-calendar-days'
        };

        return (
            <div className="sidebar-content"  onMouseLeave={this.closeSubMenu}>
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

                        // Check if the value is exactly true or an object with true sub-keys
                        if (value === true) {
                            return (
                                <li key={key} onClick={() => this.toggleMainMenu(key)}>
                                    <i className={iconMap[key]} aria-hidden="true"></i> {/* Display the icon */}
                                    <span>{key}</span> {/* Display the main key */}
                                </li>
                            );
                        } else if (typeof value === 'object' && value !== null) {
                            // If value is an object, check its sub-keys
                            const subKeys = Object.keys(value).filter(subKey => value[subKey] === true);
                            if (subKeys.length > 0) {
                                return (
                                    <li key={key}>
                                        <div onClick={() => this.toggleMainMenu(key)}>
                                            <i className={iconMap[key]} aria-hidden="true"></i> {/* Display the icon */}
                                            {key} {/* Display the main key */}
                                        </div>
                                        {openKey === key && ( // Render sub-keys only if this main key is open
                                            <ul>
                                                {subKeys.map(subKey => (
                                                    <li key={subKey} onClick={() => this.handleSubKeyClick(subKey)}>
                                                        <span>{subKey}</span>{/* Display the sub-key */}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                );
                            }
                        }
                        return null; // Do not render anything if the value is not true
                    })}
                </ul>
            </div>
        );
    }
}

export default SideBarContent;
