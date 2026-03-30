/**
 * FFT Field Mappings – Single Source of Truth
 * Maps exact column headers to column letters for Google Sheets
 */

// Exact column headers → Column letters (A-W)
const INTERNAL_KEY_TO_COLUMN_MAP = {
    'Name': 'A',
    'Chinese Name': 'B',
    'Phone Number': 'C',
    'Gender': 'D',
    'DD': 'E',
    'MM': 'F',
    'YYYY': 'G',
    'Start Time': 'H',
    'End Time': 'I',
    'Age': 'J',
    'Height': 'K',
    'Weight': 'L',
    'BMI': 'M',
    'Date of test': 'N',
    'Health Declaration': 'O',
    'Indemnity': 'P',
    '30 secs Sit & Stand': 'Q',
    '30 secs Arm Banding': 'R',
    '2 min On-the-spot Marching': 'S',
    'Sit & Reach': 'T',
    'Back Stretching': 'U',
    '2.44m Speed Walk': 'V',
    'Grip test': 'W',
    'Improvements': 'X',
    'Remarks': 'Y'
};

// Derive column headers in order from the map (A-U)
const COLUMN_HEADERS = Object.entries(INTERNAL_KEY_TO_COLUMN_MAP)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([header]) => header);

module.exports = {
    COLUMN_HEADERS,
    INTERNAL_KEY_TO_COLUMN_MAP
};
