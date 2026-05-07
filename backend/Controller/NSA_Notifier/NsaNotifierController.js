var { MongoClient, ObjectId } = require('mongodb');
var { sendNsaNotifierEmail } = require('../../Others/Email/nsaNotifierEmail');

const MONGO_URI = "mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System";
const DB_NAME = "Company-Management-System";
const COLLECTION = 'NSA_Notifier_Changes';
const REGISTRATION_COLLECTION = 'Registration Forms';

const NSA_NOTIFIER_RECIPIENTS = ['moses_lee@ecss.org.sg', 'rosalind_ong@ecss.org.sg', 'peipei_low@ecss.org.sg'];

function getCurrentDateTime() {
    var now = new Date();
    var day = String(now.getDate()).padStart(2, '0');
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var year = now.getFullYear();
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');

    return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}:${seconds}`,
    };
}

async function appendNotifierReasonsToRemarks(db, registrationId, reasonTexts) {
    var reasons = Array.isArray(reasonTexts)
        ? reasonTexts.map(function(r) { return String(r || '').trim(); }).filter(Boolean)
        : [];
    if (!reasons.length) return;

    var filter;
    try {
        filter = { _id: new ObjectId(registrationId) };
    } catch (_) {
        return;
    }

    var table = db.collection(REGISTRATION_COLLECTION);
    var row = await table.findOne(filter, { projection: { 'official.remarks': 1 } });
    if (!row) return;

    var existing = String(row.official?.remarks || '').trim();
    var lines = existing
        ? existing.split(/\r?\n/).map(function(l) { return String(l || '').trim(); }).filter(Boolean)
        : [];

    var maxNo = 0;
    for (var i = 0; i < lines.length; i++) {
        var match = lines[i].match(/^(\d+)\)\s+/);
        if (match) {
            var no = parseInt(match[1], 10) || 0;
            if (no > maxNo) maxNo = no;
        }
    }

    var numbered = reasons.map(function(reason, idx) {
        return `${maxNo + idx + 1}) ${reason}`;
    });

    var nextRemarks = existing ? `${existing}\n${numbered.join('\n')}` : numbered.join('\n');
    await table.updateOne(filter, { $set: { 'official.remarks': nextRemarks } });
}

class NsaNotifierController {
    /**
     * Sends notifier email for multiple changes to the 3 approvers.
     * Logs changes to database ONLY AFTER email is successfully sent.
     * 
     * @param {object} req
     * @param {object} req.body
     * @param {string} req.body.purpose - 'sendNotifierEmail'
     * @param {string} req.body.fromName - Staff member name
     * @param {string} req.body.fromEmail - Staff member email
     * @param {string} req.body.currentDate - DD/MM/YYYY
     * @param {string} req.body.currentTime - HH:mm
     * @param {Array} req.body.changes - Array of change objects
     */
    async sendNotifierEmail(req, res) {
        var { fromName, fromEmail, currentDate, currentTime, changes } = req.body;

        if (!fromName || !currentDate || !currentTime || !Array.isArray(changes) || changes.length === 0) {
            return res.status(400).json({ result: false, message: 'Missing required fields' });
        }

        var mongoClient = new MongoClient(MONGO_URI);
        try {
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);

            // FIRST: Send email
            try {
                sendNsaNotifierEmail({
                    recipientEmails: NSA_NOTIFIER_RECIPIENTS,
                    changedByName: fromName,
                    changedByEmail: fromEmail,
                    changeDate: currentDate,
                    changeTime: currentTime,
                    changes: changes,
                });
            } catch (emailError) {
                console.error('Error sending NSA notifier email:', emailError);
                return res.status(500).json({ result: false, message: 'Failed to send notifier email' });
            }

            // AFTER email sent successfully: Log to database
            try {
                var reasonsByRegistration = {};
                changes.forEach(function(change) {
                    var registrationId = String(change.registrationId || '').trim();
                    var reason = String(change.reason || '').trim();
                    if (!registrationId || !reason) return;
                    if (!reasonsByRegistration[registrationId]) reasonsByRegistration[registrationId] = [];
                    reasonsByRegistration[registrationId].push(reason);
                });

                var registrationIds = Object.keys(reasonsByRegistration);
                for (var i = 0; i < registrationIds.length; i++) {
                    var registrationId = registrationIds[i];
                    await appendNotifierReasonsToRemarks(db, registrationId, reasonsByRegistration[registrationId]);
                }

                var logDocs = changes.map(function(change) {
                    return {
                        type: 'registration-payment-change',
                        changedByName: fromName,
                        changedByEmail: fromEmail || '',
                        changeDate: currentDate,
                        changeTime: currentTime,
                        registrationId: change.registrationId || '',
                        sn: change.sn || '',
                        participantName: change.participantName || '',
                        participantEmail: change.participantEmail || '',
                        courseName: change.courseName || '',
                        courseLocation: change.courseLocation || '',
                        columnName: change.columnName || '',
                        oldValue: change.oldValue || '',
                        newValue: change.newValue || '',
                        reason: change.reason || '', // Store reason field
                        recipients: NSA_NOTIFIER_RECIPIENTS,
                        createdAt: new Date(),
                    };
                });

                await db.collection(COLLECTION).insertMany(logDocs);
            } catch (logError) {
                console.error('Error logging NSA notifier changes:', logError);
                // Email was sent successfully, so still return success even if logging fails
            }

            return res.json({
                result: true,
                message: 'Notifier email sent and changes logged',
                changesCount: changes.length,
                recipients: NSA_NOTIFIER_RECIPIENTS.length,
            });
        } catch (error) {
            console.error('sendNotifierEmail error:', error);
            return res.status(500).json({ result: false, message: 'Failed to process NSA notifier' });
        } finally {
            await mongoClient.close();
        }
    }
}

module.exports = NsaNotifierController;
