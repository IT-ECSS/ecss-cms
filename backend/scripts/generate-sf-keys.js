/**
 * SkillsFuture Subscription Settings — Key Generator
 *
 * Generates the two keys required by the SSG Developer Portal:
 *   1. RSA-2048 key pair   → Digital Signature (Section 3 of Subscription Settings guide)
 *   2. AES-256 key (32 B)  → Encryption Key    (Section 4 of Subscription Settings guide)
 *
 * Usage:
 *   node backend/scripts/generate-sf-keys.js
 *
 * After running:
 *   • Copy SF_PRIVATE_KEY_PEM into your .env (newlines → \n)
 *   • Submit the PUBLIC key to the SSG portal: App → Subscription Settings → Digital Signature
 *   • Submit the AES key to the SSG portal: App → Subscription Settings → Encryption Key
 */

const { generateKeyPairSync, randomBytes } = require('crypto');

// ── 1. RSA-2048 key pair ──────────────────────────────────────────────────
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// ── 2. AES-256 key (32 random bytes, base64-encoded) ─────────────────────
const aesKey = randomBytes(32).toString('base64');

// ── Output ────────────────────────────────────────────────────────────────
console.log('='.repeat(72));
console.log('SSG SkillsFuture — Generated Keys');
console.log('='.repeat(72));

console.log('\n── PUBLIC KEY (paste into SSG portal → Subscription Settings → Digital Signature) ──');
// Strip header/footer and newlines — SSG portal expects bare base64
const pubBase64 = publicKey
  .replace(/-----BEGIN PUBLIC KEY-----\n?/, '')
  .replace(/\n?-----END PUBLIC KEY-----\n?/, '')
  .replace(/\n/g, '');
console.log(pubBase64);

console.log('\n── PRIVATE KEY (add to .env as SF_PRIVATE_KEY_PEM — keep secret!) ──');
// Collapse to single line for .env storage; controller will re-expand \n → newline
const privateKeyOneLine = privateKey.replace(/\n/g, '\\n');
console.log(`SF_PRIVATE_KEY_PEM="${privateKeyOneLine}"`);

console.log('\n── AES-256 ENCRYPTION KEY (paste into SSG portal → Subscription Settings → Encryption Key) ──');
console.log(aesKey);
console.log('\n── Also add to .env ──');
console.log(`SF_AES_KEY="${aesKey}"`);

console.log('\n── Add these to your .env ──');
console.log('SF_ENV=uat');
console.log('SF_CLIENT_ID=<your-client-id-from-ssg-portal>');
console.log('SF_CLIENT_SECRET=<your-client-secret-from-ssg-portal>');
console.log(`SF_AES_KEY="${aesKey}"`);
console.log(`SF_PRIVATE_KEY_PEM="${privateKeyOneLine}"`);
console.log('='.repeat(72));
