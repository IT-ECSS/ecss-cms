const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// POST /whatsapp - Send WhatsApp message
router.post('/', async (req, res) => {
  console.log('Received request body:', req.body);
  
  const { phoneNumber, name, totalPrice, templateName, templateParams } = req.body;

  // Validate required fields
  if (!phoneNumber) {
    return res.status(400).json({ success: false, error: 'phoneNumber is required' });
  }

  try {
    let result;

    // Check if sending a template message or text message
    if (templateName) {
      // Send template message
      result = await whatsappService.sendTemplateMessage(
        phoneNumber,
        templateName,
        templateParams || []
      );
    } else if (name && totalPrice) {
      // Send order confirmation using default template
      result = await whatsappService.sendOrderConfirmation(
        phoneNumber,
        name,
        totalPrice
      );
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Either provide templateName with templateParams, or name with totalPrice' 
      });
    }

    console.log('WhatsApp message sent successfully:', result);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
