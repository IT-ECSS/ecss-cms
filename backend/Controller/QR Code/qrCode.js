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
            const filename = `男士俱乐部：学习无人机飞行 Men Club: Learn To Fly Drone (Nanyang Polytechnic).jpg`
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage const filename = `https://ecss.org.sg/product/crafting-connectionspasir-ris-west-wellness-centre/`;
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e7%94%b7%e5%a3%ab%e4%bf%b1%e4%b9%90%e9%83%a8%ef%bc%9a%e5%ad%a6%e4%b9%a0%e6%97%a0%e4%ba%ba%e6%9c%ba%e9%a3%9e%e8%a1%8c-men-club-learn-to-fly-droneothers/`);
qrCodeGenerator.generate();
