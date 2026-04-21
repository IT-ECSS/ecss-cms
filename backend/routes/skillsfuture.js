const express = require('express');
const router = express.Router();
const {
  handleCallback,
  createPaymentRequest,
  getClaimDetails
} = require('../Controller/SkillsFuture/skillsfutureController');

/**
 * POST /api/skillsfuture/callback
 * Receives encrypted callback from SSG SkillsFuture
 * Returns: Redirect to frontend callback page
 */
router.post('/callback', handleCallback);

/**
 * POST /api/skillsfuture/create-payment-request
 * Creates a new payment request
 * Body: { courseId, userId, creditAmount }
 */
router.post('/create-payment-request', createPaymentRequest);

/**
 * GET /api/skillsfuture/claim/:claimId/details
 * Retrieves claim details
 */
router.get('/claim/:claimId/details', getClaimDetails);

module.exports = router;
