var express = require('express');
var router = express.Router();
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const GoogleDriveController = require('../Controller/Google/GoogleDriveController');

const googleDriveController = new GoogleDriveController();

const QR_OPTIONS_PNG = {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 2,
};

const QR_OPTIONS_JPG = {
    errorCorrectionLevel: 'H',
    type: 'image/jpeg',
    quality: 1,
};

// POST /qrcode
// Body variants:
//   { text|registrationLink, folderId, purpose|fileName }  → upload PNG to Google Drive; returns { success, fileId, fileUrl }
//   { text|registrationLink, saveToFile: true, fileName }  → save JPG to server disk; returns { success, filename }
//   { text, format: 'base64' }                             → returns { success, dataUrl: "data:image/png;base64,..." }
//   { text }                                               → returns raw PNG image (Content-Type: image/png)
router.post('/', async (req, res) => {
    try {
        const { text, format, folderId, fileName, purpose, registrationLink, saveToFile } = req.body;
        // Normalise: Drive-upload / saveToFile branches use purpose+registrationLink; others use text
        const qrText = registrationLink || text;
        if (!qrText) {
            return res.status(400).json({ success: false, error: 'registrationLink (or text) is required' });
        }

        if (folderId) {
            // --- Branch 1: Upload QR code PNG to Google Drive ---
            const fileBaseName = purpose || fileName;
            if (!fileBaseName) {
                return res.status(400).json({ success: false, error: 'purpose (or fileName) is required when folderId is provided' });
            }
            const buffer = await QRCode.toBuffer(qrText, QR_OPTIONS_PNG);
            const result = await googleDriveController.uploadPdfToGoogleDrive(
                buffer,
                `${fileBaseName}.png`,
                folderId,
                'image/png'
            );
            if (!result.success) {
                return res.status(500).json(result);
            }
            return res.json({
                success: true,
                fileId: result.fileId,
                fileUrl: result.fileLink,
            });

        } else if (saveToFile) {
            // --- Branch 2: Save QR code as JPG to server disk ---
            const fileBaseName = purpose || fileName;
            if (!fileBaseName) {
                return res.status(400).json({ success: false, error: 'purpose (or fileName) is required when saveToFile is true' });
            }
            const buffer = await QRCode.toBuffer(qrText, QR_OPTIONS_JPG);
            // Sanitise filename to prevent path traversal
            const safeFilename = `${path.basename(fileBaseName)} QR Code.jpg`;
            const outputPath = path.join(__dirname, '..', 'public', safeFilename);
            fs.writeFileSync(outputPath, buffer);
            console.log(`[QRCode] Saved QR code to ${outputPath}`);
            return res.json({ success: true, filename: safeFilename });

        } else if (format === 'base64') {
            // --- Branch 3: Return base64 data URL ---
            const dataUrl = await QRCode.toDataURL(qrText, QR_OPTIONS_PNG);
            return res.json({ success: true, dataUrl });

        } else {
            // --- Branch 4: Return raw PNG buffer ---
            const buffer = await QRCode.toBuffer(qrText, QR_OPTIONS_PNG);
            res.set('Content-Type', 'image/png');
            return res.send(buffer);
        }
    } catch (error) {
        console.error('[QRCode] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
