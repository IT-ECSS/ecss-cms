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
            const filename = `全国肾脏基金会: 了解您的肾脏，保护您的健康 National Kidney Foundation: Understand Your Kidneys , Protect Your Health (CT Hub).jpg`;
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage const filename = `https://ecss.org.sg/product/crafting-connectionspasir-ris-west-wellness-centre/`;
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e5%85%a8%e5%9b%bd%e8%82%be%e8%84%8f%e5%9f%ba%e9%87%91%e4%bc%9a-%e4%ba%86%e8%a7%a3%e6%82%a8%e7%9a%84%e8%82%be%e8%84%8f%ef%bc%8c%e4%bf%9d%e6%8a%a4%e6%82%a8%e7%9a%84%e5%81%a5%e5%ba%b7-national-kidney/`);
qrCodeGenerator.generate();
