var express = require('express');
var router  = express.Router();
var ExportApprovalController = require('../Controller/ExportApproval/ExportApprovalController');

var controller = new ExportApprovalController();

// ── Main POST endpoint ────────────────────────────────────────────────────────
router.post('/', async function(req, res) {
    if (req.body.purpose === 'sendExportApprovalRequest') {
        return controller.sendExportApprovalRequest(req, res);
    }
    return res.status(400).json({ result: false, message: 'Unknown purpose.' });
});

// ── GET bridges (email links auto-submit a form to POST) ──────────────────────
router.get('/approve', (req, res) => controller.approveGet(req, res));
router.get('/reject',  (req, res) => controller.rejectGet(req, res));
router.get('/download', (req, res) => controller.downloadGet(req, res));

// ── POST action sub-routes ────────────────────────────────────────────────────
router.post('/approve', (req, res) => controller.approvePost(req, res));
router.post('/reject',  (req, res) => controller.rejectPost(req, res));

module.exports = router;
