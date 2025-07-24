import QRCode from 'qrcode';
import fs from 'fs';

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
            const filename = `和谐粉彩绘画基础班一第2阶 Nagomi Pastel Art Basic L2 (Renewal Christian Church).jpg`;
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e5%92%8c%e8%b0%90%e7%b2%89%e5%bd%a9%e7%bb%98%e7%94%bb%e5%9f%ba%e7%a1%80%e7%8f%ad%e4%b8%80%e7%ac%ac2%e9%98%b6nagomi-pastel-art-basic-l2renewal-christian-church/`);
qrCodeGenerator.generate();
