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
            const filename = `理解代际关系与互动第三部分: 如何处理家庭冲突 – 把消极互动转为积极互动 Understanding Inter-Generational Dynamics Part 3: Manage conflict in the family – Turn negative interactions into positive ones (CT Hub).jpg`;
            fs.writeFileSync(filename, buffer);
            console.log(`QR code generated and saved as ${filename}`);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
}

// Usage const filename = `https://ecss.org.sg/product/crafting-connectionspasir-ris-west-wellness-centre/`;
const qrCodeGenerator = new QRCodeGenerator(`https://ecss.org.sg/product/%e7%90%86%e8%a7%a3%e4%bb%a3%e9%99%85%e5%85%b3%e7%b3%bb%e4%b8%8e%e4%ba%92%e5%8a%a8%e7%ac%ac%e4%b8%89%e9%83%a8%e5%88%86-%e5%a6%82%e4%bd%95%e5%a4%84%e7%90%86%e5%ae%b6%e5%ba%ad%e5%86%b2%e7%aa%81/`);
qrCodeGenerator.generate();
