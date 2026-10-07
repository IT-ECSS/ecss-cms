export const parseInvoiceFields = (fullText, allItems = []) => {
    const monthMap = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    const resolveYear = (year) => {
        const digits = year.replace(/\D/g, '');
        if (digits.length === 4) return digits;
        const value = parseInt(digits, 10);
        return value >= 0 && value <= 49
            ? `20${digits.padStart(2, '0')}`
            : `19${digits}`;
    };

    const tryParseDate = (text, allowOrdinal = false) => {
        const ordinal = allowOrdinal ? '(?:st|nd|rd|th)?' : '';
        let match = text.match(new RegExp(`(\\d{1,2})${ordinal}[\\s\\-\\/\\.](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\\s\\-\\/\\.,]*(\\d{2,4})`, 'i'));
        if (match) {
            const month = monthMap[match[2].toLowerCase().substring(0, 3)];
            return `${resolveYear(match[3])}-${month}-${match[1].padStart(2, '0')}`;
        }
        match = text.match(new RegExp(`(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+(\\d{1,2})${ordinal}[,\\s]+(\\d{2,4})`, 'i'));
        if (match) {
            const month = monthMap[match[1].toLowerCase().substring(0, 3)];
            return `${resolveYear(match[3])}-${month}-${match[2].padStart(2, '0')}`;
        }
        match = text.match(/(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
        if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        match = text.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})/);
        if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        match = text.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2})(?!\d)/);
        if (match) return `${resolveYear(match[3])}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        return '';
    };

    let date = '';
    const dateLabelPattern = /(?:invoice\s*date|inv\.?\s*date|inv\s*dt|bill\s*date|order\s*date|po\s*date|purchase\s*date|delivery\s*date|do\s*date|doc(?:ument)?\s*date|issued?\s*(?:on|date)|dated?)\s*[:\-\s]\s*(.+)/gi;
    let labelMatch;
    while ((labelMatch = dateLabelPattern.exec(fullText)) !== null) {
        date = tryParseDate(labelMatch[1].substring(0, 30).trim());
        if (date) break;
    }
    if (!date) {
        const monthNameDate = fullText.match(/\b(\d{1,2})[\s\-\/\.](Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s\-\/\.,]*(\d{2,4})\b/i);
        if (monthNameDate) date = tryParseDate(monthNameDate[0]);
    }
    if (!date) {
        const monthFirstDate = fullText.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,\s]+(\d{2,4})\b/i);
        if (monthFirstDate) date = tryParseDate(monthFirstDate[0]);
    }
    if (!date) {
        const isoDate = fullText.match(/\b(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})\b/);
        if (isoDate) date = tryParseDate(isoDate[0]);
    }
    if (!date) {
        const numericDate = fullText.match(/\b(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2,4})\b/);
        if (numericDate) date = tryParseDate(numericDate[0]);
    }
    if (!date) {
        const receiptDate = fullText.match(/(?:receipt|invoice)\s*date\s*[:\-\s]\s*([^\n\r]+)/i);
        if (receiptDate) date = tryParseDate(receiptDate[1], true);
    }

    const timeLabelMatch = fullText.match(/(?:time|created\s*at|issued\s*at)\s*[:\-]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
    const generalTimeMatch = fullText.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?\b/);
    const timeMatch = timeLabelMatch || generalTimeMatch;
    let time = '';
    if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const ampm = timeMatch[4];
        if (ampm) {
            if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
            if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
        }
        time = `${String(hours).padStart(2, '0')}:${timeMatch[2]}`;
    }

    let quantity = '';
    const qtyHeaderItem = allItems.find(item =>
        /^(qty\.?|quantity|qty:|quantity:)$/i.test(item.str.replace(/\s/g, ''))
    );
    if (qtyHeaderItem) {
        const candidates = allItems.filter(item =>
            item.page === qtyHeaderItem.page &&
            Math.abs(item.x - qtyHeaderItem.x) < 50 &&
            item.y < qtyHeaderItem.y &&
            /^\d+$/.test(item.str.replace(/,/g, ''))
        ).sort((a, b) => b.y - a.y);
        if (candidates.length > 0) quantity = candidates[0].str.replace(/,/g, '');
    }
    if (!quantity) {
        const quantityPatterns = [
            /(?:qty|quantity|qty\.|qty:|quantity:|total\s*qty|total\s*quantity)\s*[:\s]*(\d[\d,]*)/i,
            /\b(\d[\d,]*)\s*(?:pcs|units?|pieces?|items?|nos?|ea|sets?|boxes?|cartons?|rolls?|btls?|bottles?|bags?|packs?|pairs?)\b/i,
            /\bx\s*(\d[\d,]*)\b/i,
            /\b(\d{1,5})\s*x\b/i,
        ];
        for (const pattern of quantityPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                quantity = match[1].replace(/,/g, '');
                break;
            }
        }
    }
    if (!quantity && qtyHeaderItem) {
        const nearbyNumber = allItems.find(item =>
            item.page === qtyHeaderItem.page &&
            Math.abs(item.y - qtyHeaderItem.y) < 30 &&
            item.x !== qtyHeaderItem.x &&
            /^\d+$/.test(item.str.replace(/,/g, ''))
        );
        if (nearbyNumber) quantity = nearbyNumber.str.replace(/,/g, '');
    }

    return { date, time, quantity };
};
