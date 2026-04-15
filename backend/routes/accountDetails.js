var express = require('express');
var router = express.Router();
var AccountController = require('../Controller/Account/AccountController'); 
var Email = require('../Others/Email/Email');
var AccessRightController = require('../Controller/Account/AccessRightController');
var crypto = require('crypto');
const { MongoClient } = require('mongodb');
const MONGO_URI = "mongodb+srv://MosesLee:Mlxy%406695@company-management-syst.ulotbgi.mongodb.net/?retryWrites=true&w=majority&appName=Company-Management-System";
const DB_NAME = "Company-Management-System";

function getCurrentDateTime() {
    const now = new Date();

    // Get day, month, year, hours, and minutes
    const day = String(now.getDate()).padStart(2, '0'); // Ensure two digits
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format
    const minutes = String(now.getMinutes()).padStart(2, '0'); // Ensure two digits
    const seconds = String(now.getSeconds()).padStart(2, '0'); // Ensure two digits

    // Format date and time
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    return {
        date: formattedDate,
        time: formattedTime,
    };
}

router.post('/', async function(req, res, next) {
    if (req.body.purpose === "create") 
    {
        var { name, email, password, role, site } = req.body.accountDetails;
        console.log(role);
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;

        // Uncomment and implement the controller if necessary
         var controller = new AccountController();
         var result = await controller.createAccount({ name, email, password, role, site, date_created: date, time_created: time, first_time_log_in: "Yes", date_log_in: "", time_log_in: "", date_log_out: "", time_log_out: "" });

        // Log the result if needed
        // console.log(result);
        //Test
        // If account creation is successful, send the email
         if (result.success === true) {
            var text = `Dear ${name},<br/>
                    Thank you for creating an account with us! We're excited to have you on board.
                    <br/><br/>
                    Your account has been successfully created, and you can now enjoy all the features and benefits we offer.
                    <br/><br/>
                    Here are your account details:  
                    <br/><br/>
                    Email: <a href="javascript:void(0);">${email}</a><br/>  
                    Password: ${password}
                    <br/>
                    <br/>
                    <br/>
                    To get started, you can <a href="https://salmon-wave-09f02b100.6.azurestaticapps.net/" style="text-decoration: none; font-weight: bold; color:#000000">log in</a> to your account.
                    <br/><br/>
                    If you have any questions or need assistance, feel free to reach out to <a href="mailto:moses_lee@ecss.org.sg" style="text-decoration: none; font-weight: bold; color:#000000">our support team</a>.
                    <br/><br/>
                    Welcome aboard!
                    <br/><br/>
                    This is an automated email. Thank you for creating an account with us! We're excited to have you on board.
                    <br/><br/>
                    <div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature">
                        <div dir="ltr">
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <span style="font-family:&quot;Montserrat SemiBold&quot;;color:rgb(0,0,0)"><i>Thank you and regards</i></span>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)">
                                    <b><span style="font-family:&quot;Montserrat SemiBold&quot;"><br></span></b>
                                </font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font face="Montserrat"><span style="font-size:14.6667px">Moses Lee</span></font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;line-height:normal">
                                <font color="#000000" face="Montserrat SemiBold">Corporate IT/Administrative Executive</font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal"><br></p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)"><span style="font-family:Montserrat"><br></span></font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <span style="color:rgb(0,0,0)">
                                    <img width="96" height="94" alt=" " src="https://ci3.googleusercontent.com/mail-sig/AIorK4yDA7ZYMLWcYsUPaptY-NACMzWDPi2jHra0RVMl_KBM2_SA5sQxCeKZ8oCt58k3OZhcwtZR5pIhaGoL" class="CToWUd" data-bit="iit">
                                    <font size="2"><span style="font-family:Montserrat"><br></span></font>
                                </span>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <span style="color:rgb(0,0,0)">
                                    <i><span style="font-family:Montserrat"><font size="1">Touch, Train Transform</font></span></i>
                                    <font size="2"><span style="font-family:Montserrat"><br></span></font>
                                </span>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)"><span style="font-family:Montserrat"><br></span></font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)">
                                    <b><span style="font-family:&quot;Montserrat SemiBold&quot;"></span></b>
                                    <span style="font-family:Montserrat">En Community Services Society</span>
                                </font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)">
                                    <span lang="ZH-CN" style="font-family:DengXian">恩群社区服务</span>
                                    <span style="font-family:Arial,sans-serif"></span>
                                </font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)"><span style="font-family:Montserrat">2 Kallang Avenue #06-14</span></font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)"><span style="font-family:Montserrat">CT HUB Singapore 339407</span></font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)"><span style="font-family:Montserrat">Tel: 6788 6625</span></font>
                            </p>
                            <p class="MsoNormal" style="margin-bottom:0in;color:rgb(34,34,34);line-height:normal">
                                <font size="2" style="color:rgb(0,0,0)">
                                    <span style="font-family:Montserrat">Web: <a href="http://www.ecss.org.sg/" style="color:rgb(17,85,204)" target="_blank">www.ecss.org.sg</a></span>
                                </font>
                            </p>
                        </div>
                    </div>`;

            var sendEmail = new Email();
            sendEmail.sendEmailToReceipent(email, "You have successfully created your account", text);
         }
         res.json({"message": result.message});
    }
    else if(req.body.purpose === "retrieve")
    {
        var controller = new AccountController();
        var result = await controller.allAccounts();
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "deleteAccount")
    {
       var controller = new AccountController();
        //console.log(req.body);
        var accountId = req.body.accountId;
        var result = await controller.deleteAccount(accountId);
        var controller1 = new AccessRightController();
        var result1 = await controller1.deleteAccessRights(accountId);
        console.log(result1);
        if(result === true&& result1 === true)
        {
            return res.json({"result": result}); 
        }
    }
    else if(req.body.purpose === "sendApprovalEmail")
    {
        var { fromName, fromEmail, currentDate, currentTime, allChanges, additionalNotes } = req.body;
        if (!fromName || !currentDate || !currentTime || !Array.isArray(allChanges) || allChanges.length === 0) {
            return res.status(400).json({ result: false, message: "Missing required fields" });
        }
        for (var ci = 0; ci < allChanges.length; ci++) {
            if (!allChanges[ci].columnName || !allChanges[ci].newValue || !allChanges[ci].reason || !allChanges[ci].registrationId) {
                return res.status(400).json({ result: false, message: `Change ${ci + 1} is missing required fields` });
            }
        }
        try {
            var accountController = new AccountController();
            var allAccountsResult = await accountController.allAccounts();
            var recipients = [];
            if (allAccountsResult && Array.isArray(allAccountsResult)) {
                recipients = allAccountsResult.filter(acc => acc.name === 'Moses Lee' && acc.email);
            }
            if (recipients.length === 0) {
                return res.status(404).json({ result: false, message: "Approver account not found" });
            }
            var recipientName = recipients[0].name;
            var recipientEmails = recipients.map(acc => acc.email);

            var mongoClient = new MongoClient(MONGO_URI);
            await mongoClient.connect();
            var db = mongoClient.db(DB_NAME);

            var baseHost = process.env.NODE_ENV === 'production'
                ? 'https://ecss-backend-node.azurewebsites.net'
                : 'http://localhost:3001';
            var batchId = crypto.randomUUID();

            // Generate one token per change and store in DB
            var tokenList = [];
            for (var change of allChanges) {
                var token = crypto.randomUUID();
                await db.collection('NSA_Approvals').insertOne({
                    token,
                    batchId,
                    status: 'pending',
                    registrationId: change.registrationId,
                    columnName: change.columnName,
                    newValue: change.newValue,
                    currentValue: change.currentValue || '',
                    reason: change.reason,
                    participantName: change.participantName || '',
                    courseName: change.courseName || '',
                    courseLocation: change.courseLocation || '',
                    requestedBy: fromName,
                    requestedByEmail: fromEmail || '',
                    requestedAt: new Date(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
                tokenList.push(token);
            }
            await mongoClient.close();

            // Group rows by participant for email display
            var participantGroups = {};
            allChanges.forEach((ch, idx) => {
                var key = ch.registrationId || '_unknown';
                if (!participantGroups[key]) participantGroups[key] = { info: ch, rows: [] };
                participantGroups[key].rows.push({ ch, token: tokenList[idx] });
            });

            var tableRows = '';
            for (var group of Object.values(participantGroups)) {
                // Participant sub-header row
                tableRows += `
      <tr>
        <td colspan="6" style="padding:7px 10px;border:1px solid #ddd;background:#e8f0ff;font-weight:bold;color:#1a3a6b;">
          ${group.info.participantName || 'Unknown'}&nbsp;&nbsp;<span style="font-weight:normal;color:#555;font-size:12px;">${group.info.courseName || ''}${group.info.courseLocation ? ' &middot; ' + group.info.courseLocation : ''}</span>
        </td>
      </tr>`;
                for (var row of group.rows) {
                    var approveUrl = `${baseHost}/accountDetails/approve?token=${row.token}`;
                    tableRows += `
      <tr>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;color:#888;">${row.ch.sn || ''}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#fff3cd;color:#856404;font-weight:bold;">${row.ch.columnName}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;">${row.ch.currentValue || '&mdash;'}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#e8f5e9;color:#2e7d32;font-weight:bold;">${row.ch.newValue}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;color:#555;font-size:12px;">${row.ch.reason}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;text-align:center;">
          <a href="${approveUrl}" style="display:inline-block;padding:5px 12px;background:#28a745;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;font-size:12px;">&#10003; Approve</a>
        </td>
      </tr>`;
                }
            }

            var notesLine = additionalNotes
                ? `<p style="margin:8px 0 0;font-size:12px;color:#555;"><strong>Notes:</strong> ${additionalNotes.replace(/\n/g, '<br/>')}</p>`
                : '';

            var approveAllUrl = `${baseHost}/accountDetails/approve-all?batchId=${batchId}`;
            var batchActionsHtml = `<a href="${approveAllUrl}" style="display:inline-block;padding:9px 20px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;font-size:13px;margin-bottom:12px;">&#10003; Approve All (${allChanges.length})</a>`;

            var changeWord = allChanges.length === 1 ? 'change' : 'changes';
            var subject = `URGENT: [Approval] ${allChanges.length} field ${changeWord} requested (${currentDate} ${currentTime} hrs)`;
            var body = `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:720px;">
  <p style="margin:0 0 6px;">Dear ${recipientName},</p>
  <p style="margin:0 0 12px;"><strong>${fromName}</strong> is requesting approval to edit ${allChanges.length > 1 ? allChanges.length + ' fields' : 'a field'}.</p>
  ${batchActionsHtml}
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
    <thead>
      <tr style="background:#f2f2f2;">
        <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:32px;">S/N</th>
        <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;width:16%;">Field</th>
        <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Current Value</th>
        <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">New Value</th>
        <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Reason</th>
        <th style="padding:7px 10px;border:1px solid #ccc;text-align:center;width:90px;"></th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  ${notesLine}
  ${batchActionsHtml}
  <p style="font-size:11px;color:#aaa;margin-top:16px;">Each Approve link expires in 7 days. Reply to this email to contact ${fromName}.</p>
</div>`;

            var toList = recipientEmails.join(', ');
            var sendEmail = new Email();
            sendEmail.sendEmailToReceipent(toList, subject, body, fromEmail || undefined);
            return res.json({ result: true, message: "Approval email sent", recipients: recipientEmails.length, changesCount: allChanges.length });
        } catch (error) {
            console.error("Error sending approval email:", error);
            return res.status(500).json({ result: false, message: "Failed to send approval email" });
        }
    }
});

// Column → backend call mapping for auto-approval
const COLUMN_FIELD_MAP = {
    'Name': { purpose: 'edit', field: 'name' },
    'Contact Number': { purpose: 'edit', field: 'contactNo' },
    'Payment Date': { purpose: 'edit', field: 'paymentDate' },
    'Refunded Date': { purpose: 'edit', field: 'refundedDate' },
    'Remarks': { purpose: 'edit', field: 'remarks' },
    'Payment Status': { purpose: 'updatePaymentStatus' },
    'Registration Status': { purpose: 'updatePaymentStatus' },
    'Registration and Payment Status': { purpose: 'updatePaymentStatus' },
    'Confirmation': { purpose: 'updateConfirmationStatus' },
    'Payment Method': { purpose: 'updatePaymentMethod' },
};

const BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://ecss-backend-node.azurewebsites.net'
    : 'http://localhost:3001';

// GET /accountDetails/approve?token=xxx — bridge: auto-submits to POST /approve
router.get('/approve', function(req, res) {
    var token = req.query.token || '';
    var esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return res.send(`<!DOCTYPE html><html><head><title>Approving...</title></head><body><form method="POST" action="/accountDetails/approve" id="f"><input type="hidden" name="token" value="${esc(token)}"/></form><script>document.getElementById('f').submit();<\/script></body></html>`);
});

// POST /accountDetails/approve — applies the change, returns webhookClosePage
router.post('/approve', async function(req, res) {
    var { token } = req.body;
    if (!token) return res.send(webhookClosePage());
    var mongoClient = new MongoClient(MONGO_URI);
    try {
        await mongoClient.connect();
        var db = mongoClient.db(DB_NAME);
        var approval = await db.collection('NSA_Approvals').findOne({ token });
        if (!approval || approval.status === 'approved') return res.send(webhookClosePage());
        if (approval.status === 'expired' || new Date() > new Date(approval.expiresAt)) {
            await db.collection('NSA_Approvals').updateOne({ token }, { $set: { status: 'expired' } });
            return res.send(webhookClosePage());
        }
        var axios = require('axios');
        await applyApproval(db, approval, axios);
        sendApprovalConfirmationEmails([approval]).catch(e => console.error('Confirmation email error:', e));
        var io = req.app.get('io');
        if (io) io.emit('registration', { type: 'nsa-approved', registrationId: approval.registrationId, columnName: approval.columnName });
        return res.send(webhookClosePage());
    } catch(err) {
        console.error('Approve POST error:', err);
        return res.send(webhookClosePage());
    } finally {
        await mongoClient.close();
    }
});

function htmlPage(title, message, color) {
    return `<!DOCTYPE html><html><head><title>${title}</title></head><body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;"><div style="max-width:480px;padding:40px;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);text-align:center;"><div style="font-size:48px;margin-bottom:12px;">${color === '#28a745' ? '✅' : color === '#dc3545' ? '❌' : 'ℹ️'}</div><h2 style="color:${color};margin:0 0 12px;">${title}</h2><p style="color:#555;margin:0;">${message}</p></div></body></html>`;
}

function webhookClosePage() {
    return `<!DOCTYPE html><html><head><title>Done</title></head><body><script>window.open('','_self','');window.close();<\/script></body></html>`;
}

async function applyApproval(db, approval, axios) {
    var mapping = COLUMN_FIELD_MAP[approval.columnName];
    if (!mapping) throw new Error(`Unsupported field: ${approval.columnName}`);
    var payload = { id: approval.registrationId, staff: `${approval.requestedBy} (Approved)` };
    if (mapping.purpose === 'edit') { payload.purpose = 'edit'; payload.field = mapping.field; payload.editedValue = approval.newValue; }
    else if (mapping.purpose === 'updatePaymentStatus') { payload.purpose = 'updatePaymentStatus'; payload.newUpdateStatus = approval.newValue; }
    else if (mapping.purpose === 'updateConfirmationStatus') { payload.purpose = 'updateConfirmationStatus'; payload.newConfirmation = approval.newValue; }
    else if (mapping.purpose === 'updatePaymentMethod') { payload.purpose = 'updatePaymentMethod'; payload.newUpdatePayment = approval.newValue; }
    await axios.post(`${BASE_URL}/courseregistration`, payload);
    await db.collection('NSA_Approvals').updateOne({ token: approval.token }, { $set: { status: 'approved', approvedAt: new Date() } });
}

async function sendApprovalConfirmationEmails(approvedApprovals) {
    try {
        if (!approvedApprovals || approvedApprovals.length === 0) return;

        var requestedBy = approvedApprovals[0].requestedBy || 'Unknown';
        var requestedByEmail = approvedApprovals[0].requestedByEmail;

        // Get approver (Moses Lee) email from accounts
        var accountController = new AccountController();
        var allAccountsResult = await accountController.allAccounts();
        var approverEmail = null;
        var approverName = 'Moses Lee';
        if (allAccountsResult && Array.isArray(allAccountsResult)) {
            var approverAcc = allAccountsResult.find(acc => acc.name === 'Moses Lee' && acc.email);
            if (approverAcc) { approverEmail = approverAcc.email; approverName = approverAcc.name; }
        }

        var changeWord = approvedApprovals.length === 1 ? 'change' : 'changes';
        var subject = `[Approved] ${approvedApprovals.length} field ${changeWord} approved`;

        var tableRows = approvedApprovals.map(a => `
      <tr>
        <td style="padding:7px 10px;border:1px solid #ddd;">${a.participantName || ''}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;color:#555;font-size:12px;">${a.courseName || ''}${a.courseLocation ? ' &middot; ' + a.courseLocation : ''}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#fff3cd;color:#856404;font-weight:bold;">${a.columnName}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;">${a.currentValue || '&mdash;'}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;background:#e8f5e9;color:#2e7d32;font-weight:bold;">${a.newValue}</td>
        <td style="padding:7px 10px;border:1px solid #ddd;color:#555;font-size:12px;">${a.reason || ''}</td>
      </tr>`).join('');

        var tableHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Participant</th>
            <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Course</th>
            <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Field</th>
            <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Previous Value</th>
            <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Approved Value</th>
            <th style="padding:7px 10px;border:1px solid #ccc;text-align:left;">Reason</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>`;

        var sendEmail = new Email();

        // Email to requester
        if (requestedByEmail) {
            var requesterBody = `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:720px;">
  <p style="margin:0 0 6px;">Dear ${requestedBy},</p>
  <p style="margin:0 0 12px;">Your requested field ${changeWord} (<strong>${approvedApprovals.length}</strong>) has been <strong style="color:#2e7d32;">&#10003; approved</strong> and applied to the system.</p>
  ${tableHtml}
  <p style="font-size:11px;color:#aaa;margin-top:16px;">This is an automated notification. Please do not reply to this email.</p>
</div>`;
            sendEmail.sendEmailToReceipent(requestedByEmail, subject, requesterBody);
        }

        // Email to approver
        if (approverEmail) {
            var approverBody = `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:720px;">
  <p style="margin:0 0 6px;">Dear ${approverName},</p>
  <p style="margin:0 0 12px;">You have approved <strong>${approvedApprovals.length}</strong> field ${changeWord} requested by <strong>${requestedBy}</strong>.</p>
  ${tableHtml}
  <p style="font-size:11px;color:#aaa;margin-top:16px;">This is an automated notification.</p>
</div>`;
            sendEmail.sendEmailToReceipent(approverEmail, subject, approverBody);
        }
    } catch(e) {
        console.error('sendApprovalConfirmationEmails error:', e);
    }
}

function approvalSummaryPage(results) {
    var approved = results.filter(r => r.status === 'approved').length;
    var rows = results.map(r =>
        `<tr><td style="padding:6px 10px;border:1px solid #ddd;">${r.participantName||''}</td><td style="padding:6px 10px;border:1px solid #ddd;">${r.columnName||''}</td><td style="padding:6px 10px;border:1px solid #ddd;">${r.newValue||''}</td><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;color:${r.status==='approved'?'#2e7d32':r.status==='already approved'?'#6c757d':'#dc3545'};">${r.status}</td></tr>`
    ).join('');
    return `<!DOCTYPE html><html><head><title>Approval Result</title></head><body style="font-family:Arial,sans-serif;padding:40px 20px;background:#f8f9fa;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);padding:32px;"><div style="font-size:48px;text-align:center;margin-bottom:12px;">✅</div><h2 style="color:#28a745;text-align:center;margin:0 0 16px;">Done</h2><p style="color:#555;text-align:center;margin:0 0 20px;">${approved} of ${results.length} change${results.length!==1?'s':''} approved.</p><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f2f2f2;"><th style="padding:6px 10px;border:1px solid #ccc;text-align:left;">Participant</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left;">Field</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left;">New Value</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left;">Status</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;
}

// GET /accountDetails/approve-all?batchId=xxx — bridge: auto-submits to POST /approve-all
router.get('/approve-all', function(req, res) {
    var batchId = req.query.batchId || '';
    var esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return res.send(`<!DOCTYPE html><html><head><title>Approving all...</title></head><body><form method="POST" action="/accountDetails/approve-all" id="f"><input type="hidden" name="batchId" value="${esc(batchId)}"/></form><script>document.getElementById('f').submit();<\/script></body></html>`);
});

// POST /accountDetails/approve-all
router.post('/approve-all', async function(req, res) {
    var { batchId } = req.body;
    if (!batchId) return res.status(400).send(htmlPage('Invalid', 'Missing batch ID.', '#dc3545'));
    var mongoClient = new MongoClient(MONGO_URI);
    try {
        await mongoClient.connect();
        var db = mongoClient.db(DB_NAME);
        var pending = await db.collection('NSA_Approvals').find({ batchId, status: 'pending' }).toArray();
        if (pending.length === 0) return res.send(htmlPage('Nothing to Approve', 'All changes in this batch have already been approved or expired.', '#6c757d'));
        var axios = require('axios');
        var results = [];
        var approvedApprovals = [];
        for (var approval of pending) {
            if (new Date() > new Date(approval.expiresAt)) {
                await db.collection('NSA_Approvals').updateOne({ token: approval.token }, { $set: { status: 'expired' } });
                results.push({ columnName: approval.columnName, participantName: approval.participantName, status: 'expired' }); continue;
            }
            try { await applyApproval(db, approval, axios); approvedApprovals.push(approval); results.push({ columnName: approval.columnName, participantName: approval.participantName, newValue: approval.newValue, status: 'approved' }); }
            catch(e) { results.push({ columnName: approval.columnName, participantName: approval.participantName, status: 'error' }); }
        }
        if (approvedApprovals.length > 0) sendApprovalConfirmationEmails(approvedApprovals).catch(e => console.error('Confirmation email error:', e));
        var io = req.app.get('io');
        if (io) io.emit('registration', { type: 'nsa-approved-batch', batchId });
        return res.send(webhookClosePage());
    } catch(err) { console.error('Approve-all POST error:', err); return res.send(webhookClosePage()); }
    finally { await mongoClient.close(); }
});

// POST /accountDetails/review-batch — review page with checkboxes
router.post('/review-batch', async function(req, res) {
    var { batchId } = req.body;
    if (!batchId) return res.status(400).send(htmlPage('Invalid Link', 'No batch ID provided.', '#dc3545'));
    var mongoClient = new MongoClient(MONGO_URI);
    try {
        await mongoClient.connect();
        var db = mongoClient.db(DB_NAME);
        var approvals = await db.collection('NSA_Approvals').find({ batchId }).toArray();
        if (approvals.length === 0) return res.status(404).send(htmlPage('Not Found', 'No changes found for this batch.', '#dc3545'));
        var esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        var groups = {};
        approvals.forEach(a => { var k = a.registrationId||'_'; if (!groups[k]) groups[k]={participantName:a.participantName,courseName:a.courseName,courseLocation:a.courseLocation,rows:[]}; groups[k].rows.push(a); });
        var rowsHtml = ''; var sn = 0;
        for (var group of Object.values(groups)) {
            rowsHtml += `<tr style="background:#e8f0ff;"><td colspan="7" style="padding:8px 12px;font-weight:bold;font-size:13px;color:#1a3a6b;">${esc(group.participantName||'Unknown')} <span style="font-weight:normal;color:#555;">${esc(group.courseName||'')}${group.courseLocation?' &middot; '+esc(group.courseLocation):''}</span></td></tr>`;
            for (var a of group.rows) {
                sn++;
                var isPending = a.status==='pending' && new Date()<=new Date(a.expiresAt);
                var statusBadge = a.status==='approved' ? '<span style="color:#2e7d32;font-weight:bold;">&#10003; Approved</span>' : (!isPending ? '<span style="color:#dc3545;">Expired</span>' : '<span style="color:#e65100;">Pending</span>');
                rowsHtml += `<tr style="border-bottom:1px solid #f0f0f0;background:${sn%2===0?'#fafafa':'#fff'};"><td style="padding:8px 10px;text-align:center;">${isPending?`<input type="checkbox" name="tokens" value="${esc(a.token)}" style="width:15px;height:15px;cursor:pointer;" onchange="updateCount()">`:'<input type="checkbox" disabled style="width:15px;height:15px;opacity:0.4;">'}</td><td style="padding:8px 10px;text-align:center;color:#888;">${sn}</td><td style="padding:8px 10px;background:#fff8ec;color:#856404;font-weight:bold;white-space:nowrap;">${esc(a.columnName)}</td><td style="padding:8px 10px;color:#555;font-style:italic;">${esc(a.currentValue||'—')}</td><td style="padding:8px 10px;background:#e8f5e9;color:#2e7d32;font-weight:bold;">${esc(a.newValue)}</td><td style="padding:8px 10px;color:#555;font-size:12px;">${esc(a.reason)}</td><td style="padding:8px 10px;text-align:center;">${statusBadge}</td></tr>`;
            }
        }
        var pending = approvals.filter(a=>a.status==='pending'&&new Date()<=new Date(a.expiresAt)).length;
        var approveAllFormHtml = `<form method="POST" action="/accountDetails/approve-all" style="display:inline;margin:0;"><input type="hidden" name="batchId" value="${esc(batchId)}"/><button type="submit" class="btn btn-blue" onclick="return confirm('Approve all ${pending} pending changes?')">&#10003; Approve All (${pending})</button></form>`;
        return res.send(`<!DOCTYPE html><html><head><title>Review Approval Request</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px}.card{max-width:820px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);padding:28px}h2{margin:0 0 4px;color:#1a3a6b}.sub{color:#555;margin:0 0 18px;font-size:14px}.abar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}.btn{display:inline-block;padding:8px 18px;border-radius:4px;font-weight:bold;font-size:13px;cursor:pointer;border:none;text-decoration:none;line-height:1.4}.btn-green{background:#2e7d32;color:#fff}.btn-blue{background:#1565c0;color:#fff}.btn-grey{background:#f5f5f5;color:#555;border:1px solid #ddd}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f2f2f2;padding:8px 10px;border:1px solid #ddd;text-align:left}.badge{background:#e65100;color:#fff;border-radius:99px;padding:1px 7px;font-size:12px;margin-left:4px}</style></head><body><div class="card"><h2>&#128203; Review Approval Request</h2><p class="sub">Requested by <strong>${esc(approvals[0]?.requestedBy||'')}</strong> &mdash; ${approvals.length} change${approvals.length!==1?'s':''} &mdash; <strong>${pending} pending</strong></p><form method="POST" action="/accountDetails/approve-selected" id="f"><div class="abar"><button type="button" class="btn btn-grey" onclick="selectAll()">Select All</button><button type="button" class="btn btn-grey" onclick="deselectAll()">Deselect All</button><button type="submit" class="btn btn-green">&#10003; Approve Selected <span class="badge" id="cnt">0</span></button>${approveAllFormHtml}</div><div style="overflow-x:auto;"><table><thead><tr><th style="width:40px;text-align:center;">&#9745;</th><th style="width:36px;">#</th><th>Field</th><th>Current</th><th>New Value</th><th>Reason</th><th style="width:90px;text-align:center;">Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></div><div class="abar" style="margin-top:14px;"><button type="submit" class="btn btn-green">&#10003; Approve Selected <span class="badge" id="cnt2">0</span></button></div></form></div><script>function updateCount(){var n=document.querySelectorAll('input[name="tokens"]:checked').length;document.getElementById('cnt').textContent=n;document.getElementById('cnt2').textContent=n;}function selectAll(){document.querySelectorAll('input[name="tokens"]:not(:disabled)').forEach(c=>c.checked=true);updateCount();}function deselectAll(){document.querySelectorAll('input[name="tokens"]').forEach(c=>c.checked=false);updateCount();}document.getElementById('f').addEventListener('submit',function(e){if(!document.querySelectorAll('input[name="tokens"]:checked').length){e.preventDefault();alert('Please select at least one change.');}});</script></body></html>`);
    } catch(err) { console.error('Review batch error:', err); return res.status(500).send(htmlPage('Error', 'Something went wrong.', '#dc3545')); }
    finally { await mongoClient.close(); }
});

// POST /accountDetails/approve-selected — apply tokens chosen from review-batch
router.post('/approve-selected', async function(req, res) {
    var tokens = req.body.tokens;
    if (!tokens) return res.send(htmlPage('Nothing Selected', 'No changes were selected.', '#6c757d'));
    if (!Array.isArray(tokens)) tokens = [tokens];
    var mongoClient = new MongoClient(MONGO_URI);
    try {
        await mongoClient.connect();
        var db = mongoClient.db(DB_NAME);
        var axios = require('axios');
        var results = [];
        for (var token of tokens) {
            var approval = await db.collection('NSA_Approvals').findOne({ token });
            if (!approval) { results.push({ columnName: '?', participantName: '?', status: 'not found' }); continue; }
            if (approval.status === 'approved') { results.push({ columnName: approval.columnName, participantName: approval.participantName, newValue: approval.newValue, status: 'already approved' }); continue; }
            if (approval.status === 'expired' || new Date() > new Date(approval.expiresAt)) { await db.collection('NSA_Approvals').updateOne({ token }, { $set: { status: 'expired' } }); results.push({ columnName: approval.columnName, participantName: approval.participantName, status: 'expired' }); continue; }
            try { await applyApproval(db, approval, axios); results.push({ columnName: approval.columnName, participantName: approval.participantName, newValue: approval.newValue, status: 'approved' }); }
            catch(e) { results.push({ columnName: approval.columnName, participantName: approval.participantName, status: 'error' }); }
        }
        var io = req.app.get('io');
        if (io) io.emit('registration', { type: 'nsa-approved-selected' });
        return res.send(approvalSummaryPage(results));
    } catch(err) { console.error('Approve-selected error:', err); return res.status(500).send(htmlPage('Error', 'Something went wrong.', '#dc3545')); }
    finally { await mongoClient.close(); }
});

module.exports = router;
