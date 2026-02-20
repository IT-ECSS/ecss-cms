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

        // Cache the participant's registration data keyed by entryNumber
        const en = result.entryNumber;
        if (en != null && Array.isArray(rowData)) {
            const colKeys = [
                'name', 'chineseName', 'phoneNo', 'gender', 'dd', 'mm', 'yyyy', 'age',
                'height', 'weight', 'bmi', 'testDate',
                'sitStand', 'armCurl', 'march', 'sitReach', 'backStretch', 'speedWalk', 'gripTest',
                'improvements', 'remarks'
            ];
            const cached = {};
            colKeys.forEach((key, idx) => {
                if (rowData[idx]) cached[key] = rowData[idx];
            });
            fftResultsCache[en] = cached;
            console.log(`[FFT] Cached registration data for entry ${en}`);
        }

        // Emit Socket.IO event for live FFT updates
        const io = req.app.get('io');
        if (io) {
            io.emit('fftUpdate', { type: 'rowAdded', fileId, entryNumber: en });
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

// ── In-memory cache for FFT station results (keyed by entryNumber) ──
// Structure: { [entryNumber]: { sitStand: '30', armCurl: '25', ... } }
let fftResultsCache = {};

// GET the currently active FFT file
router.get('/activeFile', (req, res) => {
    res.json({ success: true, file: activeFFTFile });
});

// GET cached results for a specific participant entry
router.get('/cachedResults', (req, res) => {
    const { entryNumber } = req.query;
    if (entryNumber == null) {
        return res.status(400).json({ success: false, error: 'entryNumber is required' });
    }
    const cached = fftResultsCache[entryNumber] || {};
    res.json({ success: true, data: cached });
});

// GET all cached results (for trainers view)
router.get('/cachedResultsAll', (req, res) => {
    res.json({ success: true, data: fftResultsCache });
});

// DELETE clear the in-memory results cache
router.delete('/clearCache', (req, res) => {
    const count = Object.keys(fftResultsCache).length;
    fftResultsCache = {};
    console.log(`[FFT] Cache cleared by admin. ${count} entries removed.`);
    res.json({ success: true, message: `Cache cleared. ${count} entries removed.` });
});

// SET the active FFT file
router.post('/activeFile', (req, res) => {
    const { file } = req.body;
    if (!file || !file.id || !file.name) {
        return res.status(400).json({ success: false, error: 'file with id and name is required' });
    }
    activeFFTFile = { id: file.id, name: file.name };
    // Clear results cache when active file changes
    fftResultsCache = {};
    console.log(`[FFT] Active file set to: ${file.name} (${file.id}). Cache cleared.`);

    // Emit Socket.IO event so all clients know the active file changed
    const io = req.app.get('io');
    if (io) {
        io.emit('fftActiveFile', { file: activeFFTFile });
    }

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

// ── Best-result comparison helpers ──
const HIGHER_IS_BETTER = ['sitStand', 'armCurl', 'march', 'gripTest'];  // more reps / strength = better
const LOWER_IS_BETTER  = ['speedWalk'];                                  // lower time = better
// sitReach & backStretch: higher (more positive) = better flexibility
const HIGHER_FLEX = ['sitReach', 'backStretch'];

// Extract all numbers from a string like "L-3 R+5", "L 3 R 5", "-3", "5.2"
function extractNumbers(val) {
    if (val == null || val === '') return [];
    const str = String(val);
    // Match optional sign followed by digits (with optional decimal)
    const matches = str.match(/-?\d+\.?\d*/g);
    return matches ? matches.map(Number) : [];
}

function isBetterResult(field, newVal, oldVal) {
    if (!oldVal || oldVal === '') return true;   // no existing value → always accept
    if (!newVal || newVal === '') return false;  // no new value → keep existing

    // Try direct numeric parse first
    let n = parseFloat(newVal);
    let o = parseFloat(oldVal);

    // If direct parse fails, extract numbers and sum them for comparison
    if (isNaN(n) || isNaN(o)) {
        const newNums = extractNumbers(newVal);
        const oldNums = extractNumbers(oldVal);
        if (newNums.length === 0 && oldNums.length === 0) return true; // both non-numeric → accept new
        if (newNums.length === 0) return false; // new has no numbers → keep old
        if (oldNums.length === 0) return true;  // old has no numbers → accept new
        // Sum all extracted numbers for comparison
        n = newNums.reduce((a, b) => a + b, 0);
        o = oldNums.reduce((a, b) => a + b, 0);
    }

    if (HIGHER_IS_BETTER.includes(field)) return n > o;
    if (LOWER_IS_BETTER.includes(field))  return n < o;
    if (HIGHER_FLEX.includes(field))      return n > o;  // more positive = better flexibility
    return true; // default (height, weight, bmi) → always accept
}

// Map each station score field to its remarks column key
const STATION_REMARKS_MAP = {
    sitStand: 'sitStandRemarks',
    armCurl: 'armCurlRemarks',
    march: 'marchRemarks',
    sitReach: 'sitReachRemarks',
    backStretch: 'backStretchRemarks',
    speedWalk: 'speedWalkRemarks',
    gripTest: 'gripTestRemarks'
};

// POST update specific columns in a row (with best-result logic)
router.post('/updateRow', async (req, res) => {
    try {
        const { fileId, entryNumber, updates } = req.body;
        if (!fileId || entryNumber == null || !updates) {
            return res.status(400).json({ success: false, error: 'fileId, entryNumber, and updates are required' });
        }

        const en = parseInt(entryNumber, 10);

        // Read current row to compare results
        let currentRow = fftResultsCache[en] || {};
        // If cache is empty for this entry, fetch from Google Sheets
        if (Object.keys(currentRow).length === 0) {
            try {
                const rowResult = await googleDriveController.getRow(fileId, en);
                if (rowResult.success) {
                    currentRow = rowResult.data;
                    fftResultsCache[en] = { ...currentRow };
                }
            } catch (_) { /* proceed with empty */ }
        }

        // Separate attempt metadata fields (e.g. sitReachAtt1, sitReachAtt2) — cache only, not written to Google Sheets
        const attMeta = {};
        const updatesClean = {};
        for (const [field, value] of Object.entries(updates)) {
            if (/Att[12]$/.test(field)) {
                attMeta[field] = value;
            } else {
                updatesClean[field] = value;
            }
        }

        // Build the final updates keeping only best results
        const finalUpdates = {};
        const stationScoreFields = Object.keys(STATION_REMARKS_MAP);
        const updatedScoreFields = new Set();

        for (const [field, value] of Object.entries(updatesClean)) {
            // Remarks fields always pass through
            if (field.endsWith('Remarks')) {
                finalUpdates[field] = value;
                continue;
            }
            // Station score fields → apply best-result logic
            if (stationScoreFields.includes(field)) {
                if (isBetterResult(field, value, currentRow[field])) {
                    finalUpdates[field] = value;
                    updatedScoreFields.add(field);
                    // Also include the matching remarks if provided
                    const rk = STATION_REMARKS_MAP[field];
                    if (rk && updatesClean[rk] !== undefined) {
                        finalUpdates[rk] = updatesClean[rk];
                    }
                } else {
                    console.log(`[FFT] Keeping existing better result for entry ${en} ${field}: ${currentRow[field]} (new was ${value})`);
                    // Keep existing remarks too — don't overwrite with new attempt's remarks
                    const rk = STATION_REMARKS_MAP[field];
                    if (rk && updatesClean[rk] !== undefined) {
                        // Don't include — keep old remarks that match old best result
                    }
                }
                continue;
            }
            // All other fields (height, weight, bmi, improvements, remarks) → always update
            finalUpdates[field] = value;
        }

        // Determine which att metadata to cache (only for updated score fields)
        const attToCache = {};
        for (const [attKey, attVal] of Object.entries(attMeta)) {
            const baseField = attKey.replace(/Att[12]$/, '');
            if (updatedScoreFields.has(baseField)) {
                attToCache[attKey] = attVal;
            }
        }

        if (Object.keys(finalUpdates).length === 0) {
            // Nothing to update (all new results were worse)
            if (!fftResultsCache[en]) fftResultsCache[en] = {};
            return res.json({ success: true, updatedFields: [], message: 'Existing results are better; no changes made.' });
        }

        const result = await googleDriveController.updateRow(fileId, en, finalUpdates);
        if (!result.success) {
            return res.status(500).json(result);
        }

        // Cache the final results + attempt metadata
        if (!fftResultsCache[en]) {
            fftResultsCache[en] = {};
        }
        Object.assign(fftResultsCache[en], finalUpdates, attToCache);
        console.log(`[FFT] Cached results for entry ${en}:`, fftResultsCache[en]);

        // Emit Socket.IO event with actual data for live updates
        const io = req.app.get('io');
        if (io) {
            io.emit('fftUpdate', {
                type: 'rowUpdated',
                fileId,
                entryNumber: en,
                updates: finalUpdates,
                cached: fftResultsCache[en]
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error in POST /updateRow:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;