const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const archiver = require('archiver');
const { COLUMN_HEADERS, INTERNAL_KEY_TO_COLUMN_MAP } = require('../../constants/fftFieldMappings');

// ─── In-memory cache + single-flight for readSpreadsheet ─────────────────────
//
// How it works:
//   1. TTL cache (60 s): once a spreadsheet is read, every subsequent request
//      within 60 s is served from memory — zero additional Sheets API calls.
//   2. Single-flight / request coalescing: if N requests arrive simultaneously
//      while the cache is cold (e.g. server cold-start or after a write), only
//      ONE real API call is made; all N callers await the same Promise and each
//      get the result when it resolves.  Without this, a burst of 20 concurrent
//      requests would fire 20 API calls before any response returned.
//
// Net effect: regardless of how many frontend users or page loads happen, the
// backend makes at most 1 actual Sheets read per spreadsheet per 60 seconds.
// At Google's free quota of 60 reads/min, this supports effectively unlimited
// frontend throughput (900+ reads/min) for the same spreadsheet.
// ─────────────────────────────────────────────────────────────────────────────
const _sheetCache   = new Map(); // key → { ts, value }
const _sheetFlight  = new Map(); // key → Promise  (in-flight dedup)
const SHEET_CACHE_TTL_MS = 60_000; // 60 seconds

function _cacheKey(fileId, sheetName) {
    return `${fileId}:${sheetName || ''}`;
}

function _getCached(fileId, sheetName) {
    const key = _cacheKey(fileId, sheetName);
    const entry = _sheetCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > SHEET_CACHE_TTL_MS) {
        _sheetCache.delete(key);
        return null;
    }
    return entry.value;
}

function _setCache(fileId, sheetName, value) {
    _sheetCache.set(_cacheKey(fileId, sheetName), { ts: Date.now(), value });
}

/** Call this after any write so stale data is never served. */
function invalidateSheetCache(fileId, sheetName) {
    if (sheetName) {
        _sheetCache.delete(_cacheKey(fileId, sheetName));
        _sheetCache.delete(_cacheKey(fileId, null));   // bust "first sheet" variant too
        _sheetFlight.delete(_cacheKey(fileId, sheetName));
        _sheetFlight.delete(_cacheKey(fileId, null));
    } else {
        for (const key of _sheetCache.keys()) {
            if (key.startsWith(`${fileId}:`)) _sheetCache.delete(key);
        }
        for (const key of _sheetFlight.keys()) {
            if (key.startsWith(`${fileId}:`)) _sheetFlight.delete(key);
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────

class GoogleDriveController {
    async initializeAuth() {
        let credentials = null;

        // Priority 1: Check for new GOOGLE_SERVICE_ACCOUNT_NORSE environment variable
        if (process.env.GOOGLE_SERVICE_ACCOUNT_NORSE) {
            try {
                credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_NORSE);
            } catch (error) {
                console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_NORSE:', error.message);
            }
        }

        // Priority 2: Check for legacy GOOGLE_DRIVE_CREDENTIALS environment variable
        if (!credentials && process.env.GOOGLE_DRIVE_CREDENTIALS) {
            try {
                credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
            } catch {
                credentials = JSON.parse(Buffer.from(process.env.GOOGLE_DRIVE_CREDENTIALS, 'base64').toString('utf8'));
            }
        }

        // Priority 3: Try local credentials file
        if (!credentials) {
            let keyFile = path.join(__dirname, '../../config/norse-study-479913-b7-00b6903f8f4f.json');
            if (fs.existsSync(keyFile)) {
                credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
            }
        }

        if (!credentials) {
            throw new Error("Google Drive credentials not found. Set GOOGLE_SERVICE_ACCOUNT_NORSE environment variable or place credentials file at backend/config/norse-study-479913-b7-00b6903f8f4f.json");
        }

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        return google.drive({ version: 'v3', auth });
    }

    async checkFolderExists(folderId) {
        try {
            const drive = await this.initializeAuth();
            const folder = await drive.files.get({
                fileId: folderId,
                fields: 'name, mimeType, trashed, driveId',
                supportsAllDrives: true  // Support Shared Drives
            });

            const data = folder.data;

            if (data.mimeType !== 'application/vnd.google-apps.folder') {
                return { exists: false, error: "File ID is not a folder" };
            }

            if (data.trashed) {
                return { exists: false, error: "Folder is in trash" };
            }

            return { exists: true, folderName: data.name, isSharedDrive: !!data.driveId };
        } catch (error) {
            console.error('Error checking folder:', error.message);
            return { exists: false, error: error.message };
        }
    }

    async listFilesInFolder(folderId) {
        try {
            const drive = await this.initializeAuth();
            
            // Get folder metadata to display name
            const folderMetadata = await drive.files.get({
                fileId: folderId,
                fields: 'id, name',
                supportsAllDrives: true
            });
            const folderName = folderMetadata.data.name;
            
            // Get immediate children (files and folders) only
            const query = await drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, mimeType, webViewLink, createdTime, size)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 100,
                corpora: 'allDrives'
            });

            const items = query.data.files || [];
            //console.log(`✓ Found ${items.length} items in folder "${folderName}" (${folderId})`);
            
            // Separate into folders and files
            const folders = items.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
            const files = items.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

            //console.log(`✓ Found ${folders.length} folders and ${files.length} files in folder.`);
            return {
                success: true,
                fileCount: files.length,
                folderCount: folders.length,
                files: files,
                folders: folders
            };
        } catch (error) {
            console.error('Error listing files in folder:', error.message);
            return { success: false, error: error.message };
        }
    }

    async uploadPdfToGoogleDrive(fileBuffer, fileName, folderId, mimeType = 'application/pdf') {
        try {
            const drive = await this.initializeAuth();

            // Convert Buffer to readable stream
            const stream = Readable.from(fileBuffer);

            const response = await drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [folderId]
                },
                media: {
                    mimeType: mimeType,
                    body: stream
                },
                fields: 'id, name, webViewLink, createdTime',
                supportsAllDrives: true  // Support Shared Drives
            });

            return {
                success: true,
                fileId: response.data.id,
                fileName: response.data.name,
                fileLink: response.data.webViewLink,
                uploadedAt: response.data.createdTime
            };
        } catch (error) {
            console.error('Error uploading file to Google Drive:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async downloadFile(fileId) {
        try {
            const drive = await this.initializeAuth();

            // Get file metadata
            const fileMetadata = await drive.files.get({
                fileId: fileId,
                fields: 'id, name, mimeType, webViewLink',
                supportsAllDrives: true
            });

            // Download file content
            const response = await drive.files.get({
                fileId: fileId,
                alt: 'media',
                supportsAllDrives: true
            }, { responseType: 'stream' });

            // Convert stream to buffer
            return new Promise((resolve, reject) => {
                const chunks = [];
                response.data.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                response.data.on('end', () => {
                    const fileBuffer = Buffer.concat(chunks);
                    resolve({
                        success: true,
                        fileBuffer: fileBuffer,
                        fileName: fileMetadata.data.name,
                        mimeType: fileMetadata.data.mimeType
                    });
                });
                response.data.on('error', (error) => {
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Error downloading file from Google Drive:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async downloadMultipleFilesAsZip(fileIds) {
        try {
            const drive = await this.initializeAuth();
            const startTime = Date.now();

            //console.log(`[BULK] Creating ZIP for ${fileIds.length} items`);

            // Collect all files from selected items
            const allFiles = [];
            for (const fileId of fileIds) {
                const checkResult = await this.checkFolderExists(fileId);
                if (checkResult.exists) {
                    // It's a folder, collect files from it
                    console.log(`[BULK] Collecting files from folder: ${checkResult.folderName}`);
                    const folderFiles = await this.collectFilesFromFolder(drive, fileId, checkResult.folderName, []);
                    allFiles.push(...folderFiles);
                } else {
                    // It's a file, add it directly
                    try {
                        const fileMetadata = await drive.files.get({
                            fileId: fileId,
                            fields: 'id, name, mimeType',
                            supportsAllDrives: true
                        });
                        allFiles.push({ id: fileId, path: fileMetadata.data.name });
                        //console.log(`[BULK] Collected file: ${fileMetadata.data.name}`);
                    } catch (error) {
                        console.error(`[BULK] Error getting file metadata for ${fileId}:`, error.message);
                    }
                }
            }

            //console.log(`[BULK] Collected ${allFiles.length} files total, now creating ZIP...`);

            // Create ZIP archive in memory
            return new Promise((resolve, reject) => {
                const archive = archiver('zip', { zlib: { level: 6 } });
                const chunks = [];
                let errorOccurred = false;
                const zipStartTime = Date.now();

                archive.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                archive.on('end', () => {
                    if (!errorOccurred) {
                        const zipBuffer = Buffer.concat(chunks);
                        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
                        const zipTime = ((Date.now() - zipStartTime) / 1000).toFixed(2);
                        //console.log(`[BULK] ✓ ZIP created: ${zipBuffer.length} bytes in ${zipTime}s (total: ${totalTime}s)`);
                        resolve({
                            success: true,
                            fileBuffer: zipBuffer,
                            fileName: `bulk-download-${Date.now()}.zip`,
                            mimeType: 'application/zip'
                        });
                    }
                });

                archive.on('error', (error) => {
                    console.error('[BULK] Archive error:', error.message);
                    errorOccurred = true;
                    reject(error);
                });

                // Add files sequentially
                let fileIndex = 0;

                const addNextFile = () => {
                    if (fileIndex >= allFiles.length) {
                        //console.log('[BULK] All files queued, finalizing...');
                        archive.finalize();
                        return;
                    }

                    const fileInfo = allFiles[fileIndex++];

                    this.addFileToArchive(drive, fileInfo.id, fileInfo.path, archive)
                        .then(() => {
                            const elapsed = ((Date.now() - zipStartTime) / 1000).toFixed(2);
                            //console.log(`[BULK] Progress: ${fileIndex}/${allFiles.length} (${elapsed}s)`);
                            addNextFile();
                        })
                        .catch((error) => {
                            console.error(`[BULK] Error adding file:`, error.message);
                            // Continue with next file
                            addNextFile();
                        });
                };

                addNextFile();
            });
        } catch (error) {
            console.error('[BULK] Error creating bulk ZIP:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async downloadFolderAsZip(folderId) {
        try {
            const drive = await this.initializeAuth();
            const startTime = Date.now();

            // Get folder name
            const folderMetadata = await drive.files.get({
                fileId: folderId,
                fields: 'id, name, mimeType',
                supportsAllDrives: true
            });

            if (folderMetadata.data.mimeType !== 'application/vnd.google-apps.folder') {
                return {
                    success: false,
                    error: "File ID is not a folder"
                };
            }

            const folderName = folderMetadata.data.name;
            //console.log(`[ZIP] Creating ZIP for folder: ${folderName}`);

            // Collect all files recursively
            const collectStartTime = Date.now();
            const allFiles = await this.collectFilesFromFolder(drive, folderId, '', []);
            const collectTime = ((Date.now() - collectStartTime) / 1000).toFixed(2);
            
            //console.log(`[ZIP] Collected ${allFiles.length} files in ${collectTime}s`);

            // Create ZIP archive in memory
            return new Promise((resolve, reject) => {
                const archive = archiver('zip', { zlib: { level: 6 } });
                const chunks = [];
                let errorOccurred = false;
                let addedCount = 0;
                let totalFiles = allFiles.length;
                const zipStartTime = Date.now();

                archive.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                archive.on('end', () => {
                    if (!errorOccurred) {
                        const zipBuffer = Buffer.concat(chunks);
                        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
                        const zipTime = ((Date.now() - zipStartTime) / 1000).toFixed(2);
                        //console.log(`[ZIP] ✓ Created successfully: ${zipBuffer.length} bytes in ${zipTime}s (total: ${totalTime}s)`);
                        resolve({
                            success: true,
                            fileBuffer: zipBuffer,
                            fileName: `${folderName}.zip`,
                            mimeType: 'application/zip'
                        });
                    }
                });

                archive.on('error', (error) => {
                    console.error('[ZIP] Archive error:', error.message);
                    errorOccurred = true;
                    reject(error);
                });

                // Add files sequentially but efficiently
                let fileIndex = 0;

                const addNextFile = () => {
                    if (fileIndex >= allFiles.length) {
                        //console.log('[ZIP] All files queued for archive, finalizing...');
                        archive.finalize();
                        return;
                    }

                    const fileInfo = allFiles[fileIndex++];

                    this.addFileToArchive(drive, fileInfo.id, fileInfo.path, archive)
                        .then(() => {
                            const elapsed = ((Date.now() - zipStartTime) / 1000).toFixed(2);
                            //console.log(`[ZIP] Progress: ${fileIndex}/${totalFiles} (${elapsed}s)`);
                            addNextFile();
                        })
                        .catch((error) => {
                            console.error(`[ZIP] Error adding file:`, error.message);
                            // Continue with next file anyway
                            addNextFile();
                        });
                };

                addNextFile();
            });
        } catch (error) {
            console.error('[ZIP] Error creating folder ZIP:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async collectFilesFromFolder(drive, folderId, folderPath, filesList) {
        try {
            const query = await drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, mimeType)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 100,
                corpora: 'allDrives'
            });

            if (!query.data.files || query.data.files.length === 0) {
                return filesList;
            }

            for (const file of query.data.files) {
                const currentPath = folderPath ? `${folderPath}/${file.name}` : file.name;

                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    // Recursively collect files from subfolder
                    const subfolderFiles = await this.collectFilesFromFolder(drive, file.id, currentPath, []);
                    filesList.push(...subfolderFiles);
                } else {
                    // Add file to list
                    filesList.push({ id: file.id, path: currentPath });
                    //console.log(`Collected file: ${currentPath}`);
                }
            }
            return filesList;
        } catch (error) {
            console.error('Error collecting files from folder:', error.message);
            throw error;
        }
    }

    async addFileToArchive(drive, fileId, filePath, archive) {
        try {
            //console.log(`[FILE] Downloading: ${filePath}`);
            const downloadStart = Date.now();

            const fileResponse = await drive.files.get({
                fileId: fileId,
                alt: 'media',
                supportsAllDrives: true
            }, { responseType: 'stream' });

            // Stream directly to archive using append
            return new Promise((resolve, reject) => {
                archive.append(fileResponse.data, { name: filePath });
                
                fileResponse.data.on('end', () => {
                    const elapsed = ((Date.now() - downloadStart) / 1000).toFixed(2);
                    console.log(`[FILE] ✓ Added ${filePath} (${elapsed}s)`);
                    resolve();
                });

                fileResponse.data.on('error', (error) => {
                    console.error(`[FILE] Stream error for ${filePath}:`, error.message);
                    reject(error);
                });

                archive.on('error', (error) => {
                    console.error(`[FILE] Archive error for ${filePath}:`, error.message);
                    reject(error);
                });
            });
        } catch (error) {
            console.error(`[FILE] Error adding file:`, error.message);
            throw error;
        }
    }

    async initializeSheetsAuth() {
        let credentials = null;

        // Priority 1: Check for GOOGLE_SERVICE_ACCOUNT_NORSE environment variable
        if (process.env.GOOGLE_SERVICE_ACCOUNT_NORSE) {
            try {
                credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_NORSE);
            } catch (error) {
                console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_NORSE:', error.message);
            }
        }

        // Priority 2: Check for GOOGLE_DRIVE_CREDENTIALS environment variable
        if (!credentials && process.env.GOOGLE_DRIVE_CREDENTIALS) {
            try {
                credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
            } catch {
                credentials = JSON.parse(Buffer.from(process.env.GOOGLE_DRIVE_CREDENTIALS, 'base64').toString('utf8'));
            }
        }

        // Priority 3: Try local credentials file
        if (!credentials) {
            let keyFile = path.join(__dirname, '../../config/norse-study-479913-b7-00b6903f8f4f.json');
            if (fs.existsSync(keyFile)) {
                credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
            }
        }

        if (!credentials) {
            throw new Error("Google credentials not found");
        }

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/spreadsheets'
            ]
        });

        return google.sheets({ version: 'v4', auth });
    }

    async readSpreadsheet(fileId, sheetName = null) {
        // 1. Serve from TTL cache when available
        const cached = _getCached(fileId, sheetName);
        if (cached) {
            console.log(`[SHEETS] Cache hit for ${fileId}:${sheetName || 'first'}`);
            return cached;
        }

        // 2. Single-flight: if another request is already fetching this spreadsheet,
        //    reuse that in-flight Promise instead of firing a second API call.
        const key = _cacheKey(fileId, sheetName);
        if (_sheetFlight.has(key)) {
            console.log(`[SHEETS] Coalescing onto in-flight request for ${key}`);
            return _sheetFlight.get(key);
        }

        // 3. New fetch — store the Promise so concurrent callers can share it.
        const fetchPromise = this._fetchSpreadsheet(fileId, sheetName).finally(() => {
            _sheetFlight.delete(key);
        });
        _sheetFlight.set(key, fetchPromise);
        return fetchPromise;
    }

    // Background re-warm: kick off a silent read immediately after a write so the
    // cache is populated before the next request arrives (eliminates cold-cache window).
    _rewarmCache(fileId, sheetName = null) {
        this.readSpreadsheet(fileId, sheetName).catch(() => {});
    }

    async _fetchSpreadsheet(fileId, sheetName = null) {
        try {
            const drive = await this.initializeAuth();
            const sheets = await this.initializeSheetsAuth();

            // First, get spreadsheet metadata to get sheet names
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                fields: 'sheets.properties'
            });

            const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);

            // Determine which sheet to read
            const targetSheet = sheetName || sheetNames[0];

            // Read data from the sheet
            const range = `'${targetSheet}'!A:ZZ`;
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: fileId,
                range: range
            });

            const values = response.data.values || [];
            console.log(`[SHEETS] Read ${values.length} rows from '${targetSheet}'`);

            if (values.length === 0) {
                const result = {
                    success: true,
                    sheets: sheetNames,
                    data: [],
                    columns: []
                };
                _setCache(fileId, sheetName, result);
                return result;
            }

            // First row is headers/columns
            const columns = values[0] || [];
            // Remaining rows are data
            const data = values.slice(1);

            const result = {
                success: true,
                sheets: sheetNames,
                columns: columns,
                data: data,
                rowCount: data.length
            };
            _setCache(fileId, sheetName, result);
            return result;
        } catch (error) {
            console.error('[SHEETS] Error reading spreadsheet:', error.message);
            
            // If it's not a Google Sheets file, try to export it
            if (error.message.includes('not found') || error.code === 404) {
                return await this.readExportedSpreadsheet(fileId);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async appendRow(fileId, rowData, sheetName = null) {
        try {
            const sheets = await this.initializeSheetsAuth();

            console.log(`[SHEETS] Appending row to spreadsheet: ${fileId}`);

            // Get spreadsheet metadata to determine sheet name
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                fields: 'sheets.properties'
            });

            const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
            const targetSheet = sheetName || sheetNames[0];

            // Ensure row 1 has the correct header row.
            // Only write headers if A1 is completely empty (brand-new sheet).
            // If A1 already has ANY content (could be old participant data), leave it.
            const headerCheck = await sheets.spreadsheets.values.get({
                spreadsheetId: fileId,
                range: `'${targetSheet}'!A1`
            });
            const a1Value = String((headerCheck.data.values?.[0]?.[0]) || '').trim();
            if (!a1Value) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: fileId,
                    range: `'${targetSheet}'!A1`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [COLUMN_HEADERS] }
                });
                console.log(`[SHEETS] Wrote column headers to '${targetSheet}' row 1`);
            }

            // Find the next empty data row. Scan from A2 to skip the header row so
            // the count is correct regardless of whether A1 contains a header value.
            const existingData = await sheets.spreadsheets.values.get({
                spreadsheetId: fileId,
                range: `'${targetSheet}'!A2:A`
            });
            // +2: data starts at row 2 (row 1 = header), and we need 1-based row index
            const nextRow = (existingData.data.values ? existingData.data.values.length : 0) + 2;

            const range = `'${targetSheet}'!A${nextRow}`;
            const response = await sheets.spreadsheets.values.update({
                spreadsheetId: fileId,
                range: range,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [rowData]
                }
            });

            const updatedRange = response.data.updatedRange || `${targetSheet}!A${nextRow}`;
            console.log(`[SHEETS] Wrote row to '${targetSheet}': ${updatedRange}`);

            const entryNumber = nextRow - 1; // subtract 1 for header row → 1-based participant number

            // Invalidate cache so the next read reflects the new row, then
            // immediately re-warm in the background to close the cold-cache window.
            invalidateSheetCache(fileId);
            this._rewarmCache(fileId, sheetName);

            return {
                success: true,
                updatedRange: updatedRange,
                updatedRows: response.data.updatedRows || 1,
                entryNumber: entryNumber
            };
        } catch (error) {
            console.error('[SHEETS] Error appending row:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Append an event row with auto-generated S/N
     * @param {string} fileId - Spreadsheet ID
     * @param {string} eventName - Event name
     * @param {string} createdOn - Creation timestamp
     * @param {string} sheetName - Sheet name (optional)
     */
    async appendEventRow(fileId, eventName, createdOn, sheetName = null) {
        try {
            const sheets = await this.initializeSheetsAuth();

            console.log(`[SHEETS] Appending event row to spreadsheet: ${fileId}`);

            // Get spreadsheet metadata to determine sheet name
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                fields: 'sheets.properties'
            });

            const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
            const targetSheet = sheetName || sheetNames[0];

            // Fetch all event names from column B (Event Name)
            const eventNameData = await sheets.spreadsheets.values.get({
                spreadsheetId: fileId,
                range: `'${targetSheet}'!B:B`
            });
            const eventNames = (eventNameData.data.values || []).slice(1).map(row => row[0]); // skip header

            // Check for duplicate event name
            if (eventNames.includes(eventName)) {
                console.log(`[SHEETS] Duplicate event name detected: ${eventName}`);
                return {
                    success: false,
                    error: 'duplicate event name'
                };
            }

            // Find the next empty row by checking existing data in column A
            const existingData = await sheets.spreadsheets.values.get({
                spreadsheetId: fileId,
                range: `'${targetSheet}'!A:A`
            });

            const dataRows = existingData.data.values ? existingData.data.values.length - 1 : 0;
            const nextSN = dataRows + 1;
            const nextRow = dataRows + 2; // +2 because rows are 1-indexed and we have a header

            // Prepare row data: [S/N, Event Name, Created On]
            const rowData = [nextSN.toString(), eventName, createdOn];

            const range = `'${targetSheet}'!A${nextRow}`;
            const response = await sheets.spreadsheets.values.update({
                spreadsheetId: fileId,
                range: range,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [rowData]
                }
            });

            const updatedRange = response.data.updatedRange || `${targetSheet}!A${nextRow}`;
            console.log(`[SHEETS] Event row appended with S/N ${nextSN} to '${targetSheet}': ${updatedRange}`);

            return {
                success: true,
                serialNumber: nextSN,
                updatedRange: updatedRange,
                updatedRows: response.data.updatedRows || 1
            };
        } catch (error) {
            console.error('[SHEETS] Error appending event row:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Append a full FFT event row with all 5 columns:
     * A=S/N, B=Event Name, C=Time Slots, D=Created On, E=File ID
     */
    async appendFFTEventRow(spreadsheetId, eventName, timeSlots, maxParticipants, createdOn, sheetName = 'Sheet1') {
        try {
            const sheets = await this.initializeSheetsAuth();

            // Get spreadsheet metadata to confirm sheet name
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId,
                fields: 'sheets.properties'
            });
            const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
            const targetSheet = sheetNames.includes(sheetName) ? sheetName : sheetNames[0];

            // Check for duplicate event name in column B
            const eventNameData = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${targetSheet}'!B:B`
            });
            const existingNames = (eventNameData.data.values || []).slice(1).map(r => r[0]);
            if (existingNames.includes(eventName)) {
                return { success: false, error: 'duplicate event name' };
            }

            // Determine next S/N from column A
            const existingData = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${targetSheet}'!A:A`
            });
            const dataRows = existingData.data.values ? existingData.data.values.length - 1 : 0;
            const nextSN = dataRows + 1;
            const nextRow = dataRows + 2; // 1-indexed + header

            // Columns: A=S/N, B=Event Name, C=Status, D=Time Slots, E=Maximum Of Participants, F=Created On
            const rowData = [nextSN.toString(), eventName, 'Upcoming', timeSlots, maxParticipants.toString(), createdOn];

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${targetSheet}'!A${nextRow}`,
                valueInputOption: 'RAW',
                requestBody: { values: [rowData] }
            });

            console.log(`[SHEETS] FFT event row appended with S/N ${nextSN}: "${eventName}"`);
            return { success: true, serialNumber: nextSN };
        } catch (error) {
            console.error('[SHEETS] Error appending FFT event row:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Write a participant file ID into column E of the index sheet for a given S/N.
     * @param {string|number} serialNumber - The S/N value in column A (data row, not sheet row)
     * @param {string} fileId - The participant spreadsheet's Google Drive file ID
     */
    async updateIndexFileId(serialNumber, fileId, registrationLink = '', qrCodeUrl = '') {
        try {
            const sheets = await this.initializeSheetsAuth();
            const INDEX_SHEET_ID = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';
            const rowNumber = parseInt(serialNumber, 10) + 1; // +1 for header row
            await sheets.spreadsheets.values.update({
                spreadsheetId: INDEX_SHEET_ID,
                range: `Sheet1!G${rowNumber}:I${rowNumber}`, // G=File ID, H=Registration Link, I=QR Code
                valueInputOption: 'RAW',
                requestBody: { values: [[fileId, registrationLink, qrCodeUrl]] }
            });
            console.log(`[SHEETS] Updated index sheet row ${rowNumber} columns G-I with fileId, registrationLink, qrCodeUrl`);
            return { success: true };
        } catch (error) {
            console.error('[SHEETS] Error updating index file ID:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update specific columns in a row by entry number.
     * @param {string} fileId - Spreadsheet ID
     * @param {number} entryNumber - Entry number (row - 1 because of header)
     * @param {Object} updates - Key-value pairs where keys are column names
     */
    async updateRow(fileId, entryNumber, updates) {
        try {
            const sheets = await this.initializeSheetsAuth();
            const rowNumber = entryNumber + 1; // +1 for header row

            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                fields: 'sheets.properties'
            });
            const targetSheet = spreadsheet.data.sheets[0].properties.title;
            console.log(`[SHEETS] Updating row ${rowNumber} in sheet '${targetSheet}' with updates:`, updates);

            // Build batch value updates using exact column name → column letter mapping
            const data = [];
            for (const [field, value] of Object.entries(updates)) {
                const col = INTERNAL_KEY_TO_COLUMN_MAP[field];
                console.log(`[SHEETS] Processing field: ${field} = ${value}, mapped to column: ${col}`);
                if (col) {
                    const range = `'${targetSheet}'!${col}${rowNumber}`;
                    console.log(`[SHEETS] Adding update: ${range} = ${value}`);
                    data.push({
                        range: range,
                        values: [[value]]
                    });
                } else {
                    console.log(`[SHEETS] WARNING: Column not found for field: ${field}`);
                }
            }

            if (data.length === 0) {
                return { success: false, error: 'No valid fields to update' };
            }

            console.log(`[SHEETS] Sending batch update with ${data.length} changes to row ${rowNumber}`);
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: fileId,
                requestBody: {
                    valueInputOption: 'RAW',
                    data: data
                }
            });

            console.log(`[SHEETS] Updated row ${rowNumber} (entry ${entryNumber}): ${Object.keys(updates).join(', ')}`);
            // Invalidate cache so the next read reflects the edited row, then
            // immediately re-warm in the background to close the cold-cache window.
            invalidateSheetCache(fileId);
            this._rewarmCache(fileId);
            return { success: true, updatedFields: Object.keys(updates) };
        } catch (error) {
            console.error('[SHEETS] Error updating row:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getRow(fileId, entryNumber) {
        try {
            // Use the cached readSpreadsheet path to avoid per-row quota hits
            const cached = await this._fetchSpreadsheet(fileId);
            if (!cached.success) {
                return { success: false, error: cached.error };
            }

            const allRows = cached.data || [];
            const headers = allRows[0] || [];
            const row = allRows[entryNumber] || []; // entryNumber is 1-based row index after header

            const data = {};
            headers.forEach((header, idx) => {
                if (header) data[header] = row[idx] || '';
            });

            return { success: true, data };
        } catch (error) {
            console.error('[SHEETS] Error getting row:', error.message);
            return { success: false, error: error.message };
        }
    }

    async readExportedSpreadsheet(fileId) {
        try {
            const drive = await this.initializeAuth();

            console.log(`[SHEETS] Attempting to export spreadsheet as CSV: ${fileId}`);

            // Export Google Sheets as CSV
            const response = await drive.files.export({
                fileId: fileId,
                mimeType: 'text/csv'
            }, { responseType: 'text' });

            const csvContent = response.data;
            
            // Parse CSV
            const lines = csvContent.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                return {
                    success: true,
                    sheets: ['Sheet1'],
                    data: [],
                    columns: []
                };
            }

            // Parse header and data
            const parseCSVLine = (line) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            const columns = parseCSVLine(lines[0]);
            const data = lines.slice(1).map(parseCSVLine);

            return {
                success: true,
                sheets: ['Sheet1'],
                columns: columns,
                data: data,
                rowCount: data.length
            };
        } catch (error) {
            console.error('[SHEETS] Error exporting spreadsheet:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async addFolderToArchive(drive, folderId, archive, folderPath) {
        // This method is now deprecated, kept for backward compatibility
        try {
            console.log(`Listing files in folder path: ${folderPath || 'root'}`);
            
            const query = await drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, mimeType)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 100,
                corpora: 'allDrives'
            });

            if (!query.data.files || query.data.files.length === 0) {
                console.log(`No files found in folder path: ${folderPath || 'root'}`);
                return;
            }

            console.log(`Found ${query.data.files.length} items in ${folderPath || 'root'}`);

            // Separate folders and files
            const folders = query.data.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
            const files = query.data.files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

            // Process subfolders first
            for (const folder of folders) {
                const currentPath = folderPath ? `${folderPath}/${folder.name}` : folder.name;
                console.log(`Processing subfolder: ${currentPath}`);
                await this.addFolderToArchive(drive, folder.id, archive, currentPath);
            }

            // Process files sequentially but with streaming
            for (const file of files) {
                try {
                    await this.addFileToArchiveOld(drive, file, archive, folderPath);
                } catch (error) {
                    console.error(`Error adding file ${file.name} to archive:`, error.message);
                    // Continue with next file on error
                }
            }
        } catch (error) {
            console.error('Error adding folder to archive:', error.message);
            throw error;
        }
    }

    async addFileToArchiveOld(drive, file, archive, folderPath) {
        // This method is now deprecated, kept for backward compatibility
        try {
            const currentPath = folderPath ? `${folderPath}/${file.name}` : file.name;
            console.log(`Adding file to archive: ${currentPath}`);

            const fileResponse = await drive.files.get({
                fileId: file.id,
                alt: 'media',
                supportsAllDrives: true
            }, { responseType: 'stream' });

            // Stream directly to archive without buffering
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    fileResponse.data.destroy();
                    reject(new Error(`Timeout downloading ${currentPath}`));
                }, 120000); // 2 minute timeout

                archive.append(fileResponse.data, { name: currentPath }, (err) => {
                    clearTimeout(timeoutId);
                    if (err) {
                        console.error(`Error appending ${currentPath}:`, err.message);
                        reject(err);
                    } else {
                        console.log(`Added ${currentPath}`);
                        resolve();
                    }
                });

                fileResponse.data.on('error', (error) => {
                    clearTimeout(timeoutId);
                    console.error(`Error reading file ${currentPath}:`, error.message);
                    reject(error);
                });
            });
        } catch (error) {
            console.error(`Error adding file to archive:`, error.message);
            throw error;
        }
    }

    /**
     * Copy a Google Spreadsheet to a specified folder with a new name.
     * @param {string} sourceFileId - The ID of the spreadsheet to copy
     * @param {string} newFileName - The name for the copied file
     * @param {string} destinationFolderId - The folder ID to place the copy in
     * @returns {Object} { success, fileId, fileName, fileUrl }
     */
    async copySpreadsheet(sourceFileId, newFileName, destinationFolderId) {
        try {
            const drive = await this.initializeAuth();

            // Copy the file
            const copyResponse = await drive.files.copy({
                fileId: sourceFileId,
                fields: 'id,name',
                requestBody: {
                    name: newFileName,
                    parents: destinationFolderId ? [destinationFolderId] : undefined,
                },
                supportsAllDrives: true,
            });

            const copiedFile = copyResponse.data;
            console.log(`Spreadsheet copied: ${copiedFile.name} (${copiedFile.id})`);

            return {
                success: true,
                fileId: copiedFile.id,
                fileName: copiedFile.name,
                fileUrl: `https://docs.google.com/spreadsheets/d/${copiedFile.id}/edit`,
            };
        } catch (error) {
            console.error('Error copying spreadsheet:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * List only subfolders inside a given folder.
     * @param {string} folderId - The parent folder ID
     * @returns {Object} { success, folders: [{id, name}] }
     */
    async listSubfolders(folderId) {
        try {
            const drive = await this.initializeAuth();

            console.log(`\n📁 Listing subfolders in folder: ${folderId}`);

            const query = await drive.files.list({
                q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 100,
                orderBy: 'name',
                corpora: 'allDrives',
            });

            const folders = query.data.files || [];
            console.log(`✓ Found ${folders.length} subfolders`);
            folders.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (ID: ${f.id})`));

            return { success: true, folders };
        } catch (error) {
            console.error('Error listing subfolders:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Find or create a year-named subfolder inside a parent folder.
     * @param {string} parentFolderId - Root folder ID
     * @param {string|number} year - e.g. "2026"
     * @returns {Object} { success, folderId, folderName }
     */
    async getOrCreateYearFolder(parentFolderId, year) {
        try {
            const subfolderResult = await this.listSubfolders(parentFolderId);
            if (!subfolderResult.success) {
                return { success: false, error: subfolderResult.error };
            }
            const existing = (subfolderResult.folders || []).find(f => f.name === String(year));
            if (existing) {
                console.log(`[FFT] Year folder "${year}" already exists: ${existing.id}`);
                return { success: true, folderId: existing.id, folderName: existing.name };
            }
            // Create the year folder
            console.log(`[FFT] Creating year folder "${year}" in parent: ${parentFolderId}`);
            return await this.createFolder(String(year), parentFolderId);
        } catch (error) {
            console.error('Error in getOrCreateYearFolder:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a new folder inside a parent folder.
     * @param {string} folderName - The name of the new folder
     * @param {string} parentFolderId - The parent folder ID
     * @returns {Object} { success, folderId, folderName }
     */
    async createFolder(folderName, parentFolderId) {
        try {
            const drive = await this.initializeAuth();

            console.log(`\n📁 Creating folder "${folderName}" in parent: ${parentFolderId}`);

            const response = await drive.files.create({
                requestBody: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: parentFolderId ? [parentFolderId] : undefined,
                },
                fields: 'id, name, webViewLink',
                supportsAllDrives: true,
            });

            console.log(`✓ Folder created: ${response.data.name} (${response.data.id})`);

            return {
                success: true,
                folderId: response.data.id,
                folderName: response.data.name,
                folderUrl: response.data.webViewLink,
            };
        } catch (error) {
            console.error('Error creating folder:', error.message);
            return { success: false, error: error.message };
        }
    }

    async findSheetByEventName(folderId, eventName) {
        try {
            const drive = await this.initializeAuth();

            // Normalize: lowercase, strip slashes/dashes/dots, collapse spaces
            const normalize = (s) => s.toLowerCase().replace(/[\/\-_.]/g, ' ').replace(/\s+/g, ' ').trim();
            const normalizedEvent = normalize(eventName);
            // Also strip leading date pattern (e.g. "2026 04 11 ") for word matching
            const strippedEvent = normalizedEvent.replace(/^\d{4}\s+\d{1,2}\s+\d{1,2}\s+/, '');
            const eventWords = normalizedEvent.split(' ').filter(Boolean);

            const matchFiles = (files) => files.find(f => {
                const fn = normalize(f.name);
                if (fn.includes(normalizedEvent) || normalizedEvent.includes(fn)) return true;
                if (fn.includes(strippedEvent) || strippedEvent.includes(fn)) return true;
                // Word overlap: if ≥50% of file-name words appear in event name
                const fnWords = fn.split(' ').filter(Boolean);
                const overlap = fnWords.filter(w => eventWords.includes(w)).length;
                return fnWords.length > 0 && overlap / fnWords.length >= 0.5;
            });

            const listFilesInFolder = async (searchFolderId) => {
                const response = await drive.files.list({
                    q: `'${searchFolderId}' in parents and trashed=false`,
                    fields: 'files(id, name)',
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                    corpora: 'allDrives',
                });
                return response.data.files || [];
            };

            // Extract year from event name — supports YYYY/MM/DD (year first) and DD/MM/YYYY (year last)
            const yearMatch = String(eventName).match(/^(\d{4})[\/\-]/) ||
                              String(eventName).match(/[\/\-](\d{4})(?:[\s\/\-]|$)/) ||
                              String(eventName).match(/\b(20\d{2})\b/);
            if (yearMatch) {
                const year = yearMatch[1];
                // Look for a year-named subfolder first
                const subfolderResult = await this.listSubfolders(folderId);
                if (subfolderResult.success) {
                    const yearFolder = (subfolderResult.folders || []).find(f => f.name === year);
                    if (yearFolder) {
                        const yearFiles = await listFilesInFolder(yearFolder.id);
                        const match = matchFiles(yearFiles);
                        if (match) {
                            console.log(`[SHEETS] Found "${match.name}" in year subfolder "${year}"`);
                            return { success: true, file: match };
                        }
                    }
                }
            }

            // Fallback: search directly in the root folder
            const rootFiles = await listFilesInFolder(folderId);
            const match = matchFiles(rootFiles);
            if (!match) {
                return { success: false, error: `No spreadsheet found matching event: "${eventName}"` };
            }
            console.log(`[SHEETS] Found "${match.name}" in root folder`);
            return { success: true, file: match };
        } catch (error) {
            console.error('[SHEETS] findSheetByEventName error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a file from Google Drive (permanently remove from trash)
     * @param {string} fileId - File ID to delete
     */
    async deleteFile(fileId) {
        try {
            const drive = await this.initializeAuth();
            
            // Move to trash first
            await drive.files.update({
                fileId: fileId,
                resource: { trashed: true },
                supportsAllDrives: true
            });
            
            console.log(`[DRIVE] File ${fileId} moved to trash`);
            return { success: true, message: 'File deleted successfully' };
        } catch (error) {
            console.error('[DRIVE] Error deleting file:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove a row from a Google Sheet and shift rows up
     * @param {string} fileId - Spreadsheet ID
     * @param {number} rowIndex - Row index to delete (0-based)
     * @param {string} sheetName - Sheet name
     */
    async deleteRow(fileId, rowIndex, sheetName = null) {
        try {
            const sheets = await this.initializeSheetsAuth();

            // Get sheet ID
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                fields: 'sheets.properties'
            });

            const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
            const targetSheet = sheetName || sheetNames[0];
            const targetSheetId = spreadsheet.data.sheets.find(s => s.properties.title === targetSheet)?.properties.sheetId;

            if (targetSheetId === undefined) {
                return { success: false, error: `Sheet "${targetSheet}" not found` };
            }

            // Delete the row
            const batchUpdateRequest = {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: targetSheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1
                        }
                    }
                }]
            };

            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: fileId,
                requestBody: batchUpdateRequest
            });

            invalidateSheetCache(fileId, targetSheet);
            console.log(`[SHEETS] Row ${rowIndex} deleted from sheet "${targetSheet}"`);
            return { success: true, message: 'Row deleted successfully' };
        } catch (error) {
            console.error('[SHEETS] Error deleting row:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = GoogleDriveController;
module.exports.invalidateSheetCache = invalidateSheetCache;
