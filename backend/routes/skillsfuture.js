var express = require('express');
var router = express.Router();
var SkillsFutureController = require('../Controller/SkillsFuture/skillsfutureController');

router.post('/', async function(req, res) {
  try {
    const purpose = req.body.purpose;

    if (purpose === 'callback') {
      // Handle SSG SkillsFuture callback
      // Receives encrypted response and verifies signature
      const { responseSignature, encryptedResponse, transactionId } = req.body;

      if (!responseSignature || !encryptedResponse) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: responseSignature, encryptedResponse'
        });
      }

      var controller = new SkillsFutureController();
      var result = await controller.handleCallback(req, res);
      return result;
    } 
    else if (purpose === 'payment-request') {
      // Create payment request for frontend
      const { courseId, userId, creditAmount } = req.body;

      if (!courseId || !userId || !creditAmount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: courseId, userId, creditAmount'
        });
      }

      if (typeof creditAmount !== 'number' || creditAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'creditAmount must be a positive number'
        });
      }

      var controller = new SkillsFutureController();
      var result = await controller.createPaymentRequest(req, res);
      return result;
    } 
    else if (purpose === 'claim-details') {
      // Get claim details by claimId
      const { claimId } = req.body;

      if (!claimId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: claimId'
        });
      }

      req.params.claimId = claimId;
      var controller = new SkillsFutureController();
      var result = await controller.getClaimDetails(req, res);
      return result;
    } 
    else {
      return res.status(400).json({
        success: false,
        message: "Invalid purpose. Expected 'callback', 'payment-request', or 'claim-details'"
      });
    }
  } catch (error) {
    console.error('[SkillsFuture] Route error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
