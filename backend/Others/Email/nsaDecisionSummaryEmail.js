var Email = require('./Email');
var { sendNsaDecisionSummaryApproverEmail } = require('./nsaDecisionSummaryApproverEmail');

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderStatusLabel(status) {
    var normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return { text: 'Approved', color: '#2e7d32', bg: '#e8f5e9' };
    if (normalized === 'rejected') return { text: 'Rejected', color: '#c62828', bg: '#ffebee' };
    if (normalized === 'expired') return { text: 'Expired', color: '#6c757d', bg: '#f1f3f5' };
    return { text: 'Pending', color: '#e65100', bg: '#fff3e0' };
}

function hasPendingRows(rows) {
    var now = new Date();
    for (var row of rows) {
        var status = String(row.status || '').toLowerCase();
        if (status !== 'pending') continue;
        if (!row.expiresAt || now <= new Date(row.expiresAt)) {
            return true;
        }
    }
    return false;
}

function groupByRegistration(rows) {
    var grouped = {};
    for (var row of rows) {
        var key = row.registrationId || '_unknown';
        if (!grouped[key]) {
            grouped[key] = {
                participantName: row.participantName || 'Unknown',
                participantEmail: row.participantEmail || '',
                courseName: row.courseName || '',
                courseLocation: row.courseLocation || '',
                rows: []
            };
        }
        grouped[key].rows.push(row);
    }
    return grouped;
}

function buildRowsHtml(approvals) {
    var grouped = groupByRegistration(approvals);
    var tableRows = '';
    var sn = 0;

    for (var group of Object.values(grouped)) {
        tableRows += `
      <tr>
        <td colspan="7" style="padding:7px 10px;border:1px solid #ddd;background:#e8f0ff;font-weight:bold;color:#1a3a6b;">
          ${escapeHtml(group.participantName)}${group.participantEmail ? ` &lt;${escapeHtml(group.participantEmail)}&gt;` : ''}
          <span style="font-weight:normal;color:#555;font-size:12px;">${group.courseName ? ' &nbsp;&nbsp; ' + escapeHtml(group.courseName) : ''}${group.courseLocation ? ' &middot; ' + escapeHtml(group.courseLocation) : ''}</span>
        </td>
      </tr>`;

        for (var row of group.rows) {
            sn++;
            var status = renderStatusLabel(row.status);
            tableRows += `
      <tr>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;color:#888;">${sn}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#fff3cd;color:#856404;font-weight:bold;">${escapeHtml(row.columnName)}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;">${escapeHtml(row.currentValue || row.oldValue || '—')}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#e8f5e9;color:#2e7d32;font-weight:bold;">${escapeHtml(row.newValue)}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;color:#555;font-size:12px;">${escapeHtml(row.reason)}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;background:${status.bg};color:${status.color};font-weight:bold;">${status.text}</td>
      </tr>`;
        }
    }

    return tableRows;
}

async function sendNsaDecisionSummaryEmail(db, batchId) {
    try {
        if (!db || !batchId) return;

        var approvals = await db.collection('NSA_Approvals').find({ batchId }).toArray();
        if (!approvals.length) return;
        if (hasPendingRows(approvals)) return;

        var alreadySent = approvals.some(a => !!a.decisionSummaryEmailSentAt);
        if (alreadySent) return;

        var requesterName = approvals[0].requesterName || approvals[0].requestedBy || 'Requester';
        var requesterEmail = approvals[0].requesterEmail || approvals[0].requestedByEmail;
        var approverEmails = ['moses_lee@ecss.org.sg', 'rosalind_ong@ecss.org.sg', 'peipei_low@ecss.org.sg'];

        var approvedCount = approvals.filter(a => String(a.status).toLowerCase() === 'approved').length;
        var rejectedCount = approvals.filter(a => String(a.status).toLowerCase() === 'rejected').length;
        var rowsHtml = buildRowsHtml(approvals);
        var total = approvals.length;

        var subject = `[NSA Decision Summary] - ${approvedCount} approved, ${rejectedCount} rejected (${total} total)`;
        var body = `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:760px;">
  <p style="margin:0 0 6px;">Dear ${escapeHtml(requesterName)},</p>
  <p style="margin:0 0 12px;">Your NSA approval request has been processed.</p>
  <p style="margin:0 0 10px;font-size:12px;color:#555;">
    <strong style="color:#2e7d32;">${approvedCount}</strong> approved,
    <strong style="color:#c62828;">${rejectedCount}</strong> rejected
    (<strong>${total}</strong> total)
  </p>
  <div style="max-height:320px;overflow-y:auto;overflow-x:auto;border:1px solid #ccc;margin-bottom:8px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:760px;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:32px;position:sticky;top:0;z-index:3;background:#f2f2f2;">S/N</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;width:16%;position:sticky;top:0;z-index:3;background:#f2f2f2;">Field</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;position:sticky;top:0;z-index:3;background:#f2f2f2;">Current Value</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;position:sticky;top:0;z-index:3;background:#f2f2f2;">New Value</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;position:sticky;top:0;z-index:3;background:#f2f2f2;">Reason</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:110px;position:sticky;top:0;z-index:3;background:#f2f2f2;">Final Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
  <p style="font-size:11px;color:#888;margin-top:16px;">This is an automated summary for your NSA approval request.</p>
</div>`;

        if (requesterEmail) {
          var email = new Email();
          email.sendEmailToReceipent(requesterEmail, subject, body);
        }

        sendNsaDecisionSummaryApproverEmail({
          requesterName,
          approverEmails,
          approvedCount,
          rejectedCount,
          total,
          approvals,
        });

        await db.collection('NSA_Approvals').updateMany(
            { batchId, decisionSummaryEmailSentAt: { $exists: false } },
            { $set: { decisionSummaryEmailSentAt: new Date() } }
        );
    } catch (error) {
        console.error('sendNsaDecisionSummaryEmail error:', error);
    }
}

module.exports = {
    sendNsaDecisionSummaryEmail
};
