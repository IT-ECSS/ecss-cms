/**
 * exportApprovalSummaryEmail.js
 * Email 3: Sent to supervisors (moses_lee, peipei_low, rosalind_ong) once an
 * approver approves or rejects the export, stating who performed the action.
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
 * @param {string}   params.requesterEmail   - Email of requester
 * @param {string}   params.approverName     - Name of the person who acted
 * @param {string}   params.approverEmail    - Email of the person who acted
 * @param {string}   params.exportType       - "LOP" | "Attendance"
 * @param {string}   params.courseType       - "NSA" | "ILP"
 * @param {number}   params.recordCount      - Number of records
 * @param {string}   params.fileName         - Excel file name
 * @param {string}   params.currentDate      - Decision date
 * @param {string}   params.currentTime      - Decision time
 * @param {'approved'|'rejected'} params.decision
 * @param {string[]} params.supervisorEmails - Recipient supervisor emails
 */
async function sendExportApprovalSummaryEmail({
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
    supervisorEmails,
}) {
    const typeLabel  = exportType === 'LOP' ? 'List of Participants (LOP)' : 'Attendance';
    const isApproved = decision === 'approved';
    const actionWord = isApproved ? 'Approved' : 'Rejected';
    const headerBg   = isApproved ? '#1565C0' : '#b71c1c';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f8;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">

  <div style="background:${headerBg};padding:24px 32px;">
    <h2 style="margin:0;color:#fff;font-size:20px;">Export ${actionWord} &mdash; Action Summary</h2>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;">${esc(currentDate)} &nbsp;|&nbsp; ${esc(currentTime)}</p>
  </div>

  <div style="padding:24px 32px;">
    <p style="margin:0 0 16px;color:#333;">
      This is an automated notification. The following export request has been <strong>${actionWord.toLowerCase()}</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr style="background:#f2f5fb;">
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;width:40%;color:#444;">Action</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:${isApproved ? '#2e7d32' : '#c62828'};">${actionWord}</td>
      </tr>
      <tr>
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Actioned By</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(approverName)} &lt;<a href="mailto:${esc(approverEmail)}" style="color:#1a3a6b;">${esc(approverEmail)}</a>&gt;</td>
      </tr>
      <tr style="background:#f2f5fb;">
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Requested By</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(requesterName)} &lt;<a href="mailto:${esc(requesterEmail)}" style="color:#1a3a6b;">${esc(requesterEmail)}</a>&gt;</td>
      </tr>
      <tr>
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Export Type</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(typeLabel)}</td>
      </tr>
      <tr style="background:#f2f5fb;">
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Course Type</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(courseType)}</td>
      </tr>
      <tr>
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">Records</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;">${esc(String(recordCount))}</td>
      </tr>
      <tr style="background:#f2f5fb;">
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-weight:bold;color:#444;">File Name</td>
        <td style="padding:9px 14px;border:1px solid #dde3ef;font-size:12px;color:#555;">${esc(fileName)}</td>
      </tr>
    </table>
  </div>

  <div style="background:#f4f6f8;padding:14px 32px;text-align:center;">
    <p style="margin:0;color:#aaa;font-size:11px;">ECSS CMS &mdash; Export Approval System</p>
  </div>
</div>
</body>
</html>`;

    const info = await transporter.sendMail({
        from: 'it@ecss.org.sg',
        to: supervisorEmails.join(', '),
      subject: `[Export ${actionWord}] ${typeLabel} - ${actionWord} by ${approverName} - ${currentDate}`,
        html,
    });

    const accepted = Array.isArray(info?.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info?.rejected) ? info.rejected : [];
    console.log('[EXPORT-APPROVAL][SUMMARY] Mail result:', {
      messageId: info?.messageId,
      accepted,
      rejected,
      response: info?.response,
    });

    if (accepted.length === 0) {
      throw new Error(`Export approval summary email not accepted by SMTP. Rejected: ${rejected.join(', ') || 'unknown recipient error'}`);
    }
}

module.exports = { sendExportApprovalSummaryEmail };
