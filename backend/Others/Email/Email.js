const nodemailer = require('nodemailer');

class Email {
    constructor() {
        // Create a transporter using Gmail
        this.transporter = nodemailer.createTransport({
            host: 'smtp-relay.sendinblue.com', // Brevo's SMTP server
            port: 587, // You can also use 465 for SSL or 587 for TLS
            secure: false, // Use false for TLS or true for SSL
            auth: {
                user: "94f7f0001@smtp-brevo.com", // Your email address
                pass: "9r0DHqn3xbt475da" // Your app password or normal password
            }
        });
    }

    // Method to send an email
    sendEmailToReceipent(to, subject, text) {
        console.log(to);
        const mailOptions = {
            from: "moses_lee@ecss.org.sg", // From address is the user's email
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
