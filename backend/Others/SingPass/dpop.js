// backend/Others/SingPass/dpop.js
// FAPI 2.0: DPoP (Demonstrating Proof of Possession) utility
// Implements RFC 9449 for SingPass FAPI 2.0 migration

const crypto = require('crypto');

// In-memory store for ephemeral DPoP key pairs (keyed by state parameter)
// Each key pair is used for a single authentication flow (PAR → Token → Userinfo)
const dpopKeyStore = new Map();

// Clean up expired keys every 5 minutes (keys older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  for (const [key, value] of dpopKeyStore.entries()) {
    if (now - value.createdAt > TEN_MINUTES) {
      dpopKeyStore.delete(key);
      console.log(`DPoP: Cleaned up expired key pair for state: ${key.substring(0, 8)}...`);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate an ephemeral EC P-256 key pair for DPoP
 * Per RFC 9449, DPoP uses ephemeral keys (not the registered signing key). //ok
 * SingPass verifies the DPoP proof signature against the public key
 * embedded in the JWT header's 'jwk' field.
 * The same key pair is reused across PAR, Token Exchange, and Userinfo requests.
 */
async function generateDPoPKeyPair() {
  const jose = await import('jose');
  const { publicKey, privateKey } = await jose.generateKeyPair('ES256');
  const publicJwk = await jose.exportJWK(publicKey);
  
  return {
    publicKey,
    privateKey,
    publicJwk: {
      alg: 'ES256',
      kty: publicJwk.kty,
      crv: publicJwk.crv,
      use: 'sig',
      x: publicJwk.x,
      y: publicJwk.y
    }
  };
}

/**
 * Generate a DPoP proof JWT (RFC 9449)
 * 
 * @param {CryptoKey} privateKey - EC P-256 private key to sign the proof
 * @param {Object} publicJwk - Public JWK (included in JWT header for verification)
 * @param {string} htm - HTTP method of the request (e.g., 'POST', 'GET')
 * @param {string} htu - HTTP URI of the request (without query/fragment)
 * @param {string|null} ath - Access token hash (required when using access token)
 * @returns {string} Compact JWS (the DPoP proof JWT)
 */
async function generateDPoPProof(privateKey, publicJwk, htm, htu, ath = null) {
  const jose = await import('jose');
  
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    jti: crypto.randomUUID(),
    htm: htm,
    htu: htu,
    iat: iat,
    exp: iat + 120  // 120 seconds validity (matches SingPass sample)
  };
  
  // Include access token hash when making resource requests (e.g., userinfo)
  if (ath) {
    payload.ath = ath;
  }
  
  const dpopProof = await new jose.SignJWT(payload)
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'dpop+jwt',
      jwk: publicJwk
    })
    .sign(privateKey);
  
  return dpopProof;
}

/**
 * Compute the access token hash (ath) for DPoP proof
 * SHA-256 hash of the ASCII encoding of the access token, base64url-encoded
 * Required when sending DPoP proof with a resource request (e.g., userinfo)
 */
function computeAccessTokenHash(accessToken) {
  const hash = crypto.createHash('sha256').update(accessToken, 'ascii').digest();
  return hash.toString('base64url');
}

/**
 * Store a DPoP key pair associated with a state parameter
 * The state parameter links the PAR request to the subsequent token exchange
 */
function storeDPoPKeyPair(state, keyPair) {
  dpopKeyStore.set(state, {
    ...keyPair,
    createdAt: Date.now()
  });
  console.log(`DPoP: Key pair stored for state: ${state.substring(0, 8)}...`);
}

/**
 * Retrieve a DPoP key pair by state parameter
 */
function getDPoPKeyPair(state) {
  const entry = dpopKeyStore.get(state);
  if (entry) {
    console.log(`DPoP: Key pair retrieved for state: ${state.substring(0, 8)}...`);
  }
  return entry || null;
}

/**
 * Remove a DPoP key pair (call after authentication flow is complete)
 */
function removeDPoPKeyPair(state) {
  dpopKeyStore.delete(state);
  console.log(`DPoP: Key pair removed for state: ${state.substring(0, 8)}...`);
}

module.exports = {
  generateDPoPKeyPair,
  generateDPoPProof,
  computeAccessTokenHash,
  storeDPoPKeyPair,
  getDPoPKeyPair,
  removeDPoPKeyPair
};
