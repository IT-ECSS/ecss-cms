var { sendNsaApprovalRequestEmail } = require('../../Others/Email/nsaApprovalRequestEmail');
var { sendNsaDecisionSummaryEmail } = require('../../Others/Email/nsaDecisionSummaryEmail');
var crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = "mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System";
const DB_NAME = "Company-Management-System";

const COLUMN_FIELD_MAP = {
    'Name': { purpose: 'edit', field: 'name' },
    'Contact Number': { purpose: 'edit', field: 'contactNumber' },
    'Payment Date': { purpose: 'edit', field: 'paymentDate' },
    'Refunded Date': { purpose: 'edit', field: 'refundedDate' },
    'Remarks': { purpose: 'addCancelRemarks' },
    'Payment Status': { purpose: 'updatePaymentStatus' },
    'Registration Status': { purpose: 'updatePaymentStatus' },
    'Registration and Payment Status': { purpose: 'updatePaymentStatus' },
    'Confirmation': { purpose: 'updateConfirmationStatus' },
    'Confirmation Status': { purpose: 'updateConfirmationStatus' },
    'Payment Method': { purpose: 'updatePaymentMethod' },
};

const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://ecss-backend-node.azurewebsites.net'
    : 'http://localhost:3001';

const APPROVER_NAME_MAP = {
    'moses_lee@ecss.org.sg': 'Moses Lee',
    'rosalind_ong@ecss.org.sg': 'Rosalind Ong',
    'peipei_low@ecss.org.sg': 'Peipei Low',
};

function resolveApproverName(approverEmail) {
    var email = String(approverEmail || '').trim().toLowerCase();
    return APPROVER_NAME_MAP[email] || (email ? email : 'Unknown Approver');
}

function normalizePaymentMethod(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'cash') return 'Cash';
    if (v === 'paynow') return 'PayNow';
    if (v === 'skillsfuture') return 'SkillsFuture';
    return String(value || '').trim();
}

function parseConfirmationValue(value) {
    var normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'confirmed' || normalized === 'yes' || normalized === 'true' || normalized === '1') return true;
    if (normalized === 'not confirmed' || normalized === 'no' || normalized === 'false' || normalized === '0') return false;
    return null;
}

// ─── HTML helpers ────────────────────────────────────────────────────────────

function webhookClosePage() {
    return `<!DOCTYPE html><html><head><title>Done</title></head><body><script>window.open('','_self','');window.close();<\/script></body></html>`;
}

function htmlPage(title, message, color) {
    var icon = color === '#28a745' ? '✅' : color === '#dc3545' ? '❌' : 'ℹ️';
    return `<!DOCTYPE html><html><head><title>${title}</title></head><body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;"><div style="max-width:480px;padding:40px;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);text-align:center;"><div style="font-size:48px;margin-bottom:12px;">${icon}</div><h2 style="color:${color};margin:0 0 12px;">${title}</h2><p style="color:#555;margin:0;">${message}</p></div></body></html>`;
}

function approvalSummaryPage(results) {
    var approved = results.filter(r => r.status === 'approved').length;
    var rows = results.map(r =>
        `<tr><td style="padding:6px 10px;border:1px solid #ddd;">${r.participantName || ''}</td><td style="padding:6px 10px;border:1px solid #ddd;">${r.columnName || ''}</td><td style="padding:6px 10px;border:1px solid #ddd;">${r.newValue || ''}</td><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;color:${r.status === 'approved' ? '#2e7d32' : r.status === 'already approved' ? '#6c757d' : '#dc3545'};">${r.status}</td></tr>`
    ).join('');
    return `<!DOCTYPE html><html><head><title>Approval Result</title></head><body style="font-family:Arial,sans-serif;padding:40px 20px;background:#f8f9fa;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);padding:32px;"><div style="font-size:48px;text-align:center;margin-bottom:12px;">✅</div><h2 style="color:#28a745;text-align:center;margin:0 0 16px;">Done</h2><p style="color:#555;text-align:center;margin:0 0 20px;">${approved} of ${results.length} change${results.length !== 1 ? 's' : ''} approved.</p><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f2f2f2;"><th style="padding:6px 10px;border:1px solid #ccc;text-align:left;">Participant</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left;">Field</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left;">New Value</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left;">Status</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function applyApproval(db, approval, axios, approverEmail) {
    var mapping = COLUMN_FIELD_MAP[approval.columnName];
    if (!mapping) throw new Error(`Unsupported field: ${approval.columnName}`);
    var mappingPurpose = mapping.purpose;
    var payload = { id: approval.registrationId, staff: `${approval.requestedBy}` };
    if (mapping.purpose === 'edit') { payload.purpose = 'edit'; payload.field = mapping.field; payload.editedValue = approval.newValue; }
    else if (mapping.purpose === 'updatePaymentStatus') { payload.purpose = 'updatePaymentStatus'; payload.newUpdateStatus = approval.newValue; }
    else if (mapping.purpose === 'updateConfirmationStatus') {
        payload.purpose = 'updateConfirmationStatus';
        var normalized = String(approval.newValue || '').trim().toLowerCase();
        if (normalized === 'confirmed' || normalized === 'yes' || normalized === 'true' || normalized === '1') payload.newConfirmation = true;
        else if (normalized === 'not confirmed' || normalized === 'no' || normalized === 'false' || normalized === '0') payload.newConfirmation = false;
        else payload.newConfirmation = approval.newValue;
    }
    else if (mapping.purpose === 'addCancelRemarks') {
        if (String(approval.newValue ?? '').trim() === '') {
            payload.purpose = 'edit';
            payload.field = 'remarks';
            payload.editedValue = '';
        } else {
            payload.purpose = 'addCancelRemarks';
            payload.editedValue = approval.newValue;
        }
    }
    else if (mapping.purpose === 'updatePaymentMethod') { payload.purpose = 'updatePaymentMethod'; payload.newUpdatePayment = approval.newValue; }
    await axios.post(`${BASE_URL}/courseregistration`, payload);

    await maybeGenerateReceiptNumberForApproval(db, approval, axios, mappingPurpose);

    // Also append the approval reason into official.remarks as 1) ... 2) ...
    await appendApprovalReasonToRemarks(db, approval.registrationId, approval.reason);

    await db.collection('NSA_Approvals').updateOne(
        { token: approval.token },
        {
            $set: {
                status: 'approved',
                requestStatus: 'approved',
                approvedAt: new Date(),
                approvedByEmail: String(approverEmail || '').trim().toLowerCase(),
                approvedByName: resolveApproverName(approverEmail),
            }
        }
    );
}

async function applyReject(db, approval, approverEmail) {
    await db.collection('NSA_Approvals').updateOne(
        { token: approval.token },
        {
            $set: {
                status: 'rejected',
                requestStatus: 'rejected',
                rejectedAt: new Date(),
                rejectedByEmail: String(approverEmail || '').trim().toLowerCase(),
                rejectedByName: resolveApproverName(approverEmail),
            }
        }
    );
}

async function appendApprovalReasonToRemarks(db, registrationId, reasonText) {
    var reason = String(reasonText || '').trim();
    if (!reason) return;

    var filter;
    try {
        filter = { _id: new ObjectId(registrationId) };
    } catch (_) {
        return;
    }

    var table = db.collection('Registration Forms');
    var row = await table.findOne(filter, { projection: { 'official.remarks': 1 } });
    if (!row) return;

    var existing = String(row.official?.remarks || '').trim();
    var lines = existing ? existing.split(/\r?\n/).map(l => String(l || '').trim()).filter(Boolean) : [];
    var maxNo = 0;
    for (var line of lines) {
        var m = line.match(/^(\d+)\)\s+/);
        if (m) maxNo = Math.max(maxNo, parseInt(m[1], 10) || 0);
    }

    var nextNo = maxNo + 1;
    var numberedReason = `${nextNo}) ${reason}`;
    var nextRemarks = existing ? `${existing}\n${numberedReason}` : numberedReason;

    await table.updateOne(filter, { $set: { 'official.remarks': nextRemarks } });
}

async function getRegistrationForApproval(db, registrationId) {
    var filter;
    try {
        filter = { _id: new ObjectId(registrationId) };
    } catch (_) {
        return null;
    }

    return db.collection('Registration Forms').findOne(filter, {
        projection: {
            _id: 1,
            participant: 1,
            status: 1,
            course: 1,
            official: 1,
        },
    });
}

async function maybeGenerateReceiptNumberForApproval(db, approval, axios, mappingPurpose) {
    var registrationId = String(approval.registrationId || '').trim();
    if (!registrationId) return;

    var staff = `${approval.requestedBy}`;

    // Match manual grid behavior: changing method to Cash/PayNow auto-sets Paid.
    if (mappingPurpose === 'updatePaymentMethod') {
        var requestedMethod = normalizePaymentMethod(approval.newValue);
        if (requestedMethod === 'Cash' || requestedMethod === 'PayNow') {
            await axios.post(`${BASE_URL}/courseregistration`, {
                purpose: 'updatePaymentStatus',
                id: registrationId,
                staff: staff,
                newUpdateStatus: 'Paid',
            });
        }
    }

    // Match manual grid behavior: SkillsFuture confirmation true auto-triggers invoice state.
    if (mappingPurpose === 'updateConfirmationStatus') {
        var isConfirmed = parseConfirmationValue(approval.newValue);
        if (isConfirmed === true) {
            var rowAfterConfirm = await getRegistrationForApproval(db, registrationId);
            var methodAfterConfirm = normalizePaymentMethod(rowAfterConfirm?.course?.payment);
            if (methodAfterConfirm === 'SkillsFuture') {
                await axios.post(`${BASE_URL}/courseregistration`, {
                    purpose: 'updatePaymentStatus',
                    id: registrationId,
                    staff: staff,
                    newUpdateStatus: 'Generating SkillsFuture Invoice',
                });
            }
        }
    }

    var latest = await getRegistrationForApproval(db, registrationId);
    if (!latest) return;

    var existingReceiptNo = String(latest.official?.receiptNo || '').trim();
    if (existingReceiptNo) return;

    var paymentMethod = normalizePaymentMethod(latest.course?.payment);
    var status = String(latest.status || '').trim();

    var shouldGenerateCashReceipt =
        (paymentMethod === 'Cash' || paymentMethod === 'PayNow') &&
        status === 'Paid';

    var shouldGenerateSkillsFutureInvoice =
        paymentMethod === 'SkillsFuture' &&
        (status === 'Generating SkillsFuture Invoice' || status === 'SkillsFuture Done');

    if (!shouldGenerateCashReceipt && !shouldGenerateSkillsFutureInvoice) return;

    var nextNoResponse = await axios.post(`${BASE_URL}/receipt`, {
        purpose: 'getReceiptNo',
        course: latest.course || {},
        paymentMethod: paymentMethod,
    });

    var generatedNo = nextNoResponse?.data?.result?.receiptNumber;
    if (!generatedNo) return;

    // Use existing flow endpoints only (same as current frontend generation path).
    await axios.post(`${BASE_URL}/courseregistration`, {
        purpose: shouldGenerateSkillsFutureInvoice ? 'addInvoiceNumber' : 'addReceiptNumber',
        id: registrationId,
        _id: registrationId,
        participant: latest.participant || {},
        course: latest.course || {},
        staff: staff,
        receiptNo: generatedNo,
        status: status,
    });

    await axios.post(`${BASE_URL}/receipt`, {
        purpose: 'createReceipt',
        receiptNo: generatedNo,
        location: latest.course?.courseLocation || approval.courseLocation || '',
        registration_id: registrationId,
        url: '',
        staff: staff,
    });
}

// ─── Controller class ─────────────────────────────────────────────────────────

class NsaApprovalController {

    // POST /nsaApproval  { purpose: "sendApprovalEmail", ... }
    async sendApprovalEmail(req, res) {
        var { fromName, fromEmail, currentDate, currentTime, allChanges, additionalNotes } = req.body;
        if (!fromName || !currentDate || !currentTime || !Array.isArray(allChanges) || allChanges.length === 0) {
            return res.status(400).json({ result: false, message: "Missing required fields" });
        }
        for (var ci = 0; ci < allChanges.length; ci++) {
            var hasNewValue = !(allChanges[ci].newValue === undefined || allChanges[ci].newValue === null);
            if (!allChanges[ci].columnName || !hasNewValue || !allChanges[ci].reason || !allChanges[ci].registrationId) {
                return res.status(400).json({ result: false, message: `Change ${ci + 1} is missing required fields` });
            }
        }

        var mongoClient = new MongoClient(MONGO_URI);
        try {
            var recipientName = 'Approval Team';
            var recipientEmails = ['moses_lee@ecss.org.sg', 'rosalind_ong@ecss.org.sg', 'peipei_low@ecss.org.sg'];

            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);
            var batchId = crypto.randomUUID();
            var expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            // Build all documents in memory first
            var tokenList = allChanges.map(() => crypto.randomUUID());
            var docs = allChanges.map(function(change, idx) {
                return {
                    token: tokenList[idx],
                    batchId,
                    status: 'pending',
                    requestStatus: 'pending',
                    sn: change.sn || '',
                    registrationId: change.registrationId,
                    columnName: change.columnName,
                    newValue: change.newValue,
                    currentValue: change.currentValue || '',
                    oldValue: change.currentValue || '',
                    reason: change.reason,
                    participantName: change.participantName || '',
                    participantEmail: change.participantEmail || '',
                    affectedUserName: change.participantName || '',
                    affectedUserEmail: change.participantEmail || '',
                    courseName: change.courseName || '',
                    courseLocation: change.courseLocation || '',
                    requestedBy: fromName,
                    requesterName: fromName,
                    requestedByEmail: fromEmail || '',
                    requesterEmail: fromEmail || '',
                    requestDate: currentDate,
                    requestTime: currentTime,
                    requestedAt: new Date(),
                    expiresAt,
                };
            });

            // Parallel: bulk-insert to DB and send email at the same time
            await Promise.all([
                db.collection('NSA_Approvals').insertMany(docs),
                sendNsaApprovalRequestEmail({
                    fromName, fromEmail, recipientName, recipientEmails,
                    currentDate, currentTime, allChanges, tokenList, batchId,
                    additionalNotes, baseUrl: BASE_URL,
                }),
            ]);

            // Emit socket event so all connected clients refresh the status list immediately
            var io = req.app.get('io');
            if (io) io.emit('nsa-status-update', { requesterEmail: fromEmail || '', requesterName: fromName, batchId });

            return res.json({ result: true, message: "Approval email sent", recipients: recipientEmails.length, changesCount: allChanges.length, batchId });
        } catch (error) {
            console.error("Error sending approval email:", error);
            return res.status(500).json({ result: false, message: "Failed to send approval email" });
        } finally {
            await mongoClient.close();
        }
    }

    // POST /nsaApproval  { purpose: "getApprovalRequestStatusList", ... }
    async getApprovalRequestStatusList(req, res) {
        var requesterEmail = String(req.body.requesterEmail || '').trim().toLowerCase();
        var requesterName = String(req.body.requesterName || '').trim();

        if (!requesterEmail && !requesterName) {
            return res.status(400).json({ result: false, message: "Missing requester identity" });
        }

        var escapeRegex = function(value) {
            return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        var mongoClient = new MongoClient(MONGO_URI);
        try {
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);

            var orConditions = [];
            if (requesterEmail) {
                var requesterEmailRegex = new RegExp(`^${escapeRegex(requesterEmail)}$`, 'i');
                orConditions.push({ requesterEmail: requesterEmailRegex });
                orConditions.push({ requestedByEmail: requesterEmailRegex });
            }
            if (requesterName) {
                var requesterNameRegex = new RegExp(`^${escapeRegex(requesterName)}$`, 'i');
                orConditions.push({ requesterName: requesterNameRegex });
                orConditions.push({ requestedBy: requesterNameRegex });
            }
            var query = orConditions.length > 0 ? { $or: orConditions } : {};

            var approvals = await db.collection('NSA_Approvals')
                .find(query)
                .sort({ requestedAt: -1 })
                .toArray();

            var rows = approvals.map(function(a) {
                return {
                    id: String(a._id || a.token || ''),
                    token: a.token || '',
                    batchId: a.batchId || '',
                    registrationId: a.registrationId || '',
                    sn: a.sn || '',
                    participantName: a.participantName || '',
                    participantEmail: a.participantEmail || '',
                    courseName: a.courseName || '',
                    courseLocation: a.courseLocation || '',
                    columnName: a.columnName || '',
                    currentValue: a.currentValue || a.oldValue || '',
                    newValue: a.newValue || '',
                    reason: a.reason || '',
                    status: String(a.status || a.requestStatus || 'pending').toLowerCase(),
                    requestDate: a.requestDate || '',
                    requestTime: a.requestTime || '',
                    requestedBy: a.requestedBy || a.requesterName || '',
                    requestedByEmail: a.requestedByEmail || a.requesterEmail || '',
                    requestedAt: a.requestedAt || null,
                    approvedAt: a.approvedAt || null,
                    rejectedAt: a.rejectedAt || null
                };
            });

            return res.json({ result: true, requests: rows });
        } catch (error) {
            console.error('Error getting approval request status list:', error);
            return res.status(500).json({ result: false, message: 'Failed to load approval request status list' });
        } finally {
            await mongoClient.close();
        }
    }

    // POST /nsaApproval/approve  (submitted from email GET bridge)
    async approvePost(req, res) {
        var { token, approverEmail } = req.body;
        if (!token) return res.send(webhookClosePage());
        var mongoClient = new MongoClient(MONGO_URI);
        try {
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);
            var approval = await db.collection('NSA_Approvals').findOne({ token });
            if (!approval || approval.status === 'approved') return res.send(webhookClosePage());
            if (approval.status === 'expired' || new Date() > new Date(approval.expiresAt)) {
                await db.collection('NSA_Approvals').updateOne({ token }, { $set: { status: 'expired', requestStatus: 'expired' } });
                return res.send(webhookClosePage());
            }
            var axios = require('axios');
            await applyApproval(db, approval, axios, approverEmail);
            await sendNsaDecisionSummaryEmail(db, approval.batchId);
            var io = req.app.get('io');
            if (io) {
                io.emit('registration', { type: 'nsa-approved', registrationId: approval.registrationId, columnName: approval.columnName });
                io.emit('nsa-status-update', { requesterEmail: approval.requesterEmail || approval.requestedByEmail || '', requesterName: approval.requesterName || approval.requestedBy || '', batchId: approval.batchId });
            }
            return res.send(webhookClosePage());
        } catch (err) {
            console.error('Approve POST error:', err);
            return res.send(webhookClosePage());
        } finally {
            await mongoClient.close();
        }
    }

    // POST /nsaApproval/reject  (submitted from email GET bridge)
    async rejectPost(req, res) {
        var { token, approverEmail } = req.body;
        if (!token) return res.send(webhookClosePage());
        var mongoClient = new MongoClient(MONGO_URI);
        try {
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);
            var approval = await db.collection('NSA_Approvals').findOne({ token });
            if (!approval || approval.status === 'rejected' || approval.status === 'approved') return res.send(webhookClosePage());
            if (approval.status === 'expired' || new Date() > new Date(approval.expiresAt)) {
                await db.collection('NSA_Approvals').updateOne({ token }, { $set: { status: 'expired', requestStatus: 'expired' } });
                return res.send(webhookClosePage());
            }
            await applyReject(db, approval, approverEmail);
            await sendNsaDecisionSummaryEmail(db, approval.batchId);
            var io = req.app.get('io');
            if (io) {
                io.emit('registration', { type: 'nsa-rejected', registrationId: approval.registrationId, columnName: approval.columnName });
                io.emit('nsa-status-update', { requesterEmail: approval.requesterEmail || approval.requestedByEmail || '', requesterName: approval.requesterName || approval.requestedBy || '', batchId: approval.batchId });
            }
            return res.send(webhookClosePage());
        } catch (err) {
            console.error('Reject POST error:', err);
            return res.send(webhookClosePage());
        } finally {
            await mongoClient.close();
        }
    }

    // POST /nsaApproval/approve-all  (submitted from email GET bridge)
    async approveAllPost(req, res) {
        var { batchId, approverEmail } = req.body;
        if (!batchId) return res.status(400).send(htmlPage('Invalid', 'Missing batch ID.', '#dc3545'));
        var mongoClient = new MongoClient(MONGO_URI);
        try {
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);
            var pending = await db.collection('NSA_Approvals').find({ batchId, status: 'pending' }).toArray();
            if (pending.length === 0) return res.send(htmlPage('Nothing to Approve', 'All changes in this batch have already been approved or expired.', '#6c757d'));
            var axios = require('axios');
            var results = [];
            for (var approval of pending) {
                if (new Date() > new Date(approval.expiresAt)) {
                    await db.collection('NSA_Approvals').updateOne({ token: approval.token }, { $set: { status: 'expired', requestStatus: 'expired' } });
                    results.push({ columnName: approval.columnName, participantName: approval.participantName, status: 'expired' });
                    continue;
                }
                try {
                    await applyApproval(db, approval, axios, approverEmail);
                    results.push({ columnName: approval.columnName, participantName: approval.participantName, newValue: approval.newValue, status: 'approved' });
                } catch (e) {
                    results.push({ columnName: approval.columnName, participantName: approval.participantName, status: 'error' });
                }
            }
            await sendNsaDecisionSummaryEmail(db, batchId);
            var io = req.app.get('io');
            if (io) {
                var batchRequester = pending[0] || {};
                io.emit('registration', { type: 'nsa-approved-batch', batchId });
                io.emit('nsa-status-update', { requesterEmail: batchRequester.requesterEmail || batchRequester.requestedByEmail || '', requesterName: batchRequester.requesterName || batchRequester.requestedBy || '', batchId });
            }
            return res.send(webhookClosePage());
        } catch (err) {
            console.error('Approve-all POST error:', err);
            return res.send(webhookClosePage());
        } finally {
            await mongoClient.close();
        }
    }

    // POST /nsaApproval/reject-all  (submitted from email GET bridge)
    async rejectAllPost(req, res) {
        var { batchId, approverEmail } = req.body;
        if (!batchId) return res.send(webhookClosePage());
        var mongoClient = new MongoClient(MONGO_URI);
        try {
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);
            var pending = await db.collection('NSA_Approvals').find({ batchId, status: 'pending' }).toArray();
            for (var approval of pending) {
                if (new Date() > new Date(approval.expiresAt)) {
                    await db.collection('NSA_Approvals').updateOne({ token: approval.token }, { $set: { status: 'expired', requestStatus: 'expired' } });
                    continue;
                }
                await applyReject(db, approval, approverEmail);
            }
            await sendNsaDecisionSummaryEmail(db, batchId);
            var io = req.app.get('io');
            if (io) {
                var batchRequesterR = pending[0] || {};
                io.emit('registration', { type: 'nsa-rejected-batch', batchId });
                io.emit('nsa-status-update', { requesterEmail: batchRequesterR.requesterEmail || batchRequesterR.requestedByEmail || '', requesterName: batchRequesterR.requesterName || batchRequesterR.requestedBy || '', batchId });
            }
            return res.send(webhookClosePage());
        } catch (err) {
            console.error('Reject-all POST error:', err);
            return res.send(webhookClosePage());
        } finally {
            await mongoClient.close();
        }
    }

    // POST /nsaApproval/review-batch
    async reviewBatchPost(req, res) {
        var { batchId } = req.body;
        if (!batchId) return res.status(400).send(htmlPage('Invalid Link', 'No batch ID provided.', '#dc3545'));
        var mongoClient = new MongoClient(MONGO_URI);
        try {
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);
            var approvals = await db.collection('NSA_Approvals').find({ batchId }).toArray();
            if (approvals.length === 0) return res.status(404).send(htmlPage('Not Found', 'No changes found for this batch.', '#dc3545'));
            var esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            var groups = {};
            approvals.forEach(a => {
                var k = a.registrationId || '_';
                if (!groups[k]) groups[k] = { participantName: a.participantName, courseName: a.courseName, courseLocation: a.courseLocation, rows: [] };
                groups[k].rows.push(a);
            });
            var rowsHtml = ''; var sn = 0;
            for (var group of Object.values(groups)) {
                rowsHtml += `<tr style="background:#e8f0ff;"><td colspan="7" style="padding:8px 12px;font-weight:bold;font-size:13px;color:#1a3a6b;">${esc(group.participantName || 'Unknown')} <span style="font-weight:normal;color:#555;">${esc(group.courseName || '')}${group.courseLocation ? ' &middot; ' + esc(group.courseLocation) : ''}</span></td></tr>`;
                for (var a of group.rows) {
                    sn++;
                    var isPending = a.status === 'pending' && new Date() <= new Date(a.expiresAt);
                    var statusBadge = a.status === 'approved'
                        ? '<span style="color:#2e7d32;font-weight:bold;">&#10003; Approved</span>'
                        : (!isPending ? '<span style="color:#dc3545;">Expired</span>' : '<span style="color:#e65100;">Pending</span>');
                    rowsHtml += `<tr style="border-bottom:1px solid #f0f0f0;background:${sn % 2 === 0 ? '#fafafa' : '#fff'};"><td style="padding:8px 10px;text-align:center;">${isPending ? `<input type="checkbox" name="tokens" value="${esc(a.token)}" style="width:15px;height:15px;cursor:pointer;" onchange="updateCount()">` : '<input type="checkbox" disabled style="width:15px;height:15px;opacity:0.4;">'}</td><td style="padding:8px 10px;text-align:center;color:#888;">${sn}</td><td style="padding:8px 10px;background:#fff8ec;color:#856404;font-weight:bold;white-space:nowrap;">${esc(a.columnName)}</td><td style="padding:8px 10px;color:#555;font-style:italic;">${esc(a.currentValue || '—')}</td><td style="padding:8px 10px;background:#e8f5e9;color:#2e7d32;font-weight:bold;">${esc(a.newValue)}</td><td style="padding:8px 10px;color:#555;font-size:12px;">${esc(a.reason)}</td><td style="padding:8px 10px;text-align:center;">${statusBadge}</td></tr>`;
                }
            }
            var pending = approvals.filter(a => a.status === 'pending' && new Date() <= new Date(a.expiresAt)).length;
            var approveAllFormHtml = `<form method="POST" action="/nsaApproval/approve-all" style="display:inline;margin:0;"><input type="hidden" name="batchId" value="${esc(batchId)}"/><button type="submit" class="btn btn-blue" onclick="return confirm('Approve all ${pending} pending changes?')">&#10003; Approve All (${pending})</button></form>`;
            return res.send(`<!DOCTYPE html><html><head><title>Review Approval Request</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px}.card{max-width:820px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);padding:28px}h2{margin:0 0 4px;color:#1a3a6b}.sub{color:#555;margin:0 0 18px;font-size:14px}.abar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}.btn{display:inline-block;padding:8px 18px;border-radius:4px;font-weight:bold;font-size:13px;cursor:pointer;border:none;text-decoration:none;line-height:1.4}.btn-green{background:#2e7d32;color:#fff}.btn-blue{background:#1565c0;color:#fff}.btn-grey{background:#f5f5f5;color:#555;border:1px solid #ddd}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f2f2f2;padding:8px 10px;border:1px solid #ddd;text-align:left}.badge{background:#e65100;color:#fff;border-radius:99px;padding:1px 7px;font-size:12px;margin-left:4px}</style></head><body><div class="card"><h2>&#128203; Review Approval Request</h2><p class="sub">Requested by <strong>${esc(approvals[0]?.requestedBy || '')}</strong> &mdash; ${approvals.length} change${approvals.length !== 1 ? 's' : ''} &mdash; <strong>${pending} pending</strong></p><form method="POST" action="/nsaApproval/approve-selected" id="f"><div class="abar"><button type="button" class="btn btn-grey" onclick="selectAll()">Select All</button><button type="button" class="btn btn-grey" onclick="deselectAll()">Deselect All</button><button type="submit" class="btn btn-green">&#10003; Approve Selected <span class="badge" id="cnt">0</span></button>${approveAllFormHtml}</div><div style="overflow-x:auto;"><table><thead><tr><th style="width:40px;text-align:center;">&#9745;</th><th style="width:36px;">#</th><th>Field</th><th>Current</th><th>New Value</th><th>Reason</th><th style="width:90px;text-align:center;">Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></div><div class="abar" style="margin-top:14px;"><button type="submit" class="btn btn-green">&#10003; Approve Selected <span class="badge" id="cnt2">0</span></button></div></form></div><script>function updateCount(){var n=document.querySelectorAll('input[name="tokens"]:checked').length;document.getElementById('cnt').textContent=n;document.getElementById('cnt2').textContent=n;}function selectAll(){document.querySelectorAll('input[name="tokens"]:not(:disabled)').forEach(c=>c.checked=true);updateCount();}function deselectAll(){document.querySelectorAll('input[name="tokens"]').forEach(c=>c.checked=false);updateCount();}document.getElementById('f').addEventListener('submit',function(e){if(!document.querySelectorAll('input[name="tokens"]:checked').length){e.preventDefault();alert('Please select at least one change.');}});<\/script></body></html>`);
        } catch (err) {
            console.error('Review batch error:', err);
            return res.status(500).send(htmlPage('Error', 'Something went wrong.', '#dc3545'));
        } finally {
            await mongoClient.close();
        }
    }

    // POST /nsaApproval/approve-selected  (form from review-batch page)
    async approveSelectedPost(req, res) {
        var tokens = req.body.tokens;
        if (!tokens) return res.send(htmlPage('Nothing Selected', 'No changes were selected.', '#6c757d'));
        if (!Array.isArray(tokens)) tokens = [tokens];
        var mongoClient = new MongoClient(MONGO_URI);
        try {
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);
            var axios = require('axios');
            var results = [];
            var affectedBatchIds = new Set();
            for (var token of tokens) {
                var approval = await db.collection('NSA_Approvals').findOne({ token });
                if (!approval) { results.push({ columnName: '?', participantName: '?', status: 'not found' }); continue; }
                if (approval.status === 'approved') { results.push({ columnName: approval.columnName, participantName: approval.participantName, newValue: approval.newValue, status: 'already approved' }); continue; }
                if (approval.status === 'expired' || new Date() > new Date(approval.expiresAt)) {
                    await db.collection('NSA_Approvals').updateOne({ token }, { $set: { status: 'expired', requestStatus: 'expired' } });
                    results.push({ columnName: approval.columnName, participantName: approval.participantName, status: 'expired' });
                    continue;
                }
                try {
                    await applyApproval(db, approval, axios, req.body.approverEmail || '');
                    if (approval.batchId) affectedBatchIds.add(approval.batchId);
                    results.push({ columnName: approval.columnName, participantName: approval.participantName, newValue: approval.newValue, status: 'approved' });
                } catch (e) {
                    results.push({ columnName: approval.columnName, participantName: approval.participantName, status: 'error' });
                }
            }
            for (var id of affectedBatchIds) {
                await sendNsaDecisionSummaryEmail(db, id);
            }
            var io = req.app.get('io');
            if (io) {
                // Collect unique requesters from approved tokens
                var approvedApprovals = results.filter(r => r.status === 'approved' || r.status === 'already approved');
                io.emit('registration', { type: 'nsa-approved-selected' });
                io.emit('nsa-status-update', { batchId: [...affectedBatchIds][0] || '' });
            }
            return res.send(approvalSummaryPage(results));
        } catch (err) {
            console.error('Approve-selected error:', err);
            return res.status(500).send(htmlPage('Error', 'Something went wrong.', '#dc3545'));
        } finally {
            await mongoClient.close();
        }
    }
}

module.exports = NsaApprovalController;
