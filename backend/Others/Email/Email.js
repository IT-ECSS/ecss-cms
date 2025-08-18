const nodemailer = require('nodemailer');

class Email {
    constructor() {
        // Create a transporter using Gmail
        this.transporter = nodemailer.createTransport({
            //host: 'smtp-relay.sendinblue.com', // Brevo's SMTP server
            host: 'live.smtp.mailtrap.io',
            port: 587, // You can also use 465 for SSL or 587 for TLS
            secure: false, // Use false for TLS or true for SSL
            auth: {
                user: "api",
                pass: "1e6dcba50a7b38fddbf1c3655e819a90"
            }
            /*auth: {
                user: " 1@smtp-brevo.com", // Your email address
                pass: "wctvJgDmM389WTy4", // Your app password or normal password
            },*/
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
