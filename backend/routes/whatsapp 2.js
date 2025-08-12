const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper to normalize Singapore phone numbers to +65XXXXXXXX
function normalizeSingaporePhone(phone) {
  if (!phone.startsWith('+65')) {
    // Remove any leading zeros or country code, then prepend +65
    return '+65' + phone.replace(/^(\+65|65|0)/, '');
  }
  return phone;
}

// Map of required fields for each template/purpose
const requiredFieldsByPurpose = {
  payment: ['name', 'course', 'date', 'location'], // course_reservation_successful_om expects 4 variables
  default: ['name', 'course'],
  // Add more templates here as needed, e.g.:
  // 'reminder': ['name', 'course', 'reminderDate']
};

// POST /api/send-whatsapp-registration
router.post('/', async (req, res) => {
  let { phoneNumber, name, course, template, purpose } = req.body;
  console.log('Received request body:', req.body);
  phoneNumber = normalizeSingaporePhone(phoneNumber);
  console.log('Received data:', { phoneNumber, name, course, template, purpose });

  // Replace with your actual Interakt API key
  const INTERAKT_API_KEY = process.env.INTERAKT_API_KEY || `dHNDOW9jdGtGZVFxc3JTbnVNQ1VPck9wX2tqdERiRnBYY0FMRWlOTWFBQTo=`;

  // Choose template based on purpose if needed
  let templateName = template || 'course_registration_submission';
  let bodyValues = [name, course];

  // Determine required fields for this purpose/template
  const requiredFields = requiredFieldsByPurpose[purpose] || requiredFieldsByPurpose['default'];
  // Build bodyValues in the order of requiredFields
  bodyValues = requiredFields.map(field => req.body[field]);
  // Validation for empty/null values
  if (bodyValues.some(v => v === undefined || v === null || v === '')) {
    return res.status(400).json({ success: false, error: `One or more required fields (${requiredFields.join(', ')}) are missing or empty.` });
  }

  // Optionally, set templateName for known purposes
  if (purpose === 'payment') {
    templateName = template || 'course_reservation_successful_om';
  }

  try {
    const response = await axios.post(
      'https://api.interakt.ai/v1/public/message/',
      {
        countryCode: '+65',
        phoneNumber: phoneNumber.replace('+65', ''), // Interakt expects number without country code
        type: 'Template',
        template: {
          name: templateName,
          languageCode: 'en',
          bodyValues: bodyValues,
        }
      },
      {
        headers: {
          'Authorization': `Basic ${INTERAKT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    if (error.response) {
      console.error('Interakt API error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data
      });
    } else {
      console.error('Error sending WhatsApp message:', error.message);
    }
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

module.exports = router;
