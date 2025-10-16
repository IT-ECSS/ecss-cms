import React, { Component } from "react";
import axios from 'axios';  

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
        redirectLink = `https://salmon-wave-09f02b100.6.azurestaticapps.net/form`;
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
      //const authorizationEndpoint = "https://stg-id.singpass.gov.sg/auth";
      const authorizationEndpoint = "https://id.singpass.gov.sg/auth";
      const authParams = new URLSearchParams({
        //client_id: "mHlUcRS43LOQAjkYJ22MNvSpE8vzPmfo",
        client_id: "ZrjDybXZeOFUA70KYMwb1dnfmdEXFfAS",
        response_type: "code",
        scope: "openid dob email mobileno name race regadd residentialstatus sex uinfin",
        //redirect_uri: "http://localhost:3000/callback",
        redirect_uri: "https://salmon-wave-09f02b100.6.azurestaticapps.net/callback",
        state: state,
        nonce: nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        response_mode: "query",
        prompt: "login",
        acr_values: "2"
      });
      sessionStorage.setItem('singpass_state', state);
      sessionStorage.setItem('singpass_nonce', nonce);
      sessionStorage.setItem('singpass_code_verifier', codeVerifier);
      const authorizationUrl = `${authorizationEndpoint}?${authParams.toString()}`;
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
      <div style={{
        maxWidth: '400px',
        margin: '50px auto',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
            }
            @font-face {
              font-family: 'Poppins';
              src: url('/Noto_Sans,Poppins/Poppins/Poppins-Regular.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
            }
            @font-face {
              font-family: 'Noto Sans CJK';
              src: url('/Noto_Sans,Poppins/Noto_Sans/NotoSansCJK-Regular.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
              unicode-range: U+4E00-9FFF, U+3400-4DBF, U+20000-2A6DF, U+2A700-2B73F, U+2B740-2B81F, U+2B820-2CEAF, U+2CEB0-2EBEF, U+30000-3134F;
            }
            @font-face {
              font-family: 'Noto Sans CJK';
              src: url('/Noto_Sans,Poppins/Noto_Sans/NotoSansCJK-Bold.ttf') format('truetype');
              font-weight: bold;
              font-style: normal;
              font-display: swap;
              unicode-range: U+4E00-9FFF, U+3400-4DBF, U+20000-2A6DF, U+2A700-2B73F, U+2B740-2B81F, U+2B820-2CEAF, U+2CEB0-2EBEF, U+30000-3134F;
            }
          `}
        </style>

        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            borderRadius: '4px',
            padding: '12px',
            margin: '0 0 20px 0',
            color: '#c62828',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {redirectLink && (
          <div style={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #bbdefb',
            borderRadius: '4px',
            padding: '12px',
            margin: '0 0 20px 0',
            color: '#1565c0',
            fontSize: '14px'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
              Authentication Required
            </p>
            <p style={{ 
              margin: '0 0 8px 0', 
              fontSize: '12px',
              fontFamily: '"Noto Sans CJK", "Poppins", sans-serif',
              wordBreak: 'break-word',
              lineHeight: '1.4',
              textAlign: 'left',
              padding: '4px 8px',
              backgroundColor: 'rgba(255,255,255,0.7)',
              borderRadius: '3px',
              border: '1px solid rgba(25, 101, 192, 0.2)'
            }}>
              <strong>Destination:</strong><br />
              {this.formatDisplayUrl(redirectLink)}
            </p>
            <p style={{ margin: 0, fontSize: '12px' }}>
              You will be redirected after successful login
            </p>
          </div>
        )}
        
        <div>
          <h2 style={{ 
            color: '#333', 
            marginBottom: '30px',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: '600'
          }}>
            SingPass Authentication
          </h2>
          <button 
            onClick={this.handleLogin}
            disabled={redirecting}
            aria-label="Log in with Sing Pass authentication"
            aria-describedby="singpass-description"
            style={{
              backgroundColor: redirecting ? '#cccccc' : '#F4333D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: redirecting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 'bold',
              minWidth: '280px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0 24px',
              margin: '0 auto',
              transition: 'background-color 0.2s ease',
              letterSpacing: '0.025em',
              textRendering: 'optimizeLegibility'
            }}
            onMouseEnter={(e) => {
              if (!redirecting) {
                e.target.style.backgroundColor = '#B0262D';
              }
            }}
            onMouseLeave={(e) => {
              if (!redirecting) {
                e.target.style.backgroundColor = '#F4333D';
              }
            }}
          >
            <span aria-hidden="true" style={{
              fontFamily: 'Poppins, bold, sans-serif',
              fontSize: '16px',
              fontWeight: 'bold',
              lineHeight: '1'
            }}>
              {redirecting ? 'Redirecting...' : 'Log in with'}
            </span>
            {!redirecting && (
              <img 
                src="/Singpass logo/singpass_logo_white.svg" 
                alt="Sing Pass" 
                aria-label="Sing Pass"
                role="img"
                style={{ 
                  fontSize: '1ex',
                  height: '1ex',
                  width: 'auto',
                  minHeight: '14px',
                  filter: 'brightness(0) invert(1)',
                  verticalAlign: 'baseline',
                  display: 'inline-block',
                }}
                onError={(e) => {
                  e.target.src = "/Singpass logo/singpass_logo_white.png";
                  e.target.onerror = null;
                }}
              />
            )}
          </button>
          <p 
            id="singpass-description"
            style={{ 
              marginTop: '20px', 
              fontSize: '12px', 
              color: '#888',
              lineHeight: '1.4',
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            Secure authentication using your SingPass Digital ID
          </p>
        </div>
      </div>
    );
  }
}

export default SingpassPage;