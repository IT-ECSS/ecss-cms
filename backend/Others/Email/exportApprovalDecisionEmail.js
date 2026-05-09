/**
 * exportApprovalDecisionEmail.js
 * Email 2: Sent to the requester after an approver approves or rejects the export.
 * On approval the Excel file is re-attached. On rejection only a notice is sent.
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
 * @param {string}   params.requesterName    - Display name of requester
 * @param {string}   params.requesterEmail   - Email of requester (recipient)
 * @param {string}   params.approverName     - Name of the approver
 * @param {string}   params.approverEmail    - Email of the approver
 * @param {string}   params.exportType       - "LOP" | "Attendance"
 * @param {string}   params.courseType       - "NSA" | "ILP"
 * @param {number}   params.recordCount      - Number of records
 * @param {string}   params.fileName         - Excel file name
 * @param {string}   params.currentDate      - Decision date
 * @param {string}   params.currentTime      - Decision time
 * @param {'approved'|'rejected'} params.decision
 * @param {Buffer|null} params.excelBuffer   - Excel buffer (only on approval)
 */
async function sendExportApprovalDecisionEmail({
    requesterName,
    requesterEmail,
    approverName,
    approverEmail,
    exportType,
    courseType,
    recordCount,
    fileName,
    currentDate,
    currentTime,
    decision,
    excelBuffer,
}) {
    const typeLabel  = exportType === 'LOP' ? 'List of Participants (LOP)' : 'Attendance';
    const isApproved = decision === 'approved';

    const headerColor = isApproved ? '#28a745' : '#dc3545';
    const headerTitle = isApproved ? '&#10003; Export Approved' : '&#10007; Export Rejected';
    const bodyMessage = isApproved
        ? `Your export request has been <strong>approved</strong> by <strong>${esc(approverName)}</strong>. The Excel file is attached to this email.`
        : `Your export request has been <strong>rejected</strong> by <strong>${esc(approverName)}</strong>. Please contact your supervisor if you have questions.`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">

  <div style="background:${headerColor};padding:24px 32px;">
    <h2 style="margin:0;color:#fff;font-size:20px;">${headerTitle}</h2>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;">${esc(currentDate)} &nbsp;|&nbsp; ${esc(currentTime)}</p>
  </div>

  <div style="padding:24px 32px;">
    <p style="margin:0 0 20px;color:#333;">Dear ${esc(requesterName)},</p>
    <p style="margin:0 0 20px;color:#333;">${bodyMessage}</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr style="background:#f2f5fb;">
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;width:40%;color:#444;">Export Type</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(typeLabel)}</td>
      </tr>
      <tr>
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Course Type</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(courseType)}</td>
      </tr>
      <tr style="background:#f2f5fb;">
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Records</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(String(recordCount))}</td>
      </tr>
      <tr>
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Decision By</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(approverName)} &lt;<a href="mailto:${esc(approverEmail)}" style="color:#1a3a6b;">${esc(approverEmail)}</a>&gt;</td>
      </tr>
    </table>
  </div>

  <div style="background:#f4f6f8;padding:14px 32px;text-align:center;">
    <p style="margin:0;color:#aaa;font-size:11px;">ECSS CMS &mdash; Export Approval System</p>
  </div>
</div>
</body>
</html>`;

    const mailOptions = {
        from: 'it@ecss.org.sg',
        to: requesterEmail,
        subject: `[${isApproved ? 'Approved' : 'Rejected'}] ${typeLabel} Export - ${currentDate}`,
        html,
    };

    if (isApproved && excelBuffer) {
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
    console.log('[EXPORT-APPROVAL][DECISION] Mail result:', {
      messageId: info?.messageId,
      accepted,
      rejected,
      response: info?.response,
    });

    if (accepted.length === 0) {
      throw new Error(`Export approval decision email not accepted by SMTP. Rejected: ${rejected.join(', ') || 'unknown recipient error'}`);
    }
}

module.exports = { sendExportApprovalDecisionEmail };
