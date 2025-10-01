import React, { Component } from 'react';
import '../../css/loginPage.css';
import axios from 'axios';
import { withRouter } from 'react-router-dom';
import Popup from './popup/popupMessage';
import { AuthContext, withAuth } from '../../AuthContext';

class LoginPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      language: 'en',
      email: '',
      password: '',
      emailError: '',
      passwordError: '',
      showPassword: false, // State to toggle password visibility
      isPopupOpen: false,
      popupMessage: '',
      popupType: '', 
      accountId: null
    };
  }

  toggleLanguage = () => {
    this.setState((prevState) => {
      const newLanguage = prevState.language === 'en' ? 'zh' : 'en';

      // Re-validate email and password with the new language
      const emailError = this.validateEmail(prevState.email, newLanguage);
      const passwordError = this.validatePassword(prevState.password, newLanguage);

      return {
        language: newLanguage,
        emailError, // Set email error message in the new language
        passwordError, // Set password error message in the new language
      };
    });
  };

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  togglePasswordVisibility = () => {
    this.setState((prevState) => ({
      showPassword: !prevState.showPassword,
    }));
  };

  validateEmail = (email) => {
    if (!email) {
      return this.state.language === 'en'
        ? 'Email cannot be empty.'
        : '电子邮件不能为空。';
    }
    return '';
  };

  validatePassword = (password) => {
    if (!password) {
      return this.state.language === 'en'
        ? 'Password cannot be empty.'
        : '密码不能为空。';
    }
    return '';
  };
  
  handleSubmit = async (e) => {
    e.preventDefault();
    var { email, password } = this.state;
    const { auth } = this.props; // Access auth context here
    email = email.toLowerCase();

    const emailError = this.validateEmail(email);
    const passwordError = this.validatePassword(password);

    if (emailError || passwordError) {
      this.setState({ emailError, passwordError });
      return;
    }

    // Clear error messages
    this.setState({ emailError: '', passwordError: '' });

    try {
      // Replace with your API endpoint and payload
      /*const response = await axios.post(`${window.location.hostname === "localhost" ? 
                        "http://localhost:3001" : 
                        "https://ecss-backend-node.azurewebsites.net"}/login`, { email, password });*/

        const axiosInstance = axios.create({
          baseURL: window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : "https://ecss-backend-node.azurewebsites.net",
          timeout: 5000, // Set a reasonable timeout to avoid waiting too long
          headers: { 'Content-Type': 'application/json' },
        });

        const [loginResponse] = await axios.all([
          axiosInstance.post('/login', { email, password })
        ]);

      const response = loginResponse?.data?.message?.message;
      
      console.log("Login Response:", response);

      if (response === "Login successful")
      {
        // Set the authentication state
        auth.login(); // Call login from the context

        this.setState({
          isPopupOpen: true,
          popupMessage: loginResponse.data.message.message,
          popupType: "success-message",
        });

        //console.log(auth.logout());
        // Redirect or perform other actions...
        setTimeout(() => {
          this.setState({ isPopupOpen: false });
          if(loginResponse.data.message.details.first_time_log_in === "Yes")
            {
              this.setState({
                isPopupOpen: true,
                popupMessage: loginResponse.data.message.message,
                popupType: "change-password",
                accountId: loginResponse.data.message.details._id,
                name: loginResponse.data.message.details.name
              });
            }
            else
            {
              this.setState({
                isPopupOpen: false,
                popupMessage: "",
                popupType: "",
                accountId: "",
                name: ""
              });
              //console.log(response.data.message.details.site, response.data.message.details.role);
              // Handle site as array if it contains comma-separated values
              const siteData = loginResponse.data.message.details.site;
              const siteArray = siteData && siteData.includes(',') 
                ? siteData.split(',').map(site => site.trim()) 
                : siteData;
              this.props.history.push({ pathname: '/home', state: { accountId: loginResponse.data.message.details._id, name: loginResponse.data.message.details.name, role: loginResponse.data.message.details.role, siteIC: siteArray}}); 
            }
        }, 5000);
      } else {
        this.setState({
          isPopupOpen: true,
          popupMessage: "Login Failure",
          popupType: "error-message",
        });
         // Redirect or perform other actions...
         setTimeout(() => {
          this.setState({ isPopupOpen: false, name: '', password: '', role: ''});
      }, 5000);
      }
    } catch (error) {
      console.error('Login error details:', error);
      
      let errorMessage = "An error occurred. Please try again later.";
      
      if (error.response) {
        // Server responded with error status
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        
        if (error.response.status === 404) {
          errorMessage = "Login service not found. Please contact administrator.";
        } else if (error.response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (error.response.status === 401) {
          errorMessage = "Invalid credentials. Please check your email and password.";
        } else {
          errorMessage = `Server error (${error.response.status}). Please try again later.`;
        }
      } else if (error.request) {
        // Network error
        console.error('Network error:', error.request);
        errorMessage = "Cannot connect to server. Please check your internet connection.";
      } else {
        // Other error
        console.error('Error:', error.message);
        errorMessage = `Error: ${error.message}`;
      }
      
      this.setState({
        isPopupOpen: true,
        popupMessage: errorMessage,
        popupType: "error-message",
      });
      setTimeout(() => {
        this.setState({ isPopupOpen: false, name: '', password: '', role: ''});
    }, 5000);
    }
  };

  resetPassword = async() =>
  {
    this.setState({
      isPopupOpen: true,
      popupMessage: "",
      popupType: "forgot-password",
    });
  }


  passPopupMessage = (success, message) =>
  {
    //console.log(message);
    if(success === true)
    {
      this.setState({
        isPopupOpen: true,
        popupMessage: message,
        popupType: "success-message",
      });
      setTimeout(() => {
          this.setState({ isPopupOpen: false});
            this.props.history.push({ pathname: '/home', state: { accountId:  this.state.accountId, name: this.state.name}});  
      }, 5000);
    }
    else 
    {
      this.setState({
        isPopupOpen: true,
        popupMessage: message,
        popupType: "error-message",
      });
      setTimeout(() => {
        this.setState({ isPopupOpen: false, name: '', email: '', password: '', role: ''});
    }, 5000);
    }
  }
  
  componentDidMount()
  {
    localStorage.clear();
  }

  render() {
    const { language, emailError, passwordError, showPassword, isPopupOpen, popupMessage, popupType, accountId} = this.state;

    const title = (
      <>
        En Community Services Society
        <br />
        Company Management System
      </>
    );
    const loginText = 'Login';
    const copyrightText = (
      <>
        © 2024 En Community Service Society Company Management System.
        <br />
        All rights reserved.
      </>
    );

    return (
      <div class="container">
        <div class="header">
          <div class="language-toggle">
            <button onClick={this.toggleLanguage}>
              {language === 'en' ? '中文' : 'English'}
            </button>
          </div>
        </div>
        <div class="login-main-content">
          <div class="left-section">
            <div class="title-and-image">
              <img
                src="https://ecss.org.sg/wp-content/uploads/2023/07/En_logo_Final_Large_RGB.png"
                alt="Logo"
                class="title-image"
              />
              <h1 class="title">{title}</h1>
            </div>
            <h2>{loginText}</h2>
            <form class="login-form" onSubmit={this.handleSubmit}>
              <label htmlFor="email">
                {language === 'en' ? 'Email:' : '电子邮件：'}
              </label>
              <input
                type="text"
                id="email"
                name="email"
                className='emailInput'
                value={this.state.email}
                onChange={this.handleChange}
                placeholder={
                  language === 'en' ? 'Enter your email' : '请输入电子邮件...'
                }
              />
              {emailError && <small class="error-message1">{emailError}</small>}

              <label htmlFor="password">
              {language === 'en' ? 'Password:' : '密码：'}
            </label>
            <div className="password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={this.state.password}
                onChange={this.handleChange}
                placeholder={language === 'en' ? 'Enter your password' : '请输入密码...'}
              />
              <i
                className={`fa ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}
                onClick={this.togglePasswordVisibility}
              ></i>
            </div>
            {passwordError && <small class="error-message1">{passwordError}</small>}
            <a 
            style={{
              fontWeight: 'bold',
              color: 'blue',
              fontSize: '0.75em',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
            onClick={this.resetPassword}
          >
            Reset password
          </a>
              <button type="submit">
                {language === 'en' ? 'Login' : '登录'}
              </button>
            </form>
            <p class="copyright">{copyrightText}</p>
          </div>
          <div class="right-section">
            <div class="right-section-content">
              <img
                src="https://ecss.org.sg/wp-content/uploads/2024/09/Untitled_design-removebg-preview.png"
                alt="Description"
                class="description-image"
              />
            </div>
          </div>
        </div>
        <Popup isOpen={isPopupOpen} message={popupMessage} type={popupType} accountId={accountId} passPopupMessage={this.passPopupMessage}/>
      </div>
    );
  }
}

export default withAuth(LoginPage);
