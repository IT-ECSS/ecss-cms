import React, { Component } from "react";
import axios from "axios";

class MyInfoRedirectPage extends Component {
  componentDidMount() {
    const params = new URLSearchParams(window.location.search);
    
    // Process successful authentication
    const code = params.get("code");
    const returnedState = params.get("state");
    const savedState = sessionStorage.getItem("state");
    const code_verifier = sessionStorage.getItem("code_verifier");

    // Log information for debugging
    console.log("URL params:", params.toString());
    console.log("Code:", code);
    console.log("Returned state:", returnedState);
    console.log("Saved state:", savedState);
    console.log("Code verifier exists:", code_verifier);
    
    // Validate response and automatically exchange code if valid
    if (code && returnedState && savedState && code_verifier && returnedState === savedState) {
      this.handleSendToBackend(code, code_verifier);
    } else {
      // Handle missing parameters or state mismatch
      this.setState({
        loading: false,
        error: true,
        errorMessage: "Invalid authentication parameters or state mismatch"
      });
    }
  }

  handleSendToBackend = async (code, code_verifier) => {
    console.log("Sending code to backend:", code);
    console.log("Using code_verifier:", code_verifier);
    
    // Azure best practice: Use environment variables for API endpoints
    const API_BASE_URL =
      window.location.hostname === "localhost" 
        ? "http://localhost:3001" 
        : "https://ecss-backend-node.azurewebsites.net";
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/singpass`,
        {
          code,
          code_verifier
        },
        {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      console.log("Backend response:", response.data);
      
      // Process and normalize the user data
      const normalizedUserData = this.normalizeUserData(response.data);
      console.log("Normalized user data:", normalizedUserData);
      
      // Handle successful authentication
      this.setState({ 
        loading: false,
        success: true, 
        data: {
          ...response.data,
          normalizedUserData: normalizedUserData
        },
        error: false 
      });
      
    } catch (error) {
      console.error("Authentication failed:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      });
      
      this.setState({ 
        loading: false,
        success: false, 
        error: true,
        errorMessage: error.response?.data?.message || error.message || "Authentication failed"
      });
    }
  };

  // NEW: Function to normalize user data for FormPage
  normalizeUserData = (responseData) => {
    console.log("Raw response data:", responseData);
    
    const userData = responseData.userData || {};
    console.log("Extracted userData:", userData);
    console.log("Residential status code:", userData.residentialstatus);
    
    // Create normalized data object with proper field mapping
    const normalized = {
      name: this.extractValue(userData.name),
      nric: this.extractValue(userData.uinfin),
      residentialStatus: this.formatResidentialStatus(userData.residentialstatus.code, userData.residentialstatus.desc),
      race: this.formatRace(userData.race.code, userData.race.desc),
      gender: this.formatGender(userData.sex.code, userData.sex.desc),
      dob: userData.dob,
      contactNumber: this.extractMobileNumber(userData.mobileno),
      email: this.extractValue(userData.email) || '',
      educationLevel: this.extractValue(userData.education) || '',
      workStatus: this.extractValue(userData.workstatus) || ''
    };
    
    console.log("Normalized user data:", normalized);
    return normalized;
  };

  // Helper function to extract simple values from SingPass structure
  extractValue = (field) => {
    if (!field) return '';
    
    // Handle SingPass structured data: {lastupdated, source, classification, value}
    if (typeof field === 'object' && field.value !== undefined) {
      return this.extractValue(field.value);
    }
    
    // Handle simple string/number values
    if (typeof field === 'string' || typeof field === 'number') {
    if (typeof field === 'string' || typeof field === 'number') {
      return String(field).trim();
    }
    
    return '';
  };

  // Helper function to extract coded values (like race, gender, residential status)
  extractCodeValue = (field) => {
    if (!field) return '';
    
    // Handle SingPass structured data
    if (typeof field === 'object' && field.value !== undefined) {
      return this.extractCodeValue(field.value);
    }
    
    // Handle coded values: {code, desc}
    if (typeof field === 'object' && field.code !== undefined) {
      return field.code;
    }
    
    // Handle simple values
    if (typeof field === 'string' || typeof field === 'number') {
      return String(field).trim();
    }
    
    return '';
  };

  // Helper function to extract and format date
  extractAndFormatDate = (dateField) => {
    if (!dateField) return '';
    
    const dateValue = this.extractValue(dateField);
    if (!dateValue) return '';
    
    return this.formatDateOfBirth(dateValue);
  };

  // Helper function to extract mobile number without country code
  extractMobileNumber = (mobileField) => {
    if (!mobileField) return '';
    
    // Handle SingPass structured data
    if (typeof mobileField === 'object' && mobileField.value !== undefined) {
      return this.extractMobileNumber(mobileField.value);
    }
    
    // Handle mobile number structure: {areacode, prefix, nbr}
    if (typeof mobileField === 'object' && mobileField.nbr) {
      const number = this.extractValue(mobileField.nbr);
      return number;
    }
    
    // Handle simple string/number
    if (typeof mobileField === 'string' || typeof mobileField === 'number') {
      let mobile = String(mobileField).trim();
      // Remove +65 country code if present
      if (mobile.startsWith('+65')) {
        mobile = mobile.substring(3);
      }
      if (mobile.startsWith('65') && mobile.length === 10) {
        mobile = mobile.substring(2);
      }
      return mobile;
    }
    
    return '';
  };

  // Helper function to extract postal code from address
  extractPostalCode = (addressField) => {
    if (!addressField) return '';
    
    // Handle SingPass structured data
    if (typeof addressField === 'object' && addressField.value !== undefined) {
      return this.extractPostalCode(addressField.value);
    }
    
    // Handle address object with postal field
    if (typeof addressField === 'object' && addressField.postal) {
      return this.extractValue(addressField.postal);
    }
    
    // Handle simple values
    if (typeof addressField === 'string' || typeof addressField === 'number') {
      return String(addressField).trim();
    }
    
    return '';
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      success: false,
      error: false,
      errorMessage: null,
      data: null
    };
  }

  // Helper function to format field names for display
  formatFieldName = (fieldName) => {
    const fieldMap = {
      sub: "Subject ID",
      uinfin: "NRIC/FIN",
      name: "Name",
      dob: "Date of Birth 出生日期",
      sex: "Gender 性别",
      race: "Race 种族",
      residentialstatus: "Residential Status 居民身份",
      email: "Email Address",
      mobileno: "Contact No. 联络号码",
      regadd: "Registered Address"
    };
    return fieldMap[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  // Enhanced helper function to safely render complex SingPass structured objects
  renderValue = (value, fieldName = null) => {
    console.log('Rendering value for field:', fieldName, 'Value:', value, "Type:", typeof value);
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    // Handle simple string or number values
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    
    // Handle SingPass structured data format: {lastupdated, source, classification, value}
    if (typeof value === 'object' && value.value !== undefined) {
      return this.renderValue(value.value, fieldName); // Pass fieldName for context
    }
    
    // Handle SingPass coded values: {code, desc, ...}
    if (typeof value === 'object' && value.desc !== undefined) {
      // Special handling for different fields with bilingual display
      if (fieldName === 'residentialstatus') {
        return this.formatResidentialStatus(value.code, value.desc);
      }
      if (fieldName === 'race') {
        return this.formatRace(value.code, value.desc);
      }
      if (fieldName === 'sex') {
        return this.formatGender(value.code, value.desc);
      }
      return value.desc; // Return the description for other coded values
    }
    
    // Handle mobile number structure: {areacode, prefix, nbr} - remove country code
    if (typeof value === 'object' && value.areacode && value.prefix && value.nbr) {
      const number = this.renderValue(value.nbr);
      return number; // Return only the number without country code
    }
    
    // Handle date of birth formatting to dd/mm/yyyy - FIXED
    if (fieldName === 'dob' && typeof value === 'string') {
      console.log('Date of Birth input:', value);
      const formattedDate = this.formatDateOfBirth(value);
      console.log('Date of Birth formatted:', formattedDate);
      return formattedDate;
    }
    
    // Handle address objects - return only postal code
    if (fieldName === 'regadd' && typeof value === 'object' && value.postal) {
      const postalValue = this.renderValue(value.postal);
      return postalValue !== 'N/A' ? postalValue : 'N/A';
    }
    
    // Handle address objects with nested structure (fallback)
    if (typeof value === 'object' && (value.block || value.street || value.building || value.postal)) {
      // For registered address, return only postal code
      if (fieldName === 'regadd' && value.postal) {
        const postalValue = this.renderValue(value.postal);
        return postalValue !== 'N/A' ? postalValue : 'N/A';
      }
      
      // For other address fields, return full address
      const components = [];
      
      if (value.block) {
        const blockValue = this.renderValue(value.block);
        if (blockValue && blockValue !== 'N/A') components.push(`Block ${blockValue}`);
      }
      
      if (value.building) {
        const buildingValue = this.renderValue(value.building);
        if (buildingValue && buildingValue !== 'N/A') components.push(buildingValue);
      }
      
      if (value.street) {
        const streetValue = this.renderValue(value.street);
        if (streetValue && streetValue !== 'N/A') components.push(streetValue);
      }
      
      if (value.postal) {
        const postalValue = this.renderValue(value.postal);
        if (postalValue && postalValue !== 'N/A') components.push(`Singapore ${postalValue}`);
      }
      
      return components.length > 0 ? components.join(', ') : 'N/A';
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.renderValue(item, fieldName)).join(', ');
    }
    
    // Handle other objects by attempting to extract meaningful data
    if (typeof value === 'object') {
      // Try to find a meaningful display value
      if (value.name) return this.renderValue(value.name, fieldName);
      if (value.title) return this.renderValue(value.title, fieldName);
      if (value.text) return this.renderValue(value.text, fieldName);
      if (value.description) return this.renderValue(value.description, fieldName);
      
      // For debugging: log unhandled object structures
      console.log('Unhandled object structure:', value);
      
      // Last resort: convert to readable JSON
      try {
        const entries = Object.entries(value);
        if (entries.length <= 3) {
          // For small objects, show key-value pairs
          return entries
            .map(([k, v]) => `${k}: ${this.renderValue(v, fieldName)}`)
            .join(', ');
        } else {
          // For large objects, just indicate it's complex data
          return 'Complex data structure';
        }
      } catch (e) {
        return 'Invalid data format';
      }
    }
    
    return String(value);
  };

  // FIXED: Helper function to format date of birth to dd/mm/yyyy
  formatDateOfBirth = (dateString) => {
    try {
      console.log('Formatting date input:', dateString, 'Type:', typeof dateString);
      
      // Handle null, undefined, or empty values
      if (!dateString || dateString === '') {
        console.log('Empty date string, returning N/A');
        return 'N/A';
      }
      
      // Convert to string if it's not already
      const dateStr = String(dateString).trim();
      
      // If it's already in dd/mm/yyyy format, return as is
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        console.log('Date already in dd/mm/yyyy format:', dateStr);
        return dateStr;
      }
      
      // If it's in yyyy-mm-dd format (ISO format) - most common SingPass format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        console.log('Converted yyyy-mm-dd to dd/mm/yyyy:', formattedDate);
        return formattedDate;
      }
      
      // If it's in dd-mm-yyyy format with dashes
      if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [day, month, year] = dateStr.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        console.log('Converted dd-mm-yyyy to dd/mm/yyyy:', formattedDate);
        return formattedDate;
      }
      
      // If it's in mm/dd/yyyy format (US format)
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/) && dateStr !== dateStr.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$2/$1/$3')) {
        // This is a more complex check - for now, assume it's already correct
        console.log('Date appears to be in mm/dd/yyyy or dd/mm/yyyy format:', dateStr);
        return dateStr;
      }
      
      // Try parsing as a Date object for other formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        console.log('Parsed date object to dd/mm/yyyy:', formattedDate);
        return formattedDate;
      }
      
      // If it's just a year (like "1960")
      if (dateStr.match(/^\d{4}$/)) {
        console.log('Only year provided:', dateStr);
        return `01/01/${dateStr}`;
      }
      
      // If all else fails, return the original string
      console.log('Could not format date, returning original:', dateStr);
      return dateStr;
      
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'N/A';
    }
  };

  // Helper function to format residential status with bilingual display
  formatResidentialStatus = (code, description) => {
    const statusMap = {
      'SC': 'SC 新加坡公民',
      'PR': 'PR 永久居民'
    };
    
    // Return mapped value if available, otherwise fallback to code + description
    return statusMap[code] || `${code} ${description}`;
  };

  // Helper function to format race with bilingual display
  formatRace = (code, description) => {
    const raceMap = {
      'CN': 'Chinese 华',
      'IN': 'Indian 印',
      'ML': 'Malay 马',
      'OT': 'Others 其他'
    };
    
    // Return mapped value if available, otherwise fallback to code + description
    return raceMap[code] || `${code} ${description}`;
  };

  // Helper function to format gender with bilingual display
  formatGender = (code, description) => {
    const genderMap = {
      'M': 'M 男',
      'F': 'F 女'
    };
    
    // Return mapped value if available, otherwise fallback to code + description
    return genderMap[code] || `${code} ${description}`;
  };

  // Helper function to handle navigation
  handleNavigation = (path, userData = null) => {
    // Get course link from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const courseLink = urlParams.get('link');
    
    if (userData) {
      // Use the normalized user data for FormPage
      const userDataToPass = this.state.data?.normalizedUserData || userData;
      console.log('Passing user data to FormPage:', userDataToPass);
      
      // Use React Router's history to navigate with state
      this.props.history.push({
        pathname: path,
        state: { 
          userData: userDataToPass,
          courseLink: courseLink ? decodeURIComponent(courseLink) : null
        }
      });
    } else {
      // Navigate without state but preserve course link if going to singpass
      if (path === "/singpass" && courseLink) {
        this.props.history.push(`${path}?link=${courseLink}`);
      } else {
        this.props.history.push(path);
      }
    }
  };

  // Helper function to extract course information from URL
  extractCourseInfo = (courseUrl) => {
    if (!courseUrl) return null;
    
    try {
      const url = new URL(courseUrl);
      const pathname = url.pathname;
      
      // Extract course slug from URL path
      const segments = pathname.split('/').filter(segment => segment);
      
      if (segments.length >= 2 && segments[0] === 'product') {
        const courseSlug = decodeURIComponent(segments[1]);
        
        // Parse course information
        const courseInfo = {
          url: courseUrl,
          slug: courseSlug,
          name: this.parseCourseName(courseSlug),
          location: this.parseCourseLocation(courseSlug)
        };
        
        return courseInfo;
      }
      
      return { url: courseUrl, name: 'Course Registration' };
    } catch (error) {
      console.error('Error parsing course URL:', error);
      return { url: courseUrl, name: 'Course Registration' };
    }
  };

  // Helper function to parse course name from slug
  parseCourseName = (slug) => {
    // Handle Chinese course names
    const chineseMatch = slug.match(/[\u4e00-\u9fff]+/);
    const chineseName = chineseMatch ? chineseMatch[0] : '';
    
    // Handle English parts
    const englishParts = slug
      .replace(/[\u4e00-\u9fff]+/, '') // Remove Chinese characters
      .split(/[-_]/)
      .filter(part => 
        part && 
        !/^(tampines|jurong|bedok|woodlands|toa|payoh|ang|mo|kio|centre|\d+)$/i.test(part)
      );
    
    let englishName = '';
    if (englishParts.length > 0) {
      englishName = englishParts
        .join(' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    if (chineseName && englishName) {
      return `${chineseName} (${englishName})`;
    }
    
    return chineseName || englishName || 'Course Registration';
  };

  // Helper function to parse course location from slug
  parseCourseLocation = (slug) => {
    const locationMatch = slug.match(/(tampines|jurong|bedok|woodlands|toa-payoh|ang-mo-kio).*?(\d+).*?(centre|center)/i);
    
    if (locationMatch) {
      const area = locationMatch[1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      const number = locationMatch[2];
      return `${area} ${number} Centre`;
    }
    
    return 'Location TBC';
  };

  render() {
    const { loading, success, error, errorMessage, data } = this.state;
    
    // Base container styles
    const containerStyle = {
      maxWidth: '600px',
      margin: '50px auto',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      lineHeight: '1.6'
    };

    const buttonStyle = {
      backgroundColor: '#4CAF50',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
      marginTop: '20px',
      transition: 'all 0.3s ease',
      minWidth: '120px'
    };

    const dataItemStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '12px 0',
      borderBottom: '1px solid #e0e0e0'
    };

    const labelStyle = {
      color: '#333',
      fontWeight: '600',
      minWidth: '150px',
      fontSize: '14px'
    };

    const valueStyle = {
      color: '#666',
      textAlign: 'right',
      flex: 1,
      marginLeft: '15px',
      fontSize: '14px',
      wordBreak: 'break-word'
    };
    
    if (loading) {
      return (
        <div style={{
          ...containerStyle,
          borderLeft: '5px solid #2196F3',
          backgroundColor: '#f8f9ff',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #2196F3',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Processing Authentication...</h2>
          <p style={{ color: '#666' }}>Please wait while we verify your Singpass credentials.</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div style={{
          ...containerStyle,
          borderLeft: '5px solid #f44336',
          backgroundColor: '#fff5f5'
        }}>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Authentication Failed</h2>
          <p style={{ color: '#666' }}>There was an error during the authentication process.</p>
          {errorMessage && (
            <div style={{
              backgroundColor: '#ffebee',
              border: '1px solid #ffcdd2',
              borderRadius: '4px',
              padding: '12px',
              margin: '15px 0',
              color: '#c62828'
            }}>
              {errorMessage}
            </div>
          )}
          <button 
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#45a049';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4CAF50';
              e.target.style.transform = 'translateY(0)';
            }}
            onClick={() => this.handleNavigation("/singpass")}
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (success && data) {
      // Extract clean UUID if needed
      const cleanUUID = typeof data.uuid === 'string' && data.uuid.startsWith('u=')
        ? data.uuid.substring(2)
        : data.uuid;
        
      return (
        <div style={{
          ...containerStyle,
          borderLeft: '5px solid #4CAF50',
          backgroundColor: '#f8fff8'
        }}>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Authentication Successful!</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>You have successfully logged in with Singpass.</p>
          
          <div style={{
            margin: '20px 0',
            padding: '25px',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ 
              color: '#333', 
              marginBottom: '20px',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              User Information
            </h3>
            
            {/* Display UUID */}
            <div style={dataItemStyle}>
              <strong style={labelStyle}>UUID:</strong>
              <span style={{ 
                ...valueStyle,
                fontFamily: 'monospace',
                fontSize: '13px'
              }}>
                {cleanUUID}
              </span>
            </div>
            
            {/* Display UINFIN if available */}
            {data.uinfin && (
              <div style={dataItemStyle}>
                <strong style={labelStyle}>NRIC/FIN:</strong>
                <span style={valueStyle}>
                  {this.renderValue(data.uinfin)}
                </span>
              </div>
            )}
            
            {/* Display extracted user data */}
            {data.userData && (
              <div style={{ marginTop: '25px' }}>
                <h4 style={{
                  marginBottom: '15px',
                  color: '#333',
                  borderBottom: '2px solid #4CAF50',
                  paddingBottom: '8px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  Profile Details
                </h4>
                {Object.entries(data.userData)
                  .filter(([key, value]) => {
                    // Filter out empty values and duplicate sub
                    if (key === 'sub') return false;
                    // Show email field even if empty (will display "N/A")
                    if (key === 'email') return true;
                    return value;
                  })
                  .map(([key, value], index, array) => (
                    <div 
                      key={key} 
                      style={{
                        ...dataItemStyle,
                        borderBottom: index === array.length - 1 ? 'none' : '1px solid #e0e0e0'
                      }}
                    >
                      <strong style={labelStyle}>
                        {this.formatFieldName(key)}:
                      </strong>
                      <span style={valueStyle}>
                        {key === 'email' && (!value || value === '') 
                          ? 'N/A' 
                          : this.renderValue(value, key)
                        }
                      </span>
                    </div>
                  ))}
              </div>
            )}
            
            {/* Display normalized data for debugging */}
            {data.normalizedUserData && (
              <div style={{ marginTop: '25px' }}>
                <h4 style={{
                  marginBottom: '15px',
                  color: '#333',
                  borderBottom: '2px solid #4CAF50',
                  paddingBottom: '8px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  Normalized Data (For Form)
                </h4>
                {Object.entries(data.normalizedUserData)
                  .filter(([key, value]) => value !== '') // Only show non-empty values
                  .map(([key, value], index, array) => (
                    <div 
                      key={key} 
                      style={{
                        ...dataItemStyle,
                        borderBottom: index === array.length - 1 ? 'none' : '1px solid #e0e0e0'
                      }}
                    >
                      <strong style={labelStyle}>
                        {key}:
                      </strong>
                      <span style={valueStyle}>
                        {value || 'N/A'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
          
          <button 
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#45a049';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4CAF50';
              e.target.style.transform = 'translateY(0)';
            }}
            onClick={() => this.handleNavigation("/form", data.userData)}
          >
            Continue to Form
          </button>
        </div>
      );
    }
    
    return (
      <div style={containerStyle}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>Processing...</h2>
        <p style={{ color: '#666' }}>Redirecting...</p>
      </div>
    );
  }
}

export default MyInfoRedirectPage;