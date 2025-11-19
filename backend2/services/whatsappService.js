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
          totalPrice: traits.totalPrice || '',
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
 * Send a text message via WhatsApp using Interakt API
 * @param {string} phoneNumber - Customer's phone number (will be normalized)
 * @param {string} message - The text message to send
 * @returns {object} Response from Interakt API
 */
async function sendTextMessage(phoneNumber, message) {
  try {
    const normalizedPhone = normalizeSingaporePhone(phoneNumber);
    
    if (!normalizedPhone) {
      throw new Error('Invalid phone number provided');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    console.log('Sending text message to:', normalizedPhone);

    const payload = {
      countryCode: '+65',
      phoneNumber: normalizedPhone.replace('+65', ''),
      type: 'Text',
      data: {
        message: message
      }
    };

    console.log('Message payload:', JSON.stringify(payload, null, 2));

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

    console.log('WhatsApp text message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending text message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a template message via WhatsApp using Interakt API
 * @param {string} phoneNumber - Customer's phone number (will be normalized)
 * @param {string} templateName - Name of the approved WhatsApp template
 * @param {array} params - Template parameters (e.g., [customerName, totalPrice])
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

    const payload = {
      countryCode: '+65',
      phoneNumber: normalizedPhone.replace('+65', ''),
      type: 'Template',
      template: {
        name: trimmedTemplateName,
        languageCode: language || 'en',
        bodyValues: Array.isArray(params) ? params.map(p => String(p).trim()) : []
      }
    };

    console.log('Template payload:', JSON.stringify(payload, null, 2));

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
    return response.data;
  } catch (error) {
    console.error('Error sending template message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send an order confirmation message via WhatsApp using the approved template
 * @param {string} phoneNumber - Customer's phone number
 * @param {string} customerName - Customer name (for template variable {{1}})
 * @param {string} totalPrice - Total price (for template variable {{2}})
 * @param {string} invoiceNumber - Invoice number (for template variable {{3}})
 * @param {string} language - Language code (optional, defaults to 'en')
 * @param {object} additionalTraits - Additional user attributes to track
 * @returns {object} Response from API
 */
async function sendOrderConfirmation(phoneNumber, customerName, totalPrice, invoiceNumber = null, language = 'en', additionalTraits = {}) {
  try {
    // Track user first
    await trackUser(phoneNumber, {
      name: customerName,
      totalPrice: totalPrice,
      invoiceNumber: invoiceNumber,
      language: language,
      ...additionalTraits
    });

    // Send template message with parameters matching the template body:
    // Hi {{1}},
    // Your order confirmation:
    // Total: {{2}}
    // Invoice: {{3}}
    // Order placed successfully.
    const response = await sendTemplateMessage(phoneNumber, 'order_submission', [
      customerName, 
      totalPrice, 
      invoiceNumber || 'Pending'
    ], language);
    
    return {
      success: true,
      message: 'Order confirmation sent successfully',
      invoiceNumber: invoiceNumber,
      language: language,
      data: response
    };
  } catch (error) {
    console.error('Error sending order confirmation:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send a volunteer signup message
 * @param {string} phoneNumber - Volunteer's phone number
 * @param {string} name - Volunteer name
 * @param {object} additionalTraits - Additional user attributes
 * @returns {object} Response from API
 */
async function sendVolunteerSignupMessage(phoneNumber, name, additionalTraits = {}) {
  try {
    const normalizedPhone = normalizeSingaporePhone(phoneNumber);
    
    if (!normalizedPhone) {
      throw new Error('Invalid phone number provided');
    }

    // Track user
    await trackUser(phoneNumber, {
      name: name,
      ...additionalTraits
    });

    // Send welcome message
    const messageText = `Hi ${name || 'there'}! 🎉 Thank you for signing up to volunteer with us at En Community Services Society! Your commitment to serving the community is inspiring. 🌍\n\nStay tuned for more details about your upcoming volunteer opportunities. Together, we can make a real impact! 💪`;

    const response = await sendTextMessage(phoneNumber, messageText);
    
    return {
      success: true,
      message: 'Volunteer signup message sent successfully',
      data: response
    };
  } catch (error) {
    console.error('Error sending volunteer signup message:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  normalizeSingaporePhone,
  trackUser,
  sendTextMessage,
  sendTemplateMessage,
  sendOrderConfirmation,
  sendVolunteerSignupMessage
};
