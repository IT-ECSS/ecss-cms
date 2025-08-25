import React, { Component } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import LoginPage from './html/components/loginPage';
import NewCustomersPage from './html/components/newCustomers';
import HomePage from './html/components/homePage';
import FormPage from './html/components/formPage';
import MassImportPage from './html/components/massImportPage';
import CourseSelectionPage from './html/components/courseSelectionPage';
import SingpassPage from './html/components/singpassPage';
import CallPagePage from './html/components/CallbackPage';
import MyInfoResultsPage from './html/components/MyInfoResultsPage';
import MyInfoErrorTest from './html/pages/MyInfoErrorTest'; // Import the test page
import '@fortawesome/fontawesome-free/css/all.min.css';
import { AuthProvider  } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import ErrorPage from './html/components/errorPage';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './utils/authConfig';

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
msalInstance.initialize().then(() => {
  console.log('✅ MSAL initialized successfully');
}).catch((error) => {
  console.error('❌ MSAL initialization failed:', error);
});


class App extends Component
{
  componentDidMount() {
    // Set CSS custom property for accurate viewport height
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial value
    setVH();

    // Update on resize and orientation change
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // Cleanup function
    this.cleanup = () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }

  componentWillUnmount() {
    if (this.cleanup) {
      this.cleanup();
    }
  }

  render() 
  {
    return (
      <AuthProvider>  
      <Router>
        <Switch>
          <Route exact path="/" component={LoginPage} />
          <ProtectedRoute path="/home" component={HomePage} />
          <Route path="/form" component={FormPage} />
          <Route path="/new" component={NewCustomersPage} />
          <Route path="/mass" component={MassImportPage} />
          <Route path="/coursesSelection" component={CourseSelectionPage}/>
          <Route exact path="/singpass" component={SingpassPage} />
          <Route path="/callback" component={CallPagePage} />
          <Route path="/myinfo-results" component={MyInfoResultsPage} />
          <Route path="/myinfo-error-test" component={MyInfoErrorTest} />
          <Route component={ErrorPage} />
        </Switch>
      </Router>
      </AuthProvider>
    );
  }
}

export default App;
