var express = require('express');
var router = express.Router();
var GoogleDriveController = require('../Controller/Google/GoogleDriveController');
var fs = require('fs');
var path = require('path');
const XLSX = require('xlsx');
const XlsxPopulate = require('xlsx-populate');

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

        const folderId = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';

        // Use findSheetByEventName which checks year subfolders then falls back to root
        const findResult = await googleDriveController.findSheetByEventName(folderId, eventName);
        if (!findResult.success) {
            console.error('[FFT] No file found matching event:', eventName);
            return res.status(404).json({ success: false, error: 'No file found for this event' });
        }

        const fileId = findResult.file.id;
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

// POST endpoint to generate a pre-filled Excel template with one sheet per time slot
router.post('/generateTemplate', async (req, res) => {
    try {
        const { eventName } = req.body;
        if (!eventName) {
            return res.status(400).json({ success: false, error: 'eventName is required' });
        }

        const INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';
        const result = await googleDriveController.readSpreadsheet(INDEX_SHEET_ID);
        if (!result.success) {
            return res.status(500).json({ success: false, error: 'Failed to read index sheet' });
        }

        // Find the row for this event (column B = event name, column C = time slots)
        // Sheet columns: A=S/N, B=Event Name, C=Time Slots, D=Max Participants, E=Created On, F=File ID
        const eventRow = (result.data || []).find(row => (row[1] || '').trim() === eventName.trim());
        const timeSlotsStr = eventRow ? (eventRow[2] || '') : '';
        const maxParticipants = eventRow ? parseInt(eventRow[3], 10) : NaN;
        const PREFILL_ROWS = (!isNaN(maxParticipants) && maxParticipants > 0) ? maxParticipants : 40;

        // Parse "Slot 1: 09:00-10:00, Slot 2: 10:00-11:00" → [{label, start, end}]
        let slots = [];
        if (timeSlotsStr) {
            const parts = timeSlotsStr.split(',').map(s => s.trim()).filter(Boolean);
            for (const part of parts) {
                // e.g. "Slot 1: 09:00-10:00"
                const m = part.match(/^(Slot\s*\d+):\s*(\d{2}:\d{2})-(\d{2}:\d{2})$/i);
                if (m) {
                    slots.push({ label: m[1].trim(), start: m[2], end: m[3] });
                } else {
                    slots.push({ label: part, start: '', end: '' });
                }
            }
        }
        if (slots.length === 0) {
            slots = [{ label: 'Sheet1', start: '', end: '' }];
        }

        // Export the real Google Sheet template as xlsx bytes (preserves formatting & bold headers)
        const TEMPLATE_FILE_ID = '1xu3UtY6fm3O09_vwlCk1p_NZM0waWrzUMsDGmJbmNDk';
        const drive = await googleDriveController.initializeAuth();
        const exportResponse = await drive.files.export(
            { fileId: TEMPLATE_FILE_ID, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            { responseType: 'arraybuffer' }
        );
        const templateBuffer = Buffer.from(exportResponse.data);

        // Load the template workbook and clone it per slot
        // Column order: A=Name, B=Chinese Name, C=Phone Number, D=Gender,
        //               E=DOB, F=Start Time, G=End Time
        const START_TIME_COL = 6; // F
        const TIME_END_COL = 7;   // G

        const wb = await XlsxPopulate.fromDataAsync(templateBuffer);
        const firstSheet = wb.sheet(0);

        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            // Colons are invalid in Excel sheet names — replace with dots
            const safeTimes = `${slot.start.replace(/:/g, '.')}-${slot.end.replace(/:/g, '.')}`;
            const sheetName = `${slot.label} (${safeTimes})`.slice(0, 31);

            let ws;
            if (i === 0) {
                ws = firstSheet.name(sheetName);
            } else {
                // Copy the first sheet as a new sheet for each additional slot
                ws = wb.cloneSheet(firstSheet, sheetName);
            }

            // Format DOB column (E = col 5) as plain text so Excel never auto-converts entries
            const DOB_COL = 5;
            for (let r = 0; r < PREFILL_ROWS; r++) {
                ws.cell(r + 2, DOB_COL).style('numberFormat', '@');
            }

            // Fill Start Time and Time End for PREFILL_ROWS data rows (row 2 onwards)
            for (let r = 0; r < PREFILL_ROWS; r++) {
                if (slot.start) ws.cell(r + 2, START_TIME_COL).value(slot.start);
                if (slot.end)   ws.cell(r + 2, TIME_END_COL).value(slot.end);
            }
        }

        const buf = await wb.outputAsync();
        const fileName = `${eventName} - Registration Template.xlsx`;
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
            'Content-Length': buf.length,
        });
        res.send(buf);
    } catch (error) {
        console.error('[FFT] Error in POST /generateTemplate:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to update File ID (column E) in the index sheet for a given event S/N
router.post('/updateEventFileId', async (req, res) => {
    try {
        const { serialNumber, fileId } = req.body;
        if (!serialNumber || !fileId) {
            return res.status(400).json({ success: false, error: 'serialNumber and fileId are required' });
        }
        const result = await googleDriveController.updateIndexFileId(serialNumber, fileId);
        if (!result.success) {
            return res.status(500).json(result);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('[FFT] Error in POST /updateEventFileId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to find or create a year-named subfolder inside a parent folder
router.post('/getOrCreateYearFolder', async (req, res) => {
    try {
        const { parentFolderId, year } = req.body;
        if (!parentFolderId || !year) {
            return res.status(400).json({ success: false, error: 'parentFolderId and year are required' });
        }
        const result = await googleDriveController.getOrCreateYearFolder(parentFolderId, String(year));
        if (!result.success) {
            return res.status(500).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('[FFT] Error in POST /getOrCreateYearFolder:', error.message);
        res.status(500).json({ success: false, error: error.message });
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

        // For pre-registered participants — update Health Declaration & Indemnity columns
        if (entryMethod === 'participantNumber' || participantNumber) {
            const entryNum = parseInt(participantNumber, 10);
            console.log(`[FFT] Pre-registered participant (entry ${entryNum}) - updating Health Declaration & Indemnity`);

            // Generate acknowledgement string in Singapore time (Asia/Singapore, UTC+8)
            const sgNow = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Singapore', hour12: false });
            // en-GB gives "DD/MM/YYYY, HH:MM:SS" — strip the comma
            const acknowledgedStr = `Acknowledged as per ${sgNow.replace(',', '')}`;

            const updateResult = await googleDriveController.updateRow(fileId, entryNum, {
                'Health Declaration': acknowledgedStr,
                'Indemnity': acknowledgedStr,
            });

            if (!updateResult.success) {
                console.warn(`[FFT] Could not update Health Declaration/Indemnity for entry ${entryNum}:`, updateResult.error);
            }

            return res.json({
                success: true,
                updated: true,
                message: 'Health Declaration & Indemnity acknowledged',
                sheetName: sheetFileName,
                fileId,
                participantNumber: entryNum,
            });
        }

        const {
            name = '', chineseName = '', phone = '', gender = '',
            dateOfBirth = '', age: providedAge = '',
            startTime = '', endTime = '',
            height = '', weight = '', bmi = '',
            dateOfTest: providedDateOfTest = '',
            healthDeclaration = '', indemnity = '',
            sitStand = '', armBanding = '', marchingInPlace = '',
            sitReach = '', backStretching = '', speedWalk = '',
            gripTest = '', improvements = '', remarks = '',
        } = participantData;

        // Normalise to strings (Excel bulk upload may send numbers)
        const nameStr       = String(name || '').trim();
        const chineseNameStr = String(chineseName || '').trim();
        const phoneStr      = String(phone || '').trim();
        const genderStr     = String(gender || '').trim();

        // Skip if no name provided
        if (!nameStr) {
            return res.status(400).json({ success: false, error: 'Participant name is required' });
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
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            age = calculatedAge > 0 ? calculatedAge : '';
        }

        // Check if participant already exists in the sheet
        let currentRowCount = 0;
        try {
            const sheetData = await googleDriveController.readSpreadsheet(fileId);
            if (sheetData.success && sheetData.data) {
                currentRowCount = sheetData.data.length;

                // Build header-aware lookup so the check works regardless of whether
                // the sheet has an S/N column or uses the old layout (no S/N column).
                const headers = (sheetData.columns || []).map(h => String(h || '').trim());
                const col = (name) => headers.indexOf(name); // returns -1 if missing

                const nameIdx   = col('Name')   !== -1 ? col('Name')   : 0;
                const phoneIdx  = col('Phone Number') !== -1 ? col('Phone Number') : 2;
                const genderIdx = col('Gender') !== -1 ? col('Gender') : 3;
                const ddIdx     = col('DD')     !== -1 ? col('DD')     : 4;
                const mmIdx     = col('MM')     !== -1 ? col('MM')     : 5;
                const yyyyIdx   = col('YYYY')   !== -1 ? col('YYYY')   : 6;

                const existingIndex = sheetData.data.findIndex(row => {
                    const rowName   = (row[nameIdx]   || '').toString().trim().toLowerCase();
                    const rowPhone  = (row[phoneIdx]  || '').toString().trim();
                    const rowGender = (row[genderIdx] || '').toString().trim().toLowerCase();
                    const rowDD     = (row[ddIdx]     || '').toString().trim();
                    const rowMM     = (row[mmIdx]     || '').toString().trim();
                    const rowYYYY   = (row[yyyyIdx]   || '').toString().trim();

                    return (
                        rowName   === nameStr.toLowerCase() &&
                        rowPhone  === phoneStr &&
                        rowGender === genderStr.toLowerCase() &&
                        parseInt(rowDD, 10) === parseInt(dd, 10) &&
                        parseInt(rowMM, 10) === parseInt(mm, 10) &&
                        rowYYYY   === String(yyyy || '').trim()
                    );
                });

                if (existingIndex !== -1) {
                    // +1: convert 0-based data index to 1-based participant number (row 2 = participant 1)
                    const existingEntryNumber = existingIndex + 1;
                    console.log(`[FFT] Participant "${nameStr}" already registered at entry ${existingEntryNumber} in sheet ${fileId}.`);
                    return res.status(409).json({
                        success: false,
                        alreadyRegistered: true,
                        participantNumber: existingEntryNumber,
                        message: `Participant "${nameStr}" is already registered for this event (Participant #${existingEntryNumber}).`,
                    });
                }
            }
        } catch (e) {
            console.warn('[FFT] Could not check for existing participant:', e.message);
            // Continue with upload even if check fails
        }

        // Date of test — extract from event name (e.g. "2026/04/11 ..." or "2026-04-11 ...")
        // Expected format in name: yyyy/mm/dd or yyyy-mm-dd at the start
        let dateOfTest = '';
        const dateMatch = String(eventName).match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
        if (dateMatch) {
            // reformat yyyy/mm/dd → dd/mm/yyyy
            dateOfTest = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
        }

        // Generate acknowledgement string in Singapore time (Asia/Singapore, UTC+8)
        // Only for individual registrations — bulk uploads skip the timestamp
        let acknowledgedStr = '';
        if (entryMethod !== 'Bulk Registration') {
            const sgNow = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Singapore', hour12: false });
            acknowledgedStr = `Acknowledged as per ${sgNow.replace(',', '')}`;
        }

        // Row order matches sheet headers:
        // S/N | Name | Chinese Name | Phone Number | Gender | DD | MM | YYYY |
        // Start Time | End Time | Age |
        // Height | Weight | BMI | Date of test |
        // Health Declaration | Indemnity |
        // 30 secs Sit & Stand | 30 secs Arm Banding | 2 min On-the-spot Marching |
        // Sit & Reach | Back Stretching | 2.44m Speed Walk | Grip test | Improvements | Remarks
        const nextSN = currentRowCount + 1;
        const rowData = [
            String(nextSN),                                          // A: S/N
            nameStr, chineseNameStr, phoneStr, genderStr,            // B C D E: Name, Chinese Name, Phone, Gender
            dd, mm, yyyy,                                            // F G H: DD, MM, YYYY
            String(startTime || ''), String(endTime || ''),          // I J: Start Time, End Time
            String(age),                                             // K: Age
            String(height), String(weight), String(bmi),             // L M N: Height, Weight, BMI
            dateOfTest || String(providedDateOfTest),                // O: Date of test
            acknowledgedStr,                                         // P: Health Declaration
            acknowledgedStr,                                         // Q: Indemnity
            String(sitStand), String(armBanding), String(marchingInPlace), // R S T: test results
            String(sitReach), String(backStretching), String(speedWalk),   // U V W: test results
            String(gripTest), String(improvements), String(remarks),       // X Y Z: Grip test, Improvements, Remarks
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

// POST endpoint to list all participants in a spreadsheet
router.post('/getParticipants', async (req, res) => {
    try {
        const { fileId } = req.body;
        if (!fileId) {
            return res.status(400).json({ success: false, error: 'fileId is required' });
        }

        const result = await googleDriveController.readSpreadsheet(fileId);
        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error || 'Failed to read spreadsheet' });
        }

        const headers = (result.columns || []).map(h => String(h || '').trim());
        const rows = result.data || [];

        if (headers.length === 0 || rows.length === 0) {
            return res.json([]);
        }

        const participants = rows
            .filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
            .map(row => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i] !== undefined ? String(row[i]) : '';
                });
                return obj;
            });

        console.log('[FFT] getParticipants - headers:', JSON.stringify(headers.slice(0, 8)));
        console.log('[FFT] getParticipants - first row sample:', JSON.stringify(participants[0]));
        console.log('[FFT] getParticipants - count:', participants.length);
        res.json(participants);
    } catch (error) {
        console.error('[FFT] Error in POST /getParticipants:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to update a single participant row by row index
router.post('/updateParticipant', async (req, res) => {
    try {
        const { fileId, rowIndex, participantData } = req.body;
        if (!fileId || rowIndex == null || !participantData) {
            return res.status(400).json({ success: false, error: 'fileId, rowIndex, and participantData are required' });
        }

        // rowIndex is 0-based from the frontend; entryNumber is 1-based (header row is row 1 in sheet)
        const entryNumber = parseInt(rowIndex, 10) + 1;

        const updates = {};
        for (const [key, value] of Object.entries(participantData)) {
            if (key !== '#' && value !== null && value !== undefined) {
                updates[key] = String(value);
            }
        }

        const result = await googleDriveController.updateRow(fileId, entryNumber, updates);
        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[FFT] Error in POST /updateParticipant:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to create a full FFT event: copies participant template sheet and
// Write event row to index sheet (S/N, Event Name, Time Slots, Max Participants, Created On)
router.post('/createFFTEvent', async (req, res) => {
    try {
        const { eventName, timeSlots, maxParticipants, createdOn } = req.body;
        if (!eventName || !timeSlots || !createdOn) {
            return res.status(400).json({ success: false, error: 'eventName, timeSlots, and createdOn are required' });
        }

        const INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';

        console.log(`[FFT] createFFTEvent — event: "${eventName}"`);

        const appendResult = await googleDriveController.appendFFTEventRow(
            INDEX_SHEET_ID,
            eventName,
            timeSlots,
            maxParticipants || '',
            createdOn
        );
        if (!appendResult.success) {
            const isDuplicate = appendResult.error && appendResult.error.includes('duplicate');
            if (isDuplicate) {
                return res.status(409).json({ success: false, error: 'An event with the same details already exists.' });
            }
            return res.status(500).json({ success: false, error: appendResult.error || 'Failed to write to index sheet' });
        }

        res.json({
            success: true,
            eventName,
            serialNumber: appendResult.serialNumber,
            timeSlots,
            createdOn,
        });
    } catch (error) {
        console.error('[FFT] Error in POST /createFFTEvent:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to export a Google Sheet as .xlsx
router.post('/exportSpreadsheet', async (req, res) => {
    try {
        const { fileId, fileName } = req.body;
        if (!fileId) {
            return res.status(400).json({ success: false, error: 'fileId is required' });
        }
        const drive = await googleDriveController.initializeAuth();
        const exportResponse = await drive.files.export(
            { fileId, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(exportResponse.data);
        const safeFileName = (fileName || 'spreadsheet').replace(/[^a-zA-Z0-9_\-. ]/g, '_') + '.xlsx';
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFileName)}"`,
            'Content-Length': buffer.length,
        });
        res.send(buffer);
    } catch (error) {
        console.error('[FFT] Error in POST /exportSpreadsheet:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;