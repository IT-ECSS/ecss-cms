const { generateKeyPair, exportJWK } = require('jose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function generateAndSaveKeys() {
  // Generate a unique kid suffix for this run
  const kidSuffix = crypto.randomBytes(4).toString('hex');
  
  // Generate signing EC key pair (P-256)
  const { publicKey: signPublicKey, privateKey: signPrivateKey } = await generateKeyPair('ES256', { extractable: true });
  
  // Generate encryption EC key pair (P-256) for JWE (ECDH-ES+A256KW)
  // NOTE: For JWE, use ECDH-ES with curve P-256 ("P-256" is the default for ECDH-ES in jose)
  const { publicKey: encPublicKey, privateKey: encPrivateKey } = await generateKeyPair('ECDH-ES', { extractable: true });

  // Export signing public key as JWK
  const signJwk = await exportJWK(signPublicKey);
  signJwk.use = 'sig';
  signJwk.alg = 'ES256';
  signJwk.kid = `signing-key-${kidSuffix}`;

  // Export ECDH encryption public key as JWK (for JWE encryption)
  const encJwk = await exportJWK(encPublicKey);
  encJwk.use = 'enc';
  encJwk.alg = 'ECDH-ES+A256KW';
  encJwk.kid = `ec-encryption-key-${kidSuffix}`;
  // Save this JWK to JWKS for use as the public key in JWE encryption
  
  const jwks = { keys: [signJwk, encJwk] };

  // Export private keys as JWK
  const signPrivateJwk = await exportJWK(signPrivateKey);
  signPrivateJwk.use = 'sig';
  signPrivateJwk.alg = 'ES256';
  signPrivateJwk.kid = signJwk.kid;

  const encPrivateJwk = await exportJWK(encPrivateKey);
  encPrivateJwk.use = 'enc';
  encPrivateJwk.alg = 'ECDH-ES+A256KW';
  encPrivateJwk.kid = encJwk.kid;


  // Ensure the Keys directory exists
  const keysDir = path.join(__dirname, 'Keys');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  // Save JWKS (public keys)
  fs.writeFileSync(path.join(keysDir, 'jwks.json'), JSON.stringify(jwks, null, 2));
  
  // Save private keys as JWK
  fs.writeFileSync(path.join(keysDir, 'private-signing-key.jwk.json'), JSON.stringify(signPrivateJwk, null, 2));
  fs.writeFileSync(path.join(keysDir, 'private-ec-encryption-key.jwk.json'), JSON.stringify(encPrivateJwk, null, 2));

  console.log('JWKS (public keys) saved to Keys/jwks.json');
  console.log('Signing private key saved to Keys/private-signing-key.jwk.json');
  console.log('EC encryption private key saved to Keys/private-ec-encryption-key.jwk.json');
  
  // Add verification/test code
  console.log('\nKey verification:');
  console.log('Signing key ID:', signJwk.kid);
  console.log('EC encryption key ID:', encJwk.kid);
}

// Add a validation function to test the JWE encryption/decryption
async function testJweEncryption() {
  try {
    console.log('\nTesting JWE encryption and decryption...');
    const { createRemoteJWKSet, jwtVerify, CompactEncrypt, compactDecrypt, importJWK } = require('jose');
    
    const keysDir = path.join(__dirname, 'Keys');
    const jwksData = JSON.parse(fs.readFileSync(path.join(keysDir, 'jwks.json'), 'utf8'));
  
    
    // Test data
    const testData = new TextEncoder().encode('This is a test message for JWE encryption with SingPass');

    // Import the public and private JWKs for encryption/decryption
    const encPublicJwk = jwksData.keys.find(k => k.use === 'enc');
    const encPrivateJwk = JSON.parse(fs.readFileSync(path.join(keysDir, 'private-ec-encryption-key.jwk.json'), 'utf8'));
    const publicKey = await importJWK(encPublicJwk, 'ECDH-ES+A256KW');
    const privateKey = await importJWK(encPrivateJwk, 'ECDH-ES+A256KW');

    // Encrypt the test data as a JWE
    const jwe = await new CompactEncrypt(testData)
      .setProtectedHeader({ alg: 'ECDH-ES+A256KW', enc: 'A256GCM', kid: encPublicJwk.kid })
      .encrypt(publicKey);

    // Decrypt JWE
    const { plaintext } = await compactDecrypt(jwe, privateKey);
    const decryptedText = new TextDecoder().decode(plaintext);
    
    console.log('JWE decrypted successfully:', decryptedText);
    return true;
  } catch (err) {
    console.error('JWE test failed:', err);
    return false;
  }
}

// Run both functions
async function run() {
  await generateAndSaveKeys();
  //await testJweEncryption();
}

run();