import React, { Component } from "react";
import axios from 'axios';
import '../../../css/sub/createAccount.css';
import Popup from '../popup/popupMessage';

class CreateAccountsSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
        roleOptions: ['Ops in-charge', 'NSA in-charge', 'Site in-charge', 'Finance', 'Social Workers', 'Fitness Trainers', 'Others'],
        filteredRoles: [],
        site: ""
    };
  }  

  componentDidMount = () =>
  {
    this.props.closePopup();
    document.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  handleClickOutside = (event) => {
    if (this.dropdownRef && !this.dropdownRef.contains(event.target)) {
      this.setState({ showDropdown: false });
    }
  };

  handleChange = (event) => {
    const { name, value } = event.target;
    this.setState({ [name]: value }, () => {
      // Validate on change
      this.validateField(name, value);
    });
  };

  validateField(name, value) {
    let { nameError, emailError, passwordError, roleError, siteError} = this.state;
    console.log(name);

    switch (name) {
        case 'name':
            nameError = value ? '' : 'Name is required.';
            break;
        case 'email':
                if (!value) {
                    emailError = 'Email is required.';
                } else if (!this.isValidEmail(value)) {
                    emailError = 'Email is invalid.';
                } else {
                    emailError = ''; // Clear the error if the email is valid
                }
            break;
        case 'password':
                    // Check if the role is valid
                    passwordError = value
                        ? '' 
                        : 'Password is required.';
            break;
        case 'role':
                // Check if the role is valid
                if (!value) {
                    roleError = 'Role is required.';
                } else if(value !== "Ops in-charge" && value !== "NSA in-charge" && value !== "Site in-charge" && value !== "Finance" && value !== "Others")
                {
                    roleError = 'Role must be Ops in-charge, NSA in-charge, Site in-charge, Finance or Others';
                }
                else {
                    roleError = ''; // Clear the error if the role is valid
                }
            break;  
        case 'site':
            if (this.state.role === "Site in-charge" && !value) {
                siteError = 'Site is required.';
            }
            else {
                siteError = ''; // Clear the error if the role is valid
            }
            break;     
        default:
            break;
    }

    this.setState({ nameError, emailError, passwordError, roleError });
}

  handleRoleInputChange = (event) => {
    const value = event.target.value;
    this.setState({ role: value, showDropdown: true });

    const filteredRoles = this.state.roleOptions.filter(role =>
      role.toLowerCase().includes(value.toLowerCase())
    );
    this.setState({ filteredRoles });
  };

  selectRole = (role) => {
    this.setState({ role, filteredRoles: [], showDropdown: false }, () => {
        // Validate the selected role after updating the state
        this.validateField('role', role);
    });
 };

  generateRandomPassword = () => {
    const length = 8; // Password length
    const lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
    const upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const specialChars = "!@#$%^&*()_+[]{}|;:,.<>?";

    // Ensure the password contains at least one character from each category
    const passwordArray = [
      lowerCaseChars[Math.floor(Math.random() * lowerCaseChars.length)],
      upperCaseChars[Math.floor(Math.random() * upperCaseChars.length)],
      digits[Math.floor(Math.random() * digits.length)],
      specialChars[Math.floor(Math.random() * specialChars.length)],
    ];

    // Fill the rest of the password length with random characters from all categories
    const allChars = lowerCaseChars + upperCaseChars + digits + specialChars;
    for (let i = passwordArray.length; i < length; i++) {
      passwordArray.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    // Shuffle the password array to make it more random
    const password = passwordArray.sort(() => Math.random() - 0.5).join('');
    this.setState({ password }, () => {
        // Validate the selected role after updating the state
        this.validateField('password', password);
    });
  }

  // Toggle password visibility
  togglePasswordVisibility = () => {
    this.setState((prevState) => ({
      passwordVisible: !prevState.passwordVisible,
    }));
  };

  showDropdownList = () =>
  {
    this.setState({filteredRoles: this.state.roleOptions, showDropdown: true });
  }

  clearForm = () =>
  {
    this.setState({name: '', email: '', password: '', role: ''});
  }

  isValidEmail = (email) => {
    // Regular expression for validating email format
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;
    return emailPattern.test(email);
  };

  handleSubmit = (event) => {
    event.preventDefault();
   const { name, email, password, role, site } = this.state;
  
    let valid = true;
    let nameError = '';
    let emailError = '';
    let passwordError = '';
    let roleError = '';
    let siteError = '';
  
    if (!name) {
      nameError = 'Name is required.';
      valid = false;
    }
  
    if (!email) {
      emailError = 'Email is required.';
      valid = false;
    }
    else if (!this.isValidEmail(email)) {
        emailError = 'Email is invalid';
        valid = false;
    }
  
    if (!password) {
      passwordError = 'Password is required.';
      valid = false;
    }
  
    if (!role) {
      roleError = 'Role is required.';
      valid = false;
    }
    else if(role !== "Ops in-charge" && role !== "NSA in-charge" && role !== "Site in-charge" && role !== "Finance" && role !== "Others")
    {
      roleError = 'Role must be Ops in-charge, NSA in-charge, Site in-charge, Finance or Others';
      valid = false;
    }

    if (role === "Site in-charge" && !site) 
    {
        siteError = 'Site is required.';
        valid = false;
    }
  
    if (!valid) 
    {
        this.setState({ nameError, emailError, passwordError, roleError, siteError });
    } 
    else 
    {
        this.setState({ nameError: '', emailError: '', passwordError: '', roleError: '', siteError });
        var accountDetails = {"name": name, "email": email, "password": password, "role": role, "site": site};
        axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3001" : "https://ecss-backend-node.azurewebsites.net"}/accountDetails`, { accountDetails, purpose: "create" })
        .then((response) => {
            if(response.data.message === 'New account with respectively access rights created successfully')
            {
                this.props.createAccountPopupMessage(true, response.data.message, response.data.message);
                this.setState({name: '', email: '', password: '', role: '', site: ''});
            }
        })
      .catch((error) => {
        console.error('Error submitting form:', error);
      });
    }
  };

  render() 
  {
    return (
            // Default layout for other types (like "message")
            <>
                <div className="new-account">
                    <div className="form-wrapper">
                    <h1>Create Account</h1>
                    <form onSubmit={this.handleSubmit}>
                        <div className="form-group">
                        <label htmlFor="name">Name:</label>
                        <input 
                            type="text" 
                            id="name" 
                            name="name" 
                            placeholder='Enter Name'
                            value={this.state.name} 
                            onChange={this.handleChange} 
                            autoComplete='off'
                        />
                        {this.state.nameError && <p className="error-message1">{this.state.nameError}</p>}
                        </div>
                        <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input 
                            type="text" 
                            id="email" 
                            name="email" 
                            placeholder='Enter Email'
                            value={this.state.email} 
                            onChange={this.handleChange} 
                            autoComplete='off' 
                        />
                        {this.state.emailError && <p className="error-message1">{this.state.emailError}</p>}
                        </div>
                        <div className="form-group1">
                            <label htmlFor="password">Password:</label>
                            <div className="password-group">
                                <div className="password-input-wrapper">
                                    <input 
                                        type={this.state.passwordVisible ? 'text' : 'password'} 
                                        id="password" 
                                        name="password" 
                                        value={this.state.password} 
                                        placeholder="Password" 
                                        className='passwordInput'
                                        disabled 
                                    />
                                    <i 
                                        className={`fas ${this.state.passwordVisible ? 'fa-eye-slash' : 'fa-eye'} password-icon`}
                                        onClick={this.togglePasswordVisibility} 
                                    ></i>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={this.generateRandomPassword}
                                    className="generate-password-button"
                                >
                                    Generate Password
                                </button>
                            </div>
                            {this.state.passwordError && <p className="error-message1">{this.state.passwordError}</p>}
                        </div>
                        <div className="form-group">
                        <label htmlFor="role">Role:</label>
                        <div className="role-input-wrapper" ref={(ref) => this.dropdownRef = ref}>
                            <input 
                            type="text" 
                            id="role" 
                            name="role" 
                            value={this.state.role} 
                            onChange={this.handleRoleInputChange} 
                            autoComplete='off'
                            placeholder="All roles"
                            onFocus={this.showDropdownList}
                            />
                            {this.state.showDropdown && this.state.filteredRoles.length > 0 && (
                            <ul className="role-dropdown">
                                {this.state.filteredRoles.map((role, index) => (
                                <li 
                                    key={index} 
                                    onClick={() => this.selectRole(role)}
                                >
                                    {role}
                                </li>
                                ))}
                            </ul>
                            )}
                        </div>
                        {this.state.roleError && <p className="error-message1">{this.state.roleError}</p>}
                        </div>
                        {this.state.role === "Site in-charge" && (
                            <div className="form-group">
                                <label>Ssite:</label>
                                <div className="radio-group">
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="site" 
                                            value="Tampines 253 Centre" 
                                            checked={this.state.site === "Tampines 253 Centre"}
                                            onChange={this.handleChange} 
                                        />
                                        Tampines 253 Centre
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="site" 
                                            value="CT Hub" 
                                            checked={this.state.site === "CT Hub"}
                                            onChange={this.handleChange} 
                                        />
                                        CT Hub
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="site" 
                                            value="Tampines North Community Centre" 
                                            checked={this.state.site === "Tampines North Community Centre"}
                                            onChange={this.handleChange} 
                                        />
                                        Tampines North Community Centre
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="site" 
                                            value="Pasir Ris West Wellness Centre" 
                                            checked={this.state.site === "Pasir Ris West Wellness Centre"}
                                            onChange={this.handleChange} 
                                        />
                                        Pasir Ris West Wellness Centre
                                    </label>
                                </div>
                            </div>
                        )}
                        {this.state.siteError && <p className="error-message1">{this.state.siteError}</p>}
                        <div className="button-container">
                          <button 
                              type="button" 
                              onClick={this.clearForm}
                              className="clear-form-button"
                              style={{padding: "10px", height: "2.5rem", fontSize: "15px"}}
                          >
                              Clear Form
                          </button>
                          <button 
                              type="submit" 
                              className="submit-form-button"
                              style={{padding: "10px", height: "2.5rem", fontSize: "15px"}}
                          >
                              Create Account
                          </button>
                      </div>
                    </form>
                </div>
            </div>
      </>
    );
  }
}

export default CreateAccountsSection;
