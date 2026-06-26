const getCourseReferenceCode = require('../constants/courseCodeMapping');

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeItemCode(itemCode) {
    const normalized = String(itemCode ?? '').trim().toUpperCase();
    if (!normalized) return 'UNKNOWN';
    const sanitized = normalized.replace(/[^A-Z0-9.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return sanitized || 'UNKNOWN';
}

async function resolveItemCode(course, itemCode) {
    if (itemCode) {
        return sanitizeItemCode(itemCode);
    }

    const explicitItemCode = course?.itemCode || course?.courseCode || course?.referenceCode || course?.code || course?.courseReferenceCode || course?.item_code;
    if (explicitItemCode) {
        return sanitizeItemCode(explicitItemCode);
    }

    const courseName = course?.courseEngName || course?.courseName || course?.name || course?.title || '';
    const coursePrice = course?.price ?? course?.coursePrice ?? course?.fullPrice ?? course?.amount ?? course?.fee ?? course?.paymentAmount ?? course?.courseFee ?? null;

    if (!courseName) {
        return 'UNKNOWN';
    }

    try {
        const sheetItemCode = await getCourseReferenceCode(courseName, coursePrice);
        return sanitizeItemCode(sheetItemCode || 'UNKNOWN');
    } catch (error) {
        console.error('[invoiceNumber] Failed to resolve item code from course mapping:', error.message);
        return 'UNKNOWN';
    }
}

async function generateInvoiceNumber({ existingInvoices = [], year = new Date().getFullYear().toString().slice(-2), itemCode, course }) {
    const resolvedItemCode = await resolveItemCode(course, itemCode);
    const yearSuffix = String(year).padStart(2, '0');
    const escapedItemCode = escapeRegExp(resolvedItemCode);
    const invoiceNoRegex = new RegExp(`^ECSS-${escapedItemCode}-(\\d{5,})-${yearSuffix}$`);

    const matchingInvoices = (existingInvoices || []).filter(invoice => {
        return invoice && invoice.invoiceNumber && invoiceNoRegex.test(invoice.invoiceNumber);
    });

    const runningNumbers = matchingInvoices
        .map(invoice => {
            const match = invoice.invoiceNumber.match(invoiceNoRegex);
            return match ? parseInt(match[1], 10) : null;
        })
        .filter(number => number !== null && !Number.isNaN(number));

    const nextNumber = runningNumbers.length > 0 ? Math.max(...runningNumbers) + 1 : 1;
    const padded = String(nextNumber).padStart(5, '0');

    return `ECSS-${resolvedItemCode}-${padded}-${yearSuffix}`;
}

async function getNextInvoiceNumber({ existingInvoices, year, itemCode, course }) {
    return generateInvoiceNumber({ existingInvoices, year, itemCode, course });
}

module.exports = {
    getNextInvoiceNumber,
    generateInvoiceNumber,
};
