/**
 * ExportApprovalController.js
 * Handles the approval workflow for LOP and Attendance exports requested by
 * Testing A (testingA@ecss.org.sg) and Testing B (testingB@ecss.org.sg).
 *
 * Flow:
 *   1. Frontend calls POST /exportApproval { purpose:'sendExportApprovalRequest', ... }
 *      → stores record in DB, sends Email 1 (request + Excel attachment) to approvers.
 *   2. Approver clicks Approve link in email → GET /exportApproval/approve?token=...
 *      → auto-submits form → POST /exportApproval/approve
 *      → sends Email 2 (approved, Excel attached) to requester
 *      → sends Email 3 (summary) to supervisors.
 *   3. Approver clicks Reject link → GET /exportApproval/reject?token=...
 *      → auto-submits form → POST /exportApproval/reject
 *      → sends Email 2 (rejected, no attachment) to requester
 *      → sends Email 3 (summary) to supervisors.
 */

var crypto  = require('crypto');
var { MongoClient } = require('mongodb');
var { sendExportApprovalRequestEmail }  = require('../../Others/Email/exportApprovalRequestEmail');
var { sendExportApprovalDecisionEmail } = require('../../Others/Email/exportApprovalDecisionEmail');
var { sendExportApprovalSummaryEmail }  = require('../../Others/Email/exportApprovalSummaryEmail');

const MONGO_URI = "mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System";
const DB_NAME   = "Company-Management-System";
const COLLECTION = "Export_Approvals";

const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://ecss-backend-node.azurewebsites.net'
    : 'http://localhost:3001';

const APPROVER_EMAILS = ['moses_lee@ecss.org.sg', 'peipei_low@ecss.org.sg', 'rosalind_ong@ecss.org.sg'];

const APPROVER_NAME_MAP = {
    'moses_lee@ecss.org.sg': 'Moses Lee',
    'rosalind_ong@ecss.org.sg': 'Rosalind Ong',
    'peipei_low@ecss.org.sg': 'Peipei Low',
};

const ATTACHMENT_INLINE_MAX_BYTES = Number(process.env.EXPORT_APPROVAL_INLINE_ATTACHMENT_MAX_BYTES || 2 * 1024 * 1024);

function resolveApproverName(email) {
    return APPROVER_NAME_MAP[String(email || '').trim().toLowerCase()] || String(email || '').trim() || 'Unknown';
}

function getSingaporeDateTime() {
    var now = new Date();
    var sg  = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
    var pad = (n) => String(n).padStart(2, '0');
    var date = `${pad(sg.getDate())}/${pad(sg.getMonth() + 1)}/${sg.getFullYear()}`;
    var time = `${pad(sg.getHours())}:${pad(sg.getMinutes())}`;
    return { date, time };
}

function getExcelBufferFromRecord(record) {
    if (!record) return null;
    if (record.excelData && Buffer.isBuffer(record.excelData)) {
        return record.excelData;
    }
    if (record.excelData && record.excelData.buffer) {
        return Buffer.from(record.excelData.buffer);
    }
    if (record.excelBase64) {
        return Buffer.from(record.excelBase64, 'base64');
    }
    return null;
}

function htmlPage(title, message, color) {
    var icon = color === '#28a745' ? '✅' : color === '#dc3545' ? '❌' : 'ℹ️';
        return `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta charset="utf-8" />
    <script>
        (function () {
            // Attempt to close this tab/window automatically after approval action.
            function closeWindow() {
                try { window.open('', '_self'); } catch (e) {}
                try { window.close(); } catch (e) {}
            }
            setTimeout(closeWindow, 50);
            setTimeout(closeWindow, 400);
            setTimeout(closeWindow, 1000);
        })();
    </script>
</head>
<body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;">
    <div style="max-width:480px;padding:40px;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">${icon}</div>
        <h2 style="color:${color};margin:0 0 12px;">${title}</h2>
        <p style="color:#555;margin:0 0 12px;">${message}</p>
        <p style="color:#999;margin:0;font-size:12px;">This page will close automatically.</p>
    </div>
</body>
</html>`;
}

class ExportApprovalController {

    // ── POST /exportApproval { purpose: 'sendExportApprovalRequest' } ──────────

    async sendExportApprovalRequest(req, res) {
        var client;
        try {
            var {
                requesterName,
                requesterEmail,
                exportType,
                courseType,
                recordCount,
                fileName,
                excelBase64,
            } = req.body;

            if (!excelBase64 || !exportType || !requesterEmail) {
                return res.status(400).json({ result: false, message: 'Missing required fields.' });
            }

            var excelBuffer = Buffer.from(excelBase64, 'base64');

            var token = crypto.randomUUID();
            var { date, time } = getSingaporeDateTime();

            client = new MongoClient(MONGO_URI);
            await client.connect();
            var db = client.db(DB_NAME);

            await db.collection(COLLECTION).insertOne({
                token,
                status: 'pending',
                exportType:     String(exportType || ''),
                courseType:     String(courseType || ''),
                requesterName:  String(requesterName || ''),
                requesterEmail: String(requesterEmail || '').trim().toLowerCase(),
                fileName:       String(fileName || ''),
                recordCount:    Number(recordCount) || 0,
                excelData:      excelBuffer,
                excelSizeBytes: excelBuffer.length,
                requestedAt:    new Date(),
                requestDate:    date,
                requestTime:    time,
                emailStatus:    'queued',
                emailQueuedAt:  new Date(),
            });

            // Return immediately for better UX, then send email in background.
            res.json({ result: true, message: 'Approval request queued successfully.' });

            setImmediate(async () => {
                var bgClient;
                try {
                    var mailResult = await sendExportApprovalRequestEmail({
                        requesterName:  String(requesterName || ''),
                        requesterEmail: String(requesterEmail || ''),
                        exportType:     String(exportType || ''),
                        courseType:     String(courseType || ''),
                        recordCount:    Number(recordCount) || 0,
                        fileName:       String(fileName || ''),
                        currentDate:    date,
                        currentTime:    time,
                        approverEmails: APPROVER_EMAILS,
                        token,
                        baseUrl:        BASE_URL,
                        downloadUrl:    `${BASE_URL}/exportApproval/download?token=${encodeURIComponent(token)}`,
                        inlineAttachmentMaxBytes: ATTACHMENT_INLINE_MAX_BYTES,
                        excelBuffer,
                    });

                    bgClient = new MongoClient(MONGO_URI);
                    await bgClient.connect();
                    var bgDb = bgClient.db(DB_NAME);
                    await bgDb.collection(COLLECTION).updateOne(
                        { token },
                        {
                            $set: {
                                emailStatus: 'sent',
                                emailSentAt: new Date(),
                                emailMessageId: String(mailResult?.messageId || ''),
                                emailAccepted: Array.isArray(mailResult?.accepted) ? mailResult.accepted : [],
                                emailRejected: Array.isArray(mailResult?.rejected) ? mailResult.rejected : [],
                            },
                        }
                    );
                } catch (mailErr) {
                    console.error('sendExportApprovalRequest background email error:', mailErr);
                    try {
                        if (!bgClient) {
                            bgClient = new MongoClient(MONGO_URI);
                            await bgClient.connect();
                        }
                        var bgDbErr = bgClient.db(DB_NAME);
                        await bgDbErr.collection(COLLECTION).updateOne(
                            { token },
                            {
                                $set: {
                                    emailStatus: 'failed',
                                    emailFailedAt: new Date(),
                                    emailError: String(mailErr?.message || 'Unknown email send error'),
                                },
                            }
                        );
                    } catch (dbErr) {
                        console.error('Failed to persist email failure status:', dbErr);
                    }
                } finally {
                    if (bgClient) await bgClient.close();
                }
            });

            return;

        } catch (err) {
            console.error('sendExportApprovalRequest error:', err);
            return res.status(500).json({ result: false, message: 'Internal server error.' });
        } finally {
            if (client) await client.close();
        }
    }

    // ── GET bridge: /exportApproval/approve?token=... ─────────────────────────

    approveGet(req, res) {
        var token = String(req.query.token || '');
        var approverEmail = String(req.query.approverEmail || '');
        var esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return res.send(
            `<!DOCTYPE html><html><head><title>Approving...</title></head><body>` +
            `<form method="POST" action="/exportApproval/approve" id="f">` +
            `<input type="hidden" name="token" value="${esc(token)}"/>` +
            `<input type="hidden" name="approverEmail" value="${esc(approverEmail)}"/>` +
            `</form><script>document.getElementById('f').submit();<\/script></body></html>`
        );
    }

    // ── GET bridge: /exportApproval/reject?token=... ──────────────────────────

    rejectGet(req, res) {
        var token = String(req.query.token || '');
        var approverEmail = String(req.query.approverEmail || '');
        var esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return res.send(
            `<!DOCTYPE html><html><head><title>Rejecting...</title></head><body>` +
            `<form method="POST" action="/exportApproval/reject" id="f">` +
            `<input type="hidden" name="token" value="${esc(token)}"/>` +
            `<input type="hidden" name="approverEmail" value="${esc(approverEmail)}"/>` +
            `</form><script>document.getElementById('f').submit();<\/script></body></html>`
        );
    }

    // ── GET /exportApproval/download?token=... ────────────────────────────────

    async downloadGet(req, res) {
        var client;
        try {
            var token = String(req.query.token || '').trim();
            if (!token) {
                return res.status(400).send('Missing token.');
            }

            client = new MongoClient(MONGO_URI);
            await client.connect();
            var db = client.db(DB_NAME);

            var record = await db.collection(COLLECTION).findOne({ token });
            if (!record) {
                return res.status(404).send('File not found.');
            }

            var excelBuffer = getExcelBufferFromRecord(record);
            if (!excelBuffer) {
                return res.status(404).send('No export file available for this request.');
            }

            var safeFileName = String(record.fileName || 'Export.xlsx').replace(/[\r\n"]/g, '_');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
            return res.send(excelBuffer);
        } catch (err) {
            console.error('downloadGet error:', err);
            return res.status(500).send('Internal server error.');
        } finally {
            if (client) await client.close();
        }
    }

    // ── POST /exportApproval/approve ─────────────────────────────────────────

    async approvePost(req, res) {
        var client;
        try {
            var token         = String(req.body.token || '').trim();
            var approverEmail = String(req.body.approverEmail || '').trim().toLowerCase();

            if (!token) {
                return res.status(400).send(htmlPage('Error', 'Missing token.', '#dc3545'));
            }

            client = new MongoClient(MONGO_URI);
            await client.connect();
            var db = client.db(DB_NAME);

            var record = await db.collection(COLLECTION).findOne({ token });
            if (!record) {
                return res.status(404).send(htmlPage('Not Found', 'Approval request not found.', '#dc3545'));
            }
            if (record.status !== 'pending') {
                return res.send(htmlPage('Already Processed', `This request has already been ${record.status}.`, '#6c757d'));
            }

            // If approverEmail wasn't passed (clicked directly), default to the known approvers
            if (!approverEmail || !APPROVER_EMAILS.includes(approverEmail)) {
                approverEmail = APPROVER_EMAILS[0];
            }

            var approverName = resolveApproverName(approverEmail);
            var { date, time } = getSingaporeDateTime();

            await db.collection(COLLECTION).updateOne(
                { token },
                {
                    $set: {
                        status:          'approved',
                        approvedAt:      new Date(),
                        approvedByEmail: approverEmail,
                        approvedByName:  approverName,
                        decisionDate:    date,
                        decisionTime:    time,
                    },
                }
            );

            var excelBuffer = getExcelBufferFromRecord(record);

            // Email 2: to requester (approved, with Excel attached)
            await sendExportApprovalDecisionEmail({
                requesterName:  record.requesterName,
                requesterEmail: record.requesterEmail,
                approverName,
                approverEmail,
                exportType:     record.exportType,
                courseType:     record.courseType,
                recordCount:    record.recordCount,
                fileName:       record.fileName,
                currentDate:    date,
                currentTime:    time,
                decision:       'approved',
                excelBuffer,
            });

            // Email 3: to supervisors
            await sendExportApprovalSummaryEmail({
                requesterName:  record.requesterName,
                requesterEmail: record.requesterEmail,
                approverName,
                approverEmail,
                exportType:     record.exportType,
                courseType:     record.courseType,
                recordCount:    record.recordCount,
                fileName:       record.fileName,
                currentDate:    date,
                currentTime:    time,
                decision:       'approved',
                supervisorEmails: APPROVER_EMAILS,
            });

            return res.send(htmlPage(
                'Export Approved',
                `The export has been approved. ${record.requesterName} has been notified with the file attached.`,
                '#28a745'
            ));

        } catch (err) {
            console.error('approvePost error:', err);
            return res.status(500).send(htmlPage('Error', 'An unexpected error occurred.', '#dc3545'));
        } finally {
            if (client) await client.close();
        }
    }

    // ── POST /exportApproval/reject ──────────────────────────────────────────

    async rejectPost(req, res) {
        var client;
        try {
            var token         = String(req.body.token || '').trim();
            var approverEmail = String(req.body.approverEmail || '').trim().toLowerCase();

            if (!token) {
                return res.status(400).send(htmlPage('Error', 'Missing token.', '#dc3545'));
            }

            client = new MongoClient(MONGO_URI);
            await client.connect();
            var db = client.db(DB_NAME);

            var record = await db.collection(COLLECTION).findOne({ token });
            if (!record) {
                return res.status(404).send(htmlPage('Not Found', 'Approval request not found.', '#dc3545'));
            }
            if (record.status !== 'pending') {
                return res.send(htmlPage('Already Processed', `This request has already been ${record.status}.`, '#6c757d'));
            }

            if (!approverEmail || !APPROVER_EMAILS.includes(approverEmail)) {
                approverEmail = APPROVER_EMAILS[0];
            }

            var approverName = resolveApproverName(approverEmail);
            var { date, time } = getSingaporeDateTime();

            await db.collection(COLLECTION).updateOne(
                { token },
                {
                    $set: {
                        status:           'rejected',
                        rejectedAt:       new Date(),
                        rejectedByEmail:  approverEmail,
                        rejectedByName:   approverName,
                        decisionDate:     date,
                        decisionTime:     time,
                    },
                }
            );

            // Email 2: to requester (rejected, no attachment)
            await sendExportApprovalDecisionEmail({
                requesterName:  record.requesterName,
                requesterEmail: record.requesterEmail,
                approverName,
                approverEmail,
                exportType:     record.exportType,
                courseType:     record.courseType,
                recordCount:    record.recordCount,
                fileName:       record.fileName,
                currentDate:    date,
                currentTime:    time,
                decision:       'rejected',
                excelBuffer:    null,
            });

            // Email 3: to supervisors
            await sendExportApprovalSummaryEmail({
                requesterName:  record.requesterName,
                requesterEmail: record.requesterEmail,
                approverName,
                approverEmail,
                exportType:     record.exportType,
                courseType:     record.courseType,
                recordCount:    record.recordCount,
                fileName:       record.fileName,
                currentDate:    date,
                currentTime:    time,
                decision:       'rejected',
                supervisorEmails: APPROVER_EMAILS,
            });

            return res.send(htmlPage(
                'Export Rejected',
                `The export has been rejected. ${record.requesterName} has been notified.`,
                '#dc3545'
            ));

        } catch (err) {
            console.error('rejectPost error:', err);
            return res.status(500).send(htmlPage('Error', 'An unexpected error occurred.', '#dc3545'));
        } finally {
            if (client) await client.close();
        }
    }
}

module.exports = ExportApprovalController;
