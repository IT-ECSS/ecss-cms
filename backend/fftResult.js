const fs = require('fs');

// Parse CSV into structured objects
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  let headerLine = lines[0];
  let dataStartIndex = 1;

  const headers = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.replace(/\n/g, ' ').trim());
      current = '';
    } else {
      current += char;
    }
  }
  headers.push(current.replace(/\n/g, ' ').trim());

  while (inQuotes && dataStartIndex < lines.length) {
    headerLine += '\n' + lines[dataStartIndex];
    dataStartIndex++;

    headers.length = 0;
    current = '';
    inQuotes = false;

    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        headers.push(current.replace(/\n/g, ' ').trim());
        current = '';
      } else {
        current += char;
      }
    }
    headers.push(current.replace(/\n/g, ' ').trim());
  }

  return lines.slice(dataStartIndex).map(line => {
    if (!line.trim()) return null;

    const values = [];
    current = '';
    inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  }).filter(row => row['Phone Number'] && row['D'] && row['M'] && row['Y']);
}

// Normalize phone number (remove non-digits, keep last 8 digits)
const normalizePhone = (phone) => phone.replace(/\D/g, '').slice(-8);

// Normalize DOB to YYYY-MM-DD
const normalizeDOB = (d, m, y) => {
  const pad = (val) => val.toString().padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
};

// Create match key using normalized DOB and phone
const makeMatchKey = (entry) => {
  const dob = normalizeDOB(entry['D'], entry['M'], entry['Y']);
  const phone = normalizePhone(entry['Phone Number']);
  return `${dob}_${phone}`;
};

// Load both CSV files
const data2024 = parseCSV('Sept 2024 FFT Results (CTHub).csv');
const data2025 = parseCSV('15 Aug 2025 CTHub FFT Results .csv');

// Build map from 2024
const map = {};
data2024.forEach((entry) => {
  const key = makeMatchKey(entry);
  map[key] = {
    name: entry['Name'],
    phone_number: entry['Phone Number'],
    gender: entry['Gender'] === 'F' ? 'female' : entry['Gender'] === 'M' ? 'male' : entry['Gender'],
    dob: normalizeDOB(entry['D'], entry['M'], entry['Y']),
    location: 'CT Hub',
    '2024': {
      height: entry['Height'],
      weight: entry['Weight'],
      bmi: entry['BMI'],
      grip: entry['握力测试 (Grip Test)'] || entry['握力测试'],
      march: entry['两分钟抬膝测验 (2 min March)'] || entry['两分钟抬膝测验'],
      arm_curl: entry['30秒手臂卷起 (30 secs Arm Curl)'] || entry['30秒手臂卷起'],
      sit_reach: entry['坐姿体前弯 (Seat & Reach)'] || entry['坐姿体前弯'],
      back_stretch: entry['抓背测验 (Back Stretch)'] || entry['抓背测验'],
      speed_walk: entry['2.44起身绕物测试 (2.44m speed walk)'] || entry['2.44起身绕物测试'],
      squat: entry['30秒坐站测验  (30 secs squat)'] || entry['30秒坐站测验']
    }
  };
});

// Match and merge 2025 data
data2025.forEach((entry) => {
  const key = makeMatchKey(entry);
  if (!map[key]) {
    map[key] = {
      name: entry['Name'],
      phone_number: entry['Phone Number'],
      gender: entry['Gender'] === 'F' || entry['Gender'] === 'female' ? 'female' : entry['Gender'] === 'M' || entry['Gender'] === 'male' ? 'male' : entry['Gender'],
      dob: normalizeDOB(entry['D'], entry['M'], entry['Y']),
      location: 'CT Hub'
    };
  }

  map[key]['2025'] = {
    height: entry['Height'],
    weight: entry['Weight'],
    bmi: entry['BMI'],
    grip: entry['握力测试 (Grip Test)'] || entry['握力测试'],
    march: entry['两分钟抬膝测验 (2 min March)'] || entry['两分钟抬膝测验'],
    arm_curl: entry['30秒手臂卷起 (30 secs Arm Curl)'] || entry['30秒手臂卷起'],
    sit_reach: entry['坐姿体前弯 (Seat & Reach)'] || entry['坐姿体前弯'],
    back_stretch: entry['抓背测验 (Back Stretch)'] || entry['抓背测验'],
    speed_walk: entry['2.44起身绕物测试 (2.44m speed walk)'] || entry['2.44起身绕物测试'],
    squat: entry['30秒坐站测验  (30 secs squat)'] || entry['30秒坐站测验']
  };
});

// Output to JSON
const finalJson = Object.values(map);
fs.writeFileSync('fft_combined_cthub.json', JSON.stringify(finalJson, null, 2));
console.log(`✅ Combined JSON saved with ${finalJson.length} entries`);
