/**
 * passwordResetEmail.js
 * Purpose: Notify an account holder that their password has been reset,
 * along with the new password.
 * Triggered when a user resets their password via the "Forgot password"
 * flow on the login page (POST /login { purpose: "resetPassword" }).
 */

var Email = require('./Email');

/**
 * @param {object} params
 * @param {string} params.name     - Account holder's name
 * @param {string} params.email    - Account holder's email
 * @param {string} params.password - New plain-text password (shown once in this email)
 */
function sendPasswordResetEmail({ name, email, password }) {
    var body = `Dear ${name},<br/>
                    This is to inform you that the password for your account has been successfully reset.
                    <br/><br/>
                    Here are your updated account details:
                    <br/><br/>
                    Email: <a href="javascript:void(0);">${email}</a><br/>
                    New Password: ${password}
                    <br/>
                    <br/>
                    <br/>
                    You may now <a href="https://salmon-wave-09f02b100.6.azurestaticapps.net/" style="text-decoration: none; font-weight: bold; color:#000000">log in</a> using your new password.
                    <br/><br/>
                    If you did not request this password reset, please contact <a href="mailto:moses_lee@ecss.org.sg" style="text-decoration: none; font-weight: bold; color:#000000">our support team</a> immediately.
                    <br/><br/>
                    This is an automated email. Please do not reply directly to this message.
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
                                    <img width="96" height="94" alt="En Community Services Society logo" src="https://ecss.org.sg/wp-content/uploads/2023/07/En_logo_Final_Large_RGB.png">
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
    sendEmail.sendEmailToReceipent(email, "Your password has been reset", body);
}

module.exports = { sendPasswordResetEmail };
