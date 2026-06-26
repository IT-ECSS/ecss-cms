/**
 * Document Number Dispatcher
 *
 * Single entry point that decides — using the "Item Code Legend" Google Sheet —
 * whether a given item should produce a RECEIPT or an INVOICE, and routes to the
 * correct numbering generator accordingly.
 *
 * Flow:
 *   1. Look up the matching legend row from the "Receipt/Invoice (Item Code)" sheet
 *      using the Item Category (For Moses Uses) and/or the Item Description.
 *   2. Read the row's "Receipt/Invoice" column to decide the document type.
 *   3. Read the row's "Item Code" (derived from Category (Moses) + Description).
 *   4. Guard: if the row's Item Category (For Moses Uses) is BLANK, refuse to
 *      generate either a receipt or an invoice.
 *   5. Route: Receipt  -> receiptNumber.generateStandardReceiptNumber
 *             Invoice  -> invoiceNumber.generateInvoiceNumber
 *
 * Nothing about the mapping is hardcoded — it all comes from the sheet via
 * constants/itemCodeMapping.js.
 */

const { _fetchLegend } = require('../constants/itemCodeMapping');
const { generateStandardReceiptNumber } = require('./receiptNumber');
const { generateInvoiceNumber } = require('./invoiceNumber');

const DOC_TYPE_RECEIPT = 'RECEIPT';
const DOC_TYPE_INVOICE = 'INVOICE';

function norm(value) {
    return String(value ?? '').trim().toUpperCase();
}

/**
 * Find the legend row that best matches the supplied category and/or description.
 * Description is the most specific key (it disambiguates rows that share a category,
 * e.g. NSA Receipt vs SkillsFuture Invoice which both have category "NSA").
 *
 * @returns {Promise<{itemCode: string, category: string, description: string, docType: string}|null>}
 */
async function findLegendRow({ category = '', description = '' } = {}) {
    const entries = await _fetchLegend();
    const cat = norm(category);
    const desc = norm(description);

    // 1. Exact category + exact description.
    let row = entries.find(e => cat && desc && norm(e.category) === cat && norm(e.description) === desc);
    if (row) return row;

    // 2. Exact description (uniquely identifies a row).
    row = entries.find(e => desc && norm(e.description) === desc);
    if (row) return row;

    // 3. Description contains / contained-by match.
    row = entries.find(e => {
        const ed = norm(e.description);
        return desc && ed && (ed.includes(desc) || desc.includes(ed));
    });
    if (row) return row;

    // 4. Exact category (first matching row when no description is given).
    row = entries.find(e => cat && norm(e.category) === cat);
    if (row) return row;

    // 5. The supplied value is already an item code.
    row = entries.find(e => cat && norm(e.itemCode) === cat);
    if (row) return row;

    return null;
}

/**
 * Resolve the document type + item code for an item from the legend sheet.
 * @returns {Promise<{success: boolean, type?: string, itemCode?: string, row?: object, error?: string}>}
 */
async function resolveDocument({ category = '', description = '' } = {}) {
    let row;
    try {
        row = await findLegendRow({ category, description });
    } catch (error) {
        return { success: false, error: `Failed to read Item Code Legend: ${error.message}` };
    }

    if (!row) {
        return {
            success: false,
            error: `No matching item in the Item Code Legend for category="${category || ''}", description="${description || ''}".`,
        };
    }

    // Guard: a blank "Item Category (For Moses Uses)" means we cannot generate
    // either a receipt or an invoice for this item.
    if (!String(row.category || '').trim()) {
        return {
            success: false,
            error: `Item Category (For Moses Uses) is blank for item code "${row.itemCode}" — cannot generate a receipt or invoice.`,
            row,
        };
    }

    const docType = norm(row.docType);
    if (docType !== DOC_TYPE_RECEIPT && docType !== DOC_TYPE_INVOICE) {
        return {
            success: false,
            error: `Unknown Receipt/Invoice type "${row.docType}" for item code "${row.itemCode}".`,
            row,
        };
    }

    return {
        success: true,
        type: docType === DOC_TYPE_RECEIPT ? 'Receipt' : 'Invoice',
        itemCode: row.itemCode,
        row,
    };
}

/**
 * Generate the correct document number (receipt or invoice) for an item.
 *
 * @param {object} params
 * @param {string} params.category        Item Category (For Moses Uses) / WooCommerce category.
 * @param {string} params.description     Item Description (disambiguates shared categories).
 * @param {string} params.location        Centre/location used for the location code.
 * @param {Array}  [params.existingReceipts] Existing receipt records (for receipt series).
 * @param {Array}  [params.existingInvoices] Existing invoice records (for invoice series).
 * @param {number|string} [params.year]   Year for the number suffix.
 * @returns {Promise<{success: boolean, type?: string, itemCode?: string, number?: string, error?: string}>}
 */
async function generateDocumentNumber({
    category = '',
    description = '',
    location = '',
    existingReceipts = [],
    existingInvoices = [],
    year = new Date().getFullYear(),
} = {}) {
    const resolved = await resolveDocument({ category, description });
    if (!resolved.success) {
        return resolved;
    }

    const { type, itemCode } = resolved;

    try {
        if (type === 'Receipt') {
            const number = await generateStandardReceiptNumber({
                existingReceipts: existingReceipts || [],
                courseLocation: location,
                fullYear: year,
                itemCode,
            });
            return { success: true, type, itemCode, number };
        }

        // Invoice
        const number = await generateInvoiceNumber({
            existingInvoices: existingInvoices || [],
            year: String(year),
            itemCode,
            course: { courseLocation: location, location },
        });
        return { success: true, type, itemCode, number };
    } catch (error) {
        // A missing/blank location code (or any generation failure) is surfaced as a
        // clean failure result instead of throwing, consistent with the Item Code guard.
        return { success: false, type, itemCode, error: error.message };
    }
}

module.exports = {
    generateDocumentNumber,
    resolveDocument,
    findLegendRow,
};
