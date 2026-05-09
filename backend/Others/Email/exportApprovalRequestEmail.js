/**
 * exportApprovalRequestEmail.js
 * Email 1: Sent to approvers when Testing A / Testing B requests an export.
 * Contains the Excel attachment and individual Approve / Reject links.
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
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
 * @param {string}   params.requesterName      - Display name of requester
 * @param {string}   params.requesterEmail     - Email of requester
 * @param {string}   params.exportType         - "LOP" | "Attendance"
 * @param {string}   params.courseType         - "NSA" | "ILP"
 * @param {number}   params.recordCount        - Number of records in export
 * @param {string}   params.fileName           - Excel file name
 * @param {string}   params.currentDate        - Formatted date string
 * @param {string}   params.currentTime        - Formatted time string
 * @param {string[]} params.approverEmails     - List of approver email addresses
 * @param {string}   params.token              - Unique approval token
 * @param {string}   params.baseUrl            - Backend base URL
 * @param {string}   params.downloadUrl        - Direct download URL for the exported file
 * @param {number}   params.inlineAttachmentMaxBytes - Max bytes allowed for inline attachment
 * @param {Buffer}   params.excelBuffer        - Excel file buffer for attachment
 */
async function sendExportApprovalRequestEmail({
    requesterName,
    requesterEmail,
    exportType,
    courseType,
    recordCount,
    fileName,
    currentDate,
    currentTime,
    approverEmails,
    token,
    baseUrl,
    downloadUrl,
    inlineAttachmentMaxBytes,
    excelBuffer,
}) {
    const approveUrl = `${baseUrl}/exportApproval/approve?token=${encodeURIComponent(token)}`;
    const rejectUrl  = `${baseUrl}/exportApproval/reject?token=${encodeURIComponent(token)}`;

    const typeLabel = exportType === 'LOP' ? 'List of Participants (LOP)' : 'Attendance';
    const maxInlineBytes = Number(inlineAttachmentMaxBytes) || (2 * 1024 * 1024);
    const canInlineAttach = !!excelBuffer && excelBuffer.length <= maxInlineBytes;
    const resolvedDownloadUrl = downloadUrl || `${baseUrl}/exportApproval/download?token=${encodeURIComponent(token)}`;
    const attachmentSectionHtml = canInlineAttach
      ? `<p style="margin:0 0 8px;color:#555;font-size:13px;">The Excel file is attached to this email. Please review it and click <strong>Approve</strong> or <strong>Reject</strong> below.</p>`
      : `<p style="margin:0 0 8px;color:#555;font-size:13px;">The export file is large, so it is provided via secure download for faster delivery:</p>
         <p style="margin:0 0 14px;"><a href="${resolvedDownloadUrl}" style="color:#1a3a6b;font-weight:bold;">Download Export File</a></p>`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8;">
<div style="max-width:680px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">

  <div style="background:#1a3a6b;padding:24px 32px;">
    <h2 style="margin:0;color:#fff;font-size:20px;">Export Approval Request</h2>
    <p style="margin:4px 0 0;color:#ccd9f0;font-size:13px;">${esc(currentDate)} &nbsp;|&nbsp; ${esc(currentTime)}</p>
  </div>

  <div style="padding:24px 32px;">
    <p style="margin:0 0 16px;color:#333;">
      <strong>${esc(requesterName)}</strong> (<a href="mailto:${esc(requesterEmail)}" style="color:#1a3a6b;">${esc(requesterEmail)}</a>)
      has requested approval to export the following:
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr style="background:#f2f5fb;">
        <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;width:40%;color:#444;">Export Type</td>
        <td style="padding:10px 14px;border:1px solid #dde3ef;color:#1a3a6b;font-weight:bold;">${esc(typeLabel)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Course Type</td>
        <td style="padding:10px 14px;border:1px solid #dde3ef;">${esc(courseType)}</td>
      </tr>
      <tr style="background:#f2f5fb;">
        <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Number of Records</td>
        <td style="padding:10px 14px;border:1px solid #dde3ef;">${esc(String(recordCount))}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">File Name</td>
        <td style="padding:10px 14px;border:1px solid #dde3ef;font-size:12px;color:#555;">${esc(fileName)}</td>
      </tr>
    </table>

    ${attachmentSectionHtml}

    <div style="text-align:center;margin:28px 0;">
      <a href="${approveUrl}" style="display:inline-block;padding:12px 32px;background:#28a745;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;font-size:15px;margin-right:16px;">&#10003; Approve</a>
      <a href="${rejectUrl}"  style="display:inline-block;padding:12px 32px;background:#dc3545;color:#fff;text-decoration:none;border-radius:5px;font-weight:bold;font-size:15px;">&#10007; Reject</a>
    </div>

    <p style="margin:16px 0 0;color:#999;font-size:11px;text-align:center;">Clicking Approve will send the Excel file to the requester. Clicking Reject will notify the requester of the rejection.</p>
  </div>

  <div style="background:#f4f6f8;padding:14px 32px;text-align:center;">
    <p style="margin:0;color:#aaa;font-size:11px;">ECSS CMS &mdash; Export Approval System</p>
  </div>
</div>
</body>
</html>`;

    const mailOptions = {
      from: 'it@ecss.org.sg',
      to: approverEmails.join(', '),
      subject: `[Export Approval Request] ${typeLabel} - ${requesterName} - ${currentDate}`,
      html,
    };

    if (canInlineAttach) {
      mailOptions.attachments = [
        {
          filename: fileName,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);

        const accepted = Array.isArray(info?.accepted) ? info.accepted : [];
        const rejected = Array.isArray(info?.rejected) ? info.rejected : [];
        console.log('[EXPORT-APPROVAL][REQUEST] Mail result:', {
          messageId: info?.messageId,
          accepted,
          rejected,
          response: info?.response,
        });

        if (accepted.length === 0) {
          throw new Error(`Export approval request email not accepted by SMTP. Rejected: ${rejected.join(', ') || 'unknown recipient error'}`);
        }

        return {
          messageId: info?.messageId,
          accepted,
          rejected,
          response: info?.response,
        };
}

module.exports = { sendExportApprovalRequestEmail };
