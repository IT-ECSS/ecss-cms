var Email = require('./Email');

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Sends NSA Notifier email to approvers about changes made in Registration & Payment table.
 * @param {object} params
 * @param {string}   params.recipientEmails - Comma-separated email addresses or array
 * @param {string}   params.changedByName - Name of staff who made changes
 * @param {string}   params.changedByEmail - Email of staff who made changes
 * @param {string}   params.changeDate - Formatted date (DD/MM/YYYY)
 * @param {string}   params.changeTime - Formatted time (HH:mm)
 * @param {Array}    params.changes - Array of change objects { participantName, courseName, courseLocation, columnName, oldValue, newValue, sn }
 */
function sendNsaNotifierEmail({ recipientEmails, changedByName, changedByEmail, changeDate, changeTime, changes }) {
    if (!changes || changes.length === 0) return;

    var changeWord = changes.length === 1 ? 'change' : 'changes';
    var subject = `[NSA Notifier] ${changedByName || 'Staff'} made ${changes.length} ${changeWord} to Registration & Payment (${changeDate} ${changeTime})`;

    var changeRows = changes.map(change => `
        <tr>
          <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;color:#888;">${escapeHtml(change.sn || '')}</td>
          <td style="padding:7px 10px;border:1px solid #ddd;">${escapeHtml(change.participantName || '')}</td>
          <td style="padding:7px 10px;border:1px solid #ddd;">${escapeHtml(change.courseName || '')}${change.courseLocation ? ` &middot; ${escapeHtml(change.courseLocation)}` : ''}</td>
          <td style="padding:7px 10px;border:1px solid #ddd;background:#fff3cd;color:#856404;font-weight:bold;">${escapeHtml(change.columnName || '')}</td>
          <td style="padding:7px 10px;border:1px solid #ddd;color:#555;">${escapeHtml(change.oldValue ?? '—')}</td>
          <td style="padding:7px 10px;border:1px solid #ddd;background:#e8f5e9;color:#2e7d32;font-weight:bold;">${escapeHtml(change.newValue ?? '')}</td>
          <td style="padding:7px 10px;border:1px solid #ddd;color:#444;">${escapeHtml(change.reason ?? '—')}</td>
        </tr>
    `).join('');

    var body = `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:760px;">
  <p style="margin:0 0 6px;">Dear Approval Team,</p>
  <p style="margin:0 0 12px;">
    <strong>${escapeHtml(changedByName || 'Staff')}</strong>${changedByEmail ? ` (&lt;${escapeHtml(changedByEmail)}&gt;)` : ''}
    made ${changes.length} ${changeWord} in the Registration &amp; Payment Table.
  </p>

  <p style="margin:0 0 10px;font-size:12px;color:#555;">
    Date: <strong>${escapeHtml(changeDate)}</strong> &nbsp;|&nbsp;
    Time: <strong>${escapeHtml(changeTime)}</strong>
  </p>

  <div style="max-height:400px;overflow-y:auto;border:1px solid #ccc;margin-bottom:8px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:860px;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:32px;">S/N</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Participant</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Course</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Field</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Old Value</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">New Value</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Reason</th>
        </tr>
      </thead>
      <tbody>
        ${changeRows}
      </tbody>
    </table>
  </div>

  <p style="font-size:11px;color:#888;margin-top:16px;">This is an automated NSA notifier alert from the Registration & Payment system.</p>
</div>`;

    var email = new Email();
    var recipients = Array.isArray(recipientEmails) ? recipientEmails.join(', ') : recipientEmails;
    email.sendEmailToReceipent(recipients, subject, body, changedByEmail || undefined);
}

module.exports = {
    sendNsaNotifierEmail,
};
