const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

router.get('/.well-known/jwks.json', (req, res) => {
  const jwksPath = path.join(__dirname, '../Others/SingPass/Keys/jwks.json');
  
  try {
    const jwks = JSON.parse(fs.readFileSync(jwksPath, 'utf8'));
    console.log('JWKS loaded successfully');
    
    // Optional: Filter keys by purpose if client specifies it in query parameter
    // For example: /.well-known/jwks.json?purpose=enc for encryption keys only
    if (req.query.purpose === 'enc') {
      jwks.keys = jwks.keys.filter(key => key.use === 'enc');
      console.log('Filtered JWKS to encryption keys only');
    } else if (req.query.purpose === 'sig') {
      jwks.keys = jwks.keys.filter(key => key.use === 'sig');
      console.log('Filtered JWKS to signing keys only');
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Content-Type-Options': 'nosniff'
    });
    
    res.json(jwks);
  } catch (err) {
    console.error('Error loading JWKS:', err);
    res.status(500).json({ error: 'Unable to load JWKS' });
  }
});

module.exports = router;