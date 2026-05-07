/**
 * nsaApprovalRequestEmail.js
 * Purpose: Build and send the NSA Approval Request email to the approver (Moses Lee).
 * Sent when a staff member queues changes and clicks "Send Approval Email" in the
 * Registration & Payment table. Each change is presented as a table row with
 * individual Approve / Reject links, plus "Approve All" / "Reject All" batch buttons.
 *
 * Triggered by NsaApprovalController → sendApprovalEmail().
 */

var Email = require('./Email');

/**
 * Builds and sends the NSA Approval Request email.
 *
 * @param {object} params
 * @param {string}   params.fromName        - Staff member requesting approval
 * @param {string}   params.fromEmail       - Staff member's email (used as reply-to)
 * @param {string}   params.recipientName   - Approver's display name
 * @param {string[]} params.recipientEmails - Approver email address(es)
 * @param {string}   params.currentDate     - Formatted date string (DD/MM/YYYY)
 * @param {string}   params.currentTime     - Formatted time string (HH:mm)
 * @param {Array}    params.allChanges      - Array of change objects
 * @param {string[]} params.tokenList       - Per-change tokens (same order as allChanges)
 * @param {string}   params.batchId         - Batch UUID for approve-all / reject-all
 * @param {string}   params.additionalNotes - Optional freeform notes from requester
 * @param {string}   params.baseUrl         - Backend base URL for action links
 */
function sendNsaApprovalRequestEmail({
    fromName,
    fromEmail,
    recipientName,
    recipientEmails,
    currentDate,
    currentTime,
    allChanges,
    tokenList,
    batchId,
    additionalNotes,
    baseUrl,
}) {
  // ── Group changes by participant for the email table ──────────────────────
  var participantGroups = {};
  allChanges.forEach(function(ch, idx) {
    var key = ch.registrationId || '_unknown';
    if (!participantGroups[key]) participantGroups[key] = { info: ch, rows: [] };
    participantGroups[key].rows.push({ ch: ch, token: tokenList[idx] });
  });

    var cleanEmail = function(email) {
        var raw = String(email || '').trim();
        if (!raw) return '';
        var norm = raw.toLowerCase();
        if (norm === 'na' || norm === 'n/a' || norm === '<na>' || norm === 'null' || norm === '-') return '';
        return raw;
    };

    var buildTableRows = function(approverEmail) {
        var tableRows = '';
        for (var group of Object.values(participantGroups)) {
            var pEmail = cleanEmail(group.info.participantEmail);
            tableRows += `
      <tr>
        <td colspan="7" style="padding:7px 10px;border:1px solid #ddd;background:#e8f0ff;font-weight:bold;color:#1a3a6b;">
          ${group.info.participantName || 'Unknown'}${pEmail ? ` &lt;${pEmail}&gt;` : ''}&nbsp;&nbsp;<span style="font-weight:normal;color:#555;font-size:12px;">${group.info.courseName || ''}${group.info.courseLocation ? ' &middot; ' + group.info.courseLocation : ''}</span>
        </td>
      </tr>`;
            for (var row of group.rows) {
                var approveUrl = `${baseUrl}/nsaApproval/approve?token=${row.token}&approverEmail=${encodeURIComponent(approverEmail || '')}`;
                var rejectUrl  = `${baseUrl}/nsaApproval/reject?token=${row.token}&approverEmail=${encodeURIComponent(approverEmail || '')}`;
                tableRows += `
      <tr>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;color:#888;">${row.ch.sn || ''}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#fff3cd;color:#856404;font-weight:bold;">${row.ch.columnName}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;">${row.ch.currentValue || '&mdash;'}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#e8f5e9;color:#2e7d32;font-weight:bold;">${row.ch.newValue}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;color:#555;font-size:12px;">${row.ch.reason}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;">
          <a href="${approveUrl}" style="display:inline-block;padding:5px 10px;background:#28a745;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;font-size:12px;">&#10003; Approve</a>
        </td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;">
          <a href="${rejectUrl}" style="display:inline-block;padding:5px 10px;background:#dc3545;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;font-size:12px;">&#10005; Reject</a>
        </td>
      </tr>`;
            }
        }
        return tableRows;
    };

    var buildBatchActionsHtml = function(approverEmail) {
        var approveAllUrl = `${baseUrl}/nsaApproval/approve-all?batchId=${batchId}&approverEmail=${encodeURIComponent(approverEmail || '')}`;
        var rejectAllUrl  = `${baseUrl}/nsaApproval/reject-all?batchId=${batchId}&approverEmail=${encodeURIComponent(approverEmail || '')}`;
        return `
    <a href="${approveAllUrl}" style="display:inline-block;padding:9px 20px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;font-size:13px;margin-bottom:12px;margin-right:8px;">&#10003; Approve All (${allChanges.length})</a>
    <a href="${rejectAllUrl}" style="display:inline-block;padding:9px 20px;background:#c62828;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;font-size:13px;margin-bottom:12px;">&#10005; Reject All (${allChanges.length})</a>`;
    };

    var notesLine = additionalNotes
        ? `<p style="margin:8px 0 0;font-size:12px;color:#555;"><strong>Notes:</strong> ${String(additionalNotes).replace(/\n/g, '<br/>')}</p>`
        : '';

    // ── Subject & body ────────────────────────────────────────────────────────
    var changeWord = allChanges.length === 1 ? 'change' : 'changes';
    var subject = `[NSA Approval] - ${fromName} requested ${allChanges.length} ${changeWord} (${currentDate} ${currentTime})`;

    var buildBody = function(approverEmail) {
    var tableRows = buildTableRows(approverEmail);
    var batchActionsHtml = buildBatchActionsHtml(approverEmail);
    return `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:720px;">
  <p style="margin:0 0 6px;">Dear ${recipientName},</p>
  <p style="margin:0 0 12px;"><strong>${fromName}</strong> is requesting approval to edit ${allChanges.length > 1 ? allChanges.length + ' fields' : 'a field'}.</p>
  ${batchActionsHtml}
  <div style="max-height:320px;overflow-y:auto;overflow-x:auto;border:1px solid #ccc;margin-bottom:8px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:680px;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:32px;position:sticky;top:0;z-index:3;background:#f2f2f2;">S/N</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;width:16%;position:sticky;top:0;z-index:3;background:#f2f2f2;">Field</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;position:sticky;top:0;z-index:3;background:#f2f2f2;">Current Value</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;position:sticky;top:0;z-index:3;background:#f2f2f2;">New Value</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;position:sticky;top:0;z-index:3;background:#f2f2f2;">Reason</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:96px;position:sticky;top:0;z-index:3;background:#f2f2f2;">Approve</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:96px;position:sticky;top:0;z-index:3;background:#f2f2f2;">Reject</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>
  ${notesLine}
  <p style="font-size:11px;color:#aaa;margin-top:16px;">Each Approve/Reject link expires in 7 days. Reply to this email to contact ${fromName}.</p>
  </div>`;
    };

    // ── Send one personalized email per approver (for click tracking) ────────
    var sendEmail = new Email();
    (recipientEmails || []).forEach(function(recipientEmail) {
      sendEmail.sendEmailToReceipent(recipientEmail, subject, buildBody(recipientEmail), fromEmail || undefined);
    });
}

module.exports = { sendNsaApprovalRequestEmail };
