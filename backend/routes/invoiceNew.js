const express = require('express');
const router = express.Router();
const InvoiceController = require('../Controller/Invoice/InvoiceController');

router.post('/generate-number', async function(req, res) {
    try {
        const controller = new InvoiceController();
        const paymentMethod = req.body.paymentMethod || req.body.payment || '';
        const result = await controller.newInvoiceNo({
            itemCode: req.body.itemCode || req.body.code || req.body.invoiceType || req.body.type,
            location: req.body.location,
            invoiceType: req.body.invoiceType || req.body.type,
            registrationId: req.body.registrationId || req.body.id || req.body.registration_id,
            paymentMethod,
            selectedMonth: req.body.selectedMonth || req.body.month,
            userName: req.body.userName || req.body.username,
            date: req.body.date,
            time: req.body.time
        });

        return res.json({
            success: true,
            invoiceNumber: result?.invoiceNumber || ''
        });
    } catch (error) {
        console.error('Error generating invoice number via new route:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate invoice number',
            error: error.message
        });
    }
});

router.post('/create', async function(req, res) {
    try {
        const controller = new InvoiceController();
        const result = await controller.newInvoice(
            req.body.invoiceNumber,
            req.body.selectedMonth,
            req.body.userName,
            req.body.date,
            req.body.time
        );

        return res.json({
            success: true,
            invoice: result?.invoice || null
        });
    } catch (error) {
        console.error('Error creating invoice via new route:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create invoice',
            error: error.message
        });
    }
});

module.exports = router;
