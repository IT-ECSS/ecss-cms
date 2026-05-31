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
            const filename = `正念管理 第二部分：在日常生活中实践正念 Managing Mindfulness Part 2: Practising Mindfulness in Daily Life (Pasir Ris West Wellness Centre).jpg`
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage const filename = `https://ecss.org.sg/product/crafting-connectionspasir-ris-west-wellness-centre/`;
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e6%ad%a3%e5%bf%b5%e7%ae%a1%e7%90%86-%e7%ac%ac%e4%ba%8c%e9%83%a8%e5%88%86%ef%bc%9a%e5%9c%a8%e6%97%a5%e5%b8%b8%e7%94%9f%e6%b4%bb%e4%b8%ad%e5%ae%9e%e8%b7%b5%e6%ad%a3%e5%bf%b5managing-mindfulness-part-2/`);
qrCodeGenerator.generate();
