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
            case 'listSubfolders':
                result = await googleDriveController.listSubfolders(folderId);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid purpose. Supported values: listFiles, checkFolder, listSubfolders'
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

// POST endpoint to append a row to a spreadsheet
router.post('/appendRow', async (req, res) => {
    try {
        const { fileId, rowData, sheetName } = req.body;

        if (!fileId || !rowData || !Array.isArray(rowData)) {
            return res.status(400).json({
                success: false,
                error: 'fileId and rowData (array) are required'
            });
        }

        console.log(`Appending row to spreadsheet: ${fileId}`);
        const result = await googleDriveController.appendRow(fileId, rowData, sheetName);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Error in POST /appendRow:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST endpoint to create a folder inside a parent folder
router.post('/createFolder', async (req, res) => {
    try {
        const { folderName, parentFolderId } = req.body;

        if (!folderName || !parentFolderId) {
            return res.status(400).json({
                success: false,
                error: 'folderName and parentFolderId are required'
            });
        }

        console.log(`Creating folder "${folderName}" in parent ${parentFolderId}`);
        const result = await googleDriveController.createFolder(folderName, parentFolderId);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Error in POST /createFolder:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST endpoint to copy a spreadsheet to a folder with a new name
router.post('/copySpreadsheet', async (req, res) => {
    try {
        const { sourceFileId, newFileName, destinationFolderId } = req.body;

        if (!sourceFileId || !newFileName) {
            return res.status(400).json({
                success: false,
                error: 'sourceFileId and newFileName are required'
            });
        }

        console.log(`Copying spreadsheet ${sourceFileId} as "${newFileName}" to folder ${destinationFolderId || 'root'}`);
        const result = await googleDriveController.copySpreadsheet(sourceFileId, newFileName, destinationFolderId);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Error in POST /copySpreadsheet:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ── In-memory store for the active FFT file (shared across all users/devices) ──
let activeFFTFile = null;

// GET the currently active FFT file
router.get('/activeFile', (req, res) => {
    res.json({ success: true, file: activeFFTFile });
});

// SET the active FFT file
router.post('/activeFile', (req, res) => {
    const { file } = req.body;
    if (!file || !file.id || !file.name) {
        return res.status(400).json({ success: false, error: 'file with id and name is required' });
    }
    activeFFTFile = { id: file.id, name: file.name };
    console.log(`[FFT] Active file set to: ${file.name} (${file.id})`);
    res.json({ success: true, file: activeFFTFile });
});

// GET a specific row by entry number
router.get('/getRow', async (req, res) => {
    try {
        const { fileId, entryNumber } = req.query;
        if (!fileId || !entryNumber) {
            return res.status(400).json({ success: false, error: 'fileId and entryNumber are required' });
        }
        const result = await googleDriveController.getRow(fileId, parseInt(entryNumber, 10));
        if (!result.success) {
            return res.status(500).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('Error in GET /getRow:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST update specific columns in a row
router.post('/updateRow', async (req, res) => {
    try {
        const { fileId, entryNumber, updates } = req.body;
        if (!fileId || entryNumber == null || !updates) {
            return res.status(400).json({ success: false, error: 'fileId, entryNumber, and updates are required' });
        }
        const result = await googleDriveController.updateRow(fileId, parseInt(entryNumber, 10), updates);
        if (!result.success) {
            return res.status(500).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('Error in POST /updateRow:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;