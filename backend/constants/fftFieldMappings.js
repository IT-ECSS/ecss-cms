/**
 * FFT Field Mappings – Single Source of Truth
 * Maps exact column headers to column letters for Google Sheets
 */

// Exact column headers → Column letters (A-U)
const INTERNAL_KEY_TO_COLUMN_MAP = {
    'Name': 'A',
    'Chinese Name': 'B',
    'Phone Number': 'C',
    'Gender': 'D',
    'DD': 'E',
    'MM': 'F',
    'YYYY': 'G',
    'Age': 'H',
    'Height': 'I',
    'Weight': 'J',
    'BMI': 'K',
    'Date of test': 'L',
    '30 secs Sit & Stand': 'M',
    '30 secs Arm Banding': 'N',
    '2 min On-the-spot Marching': 'O',
    'Sit & Reach': 'P',
    'Back Stretching': 'Q',
    '2.44m Speed Walk': 'R',
    'Grip test': 'S',
    'Improvements': 'T',
    'Remarks': 'U'
};

// Derive column headers in order from the map (A-U)
const COLUMN_HEADERS = Object.entries(INTERNAL_KEY_TO_COLUMN_MAP)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([header]) => header);

module.exports = {
    COLUMN_HEADERS,
    INTERNAL_KEY_TO_COLUMN_MAP
};
