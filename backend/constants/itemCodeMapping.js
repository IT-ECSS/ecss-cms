/**
 * Item Code Mapping (Item Code Legend)
 *
 * Source of truth for receipt/invoice item codes. NOTHING is hardcoded here —
 * every item code, category and description is read live from the Google Sheet
 * "Item Code Legend" so the business can update the mapping without code changes.
 *
 * Sheet columns (after the merged title row):
 *   S/N | Item Code | Item Category (For Moses Uses) | Item Description | Receipt/Invoice | Last Updated On
 *
 * The lookup key the rest of the system uses is the "Item Category (For Moses Uses)"
 * value (which matches the WooCommerce product category) combined with whether the
 * document being generated is a Receipt or an Invoice.
 */

const GoogleDriveController = require('../Controller/Google/GoogleDriveController');

const DRIVE_FILE_ID = '1ogJuSb0mlM-TYLmu2018J_aR7a5EKUBX_60CUYJR1Mo';
const DRIVE_SHEET_NAME = 'Item Code';

const googleDriveController = new GoogleDriveController();

function norm(value) {
    return String(value ?? '').trim().toUpperCase();
}

/**
 * Read the legend sheet and return a normalized list of entries.
 * @returns {Promise<Array<{itemCode: string, category: string, description: string, docType: string}>>}
 */
async function _fetchLegend() {
    const result = await googleDriveController.readSpreadsheet(DRIVE_FILE_ID, DRIVE_SHEET_NAME);
    if (!result || !result.success) {
        throw new Error('[itemCodeMapping] Failed to read "Item Code Legend" spreadsheet');
    }

    const rows = Array.isArray(result.data) ? result.data : [];

    // Locate the real header row (the one that contains an "Item Code" column).
    // The first sheet row is a merged title and is returned separately as result.columns.
    let headerIdx = rows.findIndex(row => Array.isArray(row) && row.some(cell => norm(cell) === 'ITEM CODE'));
    let header;
    let dataRows;
    if (headerIdx === -1) {
        header = Array.isArray(result.columns) ? result.columns : [];
        dataRows = rows;
    } else {
        header = rows[headerIdx];
        dataRows = rows.slice(headerIdx + 1);
    }

    const idxItemCode = header.findIndex(c => norm(c) === 'ITEM CODE');
    const idxCategory = header.findIndex(c => norm(c).includes('ITEM CATEGORY'));
    const idxDescription = header.findIndex(c => norm(c).includes('ITEM DESCRIPTION'));
    const idxType = header.findIndex(c => norm(c).includes('RECEIPT') && norm(c).includes('INVOICE'));

    const entries = [];
    for (const row of dataRows) {
        if (!Array.isArray(row)) continue;
        const itemCode = idxItemCode >= 0 ? String(row[idxItemCode] || '').trim() : '';
        if (!itemCode) continue;
        entries.push({
            itemCode,
            category: idxCategory >= 0 ? String(row[idxCategory] || '').trim() : '',
            description: idxDescription >= 0 ? String(row[idxDescription] || '').trim() : '',
            docType: idxType >= 0 ? String(row[idxType] || '').trim() : '',
        });
    }

    return entries;
}

/**
 * Resolve an item code from the legend sheet.
 *
 * Strict mapping ONLY — no fallbacks:
 *   "Item Category (For Moses Uses)" + "Receipt/Invoice" → "Item Code".
 *
 * @param {string} value   The exact "Item Category (For Moses Uses)" value.
 * @param {string} docType 'Receipt' or 'Invoice'.
 * @returns {Promise<string|null>} The matching item code, or null when nothing matches.
 */
async function resolveItemCodeFromCategory(value, docType = '') {
    const target = norm(value);
    if (!target) return null;
    const type = norm(docType);

    let entries;
    try {
        entries = await _fetchLegend();
    } catch (error) {
        console.error('[itemCodeMapping]', error.message);
        return null;
    }

    // Exact "Item Category (For Moses Uses)" + "Receipt/Invoice" → "Item Code". No fallback.
    const exact = entries.find(e => norm(e.category) === target && norm(e.docType) === type);
    return exact ? exact.itemCode : null;
}

module.exports = {
    resolveItemCodeFromCategory,
    _fetchLegend,
};
