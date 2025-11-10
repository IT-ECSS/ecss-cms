import React, { Component } from 'react';
import axios from 'axios';
import '../../../css/sub/accounts.css';
import '../../../css/ag-grid-custom-theme.css'; // Import custom AgGrid theme
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 

class AccountsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      accounts: [], // All fetched courses
      filteredAccounts: [], // Courses filtered based on user 
      accessRights: [], // All fetched courses
      filteredAccessRights: [],
      accountsColumnDefs: this.getAccountsColumnDefs(),
      accessRightsColumnDefs: this.accessRightsColumnDefs(),
      accountsRowData: [],
      accessRightsRowData: [],
      expandedRowIndex: null,
    };
    this.tableRef = React.createRef();
  }

  accessRightsColumnDefs = () => {
    const { role } = this.props; // Get the role from props
    
    return [
      {
        headerName: "S/N",
        field: "sn",
        width: 100,
      },
      {
        headerName: "Name",
        field: "name",
        width: 200,
      },
      {
        headerName: "Account Type",
        field: "accType",
        width: 350,
        // Apply styles dynamically based on the account type (role)
        cellStyle: (params) => {
          return {
            backgroundColor: this.getRoleColor(params.value), // Background color based on role
            fontWeight: "bold",
            color: "white",
            textAlign: "center", // Center text horizontally
            display: "inline-flex", // Use flexbox for vertical alignment
            alignItems: "center", // Vertically center the text
            justifyContent: "center", // Center horizontally as well
            borderRadius: "20px", // Oval shape
            paddingLeft: "30px", // Padding inside the oval
            paddingRight: "30px", // Padding inside the oval
            minWidth: "175px", // Ensure a minimum width for the oval
            whiteSpace: "nowrap", // Prevent text from wrapping
          };
        },        
      }
    ]
  };

  getAccountsColumnDefs = () => {
    const { role } = this.props; // Get the role from props
    
    return [
      {
        headerName: "S/N",
        field: "sn",
        width: 100,
      },
      {
        headerName: "Name",
        field: "name",
        width: 300,
      },
      {
        headerName: "Email",
        field: "email",
        width: 300,
      },
      {
        headerName: "Account Type",
        field: "accType",
        width: 250,
        // Apply styles dynamically based on the account type (role)
        cellStyle: (params) => {
          return {
            backgroundColor: this.getRoleColor(params.value), // Background color based on role
            fontWeight: "bold",
            color: "white",
            textAlign: "center", // Center text horizontally
            display: "inline-flex", // Use flexbox for vertical alignment
            alignItems: "center", // Vertically center the text
            justifyContent: "center", // Center horizontally as well
            borderRadius: "20px", // Oval shape
            paddingLeft: "30px", // Padding inside the oval
            paddingRight: "30px", // Padding inside the oval
            minWidth: "175px", // Ensure a minimum width for the oval
            whiteSpace: "nowrap", // Prevent text from wrapping
          };
        },        
      },         
      {
        headerName: "Site I/C",
        field: "siteIC",
        width: 550,
         // Apply styles dynamically based on the account type (role)
         cellStyle: (params) => {
          return {
            backgroundColor: this.getSiteColor(params.value), // Background color based on role
            fontWeight: "bold",
            color: "white",
            textAlign: "center", // Center text horizontally
            display: "inline-flex", // Use flexbox for vertical alignment
            alignItems: "center", // Vertically center the text
            justifyContent: "center", // Center horizontally as well
            borderRadius: "20px", // Oval shape
            paddingLeft: "30px", // Padding inside the oval
            paddingRight: "30px", // Padding inside the oval
            minWidth: "100px", // Ensure a minimum width for the oval
            whiteSpace: "nowrap", // Prevent text from wrapping
          };
        },        
      },
      {
        headerName: "Date Created",
        field: "dateCreated",
        width: 150,
      },
      {
        headerName: "Time Created",
        field: "timeCreated",
        width: 150,
      },
    ]
  };

  async fetchAccounts() 
  {
    try {
      this.setState({ loading: true });
      var response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/accountDetails`, { purpose: "retrieve" });
      console.log(response.data.result);
      var roles = this.getAllRoles(response.data.result);

      await this.props.getTotalNumberofAccounts(response.data.result.length);
      this.props.passDataToParent(roles);
      this.props.closePopup();
      
        // Update state with fetched data
        this.setState({
            accounts: response.data.result, // All fetched courses
            filteredAccounts: response.data.result, 
            loading: false,
            hideAllCells: false,
            dataFetched: true,
            roles:roles // Set locations in state
          });
      this.getAccountsRowData(response.data.result);
      this.props.closePopup();
    } catch (error) {
      console.error('Error fetching data:', error);
      this.setState({ loading: false });
      this.props.closePopup();
    }
  }

  getAccountsRowData = (accountsDetails) => {
    //const paginatedDetails = this.getPaginatedDetails();
    //console.log("Hi")
    console.log("All accounts:", accountsDetails);
   
     // Assuming paginatedDetails is an array of objects with the necessary fields.
     const accountsRowData = accountsDetails.map((item, index) => {
       return {
         id: item._id,
         sn: index + 1,  // Serial number (S/N)
         name: item.name,
         email: item.email,
         accType: item.role,
         dateCreated: item.date_created,
         timeCreated: item.time_created,
         siteIC: item.site,
         firstTimeLogIn: item.first_time_log_in,
         dateLogIn: item.date_log_in,
         timeLogIn: item.time_log_in,
         dateLogOut: item.date_log_out,
         timeLogOut: item.time_log_out
       };
     });
     console.log("All Rows Data:", accountsRowData);
   
     // Set the state with the new row data
     this.setState({accounts: accountsRowData, accountsRowData });
   };
 

  async fetchAccessRights() 
  {
    try {
      this.setState({ loading: true });
      var response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/accessRights`, { purpose: "retrieve" });
      console.log("Fetch Access Rights:",response.data.result);
      var roles = this.getAllRolesAccessRight(response.data.result);

      await this.props.getTotalNumberofAccounts(response.data.result.length);
      console.log("Access Rights123:", response.data.result);
      this.props.passDataToParent(roles);
      this.props.closePopup();
      
        // Update state with fetched data
        this.setState({
            accessRights: response.data.result, // All fetched courses
            filteredAccessRights: response.data.result, // Courses filtered based on user inputs
            loading: false,
            hideAllCells: false,
            dataFetched: true,
            roles:roles // Set locations in state
          });
        this.getAccessRightsRowData(response.data.result);
        this.props.closePopup();
    } catch (error) {
      console.error('Error fetching data:', error);
      this.setState({ loading: false });
      this.props.closePopup();
    }
  }

  getAccessRightsRowData = (accessRightsDetails) => {
    console.log("Access Rights:", accessRightsDetails);
     // Assuming paginatedDetails is an array of objects with the necessary fields.
     const accessRightsRowData = accessRightsDetails.map((item, index) => {
       return {
         id: item._id,
         sn: index + 1,  // Serial number (S/N)
         name: item["Account Details"]["Name"],
         accType: item["Account Details"]["Role"],
         accounts: item["Account"],
         courses: item["Courses"],
         regPay: item["Registration And Payment"],
         qRCode: item["QR Code"],
         attendance: item["Attendances"],
         membership: item["Membership"],
         reports: item["Reports"],
         fitness: item["Fitness"] || {},
         fundraising: item["Fundraising"] || {}
       };
     });
   
     // Set the state with the new row data
     this.setState({accessRights: accessRightsRowData, accessRightsRowData});
   };
 

  getAllRoles(accounts) {
    return [...new Set(accounts.map(account => {
      return (account.role);
    }))];
  }

  getAllRolesAccessRight(accessRights) {
    return [...new Set(accessRights.map(accessRights => {
      return (accessRights["Account Details"]["Role"]);
    }))];
  }
  
  async componentDidMount() {
    var { accountType } = this.props;
   // console.log("ComponentDidMount:", accountType);
    if (accountType && !this.state.dataFetched && accountType === "Accounts") {
      await this.fetchAccounts();
    }
    else if (accountType && !this.state.dataFetched && accountType === "Access Rights") 
    {
      await this.fetchAccessRights();
    }
  }

  componentDidUpdate(prevProps)
  {
   var { accountType, selectedAccountType, language, searchQuery } = this.props;
    //console.log("Component Did Update:", accountType, prevProps.accountType, accountType !== prevProps.accountType);
   // Check if any of the relevant props have changed
   if (
     accountType !== prevProps.accountType ||
     language !== prevProps.language 
   ) {
      if(accountType === "Accounts")
     {
        this.fetchAccounts();
     }
     else if(accountType === "Access Rights")
     {
         this.fetchAccessRights();
        //this.props.closePopup();
     }
   }
   else if ( 
    selectedAccountType !== prevProps.selectedAccountType || 
    searchQuery !== prevProps.searchQuery 
    ) {
          if(accountType === "Accounts")
          {
            console.log("Going to Filter Accounts");  
            this.filterAccounts();
          }
          else if(accountType === "Access Rights")  
          {
              this.filterAccessRights();
            //this.props.closePopup();
          }
    }
    else if (prevProps.key !== this.props.key) {
      this.filterAccounts();
    }
  }

  filterAccounts() {
    const { section, selectedAccountType, searchQuery } = this.props;
  
    if (section === "accounts") {
      const { accounts } = this.state;  // Assuming 'accounts' holds the original data
  
      console.log("Accounts:", accounts);
      console.log("Filters Applied:", { selectedAccountType, searchQuery });
  
      // If no filters are applied, set filteredAccounts to all accounts
      if ((selectedAccountType === "All Roles" || !selectedAccountType) && !searchQuery) {
        const accountsRowData = accounts.map((item, index) => ({
          sn: index + 1,  // Serial number (S/N)
          name: item.name,
          email: item.email,
          accType: item.accType,  // Mapping role to accType
          dateCreated: item.dateCreated,  // Mapping date_created to dateCreated
          timeCreated: item.timeCreated,  // Mapping time_created to timeCreated
          siteIC: item.siteIC,  // Use siteIC consistently
          firstTimeLogIn: item.firstTimeLogIn,
          dateLogIn: item.dateLogIn,
          timeLogIn: item.timeLogIn,
          dateLogOut: item.dateLogOut,
          timeLogOut: item.timeLogOut
          // You can add more fields as necessary
        }));
  
        // Update state with all accounts (no filters)
        this.setState({ accountsRowData });
        this.updateAccountsRowData(accounts);
        return;
      }
  
      // Normalize the search query for filtering
      const normalizedSearchQuery = searchQuery ? searchQuery.toLowerCase().trim() : '';
  
      // Define filter conditions
      const filters = {
        accType: selectedAccountType !== "All Roles" ? selectedAccountType : null,
        searchQuery: normalizedSearchQuery || null,
      };
  
      console.log("Criteria Selected:", filters);
  
      // Apply filters step by step
      let filteredDetails = accounts;
  
      // Apply role filter if selected
      if (filters.accType) {
        filteredDetails = filteredDetails.filter(data => data.accType.toLowerCase() === filters.accType.toLowerCase());
      }

      // Log filtered results
      console.log("Filtered Details:", filteredDetails);
        
     // Apply search query filter if provided
    if (filters.searchQuery) {
      filteredDetails = filteredDetails.filter(data => {
        console.log("Data:", data);
        
        // Safely handle null/undefined fields
        const name = data.name ? data.name.toLowerCase().trim() : "";
        const email = data.email ? data.email.toLowerCase().trim() : "";
        const accType = data.accType ? data.accType.toLowerCase().trim() : "";
        const dateCreated = data.dateCreated ? data.dateCreated.toLowerCase().trim() : "";
        const timeCreated = data.timeCreated ? data.timeCreated.toLowerCase().trim() : "";
        const siteIC = data.siteIC ? data.siteIC.toLowerCase().trim() : "No Site IC";  // Default message when siteIC is null or undefined

          return (
            name.includes(filters.searchQuery) ||
            email.includes(filters.searchQuery) ||
            accType.includes(filters.searchQuery) ||
            dateCreated.includes(filters.searchQuery) ||
            timeCreated.includes(filters.searchQuery) ||
            siteIC.includes(filters.searchQuery)  // Adding siteIC for the search query filter
          );
      });
    }
  
      // Map filtered details to include necessary fields
      const accountsRowData = filteredDetails.map((item, index) => ({
        sn: index + 1,  // Serial number (S/N)
        name: item.name,
        email: item.email,
        accType: item.accType,  // Mapping role to accType
        dateCreated: item.date_created,  // Mapping date_created to dateCreated
        timeCreated: item.time_created,  // Mapping time_created to timeCreated
        siteIC: item.siteIC,  // Mapping site to siteIC
        firstTimeLogIn: item.firstTimeLogIn,
        dateLogIn: item.dateLogIn,
        timeLogIn: item.timeLogIn,
        dateLogOut: item.dateLogOut,
        timeLogOut: item.timeLogOut
        // You can add more fields as necessary
      }));
  
      // Update the state with the filtered accounts
      this.setState({ accountsRowData });
      this.updateAccountsRowData(filteredDetails);
    }
  }
  
  updateAccountsRowData(paginatedDetails) 
  {
     this.setState({filteredAccounts: paginatedDetails});
  }

  updateAccessRightsRowData(paginatedDetails) 
  {
     this.setState({filteredAccessRights: paginatedDetails});
  }

  filterAccessRights() {
    const { section } = this.props;
  
    if (section === "accounts") {
      const { accessRights } = this.state;
      const { selectedAccountType, searchQuery } = this.props;
  
      // If no filters are applied, set filteredAccessRights to all accounts
      if ((selectedAccountType === "All Roles" || !selectedAccountType) && !searchQuery) {
        const accessRightsRowData = accessRights.map((item, index) => ({
          id: item.id,
          sn: index + 1,  // Serial number (S/N)
          name: item.name,
          accType: item.accType,
          accounts: item.accounts,
          courses: item.courses,
          regPay: item.regPay,
          qRCode: item.qRCode,
          attendance: item.attendance,
          membership: item.membership,
          reports: item.reports,
          fitness: item.fitness || {},
          fundraising: item.fundraising || {}
        }));

        // Update state with all accounts (no filters)
        this.setState({ accessRightsRowData });
        this.updateAccessRightsRowData(accessRights);
        return;
      }      // Normalize the search query for filtering
      const normalizedSearchQuery = searchQuery ? searchQuery.toLowerCase().trim() : '';
  
      // Define filter conditions
      const filters = {
        accType: selectedAccountType !== "All Roles" ? selectedAccountType : null,
        searchQuery: normalizedSearchQuery || null,
      };
  
      console.log("Criteria Selected:", filters);
  
      // Apply filters step by step
      let filteredDetails = accessRights; // Corrected from accounts to accessRights
  
      // Apply role filter if selected
      if (filters.accType) {
        filteredDetails = filteredDetails.filter(data => data.accType.toLowerCase() === filters.accType.toLowerCase());
      }
  
      // Log filtered results
      console.log("Filtered Details:", filteredDetails);
  
      // Apply search query filter if provided
      if (filters.searchQuery) {
        filteredDetails = filteredDetails.filter(data => {
          console.log("Data:", data);
  
          // Safely handle null/undefined fields
          const name = data.name ? data.name.toLowerCase().trim() : "";
          const accType = data.accType ? data.accType.toLowerCase().trim() : "";
  
          return (
            name.includes(filters.searchQuery) ||
            accType.includes(filters.searchQuery) 
          );
        });
      }
  
      // Map filtered details to include necessary fields
      const accessRightsRowData = filteredDetails.map((item, index) => ({
        id: item.id,
        sn: index + 1,  // Serial number (S/N)
        name: item.name,
        accType: item.accType,
        accounts: item.accounts,
        courses: item.courses,
        regPay: item.regPay,
        qRCode: item.qRCode,
        attendance: item.attendance,
        membership: item.membership,
        reports: item.reports,
        fitness: item.fitness || {},
        fundraising: item.fundraising || {}
      }));
  
      // Update the state with the filtered access rights
      this.setState({ accessRightsRowData });
      this.updateAccessRightsRowData(filteredDetails);
    }
  }
  

  // Account info handler based on index
  accountInfo = async (index, account) => {
    console.log("Account Information:", account.id);
    // Call the edit function, passing the account's ID
    this.props.edit(account.id);
  };

  accessRightInfo = async(accessRight) =>
  {
    console.log("Access Rights  :", accessRight);
    console.log("Access Rights keys:", Object.keys(accessRight));
    console.log("Accounts data:", accessRight.accounts);
    console.log("Courses data:", accessRight.courses);
    this.props.updateAccessRights(accessRight);
  }

  getRoleColor = (role) => {
    switch(role) {
      case 'Admin':
        return '#008000'; // Green
      case 'Sub Admin':
        return '#0000FF'; // Blue
      case 'Ops in-charge':
        return '#FF0000'; // Red
      case 'NSA in-charge':
        return '#FFA500'; // Orange
      case 'Social Worker':
        return '#734f96'; // Lavender
      case 'Fitness Trainer':
        return '#673A3F'; // Orange
      case 'Site in-charge':
        return '#8B4513'; // Brown
      case 'Finance':
        return '#000000'; // Black
      default:
        return '#808080'; // Gray (default color if role is not recognized)
    }
  }

  getSiteColor = (role) => {
    switch(role)  {
      case 'Tampines 253 Centre':
        return '#FF6347'; // Tomato Red
      case 'CT Hub':
        return '#20B2AA'; // Light Sea Green
      case 'Tampines North Community Centre':
        return '#FFD700'; // Gold
      case 'Pasir Ris West Wellness Centre':
        return '#8A2BE2'; // Blue Violet
      default:
        return role !== "" && role !== null ? '#808080' : '';; // Light Gray (default color if role is not recognized)
    }
  }

  handleAccessRightsValueClick = async (event) =>
  {
    console.log("handleValueClick");
    const columnName = event.colDef.headerName;
    const rowIndex = event.rowIndex; // Get the clicked row index
    const expandedRowIndex = this.state.expandedRowIndex;
    const data = event.data;  
    console.log("Row Index:", rowIndex);

      try {
        if(columnName === "S/N")
        {
            // Optional: Handle additional logic here if necessary
            console.log("Cell clicked", event);
            // Check if clicked on a row and handle expansion
            if (expandedRowIndex === rowIndex) {
              // If the same row is clicked, collapse it
              this.setState({ expandedRowIndex: null });
            } else {
              // Expand the new row
            this.setState({ expandedRowIndex: rowIndex });
            } 
        }
        else if (columnName === "Name")
        {
          this.accessRightInfo(data)
        }
      }
      catch (error) {
        console.error('Error during submission:', error);
      }
  }

  handleAccountsValueClick = async (event) =>
  {
    console.log("handleValueClick");
    const columnName = event.colDef.headerName;   
    const data = event.data;     
    const rowIndex = event.rowIndex; // Get the clicked row index
    const expandedRowIndex = this.state.expandedRowIndex;
    console.log("Row Index:", rowIndex);  

    try {
      if(columnName === "S/N")
      {
        // Optional: Handle additional logic here if necessary
        console.log("Cell clicked", event);
        // Check if clicked on a row and handle expansion
        if (expandedRowIndex === rowIndex) {
          // If the same row is clicked, collapse it
          this.setState({ expandedRowIndex: null });
        } else {
          // Expand the new row
         this.setState({ expandedRowIndex: rowIndex });
        }
      }
      else if (columnName === "Name")
      {
        await this.accountInfo(rowIndex, data)
      }
      else if (columnName === "Account Type")
      {
          
      }
    }
    catch (error) {
      console.error('Error during submission:', error);
    }
  }
  

  render() 
  {
    ModuleRegistry.registerModules([AllCommunityModule]);

    return (
      <div className="accounts-container">
        <div className="accounts-heading">
          <h1>{this.props.accountType === 'Accounts' ? 'Accounts Table' : 'Access Rights Table'}</h1>
          <div 
            style={{ width: this.props.accountType === 'Accounts' ? '78vw' : '42vw' }} 
            className="grid-container1"
          >
          <AgGridReact
             columnDefs={
              this.props.accountType === 'Accounts'
                ? this.state.accountsColumnDefs // Define columns for accounts
                : this.state.accessRightsColumnDefs // Define columns for access rights
            }
            rowData={
              this.props.accountType === 'Accounts'
                ? this.state.accountsRowData // Define row data for accounts
                : this.state.accessRightsRowData // Define row data for access rights
            }
            domLayout="normal"
            paginationPageSize={
              this.props.accountType === 'Accounts'
                ? this.state.accountsRowData.length // Set page size based on accounts row data
                : this.state.accessRightsRowData.length // Set page size based on access rights row data
            }
            sortable={true}
            statusBar={false}
            pagination={true}
            defaultColDef={{
              resizable: true, //Make columns resizable
            }}
            onCellClicked={ this.props.accountType === 'Accounts'
              ? this.handleAccountsValueClick // Set page size based on accounts row data
              :  this.handleAccessRightsValueClick } // Handle cell click event
            />
          </div>
          {
            this.state.expandedRowIndex !== null && (
              <div
                style={{
                  padding: '10px',
                  backgroundColor: '#F9E29B',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  width: this.props.accountType === 'Accounts' ? '77vw' : '44vw',
                  height: 'fit-content',
                  borderRadius: '15px', // Make the border more rounded
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', // Optional: Add a subtle shadow for a floating effect
                  textAlign: 'left',  // Align text to the left
                }}
              >
                <p><strong>More Information</strong></p>

                {this.props.accountType === 'Accounts' ? (
                  <>
                    <p><strong>First Time Log In: </strong>{this.state.accountsRowData[this.state.expandedRowIndex]?.firstTimeLogIn}</p>
                    <p><strong>Last Log In: </strong>
                      <br/><strong>Date: </strong>{this.state.accountsRowData[this.state.expandedRowIndex]?.dateLogIn} 
                      <br/><strong>Time: </strong>{this.state.accountsRowData[this.state.expandedRowIndex]?.timeLogIn}
                    </p>
                    <p><strong>Last Log Out: </strong>
                      <br/><strong>Date: </strong>{this.state.accountsRowData[this.state.expandedRowIndex]?.dateLogOut} 
                      <br/><strong>Time: </strong>{this.state.accountsRowData[this.state.expandedRowIndex]?.timeLogOut}
                    </p>
                  </>
                ) : (
                  this.state.accessRightsRowData[this.state.expandedRowIndex] ? (
                  <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <strong>Account Modules | </strong>
                    <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Access Rights Table: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex]?.accounts?.["Access Rights Table"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                    </p>
                    <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                      <strong>Account Table: </strong>
                      {this.state.accessRightsRowData[this.state.expandedRowIndex]?.accounts?.["Account Table"] ? (
                        <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                      ) : (
                        <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                      )}
                    </p>
                    </div>
                    <br />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <strong>Attendances Module | </strong>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Viewing Attendance: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].attendance["View Attendance"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                    </div>
                    <br/>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <strong>Courses Modules |  </strong>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Delete Course(s): </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].courses["Delete Courses"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>ILP Courses: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].courses["ILP Courses"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Marriage Preparation Programme Courses: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].courses["Marriage Preparation Programme Courses"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>NSA Courses: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].courses["NSA Courses"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Talks And Seminar: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].courses["Talks And Seminar"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Update Course(s): </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].courses["Update Courses"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Upload Course(s): </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].courses["Upload Courses"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                    </div>
                    <br />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <strong>Fitness Module | </strong>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>FFT Results: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].fitness["FFT Results"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                    </div>
                    <br/>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <strong>Fundraising Module | </strong>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Fundraising Inventory: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].fundraising["Fundraising Inventory"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Fundraising Table: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].fundraising["Fundraising Table"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                    </div>
                    <br/>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <strong>Membership Module |  </strong>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Viewing Membership: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].membership["View Membership"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                    </div>
                    <br />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <strong>QR Code Modules | </strong>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>QR Code Creation: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].qRCode["Create QR Code"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>QR Code Deletion: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].qRCode["Delete QR Code"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>QR Code Table: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].qRCode["QR Code Table"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Update QR Code: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].qRCode["Update QR Code"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                    </div>
                    <br />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <strong>Registration And Payment Module |  </strong>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Invoice Table: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].regPay["Invoice Table"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>

                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Registration And Payment Table: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].regPay["Registration And Payment Table"] ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                    </div>
                    <br/>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <strong>Reports Module | </strong>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'center' }}>
                        <strong>Monthly Reports: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].reports &&
                        this.state.accessRightsRowData[this.state.expandedRowIndex].reports["Monthly Report"] === true ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                      <p style={{ margin: '0', display: 'flex', alignItems: 'flex-start' }}>
                        <strong>Payment Reports: </strong>
                        {this.state.accessRightsRowData[this.state.expandedRowIndex].reports &&
                        this.state.accessRightsRowData[this.state.expandedRowIndex].reports["Payment Report"] === true ? (
                          <i className="fas fa-check" style={{ color: 'green', fontSize: '20px', marginLeft: '5px' }}></i>
                        ) : (
                          <i className="fas fa-times" style={{ color: 'red', fontSize: '20px', marginLeft: '5px' }}></i>
                        )}
                      </p>
                    </div>
                  </>
                  ) : (
                    <p>No access rights data available</p>
                  )
                )}
              </div>
            )
          }
        </div>
      </div>
    );
  }
  
}

export default AccountsSection;
