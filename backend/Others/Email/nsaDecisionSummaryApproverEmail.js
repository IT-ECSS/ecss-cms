var Email = require('./Email');

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

    for (var group of Object.values(grouped)) {
        tableRows += `
      <tr>
        <td colspan="8" style="padding:7px 10px;border:1px solid #ddd;background:#e8f0ff;font-weight:bold;color:#1a3a6b;">
          ${escapeHtml(group.participantName)}${group.participantEmail ? ` &lt;${escapeHtml(group.participantEmail)}&gt;` : ''}
          <span style="font-weight:normal;color:#555;font-size:12px;">${group.courseName ? ' &nbsp;&nbsp; ' + escapeHtml(group.courseName) : ''}${group.courseLocation ? ' &middot; ' + escapeHtml(group.courseLocation) : ''}</span>
        </td>
      </tr>`;

        for (var row of group.rows) {
            var status = renderStatusLabel(row.status);
            var actionBy = '-';
            if (String(row.status || '').toLowerCase() === 'approved') {
                actionBy = row.approvedByName || row.approvedByEmail || '-';
            } else if (String(row.status || '').toLowerCase() === 'rejected') {
                actionBy = row.rejectedByName || row.rejectedByEmail || '-';
            }
            tableRows += `
      <tr>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;color:#888;">${escapeHtml(row.sn || '')}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#fff3cd;color:#856404;font-weight:bold;">${escapeHtml(row.columnName)}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;">${escapeHtml(row.currentValue || row.oldValue || '—')}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#e8f5e9;color:#2e7d32;font-weight:bold;">${escapeHtml(row.newValue)}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;color:#555;font-size:12px;">${escapeHtml(row.reason)}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;color:#555;font-size:12px;">${escapeHtml(actionBy)}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;background:${status.bg};color:${status.color};font-weight:bold;">${status.text}</td>
      </tr>`;
        }
    }

    return tableRows;
}

function sendNsaDecisionSummaryApproverEmail({
    requesterName,
    approverEmails,
    approvedCount,
    rejectedCount,
    total,
    approvals,
}) {
    try {
        if (!Array.isArray(approverEmails) || approverEmails.length === 0) return;
        var rowsHtml = buildRowsHtml(approvals || []);
        var subject = `[NSA Decision Summary][Approver Follow-up] ${requesterName} - ${approvedCount} approved, ${rejectedCount} rejected (${total} total)`;
        var body = `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:760px;">
  <p style="margin:0 0 6px;">Dear Approval Team,</p>
  <p style="margin:0 0 6px;">Follow-up notification for requester: <strong>${escapeHtml(requesterName)}</strong>.</p>
  <p style="margin:0 0 12px;">The NSA approval request has been finalized with the following results:</p>
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
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;position:sticky;top:0;z-index:3;background:#f2f2f2;">Action By</th>
          <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:110px;position:sticky;top:0;z-index:3;background:#f2f2f2;">Final Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
  <p style="font-size:11px;color:#888;margin-top:16px;">This is an automated approver follow-up for NSA decision summary.</p>
</div>`;

        var email = new Email();
        email.sendEmailToReceipent(approverEmails.join(', '), subject, body);
    } catch (error) {
        console.error('sendNsaDecisionSummaryApproverEmail error:', error);
    }
}

module.exports = {
    sendNsaDecisionSummaryApproverEmail,
};