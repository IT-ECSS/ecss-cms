const nodemailer = require('nodemailer');

class Email {
    constructor() {
        // TEMPORARY TEST: Create a transporter using personal Gmail
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'it@ecss.org.sg',  // Use your personal Gmail for testing
                pass: 'wvlpeatgusnldwis'  // Generate new app password from personal Gmail
            }
        });
    }

    // Method to send an email
    sendEmailToReceipent(to, subject, text) {
        console.log(to);
        const mailOptions = {
            from: "it@ecss.org.sg", // From address is the user's email
            to: to, // Recipient email address
            subject: subject, // Email subject
            html: text, // Email body
        };

        this.transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(`Error sending email: ${error}`);
            }
            console.log(`Email sent: ${info.response}`);
        });
    }
}

module.exports = Email;
