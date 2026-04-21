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
            const filename = `黄金岁月，强大防护：健康老龄化的必备疫苗 Golden Years, Strong Shield: Essential Vaccines for Healthy Aging (Tampines North Community Centre).jpg`;
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage const filename = `https://ecss.org.sg/product/crafting-connectionspasir-ris-west-wellness-centre/`;
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e9%bb%84%e9%87%91%e5%b2%81%e6%9c%88%ef%bc%8c%e5%bc%ba%e5%a4%a7%e9%98%b2%e6%8a%a4%ef%bc%9a%e5%81%a5%e5%ba%b7%e8%80%81%e9%be%84%e5%8c%96%e7%9a%84%e5%bf%85%e5%a4%87%e7%96%ab%e8%8b%97golden-years-stron-3/`);
qrCodeGenerator.generate();
