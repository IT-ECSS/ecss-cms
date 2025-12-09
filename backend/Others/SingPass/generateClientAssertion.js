const jose = require('jose');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // 1. First create a signed JWT using the signing key
    const signingJwkPath = path.join(__dirname, 'Keys', 'private-signing-key.jwk.json');
    const signingJwk = JSON.parse(fs.readFileSync(signingJwkPath, 'utf8'));
    
    if (!signingJwk.d) {
      console.error('No private part (d) found in the signing JWK.');
      return;
    }
    
    // Import the signing key with its own algorithm (should be ES256)
    const signingKey = await jose.importJWK(signingJwk, signingJwk.alg);
    
    const nowTime = moment().unix();
    const futureTime = moment().add(2, "minutes").unix();
    
    const signedJwt = await new jose.SignJWT({
      sub: "tLRDBkf1CNy5Rsi34mEKuOD5EpQAwjIq", // Update Client ID
      iss: "tLRDBkf1CNy5Rsi34mEKuOD5EpQAwjIq", // Update Client ID
      //aud: "https://stg-id.singpass.gov.sg",
        aud: "https://id.singpass.gov.sg",
      iat: nowTime,
      exp: futureTime,
    })
      .setProtectedHeader({
        alg: signingJwk.alg,
        kid: signingJwk.kid,
        typ: "JWT",
      })
      .sign(signingKey);
    
    console.log("Signed JWT (JWS):", signedJwt);
    
    // 2. If you want to create a JWE (encrypted token), you need a public encryption key
    // This would typically be SingPass's public key
    try {
      // Load SingPass's public encryption key (you would get this from them)
      // For demo purposes, we'll use our own public key
      const jwksPath = path.join(__dirname, 'Keys', 'jwks.json');
      const jwks = JSON.parse(fs.readFileSync(jwksPath, 'utf8'));
      
      // Find the RSA encryption key in the JWKS
      const encryptionKey = jwks.keys.find(key => key.use === 'enc' && key.alg === 'RSA-OAEP-256');
      
      if (!encryptionKey) {
        console.error('No RSA encryption key found in the JWKS.');
        return;
      }
      
      // Import the public encryption key
      const publicEncryptionKey = await jose.importJWK(encryptionKey);
      
      // Encrypt the signed JWT to create a JWE token
      const jwe = await new jose.CompactEncrypt(
        new TextEncoder().encode(signedJwt)
      )
        .setProtectedHeader({
          alg: encryptionKey.alg,
          enc: 'A256GCM',
          kid: encryptionKey.kid,
        })
        .encrypt(publicEncryptionKey);
      
      console.log("\nEncrypted JWT (JWE):", jwe);
      
    } catch (encErr) {
      console.log("JWE creation skipped - missing SingPass public encryption key");
      console.error(encErr);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

main().catch(console.error);