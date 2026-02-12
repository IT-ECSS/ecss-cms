var express = require('express');
var router = express.Router();
var GoogleDriveController = require('../Controller/Google/GoogleDriveController');

const googleDriveController = new GoogleDriveController();

// POST endpoint to handle different Google Drive operations based on purpose
router.post('/', async (req, res) => {
    try {
        const { folderId, purpose } = req.body;
        
        if (!folderId) {
            return res.status(400).json({
                success: false,
                error: 'folderId is required'
            });
        }

        let result;

        switch (purpose) {
            case 'listFiles':
                result = await googleDriveController.listFilesInFolder(folderId);
                console.log("Listing files in folder:", result);
                break;
            case 'checkFolder':
                result = await googleDriveController.checkFolderExists(folderId);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid purpose. Supported values: listFiles, checkFolder'
                });
        }

        res.json(result);
    } catch (error) {
        console.error('Error in POST /:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST endpoint to download a single file
router.post('/downloadFile', async (req, res) => {
    try {
        const { fileId } = req.body;
        
        if (!fileId) {
            return res.status(400).json({ success: false, error: 'fileId is required' });
        }

        const result = await googleDriveController.downloadFile(fileId);
        
        if (!result.success) {
            return res.status(500).json(result);
        }

        res.set({
            'Content-Type': result.mimeType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
            'Content-Length': result.fileBuffer.length
        });
        res.send(result.fileBuffer);
    } catch (error) {
        console.error('Error in POST /downloadFile:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to download multiple files as ZIP
router.post('/downloadZip', async (req, res) => {
    try {
        const { fileIds } = req.body;
        
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, error: 'fileIds array is required' });
        }

        console.log(`Bulk download requested for ${fileIds.length} files`);
        const result = await googleDriveController.downloadMultipleFilesAsZip(fileIds);
        
        if (!result.success) {
            return res.status(500).json(result);
        }

        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="invoices-receipts-${Date.now()}.zip"`,
            'Content-Length': result.fileBuffer.length
        });
        res.send(result.fileBuffer);
    } catch (error) {
        console.error('Error in POST /downloadZip:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to read spreadsheet data
router.post('/readSpreadsheet', async (req, res) => {
    try {
        const { fileId, sheetName } = req.body;
        
        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'fileId is required'
            });
        }

        console.log(`Reading spreadsheet: ${fileId}, sheet: ${sheetName || 'default'}`);
        const result = await googleDriveController.readSpreadsheet(fileId, sheetName);
        
        res.json(result);
    } catch (error) {
        console.error('Error in POST /readSpreadsheet:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;