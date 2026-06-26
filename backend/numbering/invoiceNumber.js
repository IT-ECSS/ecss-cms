const getCourseReferenceCode = require('../constants/courseCodeMapping');
const { resolveItemCodeFromCategory } = require('../constants/itemCodeMapping');
const { resolveLocationCode } = require('../constants/locationCodeMapping');

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeItemCode(itemCode) {
    const normalized = String(itemCode ?? '').trim().toUpperCase();
    if (!normalized) return 'SFC';
    const sanitized = normalized.replace(/[^A-Z0-9.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return sanitized || 'SFC';
}

// Resolve a location code for a centre/location. Nothing is hardcoded: the
// mapping lives in the "Location Code" Google Sheet tab (Location name ->
// Location Code). Throws when the sheet has no matching row or a blank code,
// mirroring the Item Code legend guard, so we never emit a malformed number.
async function getLocationCode(location) {
    const code = await resolveLocationCode(location);
    if (!code) {
        throw new Error(`No location code found in the "Location Code" sheet for location "${location || ''}". Add the location (with its Location Code) to the sheet before generating a receipt or invoice.`);
    }
    return code;
}

function getYearSuffix(year) {
    const normalized = String(year ?? new Date().getFullYear()).trim();
    if (/^\d{4}$/.test(normalized)) return normalized.slice(-2);
    if (/^\d{2}$/.test(normalized)) return normalized;
    return String(new Date().getFullYear()).slice(-2);
}

function getNextSeriesNumber(existingRecords = [], year) {
    const yearSuffix = getYearSuffix(year);
    const invoiceNoRegex = /^ECSS-([A-Z0-9]+)-([A-Z0-9.-]+)-(\d+)-(\d{2})$/;

    const matchingRecords = (existingRecords || []).filter(record => {
        const invoiceNumber = record?.invoiceNumber || record?.invoiceNo || '';
        return typeof invoiceNumber === 'string' && invoiceNoRegex.test(invoiceNumber);
    });

    const runningNumbers = matchingRecords
        .map(record => {
            const invoiceNumber = record?.invoiceNumber || record?.invoiceNo || '';
            const match = invoiceNumber.match(invoiceNoRegex);
            return match ? parseInt(match[3], 10) : null;
        })
        .filter(number => number !== null && !Number.isNaN(number));

    const nextNumber = runningNumbers.length > 0 ? Math.max(...runningNumbers) + 1 : 1;
    return String(nextNumber).padStart(5, '0');
}

// Resolve an item code from a category/description value. Nothing is hardcoded:
// the mapping lives in the "Item Code Legend" Google Sheet (Item Category (For
// Moses Uses) + Receipt/Invoice -> Item Code).
async function resolveCategoryCode(value, docType = 'Invoice') {
    return resolveItemCodeFromCategory(value, docType);
}

function getPaymentMethodOverrideCode(paymentMethod) {
    const normalized = String(paymentMethod ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (normalized === 'SKILLSFUTURE' || normalized === 'SKILLSFUTUREPAYMENT') {
        return 'SFC';
    }

    if (normalized === 'CASH' || normalized === 'PAYNOW' || normalized === 'PAYNOWCASH') {
        return 'NSA';
    }

    return null;
}

async function resolveItemCode(course, itemCode, paymentMethod) {
    // WooCommerce product categories that are NOT registration/payment course types must
    // follow the "Item Category (For Moses Uses)" mapping and take precedence over any
    // payment-method override (e.g. Cash → NSA, SkillsFuture → SFC). The presence of a
    // wooCategory means this item came from WooCommerce, not the registration system.
    const wooCategoryHint = course?.wooCategory || '';
    const mappedWooCategory = await resolveCategoryCode(wooCategoryHint, 'Invoice');
    if (mappedWooCategory) {
        return sanitizeItemCode(mappedWooCategory);
    }

    // For registration courses, the course type IS the item category in the legend
    // sheet (e.g. courseType "NSA" + Invoice → SFC). This is the authoritative signal
    // for NSA SkillsFuture-claim invoices and takes precedence over any raw course
    // code (e.g. a TGS reference) or payment-method override.
    const courseTypeHint = course?.courseType || course?.type || course?.courseCategory || '';
    const mappedCourseType = await resolveCategoryCode(courseTypeHint, 'Invoice');
    if (mappedCourseType) {
        return sanitizeItemCode(mappedCourseType);
    }

    const spreadsheetCategoryHint = course?.itemCategoryForMosesUses || course?.itemCategory || course?.categoryForMosesUses || course?.spreadsheetCategory || '';
    const mappedSpreadsheetCategory = await resolveCategoryCode(spreadsheetCategoryHint, 'Invoice');
    if (mappedSpreadsheetCategory) {
        return sanitizeItemCode(mappedSpreadsheetCategory);
    }

    const paymentMethodOverride = getPaymentMethodOverrideCode(course?.finalPaymentMethod || paymentMethod);
    if (paymentMethodOverride) {
        return paymentMethodOverride;
    }

    if (itemCode) {
        return sanitizeItemCode(itemCode);
    }

    const explicitItemCode = course?.itemCode || course?.courseCode || course?.referenceCode || course?.code || course?.courseReferenceCode || course?.item_code;
    if (explicitItemCode) {
        return sanitizeItemCode(explicitItemCode);
    }

    const categoryHint = course?.productCategory || course?.category || course?.wooCategory || course?.product_type || '';

    const mappedCategory = await resolveCategoryCode(categoryHint, 'Invoice');
    if (mappedCategory) {
        return sanitizeItemCode(mappedCategory);
    }

    const courseName = course?.courseEngName || course?.courseName || course?.name || course?.title || '';
    const coursePrice = course?.price ?? course?.coursePrice ?? course?.fullPrice ?? course?.amount ?? course?.fee ?? course?.paymentAmount ?? course?.courseFee ?? null;

    if (!courseName) {
        return 'SFC';
    }

    try {
        const sheetItemCode = await getCourseReferenceCode(courseName, coursePrice);
        return sanitizeItemCode(sheetItemCode || 'SFC');
    } catch (error) {
        console.error('[invoiceNumber] Failed to resolve item code from course mapping:', error.message);
        return 'SFC';
    }
}

async function generateInvoiceNumber({ existingInvoices = [], year = new Date().getFullYear().toString(), itemCode, course, paymentMethod }) {
    const resolvedItemCode = await resolveItemCode(course, itemCode, paymentMethod);
    const normalizedYear = getYearSuffix(year);
    const normalizedLocation = await getLocationCode(course?.courseLocation || course?.location || 'UNKNOWN');
    const normalizedItemCode = sanitizeItemCode(resolvedItemCode);
    const padded = getNextSeriesNumber(existingInvoices, normalizedYear);

    return `ECSS-${normalizedLocation}-${normalizedItemCode}-${padded}-${normalizedYear}`;
}

async function getNextInvoiceNumber({ existingInvoices, year, itemCode, course, paymentMethod }) {
    return generateInvoiceNumber({ existingInvoices, year, itemCode, course, paymentMethod });
}

module.exports = {
    getNextInvoiceNumber,
    generateInvoiceNumber,
};
