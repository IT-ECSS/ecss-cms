const axios = require('axios');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// SSG API configuration
// ---------------------------------------------------------------------------
// UAT:  https://uat-api.ssg-wsg.sg
// PROD: https://api.ssg-wsg.sg
//
// Required .env variables:
//   SF_ENV             = uat | prod
//   SF_CLIENT_ID       = your SSG app client ID
//   SF_CLIENT_SECRET   = your SSG app client secret
//   SF_PRIVATE_KEY_PEM = RSA-2048 private key (PEM, newlines replaced with \n)
//                        Used to sign request bodies → X-Api-Signature header
// ---------------------------------------------------------------------------

const SF_ENV      = process.env.SF_ENV || 'uat';
const SF_BASE_URL = SF_ENV === 'prod'
  ? 'https://api.ssg-wsg.sg'
  : 'https://uat-api.ssg-wsg.sg';

// SSG SkillsFuture Credit Pay form POST URL (where user is redirected to claim)
const SF_FORM_URL = SF_ENV === 'prod'
  ? 'https://claimsvc.ssg-wsg.sg/ClaimWeb/rest/v2/SFCPayment'
  : 'https://uat-claimsvc.ssg-wsg.sg/ClaimWeb/rest/v2/SFCPayment';

class SkillsFutureController {
  // ── RSA-SHA256 digital signature ──────────────────────────────────────────
  // Signs the request body string with the private key.
  // The resulting base64 signature is sent as X-Api-Signature on every SSG call.
  // ─────────────────────────────────────────────────────────────────────────
  _signBody(bodyString) {
    const privateKeyPem = process.env.SF_PRIVATE_KEY_PEM;
    if (!privateKeyPem) {
      throw new Error('SF_PRIVATE_KEY_PEM must be set in environment variables. Run scripts/generate-sf-keys.js to create keys.');
    }
    // Support \n as literal newline escape in env vars
    const pem = privateKeyPem.replace(/\\n/g, '\n');
    const sign = crypto.createSign('SHA256');
    sign.update(bodyString);
    sign.end();
    return sign.sign(pem, 'base64');
  }

  // ── OAuth2: obtain access token from SSG ──────────────────────────────────
  async _getAccessToken() {
    const clientId     = process.env.SF_CLIENT_ID;
    const clientSecret = process.env.SF_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('SF_CLIENT_ID and SF_CLIENT_SECRET must be set in environment variables');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await axios.post(`${SF_BASE_URL}/oauth/token`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data.access_token;
  }

  // ── Shared: build headers with auth + digital signature ───────────────────
  _buildHeaders(token, bodyString) {
    const signature = this._signBody(bodyString);
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Api-Signature': signature,
    };
  }

  // ── Step 2: Encrypt payment request payload via SSG API ───────────────────
  async encryptPaymentRequest(req, res) {
    try {
      const {
        nric,
        courseRunId,
        courseFee,
        courseStartDate,
        courseEndDate,
        trainingPartnerUen,
        supportingDocId,
      } = req.body;

      if (!nric || !courseRunId || !courseFee || !courseStartDate || !courseEndDate || !trainingPartnerUen) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: nric, courseRunId, courseFee, courseStartDate, courseEndDate, trainingPartnerUen'
        });
      }

      const token = await this._getAccessToken();

      const payload = {
        nric,
        courseRunId,
        courseFee: Number(courseFee),
        courseStartDate,
        courseEndDate,
        trainingPartnerUen,
        supportingDocId: supportingDocId || '',
      };

      const bodyString = JSON.stringify(payload);
      console.log('[SkillsFuture] Encrypting payment request for courseRunId:', courseRunId);

      const response = await axios.post(
        `${SF_BASE_URL}/skillsfuture-credit/v2/encrypt`,
        bodyString,
        { headers: this._buildHeaders(token, bodyString) }
      );

      return res.json({
        success: true,
        encryptedPayload: response.data.encryptedPayload,
        formUrl: SF_FORM_URL,
      });
    } catch (error) {
      console.error('[SkillsFuture] Encryption failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  // ── Step 5: Decrypt SSG callback response via SSG API ────────────────────
  async decryptPaymentResponse(req, res) {
    try {
      const { encryptedPayload } = req.body;

      if (!encryptedPayload) {
        return res.status(400).json({ success: false, error: 'encryptedPayload is required' });
      }

      const token = await this._getAccessToken();
      const payload = { encryptedPayload };
      const bodyString = JSON.stringify(payload);
      console.log('[SkillsFuture] Decrypting SSG callback response');

      const response = await axios.post(
        `${SF_BASE_URL}/skillsfuture-credit/v2/decrypt`,
        bodyString,
        { headers: this._buildHeaders(token, bodyString) }
      );

      const data = response.data;
      console.log('[SkillsFuture] Claim result — code:', data.claimRequestCode, 'status:', data.claimStatus);

      return res.json({
        success: true,
        claim: {
          claimRequestCode: data.claimRequestCode,
          claimStatus:      data.claimStatus,
          creditUsed:       data.creditUsed,
          courseRunId:      data.courseRunId,
          nric:             data.nric,
        }
      });
    } catch (error) {
      console.error('[SkillsFuture] Decryption failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  // ── Step 6: Upload supporting documents ──────────────────────────────────
  async uploadSupportingDocuments(req, res) {
    try {
      const { claimRequestCode, documents } = req.body;

      if (!claimRequestCode || !documents || !documents.length) {
        return res.status(400).json({ success: false, error: 'claimRequestCode and documents are required' });
      }

      const token = await this._getAccessToken();
      const payload = { documents };
      const bodyString = JSON.stringify(payload);
      console.log('[SkillsFuture] Uploading', documents.length, 'document(s) for claim:', claimRequestCode);

      const response = await axios.post(
        `${SF_BASE_URL}/skillsfuture-credit/v2/claimRequests/${encodeURIComponent(claimRequestCode)}/supportingDocuments`,
        bodyString,
        { headers: this._buildHeaders(token, bodyString) }
      );

      return res.json({ success: true, result: response.data });
    } catch (error) {
      console.error('[SkillsFuture] Document upload failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  // ── Step 7a: View claim details ───────────────────────────────────────────
  async getClaimDetails(req, res) {
    try {
      const { claimRequestCode } = req.body;

      if (!claimRequestCode) {
        return res.status(400).json({ success: false, error: 'claimRequestCode is required' });
      }

      const token = await this._getAccessToken();
      // GET request — sign an empty body
      const signature = this._signBody('');

      const response = await axios.get(
        `${SF_BASE_URL}/skillsfuture-credit/v2/claimRequests/${encodeURIComponent(claimRequestCode)}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Api-Signature': signature } }
      );

      return res.json({ success: true, claim: response.data });
    } catch (error) {
      console.error('[SkillsFuture] Get claim failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  // ── Step 7b: Cancel claim ─────────────────────────────────────────────────
  async cancelClaim(req, res) {
    try {
      const { claimRequestCode } = req.body;

      if (!claimRequestCode) {
        return res.status(400).json({ success: false, error: 'claimRequestCode is required' });
      }

      const token = await this._getAccessToken();
      const signature = this._signBody('');
      console.log('[SkillsFuture] Cancelling claim:', claimRequestCode);

      const response = await axios.delete(
        `${SF_BASE_URL}/skillsfuture-credit/v2/claimRequests/${encodeURIComponent(claimRequestCode)}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Api-Signature': signature } }
      );

      return res.json({ success: true, result: response.data });
    } catch (error) {
      console.error('[SkillsFuture] Cancel claim failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }
}

module.exports = SkillsFutureController;

const SF_ENV      = process.env.SF_ENV || 'uat';
const SF_BASE_URL = SF_ENV === 'prod'
  ? 'https://api.ssg-wsg.sg'
  : 'https://uat-api.ssg-wsg.sg';

// SSG SkillsFuture Credit Pay form POST URL (where user is redirected to claim)
const SF_FORM_URL = SF_ENV === 'prod'
  ? 'https://claimsvc.ssg-wsg.sg/ClaimWeb/rest/v2/SFCPayment'
  : 'https://uat-claimsvc.ssg-wsg.sg/ClaimWeb/rest/v2/SFCPayment';

class SkillsFutureController {
  // ── OAuth2: obtain access token from SSG ──────────────────────────────────
  async _getAccessToken() {
    const clientId     = process.env.SF_CLIENT_ID;
    const clientSecret = process.env.SF_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('SF_CLIENT_ID and SF_CLIENT_SECRET must be set in environment variables');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await axios.post(`${SF_BASE_URL}/oauth/token`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data.access_token;
  }

  // ── Step 2: Encrypt payment request payload via SSG API ───────────────────
  // Payload fields (all required unless noted):
  //   nric              - learner's NRIC (e.g. "S1234567A")
  //   courseRunId       - SSG course run ID
  //   courseFee         - total course fee in dollars (number)
  //   courseStartDate   - "YYYY-MM-DD"
  //   courseEndDate     - "YYYY-MM-DD"
  //   trainingPartnerUen - your organisation's UEN
  //   supportingDocId   - your internal reference number for supporting docs
  // ---------------------------------------------------------------------------
  async encryptPaymentRequest(req, res) {
    try {
      const {
        nric,
        courseRunId,
        courseFee,
        courseStartDate,
        courseEndDate,
        trainingPartnerUen,
        supportingDocId,
      } = req.body;

      if (!nric || !courseRunId || !courseFee || !courseStartDate || !courseEndDate || !trainingPartnerUen) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: nric, courseRunId, courseFee, courseStartDate, courseEndDate, trainingPartnerUen'
        });
      }

      const token = await this._getAccessToken();

      const payload = {
        nric,
        courseRunId,
        courseFee: Number(courseFee),
        courseStartDate,
        courseEndDate,
        trainingPartnerUen,
        supportingDocId: supportingDocId || '',
      };

      console.log('[SkillsFuture] Encrypting payment request for courseRunId:', courseRunId);

      const response = await axios.post(
        `${SF_BASE_URL}/skillsfuture-credit/v2/encrypt`,
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      // SSG returns: { encryptedPayload: "...", ... }
      return res.json({
        success: true,
        encryptedPayload: response.data.encryptedPayload,
        formUrl: SF_FORM_URL,
      });
    } catch (error) {
      console.error('[SkillsFuture] Encryption failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  // ── Step 5: Decrypt SSG callback response via SSG API ────────────────────
  // SSG redirects back to your callback URL with ?encryptedPayload=...
  // ---------------------------------------------------------------------------
  async decryptPaymentResponse(req, res) {
    try {
      const { encryptedPayload } = req.body;

      if (!encryptedPayload) {
        return res.status(400).json({ success: false, error: 'encryptedPayload is required' });
      }

      const token = await this._getAccessToken();

      console.log('[SkillsFuture] Decrypting SSG callback response');

      const response = await axios.post(
        `${SF_BASE_URL}/skillsfuture-credit/v2/decrypt`,
        { encryptedPayload },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      // Decrypted response contains: claimRequestCode, creditUsed, courseRunId, nric, etc.
      const data = response.data;
      console.log('[SkillsFuture] Claim result — code:', data.claimRequestCode, 'status:', data.claimStatus);

      return res.json({
        success: true,
        claim: {
          claimRequestCode: data.claimRequestCode,
          claimStatus:      data.claimStatus,       // e.g. "SUBMITTED", "APPROVED"
          creditUsed:       data.creditUsed,
          courseRunId:      data.courseRunId,
          nric:             data.nric,
        }
      });
    } catch (error) {
      console.error('[SkillsFuture] Decryption failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  // ── Step 6: Upload supporting documents ──────────────────────────────────
  async uploadSupportingDocuments(req, res) {
    try {
      const { claimRequestCode, documents } = req.body;

      if (!claimRequestCode || !documents || !documents.length) {
        return res.status(400).json({ success: false, error: 'claimRequestCode and documents are required' });
      }

      const token = await this._getAccessToken();

      console.log('[SkillsFuture] Uploading', documents.length, 'document(s) for claim:', claimRequestCode);

      const response = await axios.post(
        `${SF_BASE_URL}/skillsfuture-credit/v2/claimRequests/${encodeURIComponent(claimRequestCode)}/supportingDocuments`,
        { documents },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      return res.json({ success: true, result: response.data });
    } catch (error) {
      console.error('[SkillsFuture] Document upload failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  // ── Step 7a: View claim details ───────────────────────────────────────────
  async getClaimDetails(req, res) {
    try {
      const { claimRequestCode } = req.body;

      if (!claimRequestCode) {
        return res.status(400).json({ success: false, error: 'claimRequestCode is required' });
      }

      const token = await this._getAccessToken();

      const response = await axios.get(
        `${SF_BASE_URL}/skillsfuture-credit/v2/claimRequests/${encodeURIComponent(claimRequestCode)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return res.json({ success: true, claim: response.data });
    } catch (error) {
      console.error('[SkillsFuture] Get claim failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }

  // ── Step 7b: Cancel claim ─────────────────────────────────────────────────
  async cancelClaim(req, res) {
    try {
      const { claimRequestCode } = req.body;

      if (!claimRequestCode) {
        return res.status(400).json({ success: false, error: 'claimRequestCode is required' });
      }

      const token = await this._getAccessToken();

      console.log('[SkillsFuture] Cancelling claim:', claimRequestCode);

      const response = await axios.delete(
        `${SF_BASE_URL}/skillsfuture-credit/v2/claimRequests/${encodeURIComponent(claimRequestCode)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return res.json({ success: true, result: response.data });
    } catch (error) {
      console.error('[SkillsFuture] Cancel claim failed:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message
      });
    }
  }
}

module.exports = SkillsFutureController;
