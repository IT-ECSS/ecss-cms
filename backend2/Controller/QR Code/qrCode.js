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
            const filename = `音乐祝福社区木箱鼓基础1 Community Cajon Foundation 1 (CT Hub).jpg`;
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e9%9f%b3%e4%b9%90%e7%a5%9d%e7%a6%8f%e7%a4%be%e5%8c%ba%e6%9c%a8%e7%ae%b1%e9%bc%93%e5%9f%ba%e7%a1%801community-cajon-foundation-1ct-hub/`);
qrCodeGenerator.generate();
