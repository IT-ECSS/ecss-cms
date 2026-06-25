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

function generateInventoryReceiptNumber({ sku, existingRecords }) {
    const normalizedSku = sku || 'UNKNOWN';
    const skuRecords = (existingRecords || []).filter(record => {
        if (!record.receiptNumber) return false;
        const pattern = `ECSS/${normalizedSku}/`;
        return record.receiptNumber.startsWith(pattern);
    });

    if (skuRecords.length === 0) {
        return `ECSS/${normalizedSku}/0001`;
    }

    let maxNumber = 0;
    for (const record of skuRecords) {
        const parts = record.receiptNumber.split('/');
        if (parts.length === 3) {
            const num = parseInt(parts[2], 10);
            if (!Number.isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        }
    }

    const nextNumber = maxNumber + 1;
    const formattedNumber = nextNumber < 10000 ? nextNumber.toString().padStart(4, '0') : nextNumber.toString();
    return `ECSS/${normalizedSku}/${formattedNumber}`;
}

function generateFundraisingReceiptNumber({ items, existingReceipts, currentYear }) {
    let containsPanettone = false;
    if (items && Array.isArray(items) && items.length > 0) {
        containsPanettone = items.every(item => {
            const itemName = item.productName || item.name || item.itemName || '';
            return itemName.toLowerCase().includes('panettone');
        });
    }

    const receiptPrefix = containsPanettone ? 'ECSS/Panettone' : 'ECSS/FR';
    const receiptPattern = containsPanettone ? 'ECSS/Panettone' : 'ECSS/FR';

    const yearPattern = new RegExp(`^${receiptPattern}\\/\\d+\\/${currentYear}$`);
    const latestReceipt = (existingReceipts || []).find(receipt => {
        return receipt && receipt.receiptNo && yearPattern.test(receipt.receiptNo);
    });

    let nextNumber = 1;
    if (latestReceipt && latestReceipt.receiptNo) {
        const match = latestReceipt.receiptNo.match(new RegExp(`^${receiptPattern}\\/(\\d+)\\/${currentYear}$`));
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `${receiptPrefix}/${formattedNumber}/${currentYear}`;
}

function generateReceiptNumber({ course, paymentMethod, existingReceipts, currentYear, fullYear }) {
    const { courseLocation, courseType, courseEngName } = course;
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

    const isSkillsFuture = paymentMethod === 'SkillsFuture';
    const centreSuffix = isSkillsFuture
        ? (centreLocation === 'Tampines 253 Centre' ? 'TP' :
            centreLocation === 'Sree Narayana Mission' ? 'SNM' :
                centreLocation === 'Renewal Christian Church' ? 'R' : '')
        : null;

    if (isSkillsFuture) {
        const receiptNoRegex = new RegExp(`^ECSS/SFC/${centreSuffix}(\\d+)/${currentYear}$`);
        const centreReceiptNumbers = existingReceipts
            .map(r => {
                const m = r.receiptNo.match(receiptNoRegex);
                return m ? parseInt(m[1], 10) : null;
            })
            .filter(n => n !== null);

        return getNextReceiptNumberForSkillsFuture({
            centreReceiptNumbers,
            centreLocation,
            centreSuffix,
            currentYear,
        });
    }

    return getNextReceiptNumberForPayNowCash({
        courseLocation,
        existingReceipts,
        centreLocation,
        currentYear,
        fullYear,
    });
}

module.exports = {
    getNextReceiptNumberForSkillsFuture,
    getNextReceiptNumberForPayNowCash,
    getNextMarriagePrepReceiptNumber,
    generateReceiptNumber,
    generateInventoryReceiptNumber,
    generateFundraisingReceiptNumber,
};
