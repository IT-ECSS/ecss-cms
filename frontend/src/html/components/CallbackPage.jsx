import React, { Component } from "react";
import axios from 'axios';
import '../css/singpassCallback.css';

class CallbackPage extends Component {
  // Abort controller for fast cancellation
  abortController = new AbortController();

  componentDidMount() {
    // SAFETY: Always redirect within 3 seconds (even if something fails)
    const safetyTimeout = setTimeout(() => {
      console.warn('[SingPass] Safety timeout - forcing redirect to form');
      this.redirectToForm();
    }, 3000);

    // Start timeout for <1s response
    const timeout = setTimeout(() => {
      this.abortController.abort();
      clearTimeout(safetyTimeout); // Cancel safety timeout
      this.redirectToForm();
    }, 900); // 900ms timeout

    this.handleCallback().finally(() => {
      clearTimeout(timeout);
      clearTimeout(safetyTimeout);
    });
  }

  handleCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authorizationCode = urlParams.get('code');
      const returnedState = urlParams.get('state');
      const error = urlParams.get('error');

      console.log('[SingPass Callback] Received params:', {
        hasCode: !!authorizationCode,
        hasState: !!returnedState,
        hasError: !!error,
        error: error || 'none'
      });

      // Fail fast on errors
      if (error) {
        console.error('[SingPass] Error from SingPass:', error);
        this.redirectToForm();
        return;
      }

      if (!authorizationCode) {
        console.error('[SingPass] No authorization code received');
        this.redirectToForm();
        return;
      }

      // Validate state (CSRF check) - synchronous, no blocking
      const storedState = sessionStorage.getItem('singpass_state');
      if (returnedState !== storedState) {
        console.error('[SingPass] State mismatch - CSRF check failed', {
          received: returnedState,
          stored: storedState
        });
        this.redirectToForm();
        return;
      }

      console.log('[SingPass] CSRF check passed - exchanging code for token');
      // Start token exchange immediately (non-blocking)
      this.callBackendTokenExchange(authorizationCode, returnedState);

    } catch (error) {
      console.error('[SingPass] Exception in handleCallback:', error);
      this.redirectToForm();
    }
  };

  callBackendTokenExchange = async (authorizationCode, returnedState) => {
    try {
      const codeVerifier = sessionStorage.getItem('singpass_code_verifier');
      const nonce = sessionStorage.getItem('singpass_nonce');

      console.log('[SingPass] Starting token exchange with backend...', {
        codeLength: authorizationCode?.length,
        hasCodeVerifier: !!codeVerifier,
        hasNonce: !!nonce
      });

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

      console.log('[SingPass] Backend response:', {
        status: response.status,
        success: response.data?.success,
        hasData: !!response.data?.data
      });

      // Validate response quickly
      if (response.status !== 200 || !response.data?.success) {
        console.error('[SingPass] Token exchange failed:', response.data);
        this.redirectToForm();
        return;
      }

      const { data } = response.data;

      console.log('[SingPass] User data received, storing locally...');

      // Store all data in batch (parallel operations)
      this.batchStoreUserData(data);

      // Redirect immediately (don't wait for storage)
      console.log('[SingPass] Redirecting to form...');
      this.redirectToForm();

    } catch (error) {
      console.error('[SingPass] Token exchange error:', error.message);
      this.redirectToForm();
    }
  };

  batchStoreUserData = (data) => {
    try {
      const {
        uuid, access_token, token_type, expires_in, scope,
        name, uinfin, residentialstatus, race, sex, dob, mobileno, email, regadd
      } = data;

      // Store combined user data JSON (read by ParticipantForm on mount to auto-fill fields)
      const userDataJson = {
        uuid,
        name,
        uinfin,
        residentialstatus,
        race,
        sex,
        dob,
        mobileno,
        email,
        regadd,
        source: 'singpass',
      };

      // Must be synchronous — redirect happens immediately after this returns,
      // so requestIdleCallback would fire too late (after navigation).
      sessionStorage.setItem('singpass_user_data_json', JSON.stringify(userDataJson));
      sessionStorage.setItem('singpass_access_token', access_token || '');
      sessionStorage.setItem('singpass_token_type', token_type || 'Bearer');
      sessionStorage.setItem('singpass_user_uuid', uuid || '');
      sessionStorage.setItem('singpass_user_name', name || '');
      sessionStorage.setItem('singpass_user_uinfin', uinfin || '');
      sessionStorage.setItem('singpass_user_residentialstatus', residentialstatus || '');
      sessionStorage.setItem('singpass_user_race', race || '');
      sessionStorage.setItem('singpass_user_sex', sex || '');
      sessionStorage.setItem('singpass_user_dob', dob || '');
      sessionStorage.setItem('singpass_user_mobileno', mobileno || '');
      sessionStorage.setItem('singpass_user_email', email || '');
      sessionStorage.setItem('singpass_user_regadd', regadd ? JSON.stringify(regadd) : '');
      sessionStorage.setItem('singpass_scope', scope || '');
      if (expires_in) {
        sessionStorage.setItem('singpass_token_expires', (Date.now() + expires_in * 1000).toString());
      }

      console.log('[SingPass] All user data stored in sessionStorage');
    } catch (error) {
      console.error('[SingPass] Error storing user data:', error);
    }
  };

  redirectToForm = () => {
    try {
      const baseUrl = 'https://salmon-wave-09f02b100.6.azurestaticapps.net';

      // Check if this is an FFT SingPass flow:
      // SingPassButton saves the full path+query before redirect (e.g. /fft or /fft/form?event=...)
      const returnPath = sessionStorage.getItem('singpass_return_path');
      const fftReturnState = sessionStorage.getItem('fft_singpass_return_state');

      if ((returnPath && returnPath.startsWith('/fft')) || fftReturnState) {
        const fftPath = (returnPath && returnPath.startsWith('/fft')) ? returnPath : '/fft';
        console.log('[SingPass] FFT flow detected, redirecting to:', fftPath);
        window.location.href = `${baseUrl}${fftPath}`;
        return;
      }

      // Regular form flow — get the course link saved before redirect
      const courseLink = sessionStorage.getItem('courseLink');

      // Go directly to Personal Particulars section (section=1)
      let url = `${baseUrl}/form?section=1`;
      if (courseLink) {
        url += `&link=${encodeURIComponent(courseLink)}`;
        console.log('[SingPass] Preserving course link in redirect:', courseLink);
      }

      console.log('[SingPass] Redirecting directly to Personal Particulars (section 1):', url);
      window.location.href = url;
    } catch (error) {
      console.error('[SingPass] Redirect error:', error);
      window.location.href = 'https://salmon-wave-09f02b100.6.azurestaticapps.net/form?section=1';
    }
  };

  render() {
    // No loading page - redirect happens immediately in componentDidMount
    // If user sees this, redirect failed. Show error and redirect after 2s
    return (
      <div className="singpass-callback-container error">
        <h2 className="singpass-callback-title">Authentication Complete</h2>
        <p className="singpass-callback-message">
          Redirecting to form...
        </p>
      </div>
    );
  }
}

export default CallbackPage;