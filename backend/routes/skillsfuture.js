var express = require('express');
var router = express.Router();
var SkillsFutureController = require('../Controller/SkillsFuture/skillsfutureController');

// POST /skillsfuture
// Single entry point — purpose field selects the action
// ---------------------------------------------------------------------------
// purpose: 'encrypt'            → Step 2: encrypt payment request payload
// purpose: 'decrypt'            → Step 5: decrypt SSG callback response
// purpose: 'upload-documents'   → Step 6: upload supporting documents
// purpose: 'claim-details'      → Step 7a: view claim status
// purpose: 'cancel-claim'       → Step 7b: cancel pending claim
// ---------------------------------------------------------------------------
router.post('/', async function(req, res) {
  const { purpose } = req.body;

  if (!purpose) {
    return res.status(400).json({ success: false, error: 'purpose is required' });
  }

  try {
    const ctrl = new SkillsFutureController();

    if (purpose === 'encrypt') {
      return await ctrl.encryptPaymentRequest(req, res);
    }
    if (purpose === 'decrypt') {
      return await ctrl.decryptPaymentResponse(req, res);
    }
    if (purpose === 'upload-documents') {
      return await ctrl.uploadSupportingDocuments(req, res);
    }
    if (purpose === 'claim-details') {
      return await ctrl.getClaimDetails(req, res);
    }
    if (purpose === 'cancel-claim') {
      return await ctrl.cancelClaim(req, res);
    }

    return res.status(400).json({
      success: false,
      error: `Unknown purpose "${purpose}". Valid values: encrypt, decrypt, upload-documents, claim-details, cancel-claim`
    });
  } catch (error) {
    console.error('[SkillsFuture] Route error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
