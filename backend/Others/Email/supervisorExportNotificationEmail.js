/**
 * supervisorExportNotificationEmail.js
 * Sent to all 3 supervisors when one of them downloads an export.
 * Notifies the group of who exported what and when.
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'it@ecss.org.sg',
        pass: 'wvlpeatgusnldwis',
    },
});

function esc(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * @param {object} params
 * @param {string}   params.exporterName      - Display name of the supervisor who exported
 * @param {string}   params.exporterEmail     - Email of the supervisor who exported
 * @param {string}   params.exportType        - "LOP" | "Attendance"
 * @param {string}   params.courseType        - "NSA" | "ILP"
 * @param {number}   params.recordCount       - Number of records exported
 * @param {string}   params.fileName          - Excel file name
 * @param {string}   params.currentDate       - Formatted date string (DD/MM/YYYY)
 * @param {string}   params.currentTime       - Formatted time string (HH:MM)
 * @param {string[]} params.recipientEmails   - All 3 supervisor emails to notify
 */
async function sendSupervisorExportNotificationEmail({
    exporterName,
    exporterEmail,
    exportType,
    courseType,
    recordCount,
    fileName,
    currentDate,
    currentTime,
    recipientEmails,
}) {
    const typeLabel = exportType === 'LOP' ? 'List of Participants (LOP)' : 'Attendance';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8;">
<div style="max-width:680px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">

  <!-- Header -->
  <div style="background:#1a3a6b;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">ECSS Export Notification</h1>
    <p style="margin:6px 0 0;color:#ccd9f0;font-size:13px;">Supervisor Export Activity Log</p>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:14px;color:#333;">
      This is an automated notification. <strong>${esc(exporterName)}</strong> has downloaded an export from the ECSS CMS system.
    </p>

    <!-- Export Details Table -->
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <thead>
        <tr style="background:#1a3a6b;">
          <th colspan="2" style="padding:10px 14px;color:#fff;text-align:left;font-size:13px;">Export Details</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#f2f5fb;">
          <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;width:40%;">Exported By</td>
          <td style="padding:10px 14px;border:1px solid #dde3ef;color:#333;">${esc(exporterName)} (${esc(exporterEmail)})</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Export Type</td>
          <td style="padding:10px 14px;border:1px solid #dde3ef;color:#1a3a6b;font-weight:bold;">${esc(typeLabel)}</td>
        </tr>
        <tr style="background:#f2f5fb;">
          <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Course Type</td>
          <td style="padding:10px 14px;border:1px solid #dde3ef;color:#333;">${esc(courseType)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Number of Records</td>
          <td style="padding:10px 14px;border:1px solid #dde3ef;color:#333;">${esc(String(recordCount))}</td>
        </tr>
        <tr style="background:#f2f5fb;">
          <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">File Name</td>
          <td style="padding:10px 14px;border:1px solid #dde3ef;color:#555;font-size:12px;word-break:break-all;">${esc(fileName)}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Date &amp; Time</td>
          <td style="padding:10px 14px;border:1px solid #dde3ef;color:#333;">${esc(currentDate)} at ${esc(currentTime)} (SGT)</td>
        </tr>
      </tbody>
    </table>

    <p style="margin:0;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px;">
      This notification was sent automatically by the ECSS Company Management System.
      No action is required.
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#f0f4f8;padding:16px 32px;border-top:1px solid #e0e8f0;">
    <p style="margin:0;font-size:11px;color:#999;text-align:center;">
      © ${new Date().getFullYear()} En Community Service Society. All rights reserved.
    </p>
  </div>
</div>
</body>
</html>`;

    const info = await transporter.sendMail({
        from: '"ECSS CMS" <it@ecss.org.sg>',
        to: recipientEmails.join(', '),
        subject: `[ECSS Export] ${exporterName} downloaded ${typeLabel} (${courseType}) – ${currentDate}`,
        html,
    });

    console.log('[supervisorExportNotificationEmail] messageId:', info.messageId);
    console.log('[supervisorExportNotificationEmail] accepted:', info.accepted);
    if (!info.accepted || info.accepted.length === 0) {
        throw new Error('Supervisor export notification email was not accepted by SMTP server.');
    }
    return info;
}

module.exports = { sendSupervisorExportNotificationEmail };
