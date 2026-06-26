const getCourseReferenceCode = require('../constants/courseCodeMapping');

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeItemCode(itemCode) {
    const normalized = String(itemCode ?? '').trim().toUpperCase();
    if (!normalized) return 'SFC';
    const sanitized = normalized.replace(/[^A-Z0-9.-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return sanitized || 'SFC';
}

function getLocationCode(location) {
    const normalized = String(location ?? '').trim().toLowerCase();
    if (normalized.includes('pasir ris') || normalized.includes('prw')) return 'PRW';
    if (normalized.includes('ct hub') || normalized.includes('renewal christian') || normalized.includes('cth')) return 'CTH';
    if (normalized.includes('tampines') || normalized.includes('tnc')) return 'TNC';
    return 'TNC';
}

function getYearSuffix(year) {
    const normalized = String(year ?? new Date().getFullYear()).trim();
    if (/^\d{4}$/.test(normalized)) return normalized.slice(-2);
    if (/^\d{2}$/.test(normalized)) return normalized;
    return String(new Date().getFullYear()).slice(-2);
}

function getNextSeriesNumber(existingRecords = [], year) {
    const yearSuffix = getYearSuffix(year);
    const invoiceNoRegex = /^ECSS-(PRW|CTH|TNC)-([A-Z0-9.-]+)-(\d+)-(\d{2})$/;

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

function resolveCategoryCode(value) {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (!normalized) return null;

    const directCategoryMap = {
        NSA: 'NSA',
        FIT: 'FIT',
        FITNESS: 'FIT',
        WELLNESS: 'FIT',
        EXERCISE: 'FIT',
        WORKOUT: 'FIT',
        YOGA: 'FIT',
        PILATES: 'FIT',
        HEALTH: 'FIT',
        FR: 'FR',
        FUNDRAISING: 'FR',
        CHARITY: 'FR',
        DONATION: 'FR',
        PAN: 'PAN',
        PANETTONE: 'PAN',
        MSC: 'MSC',
        MUSIC: 'MSC',
        SINGING: 'MSC',
        UKULELE: 'MSC',
        CAJON: 'MSC',
        CHOIR: 'MSC',
        OTHERS: 'MSC',
        OTHER: 'MSC',
        SFC: 'SFC',
        SKILLSFUTURE: 'SFC',
        SKILLS: 'SFC',
        SSG: 'SFC',
        TLE: 'TLE',
        TALKS: 'TLE',
        SEMINAR: 'TLE',
        WEBINAR: 'TLE',
        WORKSHOP: 'TLE',
        LECTURE: 'TLE',
    };

    if (directCategoryMap[normalized]) {
        return directCategoryMap[normalized];
    }

    if (normalized.includes('WELLNESS') || normalized.includes('FITNESS') || normalized.includes('EXERCISE') || normalized.includes('YOGA') || normalized.includes('PILATES') || normalized.includes('MOBILITY')) {
        return 'FIT';
    }

    if (normalized.includes('PANETTONE')) {
        return 'PAN';
    }

    if (normalized.includes('FUNDRAISING') || normalized.includes('CHARITY') || normalized.includes('DONATION')) {
        return 'FR';
    }

    if (normalized.includes('MUSIC') || normalized.includes('SINGING') || normalized.includes('UKULELE') || normalized.includes('CAJON') || normalized.includes('CHOIR')) {
        return 'MSC';
    }

    if (normalized.includes('SKILLS') || normalized.includes('SSG')) {
        return 'SFC';
    }

    if (normalized.includes('TALK') || normalized.includes('SEMINAR') || normalized.includes('WEBINAR') || normalized.includes('WORKSHOP') || normalized.includes('LECTURE')) {
        return 'TLE';
    }

    if (normalized.includes('NSA')) {
        return 'NSA';
    }

    return null;
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
    const paymentMethodOverride = getPaymentMethodOverrideCode(paymentMethod);
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

    const spreadsheetCategoryHint = course?.itemCategoryForMosesUses || course?.itemCategory || course?.categoryForMosesUses || course?.spreadsheetCategory || '';
    const categoryHint = course?.productCategory || course?.category || course?.wooCategory || course?.product_type || '';
    const courseTypeHint = course?.courseType || course?.type || course?.courseCategory || '';

    const mappedSpreadsheetCategory = resolveCategoryCode(spreadsheetCategoryHint);
    if (mappedSpreadsheetCategory) {
        return sanitizeItemCode(mappedSpreadsheetCategory);
    }

    const mappedCourseType = resolveCategoryCode(courseTypeHint);
    if (mappedCourseType) {
        return sanitizeItemCode(mappedCourseType);
    }

    const mappedCategory = resolveCategoryCode(categoryHint);
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
    const normalizedLocation = getLocationCode(course?.courseLocation || course?.location || 'UNKNOWN');
    const normalizedItemCode = sanitizeItemCode(resolvedItemCode);
    const padded = getNextSeriesNumber(existingInvoices, normalizedYear);

    return `ECSS-${normalizedLocation}-${normalizedItemCode}-${padded}-${normalizedYear}`;
}

async function getNextInvoiceNumber({ existingInvoices, year, itemCode, course }) {
    return generateInvoiceNumber({ existingInvoices, year, itemCode, course });
}

module.exports = {
    getNextInvoiceNumber,
    generateInvoiceNumber,
};
