import React, { Component } from "react";
import axios from 'axios';
import '../css/singpassPage.css';  

class SingpassPage extends Component {
  generateCodeVerifier = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(128);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < 128; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result.substring(0, 128);
  };

  generateCodeChallenge = async (codeVerifier) => {
    const hash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  decodeUrlSafely = (encodedUrl) => {
    if (!encodedUrl) return null;
    try {
      let decoded = encodedUrl;
      let previousDecoded = '';
      let attempts = 0;
      const maxAttempts = 5;
      while (decoded !== previousDecoded && attempts < maxAttempts) {
        previousDecoded = decoded;
        try {
          if (decoded.includes('%')) {
            const testDecoded = decodeURIComponent(decoded);
            if (testDecoded !== decoded && !testDecoded.includes('%')) {
              decoded = testDecoded;
            } else if (testDecoded !== decoded) {
              decoded = testDecoded;
            } else {
              break;
            }
          } else {
            break;
          }
          attempts++;
        } catch (innerError) {
          break;
        }
      }
      return decoded;
    } catch (error) {
      return encodedUrl;
    }
  };

  handleLogin = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let redirectLink = urlParams.get('link');
      if (redirectLink) {
        var decodedLink = this.decodeUrlSafely(redirectLink);
        //redirectLink = `http://localhost:3000/form`;
        if (decodedLink && decodedLink.includes('/fft')) {
          redirectLink = `https://salmon-wave-09f02b100.6.azurestaticapps.net/fft?section=participants`;
          sessionStorage.setItem('singpass_return_path', '/fft?section=participants');
        } else {
          redirectLink = `https://salmon-wave-09f02b100.6.azurestaticapps.net/form`;
          sessionStorage.setItem('singpass_return_path', '/form');
        }
      }
     /* if (redirectLink) {
        sessionStorage.setItem('course_link', decodedLink);
        const azureMetadata = {
          environment: "development",
          hostname: "localhost",
          originalParam: urlParams.get('link'),
          processedLink: redirectLink,
          timestamp: new Date().toISOString()
        };
        sessionStorage.setItem('azure_swa_environment_info', JSON.stringify(azureMetadata));
      }*/
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = window.crypto.randomUUID();
      const nonce = window.crypto.randomUUID();
      // Store PKCE parameters for token exchange
      sessionStorage.setItem('singpass_state', state);
      sessionStorage.setItem('singpass_nonce', nonce);
      sessionStorage.setItem('singpass_code_verifier', codeVerifier);

      // FAPI 2.0: Use Pushed Authorization Request (PAR)
      //const backendParUrl = "http://localhost:3001/singpass/par";
      const backendParUrl = "https://ecss-backend-node.azurewebsites.net/singpass/par";
      
      const parResponse = await axios.post(backendParUrl, {
        scope: "openid dob email mobileno name race regadd residentialstatus sex uinfin",
        //redirect_uri: "http://localhost:3000/callback",
        redirect_uri: "https://salmon-wave-09f02b100.6.azurestaticapps.net/callback",
        state: state,
        nonce: nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });
      
      if (!parResponse.data || !parResponse.data.request_uri) {
        throw new Error('PAR request failed: No request_uri received');
      }
      
      const { request_uri, authorization_endpoint } = parResponse.data;
      const authEndpoint = authorization_endpoint || "https://id.singpass.gov.sg/fapi/auth";
      const authorizationUrl = `${authEndpoint}?client_id=ZrjDybXZeOFUA70KYMwb1dnfmdEXFfAS&request_uri=${encodeURIComponent(request_uri)}`;
      
      this.setState({ redirecting: true });
      window.location.href = authorizationUrl;
    } catch (error) {
      this.setState({ 
        error: 'Failed to initiate SingPass authentication. Please try again.',
        redirecting: false 
      });
    }
  };

  constructor(props) {
    super(props);
    this.state = {
      redirecting: false,
      error: null,
      redirectLink: null
    };
  }

  componentDidMount() {
    const urlParams = new URLSearchParams(window.location.search);
    let redirectLink = urlParams.get('link');
    if (redirectLink) {
      redirectLink = this.decodeUrlSafely(redirectLink);
      this.setState({ redirectLink: redirectLink });
    }
  }

  formatDisplayUrl = (url) => {
    if (!url) return '';
    try {
      if (url.includes('ecss.org.sg/product/')) {
        const productPath = url.split('/product/')[1];
        if (productPath) {
          const chineseMatch = productPath.match(/[\u4e00-\u9fff]+/g);
          if (chineseMatch && chineseMatch.length > 0) {
            const chineseText = chineseMatch.join('');
            return `ECSS: ${chineseText}...`;
          }
          const parts = productPath.split('-');
          const meaningfulPart = parts.find(part => part.length > 5 && !part.includes('%'));
          if (meaningfulPart) {
            return `ECSS: ${meaningfulPart}...`;
          }
        }
      }
      return url.length > 60 ? url.substring(0, 60) + '...' : url;
    } catch (error) {
      return url.length > 60 ? url.substring(0, 60) + '...' : url;
    }
  };

  render() {
    const { redirecting, error, redirectLink } = this.state;
    
    return (
      <div className="singpass-page-container">
        {error && (
          <div className="singpass-error-alert" role="alert">
            {error}
          </div>
        )}

        {redirectLink && (
          <div className="singpass-redirect-alert">
            <p className="singpass-redirect-label">
              Authentication Required
            </p>
            <div className="singpass-redirect-url">
              <strong>Destination:</strong><br />
              {this.formatDisplayUrl(redirectLink)}
            </div>
            <p className="singpass-redirect-notice">
              You will be redirected after successful login
            </p>
          </div>
        )}
        
        <div>
          <h2 className="singpass-page-title">
            SingPass Authentication
          </h2>
          <button 
            onClick={this.handleLogin}
            disabled={redirecting}
            aria-label="Log in with Sing Pass authentication"
            aria-describedby="singpass-description"
            className="singpass-login-button"
          >
            <span className="singpass-button-text" aria-hidden="true">
              {redirecting ? 'Redirecting...' : 'Log in with'}
            </span>
            {!redirecting && (
              <img 
                src="/Singpass logo/singpass_logo_white.svg" 
                alt="Sing Pass" 
                aria-label="Sing Pass"
                role="img"
                className="singpass-logo"
                onError={(e) => {
                  e.target.src = "/Singpass logo/singpass_logo_white.png";
                  e.target.onerror = null;
                }}
              />
            )}
          </button>
          <p 
            id="singpass-description"
            className="singpass-description"
          >
            Secure authentication using your SingPass Digital ID
          </p>
        </div>
      </div>
    );
  }
}

export default SingpassPage;