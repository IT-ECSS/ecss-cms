const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const archiver = require('archiver');

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
            
            console.log(`\n📂 Listing files in folder: ${folderId}`);
            
            const query = await drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name, webViewLink, createdTime, size, mimeType)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                pageSize: 100,
                orderBy: 'name',
                corpora: 'allDrives' // Search all drives including Shared Drives
            });
            
            console.log(`Query response files count: ${query.data.files ? query.data.files.length : 0}`);
            console.log(`Query response:`, JSON.stringify(query.data, null, 2));
            
            if (query.data.files && query.data.files.length > 0) {
                console.log(`✓ Found ${query.data.files.length} files in folder:`);
                query.data.files.forEach((file, index) => {
                    console.log(`  ${index + 1}. ${file.name} (ID: ${file.id}, Size: ${file.size || 'N/A'} bytes)`);
                });
                return {
                    success: true,
                    fileCount: query.data.files.length,
                    files: query.data.files
                };
            }
            
            console.log('ℹ No files found in folder - trying alternative query...');
            
            // Try without 'in parents' to see if folder is accessible
            const folderCheck = await drive.files.get({
                fileId: folderId,
                fields: 'id, name, mimeType, webViewLink',
                supportsAllDrives: true
            });
            
            console.log(`Folder info:`, folderCheck.data);
            
            return {
                success: true,
                fileCount: 0,
                files: [],
                folderInfo: folderCheck.data
            };
        } catch (error) {
            console.error('Error listing files in folder:', error.message);
            console.error('Error details:', error);
            return { success: false, error: error.message };
        }
    }

    async uploadPdfToGoogleDrive(fileBuffer, fileName, folderId, mimeType = 'application/pdf') {
        try {
            const drive = await this.initializeAuth();

            // Convert Buffer to readable stream
            const stream = Readable.from(fileBuffer);

            const response = await drive.files.create({
                resource: {
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

            console.log(`[BULK] Creating ZIP for ${fileIds.length} items`);

            // Collect all files from selected items
            const allFiles = [];
            for (const fileId of fileIds) {
                const checkResult = await this.checkFolderExists(fileId);
                if (checkResult.exists) {
                    // It's a folder, collect files from it
                    console.log(`[BULK] Collecting files from folder: ${checkResult.folderName}`);
                    await this.collectFilesFromFolder(drive, fileId, checkResult.folderName, allFiles);
                } else {
                    // It's a file, add it directly
                    try {
                        const fileMetadata = await drive.files.get({
                            fileId: fileId,
                            fields: 'id, name, mimeType',
                            supportsAllDrives: true
                        });
                        allFiles.push({ id: fileId, path: fileMetadata.data.name });
                        console.log(`[BULK] Collected file: ${fileMetadata.data.name}`);
                    } catch (error) {
                        console.error(`[BULK] Error getting file metadata for ${fileId}:`, error.message);
                    }
                }
            }

            console.log(`[BULK] Collected ${allFiles.length} files total, now creating ZIP...`);

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
                        console.log(`[BULK] ✓ ZIP created: ${zipBuffer.length} bytes in ${zipTime}s (total: ${totalTime}s)`);
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
                        console.log('[BULK] All files queued, finalizing...');
                        archive.finalize();
                        return;
                    }

                    const fileInfo = allFiles[fileIndex++];

                    this.addFileToArchive(drive, fileInfo.id, fileInfo.path, archive)
                        .then(() => {
                            const elapsed = ((Date.now() - zipStartTime) / 1000).toFixed(2);
                            console.log(`[BULK] Progress: ${fileIndex}/${allFiles.length} (${elapsed}s)`);
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
            console.log(`[ZIP] Creating ZIP for folder: ${folderName}`);

            // Collect all files recursively
            const collectStartTime = Date.now();
            const allFiles = [];
            await this.collectFilesFromFolder(drive, folderId, '', allFiles);
            const collectTime = ((Date.now() - collectStartTime) / 1000).toFixed(2);
            
            console.log(`[ZIP] Collected ${allFiles.length} files in ${collectTime}s`);

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
                        console.log(`[ZIP] ✓ Created successfully: ${zipBuffer.length} bytes in ${zipTime}s (total: ${totalTime}s)`);
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
                        console.log('[ZIP] All files queued for archive, finalizing...');
                        archive.finalize();
                        return;
                    }

                    const fileInfo = allFiles[fileIndex++];

                    this.addFileToArchive(drive, fileInfo.id, fileInfo.path, archive)
                        .then(() => {
                            const elapsed = ((Date.now() - zipStartTime) / 1000).toFixed(2);
                            console.log(`[ZIP] Progress: ${fileIndex}/${totalFiles} (${elapsed}s)`);
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
                return;
            }

            for (const file of query.data.files) {
                const currentPath = folderPath ? `${folderPath}/${file.name}` : file.name;

                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    // Recursively collect files from subfolder
                    await this.collectFilesFromFolder(drive, file.id, currentPath, filesList);
                } else {
                    // Add file to list
                    filesList.push({ id: file.id, path: currentPath });
                    console.log(`Collected file: ${currentPath}`);
                }
            }
        } catch (error) {
            console.error('Error collecting files from folder:', error.message);
            throw error;
        }
    }

    async addFileToArchive(drive, fileId, filePath, archive) {
        try {
            console.log(`[FILE] Downloading: ${filePath}`);
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
        try {
            const drive = await this.initializeAuth();
            const sheets = await this.initializeSheetsAuth();

            console.log(`[SHEETS] Reading spreadsheet: ${fileId}`);

            // First, get spreadsheet metadata to get sheet names
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                fields: 'sheets.properties'
            });

            const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
            console.log(`[SHEETS] Available sheets: ${sheetNames.join(', ')}`);

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
                return {
                    success: true,
                    sheets: sheetNames,
                    data: [],
                    columns: []
                };
            }

            // First row is headers/columns
            const columns = values[0] || [];
            // Remaining rows are data
            const data = values.slice(1);

            return {
                success: true,
                sheets: sheetNames,
                columns: columns,
                data: data,
                rowCount: data.length
            };
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
            const sheetId = spreadsheet.data.sheets.find(s => s.properties.title === targetSheet)?.properties?.sheetId || 0;

            const range = `'${targetSheet}'!A:AB`;
            const response = await sheets.spreadsheets.values.append({
                spreadsheetId: fileId,
                range: range,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [rowData]
                }
            });

            const updatedRange = response.data.updates.updatedRange;
            console.log(`[SHEETS] Appended row to '${targetSheet}': ${updatedRange}`);

            // Extract row number from updatedRange (e.g. "'Sheet1'!A5:U5" → row 5, entry = row - 1)
            const rowMatch = updatedRange.match(/!A(\d+):/);
            const rowNumber = rowMatch ? parseInt(rowMatch[1], 10) : null;
            const entryNumber = rowNumber ? rowNumber - 1 : null; // subtract 1 for header row

            // Clear bold formatting on the newly appended row (it inherits from header)
            if (rowNumber) {
                try {
                    await sheets.spreadsheets.batchUpdate({
                        spreadsheetId: fileId,
                        resource: {
                            requests: [{
                                repeatCell: {
                                    range: {
                                        sheetId: sheetId,
                                        startRowIndex: rowNumber - 1, // 0-based
                                        endRowIndex: rowNumber,
                                        startColumnIndex: 0,
                                        endColumnIndex: 28 // columns A–AB
                                    },
                                    cell: {
                                        userEnteredFormat: {
                                            textFormat: { bold: false }
                                        }
                                    },
                                    fields: 'userEnteredFormat.textFormat.bold'
                                }
                            }]
                        }
                    });
                    console.log(`[SHEETS] Cleared bold formatting on row ${rowNumber}`);
                } catch (fmtErr) {
                    console.warn(`[SHEETS] Could not clear bold formatting: ${fmtErr.message}`);
                }
            }

            return {
                success: true,
                updatedRange: updatedRange,
                updatedRows: response.data.updates.updatedRows,
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
     * Update specific columns in a row by entry number.
     * @param {string} fileId - Spreadsheet ID
     * @param {number} entryNumber - Entry number (row - 1 because of header)
     * @param {Object} updates - Key-value pairs where keys are column names
     */
    async updateRow(fileId, entryNumber, updates) {
        try {
            const sheets = await this.initializeSheetsAuth();
            const rowNumber = entryNumber + 1; // +1 for header row

            // Column mapping: field name → column letter
            const columnMap = {
                name: 'A', chineseName: 'B', phoneNo: 'C', gender: 'D',
                dd: 'E', mm: 'F', yyyy: 'G', age: 'H',
                height: 'I', weight: 'J', bmi: 'K', testDate: 'L',
                sitStand: 'M', armCurl: 'N', march: 'O', sitReach: 'P',
                backStretch: 'Q', speedWalk: 'R', gripTest: 'S',
                improvements: 'T', remarks: 'U',
                sitStandRemarks: 'V', armCurlRemarks: 'W', marchRemarks: 'X',
                sitReachRemarks: 'Y', backStretchRemarks: 'Z',
                speedWalkRemarks: 'AA', gripTestRemarks: 'AB'
            };

            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                fields: 'sheets.properties'
            });
            const targetSheet = spreadsheet.data.sheets[0].properties.title;

            // Build batch value updates
            const data = [];
            for (const [field, value] of Object.entries(updates)) {
                const col = columnMap[field];
                if (col) {
                    data.push({
                        range: `'${targetSheet}'!${col}${rowNumber}`,
                        values: [[value]]
                    });
                }
            }

            if (data.length === 0) {
                return { success: false, error: 'No valid fields to update' };
            }

            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: fileId,
                resource: {
                    valueInputOption: 'RAW',
                    data: data
                }
            });

            console.log(`[SHEETS] Updated row ${rowNumber} (entry ${entryNumber}): ${Object.keys(updates).join(', ')}`);
            return { success: true, updatedFields: Object.keys(updates) };
        } catch (error) {
            console.error('[SHEETS] Error updating row:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getRow(fileId, entryNumber) {
        try {
            const sheets = await this.initializeSheetsAuth();
            const rowNumber = entryNumber + 1; // +1 for header row

            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: fileId,
                fields: 'sheets.properties'
            });
            const targetSheet = spreadsheet.data.sheets[0].properties.title;

            const range = `'${targetSheet}'!A${rowNumber}:AB${rowNumber}`;
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: fileId,
                range: range
            });

            const row = response.data.values && response.data.values[0] ? response.data.values[0] : [];
            // Map to column names (A=0 to AB=27)
            return {
                success: true,
                data: {
                    name: row[0] || '',
                    chineseName: row[1] || '',
                    phoneNo: row[2] || '',
                    gender: row[3] || '',
                    dd: row[4] || '',
                    mm: row[5] || '',
                    yyyy: row[6] || '',
                    age: row[7] || '',
                    height: row[8] || '',
                    weight: row[9] || '',
                    bmi: row[10] || '',
                    testDate: row[11] || '',
                    sitStand: row[12] || '',
                    armCurl: row[13] || '',
                    march: row[14] || '',
                    sitReach: row[15] || '',
                    backStretch: row[16] || '',
                    speedWalk: row[17] || '',
                    gripTest: row[18] || '',
                    improvements: row[19] || '',
                    remarks: row[20] || '',
                    sitStandRemarks: row[21] || '',
                    armCurlRemarks: row[22] || '',
                    marchRemarks: row[23] || '',
                    sitReachRemarks: row[24] || '',
                    backStretchRemarks: row[25] || '',
                    speedWalkRemarks: row[26] || '',
                    gripTestRemarks: row[27] || ''
                }
            };
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
}

module.exports = GoogleDriveController;
