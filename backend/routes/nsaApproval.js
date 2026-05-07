var express = require('express');
var router = express.Router();
var NsaApprovalController = require('../Controller/NSA_Approval/NsaApprovalController');

var controller = new NsaApprovalController();

// ─── Main POST endpoint — purpose-based routing ───────────────────────────────
// POST /nsaApproval
// Body: { purpose: "sendApprovalEmail" | "getApprovalRequestStatusList", ...payload }
router.post('/', async function(req, res, next) {
    if (req.body.purpose === 'sendApprovalEmail') {
        return controller.sendApprovalEmail(req, res);
    } else if (req.body.purpose === 'getApprovalRequestStatusList') {
        return controller.getApprovalRequestStatusList(req, res);
    } else {
        return res.status(400).json({ result: false, message: 'Unknown purpose' });
    }
});

// ─── GET bridges — email action links auto-submit a form to POST ──────────────

router.get('/approve', function(req, res) {
    var token = req.query.token || '';
    var approverEmail = req.query.approverEmail || '';
    var esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return res.send(`<!DOCTYPE html><html><head><title>Approving...</title></head><body><form method="POST" action="/nsaApproval/approve" id="f"><input type="hidden" name="token" value="${esc(token)}"/><input type="hidden" name="approverEmail" value="${esc(approverEmail)}"/></form><script>document.getElementById('f').submit();<\/script></body></html>`);
});

router.get('/reject', function(req, res) {
    var token = req.query.token || '';
    var approverEmail = req.query.approverEmail || '';
    var esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return res.send(`<!DOCTYPE html><html><head><title>Rejecting...</title></head><body><form method="POST" action="/nsaApproval/reject" id="f"><input type="hidden" name="token" value="${esc(token)}"/><input type="hidden" name="approverEmail" value="${esc(approverEmail)}"/></form><script>document.getElementById('f').submit();<\/script></body></html>`);
});

router.get('/approve-all', function(req, res) {
    var batchId = req.query.batchId || '';
    var approverEmail = req.query.approverEmail || '';
    var esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return res.send(`<!DOCTYPE html><html><head><title>Approving all...</title></head><body><form method="POST" action="/nsaApproval/approve-all" id="f"><input type="hidden" name="batchId" value="${esc(batchId)}"/><input type="hidden" name="approverEmail" value="${esc(approverEmail)}"/></form><script>document.getElementById('f').submit();<\/script></body></html>`);
});

router.get('/reject-all', function(req, res) {
    var batchId = req.query.batchId || '';
    var approverEmail = req.query.approverEmail || '';
    var esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return res.send(`<!DOCTYPE html><html><head><title>Rejecting all...</title></head><body><form method="POST" action="/nsaApproval/reject-all" id="f"><input type="hidden" name="batchId" value="${esc(batchId)}"/><input type="hidden" name="approverEmail" value="${esc(approverEmail)}"/></form><script>document.getElementById('f').submit();<\/script></body></html>`);
});

// ─── POST action sub-routes ───────────────────────────────────────────────────

router.post('/approve',          (req, res) => controller.approvePost(req, res));
router.post('/reject',           (req, res) => controller.rejectPost(req, res));
router.post('/approve-all',      (req, res) => controller.approveAllPost(req, res));
router.post('/reject-all',       (req, res) => controller.rejectAllPost(req, res));
router.post('/review-batch',     (req, res) => controller.reviewBatchPost(req, res));
router.post('/approve-selected', (req, res) => controller.approveSelectedPost(req, res));

module.exports = router;
