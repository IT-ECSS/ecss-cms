const fs = require('fs');
const csv = require('csv-parser');

// Function to format date from DD/MM/YYYY to DD/MM/YYYY (keep original format)
function formatDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  return dateStr.trim();
}

// Function to extract postal code from address
function extractPostalCode(address) {
  if (!address) return '';
  const match = address.match(/S(\d{6})/);
  return match ? match[1] : '';
}

// Function to clean contact number
function cleanContactNumber(contact) {
  if (!contact) return '';
  return contact.replace(/\D/g, '');
}

// Function to clean email (handle 'NA', 'N/A', 'No' as empty)
function cleanEmail(email) {
  if (!email || email.toLowerCase() === 'na' || email.toLowerCase() === 'n/a' || email.toLowerCase() === 'no') {
    return '';
  }
  return email.trim();
}

// Function to convert to participant format with bilingual values
function convertToParticipantFormat(data, type) {
  // Map values to participant format with Chinese translations
  const residentialStatusMap = {
    'Singaporean': 'SC 新加坡公民',
    'Singapore Citizen': 'SC 新加坡公民',
    'Permanent Resident': 'PR 永久居民',
    'PR': 'PR 永久居民'
  };

  const raceMap = {
    'Chinese': 'Chinese 华',
    'Malay': 'Malay 马来',
    'Indian': 'Indian 印度',
    'Others': 'Others 其他'
  };

  const genderMap = {
    'Male': 'M 男',
    'Female': 'F 女',
    'M': 'M 男',
    'F': 'F 女'
  };

  const educationMap = {
    'No Formal / Primary': 'Primary 小学',
    'Primary': 'Primary 小学',
    'Secondary': 'Secondary 中学',
    'Post-secondary without university': 'Post-Secondary (Junior College/ITE) 专上教育',
    'Post-Secondary (Junior College/ITE)': 'Post-Secondary (Junior College/ITE) 专上教育',
    'Diploma': 'Diploma 文凭',
    'Bachelor\'s Degree': 'Bachelor\'s Degree 学士学位',
    'Post-secondary with university': 'Bachelor\'s Degree 学士学位',
    'Master\'s Degree': 'Master\'s Degree 硕士',
    'Others': 'Others 其它'
  };

  const workStatusMap = {
    'Retired': 'Retired 退休',
    'Employed full-time': 'Employed full-time 全职工作',
    'Part-time': 'Part-time 兼职',
    'Unemployed': 'Unemployed 失业',
    'Self-employed': 'Self-employed 自雇人'
  };

  return {
    particular: {
      name: data.name,
      nric: data.nric.toLowerCase(),
      residentialStatus: residentialStatusMap[data.residentialStatus] || data.residentialStatus || 'SC 新加坡公民',
      race: raceMap[data.race] || data.race || '',
      gender: genderMap[data.gender] || data.gender || '',
      contactNumber: data.contactNumber,
      email: data.email,
      postalCode: data.postalCode,
      educationLevel: educationMap[data.educationLevel] || data.educationLevel || '',
      workStatus: workStatusMap[data.workStatus] || data.workStatus || '',
      dateOfBirth: data.dateOfBirth
    },
    type: type
  };
}

async function processCSVFiles() {
  const combinedData = [];

  // Process Member Profile.csv
  try {
    const memberData = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream('./Member Profile.csv')
        .pipe(csv())
        .on('data', (data) => {
          if (data['Name in Full (English)'] && data['NRIC']) {
            const processedData = {
              name: data['Name in Full (English)'].trim(),
              nric: data['NRIC'].trim(),
              residentialStatus: data['Citizenship'] || 'Singaporean',
              race: data['Race'] || '',
              gender: data['Gender'] || '',
              contactNumber: cleanContactNumber(data['Mobile No']),
              email: cleanEmail(data['Email']),
              postalCode: extractPostalCode(data['Address']),
              educationLevel: data['Education Level'] || '',
              workStatus: data['Working Status'] || '',
              dateOfBirth: formatDate(data['Date of Birth'])
            };
            results.push(convertToParticipantFormat(processedData, 'Member'));
          }
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
    combinedData.push(...memberData);
    console.log(`Processed ${memberData.length} members`);
  } catch (error) {
    console.log('Member Profile.csv not found or error reading it');
  }

  // Process Volunteer Profile.csv
  try {
    const volunteerData = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream('./Volunteer Profile.csv')
        .pipe(csv())
        .on('data', (data) => {
          if (data['Name in Full (According to NRIC)'] && data['NRIC']) {
            const processedData = {
              name: data['Name in Full (According to NRIC)'].trim(),
              nric: data['NRIC'].trim(),
              residentialStatus: data['Nationality'] || 'Singaporean',
              race: data['Race'] || '',
              gender: data['Gender'] || '',
              contactNumber: cleanContactNumber(data['Mobile No']),
              email: cleanEmail(data['Email']),
              postalCode: extractPostalCode(data['Address']),
              educationLevel: data['Education Level'] || '',
              workStatus: data['Employment Status'] || '',
              dateOfBirth: formatDate(data['Date of Birth'])
            };
            results.push(convertToParticipantFormat(processedData, 'Volunteer'));
          }
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
    combinedData.push(...volunteerData);
    console.log(`Processed ${volunteerData.length} volunteers`);
  } catch (error) {
    console.log('Volunteer Profile.csv not found or error reading it');
  }

  // Process unique_participants CSV - keep exact format and values
  try {
    const participantData = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream('./unique_participants_2025-05-30T13-09-01.csv')
        .pipe(csv())
        .on('data', (data) => {
          if (data['name'] && data['nric']) {
            results.push({
              particular: {
                name: data['name'].trim(),
                nric: data['nric'].trim().toLowerCase(),
                residentialStatus: data['residentialStatus'] || '',
                race: data['race'] || '',
                gender: data['gender'] || '',
                contactNumber: cleanContactNumber(data['contactNumber']),
                email: cleanEmail(data['email']),
                postalCode: data['postalCode'] || '',
                educationLevel: data['educationLevel'] || '',
                workStatus: data['workStatus'] || '',
                dateOfBirth: formatDate(data['dateOfBirth'])
              },
              type: 'Participant'
            });
          }
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
    combinedData.push(...participantData);
    console.log(`Processed ${participantData.length} participants`);
  } catch (error) {
    console.log('unique_participants CSV not found or error reading it');
  }

  // Remove duplicates based on NRIC AND phone number (both must be duplicates)
  const uniqueData = [];
  const seenNRICs = new Set();
  const seenPhones = new Set();
  let totalDuplicates = 0;

  for (const person of combinedData) {
    const nric = person.particular.nric;
    const phone = person.particular.contactNumber;
    
    // Check if both NRIC and phone number are already seen
    const isDuplicateNRIC = seenNRICs.has(nric);
    const isDuplicatePhone = phone && seenPhones.has(phone);
    
    // Skip only if BOTH NRIC AND phone are duplicates
    if (isDuplicateNRIC && isDuplicatePhone) {
      totalDuplicates++;
      continue;
    }
    
    // Add to unique data and mark as seen
    seenNRICs.add(nric);
    if (phone) {
      seenPhones.add(phone);
    }
    uniqueData.push(person);
  }

  // Sort by NRIC
  uniqueData.sort((a, b) => a.particular.nric.localeCompare(b.particular.nric));

  // Write to JSON file
  fs.writeFileSync('./combined-profiles.json', JSON.stringify(uniqueData, null, 2));
  
  console.log(`\nSuccessfully processed ${uniqueData.length} unique profiles (sorted by NRIC):`);
  console.log(`- Members: ${uniqueData.filter(p => p.type === 'Member').length}`);
  console.log(`- Volunteers: ${uniqueData.filter(p => p.type === 'Volunteer').length}`);
  console.log(`- Participants: ${uniqueData.filter(p => p.type === 'Participant').length}`);
  console.log(`\nTotal duplicates removed: ${totalDuplicates}`);
  console.log('(Records removed if NRIC AND phone number were both seen)');
  console.log('\nOutput saved to: combined-profiles.json');
}

// Run the processing
processCSVFiles().catch(console.error);