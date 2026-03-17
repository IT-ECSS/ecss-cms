var express = require('express');
var router = express.Router();
var GoogleDriveController = require('../Controller/Google/GoogleDriveController');
var fs = require('fs');
var path = require('path');

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

// POST endpoint to get event file ID by event name
router.post('/getEventFileId', async (req, res) => {
    try {
        const { eventName } = req.body;
        
        if (!eventName) {
            return res.status(400).json({ success: false, error: 'eventName is required' });
        }

        console.log('[FFT] getEventFileId requested for event:', eventName);

        // Events folder ID
        const folderId = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';
        
        // Search in events folder
        console.log('[FFT] Searching in folder:', folderId);
        const filesResult = await googleDriveController.listFilesInFolder(folderId);
        
        if (!filesResult.success) {
            return res.status(500).json({ success: false, error: 'Failed to list files in folder' });
        }

        // Find file matching the event name
        const matchingFile = (filesResult.files || []).find(file => 
            file.name.toLowerCase().includes(eventName.toLowerCase())
        );

        if (!matchingFile) {
            console.error('[FFT] No file found matching event:', eventName);
            return res.status(404).json({ success: false, error: 'No file found for this event' });
        }

        const fileId = matchingFile.id;

        console.log('[FFT] Found fileId for event "' + eventName + '":', fileId);
        res.json({ success: true, fileId });
    } catch (error) {
        console.error('[FFT] Error in POST /getEventFileId:', error.message);
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
        let currentRow = {};
        try {
            const rowResult = await googleDriveController.getRow(fileId, en);
            if (rowResult.success) {
                currentRow = rowResult.data;
            }
        } catch (_) { /* proceed with empty */ }

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
            return res.json({ success: true, updatedFields: [], message: 'No updates to process.' });
        }

        console.log('[FFT] Calling googleDriveController.updateRow with:', { fileId, en, finalUpdates });
        const result = await googleDriveController.updateRow(fileId, en, finalUpdates);
        console.log('[FFT] googleDriveController.updateRow result:', result);
        if (!result.success) {
            return res.status(500).json(result);
        }

        // Emit Socket.IO event with actual data for live updates
        const io = req.app.get('io');
        if (io) {
            io.emit('fftUpdate', {
                type: 'rowUpdated',
                fileId,
                entryNumber: en,
                updates: finalUpdates
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
        const { folderId, eventName, eventFileId, participantData, entryMethod, participantNumber } = req.body;
        if (!eventName || !participantData) {
            return res.status(400).json({ success: false, error: 'eventName and participantData are required' });
        }

        console.log(`[FFT] fftSubmit received — event: "${eventName}", entryMethod: "${entryMethod}"`);

        let fileId, sheetFileName;

        if (eventFileId) {
            // File ID already known — skip the Drive lookup
            fileId = eventFileId;
            sheetFileName = eventName;
            console.log(`[FFT] Using provided fileId: ${fileId}`);
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

        console.log(`[FFT] Appending to sheet "${sheetFileName}" (${fileId})`);

        // For pre-registered participants, skip row creation
        if (entryMethod === 'participantNumber' || participantNumber) {
            console.log(`[FFT] Pre-registered participant (entry ${participantNumber}) - skipping row creation`);
            return res.json({ 
                success: true, 
                skipped: true,
                message: 'Pre-registered participant - no new row created',
                sheetName: sheetFileName, 
                fileId,
                participantNumber
            });
        }

        const {
            name = '', phone = '', gender = '',
            dateOfBirth = '', age: providedAge = '',
        } = participantData;

        // Skip if no name provided
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, error: 'Participant name is required' });
        }

        // Check if participant already exists in the sheet
        try {
            const sheetData = await googleDriveController.readSpreadsheet(fileId);
            if (sheetData.success && sheetData.data) {
                const existingParticipant = sheetData.data.find(row => {
                    // Compare name (first column) case-insensitively
                    return row[0] && row[0].toString().trim().toLowerCase() === name.trim().toLowerCase();
                });

                if (existingParticipant) {
                    console.log(`[FFT] Participant "${name}" already exists in sheet ${fileId}. Skipping.`);
                    return res.json({ 
                        success: true, 
                        skipped: true,
                        message: `Participant "${name}" already exists in this event. Record skipped.`,
                        sheetName: sheetFileName, 
                        fileId
                    });
                }
            }
        } catch (e) {
            console.warn('[FFT] Could not check for existing participant:', e.message);
            // Continue with upload even if check fails
        }

        // Parse dateOfBirth (dd/mm/yyyy) into DD, MM, YYYY columns
        const dobParts = String(dateOfBirth).split('/');
        const dd = dobParts[0] || '';
        const mm = dobParts[1] || '';
        const yyyy = dobParts[2] || '';

        // Calculate age from date of birth
        let age = providedAge;
        if (yyyy && mm && dd) {
            const birthDate = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            // Adjust age if birthday hasn't occurred yet this year
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            
            age = calculatedAge > 0 ? calculatedAge : '';
        }

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

// POST endpoint to retrieve participant data by entry number
router.post('/participant/:entryNumber', async (req, res) => {
    try {
        const { entryNumber } = req.params;
        const { fileId } = req.body;
        
        console.log('[FFT] Participant lookup requested for entry number:', entryNumber);
        
        if (!entryNumber) {
            return res.status(400).json({ success: false, error: 'entryNumber is required' });
        }

        if (!fileId) {
            return res.status(400).json({ success: false, error: 'fileId is required' });
        }

        console.log('[FFT] Looking up entry number:', entryNumber, 'in file:', fileId);
        const entryNum = parseInt(entryNumber, 10);

        // Retrieve the specific row from the spreadsheet
        const result = await googleDriveController.getRow(fileId, entryNum);
        console.log('[FFT] getRow result:', JSON.stringify(result, null, 2));
        
        if (!result.success) {
            console.error('[FFT] Failed to get row:', result.error);
            return res.status(404).json({ success: false, error: 'Participant not found' });
        }

        const row = result.data;
        console.log('[FFT] Raw row data:', JSON.stringify(row, null, 2));
        
        if (!row || Object.keys(row).length === 0) {
            console.error('[FFT] Row is empty or null');
            return res.status(404).json({ success: false, error: 'Participant not found' });
        }

        // Map the row data to participant fields
        // row is a keyed object with headers like 'Name', 'Chinese Name', 'Phone Number', etc.
        const participantData = {
            name: row['Name'] || '',
            chineseName: row['Chinese Name'] || '',
            phone: row['Phone Number'] || '',
            gender: row['Gender'] || '',
            dateOfBirth: `${String(row['DD'] || '').padStart(2, '0')}/${String(row['MM'] || '').padStart(2, '0')}/${row['YYYY'] || ''}`,
            age: row['Age'] || ''
        };

        console.log('[FFT] Mapped participant data:', JSON.stringify(participantData, null, 2));
        res.json({ success: true, data: participantData });
    } catch (error) {
        console.error('[FFT] Error in POST /participant/:entryNumber:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;