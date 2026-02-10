var express = require('express');
var router = express.Router();
var InventoryController = require('../Controller/Inventory/InventoryController'); 
var InventoryGenerator = require('../Others/Pdf/inventoryGenerator');

router.post('/', async function(req, res, next) 
{
    const inventoryPdfGenerator = new InventoryGenerator();
    const io = req.app.get('io');
    try {     
        if(req.body.purpose === "insert")
        {
            console.log("Insert Inventory Payload:", req.body.payload);
            var controller = new InventoryController();
            var result = await controller.insertInventory(req.body.payload);
            
            // Emit Socket.IO event to update frontend
            if (io && result && result.success) {
                console.log("Emitting inventory insert event to all connected clients");
                io.emit('inventory', {
                    action: 'insert',
                    data: result.data || {},
                    recordId: result.recordId || null
                });
            }
            
            return res.json(result || { success: false, error: 'No result returned' });
        }
        else if(req.body.purpose === "generateReceipt") {
            // Generate receipt PDF using InventoryGenerator
            try {
                // Generate inventory receipt PDF with the request data
                const pdfBuffer = await inventoryPdfGenerator.generateInventoryReceipt(req.body);
                
                // Convert buffer to base64 for sending to frontend
                const pdfBase64 = pdfBuffer.toString('base64');
                
                console.log("Inventory receipt PDF generated successfully");
                
                // Create filename with customer name, payment method, and receipt number
                const customerName = (req.body.customerName || 'customer').replace(/[^a-zA-Z0-9_]/g, '_').trim();
                const paymentMethod = (req.body.paymentMethod || 'payment').replace(/[^a-zA-Z0-9_]/g, '');
                const receiptNumber = (req.body.receiptNumber || 'receipt').replace(/[^a-zA-Z0-9_/]/g, '_');
                const filename = `${customerName}_${paymentMethod}_${receiptNumber}.pdf`;
                
                // Return success result with PDF data
                return res.json({ 
                    result: {
                        success: true,
                        message: "Receipt generated successfully",
                        pdfGenerated: true,
                        pdfData: pdfBase64,
                        pdfFilename: filename
                    }
                });
                
            } catch (pdfError) {
                console.error("Error generating inventory receipt PDF:", pdfError);
                return res.status(500).json({ 
                    result: {
                        success: false,
                        message: "Failed to generate receipt PDF",
                        error: pdfError.message
                    }
                });
            }
        }
        else if(req.body.purpose === "retrieve")
        {
            console.log("Retrieving Inventory Records");
            var controller = new InventoryController();
            var result = await controller.retrieveInventoryRecords();
            return res.json(result);
        }
    } catch (error) {
        console.error("Inventory route error:", error);
        return res.json({ success: false, error: error.message || 'An error occurred' });
    }
});

module.exports = router;
