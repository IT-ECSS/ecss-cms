import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

class QRCodeBatchGenerator {
    constructor(entries) {
        this.entries = entries; // Array of { text, filename }
        this.options = {
            errorCorrectionLevel: 'H',
            type: 'image/jpeg',
            quality: 1,
        };
    }

    async generateAll() {
        for (const entry of this.entries) {
            try {
                // Ensure the directory exists
                const dir = path.dirname(entry.filename);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                const buffer = await QRCode.toBuffer(entry.text, this.options);
                fs.writeFileSync(entry.filename, buffer);
                console.log(`QR code generated and saved as ${entry.filename}`);
            } catch (error) {
                console.error(`Error generating QR code for ${entry.filename}:`, error);
            }
        }
    }
}

// Usage example
const qrEntries = [
    {
        text: 'https://ecss.org.sg/product/fb-mprep-faith-based-marriage-preparation-programme-couplect-hub/',
        filename: 'P/E MPrep – Prepare/Enrich Marriage Preparation Programme Couple Class (CT Hub).jpg',
    },
    {
        text: 'https://ecss.org.sg/product/mprep-marriage-preparation-programme-one-on-one-classct-hub/',
        filename: 'P/E MPrep – Prepare/Enrich Marriage Preparation Programme One-On-One Class (CT Hub).jpg',
    },
    {
        text: 'https://ecss.org.sg/product/fb-mprep-faith-based-marriage-preparation-programme-couplect-hub-2/',
        filename: 'F/B MPrep – Foundations Building Marriage Preparation Programme Couple (CT Hub).jpg',
    },
    {
        text: 'https://ecss.org.sg/product/fb-mprep-faith-based-marriage-preparation-programme-one-on-one-classct-hub/',
        filename: 'F/B MPrep – Foundations Building Marriage Preparation Programme One-On-One Class (CT Hub).jpg',
    },

];

const generator = new QRCodeBatchGenerator(qrEntries);
generator.generateAll();
