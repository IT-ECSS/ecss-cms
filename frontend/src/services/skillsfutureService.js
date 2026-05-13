/**
 * SkillsFuture Credit Pay — Frontend Service
 *
 * Mirrors the 7-step SSG flow:
 *   encryptPaymentRequest    → Step 2  (backend calls SSG Encryption API)
 *   decryptPaymentResponse   → Step 5  (backend calls SSG Decryption API)
 *   uploadSupportingDocuments → Step 6
 *   getClaimDetails          → Step 7a
 *   cancelClaim              → Step 7b
 */

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ecss-backend-node.azurewebsites.net';

const API_BASE = `${BACKEND_URL}/skillsfuture`;

async function post(purpose, body) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, ...body }),
  });
  return res.json();
}

/**
 * Step 2 — encrypt payment request payload via SSG API
 * @param {{
 *   nric: string,
 *   courseRunId: string,
 *   courseFee: number,
 *   courseStartDate: string,  // YYYY-MM-DD
 *   courseEndDate: string,    // YYYY-MM-DD
 *   trainingPartnerUen: string,
 *   supportingDocId?: string
 * }} payload
 * @returns {{ success: boolean, encryptedPayload: string, formUrl: string }}
 */
export async function encryptPaymentRequest(payload) {
  return post('encrypt', payload);
}

/**
 * Step 5 — decrypt SSG callback response
 * @param {string} encryptedPayload  — value of ?encryptedPayload= from SSG redirect
 * @returns {{ success: boolean, claim: object }}
 */
export async function decryptPaymentResponse(encryptedPayload) {
  return post('decrypt', { encryptedPayload });
}

/**
 * Step 6 — upload supporting documents
 * @param {string} claimRequestCode
 * @param {Array<{ fileName: string, fileContent: string }>} documents  — base64 content
 * @returns {{ success: boolean, result: object }}
 */
export async function uploadSupportingDocuments(claimRequestCode, documents) {
  return post('upload-documents', { claimRequestCode, documents });
}

/**
 * Step 7a — view claim details
 * @param {string} claimRequestCode
 * @returns {{ success: boolean, claim: object }}
 */
export async function getClaimDetails(claimRequestCode) {
  return post('claim-details', { claimRequestCode });
}

/**
 * Step 7b — cancel pending claim
 * @param {string} claimRequestCode
 * @returns {{ success: boolean, result: object }}
 */
export async function cancelClaim(claimRequestCode) {
  return post('cancel-claim', { claimRequestCode });
}

/**
 * Store claim reference — after SSG payment callback
 * @param {{
 *   registrationId: string,
 *   claimRequestCode: string,
 *   claimStatus?: string,
 *   creditUsed?: number,
 *   courseRunId?: string,
 *   nric?: string
 * }} payload
 * @returns {{ success: boolean, claimRequestCode: string, registrationId: string }}
 */
export async function storeClaim(payload) {
  return post('store-claim', payload);
}

/**
 * Fetch and update claim status from SSG
 * @param {string} registrationId
 * @returns {{ success: boolean, claimStatus: string, claimRequestCode: string, creditUsed: number }}
 */
export async function fetchAndUpdateClaimStatus(registrationId) {
  return post('fetch-status', { registrationId });
}

export default {
  encryptPaymentRequest,
  decryptPaymentResponse,
  uploadSupportingDocuments,
  getClaimDetails,
  cancelClaim,
  storeClaim,
  fetchAndUpdateClaimStatus,
};
