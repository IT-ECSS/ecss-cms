var express = require('express');
var router = express.Router();
var GoogleDriveController = require('../Controller/Google/GoogleDriveController');
var fs = require('fs');
var path = require('path');

const googleDriveController = new GoogleDriveController();

// ── Persistent active file storage ──
const ACTIVE_FILE_PATH = path.join(__dirname, '..', 'fft-active-file.json');

function loadActiveFile() {
    try {
        if (fs.existsSync(ACTIVE_FILE_PATH)) {
            const data = JSON.parse(fs.readFileSync(ACTIVE_FILE_PATH, 'utf8'));
            if (data && data.id && data.name) return data;
        }
    } catch (e) {
        console.warn('[FFT] Could not load active file from disk:', e.message);
    }
    return null;
}

function saveActiveFile(file) {
    try {
        fs.writeFileSync(ACTIVE_FILE_PATH, JSON.stringify(file), 'utf8');
    } catch (e) {
        console.warn('[FFT] Could not save active file to disk:', e.message);
    }
}

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
                //console.log("Listing files in folder:", result);
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

        //console.log(`Bulk download requested for ${fileIds.length} files`);
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

// POST endpoint to list events from a spreadsheet in a folder (default)
router.post('/listEvents', async (req, res) => {
    try {
        // Always read events from the specific spreadsheet ID
        const spreadsheetId = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';
        const result = await googleDriveController.readSpreadsheet(spreadsheetId);
        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error || 'Failed to read spreadsheet' });
        }
        // Only keep the 2nd column (event name) from each row.
        const events = (result.data || [])
            .map(row => (row[1] || '').toString().trim())
            .filter(name => name);
        return res.json({ success: true, events });
    } catch (error) {
        console.error('Error in POST /listEvents:', error.message);
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

        //console.log(`Reading spreadsheet: ${fileId}, sheet: ${sheetName || 'default'}`);
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

        //console.log(`Appending row to spreadsheet: ${fileId}`);
        const result = await googleDriveController.appendRow(fileId, rowData, sheetName);

        if (!result.success) {
            return res.status(500).json(result);
        }

        // Cache the participant's registration data keyed by entryNumber
        const en = result.entryNumber;
        if (en != null && Array.isArray(rowData)) {
            const colKeys = [
                'Name', 'Chinese Name', 'Phone Number', 'Gender', 'DD', 'MM', 'YYYY', 'Age',
                'Height', 'Weight', 'BMI', 'Date of test',
                '30 secs Sit & Stand', '30 secs Arm Banding', '2 min On-the-spot Marching', 'Sit & Reach', 'Back Stretching', '2.44m Speed Walk', 'Grip test',
                'Improvements', 'Remarks'
            ];
            
            // Map exact column names to internal keys (lowercase) for cache consistency
            const exactToInternalKeyMap = {
                'Name': 'name',
                'Chinese Name': 'chineseName',
                'Phone Number': 'phoneNo',
                'Gender': 'gender',
                'DD': 'dd',
                'MM': 'mm',
                'YYYY': 'yyyy',
                'Age': 'age',
                'Height': 'height',
                'Weight': 'weight',
                'BMI': 'bmi',
                'Date of test': 'testDate',
                '30 secs Sit & Stand': 'sitStand',
                '30 secs Arm Banding': 'armCurl',
                '2 min On-the-spot Marching': 'march',
                'Sit & Reach': 'sitReach',
                'Back Stretching': 'backStretch',
                '2.44m Speed Walk': 'speedWalk',
                'Grip test': 'gripTest',
                'Improvements': 'improvements',
                'Remarks': 'remarks'
            };
            
            const cached = {};
            colKeys.forEach((key, idx) => {
                if (rowData[idx]) {
                    // Convert exact column names to internal keys for cache storage
                    const internalKey = exactToInternalKeyMap[key] || key.toLowerCase();
                    cached[internalKey] = rowData[idx];
                }
            });
            fftResultsCache[en] = cached;
            console.log('[FFT] Cached registration data for entry', en, ':', cached);
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

// POST endpoint to append an event row with auto-generated S/N
router.post('/appendEventRow', async (req, res) => {
    try {
        const { fileId, eventName, createdOn, sheetName = 'Sheet1' } = req.body;
        //console.log(`[SHEETS] Received request to append event row: fileId=${fileId}, eventName=${eventName}, createdOn=${createdOn}, sheetName=${sheetName}`);

        if (!fileId || !eventName || !createdOn) {
            return res.status(400).json({
                success: false,
                error: 'fileId, eventName, and createdOn are required'
            });
        }

        //console.log(`[SHEETS] Appending event row to spreadsheet: ${fileId}`);

        // Use GoogleDriveController's method to append the event row with auto-generated S/N
        const result = await googleDriveController.appendEventRow(
            fileId, 
            eventName, 
            createdOn,
            sheetName
        );

        if (!result.success) {
            console.error('[SHEETS] appendEventRow failed:', result.error);
            return res.status(500).json(result);
        }

        //console.log(`[SHEETS] Event row successfully appended with S/N ${result.serialNumber}`);

        res.json(result);
    } catch (error) {
        console.error('[SHEETS] Error in POST /appendEventRow:', error.message, error.stack);
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

        //console.log(`Creating folder "${folderName}" in parent ${parentFolderId}`);
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

        //console.log(`Copying spreadsheet ${sourceFileId} as "${newFileName}" to folder ${destinationFolderId || 'root'}`);
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
let activeFFTFile = loadActiveFile();
//console.log('[FFT] Loaded active file:', activeFFTFile ? `${activeFFTFile.name} (${activeFFTFile.id})` : 'none');

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
    //console.log(`[FFT] Cache cleared by admin. ${count} entries removed.`);
    res.json({ success: true, message: `Cache cleared. ${count} entries removed.` });
});

// SET the active FFT file
router.post('/activeFile', (req, res) => {
    const { file } = req.body;
    if (!file || !file.id || !file.name) {
        return res.status(400).json({ success: false, error: 'file with id and name is required' });
    }
    activeFFTFile = { id: file.id, name: file.name };
    saveActiveFile(activeFFTFile);
    // Clear results cache when active file changes
    fftResultsCache = {};
    //console.log(`[FFT] Active file set to: ${file.name} (${file.id}). Cache cleared.`);

    // Emit Socket.IO event so all clients know the active file changed
    const io = req.app.get('io');
    if (io) {
        io.emit('fftActiveFile', { file: activeFFTFile });
    }

    res.json({ success: true, file: activeFFTFile });
});

// POST request to get a specific row by entry number
router.post('/getRow', async (req, res) => {
    try {
        const { fileId, entryNumber } = req.body;
        if (!fileId || !entryNumber) {
            return res.status(400).json({ success: false, error: 'fileId and entryNumber are required' });
        }
        const result = await googleDriveController.getRow(fileId, parseInt(entryNumber, 10));
        if (!result.success) {
            return res.status(500).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('Error in POST /getRow:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST update specific columns in a row
router.post('/updateRow', async (req, res) => {
    try {
        const { fileId, entryNumber, updates } = req.body;
        console.log('[FFT] updateRow received - entryNumber:', entryNumber, 'updates:', updates);
        
        if (!fileId || entryNumber == null || !updates) {
            return res.status(400).json({ success: false, error: 'fileId, entryNumber, and updates are required' });
        }

        const en = parseInt(entryNumber, 10);

        // Read current row to check for existing remarks
        let currentRow = fftResultsCache[en] || {};
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

        // Build the final updates with exact column names from frontend
        const finalUpdates = {};

        for (const [field, value] of Object.entries(updatesClean)) {
            if (value !== null && value !== undefined && value !== '') {
                // Special handling for Remarks: append with "|" delimiter
                if (field === 'Remarks' && currentRow.remarks) {
                    finalUpdates[field] = currentRow.remarks + '|' + value;
                } else {
                    finalUpdates[field] = value;
                }
            }
        }

        console.log('[FFT] finalUpdates after processing:', finalUpdates);

        if (Object.keys(finalUpdates).length === 0) {
            // Nothing to update
            if (!fftResultsCache[en]) fftResultsCache[en] = {};
            return res.json({ success: true, updatedFields: [], message: 'No updates to process.' });
        }

        console.log('[FFT] Calling googleDriveController.updateRow with:', { fileId, en, finalUpdates });
        const result = await googleDriveController.updateRow(fileId, en, finalUpdates);
        console.log('[FFT] googleDriveController.updateRow result:', result);
        if (!result.success) {
            return res.status(500).json(result);
        }

        // Cache the final results (using exact column names)
        if (!fftResultsCache[en]) {
            fftResultsCache[en] = {};
        }
        Object.assign(fftResultsCache[en], finalUpdates);

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

// POST endpoint to submit FFT participant registration — finds the sheet by event name and appends a row
router.post('/fftSubmit', async (req, res) => {
    try {
        const { folderId, eventName, eventFileId, participantData } = req.body;
        if (!eventName || !participantData) {
            return res.status(400).json({ success: false, error: 'eventName and participantData are required' });
        }

        //console.log(`[FFT] fftSubmit received — event: "${eventName}"`);

        let fileId, sheetFileName;

        if (eventFileId) {
            // File ID already known — skip the Drive lookup
            fileId = eventFileId;
            sheetFileName = eventName;
            //console.log(`[FFT] Using provided fileId: ${fileId}`);
        } else {
            if (!folderId) {
                return res.status(400).json({ success: false, error: 'folderId is required when eventFileId is not provided' });
            }
            const findResult = await googleDriveController.findSheetByEventName(folderId, eventName);
            if (!findResult.success) {
                return res.status(404).json(findResult);
            }
            fileId = findResult.file.id;
            sheetFileName = findResult.file.name;
        }

        //console.log(`[FFT] Appending to sheet "${sheetFileName}" (${fileId})`);

        const {
            name = '', phone = '', gender = '',
            dateOfBirth = '', age = '',
        } = participantData;

        // Parse dateOfBirth (dd/mm/yyyy) into DD, MM, YYYY columns
        const dobParts = String(dateOfBirth).split('/');
        const dd = dobParts[0] || '';
        const mm = dobParts[1] || '';
        const yyyy = dobParts[2] || '';

        const pad = (n) => String(n).padStart(2, '0');

        // Date of test — extract from event name (e.g. "2026/04/11 ..." or "2026-04-11 ...")
        // Expected format in name: yyyy/mm/dd or yyyy-mm-dd at the start
        let dateOfTest = '';
        const dateMatch = String(eventName).match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
        if (dateMatch) {
            // reformat yyyy/mm/dd → dd/mm/yyyy
            dateOfTest = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
        }

        // Row order matches sheet headers:
        // Name | Chinese Name | Phone Number | Gender | DD | MM | YYYY | Age |
        // Height | Weight | BMI | Date of test |
        // 30 secs Sit & Stand | 30 secs Arm Curl | 2 min March on the spot |
        // Sit & Reach | Back Stretch | 2.44m speed walk | Grip Test | Improvements | Remarks
        const rowData = [
            name, '', phone, gender,
            dd, mm, yyyy, String(age),
            '', '', '',          // Height, Weight, BMI
            dateOfTest,
            '', '', '', '', '', '', '', // test result columns
            '', '',              // Improvements, Remarks
        ];

        const appendResult = await googleDriveController.appendRow(fileId, rowData);
        if (!appendResult.success) {
            return res.status(500).json(appendResult);
        }

        res.json({ success: true, sheetName: sheetFileName, fileId, entryNumber: appendResult.entryNumber });
    } catch (error) {
        console.error('[FFT] Error in POST /fftSubmit:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;