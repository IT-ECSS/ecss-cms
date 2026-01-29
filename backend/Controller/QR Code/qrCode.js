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
            const filename = `中医 – 不和慢性病做朋友 TCM – Don’t be a Friend of Chronic Diseases (CT Hub).jpg`;
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e4%b8%8d%e5%92%8c%e6%85%a2%e6%80%a7%e7%97%85%e5%81%9a%e6%9c%8b%e5%8f%8btcm-dont-be-a-friend-of-chronic-diseases-ct-hub/`);
qrCodeGenerator.generate();
