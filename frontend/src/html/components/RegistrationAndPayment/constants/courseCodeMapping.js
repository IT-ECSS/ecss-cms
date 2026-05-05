/**
 * ECSS Course Code Mapping
 * Dynamically loaded from:
 *   /external/Final Approval for NSA course titles_FY25 (ECSS).xlsx
 *
 * The sheet "ECSS - FY2025" has the structure (row 8 onward, 1-based):
 *   Col A: Course code  (e.g. "ECSS-CBO-M-001C")
 *   Col B: Course Title (Chinese only, bilingual inline, or English-only)
 *
 * English names appear either:
 *   - On the same row inline as "Chinese (English name)"
 *   - On the next row in Col B as "(English name)"
 *   - As a standalone English-only string in Col B
 *
 * The parser builds a map of  normalizedName → { code, canonicalName }
 * Lookup also tries stripping language suffixes (e.g. "– Mandarin L1").
 */

import ExcelJS from 'exceljs';

const EXCEL_PATH   = '/external/Final Approval for NSA course titles_FY25 (ECSS).xlsx';
const SHEET_NAME   = 'ECSS - FY2025';
const DATA_START_ROW = 8; // 1-based row in ExcelJS

// Language suffixes added by the system but absent in the Excel sheet
const LANGUAGE_SUFFIXES = [
  ' – Mandarin L1', ' – Mandarin L2', ' – Mandarin', ' – English', ' – Malay',
  ' - Mandarin L1', ' - Mandarin L2', ' - Mandarin', ' - English', ' - Malay',
];

// Bare single-word language labels that should NOT be treated as course names
const BARE_LANGUAGE_WORDS = new Set(['malay', 'english', 'mandarin', 'chinese']);

/**
 * Aliases for course names stored in the system that differ from the Excel sheet.
 * Key   = normalised system name (after normalizeName)
 * Value = normalised Excel canonical name (after normalizeName)
 * Add new entries here whenever a system name diverges from the Excel sheet.
 */
const SYSTEM_NAME_ALIASES = {
  // System: "Hanyu Pinyin For Intermediate"  →  Excel: "Hanyu Pinyin - Intermediate"
  'hanyu pinyin for intermediate':            'Hanyu Pinyin - Intermediate',
  // System: "Healthy Minds, Healthy Lives"   →  Excel: "C3A AgeMAP - Healthy Minds for Healthy Lives"
  'healthy minds, healthy lives':             'C3A AgeMAP - Healthy Minds for Healthy Lives',
  // System uses "and" instead of "&"
  'fall prevention and functional improvement training': 'Fall Prevention & Functional Improvement Training',
  // TCM course: system uses em-dash, Excel uses hyphen (handled by normalizeName, alias as safety net)
  "tcm - don't be a friend of chronic diseases": 'TCM - Don\'t be a Friend of Chronic Diseases',
};

/** Returns true if the string contains at least one CJK character. */
function hasChinese(str) {
  return /[\u4e00-\u9fa5]/.test(str);
}

/**
 * Extract the English portion from a cell value.
 * Handles:
 *   - Plain English-only strings
 *   - "Chinese (English name)"  — takes from first ( to last )
 *   - "(English name)"          — same
 *   - Fullwidth parens （）       — normalised to ASCII first
 *   - Nested parens like "(Bonsai Learning (Elementary))"
 *   - Double spaces             — collapsed to single space
 */
function extractEnglish(raw) {
  if (!raw) return '';
  const str = raw.toString().trim()
    .replace(/（/g, '(')
    .replace(/）/g, ')');

  const first = str.indexOf('(');
  const last  = str.lastIndexOf(')');

  if (first !== -1 && last > first) {
    const inner = str.slice(first + 1, last).trim();
    if (!hasChinese(inner)) {
      return inner.replace(/\s+/g, ' ');
    }
  }

  // No parens or inner text is Chinese — only return if the whole string is English
  if (!hasChinese(str)) {
    return str.replace(/\s+/g, ' ');
  }

  return '';
}

/**
 * Normalise a course name for map lookup:
 *   - Trim whitespace
 *   - Collapse multiple spaces
 *   - Replace em-dash / en-dash with regular hyphen
 *   - Lowercase for comparison
 */
function normalizeName(name) {
  return name.trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')   // en-dash / em-dash → hyphen
    .replace(/[\u2018\u2019\u201A]/g, "'") // curly single quotes → straight apostrophe
    .replace(/[\u201C\u201D]/g, '"')   // curly double quotes → straight quote
    .toLowerCase();
}

let _cache = null; // map after first load

/**
 * Loads the Excel file and builds the lookup map.
 * Cached after first call — the file is only fetched once per page load.
 * @returns {Promise<Object>}  normalizedName → { code, canonicalName }
 */
export async function loadCourseCodeMap() {
  if (_cache) return _cache;

  const response = await fetch(EXCEL_PATH);
  if (!response.ok) throw new Error(`Failed to fetch course code Excel: ${response.status}`);

  const buffer   = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found in course code Excel`);

  // map: normalizedName → Array<{ code, canonicalName, netPrice }>
  // An array allows multiple course codes to share the same English name
  // (e.g. -002C and -002E both called "Fall Prevention & Functional Improvement Training")
  // and be distinguished later by price.
  const map = {};
  let lastCode     = null;
  let lastNetPrice = null; // Full Course - Subsidy (Col D - Col E)

  const addEntry = (eng, code, netPrice) => {
    const key   = normalizeName(eng);
    const entry = { code, canonicalName: eng, netPrice };
    if (!map[key]) {
      map[key] = [entry];
    } else {
      map[key].push(entry);
    }
  };

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < DATA_START_ROW) return;

    const colA    = row.getCell(1).value?.toString().trim() || '';
    const colB    = row.getCell(2).value?.toString().trim() || '';
    const colDRaw = row.getCell(4).value;
    const colERaw = row.getCell(5).value;
    const colD    = colDRaw !== null && colDRaw !== '' ? Number(colDRaw) : null;
    const colE    = colERaw !== null && colERaw !== '' ? Number(colERaw) : null;

    if (/^ECSS-CBO-M-\d+[A-Z]$/.test(colA)) {
      lastCode = colA;
      if (colD !== null && !isNaN(colD) && colE !== null && !isNaN(colE)) {
        lastNetPrice = Math.round((colD - colE) * 100) / 100; // round to 2dp
      }
      const eng = extractEnglish(colB);
      if (eng && !BARE_LANGUAGE_WORDS.has(eng.toLowerCase())) addEntry(eng, lastCode, lastNetPrice);
    } else if (!colA && lastCode && colB) {
      const eng = extractEnglish(colB);
      if (eng && !BARE_LANGUAGE_WORDS.has(eng.toLowerCase())) addEntry(eng, lastCode, lastNetPrice);
    }
  });

  _cache = map;
  return map;
}

/**
 * From a list of entries for the same name, pick the best match.
 * With price: prefer the entry whose netPrice is within $0.01.
 * Without price (or no price match): return the first entry.
 */
function _pickEntry(entries, price) {
  if (!entries || entries.length === 0) return null;
  if (price !== null) {
    const exact = entries.find(e => e.netPrice !== null && Math.abs(e.netPrice - price) <= 0.01);
    if (exact) return exact;
    // Price was given but nothing matched — do not fall back to wrong entry
    return null;
  }
  return entries[0];
}

/**
 * Internal: look up map entries by English course name, trying language suffix strips,
 * aliases, and "and" → "&" normalisation.
 * When price is supplied, the entry is only returned if the netPrice matches.
 * @param {string}      courseName
 * @param {number|null} [price]  system course price
 */
async function _lookupEntry(courseName, price = null) {
  const map  = await loadCourseCodeMap();
  const norm = normalizeName(courseName || '');
  if (!norm) return null;

  // Build a list of candidate normalised keys to try, in priority order
  const candidates = [norm];

  // Alias: system name → canonical Excel name
  const aliasTarget = SYSTEM_NAME_ALIASES[norm];
  if (aliasTarget) candidates.push(normalizeName(aliasTarget));

  // Normalise "and" → "&" (system sometimes stores the word "and")
  const ampersandVariant = norm.replace(/\band\b/g, '&');
  if (ampersandVariant !== norm) candidates.push(ampersandVariant);

  // Language suffix variants
  for (const suffix of LANGUAGE_SUFFIXES) {
    const normSuffix = normalizeName(suffix);
    if (norm.endsWith(normSuffix)) {
      const base = norm.slice(0, -normSuffix.length).trim();
      candidates.push(base);
      // also alias-check the stripped base
      const aliasBase = SYSTEM_NAME_ALIASES[base];
      if (aliasBase) candidates.push(normalizeName(aliasBase));
      // and "&" variant of the base
      const baseAmp = base.replace(/\band\b/g, '&');
      if (baseAmp !== base) candidates.push(baseAmp);
    }
  }

  // Try each candidate in order
  for (const key of candidates) {
    const found = _pickEntry(map[key], price);
    if (found) return found;
  }

  return null;
}

/**
 * Get the ECSS-CBO-M-* course code matched by English course name AND price.
 * Returns empty string if either the name is not found or the price does not match.
 * @param {string}      courseName
 * @param {number|null} [price]  system course price
 * @returns {Promise<string>}
 */
export async function getEcssCourseCode(courseName, price = null) {
  const entry = await _lookupEntry(courseName, price);
  return entry?.code || '';
}

/**
 * Get the canonical English name matched by course name AND price.
 * Returns null if not found or price does not match.
 * @param {string}      courseName
 * @param {number|null} [price]  system course price
 * @returns {Promise<string|null>}
 */
export async function getEcssCanonicalName(courseName, price = null) {
  const entry = await _lookupEntry(courseName, price);
  return entry?.canonicalName || null;
}

/**
 * Get the net course price (Full Course - Subsidy) from the Excel sheet.
 * Returns null if the course is not found.
 * @param {string} courseName
 * @returns {Promise<number|null>}
 */
export async function getEcssFullCoursePrice(courseName) {
  const entry = await _lookupEntry(courseName);
  return entry?.netPrice ?? null;
}

export default getEcssCourseCode;

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED – Old TGS course code reference (kept for historical reference only)
// Replaced by the dynamic ECSS-CBO-M-* loader above.
// ─────────────────────────────────────────────────────────────────────────────
//
// const OLD_TGS_COURSE_REFERENCE_MAP = {
//   // Self-care TCM Wellness
//   'Self-care TCM Wellness – Mandarin':                          'TGS-2021008561',
//
//   // Fall Prevention & Functional Improvement Training
//   'Fall Prevention and Functional Improvement Training':        'TGS-2021008562',
//   'Fall Prevention & Functional Improvement Training':          'TGS-2021008562',
//
//   // Community Singing
//   'Community Singing':                                          'TGS-2021008563',
//   'Community Singing – Mandarin':                               'TGS-2021008563',
//
//   // Community Ukulele
//   'Community Ukulele – Mandarin':                               'TGS-2021008564',
//   'Community Ukulele – Mandarin L1':                            'TGS-2021008564',
//
//   // Hanyu Pinyin for Beginners
//   'Hanyu Pinyin for Beginners':                                 'TGS-2021008571',
//
//   // TCM Diet Therapy and Health
//   'TCM Diet Therapy and Health':                                'TGS-2021008570',
//
//   // TCM – Don't be a Friend of Chronic Diseases
//   "TCM – Don't be a Friend of Chronic Diseases":               'TGS-2021008576',
//
//   // Nagomi Pastel Art Appreciation Course
//   'Nagomi Pastel Art Appreciation Course':                      'TGS-2022011918',
//
//   // Nagomi Pastel Art Basic Course
//   'Nagomi Pastel Art Basic Course':                             'TGS-2022011919',
//
//   // Chinese Calligraphy Basic Course
//   'Chinese Calligraphy Basic Course':                           'TGS-2022011920',
//
//   // Chinese Calligraphy Intermediate Course
//   'Chinese Calligraphy Intermediate Course':                    'TGS-2022011921',
//
//   // The Rest Note of Life
//   'The Rest Note of Life – Mandarin':                           'TGS-2022015736',
//
//   // Therapeutic Watercolour Painting for Beginners
//   'Therapeutic Watercolour Painting for Beginners':             'TGS-2022015737',
//
//   // Hanyu Pinyin For Intermediate
//   'Hanyu Pinyin For Intermediate':                              'TGS-2023019015',
//   'Hanyu Pinyin For Intermediate – Mandarin':                   'TGS-2023019015',
//
//   // Healthy Minds, Healthy Lives
//   'Healthy Minds, Healthy Lives':                               'TGS-2023019018',
//   'Healthy Minds, Healthy Lives – Mandarin':                    'TGS-2023019018',
//
//   // Basics of Smart Money Management
//   'Basics of Smart Money Management':                           'TGS-2023038736',
//
//   // Therapeutic Basic Line Work Course
//   'Therapeutic Basic Line Work Course':                         'TGS-2024047927',
//
//   // Art of Positive Communication builds happy homes
//   'Art of Positive Communication builds happy homes':           'TGS-2025054487',
//
//   // The Art of Paper Quilling
//   'The Art of Paper Quilling':                                  'TGS-2025054488',
//
//   // Community Cajon Foundation 1
//   'Community Cajon Foundation 1':                               'TGS-2025054489',
//
//   // Bonsai Learning (Elementary)
//   'Bonsai Learning (Elementary)':                               'TGS-2025054490',
//
//   // Joyful Grandparenting
//   'Joyful Grandparenting':                                      'TGS-2025054491',
//
//   // Community Ukulele Level 2
//   'Community Ukulele Level 2':                                  'TGS-2025054492',
//
//   // Smartphone Photography
//   'Smartphone Photography':                                     'TGS-2025054493',
//
//   // Nagomi Basic Level 2
//   'Nagomi Basic Level 2':                                       'TGS-2025054494',
//
//   // Enhanced Therapeutic Intermediate Watercolour
//   'Enhanced Therapeutic Intermediate Watercolour':              'TGS-2025054495',
//
//   // Hanyu Pinyin & The Three Hundred Tang Poems
//   'Hanyu Pinyin & The Three Hundred Tang Poems':                'TGS-2025054486',
// };
//
// function getCourseReferenceCode(courseName) {
//   if (!courseName) return '';
//   return OLD_TGS_COURSE_REFERENCE_MAP[courseName.trim()] || '';
// }

