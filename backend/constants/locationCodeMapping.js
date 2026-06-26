/**
 * Location Code Mapping (Location Code Legend)
 *
 * Source of truth for receipt/invoice LOCATION codes. NOTHING is hardcoded here —
 * every location code and centre name is read live from the Google Sheet
 * "Location Code" tab so the business can update the mapping without code changes.
 * This mirrors the "Item Code Legend" approach in constants/itemCodeMapping.js.
 *
 * Sheet columns (after the merged title row):
 *   S/N | Location Code | Location | Last Updated On
 *
 * The lookup key is the centre/location NAME (e.g. "Pasir Ris West Wellness
 * Centre", "CT Hub", "Renewal Christian Centre"); it resolves to the matching
 * "Location Code" (e.g. PRW, CTH).
 */

const GoogleDriveController = require('../Controller/Google/GoogleDriveController');

const DRIVE_FILE_ID = '1ogJuSb0mlM-TYLmu2018J_aR7a5EKUBX_60CUYJR1Mo';
const DRIVE_SHEET_NAME = 'Location Code';

const googleDriveController = new GoogleDriveController();

function norm(value) {
    return String(value ?? '').trim().toUpperCase();
}

/**
 * Read the location legend sheet and return a normalized list of entries.
 * @returns {Promise<Array<{code: string, location: string}>>}
 */
async function _fetchLegend() {
    const result = await googleDriveController.readSpreadsheet(DRIVE_FILE_ID, DRIVE_SHEET_NAME);
    if (!result || !result.success) {
        throw new Error('[locationCodeMapping] Failed to read "Location Code" spreadsheet');
    }

    const rows = Array.isArray(result.data) ? result.data : [];

    // Locate the real header row (the one containing a "Location Code" column).
    // The first sheet row is a merged title and is returned separately as result.columns.
    const headerIdx = rows.findIndex(row =>
        Array.isArray(row) && row.some(cell => norm(cell) === 'LOCATION CODE')
    );
    let header;
    let dataRows;
    if (headerIdx === -1) {
        header = Array.isArray(result.columns) ? result.columns : [];
        dataRows = rows;
    } else {
        header = rows[headerIdx];
        dataRows = rows.slice(headerIdx + 1);
    }

    // "Location Code" column for the code; the plain "Location" column for the name.
    let idxCode = header.findIndex(c => norm(c) === 'LOCATION CODE');
    if (idxCode === -1) idxCode = header.findIndex(c => norm(c).includes('CODE'));

    let idxLocation = header.findIndex(c => norm(c) === 'LOCATION');
    if (idxLocation === -1) {
        idxLocation = header.findIndex((c, i) => i !== idxCode && norm(c).includes('LOCATION'));
    }

    const entries = [];
    for (const row of dataRows) {
        if (!Array.isArray(row)) continue;
        const location = idxLocation >= 0 ? String(row[idxLocation] || '').trim() : '';
        if (!location) continue;
        entries.push({
            code: idxCode >= 0 ? String(row[idxCode] || '').trim() : '',
            location,
        });
    }

    return entries;
}

/**
 * Resolve a location code from the legend sheet for a given centre/location.
 *
 * Matching order (most specific first):
 *   1. Exact location-name match.
 *   2. The supplied value is already a location code.
 *   3. Bidirectional substring on the location name (e.g. "Pasir Ris" ⊂
 *      "Pasir Ris West Wellness Centre").
 *   4. The supplied value contains a known location code.
 *
 * @param {string} location  Centre/location name or an existing location code.
 * @returns {Promise<string|null>} The matching location code (may be '' when the
 *   sheet leaves it blank), or null when no row matches.
 */
async function resolveLocationCode(location) {
    const target = norm(location);
    if (!target) return null;

    let entries;
    try {
        entries = await _fetchLegend();
    } catch (error) {
        console.error('[locationCodeMapping]', error.message);
        return null;
    }

    // 1. Exact location name.
    let row = entries.find(e => norm(e.location) === target);

    // 2. Supplied value is already a location code.
    if (!row) row = entries.find(e => e.code && norm(e.code) === target);

    // 3. Bidirectional substring on the location name.
    if (!row) {
        row = entries.find(e => {
            const el = norm(e.location);
            return el && (target.includes(el) || el.includes(target));
        });
    }

    // 4. Supplied value contains a known location code.
    if (!row) row = entries.find(e => e.code && target.includes(norm(e.code)));

    return row ? row.code : null;
}

module.exports = {
    resolveLocationCode,
    _fetchLegend,
};
