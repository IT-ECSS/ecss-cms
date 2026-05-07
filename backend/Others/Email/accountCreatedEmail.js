/**
 * accountCreatedEmail.js
 * Purpose: Send a "Your account has been created" welcome email to a new staff account.
 * Triggered when an admin creates a new account via POST /accountDetails { purpose: "create" }.
 */

var Email = require('./Email');

/**
 * @param {object} params
 * @param {string} params.name     - New account holder's name
 * @param {string} params.email    - New account holder's email
 * @param {string} params.password - Plain-text password (shown once in welcome email)
 */
function sendAccountCreatedEmail({ name, email, password }) {
    var body = `Dear ${name},<br/>
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
    sendEmail.sendEmailToReceipent(email, "You have successfully created your account", body);
}

module.exports = { sendAccountCreatedEmail };
