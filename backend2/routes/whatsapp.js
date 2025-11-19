const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// In-memory message tracking store
const messageTracker = {
  messages: {},
  addMessage: function(id, data) {
    this.messages[id] = {
      ...data,
      createdAt: new Date(),
      status: 'queued',
      updates: []
    };
    console.log('📝 Tracking message:', id);
  },
  updateStatus: function(id, status, details = {}) {
    if (this.messages[id]) {
      this.messages[id].status = status;
      this.messages[id].updates.push({
        timestamp: new Date(),
        status: status,
        details: details
      });
      console.log(`📊 Message ${id} status updated to: ${status}`);
    } else {
      console.warn(`⚠️  Message ${id} not found in tracker`);
    }
  },
  getAll: function() {
    return this.messages;
  },
  getById: function(id) {
    return this.messages[id];
  }
};

// POST /whatsapp - Send WhatsApp message
// Accept optional multipart/form-data file as field name 'file'
router.post('/', async (req, res) => {
  console.log('Received request body:', req.body);

  const { phoneNumber, templateName, templateParams, language } = req.body;

  try {
    // Send message using template
    const result = await whatsappService.sendTemplateMessage(
      phoneNumber,
      templateName,
      templateParams,
      language || 'en'
    );

    //console.log('WhatsApp message sent successfully:', result);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
