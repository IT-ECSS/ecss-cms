'use strict';

/**
 * FFT Event Expiry Service
 *
 * Runs daily at midnight SGT (scheduled from app.js).
 * For every event in the master sheet whose date has passed:
 *   1. Clears the Registration Link (column G) in the master sheet.
 *   2. Deletes the matching QR code file from the QR code Drive folder.
 */

const GoogleDriveController = require('../Controller/Google/GoogleDriveController');

const MASTER_SHEET_ID   = '1fMyjRlqj3ZEj9OcWCP_HtViLbgYG2zW4i-qZUdVOMXo';
const QR_CODE_FOLDER_ID = '1pYiCfYdCKGFoAmoQ64IDx05Mf8Omj88R';
const SHEET_NAME        = 'Sheet1';

const googleDriveController = new GoogleDriveController();

/**
 * Parses the event date from an FFT event name or createdOn date.
 * Supports two naming conventions:
 *   1. Convention 1 (date-based): "YYYY/MM/DD Location FFT Session N" e.g. "2026/04/14 CTH FFT Session 1"
 *   2. Convention 2 (location-based): "Location YYYY FFT" e.g. "Tampines 2026 FFT"
 * For Convention 1, extracts date from event name.
 * For Convention 2, returns the createdOn date if provided.
 * Returns a Date at midnight SGT for that date, or null if not parseable.
 * 
 * @param {string} eventName - The event name
 * @param {string} createdOn - The creation date (used for Convention 2; format: "DD/MM/YYYY" or similar)
 * @returns {Date|null} Date at midnight SGT, or null if unparseable
 */
function parseEventDate(eventName, createdOn) {
    // Convention 1: Try to extract YYYY/MM/DD from start of event name
    const match = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(eventName || '');
    if (match) {
        // Construct as SGT midnight (UTC+8)
        return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+08:00`);
    }

    // Convention 2: Try to parse createdOn date (handles multiple formats: DD/MM/YYYY, YYYY-MM-DD, etc.)
    if (createdOn) {
        const createdOnStr = String(createdOn).trim();
        
        // Try DD/MM/YYYY format
        const ddmmyyyyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(createdOnStr);
        if (ddmmyyyyMatch) {
            const day = ddmmyyyyMatch[1].padStart(2, '0');
            const month = ddmmyyyyMatch[2].padStart(2, '0');
            const year = ddmmyyyyMatch[3];
            return new Date(`${year}-${month}-${day}T00:00:00+08:00`);
        }

        // Try YYYY-MM-DD format
        const yyyymmddMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(createdOnStr);
        if (yyyymmddMatch) {
            const year = yyyymmddMatch[1];
            const month = yyyymmddMatch[2].padStart(2, '0');
            const day = yyyymmddMatch[3].padStart(2, '0');
            return new Date(`${year}-${month}-${day}T00:00:00+08:00`);
        }

        // Try to parse as ISO date or any other format that JavaScript understands
        const parsedDate = new Date(createdOnStr);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
        }
    }

    return null;
}

/**
 * Returns a Date representing today at midnight SGT (UTC+8).
 * Uses the same +08:00 offset as parseEventDate so comparisons are consistent.
 */
function getTodaySGT() {
    // en-CA gives YYYY-MM-DD format, interpreted in SGT timezone
    const sgtDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
    return new Date(`${sgtDateStr}T00:00:00+08:00`);
}

/**
 * Main expiry job. Reads the master sheet, finds rows with a past event date
 * that still have a registration link, clears the link, and deletes the QR file.
 */
async function expireOldFFTEvents() {
    console.log('[FFT Expiry] Starting daily expiry check...');
    try {
        const result = await googleDriveController.readSpreadsheet(MASTER_SHEET_ID, SHEET_NAME);
        if (!result.success || !result.data) {
            console.error('[FFT Expiry] Failed to read master sheet:', result.error);
            return;
        }

        const today = getTodaySGT();
        const sheets = await googleDriveController.initializeSheetsAuth();

        // Fetch QR folder files once to avoid repeated API calls.
        let qrFiles = [];
        try {
            const qrResult = await googleDriveController.listFilesInFolder(QR_CODE_FOLDER_ID);
            if (qrResult.success) qrFiles = qrResult.files || [];
        } catch (e) {
            console.warn('[FFT Expiry] Could not list QR files:', e.message);
        }

        const rows = result.data;
        // rows are 0-indexed data rows (header already stripped by readSpreadsheet).
        // Sheet row = dataIndex + 2 (1 for header, 1 for 1-based indexing).
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[1]) continue;

            const eventName         = String(row[1]).trim();
            const createdOn         = String(row[5] || '').trim(); // Column F: createdOn date
            const registrationLink  = String(row[7] || '').trim();
            const currentStatus     = String(row[2] || '').trim();

            // Skip rows already marked Past with no registration link.
            if (currentStatus === 'Past' && !registrationLink) continue;

            // Parse date from event name (Convention 1) or createdOn field (Convention 2)
            const eventDate = parseEventDate(eventName, createdOn);
            if (!eventDate) continue; // date not parseable, leave untouched

            if (eventDate < today) {
                const sheetRow = i + 2; // 1-based + header offset

                // ── Step 1: Set Status=Past (column C), clear Registration Link (column H) and QR Code (column I) ──
                try {
                    await sheets.spreadsheets.values.batchUpdate({
                        spreadsheetId: MASTER_SHEET_ID,
                        requestBody: {
                            valueInputOption: 'RAW',
                            data: [
                                { range: `${SHEET_NAME}!C${sheetRow}`, values: [['Past']] },
                                { range: `${SHEET_NAME}!H${sheetRow}`, values: [['']] },
                                { range: `${SHEET_NAME}!I${sheetRow}`, values: [['']] },
                            ],
                        },
                    });
                    console.log(`[FFT Expiry] Set Status=Past and cleared links for "${eventName}" (row ${sheetRow})`);
                } catch (e) {
                    console.error(`[FFT Expiry] Failed to update row ${sheetRow}:`, e.message);
                }

                // ── Step 2: Delete matching QR code file from Drive ─────────
                const normalizedName = eventName.toLowerCase();
                const qrFile = qrFiles.find(
                    f => f && f.name && String(f.name).trim().toLowerCase().includes(normalizedName)
                );
                if (qrFile) {
                    try {
                        await googleDriveController.deleteFile(qrFile.id);
                        qrFiles = qrFiles.filter(f => f.id !== qrFile.id);
                        console.log(`[FFT Expiry] Deleted QR file "${qrFile.name}" for "${eventName}"`);
                    } catch (e) {
                        console.error(`[FFT Expiry] Failed to delete QR file for "${eventName}":`, e.message);
                    }
                }
            }
        }

        console.log('[FFT Expiry] Daily expiry check completed.');
    } catch (err) {
        console.error('[FFT Expiry] Unexpected error:', err.message);
    }
}

module.exports = { expireOldFFTEvents, parseEventDate, getTodaySGT };
