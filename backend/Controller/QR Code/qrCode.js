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
            const filename = `“Fly Kite with My Adult Child” Navigating the Shift to Peer-like Relationships with Your Adult Children.jpg`
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage const filename = `https://ecss.org.sg/product/crafting-connectionspasir-ris-west-wellness-centre/`;
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e4%b8%8e%e6%88%90%e5%b9%b4%e7%9a%84%e5%ad%a9%e5%ad%90%e4%b8%80%e8%b5%b7%e6%94%be%e9%a3%8e%e7%ad%9d-%e4%b8%8e%e6%88%90%e5%b9%b4%e5%ad%90%e5%a5%b3%e4%bb%8e%e4%ba%b2%e5%ad%90%e5%88%b0/`);
qrCodeGenerator.generate();
