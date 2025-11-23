const axios = require('axios');

// Interakt API configuration
const INTERAKT_API_KEY =  `SXFBanViWWpabzNua0R1VmZ2RXNSdlBubmVUV0tWWU1wOHhkVy1DUzg1UTo=`;
const INTERAKT_BASE_URL = 'https://api.interakt.ai/v1/public';

// Validate that Interakt API key is configured
if (!INTERAKT_API_KEY) {
  console.warn('Warning: Interakt API key is not configured. Please set INTERAKT_API_KEY environment variable.');
  console.warn('Local Setup: Create .env file in backend2/ directory');
  console.warn('Production: Add INTERAKT_API_KEY to GitHub repository secrets');
}

/**
 * Normalize Singapore phone numbers to +65XXXXXXXX format
 * @param {string} phone - Phone number in various formats
 * @returns {string} Normalized phone number with +65 prefix
 */
function normalizeSingaporePhone(phone) {
  if (!phone) return null;
  
  if (phone.startsWith('+65')) {
    return phone;
  }
  
  // Remove any leading zeros or country code, then prepend +65
  const cleaned = phone.replace(/^(\+65|65|0)/, '');
  return '+65' + cleaned;
}

/**
 * Track/create a user in Interakt with their details
 * @param {string} phoneNumber - Customer's phone number (will be normalized)
 * @param {object} traits - User attributes (name, email, dob, totalPrice, etc.)
 * @returns {object} Response from Interakt API
 */
async function trackUser(phoneNumber, traits = {}) {
  try {
    const normalizedPhone = normalizeSingaporePhone(phoneNumber);
    
    if (!normalizedPhone) {
      throw new Error('Invalid phone number provided');
    }

    console.log('Tracking user for:', normalizedPhone);

    const response = await axios.post(
      `${INTERAKT_BASE_URL}/track/users/`,
      {
        countryCode: '+65',
        phoneNumber: normalizedPhone.replace('+65', ''),
        traits: {
          name: traits.name || 'Customer',
          email: traits.email || '',
          dob: traits.dob || '',
          totalPrice: traits.totalPrice ? `$${traits.totalPrice}` : '',
          ...traits // Spread any additional traits
        }
      },
      {
        headers: {
          'Authorization': `Basic ${INTERAKT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('User tracked successfully:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error tracking user:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a template message via WhatsApp using Interakt API
 * @param {string} phoneNumber - Customer's phone number (will be normalized)
 * @param {string} templateName - Name of the approved WhatsApp template
 * @param {array} params - Template parameters (e.g., [customerName, invoiceNumber, totalPrice, locationPhone])
 * @param {string} language - Language code (optional, defaults to 'en')
 * @returns {object} Response from Interakt API
 */
async function sendTemplateMessage(phoneNumber, templateName, params = [], language = 'en') {
  try {
    const normalizedPhone = normalizeSingaporePhone(phoneNumber);
    
    if (!normalizedPhone) {
      throw new Error('Invalid phone number provided');
    }

    if (!templateName || String(templateName).trim().length === 0) {
      throw new Error('Template name is required');
    }

    const trimmedTemplateName = String(templateName).trim();
    console.log('Sending template message to:', normalizedPhone);
    console.log('Template:', trimmedTemplateName, 'Params:', params, 'Language:', language);

    // Build parameter array
    const paramsArray = Array.isArray(params) ? params.map((p, index) => {
      // Add "$" to the 2nd parameter (totalPrice) only if it doesn't already have it
      if (index === 1) {
        const paramStr = String(p).trim();
        return paramStr.startsWith('$') ? paramStr : `$${paramStr}`;
      }
      return String(p).trim();
    }) : []
    console.log('Parameters array:', paramsArray);
    console.log('Parameters count:', paramsArray.length);

    // Validate we have parameters
    if (paramsArray.length === 0) {
      throw new Error('No template parameters provided.');
    }

    // Interakt API template payload - bodyValues should be array of strings, not objects
    const payload = {
      countryCode: '+65',
      phoneNumber: normalizedPhone.replace('+65', ''),
      type: 'Template',
      template: {
        name: trimmedTemplateName,
        languageCode: 'en',
        bodyValues: paramsArray
      }
    };

    console.log('Template payload:', JSON.stringify(payload, null, 2));
    console.log('Sending to Interakt API...');

    const response = await axios.post(
      `${INTERAKT_BASE_URL}/message/`,
      payload,
      {
        headers: {
          'Authorization': `Basic ${INTERAKT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('WhatsApp template message sent successfully:', response.data);
    
    // Log important details for debugging
    console.log('Message Details:');
    console.log('  - Phone:', normalizedPhone);
    console.log('  - Template:', trimmedTemplateName);
    console.log('  - Parameters:', paramsArray);
    
    return response.data;
  } catch (error) {
    console.error('Error sending template message:', error.response?.data || error.message);
    console.error('Full error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

module.exports = {
  normalizeSingaporePhone,
  trackUser,
  sendTemplateMessage
};
