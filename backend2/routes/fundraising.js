var express = require('express');
var router = express.Router();
var FundraisingController = require('../Controller/Fundraising/FundraisingController');
var fundRaisingGenerator = require('../Others/Pdf/fundRaisingGenerator');

router.post('/', async function(req, res, next) 
{
    // Initialize controllers once at the top
    const fundraisingController = new FundraisingController();
    const io = req.app.get('io');
    
    try {
        if(req.body.purpose === "insert") {
           //console.log("Fundraising order received:", req.body);
            
            // Save the fundraising order
            const result = await fundraisingController.saveFundraisingOrder(req.body.orderData);
            
            // Emit Socket.IO event to update frontend
            if (io && result.success) {
                console.log("Emitting fundraising insert event to all connected clients");
                io.emit('fundraising', {
                    action: 'insert',
                    data: result.orderData,
                    orderId: result.orderId
                });
            }
            
            return res.json({ 
                result: result
            });
        }
        else if(req.body.purpose === "retrieve") {
            const result = await fundraisingController.getFundraisingOrders();
            console.log("Retrieve result:", result);
            
            return res.json({ 
                result: result
            });
        }
        else if(req.body.purpose === "generateReceipt") {
            // Generate receipt PDF using fundRaisingGenerator
            try {
                // Generate fundraising PDF with the request data
                const fundraisingPdfGenerator = new fundRaisingGenerator();
                const pdfBuffer = await fundraisingPdfGenerator.generateFundraisingReceipt(req.body);
                
                // Convert buffer to base64 for sending to frontend
                const pdfBase64 = pdfBuffer.toString('base64');
                
                console.log("Fundraising receipt PDF generated successfully");
                
                // Create filename with customer name, payment method, and receipt number
                const customerName = req.body.personalInfo 
                    ? `${req.body.personalInfo.firstName || ''}_${req.body.personalInfo.lastName || ''}`.replace(/[^a-zA-Z0-9_]/g, '').trim()
                    : 'customer';
                const paymentMethod = (req.body.paymentMethod || 'payment').replace(/[^a-zA-Z0-9_]/g, '');
                const receiptNumber = (req.body.fundraisingKey || 'receipt').replace(/[^a-zA-Z0-9_]/g, '');
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
                console.error("Error generating fundraising receipt PDF:", pdfError);
                return res.status(500).json({ 
                    result: {
                        success: false,
                        message: "Failed to generate receipt PDF",
                        error: pdfError.message
                    }
                });
            }
        }
        else if(req.body.purpose === "update") {
            // Update using _id and new status
            if (!req.body._id || !req.body.newStatus) {
                return res.status(400).json({ 
                    result: {
                        success: false,
                        message: "_id and newStatus are required for update"
                    }
                });
            }

            // Extract subtotal information from frontend
            const subtotalInfo = req.body.subtotalInfo;
            console.log("Received subtotal information:", subtotalInfo);

            // Get existing order to check if it already has a receipt number
            const existingOrder = await fundraisingController.getFundraisingOrderById(req.body._id);
            let receiptNumber;
            
            if (existingOrder && existingOrder.fundraisingKey && existingOrder.fundraisingKey.trim() !== '') {
                // Use existing receipt number if it exists
                receiptNumber = existingOrder.fundraisingKey;
                console.log("Using existing receipt number:", receiptNumber);
            } else {
                // Generate new receipt number only if none exists
                receiptNumber = await fundraisingController.generateReceiptNumber();
                
                if (!receiptNumber) {
                    return res.status(500).json({ 
                        result: {
                            success: false,
                            message: "Failed to generate receipt number"
                        }
                    });
                }
                console.log("Generated new receipt number:", receiptNumber);
            }

            const updateData = { 
                status: req.body.newStatus,
                fundraisingKey: receiptNumber // Use the receipt number as fundraising key
            };
            const result = await fundraisingController.updateFundraisingOrder(
                req.body._id, 
                updateData
            );
            
            // If update was successful and payment status is "Paid", generate PDF and insert receipt record
            if (result.success) {
                // Only generate PDF if payment status is "Paid"
                if (req.body.newStatus === "Paid") {
                    try {
                        // Insert receipt record into Receipts collection (only if doesn't exist)
                        const receiptResult = await fundraisingController.insertReceiptRecord(
                            result.data._id, 
                            receiptNumber
                        );
                        
                        if (receiptResult.success) {
                            if (receiptResult.alreadyExists) {
                                console.log("Receipt already exists for this order:", receiptResult.receiptNo);
                            } else {
                                console.log("Receipt record inserted successfully:", receiptResult.receiptNo);
                            }
                        } else {
                            console.error("Failed to insert receipt record:", receiptResult.message);
                            // Continue with PDF generation even if receipt insertion fails
                        }

                        // Prepare data for PDF generation including subtotal information
                        const pdfData = {
                            ...result.data,
                            subtotalInfo: subtotalInfo // Pass subtotal information to PDF generator
                        };
                        
                        // Generate fundraising PDF with the updated order data and subtotal info
                        const fundraisingPdfGenerator = new fundRaisingGenerator();
                        const pdfBuffer = await fundraisingPdfGenerator.generateFundraisingReceipt(pdfData);
                        
                        // Convert buffer to base64 for sending to frontend
                        const pdfBase64 = pdfBuffer.toString('base64');
                        
                        console.log("Fundraising PDF generated successfully with subtotal info");
                        
                        // Create filename with customer name, payment method, and receipt number
                        const customerName = result.data.personalInfo 
                            ? `${result.data.personalInfo.firstName || ''}_${result.data.personalInfo.lastName || ''}`.replace(/[^a-zA-Z0-9_]/g, '').trim()
                            : 'customer';
                        const paymentMethod = (result.data.paymentMethod || 'payment').replace(/[^a-zA-Z0-9_]/g, '');
                        const receiptNum = (result.data.fundraisingKey || 'receipt').replace(/[^a-zA-Z0-9_]/g, '');
                        const filename = `${customerName}_${paymentMethod}_${receiptNum}.pdf`;
                        
                        // Add PDF data to the result
                        result.pdfGenerated = true;
                        result.pdfData = pdfBase64;
                        result.pdfFilename = filename;
                        result.receiptInserted = receiptResult.success;
                        result.receiptAlreadyExists = receiptResult.alreadyExists || false;
                        
                    } catch (pdfError) {
                        console.error("Error generating fundraising PDF:", pdfError);
                        // Don't fail the whole request if PDF generation fails
                        result.pdfGenerated = false;
                        result.pdfError = pdfError.message;
                    }
                } else {
                    console.log(`Payment status is "${req.body.newStatus}" - PDF generation skipped (only generated for "Paid" status)`);
                    result.pdfGenerated = false;
                    result.pdfSkipped = true;
                    result.pdfSkipReason = "PDF only generated for Paid status";
                }
            }
            
            // Emit Socket.IO event to update frontend
            if (io && result.success) {
                console.log("Emitting fundraising update event to all connected clients");
                io.emit('fundraising', {
                    action: 'update',
                    data: result.data,
                    orderId: req.body._id,
                    newStatus: req.body.newStatus,
                    pdfGenerated: result.pdfGenerated || false
                });
            }
            
            return res.json({ 
                result: result
            });
        }
    } catch (error) {
        console.error("Fundraising route error:", error);
        return res.status(500).json({ 
            result: {
                success: false,
                message: "Internal server error",
                error: error.message
            }
        });
    }
});

module.exports = router;