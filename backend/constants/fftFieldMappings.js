/**
 * FFT Field Mappings – Single Source of Truth
 * Maps exact column headers to column letters for Google Sheets
 */

// Exact column headers → Column letters (A-Z)
const INTERNAL_KEY_TO_COLUMN_MAP = {
    'S/N': 'A',
    'Name': 'B',
    'Chinese Name': 'C',
    'Phone Number': 'D',
    'Gender': 'E',
    'DD': 'F',
    'MM': 'G',
    'YYYY': 'H',
    'Start Time': 'I',
    'End Time': 'J',
    'Age': 'K',
    'Height': 'L',
    'Weight': 'M',
    'BMI': 'N',
    'Date of test': 'O',
    'Health Declaration': 'P',
    'Indemnity': 'Q',
    '30 secs Sit & Stand': 'R',
    '30 secs Arm Banding': 'S',
    '2 min On-the-spot Marching': 'T',
    'Sit & Reach': 'U',
    'Back Stretching': 'V',
    '2.44m Speed Walk': 'W',
    'Grip test': 'X',
    'Improvements': 'Y',
    'Remarks': 'Z'
};

// Derive column headers in order from the map (A-U)
const COLUMN_HEADERS = Object.entries(INTERNAL_KEY_TO_COLUMN_MAP)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([header]) => header);

module.exports = {
    COLUMN_HEADERS,
    INTERNAL_KEY_TO_COLUMN_MAP
};
