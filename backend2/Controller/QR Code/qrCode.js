const QRCode = require('qrcode');
const fs = require('fs');

class QRCodeGenerator {
    constructor(text) {
        this.text = text;
        this.options = {
            errorCorrectionLevel: 'H', // High error correction
            type: 'image/jpeg', // Output type
            quality: 1, // JPEG quality (0 to 1)
        };
    }

    // Method to generate QR code and save it as a JPG file
    async generate() {
        try {
            // Generate QR code as a buffer
            const buffer = await QRCode.toBuffer(this.text, this.options);

            // Save the buffer to a JPG file
            const filename = `Company Fundraising Page.jpg`;
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage
const qrCodeGenerator = new QRCodeGenerator(`https://salmon-wave-09f02b100.6.azurestaticapps.net/fundraising`);
qrCodeGenerator.generate();
