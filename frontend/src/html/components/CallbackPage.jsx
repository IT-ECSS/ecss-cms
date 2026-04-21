import React, { Component } from "react";
import axios from 'axios';
import '../css/singpassCallback.css';

class CallbackPage extends Component {
  // Abort controller for fast cancellation
  abortController = new AbortController();

  componentDidMount() {
    // Start timeout for <1s response
    const timeout = setTimeout(() => {
      this.abortController.abort();
      this.redirectToForm();
    }, 900); // 900ms timeout

    this.handleCallback().finally(() => clearTimeout(timeout));
  }

  handleCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authorizationCode = urlParams.get('code');
      const returnedState = urlParams.get('state');
      const error = urlParams.get('error');

      // Fail fast on errors
      if (error || !authorizationCode) {
        this.redirectToForm();
        return;
      }

      // Validate state (CSRF check) - synchronous, no blocking
      if (returnedState !== sessionStorage.getItem('singpass_state')) {
        this.redirectToForm();
        return;
      }

      // Start token exchange immediately (non-blocking)
      this.callBackendTokenExchange(authorizationCode, returnedState);

    } catch (error) {
      this.redirectToForm();
    }
  };

  callBackendTokenExchange = async (authorizationCode, returnedState) => {
    try {
      const codeVerifier = sessionStorage.getItem('singpass_code_verifier');
      const nonce = sessionStorage.getItem('singpass_nonce');

      // Fast request with minimal timeout
      const response = await axios.post(
        'https://ecss-backend-node.azurewebsites.net/singpass/token',
        {
          code: authorizationCode,
          code_verifier: codeVerifier,
          state: returnedState,
          nonce: nonce,
          href: window.location.href
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000, // 8 second max
          validateStatus: () => true
        }
      );

      // Validate response quickly
      if (response.status !== 200 || !response.data?.success) {
        this.redirectToForm();
        return;
      }

      const { data } = response.data;

      // Store all data in batch (parallel operations)
      this.batchStoreUserData(data);

      // Redirect immediately (don't wait for storage)
      this.redirectToForm();

    } catch (error) {
      this.redirectToForm();
    }
  };

  batchStoreUserData = (data) => {
    try {
      // Batch all storage operations for speed
      const {
        uuid, access_token, token_type, expires_in, scope,
        name, uinfin, residentialstatus, race, sex, dob, mobileno, email, regadd
      } = data;

      // Store in chunks to avoid blocking
      const batch1 = {
        'singpass_access_token': access_token || '',
        'singpass_token_type': token_type || 'Bearer',
        'singpass_user_uuid': uuid || '',
        'singpass_user_name': name || '',
        'singpass_user_uinfin': uinfin || ''
      };

      const batch2 = {
        'singpass_user_residentialstatus': residentialstatus || '',
        'singpass_user_race': race || '',
        'singpass_user_sex': sex || '',
        'singpass_user_dob': dob || '',
        'singpass_user_mobileno': mobileno || ''
      };

      const batch3 = {
        'singpass_user_email': email || '',
        'singpass_user_regadd': regadd ? JSON.stringify(regadd) : '',
        'singpass_scope': scope || ''
      };

      // Async storage in background (don't wait)
      requestIdleCallback(() => {
        Object.entries(batch1).forEach(([k, v]) => sessionStorage.setItem(k, v));
        Object.entries(batch2).forEach(([k, v]) => sessionStorage.setItem(k, v));
        Object.entries(batch3).forEach(([k, v]) => sessionStorage.setItem(k, v));

        if (expires_in) {
          sessionStorage.setItem(
            'singpass_token_expires',
            (Date.now() + expires_in * 1000).toString()
          );
        }
      }, { timeout: 5000 });

    } catch (error) {
      // Silently fail - redirect already happened
    }
  };

  redirectToForm = () => {
    try {
      const redirectLink = sessionStorage.getItem('singpass_return_path');
      const baseUrl = 'https://salmon-wave-09f02b100.6.azurestaticapps.net';
      const url = redirectLink ? `${baseUrl}${redirectLink}` : `${baseUrl}/form`;
      
      // Instant redirect
      window.location.href = url;
    } catch (error) {
      window.location.href = 'https://salmon-wave-09f02b100.6.azurestaticapps.net/form';
    }
  };

  render() {
    return (
      <div className="singpass-callback-container">
        <h2 className="singpass-callback-title">
          Processing Singpass Authentication<span className="singpass-loading-dots">...</span>
        </h2>
        
        <div className="singpass-spinner" aria-hidden="true"></div>
        
        <p className="singpass-callback-message">
          Please wait while we process your authentication...
        </p>
      </div>
    );
  }
}

export default CallbackPage;