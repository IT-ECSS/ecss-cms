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
    '30 secs Sit & Stand': 'O',
    '30 secs Arm Banding': 'P',
    '2 min On-the-spot Marching': 'Q',
    'Sit & Reach': 'R',
    'Back Stretching': 'S',
    '2.44m Speed Walk': 'T',
    'Grip test': 'U',
    'Improvements': 'V',
    'Remarks': 'W'
};

// Derive column headers in order from the map (A-U)
const COLUMN_HEADERS = Object.entries(INTERNAL_KEY_TO_COLUMN_MAP)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([header]) => header);

module.exports = {
    COLUMN_HEADERS,
    INTERNAL_KEY_TO_COLUMN_MAP
};
