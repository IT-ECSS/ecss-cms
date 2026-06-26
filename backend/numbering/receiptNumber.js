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
    const receiptNoRegex = /^ECSS-([A-Z0-9]+)-([A-Z0-9.-]+)-(\d+)-(\d{2})$/;

    const matchingRecords = (existingRecords || []).filter(record => {
        const receiptNo = record?.receiptNo || record?.receiptNumber || record?.invoiceNo || record?.invoiceNumber || '';
        return typeof receiptNo === 'string' && receiptNoRegex.test(receiptNo);
    });

    const runningNumbers = matchingRecords
        .map(record => {
            const receiptNo = record?.receiptNo || record?.receiptNumber || record?.invoiceNo || record?.invoiceNumber || '';
            const match = receiptNo.match(receiptNoRegex);
            return match ? parseInt(match[3], 10) : null;
        })
        .filter(number => number !== null && !Number.isNaN(number));

    const nextNumber = runningNumbers.length > 0 ? Math.max(...runningNumbers) + 1 : 1;
    return String(nextNumber).padStart(5, '0');
}

// Resolve an item code from a category/description value. Nothing is hardcoded:
// the mapping lives in the "Item Code Legend" Google Sheet (Item Category (For
// Moses Uses) + Receipt/Invoice -> Item Code).
async function resolveCategoryCode(value, docType = 'Receipt') {
    return resolveItemCodeFromCategory(value, docType);
}

function getPaymentMethodOverrideCode(paymentMethod) {
    const normalized = String(paymentMethod ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized === 'CASH' || normalized === 'PAYNOW') {
        return 'NSA';
    }

    return null;
}

async function resolveItemCode(course, paymentMethod) {
    // WooCommerce product categories that are NOT registration/payment course types must
    // follow the "Item Category (For Moses Uses)" mapping and take precedence over any
    // payment-method override (e.g. Cash → NSA, SkillsFuture → SFC). The presence of a
    // wooCategory means this item came from WooCommerce, not the registration system.
    const wooCategoryHint = course?.wooCategory || '';
    const mappedWooCategory = await resolveCategoryCode(wooCategoryHint, 'Receipt');
    if (mappedWooCategory) {
        return sanitizeItemCode(mappedWooCategory);
    }

    const paymentMethodOverride = getPaymentMethodOverrideCode(course?.finalPaymentMethod || paymentMethod);
    if (paymentMethodOverride) {
        return paymentMethodOverride;
    }

    const explicitItemCode = course?.itemCode || course?.courseCode || course?.referenceCode || course?.code || course?.courseReferenceCode || course?.item_code;
    if (explicitItemCode) {
        return sanitizeItemCode(explicitItemCode);
    }

    const spreadsheetCategoryHint = course?.itemCategoryForMosesUses || course?.itemCategory || course?.categoryForMosesUses || course?.spreadsheetCategory || '';
    const categoryHint = course?.productCategory || course?.category || course?.wooCategory || course?.product_type || '';
    const courseTypeHint = course?.courseType || course?.type || course?.courseCategory || '';

    const mappedSpreadsheetCategory = await resolveCategoryCode(spreadsheetCategoryHint, 'Receipt');
    if (mappedSpreadsheetCategory) {
        return sanitizeItemCode(mappedSpreadsheetCategory);
    }

    const mappedCourseType = await resolveCategoryCode(courseTypeHint, 'Receipt');
    if (mappedCourseType) {
        return sanitizeItemCode(mappedCourseType);
    }

    const mappedCategory = await resolveCategoryCode(categoryHint, 'Receipt');
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
        console.error('[receiptNumber] Failed to resolve item code from course mapping:', error.message);
        return 'SFC';
    }
}

function getNextReceiptNumberForSkillsFuture({ centreReceiptNumbers, centreLocation, centreSuffix, currentYear }) {
    let nextNumber;

    console.log('Debug - Centre Receipt Numbers:', centreReceiptNumbers, 'Centre Location:', centreLocation, 'Current Year:', currentYear);

    if (centreReceiptNumbers.length > 0) {
        nextNumber = Math.max(...centreReceiptNumbers) + 1;
    } else if (currentYear === 25) {
        if (centreLocation === 'CT Hub') nextNumber = 109;
        else if (centreLocation === 'Tampines 253 Centre') nextNumber = 91;
        else if (centreLocation === 'Pasir Ris West Wellness Centre') nextNumber = 13;
        else if (centreLocation === 'Sree Narayana Mission') nextNumber = 1;
        else if (centreLocation === 'Renewal Christian Church') nextNumber = 16;
        else nextNumber = 1;
    } else {
        nextNumber = 1;
    }

    console.log('Debug - Next Number before formatting:', nextNumber);
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    return `ECSS/SFC/${centreSuffix}${paddedNumber}/${currentYear}`;
}

function getNextReceiptNumberForPayNowCash({ courseLocation, existingReceipts, centreLocation, currentYear, fullYear }) {
    let nextNumber;

    console.log('=== PayNow/Cash Receipt Generation Debug ===');
    console.log('Course Location:', courseLocation);
    console.log('Centre Location:', centreLocation);
    console.log('Current Year:', currentYear);
    console.log('Full Year:', fullYear);
    console.log('Existing Receipts Count:', existingReceipts.length);
    console.log('Existing Receipts:', existingReceipts.map(r => ({ receiptNo: r.receiptNo, location: r.location })));

    const filteredReceipts = existingReceipts.filter(receipt =>
        receipt.location === centreLocation && receipt.receiptNo.startsWith(`${fullYear} - `)
    );
    console.log('Filtered Receipts for Centre Location (current year):', filteredReceipts.length);

    const centreReceiptNumbers = filteredReceipts.map(receipt => {
        const parts = receipt.receiptNo.split(' - ');
        const receiptNumberMatch = parts[parts.length - 1];
        return receiptNumberMatch ? parseInt(receiptNumberMatch, 10) : null;
    }).filter(num => num !== null && !Number.isNaN(num));

    const maxReceiptNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) : 0;

    console.log('Latest Receipt Numbers for', centreLocation, ':', maxReceiptNumber);
    console.log('Centre Receipt Numbers:', centreReceiptNumbers);

    if (centreLocation === 'Tampines 253 Centre') {
        nextNumber = maxReceiptNumber + 1;
    } else if (centreLocation === 'Pasir Ris West Wellness Centre') {
        nextNumber = maxReceiptNumber + 1;
    } else if (centreLocation === 'CT Hub') {
        nextNumber = maxReceiptNumber + 1;
    } else if (centreLocation === 'Renewal Christian Church') {
        console.log('This is Renewal Christian Church');
        nextNumber = maxReceiptNumber + 1;
    } else if (centreLocation === 'Sree Narayana Mission') {
        console.log('This is Sree Narayana Mission - PayNow/Cash');
        nextNumber = centreReceiptNumbers.length > 0 ? Math.max(...centreReceiptNumbers) + 1 : 1;
    } else {
        nextNumber = maxReceiptNumber + 1;
    }

    const formattedNextNumber = String(nextNumber).padStart(4, '0');
    console.log(`Generated Receipt Number for ${centreLocation}: ${fullYear} - ${courseLocation} - ${formattedNextNumber}`);

    return `${fullYear} - ${courseLocation} - ${formattedNextNumber}`;
}

function getNextMarriagePrepReceiptNumber({ courseLocation, centreLocation, courseType, courseEngName, existingReceipts, currentDate = new Date() }) {
    const isMarriagePrep = courseType && courseType.trim() === 'Marriage Preparation Programme';
    const isGroupClass = courseEngName && (
        courseEngName.includes('Marriage Preparation Programme Group Class') ||
        (courseEngName.includes('P/E MPrep') && courseEngName.includes('Marriage Preparation Programme'))
    );

    if (!isMarriagePrep || !isGroupClass) {
        throw new Error('This function is only for Marriage Preparation Programme Group Class');
    }

    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currentYear = currentDate.getFullYear().toString().slice(-2);
    const receiptPrefix = `PE(Group)_${courseLocation}_${currentMonth}${currentYear}`;

    console.log('Receipt Prefix:', receiptPrefix);

    const escapedPrefix = receiptPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = `^${escapedPrefix}_\\d+$`;

    console.log('Regex Pattern for Marriage Prep:', regexPattern);

    const runningNumbers = existingReceipts.map(receipt => {
        const numberRegex = new RegExp(`^${escapedPrefix}_(\\d+)$`);
        const match = receipt.receiptNo.match(numberRegex);

        if (match && match[1]) {
            const number = parseInt(match[1], 10);
            console.log(`Extracted running number: ${number} from ${receipt.receiptNo}`);
            return number;
        }
        return null;
    }).filter(num => num !== null && !Number.isNaN(num));

    console.log('Valid Running Numbers:', runningNumbers);

    let nextRunningNumber;
    if (runningNumbers.length === 0) {
        nextRunningNumber = 1;
        console.log('No existing receipts found, starting with 001');
    } else {
        const maxNumber = Math.max(...runningNumbers);
        nextRunningNumber = maxNumber + 1;
        console.log(`Max existing number: ${maxNumber}, next number: ${nextRunningNumber}`);
    }

    const formattedRunningNumber = String(nextRunningNumber).padStart(3, '0');
    const completeReceiptNumber = `${receiptPrefix}_${formattedRunningNumber}`;

    console.log('Generated Marriage Prep Receipt Number:', completeReceiptNumber);
    return completeReceiptNumber;
}

async function generateStandardReceiptNumber({ existingReceipts = [], courseLocation, fullYear, itemCode }) {
    const normalizedLocation = await getLocationCode(courseLocation);
    const normalizedItemCode = sanitizeItemCode(itemCode || 'SFC');
    const yearSuffix = getYearSuffix(fullYear);
    const paddedNumber = getNextSeriesNumber(existingReceipts, yearSuffix);

    return `ECSS-${normalizedLocation}-${normalizedItemCode}-${paddedNumber}-${yearSuffix}`;
}

async function generateReceiptNumber({ course, paymentMethod, existingReceipts, currentYear, fullYear }) {
    const { courseLocation, courseType, courseEngName } = course || {};
    const centreLocation = courseLocation;

    const isMarriagePrep = courseType && courseType.trim() === 'Marriage Preparation Programme';
    const isGroupClass = courseEngName && (
        courseEngName.includes('Marriage Preparation Programme Group Class') ||
        (courseEngName.includes('P/E MPrep') && courseEngName.includes('Marriage Preparation Programme'))
    );

    if (isMarriagePrep && isGroupClass) {
        return getNextMarriagePrepReceiptNumber({
            courseLocation,
            centreLocation,
            courseType,
            courseEngName,
            existingReceipts,
        });
    }

    const itemCode = await resolveItemCode(course, paymentMethod);

    if (centreLocation) {
        return generateStandardReceiptNumber({
            existingReceipts,
            courseLocation: centreLocation,
            fullYear,
            itemCode,
        });
    }

    return generateStandardReceiptNumber({
        existingReceipts,
        courseLocation: course?.location || 'UNKNOWN',
        fullYear,
        itemCode,
    });
}

module.exports = {
    getNextReceiptNumberForSkillsFuture,
    getNextReceiptNumberForPayNowCash,
    getNextMarriagePrepReceiptNumber,
    generateReceiptNumber,
    generateStandardReceiptNumber,
    resolveItemCode,
    resolveCategoryCode,
};
