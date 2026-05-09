/**
 * ExportNotificationController.js
 * Handles export notification emails for supervisor accounts
 * (moses_lee@ecss.org.sg, peipei_low@ecss.org.sg, rosalind_ong@ecss.org.sg).
 *
 * Flow:
 *   1. Supervisor clicks Export LOP / Export Attendance → frontend shows modal.
 *   2. Supervisor confirms → Excel downloads to their machine AND frontend calls
 *      POST /exportNotification { purpose: 'sendExportNotification', ... }.
 *   3. This controller sends a notification email to all 3 supervisors.
 */

const { sendSupervisorExportNotificationEmail } = require('../../Others/Email/supervisorExportNotificationEmail');

const SUPERVISOR_EMAILS = [
    'moses_lee@ecss.org.sg',
    'peipei_low@ecss.org.sg',
    'rosalind_ong@ecss.org.sg',
];

function getSingaporeDateTime() {
    const now = new Date();
    const sg  = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${pad(sg.getDate())}/${pad(sg.getMonth() + 1)}/${sg.getFullYear()}`;
    const time = `${pad(sg.getHours())}:${pad(sg.getMinutes())}`;
    return { date, time };
}

class ExportNotificationController {
    /**
     * POST /exportNotification
     * Body: { purpose, exporterName, exporterEmail, exportType, courseType, recordCount, fileName }
     */
    async sendExportNotification(req, res) {
        try {
            const {
                exporterName,
                exporterEmail,
                exportType,
                courseType,
                recordCount,
                fileName,
            } = req.body;

            if (!exporterEmail || !exportType || !courseType || !fileName) {
                return res.status(400).json({ result: false, message: 'Missing required fields.' });
            }

            const { date, time } = getSingaporeDateTime();

            await sendSupervisorExportNotificationEmail({
                exporterName:   exporterName || exporterEmail,
                exporterEmail:  exporterEmail,
                exportType:     exportType,
                courseType:     courseType,
                recordCount:    recordCount || 0,
                fileName:       fileName,
                currentDate:    date,
                currentTime:    time,
                recipientEmails: SUPERVISOR_EMAILS,
            });

            return res.json({ result: true, message: 'Export notification sent successfully.' });
        } catch (err) {
            console.error('[ExportNotificationController] sendExportNotification error:', err);
            return res.status(500).json({ result: false, message: 'Failed to send export notification: ' + err.message });
        }
    }
}

module.exports = ExportNotificationController;
