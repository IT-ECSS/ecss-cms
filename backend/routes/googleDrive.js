var express = require('express');
var router = express.Router();
var GoogleDriveController = require('../Controller/Google/GoogleDriveController');
var fs = require('fs');
var path = require('path');
const XLSX = require('xlsx');
const XlsxPopulate = require('xlsx-populate');
const JSZip = require('jszip');
const { COLUMN_HEADERS } = require('../constants/fftFieldMappings');
const REGISTRATION_TEMPLATE_FILE_ID = '1xu3UtY6fm3O09_vwlCk1p_NZM0waWrzUMsDGmJbmNDk';
const FFT_INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';
const LOP_ECSS_SPREADSHEET_ID = '1MC6bUg22CD-a4v9zcDKwLiQXx12Jjg-D_nPWw9SOSOs';
const LOP_ECSS_SHEET_NAME = 'ECSS Course Code (LOP)';
const LOP_MAP_CACHE_TTL_MS = 5 * 60 * 1000;
const LOP_LOCAL_FILE_PATH = path.join(
    __dirname,
    '../../frontend/public/external/Final Approval for NSA course titles_FY25 (ECSS).xlsx'
);

const googleDriveController = new GoogleDriveController();

const LANGUAGE_SUFFIXES = [
    ' - Mandarin L1', ' - Mandarin L2', ' - Mandarin', ' - English', ' - Malay'
];

const SYSTEM_NAME_ALIASES = {
    'hanyu pinyin for intermediate': 'hanyu pinyin - intermediate',
    'healthy minds, healthy lives': 'c3a agemap - healthy minds for healthy lives',
    'fall prevention and functional improvement training': 'fall prevention & functional improvement training',
    "tcm - don't be a friend of chronic diseases": "tcm - don't be a friend of chronic diseases",
    'art of paper quiliing': 'the art of paper quilling',
    'art of paper quilling': 'the art of paper quilling'
};

const BARE_LANGUAGE_WORDS = new Set(['malay', 'english', 'mandarin', 'chinese']);
let lopCourseCodeMapCache = {
    ts: 0,
    key: '',
    map: null
};

function parseSpreadsheetId(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';
    if (!/^https?:\/\//i.test(raw)) return raw;

    const sheetsMatch = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(raw);
    if (sheetsMatch) return sheetsMatch[1];

    const driveFileMatch = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(raw);
    if (driveFileMatch) return driveFileMatch[1];

    return '';
}

function getLopSourceConfig(requestBody = {}) {
    const spreadsheetId =
        parseSpreadsheetId(requestBody.spreadsheetId) ||
        parseSpreadsheetId(requestBody.fileId) ||
        parseSpreadsheetId(requestBody.spreadsheetUrl) ||
        parseSpreadsheetId(requestBody.fileUrl) ||
        parseSpreadsheetId(process.env.LOP_ECSS_SPREADSHEET_ID) ||
        LOP_ECSS_SPREADSHEET_ID;

    const sheetName = String(
        requestBody.sheetName ||
        process.env.LOP_ECSS_SHEET_NAME ||
        LOP_ECSS_SHEET_NAME
    ).trim();

    return { spreadsheetId, sheetName: sheetName || LOP_ECSS_SHEET_NAME };
}

function getGoogleServiceAccountEmail() {
    try {
        if (process.env.GOOGLE_SERVICE_ACCOUNT_NORSE) {
            const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_NORSE);
            if (parsed?.client_email) return parsed.client_email;
        }

        if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
            try {
                const parsed = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
                if (parsed?.client_email) return parsed.client_email;
            } catch {
                const decoded = Buffer.from(process.env.GOOGLE_DRIVE_CREDENTIALS, 'base64').toString('utf8');
                const parsed = JSON.parse(decoded);
                if (parsed?.client_email) return parsed.client_email;
            }
        }

        const keyFile = path.join(__dirname, '../config/norse-study-479913-b7-00b6903f8f4f.json');
        if (fs.existsSync(keyFile)) {
            const parsed = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
            if (parsed?.client_email) return parsed.client_email;
        }
    } catch {
        // Ignore and return fallback below.
    }

    return 'Google service account email not available from current config';
}

function enrichLopError(error, spreadsheetId) {
    const message = String(error?.message || error || 'Unknown error');
    const notFoundOrNoAccess = /file not found|not found:|insufficient|permission|forbidden|404/i.test(message);
    if (!notFoundOrNoAccess) return message;

    const serviceAccountEmail = getGoogleServiceAccountEmail();
    return `Cannot access LOP source file ${spreadsheetId}. Share the Excel file with this service account email: ${serviceAccountEmail}. Original error: ${message}`;
}

function normalizeCourseName(name = '') {
    return String(name)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2018\u2019\u201A]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .toLowerCase();
}

function hasChinese(str = '') {
    return /[\u4e00-\u9fa5]/.test(String(str));
}

function extractEnglish(raw) {
    if (!raw) return '';

    const str = String(raw).trim()
        .replace(/（/g, '(')
        .replace(/）/g, ')');

    const first = str.indexOf('(');
    const last = str.lastIndexOf(')');

    if (first !== -1 && last > first) {
        const inner = str.slice(first + 1, last).trim();
        if (!hasChinese(inner)) {
            return inner.replace(/\s+/g, ' ');
        }
    }

    if (!hasChinese(str)) {
        return str.replace(/\s+/g, ' ');
    }

    return '';
}

function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function buildLopCourseCodeMap(rows = []) {
    const map = {};
    let lastCode = null;
    let lastNetPrice = null;

    const addEntry = (engName, code, netPrice) => {
        const key = normalizeCourseName(engName);
        if (!key) return;
        const entry = {
            code,
            canonicalName: engName,
            netPrice
        };
        if (!map[key]) {
            map[key] = [entry];
            return;
        }
        map[key].push(entry);
    };

    for (const row of rows) {
        const colA = String(row?.[0] || '').trim();
        const colB = String(row?.[1] || '').trim();
        const colD = toNumberOrNull(row?.[3]);
        const colE = toNumberOrNull(row?.[4]);

        if (/^ECSS-CBO-M-\d+[A-Z]$/i.test(colA)) {
            lastCode = colA.toUpperCase();
            if (colD !== null && colE !== null) {
                lastNetPrice = Math.round((colD - colE) * 100) / 100;
            } else {
                lastNetPrice = null;
            }

            const eng = extractEnglish(colB);
            if (eng && !BARE_LANGUAGE_WORDS.has(eng.toLowerCase())) {
                addEntry(eng, lastCode, lastNetPrice);
            }
            continue;
        }

        if (!colA && lastCode && colB) {
            const eng = extractEnglish(colB);
            if (eng && !BARE_LANGUAGE_WORDS.has(eng.toLowerCase())) {
                addEntry(eng, lastCode, lastNetPrice);
            }
        }
    }

    return map;
}

async function getLopCourseCodeMap(sourceConfig = {}) {
    const spreadsheetId = sourceConfig.spreadsheetId || LOP_ECSS_SPREADSHEET_ID;
    const sheetName = sourceConfig.sheetName || LOP_ECSS_SHEET_NAME;
    const cacheKey = `${spreadsheetId}:${sheetName}`;
    const now = Date.now();
    if (
        lopCourseCodeMapCache.map &&
        lopCourseCodeMapCache.key === cacheKey &&
        now - lopCourseCodeMapCache.ts < LOP_MAP_CACHE_TTL_MS
    ) {
        return lopCourseCodeMapCache.map;
    }

    const rows = await readLopRowsFromDrive(spreadsheetId, sheetName);

    const map = buildLopCourseCodeMap(rows);
    lopCourseCodeMapCache = { ts: now, key: cacheKey, map };
    return map;
}

async function readLopRowsFromDrive(spreadsheetId, sheetName) {
    const sheetResult = await googleDriveController.readSpreadsheet(spreadsheetId, sheetName);
    if (sheetResult.success) {
        const rows = [];
        if (Array.isArray(sheetResult.columns) && sheetResult.columns.length) {
            rows.push(sheetResult.columns);
        }
        if (Array.isArray(sheetResult.data) && sheetResult.data.length) {
            rows.push(...sheetResult.data);
        }
        return rows;
    }

    const readError = String(sheetResult.error || '');
    const unsupportedOfficeFile =
        /not supported for this document/i.test(readError) ||
        /must not be an office file/i.test(readError);

    if (!unsupportedOfficeFile) {
        if (/file not found|not found:|permission|forbidden|insufficient/i.test(readError)) {
            return readLopRowsFromLocalWorkbook(sheetName);
        }
        throw new Error(readError || 'Unable to read LOP course code sheet');
    }

    const downloaded = await googleDriveController.downloadFile(spreadsheetId);
    if (!downloaded.success || !downloaded.fileBuffer) {
        const downloadError = String(downloaded.error || 'Unable to download LOP Excel workbook');
        if (/file not found|not found:|permission|forbidden|insufficient/i.test(downloadError)) {
            return readLopRowsFromLocalWorkbook(sheetName);
        }
        throw new Error(downloadError);
    }

    const workbook = XLSX.read(downloaded.fileBuffer, { type: 'buffer' });
    const targetSheetName = workbook.SheetNames.includes(sheetName)
        ? sheetName
        : workbook.SheetNames[0];

    if (!targetSheetName) {
        return [];
    }

    const worksheet = workbook.Sheets[targetSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
}

function readLopRowsFromLocalWorkbook(sheetName) {
    if (!fs.existsSync(LOP_LOCAL_FILE_PATH)) {
        throw new Error('LOP source file is not accessible in Google Drive and local fallback file is missing');
    }

    console.warn(`[LOP] Using local fallback workbook: ${LOP_LOCAL_FILE_PATH}`);
    const workbook = XLSX.readFile(LOP_LOCAL_FILE_PATH);
    const targetSheetName = workbook.SheetNames.includes(sheetName)
        ? sheetName
        : workbook.SheetNames[0];

    if (!targetSheetName) return [];

    const worksheet = workbook.Sheets[targetSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
}

function pickLopEntry(entries, price = null) {
    if (!Array.isArray(entries) || entries.length === 0) return null;
    if (price !== null) {
        const exact = entries.find((entry) => entry.netPrice !== null && Math.abs(entry.netPrice - price) <= 0.01);
        if (exact) return exact;
        if (entries.length === 1) return entries[0];
        return null;
    }
    return entries[0];
}

function buildLookupCandidates(courseName) {
    const norm = normalizeCourseName(courseName || '');
    if (!norm) return [];

    const candidates = [norm];

    const alias = SYSTEM_NAME_ALIASES[norm];
    if (alias) candidates.push(normalizeCourseName(alias));

    const andVariant = norm.replace(/\band\b/g, '&');
    if (andVariant !== norm) candidates.push(andVariant);

    for (const suffix of LANGUAGE_SUFFIXES) {
        const normalizedSuffix = normalizeCourseName(suffix);
        if (!norm.endsWith(normalizedSuffix)) continue;

        const stripped = norm.slice(0, -normalizedSuffix.length).trim();
        if (!stripped) continue;

        candidates.push(stripped);

        const strippedAlias = SYSTEM_NAME_ALIASES[stripped];
        if (strippedAlias) candidates.push(normalizeCourseName(strippedAlias));

        const strippedAndVariant = stripped.replace(/\band\b/g, '&');
        if (strippedAndVariant !== stripped) candidates.push(strippedAndVariant);
    }

    return [...new Set(candidates)];
}

function lookupLopCourseCode(map, courseName, price = null) {
    const candidates = buildLookupCandidates(courseName);
    for (const key of candidates) {
        const entry = pickLopEntry(map[key], price);
        if (entry) return entry;
    }
    return null;
}

function isUrlLike(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
}

// Resolves URL-shaped registration links to the corresponding FFT participant file ID.
// Accepts either a direct fileId or a registrationLink URL; falls back to eventName matching.
async function resolveFFTFileId(inputFileId, eventName = '') {
    const raw = String(inputFileId || '').trim();
    if (!raw) return '';
    if (!isUrlLike(raw)) return raw;

    // If the URL is a direct Google Sheets link, extract the file ID from it
    const sheetsMatch = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(raw);
    if (sheetsMatch) return sheetsMatch[1];

    const result = await googleDriveController.readSpreadsheet(FFT_INDEX_SHEET_ID);
    if (!result.success) return '';

    const rows = result.data || [];
    const normalizedEventName = String(eventName || '').trim();
    const matched = rows.find((row) => {
        const rowEventName = String(row[1] || '').trim();
        const rowRegistrationLink = String(row[7] || '').trim();
        if (rowRegistrationLink && rowRegistrationLink === raw) return true;
        if (normalizedEventName && rowEventName === normalizedEventName) return true;
        return false;
    });

    return matched ? String(matched[6] || '').trim() : '';
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

// POST endpoint to return parsed ECSS LOP course-code map from Google Sheets.
router.post('/lopCourseCodeMap', async (req, res) => {
    try {
        const sourceConfig = getLopSourceConfig(req.body || {});
        const map = await getLopCourseCodeMap(sourceConfig);
        return res.json({
            success: true,
            spreadsheetId: sourceConfig.spreadsheetId,
            sheetName: sourceConfig.sheetName,
            map
        });
    } catch (error) {
        const sourceConfig = getLopSourceConfig(req.body || {});
        const friendlyError = enrichLopError(error, sourceConfig.spreadsheetId);
        console.error('Error in POST /lopCourseCodeMap:', friendlyError);
        return res.status(500).json({
            success: false,
            error: friendlyError
        });
    }
});

// POST endpoint to look up a single ECSS LOP course code by course name and optional price.
router.post('/lopCourseCode', async (req, res) => {
    try {
        const { courseName, price } = req.body || {};
        if (!courseName || !String(courseName).trim()) {
            return res.status(400).json({
                success: false,
                error: 'courseName is required'
            });
        }

        const sourceConfig = getLopSourceConfig(req.body || {});
        const map = await getLopCourseCodeMap(sourceConfig);
        const normalizedPrice = price === null || price === undefined || price === '' ? null : Number(price);
        const lookupPrice = Number.isFinite(normalizedPrice) ? normalizedPrice : null;
        const entry = lookupLopCourseCode(map, courseName, lookupPrice);

        return res.json({
            success: true,
            courseName,
            code: entry?.code || '',
            canonicalName: entry?.canonicalName || null,
            netPrice: entry?.netPrice ?? null
        });
    } catch (error) {
        const sourceConfig = getLopSourceConfig(req.body || {});
        const friendlyError = enrichLopError(error, sourceConfig.spreadsheetId);
        console.error('Error in POST /lopCourseCode:', friendlyError);
        return res.status(500).json({
            success: false,
            error: friendlyError
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
        const { eventName, slots: clientSlots } = req.body;
        if (!eventName) {
            return res.status(400).json({ success: false, error: 'eventName is required' });
        }

        let slots = [];

        // If the client sent a pre-edited slots array, use it directly
        if (Array.isArray(clientSlots) && clientSlots.length > 0) {
            const pad = t => t.includes(':') && t.length === 4 ? '0' + t : t;
            slots = clientSlots
                .filter(s => s && s.start && s.end)
                .map(s => ({ start: pad(String(s.start)), end: pad(String(s.end)) }));
            console.log(`[generateTemplate] Using client-provided slots:`, JSON.stringify(slots));
        } else {
            // Fall back to reading from the index sheet
            const INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';
            const result = await googleDriveController.readSpreadsheet(INDEX_SHEET_ID);
            if (!result.success) {
                return res.status(500).json({ success: false, error: 'Failed to read index sheet' });
            }

            const allRows = result.data || [];
            console.log(`[generateTemplate] Total rows in index sheet: ${allRows.length}`);
            console.log(`[generateTemplate] Looking for event: "${eventName}"`);
            allRows.forEach((row, i) => console.log(`[generateTemplate] Row ${i}: B="${row[1]}", C(Status)="${row[2]}", D(Time Slots)="${row[3]}"`));

            const eventRow = allRows.find(row => (row[1] || '').trim() === eventName.trim());
            // New order: C=Status, D=Time Slots. Keep fallback to C for legacy rows.
            const candidateSlots = eventRow ? String(eventRow[3] || '').trim() : '';
            const legacySlots = eventRow ? String(eventRow[2] || '').trim() : '';
            const timeSlotsStr = candidateSlots || legacySlots;
            console.log(`[generateTemplate] Found event row: ${!!eventRow}, timeSlotsStr: "${timeSlotsStr}"`);

            if (timeSlotsStr) {
                const parts = timeSlotsStr.split(',').map(s => s.trim()).filter(Boolean);
                for (const part of parts) {
                    const m = part.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
                    if (m) {
                        const pad = t => t.includes(':') && t.length === 4 ? '0' + t : t;
                        slots.push({ start: pad(m[1]), end: pad(m[2]) });
                    }
                }
            }
            console.log(`[generateTemplate] Parsed slots:`, JSON.stringify(slots));
        }

        const PREFILL_ROWS = 30; // Dropdown applied to rows 2–31

        // Export the Google Sheets template as base
        const drive = await googleDriveController.initializeAuth();
        const exportResponse = await drive.files.export(
            { fileId: REGISTRATION_TEMPLATE_FILE_ID, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            { responseType: 'arraybuffer' }
        );

        let workbookBuf = Buffer.from(exportResponse.data);

        if (slots.length > 0) {
            const startTimes = [...new Set(slots.map(s => s.start).filter(Boolean))];

            // Step 1: Use xlsx-populate to:
            //   a) Format columns E and F as Text (@) so Excel stores "08:00" as a string,
            //      not as a time serial (which displays as "8:00" or "8:00:00 AM").
            //   b) Inject IF formulas into column F (F2:F31) for auto-populate.
            const workbook = await XlsxPopulate.fromDataAsync(workbookBuf);
            const sheet = workbook.sheet(0);
            for (let rowNum = 2; rowNum <= PREFILL_ROWS + 1; rowNum++) {
                // Format contact number, start time, and end time as Text so Excel preserves leading zeros and dropdown values stay as strings
                sheet.cell(`B${rowNum}`).style('numberFormat', '@');
                sheet.cell(`E${rowNum}`).style('numberFormat', '@');
                sheet.cell(`F${rowNum}`).style('numberFormat', '@');

                // Auto-populate F based on E — plain string comparison works because
                // E is now Text-formatted (no time serial conversion)
                let inner = '""';
                for (let i = slots.length - 1; i >= 0; i--) {
                    inner = `IF(E${rowNum}="${slots[i].start}","${slots[i].end}",${inner})`;
                }
                sheet.cell(`F${rowNum}`).formula(`IF(E${rowNum}="","",${inner})`);
            }
            workbookBuf = await workbook.outputAsync();

            // Step 2: Use JSZip to patch the dataValidations block with a schema-valid version.
            // xlsx-populate's validation API emits a forbidden operator="between" attribute on
            // type="list" validations, causing Excel to silently remove them during repair.
            const zip = await JSZip.loadAsync(workbookBuf);
            let sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');

            // Remove any existing <dataValidations> block
            sheetXml = sheetXml.replace(/<dataValidations[\s\S]*?<\/dataValidations>/, '');

            const endTimes     = [...new Set(slots.map(s => s.end).filter(Boolean))];
            const startFormula = '&quot;' + ['Please select the time', ...startTimes].join(',') + '&quot;';
            const endFormula   = '&quot;' + ['Please select the time', ...endTimes].join(',') + '&quot;';
            const startSqref   = `E2:E${PREFILL_ROWS + 1}`;
            const endSqref     = `F2:F${PREFILL_ROWS + 1}`;
            console.log(`[generateTemplate] Validation formula - Start: ${startFormula}`);
            console.log(`[generateTemplate] Validation formula - End:   ${endFormula}`);

            const dvXml =
                `<dataValidations count="2">` +
                `<dataValidation type="list" allowBlank="0" showDropDown="0" showInputMessage="1" showErrorMessage="1" sqref="${startSqref}">` +
                `<formula1>${startFormula}</formula1>` +
                `</dataValidation>` +
                `<dataValidation type="list" allowBlank="0" showDropDown="0" showInputMessage="1" showErrorMessage="1" sqref="${endSqref}">` +
                `<formula1>${endFormula}</formula1>` +
                `</dataValidation>` +
                `</dataValidations>`;

            // Insert right after </sheetData> to respect OOXML element ordering
            if (sheetXml.includes('</sheetData>')) {
                sheetXml = sheetXml.replace('</sheetData>', '</sheetData>' + dvXml);
            } else {
                sheetXml = sheetXml.replace('</worksheet>', dvXml + '</worksheet>');
            }

            zip.file('xl/worksheets/sheet1.xml', sheetXml);
            workbookBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        }

        const buf = workbookBuf;
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

// POST endpoint to retrieve all events from the index sheet
// Returns: { rows: [{serialNumber, eventName, status, timeSlots, maxParticipants, createdOn, fileId, registrationLink, qrCodeUrl}] }
router.post('/getIndexSheet', async (req, res) => {
    try {
        const INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';
        const result = await googleDriveController.readSpreadsheet(INDEX_SHEET_ID);
        if (!result.success) {
            return res.status(500).json({ success: false, error: 'Failed to read index sheet' });
        }

        // Extract Google Sheets file ID from a URL like:
        // https://docs.google.com/spreadsheets/d/FILE_ID/edit...
        const extractFileIdFromUrl = (url) => {
            const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(String(url || ''));
            return m ? m[1] : '';
        };

        const rows = (result.data || [])
            .filter(row => row[1] && String(row[1]).trim()) // must have event name
            .map(row => {
                const registrationLink = String(row[7] || '').trim();
                let fileId = String(row[6] || '').trim();
                // If File ID column is empty but registration link is a Sheets URL, derive it
                if (!fileId && registrationLink) {
                    fileId = extractFileIdFromUrl(registrationLink);
                }
                return {
                    serialNumber:     String(row[0] || '').trim(),
                    eventName:        String(row[1] || '').trim(),
                    status:           String(row[2] || '').trim(),
                    timeSlots:        String(row[3] || '').trim(),
                    maxParticipants:  String(row[4] || '').trim(),
                    createdOn:        String(row[5] || '').trim(),
                    fileId,
                    registrationLink,
                    qrCodeUrl:        String(row[8] || '').trim(),
                };
            });
        res.json({ success: true, rows });
    } catch (error) {
        console.error('[FFT] Error in POST /getIndexSheet:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to update File ID (column E) in the index sheet for a given event S/N
router.post('/updateEventFileId', async (req, res) => {
    try {
        const { serialNumber, fileId, registrationLink, qrCodeUrl } = req.body;
        if (!serialNumber || !fileId) {
            return res.status(400).json({ success: false, error: 'serialNumber and fileId are required' });
        }
        const result = await googleDriveController.updateIndexFileId(serialNumber, fileId, registrationLink || '', qrCodeUrl || '');
        if (!result.success) {
            return res.status(500).json(result);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('[FFT] Error in POST /updateEventFileId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to set the File ID for an event by event name (repair/manual entry)
// Accepts sheetsUrl (full Google Sheets URL) OR fileId directly
router.post('/setEventFileId', async (req, res) => {
    try {
        const { eventName, sheetsUrl, fileId: rawFileId } = req.body;
        if (!eventName) {
            return res.status(400).json({ success: false, error: 'eventName is required' });
        }

        // Resolve file ID from URL or direct value
        let fileId = rawFileId ? String(rawFileId).trim() : '';
        if (!fileId && sheetsUrl) {
            const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(String(sheetsUrl));
            if (m) fileId = m[1];
        }
        if (!fileId) {
            return res.status(400).json({ success: false, error: 'Provide a valid Google Sheets URL or fileId' });
        }

        // Find matching row in index sheet by event name
        const sheetResult = await googleDriveController.readSpreadsheet(FFT_INDEX_SHEET_ID);
        if (!sheetResult.success) {
            return res.status(500).json({ success: false, error: 'Failed to read index sheet' });
        }

        const rows = sheetResult.data || [];
        const normalizedTarget = String(eventName).trim().toLowerCase();
        const rowIndex = rows.findIndex(row => String(row[1] || '').trim().toLowerCase() === normalizedTarget);
        if (rowIndex === -1) {
            return res.status(404).json({ success: false, error: `Event "${eventName}" not found in index sheet` });
        }

        // serialNumber = row[0] or use rowIndex+1 as fallback
        const serialNumber = String(rows[rowIndex][0] || rowIndex + 1).trim();
        const existingRegLink = String(rows[rowIndex][7] || '').trim();
        const existingQrCode  = String(rows[rowIndex][8] || '').trim();

        const updateResult = await googleDriveController.updateIndexFileId(
            serialNumber, fileId, existingRegLink, existingQrCode
        );
        if (!updateResult.success) {
            return res.status(500).json(updateResult);
        }

        // Invalidate cache so next getIndexSheet returns fresh data
        console.log(`[FFT] setEventFileId: set fileId="${fileId}" for event "${eventName}" (S/N ${serialNumber})`);
        res.json({ success: true, fileId, serialNumber });
    } catch (error) {
        console.error('[FFT] Error in POST /setEventFileId:', error.message);
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

// Helper: if fileId looks like a URL, resolve it to an actual Google Sheets file ID by event name
async function resolveFileId(rawId, eventName) {
    if (!rawId || !/^https?:\/\//i.test(String(rawId))) return rawId;
    if (!eventName) return rawId;
    try {
        const folderId = '1EsnCGO1QfPrqfmDtsy-cELUO3UyZKCci';
        const findResult = await googleDriveController.findSheetByEventName(folderId, eventName);
        if (findResult.success && findResult.file && findResult.file.id) {
            console.log('[FFT] resolveFileId: resolved URL to', findResult.file.id);
            return findResult.file.id;
        }
    } catch (e) {
        console.error('[FFT] resolveFileId error:', e.message);
    }
    return rawId;
}

// POST request to get a specific row by entry number
router.post('/getRow', async (req, res) => {
    try {
        let { fileId, entryNumber, eventName } = req.body;
        if (!fileId || !entryNumber) {
            return res.status(400).json({ success: false, error: 'fileId and entryNumber are required' });
        }
        fileId = await resolveFileId(fileId, eventName);
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
        let { fileId, entryNumber, updates, eventName } = req.body;
        console.log('[FFT] updateRow received - entryNumber:', entryNumber, 'updates:', updates);
        
        if (!fileId || entryNumber == null || !updates) {
            return res.status(400).json({ success: false, error: 'fileId, entryNumber, and updates are required' });
        }

        fileId = await resolveFileId(fileId, eventName);
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
            fileId = await resolveFFTFileId(eventFileId, eventName);
            if (!fileId) {
                return res.status(400).json({ success: false, error: 'Invalid eventFileId. Please reselect the event.' });
            }
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

        // For pre-registered participants — no additional columns to update
        if (entryMethod === 'participantNumber' || participantNumber) {
            const entryNum = parseInt(participantNumber, 10);
            console.log(`[FFT] Pre-registered participant (entry ${entryNum}) - skipping update`);

            return res.json({
                success: true,
                updated: true,
                message: 'Pre-registered participant acknowledged',
                sheetName: sheetFileName,
                fileId,
                participantNumber: participantNumber,
                participantNumberIndex: entryNum,
            });
        }

        const {
            name = '', phone = '', gender = '',
            dateOfBirth = '', age: providedAge = '',
            startTime = '', endTime = '',
            height = '', weight = '', bmi = '',
            dateOfTest: providedDateOfTest = '',
            sitStand = '', armBanding = '', marchingInPlace = '',
            sitReach = '', backStretching = '', speedWalk = '',
            gripTest = '', improvements = '', remarks = '',
        } = participantData;

        // Normalise to strings (Excel bulk upload may send numbers)
        const nameStr  = String(name || '').trim();
        const phoneStr = String(phone || '').trim();
        const genderStr = String(gender || '').trim();

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
        let lastSN = 0;
        const usedNumbers = new Set(); // every Participant Number already present in the sheet
        try {
            const sheetData = await googleDriveController.readSpreadsheet(fileId);
            if (sheetData.success && sheetData.data) {
                currentRowCount = sheetData.data.length;

                // Build header-aware lookup so the check works regardless of whether
                // the sheet has an S/N column or uses the old layout (no S/N column).
                const headers = (sheetData.columns || []).map(h => String(h || '').trim());
                const col = (name) => headers.indexOf(name); // returns -1 if missing

                // Determine the Participant Number column for auto-increment.
                // Support both new header ('Participant Number') and legacy header ('S/N').
                // Column A always holds the Participant Number, so default to index 0
                // when no matching header is detected — never fall back to row position.
                let snIdx = col('Participant Number') !== -1 ? col('Participant Number') : col('S/N');
                if (snIdx === -1) snIdx = 0;

                // Collect every used Participant Number so a number can never be reused.
                for (const row of sheetData.data) {
                    const snVal = parseInt(String(row[snIdx] || '0').trim(), 10);
                    if (!isNaN(snVal) && snVal > 0) usedNumbers.add(snVal);
                }
                // Base the next number on the LAST entry's Participant Number (the value
                // in column A of the last data row), not the row position or the max.
                if (sheetData.data.length > 0) {
                    const lastRow = sheetData.data[sheetData.data.length - 1];
                    const lastSnVal = parseInt(String(lastRow[snIdx] || '0').trim(), 10);
                    if (!isNaN(lastSnVal) && lastSnVal > 0) lastSN = lastSnVal;
                }
                // Fallback: use row count only if the last entry has no numeric number
                if (lastSN === 0) lastSN = currentRowCount;

                const nameIdx      = col('Name')         !== -1 ? col('Name')         : 0;
                const phoneIdx     = col('Phone Number')  !== -1 ? col('Phone Number')  : 2;
                const genderIdx    = col('Gender')        !== -1 ? col('Gender')        : 3;
                const ddIdx        = col('DD')            !== -1 ? col('DD')            : 4;
                const mmIdx        = col('MM')            !== -1 ? col('MM')            : 5;
                const yyyyIdx      = col('YYYY')          !== -1 ? col('YYYY')          : 6;
                const startTimeIdx = col('Start Time')    !== -1 ? col('Start Time')    : -1;

                const existingIndex = sheetData.data.findIndex(row => {
                    // const rowName      = (row[nameIdx]   || '').toString().trim().toLowerCase();
                    const rowPhone     = (row[phoneIdx]  || '').toString().trim();
                    // const rowGender    = (row[genderIdx] || '').toString().trim().toLowerCase();
                    // const rowDD        = (row[ddIdx]     || '').toString().trim();
                    // const rowMM        = (row[mmIdx]     || '').toString().trim();
                    // const rowYYYY      = (row[yyyyIdx]   || '').toString().trim();
                    // const rowStartTime = startTimeIdx !== -1 ? (row[startTimeIdx] || '').toString().trim() : null;

                    // Duplicate check: phone number only
                    return rowPhone !== '' && rowPhone === phoneStr;

                    // const sameBasicInfo = (
                    //     rowName   === nameStr.toLowerCase() &&
                    //     rowPhone  === phoneStr &&
                    //     rowGender === genderStr.toLowerCase() &&
                    //     parseInt(rowDD, 10) === parseInt(dd, 10) &&
                    //     parseInt(rowMM, 10) === parseInt(mm, 10) &&
                    //     rowYYYY   === String(yyyy || '').trim()
                    // );

                    // // Only flag as duplicate if both basic info AND start time match.
                    // // If start time column doesn't exist in sheet, fall back to basic info only.
                    // if (!sameBasicInfo) return false;
                    // if (rowStartTime !== null && startTime) {
                    //     return rowStartTime === String(startTime).trim();
                    // }
                    // return true;
                });

                if (existingIndex !== -1) {
                    // +1: convert 0-based data index to 1-based participant number (row 2 = participant 1)
                    const existingEntryNumber = existingIndex + 1;
                    console.log(`[FFT] Participant "${nameStr}" already registered at entry ${existingEntryNumber} in sheet ${fileId}.`);
                    return res.json({
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

        // Row order matches sheet headers:
        // A=Participant Number | B=Name | C=Phone Number | D=Gender | E=DD | F=MM | G=YYYY |
        // H=Start Time | I=End Time | J=Age |
        // K=Height | L=Weight | M=BMI | N=Date of test |
        // O=30 secs Sit & Stand | P=30 secs Arm Banding | Q=2 min On-the-spot Marching |
        // R=Sit & Reach | S=Back Stretching | T=2.44m Speed Walk | U=Grip test | V=Improvements | W=Remarks
        // Next available Participant Number: follow the highest existing number and
        // skip any number already used so a number can never be reused.
        let nextSN = lastSN + 1;
        while (usedNumbers.has(nextSN)) nextSN++;
        const rowData = [
            String(nextSN),                                                // A: Participant Number
            nameStr, phoneStr, genderStr,                                  // B C D: Name, Phone Number, Gender
            dd, mm, yyyy,                                                  // E F G: DD, MM, YYYY
            String(startTime || ''), String(endTime || ''),                // H I: Start Time, End Time
            String(age),                                                   // J: Age
            String(height), String(weight), String(bmi),                   // K L M: Height, Weight, BMI
            dateOfTest || String(providedDateOfTest),                      // N: Date of test
            String(sitStand), String(armBanding), String(marchingInPlace), // O P Q: 30s Sit&Stand, 30s Arm Banding, 2min Marching
            String(sitReach), String(backStretching), String(speedWalk),   // R S T: Sit&Reach, Back Stretching, 2.44m Speed Walk
            String(gripTest), String(improvements), String(remarks),       // U V W: Grip test, Improvements, Remarks
        ];

        const appendResult = await googleDriveController.appendRow(fileId, rowData);
        if (!appendResult.success) {
            return res.status(500).json(appendResult);
        }

        // Return the actual Participant Number written to column A (nextSN), not the
        // row-based entry number from appendRow.
        res.json({ success: true, sheetName: sheetFileName, fileId, entryNumber: nextSN, participantNumber: nextSN });
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
        // row is a keyed object with headers like 'Name', 'Phone Number', etc.
        const participantData = {
            name: row['Name'] || '',
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
        const { fileId, eventName } = req.body;
        if (!fileId) {
            return res.status(400).json({ success: false, error: 'fileId is required' });
        }

        const resolvedFileId = await resolveFFTFileId(fileId, eventName);
        if (!resolvedFileId) {
            return res.status(400).json({ success: false, error: 'Invalid fileId. Please reselect the event.' });
        }

        const result = await googleDriveController.readSpreadsheet(resolvedFileId);
        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error || 'Failed to read spreadsheet' });
        }

        let headers = (result.columns || []).map(h => String(h || '').trim());
        let rows = result.data || [];

        if (headers.length === 0) {
            return res.json([]);
        }

        // Smart fallback: if row 1 of the sheet doesn't have the expected 'Participant Number'
        // header it means the sheet was created without a header row and participant data was
        // written directly to row 1 (old appendRow behaviour). Re-interpret all values —
        // including what was read as "headers" — as data rows, and use COLUMN_HEADERS as
        // the canonical column schema so the table can still show the data.
        if (headers[0] !== 'Participant Number') {
            rows = [headers, ...rows];
            headers = [...COLUMN_HEADERS];
        }

        if (rows.length === 0) {
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

        // updateRow locates the row by the ACTUAL Participant Number (column A), not the
        // row position, so derive the participant number from the row's column A value.
        // Fall back to rowIndex+1 only if the data carries no Participant Number.
        const participantNumber = parseInt(String(participantData['Participant Number'] ?? '').trim(), 10);
        const entryNumber = !isNaN(participantNumber) && participantNumber > 0
            ? participantNumber
            : parseInt(rowIndex, 10) + 1;

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

// POST endpoint to delete a Drive file (spreadsheet or QR code image)
router.post('/deleteEvent', async (req, res) => {
    try {
        const { fileId } = req.body;
        if (!fileId) {
            return res.status(400).json({ success: false, error: 'fileId is required' });
        }
        const result = await googleDriveController.deleteFile(fileId);
        if (!result.success) {
            return res.status(500).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error('[FFT] Error in POST /deleteEvent:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to delete a row from the index sheet by event name
// rowIndex is the 0-based data-row index (i.e. physical sheet row = rowIndex + 2)
router.post('/deleteEventEntry', async (req, res) => {
    try {
        const { spreadsheetId, rowIndex, eventName } = req.body;
        if (!spreadsheetId || rowIndex == null) {
            return res.status(400).json({ success: false, error: 'spreadsheetId and rowIndex are required' });
        }
        // deleteRow uses 0-based index where row 0 = first data row after header.
        // rowIndex from the client is already 0-based data-row index.
        // Physical sheet row = rowIndex + 1 (header) + 1 (1-based) = rowIndex + 2.
        // controller.deleteRow expects a 0-based sheet row (0 = header), so pass rowIndex + 1.
        const sheetRowIndex = parseInt(rowIndex, 10) + 1; // +1 to skip header row
        const result = await googleDriveController.deleteRow(spreadsheetId, sheetRowIndex, null);
        if (!result.success) {
            return res.status(500).json(result);
        }
        console.log(`[FFT] Deleted index sheet row ${sheetRowIndex} for event "${eventName}"`);
        res.json(result);
    } catch (error) {
        console.error('[FFT] Error in POST /deleteEventEntry:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST endpoint to export a Google Sheet as .xlsx
router.post('/exportSpreadsheet', async (req, res) => {
    try {
        const { fileId, fileName, eventName } = req.body;
        if (!fileId) {
            return res.status(400).json({ success: false, error: 'fileId is required' });
        }
        const resolvedFileId = await resolveFFTFileId(fileId, eventName || fileName || '');
        if (!resolvedFileId) {
            return res.status(400).json({ success: false, error: 'Invalid fileId. Please reselect the event.' });
        }
        const drive = await googleDriveController.initializeAuth();
        const exportResponse = await drive.files.export(
            { fileId: resolvedFileId, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            { responseType: 'arraybuffer' }
        );
        let buffer = Buffer.from(exportResponse.data);

        if (resolvedFileId === REGISTRATION_TEMPLATE_FILE_ID) {
            const workbook = await XlsxPopulate.fromDataAsync(buffer);
            const sheet = workbook.sheet(0);
            const TEMPLATE_ROWS = 100;
            sheet.range(`B2:B${TEMPLATE_ROWS}`).style('numberFormat', '@');
            buffer = await workbook.outputAsync();
        }

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

// POST endpoint to validate FFT access rights credentials against the access rights sheet
router.post('/validateAccessRights', async (req, res) => {
    try {
        const { accountRole, password } = req.body;
        if (!accountRole || !password) {
            return res.status(400).json({ success: false, error: 'accountRole and password are required' });
        }

        const SHEET_ID = '1OIQAHuQQaFLwQz7d3JR3Tp2ooagHbs90y9JejLLWBZ8';
        const result = await googleDriveController.readSpreadsheet(SHEET_ID);
        if (!result.success) {
            return res.status(500).json({ success: false, error: 'Failed to read access rights sheet' });
        }

        // Sheet columns: A=S/N, B=Account Role, C=Password
        const rows = result.data || [];
        const match = rows.find(row =>
            (row[1] || '').trim().toLowerCase() === accountRole.trim().toLowerCase()
        );

        if (!match) {
            return res.json({ success: false, error: 'Account role not found' });
        }

        const storedPassword = (match[2] || '').trim();
        if (storedPassword !== password.trim()) {
            return res.json({ success: false, error: 'Incorrect password' });
        }

        return res.json({ success: true, accountRole: (match[1] || '').trim() });
    } catch (error) {
        console.error('[FFT] Error in POST /validateAccessRights:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Proxy: fetch ECSS logo and return as image to avoid browser CORS restriction
router.get('/ecssLogo', async (req, res) => {
    try {
        const https = require('https');
        const logoUrl = 'https://ecss.org.sg/wp-content/uploads/2023/07/En_logo_Final_Large_RGB.png';
        https.get(logoUrl, (imgRes) => {
            res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            imgRes.pipe(res);
        }).on('error', (err) => {
            res.status(502).json({ error: 'Failed to fetch logo' });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;