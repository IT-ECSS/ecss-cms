var express = require('express');
var router = express.Router();
var FundraisingController = require('../Controller/Fundraising/FundraisingController');
var fundRaisingGenerator = require('../Others/Pdf/fundRaisingGenerator');
var CheckoutInvoiceGenerator = require('../Others/Pdf/checkoutInvoiceGenerator');

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
            const items = req.body.orderData.orderDetails.items || [];
            
            console.log("Save result:", result);
            console.log("Order ID from result:", result.orderId);
            
            // Get the correct order ID from the result
            const orderId = result.orderId;
            
            if (!orderId) {
                console.error("No order ID found in save result:", result);
                return res.status(500).json({ 
                    result: {
                        success: false,
                        message: "Failed to get order ID after saving"
                    }
                });
            }
            
            // Generate invoice number (receipt number) using the same logic as fundraising orders
            let invoiceNumber;
            try {
                // Don't pass orderId to avoid automatic receiptNumber update - we only want invoiceNumber for insert
                invoiceNumber = await fundraisingController.generateReceiptNumber(items);
                console.log("Generated invoice number for checkout order:", invoiceNumber);
            } catch (receiptError) {
                console.error("Error generating invoice number:", receiptError);
            }

            // Update Fundraising table with InvoiceNumber
            if (invoiceNumber) {
                try {
                    const updateResult = await fundraisingController.updateFundraisingOrder(
                        orderId, 
                        { invoiceNumber: invoiceNumber }
                    );
                    
                    if (updateResult.success) {
                        console.log("Successfully updated Fundraising order with InvoiceNumber:", invoiceNumber);
                    } else {
                        console.error("Failed to update Fundraising order with InvoiceNumber:", updateResult.message);
                    }
                } catch (updateError) {
                    console.error("Error updating Fundraising order with InvoiceNumber:", updateError);
                }
            }

            // Insert receipt record into Receipts collection
            try {
                const receiptResult = await fundraisingController.insertInvoiceRecord(
                    orderId, 
                    invoiceNumber
                );
                
                console.log("Receipt record insert result:", receiptResult);
                
                if (receiptResult.success) {
                    console.log("Receipt record inserted successfully:", receiptResult.receiptNo);
                } else {
                    console.error("Failed to insert receipt record:", receiptResult.message);
                }
            } catch (receiptInsertError) {
                console.error("Error inserting receipt record:", receiptInsertError);
            }

            // Generate invoice PDF using CheckoutInvoiceGenerator for insert operation
            let invoiceData = null;
            try {
                console.log("Starting invoice generation for checkout order using CheckoutInvoiceGenerator...");
                
                // Generate checkout invoice PDF with the order data
                const checkoutInvoiceGenerator = new CheckoutInvoiceGenerator();
                const invoiceResult = await checkoutInvoiceGenerator.generateCheckoutInvoice(req.body.orderData, invoiceNumber);
                
                // Convert buffer to base64 for sending to frontend
                const pdfBase64 = invoiceResult.buffer.toString('base64');
                
                invoiceData = {
                    pdfData: pdfBase64,
                    filename: invoiceResult.filename,
                    invoiceNumber: invoiceNumber // Use the generated invoice number
                };
                
            } catch (invoiceError) {
                console.error("Error generating invoice using CheckoutInvoiceGenerator:", invoiceError);
                console.error("Invoice error stack:", invoiceError.stack);
                // Don't fail the order if invoice generation fails
            }
            
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
                result: result,
                invoice: invoiceData
            });
        }
        else if(req.body.purpose === "retrieve") {
            let filterData = {};
            console.log("Retrieving fundraising orders with request body:", req.body);
            
            // Handle invoice number filtering from frontend
            if (req.body.invoiceNumber) {
                filterData = { invoiceNumber: req.body.invoiceNumber };
            }
            
            console.log("Filter data:", JSON.stringify(filterData, null, 2));
            
            const result = await fundraisingController.getFundraisingOrders(filterData);
            console.log("Retrieve result:", result);
            
            return res.json({ 
                result: result
            });
        }
        else if(req.body.purpose === "retrieveAll") {
            console.log("Retrieving all fundraising orders");
            
            // Use dedicated method to get all orders
            const result = await fundraisingController.getAllFundraisingOrders();
            console.log("Retrieve all result count:", result.length);
            
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
                const receiptNumber = (req.body.receiptNumber || 'receipt').replace(/[^a-zA-Z0-9_]/g, '');
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
            const newStatus = req.body.newStatus;
            const isPaidStatus = newStatus === "Paid";
            const isPendingStatus = newStatus === "Pending";
            
            console.log("Received subtotal information:", subtotalInfo);

            // Get existing order to check current status
            const existingOrder = await fundraisingController.getFundraisingOrderById(req.body._id);
            console.log("Existing order found:", existingOrder ? "Yes" : "No");
            if (existingOrder) {
                console.log("Existing order status:", existingOrder.status);
                console.log("Existing receiptNumber:", existingOrder.receiptNumber);
            }
            
            let receiptNumber;
            
            // Handle receipt number based on status
            if (isPaidStatus) {
                // Check if the order already has a receipt number
                if (existingOrder && existingOrder.receiptNumber && existingOrder.receiptNumber.trim() !== '') {
                    // Preserve existing receipt number
                    receiptNumber = existingOrder.receiptNumber;
                    console.log("Preserving existing receipt number:", receiptNumber);
                } else {
                    // Generate new receipt number only if none exists
                    receiptNumber = await fundraisingController.getReceiptNumberByRegistrationId(req.body._id);
                    console.log("Generated new receipt number for Paid status:", receiptNumber);
                }
            } else if (isPendingStatus) {
                // Remove receipt number for Pending status
                receiptNumber = null;
                console.log("Status is Pending - receiptNumber will be removed");
            } else {
                // For other statuses (like Cancelled, Refunded), preserve existing receipt number if it exists
                if (existingOrder && existingOrder.receiptNumber && existingOrder.receiptNumber.trim() !== '') {
                    receiptNumber = existingOrder.receiptNumber;
                    console.log("Preserving existing receipt number for status", newStatus + ":", receiptNumber);
                } else {
                    receiptNumber = null;
                }
            }

            const updateData = { 
                status: newStatus
            };

            // Handle receiptNumber field based on status
            if (isPendingStatus) {
                // Remove receiptNumber field for Pending status using $unset
                updateData.$unset = { receiptNumber: "" };
                console.log("Will remove receiptNumber field for Pending status");
            } else if (receiptNumber !== null && receiptNumber !== undefined) {
                // Set receiptNumber for other statuses if it exists
                updateData.receiptNumber = receiptNumber;
                console.log("Will set receiptNumber to:", receiptNumber);
            }
            // If receiptNumber is null/undefined and not Pending status, don't modify receiptNumber field
            
            console.log("Attempting to update order with data:", updateData);
            console.log("Order ID to update:", req.body._id);
            
            const result = await fundraisingController.updateFundraisingOrder(
                req.body._id, 
                updateData
            );
            
            console.log("Update result from controller:", result);
            
            // Generate PDF for "Paid" status updates
            if (result.success && req.body.newStatus === "Paid") {
                try {
                    // Generate PDF with order data and subtotal info
                    const pdfData = { ...result.data, subtotalInfo };
                    const fundraisingPdfGenerator = new fundRaisingGenerator();
                    const pdfBuffer = await fundraisingPdfGenerator.generateFundraisingReceipt(pdfData);
                    
                    // Create filename and add PDF data to result
                    const customerName = result.data.personalInfo 
                        ? `${result.data.personalInfo.firstName || ''}_${result.data.personalInfo.lastName || ''}`.replace(/[^a-zA-Z0-9_]/g, '').trim()
                        : 'customer';
                    const paymentMethod = result.data.paymentDetails.paymentMethod.replace(/[^a-zA-Z0-9_]/g, '');
                    const receiptNum = (result.data.receiptNumber || 'receipt').replace(/[^a-zA-Z0-9_]/g, '');
                    
                    result.pdfGenerated = true;
                    result.pdfData = pdfBuffer.toString('base64');
                    result.pdfFilename = `${customerName}_${paymentMethod}_${receiptNum}.pdf`;
                    
                } catch (pdfError) {
                    console.error("Error generating PDF for Paid status:", pdfError);
                    result.pdfGenerated = false;
                    result.pdfError = pdfError.message;
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
        else if(req.body.purpose === "generateCheckoutInvoice") {
            // Generate checkout invoice PDF using existing invoice number
            try {
                console.log("Generating checkout invoice with existing invoice number:", req.body.invoiceNumber);
                console.log("Order data for invoice generation:", JSON.stringify(req.body.orderData, null, 2));
                
                // Generate checkout invoice PDF with the provided order data and existing invoice number
                const checkoutInvoiceGenerator = new CheckoutInvoiceGenerator();
                const invoiceResult = await checkoutInvoiceGenerator.generateCheckoutInvoice(
                    req.body.orderData, 
                    req.body.invoiceNumber // Use existing invoice number
                );
                
                // Convert buffer to base64 for sending to frontend
                const pdfBase64 = invoiceResult.buffer.toString('base64');
                
                console.log("Checkout invoice PDF regenerated successfully with invoice number:", req.body.invoiceNumber);
                
                // Return success result with PDF data
                return res.json({ 
                    result: {
                        success: true,
                        message: "Checkout invoice generated successfully",
                        pdfGenerated: true,
                        pdfData: pdfBase64,
                        pdfFilename: invoiceResult.filename,
                        invoiceNumber: req.body.invoiceNumber
                    }
                });
                
            } catch (invoiceError) {
                console.error("Error generating checkout invoice:", invoiceError);
                console.error("Invoice error stack:", invoiceError.stack);
                return res.status(500).json({ 
                    result: {
                        success: false,
                        message: "Failed to generate checkout invoice",
                        error: invoiceError.message,
                        pdfGenerated: false
                    }
                });
            }
        }
        else if(req.body.purpose === "updatePaymentMethod") {
            // Update payment method using _id
            if (!req.body._id || !req.body.newPaymentMethod) {
                return res.status(400).json({ 
                    result: {
                        success: false,
                        message: "_id and newPaymentMethod are required for payment method update"
                    }
                });
            }

            console.log("Updating payment method for order:", req.body._id);
            console.log("New payment method:", req.body.newPaymentMethod);

            const updateData = { 
                'paymentDetails.paymentMethod': req.body.newPaymentMethod
            };

            console.log("Attempting to update order payment method with data:", updateData);
            
            const result = await fundraisingController.updateFundraisingOrder(
                req.body._id, 
                updateData
            );
            
            console.log("Payment method update result:", result);
            
            // Emit Socket.IO event to update frontend
            if (io && result.success) {
                console.log("Emitting fundraising payment method update event to all connected clients");
                io.emit('fundraising', {
                    action: 'updatePaymentMethod',
                    data: result.data,
                    orderId: req.body._id,
                    newPaymentMethod: req.body.newPaymentMethod
                });
            }
            
            return res.json({ 
                result: result
            });
        }
        else if(req.body.purpose === "updateCollectionDetails") {
            // Update collection details using _id
            if (!req.body._id || !req.body.collectionDetails) {
                return res.status(400).json({ 
                    result: {
                        success: false,
                        message: "_id and collectionDetails are required for collection details update"
                    }
                });
            }

            console.log("Updating collection details for order:", req.body._id);
            console.log("New collection details:", req.body.collectionDetails);

            const updateData = { 
                collectionDetails: req.body.collectionDetails
            };

            console.log("Attempting to update order collection details with data:", updateData);
            
            const result = await fundraisingController.updateFundraisingOrder(
                req.body._id, 
                updateData
            );
            
            console.log("Collection details update result:", result);
            
            // Emit Socket.IO event to update frontend
            if (io && result.success) {
                console.log("Emitting fundraising collection details update event to all connected clients");
                io.emit('fundraising', {
                    action: 'updateCollectionDetails',
                    data: result.data,
                    orderId: req.body._id,
                    collectionDetails: req.body.collectionDetails
                });
            }
            
            return res.json({ 
                result: result
            });
        }
        else if(req.body.purpose === "updateCollectionLocation") {
            // Update collection location using _id
            if (!req.body._id || !req.body.newCollectionLocation) {
                return res.status(400).json({ 
                    result: {
                        success: false,
                        message: "_id and newCollectionLocation are required for collection location update"
                    }
                });
            }

            console.log("Updating collection location for order:", req.body._id);
            console.log("New collection location:", req.body.newCollectionLocation);

            const updateData = { 
                'collectionDetails.CollectionDeliveryLocation': req.body.newCollectionLocation
            };

            console.log("Attempting to update order collection location with data:", updateData);
            
            const result = await fundraisingController.updateFundraisingOrder(
                req.body._id, 
                updateData
            );
            
            console.log("Collection location update result:", result);
            
            // Emit Socket.IO event to update frontend
            if (io && result.success) {
                console.log("Emitting fundraising collection location update event to all connected clients");
                io.emit('fundraising', {
                    action: 'updateCollectionLocation',
                    data: result.data,
                    orderId: req.body._id,
                    newCollectionLocation: req.body.newCollectionLocation
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