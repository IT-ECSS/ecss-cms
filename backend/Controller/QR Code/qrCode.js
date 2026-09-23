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
            const filename = `长者照护与意识第三部分：情绪福祉与意识提升 Elder Care & Awareness Part 3: Emotional Well-being and Awareness (Tampines North Community Centre).jpg`;
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage const filename = `https://ecss.org.sg/product/crafting-connectionspasir-ris-west-wellness-centre/`;
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e9%95%bf%e8%80%85%e7%85%a7%e6%8a%a4%e4%b8%8e%e6%84%8f%e8%af%86%e7%ac%ac%e4%b8%89%e9%83%a8%e5%88%86%ef%bc%9a%e6%83%85%e7%bb%aa%e7%a6%8f%e7%a5%89%e4%b8%8e%e6%84%8f%e8%af%86%e6%8f%90%e5%8d%87-elder-care/`);
qrCodeGenerator.generate();
