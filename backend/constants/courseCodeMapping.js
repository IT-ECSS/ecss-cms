/**
 * Course Reference Code Mapping
 * Maps course names to TGS course codes for SSG SkillsFuture integration
 * Used for invoice generation and payment processing
 */

const GoogleDriveController = require('../Controller/Google/GoogleDriveController');

const DRIVE_FILE_NAME = 'ECSS NSA Courses Details';
// const DRIVE_FILE_NAME_FALLBACK = 'ECSS NSA Course Details'; // FALLBACK DISABLED: Using only primary Google Sheet
const DRIVE_SHEET_NAME = 'ECSS Course Code (SkillsFuture)';
const DRIVE_FILE_ID = '1MC6bUg22CD-a4v9zcDKwLiQXx12Jjg-D_nPWw9SOSOs'; // Direct file ID for faster access and fresh data

// Columns in the sheet (0-indexed):
// 0 – Course code   1 – Course Title   2 – Full Course   3 – Subsidy

const googleDriveController = new GoogleDriveController();

function parseMoney(value) {
    if (typeof value === 'number') return value;
    const normalized = String(value ?? '').replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function stripOuterBrackets(value) {
    let text = String(value ?? '').trim();

    // Repeatedly strip one outer wrapper when the whole title is wrapped,
    // e.g. "(Fall Prevention...)" -> "Fall Prevention..."
    while (
        (text.startsWith('(') && text.endsWith(')')) ||
        (text.startsWith('[') && text.endsWith(']')) ||
        (text.startsWith('{') && text.endsWith('}')) ||
        (text.startsWith('（') && text.endsWith('）'))
    ) {
        text = text.slice(1, -1).trim();
    }

    return text;
}

function normalizeTitle(value) {
    return stripOuterBrackets(String(value ?? '').normalize('NFKC'))
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function isEnglishText(value) {
    return /[A-Za-z]/.test(String(value ?? ''));
}

function extractTitleCandidates(rawTitle) {
    const title = String(rawTitle ?? '');
    const candidates = new Set();

    // Add each non-empty line (sheet cells may contain CN line + EN line)
    title.split(/\r?\n/).forEach((line) => {
        const normalizedLine = normalizeTitle(line);
        if (normalizedLine && isEnglishText(normalizedLine)) {
            candidates.add(normalizedLine);
        }
    });

    // Add text inside parentheses, e.g. "(Self-care TCM Wellness – Mandarin)"
    const parenthesisRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = parenthesisRegex.exec(title)) !== null) {
        const normalizedInside = normalizeTitle(match[1]);
        if (normalizedInside && isEnglishText(normalizedInside)) {
            candidates.add(normalizedInside);
        }
    }

    return Array.from(candidates);
}

/**
 * Locate the spreadsheet in Google Drive by name and return its file ID.
 * @returns {Promise<string>}
 */
async function _findCourseCodeFileId() {
    // Use hardcoded file ID directly for instant access and fresh data
    // File: ECSS NSA Courses Details
    // Sheet: ECSS Course Code (SkillsFuture)
    return DRIVE_FILE_ID;
}

/**
 * Internal helper: fetch course data from Google Drive and build a lookup Map keyed by Course Title + Price.
 * @returns {Promise<Map<string, {code: string, fullCourse: number, subsidy: number, price: number, sourceTitle: string}>>}
 */
async function _fetchCourseData() {
    const fileId = await _findCourseCodeFileId();
    const result = await googleDriveController.readSpreadsheet(fileId, DRIVE_SHEET_NAME);

    if (!result.success) {
        throw new Error('[courseCodeMapping] Failed to read course code spreadsheet from Google Drive');
    }

    const map = new Map();
    let previousRow = null;

    for (const row of result.data) {
        const rawCourseCode = String(row[0] || '').trim();
        const rawFullCourse = String(row[2] || '').trim();
        const rawSubsidy = String(row[3] || '').trim();

        let courseCode  = rawCourseCode;
        const courseTitle = String(row[1] || '').trim();
        let fullCourse  = parseMoney(rawFullCourse);
        let subsidy     = parseMoney(rawSubsidy);

        const isContinuationRow =
            !!courseTitle &&
            !courseCode &&
            rawFullCourse === '' &&
            rawSubsidy === '';

        // Continuation rows should inherit from the immediate previous row context,
        // including blank code, to avoid leaking a prior unrelated TGS code.
        if (isContinuationRow && previousRow) {
            courseCode = previousRow.courseCode;
            fullCourse = previousRow.fullCourse;
            subsidy = previousRow.subsidy;
        }

        const price       = fullCourse - subsidy;

        const hasRowData = !!(rawCourseCode || courseTitle || rawFullCourse || rawSubsidy);
        if (hasRowData) {
            previousRow = { courseCode, fullCourse, subsidy };
        }

        if (courseTitle) {
            const normalizedSourceTitle = normalizeTitle(courseTitle);
            const entry = { code: courseCode, fullCourse, subsidy, price, sourceTitle: normalizedSourceTitle };
            const titleCandidates = extractTitleCandidates(courseTitle);
            titleCandidates.forEach((candidate) => {
                // Composite key: normalized title + price (rounded to 2 decimals)
                const priceKey = price.toFixed(2);
                const compositeKey = `${candidate}|${priceKey}`;
                map.set(compositeKey, entry);
            });
        }
    }

    return map;
}

/**
 * Internal helper: get the full course data entry (code + pricing) for a given course name and price.
 * EXACT match required: both normalized course name AND price must match exactly.
 * @param {string} courseName - Full course name to match
 * @param {string|number} coursePrice - Price (float) to match exactly
 * @returns {Promise<{code: string, fullCourse: number, subsidy: number, price: number, sourceTitle: string}|null>}
 */
async function _getCourseData(courseName, coursePrice = null) {
    if (!courseName || coursePrice === null || coursePrice === undefined || coursePrice === '') return null;
    try {
        const map = await _fetchCourseData();
        const normalizedCourseName = normalizeTitle(courseName);
        const expectedPrice = parseMoney(coursePrice);

        if (!Number.isFinite(expectedPrice)) return null;

        // Exact composite key match: normalized name + exact price (2 decimals)
        const priceKey = expectedPrice.toFixed(2);
        const compositeKey = `${normalizedCourseName}|${priceKey}`;
        const exactMatch = map.get(compositeKey);

        console.log(`[courseCodeMapping] _getCourseData for "${courseName}" (normalized: "${normalizedCourseName}") with price ${expectedPrice} => compositeKey: "${compositeKey}", found entry:`, exactMatch);
        return exactMatch || null;
    } catch (err) {
        console.error('[courseCodeMapping] _getCourseData error:', err.message);
        return null;
    }
}

/* const COURSE_CODE_MAPPING = {
    "TCM – Don't be a Friend of Chronic Diseases": "TGS-2021008576",
    "Nagomi Pastel Art Basic Course": "TGS-2022011919",
    "Therapeutic Watercolour Painting for Beginners": "TGS-2022015737",
    "Chinese Calligraphy Intermediate Course": "TGS-2022011921",
    "Chinese Calligraphy Basic Course": "TGS-2022011920",
    "Nagomi Pastel Art Appreciation Course": "TGS-2022011918",
    "Community Ukulele – Mandarin L1": "TGS-2021008564",
    "Community Ukulele – Mandarin": "TGS-2021008564",
    "Community Singing – Mandarin": "TGS-2021008563",
    "Community Singing": "TGS-2021008563",
    "Self-care TCM Wellness – Mandarin": "TGS-2021008561",
    "Fall Prevention and Functional Improvement Training": "TGS-2021008562",
    "Hanyu Pinyin for Beginners": "TGS-2021008571",
    "The Rest Note of Life – Mandarin": "TGS-2022015736",
    "TCM Diet Therapy and Health": "TGS-2021008570",
    "Therapeutic Basic Line Work Course": "TGS-2024047927",
    "Healthy Minds, Healthy Lives – Mandarin": "TGS-2023019018",
    "Healthy Minds, Healthy Lives": "TGS-2023019018",
    "Smartphone Photography": "TGS-2025054493",
    "Art of Positive Communication builds happy homes": "TGS-2025054487",
    "Joyful Grandparenting": "TGS-2025054491",
    "Hanyu Pinyin & The Three Hundred Tang Poems": "TGS-2025054486",
    "Art of Paper Quilling": "TGS-2025054488",
    "Nagomi Basic Level 2": "TGS-2025054494",
    "Enhanced Therapeutic Intermediate Watercolour": "TGS-2025054495",
    "Bonsai Learning (Elementary)": "TGS-2025054490",
    "Community Ukulele Level 2": "TGS-2025054492",
    "Community Cajon Foundation 1": "TGS-2025054489",
    "Hanyu Pinyin For Intermediate – Mandarin": "TGS-2023019015",
    "Hanyu Pinyin For Intermediate": "TGS-2023019015",
    "Basics of Smart Money Management": "TGS-2023038736",
    "Fall Prevention & Functional Improvement Training": "TGS-2021008562"
}; */

/**
 * Get course reference code from course name (async – fetches from Google Drive).
 * @param {string} courseName - The course name
 * @param {string|number} coursePrice - Expected subsidised price (Full Course - Subsidy)
 * @returns {Promise<string>} The TGS course code or empty string if not found
 */
async function getCourseReferenceCode(courseName, coursePrice = null) {
    courseName = courseName.trim();
    if (!courseName) return "";
    try {
        const entry = await _getCourseData(courseName, coursePrice);
        console.log("Course code:", entry);
        return entry?.code || "";
    } catch (err) {
        console.error('[courseCodeMapping] getCourseReferenceCode error:', err.message);
        return "";
    }
}

module.exports = getCourseReferenceCode;
