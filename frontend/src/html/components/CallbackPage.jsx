import React, { Component } from "react";
import axios from 'axios';

class CallbackPage extends Component {
  componentDidMount() {
    this.handleCallback();
  }

  handleCallback = async () => {
    try {
      // Parse URL parameters from the callback
      const urlParams = new URLSearchParams(window.location.search);
      const authorizationCode = urlParams.get('code');
      const returnedState = urlParams.get('state');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // Check for authorization errors
      if (error) {
        console.error(`Singpass authorization error: ${error} - ${errorDescription}`);
      //  window.location.href = '/?error=' + encodeURIComponent(error);
        return;
      }

      if (!authorizationCode) {
        console.error('No authorization code received from Singpass');
      //  window.location.href = '/?error=no_code';
        return;
      }

      // Retrieve stored parameters for validation
      const storedState = sessionStorage.getItem('singpass_state');
      const storedNonce = sessionStorage.getItem('singpass_nonce');
      const storedCodeVerifier = sessionStorage.getItem('singpass_code_verifier');

      // Validate state parameter (CSRF protection)
      if (returnedState !== storedState) {
        console.error('State parameter mismatch - possible CSRF attack');
        //window.location.href = '/?error=state_mismatch';
        return;
      }

      // Call backend API to handle Singpass token exchange
      await this.callBackendTokenExchange(authorizationCode, storedCodeVerifier, storedNonce, returnedState);

    } catch (error) {
      console.error('Callback handling error:', error);
      //window.location.href = '/?error=' + encodeURIComponent(error.message);
    }
  };

  callBackendTokenExchange = async (authorizationCode, codeVerifier, nonce, returnedState) => {
    try {
      const backendUrl = 'https://ecss-backend-node.azurewebsites.net/singpass/token';  // Azure SWA API proxy
      //const backendUrl = 'http://localhost:3001/singpass/token'
      console.log('Exchanging tokens via backend...');
      console.log('Backend URL:', backendUrl);
      console.log('Request data:', {
        code: 'REDACTED',
        code_verifier: 'REDACTED',
        state: returnedState,
        nonce: nonce ? 'PRESENT' : 'MISSING'
      });

      const href = window.location.href;
      // Prepare request data for your backend API
      const requestData = {
        code: authorizationCode,
        code_verifier: codeVerifier,
        state: returnedState,
        nonce: nonce,
        href
      };

      

      // Call your backend API endpoint that handles SingPass token exchange
      const response = await axios.post(backendUrl, requestData,  {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000,
        validateStatus: function (status) {
          // Don't throw for any status code less than 600
          return status < 600;
        }
      });

      console.log('Backend response status:', response.status);
      console.log('Backend response data:', response.data);

      // Handle different response statuses
      if (response.status >= 400) {
        let errorMessage = `Backend error (${response.status})`;
        
        if (response.data) {
          if (response.data.error_description) {
            errorMessage = response.data.error_description;
          } else if (response.data.message) {
            errorMessage = response.data.message;
          } else if (response.data.error) {
            errorMessage = response.data.error;
          } else if (typeof response.data === 'string') {
            errorMessage = response.data;
          }
        }
        
        console.error('Backend API error:', {
          status: response.status,
          data: response.data,
          message: errorMessage
        });
        
        throw new Error(errorMessage);
      }

      // Check if backend processing was successful
      if (!response.data || !response.data.success) {
        const errorMsg = response.data?.error_description || response.data?.error || 'Backend authentication failed';
        console.error('Backend authentication failed:', response.data);
        throw new Error(errorMsg);
      }

      const { data } = response.data;
      
      // Log what we received from backend
      console.log('Backend response data keys:', Object.keys(data));
      console.log('User profile available:', !!data.userProfile);
      console.log('Individual fields available:', {
        name: !!data.name,
        uinfin: !!data.uinfin,
        residentialstatus: !!data.residentialstatus,
        race: !!data.race,
        sex: !!data.sex,
        dob: !!data.dob,
        mobileno: !!data.mobileno,
        email: !!data.email,
        regadd: !!data.regadd
      });

      const { 
        uuid, 
        access_token, 
        userProfile, 
        token_type, 
        expires_in, 
        scope, 
        scopeArray, 
        refresh_token,
        id_token,
        // Extract individual fields
        name,
        uinfin,
        residentialstatus,
        race,
        sex,
        dob,
        mobileno,
        email,
        regadd,
        endpointUsed
      } = data;

      console.log('Singpass authentication completed via:', endpointUsed);
      console.log('Storing user data...');

      // Store authentication data securely
      if (access_token) {
        sessionStorage.setItem('singpass_access_token', access_token);
        sessionStorage.setItem('singpass_token_type', token_type || 'Bearer');
        
        if (expires_in) {
          const expirationTime = Date.now() + (expires_in * 1000);
          sessionStorage.setItem('singpass_token_expires', expirationTime.toString());
        }
      }
      
      // Store endpoint information for debugging
      if (endpointUsed) {
        sessionStorage.setItem('singpass_endpoint_used', endpointUsed);
      }
      
      // Store scope information
      if (scope) {
        sessionStorage.setItem('singpass_scope', scope);
      }
      if (scopeArray && scopeArray.length > 0) {
        sessionStorage.setItem('singpass_scope_array', JSON.stringify(scopeArray));
      }
      
      // Store other token data
      if (refresh_token) {
        sessionStorage.setItem('singpass_refresh_token', refresh_token);
      }
      if (id_token) {
        sessionStorage.setItem('singpass_id_token', id_token);
      }
      
      sessionStorage.setItem('singpass_user_uuid', uuid);
      
      if (userProfile) {
        sessionStorage.setItem('singpass_user_profile', JSON.stringify(userProfile));
      }
      
      // Store individual user profile fields for easy access
      if (name) sessionStorage.setItem('singpass_user_name', name);
      if (uinfin) sessionStorage.setItem('singpass_user_uinfin', uinfin);
      if (residentialstatus) sessionStorage.setItem('singpass_user_residentialstatus', residentialstatus);
      if (race) sessionStorage.setItem('singpass_user_race', race);
      if (sex) sessionStorage.setItem('singpass_user_sex', sex);
      if (dob) sessionStorage.setItem('singpass_user_dob', dob);
      if (mobileno) sessionStorage.setItem('singpass_user_mobileno', mobileno);
      if (email) sessionStorage.setItem('singpass_user_email', email);
      if (regadd) sessionStorage.setItem('singpass_user_regadd', JSON.stringify(regadd));
      
      // Store consolidated user data as JSON with error handling
      const userData = {
        name: name || null,
        uinfin: uinfin || null,
        residentialstatus: residentialstatus || null,
        race: race || null,
        sex: sex || null,
        dob: dob || null,
        mobileno: mobileno || null,
        email: email || null,
        regadd: regadd || null,
        hasRegadd: !!regadd,
        timestamp: Date.now(),
        source: 'singpass',
        endpointUsed: endpointUsed || 'unknown'
      };
      
      // Store as JSON in sessionStorage with error handling
      try {
        sessionStorage.setItem('singpass_user_data_json', JSON.stringify(userData));
        console.log('User data successfully stored as JSON');
      } catch (stringifyError) {
        console.error('JSON.stringify failed, using fallback approach:', stringifyError);
        
        // Fallback: Store a cleaned version without potentially problematic data
        const cleanUserData = {
          name: typeof name === 'string' ? name : String(name || ''),
          uinfin: typeof uinfin === 'string' ? uinfin : String(uinfin || ''),
          residentialstatus: typeof residentialstatus === 'string' ? residentialstatus : String(residentialstatus || ''),
          race: typeof race === 'string' ? race : String(race || ''),
          sex: typeof sex === 'string' ? sex : String(sex || ''),
          dob: typeof dob === 'string' ? dob : String(dob || ''),
          mobileno: typeof mobileno === 'string' ? mobileno : String(mobileno || ''),
          email: typeof email === 'string' ? email : String(email || ''),
          regadd: regadd ? (typeof regadd === 'string' ? regadd : JSON.stringify(regadd).substring(0, 500)) : null,
          hasRegadd: !!regadd,
          timestamp: Date.now(),
          source: 'singpass',
          endpointUsed: endpointUsed || 'unknown'
        };
        
        try {
          sessionStorage.setItem('singpass_user_data_json', JSON.stringify(cleanUserData));
          console.log('Cleaned user data stored successfully');
        } catch (fallbackError) {
          console.error('Even fallback JSON storage failed:', fallbackError);
          // Store individual fields as strings instead
          Object.keys(cleanUserData).forEach(key => {
            sessionStorage.setItem(`singpass_user_data_${key}`, String(cleanUserData[key] || ''));
          });
          console.log('Stored user data as individual string fields');
        }
      }

      // Get the stored redirect link
      const redirectLink = sessionStorage.getItem('courseLink');
      console.log('Redirect link from sessionStorage:', redirectLink);
      
      // Clear PKCE parameters (no longer needed)
      sessionStorage.removeItem('singpass_state');
      sessionStorage.removeItem('singpass_nonce');
      sessionStorage.removeItem('singpass_code_verifier');
      
      // Build redirect URL with link parameter
      let redirectUrl = '/form';
      
      if (redirectLink) {
        // Add the link as a query parameter to the form URL
        const formParams = new URLSearchParams();
        formParams.set('link', redirectLink);
        redirectUrl = `/form?${formParams.toString()}`;
        console.log('Redirecting to form with link parameter:', redirectUrl);
      } else {
        console.log('Redirecting to form without link parameter');
      }

      console.log('Final user data summary:', {
        name: !!name, 
        uinfin: !!uinfin, 
        residentialstatus: !!residentialstatus, 
        race: !!race, 
        sex: !!sex, 
        dob: !!dob, 
        mobileno: !!mobileno, 
        email: !!email, 
        regadd: !!regadd,
        endpointUsed
      });

      // Redirect to form page with or without the link parameter
      window.location.href = redirectUrl;

    } catch (error) {
      console.error('Backend Singpass API error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // More descriptive error message
      let errorMessage = error.message;
      if (error.response?.status === 500) {
        errorMessage = `Server error (500): ${error.message}. Check backend logs for details.`;
      }
      
      //window.location.href = '/?error=' + encodeURIComponent(errorMessage);
    }
  };

  render() {
    return (
      <div style={{
        maxWidth: '400px',
        margin: '50px auto',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontFamily: '"Poppins", "Segoe UI", sans-serif',
        textAlign: 'center',
        backgroundColor: 'white'
      }}>
        <style>
          {`
            @font-face {
              font-family: 'Poppins';
              src: url('/Noto_Sans,Poppins/Poppins/Poppins-Bold.ttf') format('truetype');
              font-weight: bold;
              font-style: normal;
              font-display: swap;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>

        <h2 style={{ color: '#333', marginBottom: '20px', fontFamily: 'Poppins, sans-serif' }}>
          Processing Singpass Authentication...
        </h2>
        
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #F4333D',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }}></div>
        
        <p style={{ color: '#666', fontFamily: 'Poppins, sans-serif' }}>
          Please wait while we process your authentication...
        </p>
      </div>
    );
  }
}

export default CallbackPage;