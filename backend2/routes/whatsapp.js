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

// Interakt API key
const INTERAKT_API_KEY = `SXFBanViWWpabzNua0R1VmZ2RXNSdlBubmVUV0tWWU1wOHhkVy1DUzg1UTo=`;

// POST /whatsapp - Handle message sending (default) or template sending
router.post('/', async (req, res) => {
  console.log('Received request body:', req.body);
  // Otherwise, treat it as a free-form message sending request (default)
  return sendMessage(req, res);
});

// Helper function to send a message
async function sendMessage(req, res) {
  let { phoneNumber, name, totalPrice } = req.body;

  // Validate required fields
  if (!phoneNumber) {
    return res.status(400).json({ success: false, error: 'phoneNumber is required' });
  }

  phoneNumber = normalizeSingaporePhone(phoneNumber);
  console.log('Normalized phone:', phoneNumber);

  try {
    // Build message with provided values
    let messageText = `Hi ${name || 'there'}! 🎉 Thank you for signing up to volunteer with us at En Community Services Society! Your commitment to serving the community is inspiring. 🌍\n\nStay tuned for more details about your upcoming volunteer opportunities. Together, we can make a real impact! 💪`;

    // Create/track user with attributes
    console.log('Tracking user for:', phoneNumber);
    const contactResponse = await axios.post(
      'https://api.interakt.ai/v1/public/track/users/',
      {
        countryCode: '+65',
        phoneNumber: phoneNumber.replace('+65', ''),
        traits: {
          name: name || 'Customer',
          email: req.body.email || '',
          dob: req.body.dob || '',
          totalPrice: totalPrice || ''
        }
      },
      {
        headers: {
          'Authorization': `Basic ${INTERAKT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('User tracked successfully:', JSON.stringify(contactResponse.data, null, 2));

    const payload = {
      countryCode: '+65',
      phoneNumber: phoneNumber.replace('+65', ''),
      type: 'Text',
      data: {
        message: messageText
      }
    };

    console.log('Sending text message:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      'https://api.interakt.ai/v1/public/message/',
      payload,
      {
        headers: {
          'Authorization': `Basic ${INTERAKT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('WhatsApp message sent successfully:', response.data);
    //res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    if (error.response) {
      console.error('Interakt API error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.error('Error sending WhatsApp message:', error.message);
    }
    console.error('Error sending WhatsApp message:', error.message);
    //res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
}

module.exports = router;
