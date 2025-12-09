var express = require('express');
var router = express.Router();
var FundraisingController = require('../Controller/Fundraising/FundraisingController');
var fundRaisingGenerator = require('../Others/Pdf/fundRaisingGenerator');
var CheckoutInvoiceGenerator = require('../Others/Pdf/checkoutInvoiceGenerator');
var GoogleDriveController = require('../Controller/Google/GoogleDriveController');
var multer = require('multer');
const XLSX = require('xlsx');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/', upload.single('file'), async function(req, res, next) 
{
    const io = req.app.get('io');
    const fundraisingController = new FundraisingController();
    const googleDriveController = new GoogleDriveController();
    const checkoutInvoiceGenerator = new CheckoutInvoiceGenerator();
    const fundraisingPdfGenerator = new fundRaisingGenerator();

    try {
        // Handle Google Drive upload
        // Handle Google Drive upload
        if(req.body.purpose === "upload-to-google-drive") {
            if (!req.file) {
              return res.status(400).json({ 
                success: false, 
                error: 'No file provided' 
              });
            }

            try {
              const filename = req.body.filename;
              const fileType = req.body.fileType || 'receipt'; // Default to receipt for backward compatibility
              
              // Use different folder IDs based on file type
              let folderId;
              if (fileType === 'invoice') {
                folderId = '1eF1phBpOZnKlRy5ARSNkQeawefDpu8Ou'; // Invoice folder
              } else {
                folderId = '11dHfai2ZsHia2J-Ho7w2arW_-dFYMmVW'; // Receipt folder
              }
              
              console.log(`Using fileType: ${fileType} - folderId: ${folderId}`);
              console.log('Using filename for upload:', filename);
              
              // List all files in folder to check for duplicates
              const filesList = await googleDriveController.listFilesInFolder(folderId);
              console.log('Files in folder:', filesList);
              
              if (filesList.success && filesList.files && filesList.files.length > 0) {
                // Check if file with same name already exists
                const duplicateFile = filesList.files.find(f => f.name === filename);
                
                if (duplicateFile) {
                  console.log(`❌ File "${filename}" already exists in the folder - upload rejected`);
                  return res.json({
                    success: false,
                    error: `File "${filename}" already exists in the folder. Upload not allowed.`,
                    fileAlreadyExists: true,
                    existingFileId: duplicateFile.id,
                    existingFileLink: duplicateFile.webViewLink,
                    existingFileName: duplicateFile.name,
                    createdTime: duplicateFile.createdTime
                  });
                }
              }
              
              console.log(`✓ No duplicate found - proceeding with upload of file: "${filename}"`);
              
              // Proceed with upload to Google Drive
              const uploadResult = await googleDriveController.uploadPdfToGoogleDrive(
                req.file.buffer,
                filename,
                folderId
              );
              
              if (uploadResult.success) {
                console.log("✓ File uploaded successfully to Google Drive");
                return res.json({
                  success: true,
                  message: "File uploaded to Google Drive successfully",
                  fileId: uploadResult.fileId,
                  fileName: filename,
                  fileLink: uploadResult.fileLink,
                  uploadedAt: new Date().toISOString()
                });
              } else {
                console.error("❌ Failed to upload file to Google Drive:", uploadResult.error);
                return res.json({
                  success: false,
                  error: `Upload failed: ${uploadResult.error}`
                });
              }
            } catch (error) {
              console.error('Google Drive upload error:', error.message);
              return res.json({
                success: false,
                error: error.message
              });
            }
        }
        else if(req.body.purpose === "insert") {
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

                const pdfBuffer = await fundraisingPdfGenerator.generateFundraisingReceipt(req.body);
                
                // Convert buffer to base64 for sending to frontend
                const pdfBase64 = pdfBuffer.toString('base64');
                
                console.log("Fundraising receipt PDF generated successfully");
                
                // Create filename with customer name, payment method, and receipt number
                const customerName = req.body.personalInfo 
                    ? `${req.body.personalInfo.firstName || ''}_${req.body.personalInfo.lastName || ''}`.replace(/[^a-zA-Z0-9_]/g, '').trim()
                    : 'customer';
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
        else if(req.body.purpose === "generateInvoice") {
            // Generate invoice PDF using CheckoutInvoiceGenerator
            try {
                console.log("Generating invoice with invoice number:", req.body.invoiceNumber);
                console.log("Full request body:", JSON.stringify(req.body, null, 2));
                
                // The frontend data already has the correct structure
                // Just ensure all required nested objects exist with proper null checks
                const invoiceData = {
                    personalInfo: req.body.personalInfo,
                    paymentDetails: req.body.paymentDetails,
                    collectionDetails: {
                        collectionMode: req.body.collectionDetails?.collectionMode,
                        CollectionDeliveryLocation: req.body.collectionDetails?.CollectionDeliveryLocation || '',
                        collectionDate: req.body.collectionDetails?.collectionDate || '',
                        collectionTime: req.body.collectionDetails?.collectionTime || ''
                    },
                    orderDetails: req.body.orderDetails || {
                        items: [],
                        totalPrice: 0,
                        orderDate: new Date().toLocaleDateString('en-GB'),
                        orderTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    }
                };

                console.log("Invoice data for generator:", JSON.stringify(invoiceData, null, 2));

                // Generate checkout invoice PDF with the data and invoice number
                const invoiceResult = await checkoutInvoiceGenerator.generateCheckoutInvoice(invoiceData, req.body.invoiceNumber);
                
                // Convert buffer to base64 for sending to frontend
                const pdfBase64 = invoiceResult.buffer.toString('base64');
                
                console.log("Invoice PDF generated successfully");
                
                // Create filename with invoice number, customer name, and payment method
                const customerName = `${invoiceData.personalInfo.firstName || ''}_${invoiceData.personalInfo.lastName || ''}`.replace(/[^a-zA-Z0-9_]/g, '').trim();
                const paymentMethod = (invoiceData.paymentDetails.paymentMethod || 'payment').replace(/[^a-zA-Z0-9_]/g, '');
                const invoiceNumber = (req.body.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_/]/g, '_');
                const filename = `Invoice_${customerName}_${paymentMethod}_${invoiceNumber}.pdf`;
                
                // Return success result with PDF data
                return res.json({ 
                    result: {
                        success: true,
                        message: "Invoice generated successfully",
                        pdfGenerated: true,
                        pdfData: pdfBase64,
                        pdfFilename: filename
                    }
                });
                
            } catch (pdfError) {
                console.error("Error generating invoice PDF:", pdfError);
                console.error("Error stack:", pdfError.stack);
                return res.status(500).json({ 
                    result: {
                        success: false,
                        message: "Failed to generate invoice PDF",
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
                    const pdfBuffer = await fundraisingPdfGenerator.generateFundraisingReceipt(pdfData);
                    
                    // Create filename and add PDF data to result
                    const customerName = result.data.personalInfo 
                        ? `${result.data.personalInfo.firstName || ''}_${result.data.personalInfo.lastName || ''}`.replace(/[^a-zA-Z0-9_]/g, '').trim()
                        : 'customer';
                    const paymentMethod = result.data.paymentDetails.paymentMethod.replace(/[^a-zA-Z0-9_]/g, '');
                    const receiptNum = (result.data.receiptNumber || 'receipt').replace(/[^a-zA-Z0-9_/]/g, '_');
                    
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
                const invoiceResult = await checkoutInvoiceGenerator.generateCheckoutInvoice(
                    req.body.orderData, 
                    req.body.invoiceNumber // Use existing invoice number
                );
                
                console.log("Invoice result:", invoiceResult);
                // Convert buffer to base64 for sending to frontend
                const pdfBase64 = invoiceResult.buffer.toString('base64');
                
                console.log("Checkout invoice PDF regenerated successfully with invoice number:", invoiceResult.filename);
                
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
        else if(req.body.purpose === "fetch-all-receipts-invoices") {
            try {
                const fundraisingController = new FundraisingController();
                const type = req.body.type || 'both';
                
                console.log(`Fetching all ${type}s as PDFs for Google Drive upload`);
                
                const allRecords = await fundraisingController.getAllFundraisingOrders();
                
                if (!allRecords || allRecords.length === 0) {
                    return res.json({
                        success: true,
                        message: "No records found",
                        files: []
                    });
                }

                console.log(`Total records fetched: ${allRecords.length}`);
                
                const filesToUpload = [];
                let receiptCounter = 0;
                let skippedCounter = 0;
                
                for (const record of allRecords) {
                    const sanitize = (str) => (str || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                    const firstName = sanitize(record.personalInfo?.firstName);
                    const lastName = sanitize(record.personalInfo?.lastName);
                    const paymentMethod = sanitize(record.paymentDetails?.paymentMethod);
                    const paymentStatus = sanitize(record.status);
                    const receiptNumber = sanitize(record.receiptNumber);
                    
                    // Generate receipt if receiptNumber key exists and has value
                    if ((type === 'receipt' || type === 'both') && ((receiptNumber))) {
                        try {
                            receiptCounter++;
                            const receiptPdf = await fundraisingPdfGenerator.generateFundraisingReceipt(record);
                            const filename = `${firstName}_${lastName}_${paymentMethod}_${record.receiptNumber}.pdf`;
                            
                            filesToUpload.push({
                                id: record.id,
                                filename,
                                pdfData: Buffer.from(receiptPdf).toString('base64'),
                                type: 'receipt',
                                recordId: record.id
                            });
                            console.log(`[${receiptCounter}] Receipt generated: ${record.receiptNumber}`);
                        } catch (err) {
                            console.error(`Error generating receipt for record ${record.id}:`, err.message);
                        }
                    } else if (type === 'receipt' || type === 'both') {
                        skippedCounter++;
                        console.log(`[SKIPPED] Record ${record.id} - receiptNumber missing`);
                    }
                    
                    // Generate invoice for all records
                    if (type === 'invoice' || type === 'both') {
                        try {
                            const invoiceResult = await checkoutInvoiceGenerator.generateCheckoutInvoice(record);
                            const invoiceNumber = (record.invoiceNumber || '').toString().trim();
                            const filename = `Invoice_${firstName}_${lastName}_${paymentMethod}_${invoiceNumber}.pdf`;
                            
                            filesToUpload.push({
                                id: record.id,
                                filename,
                                pdfData: invoiceResult.buffer.toString('base64'),
                                type: 'invoice',
                                recordId: record.id
                            });
                        } catch (err) {
                            console.error(`Error generating invoice for record ${record.id}:`, err.message);
                        }
                    }
                }
                
                return res.json({
                    success: true,
                    message: `Generated ${filesToUpload.length} files for upload`,
                    files: filesToUpload,
                    type
                });
                
            } catch (error) {
                console.error("Fetch receipts/invoices error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Error fetching receipts and invoices",
                    error: error.message,
                    files: []
                });
            }
        }
        else if(req.body.purpose === "bulk") {
            try {
                const fileId = '1HNFBNdD04IMx81QOd3Mk11Dfuec9dmVd';
                const sheetName = 'Delivery Details';
                
                // Fetch the Excel file from Google Drive using GoogleDriveController
                console.log('Fetching bulk orders from Google Drive file:', fileId);
                
                // Get the file from Google Drive
                const drive = await googleDriveController.initializeAuth();
                const response = await drive.files.get({
                    fileId: fileId,
                    alt: 'media',
                    supportsAllDrives: true
                }, { responseType: 'stream' });

                // Convert stream to buffer
                const chunks = [];
                await new Promise((resolve, reject) => {
                    response.data.on('data', chunk => chunks.push(chunk));
                    response.data.on('end', resolve);
                    response.data.on('error', reject);
                });
                const buffer = Buffer.concat(chunks);

                // Parse Excel file
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const worksheet = workbook.Sheets[sheetName];
                
                if (!worksheet) {
                    console.error("❌ Sheet not found:", sheetName);
                    console.log("Available sheets:", Object.keys(workbook.Sheets));
                    return res.status(400).json({
                        result: {
                            success: false,
                            message: `Sheet "${sheetName}" not found in workbook`,
                            availableSheets: Object.keys(workbook.Sheets)
                        }
                    });
                }
                
                const data = XLSX.utils.sheet_to_json(worksheet);

                console.log(`✓ Successfully fetched ${data.length} rows from Google Drive`);

                return res.json({
                    result: {
                        success: true,
                        message: "Bulk orders fetched successfully from Google Drive",
                        data: data,
                        count: data.length
                    }
                });

            } catch (bulkOrderError) {
                console.error("Bulk order route error:", bulkOrderError);
                console.error("Error details:", bulkOrderError.message);
                return res.status(500).json({
                    result: {
                        success: false,
                        message: "Failed to fetch delivery details from Excel file",
                        error: bulkOrderError.message
                    }
                });
            }
        }
        else if(req.body.purpose === "bulkDownloadReceipts") 
        {
            console.log("Bulk download receipts request received");
            try {
                const receiptsData = req.body.receipts;
                
                if (!receiptsData || !Array.isArray(receiptsData) || receiptsData.length === 0) {
                    return res.status(400).json({
                        result: {
                            success: false,
                            message: "No receipts data provided"
                        }
                    });
                }

                console.log(`Processing ${receiptsData.length} receipts for bulk download`);

                // Generate receipts for each order and zip them
                const JSZip = require('jszip');
                const zip = new JSZip();

                // Generate receipt PDFs for each receipt data
                for (const receiptData of receiptsData) {
                    try {
                        const receiptNumber = receiptData.receiptNumber;
                        if (!receiptNumber) {
                            console.warn('Skipping receipt without receipt number');
                            continue;
                        }

                        // Generate receipt PDF using the fundraising PDF generator with enriched data
                        const pdfBuffer = await fundraisingPdfGenerator.generateFundraisingReceipt(receiptData);
                        
                        // Create filename using backend's standard format from generateFundraisingReceipt
                        // This will include all details like name, payment method, etc.
                        const firstName = receiptData.personalInfo?.firstName || receiptData.firstName || '';
                        const lastName = receiptData.personalInfo?.lastName || receiptData.lastName || '';
                        const paymentMethod = receiptData.paymentDetails?.paymentMethod || receiptData.paymentMethod || 'Cash';
                        
                        // Format: FirstName_LastName_PaymentMethod_ReceiptNumber.pdf (replacing slashes with underscores)
                        const receiptNumberFormatted = receiptNumber.replace(/\//g, '_');
                        const personName = `${firstName}_${lastName}`.replace(/\s+/g, '');
                        const paymentMethodFormatted = paymentMethod.replace(/\s+/g, '');
                        const filename = `${personName}_${paymentMethodFormatted}_${receiptNumberFormatted}.pdf`;
                        
                        zip.file(filename, pdfBuffer);
                        
                        console.log(`Added ${filename} to zip`);
                    } catch (receiptError) {
                        console.error(`Error generating receipt for ${receiptData.receiptNumber}:`, receiptError);
                    }
                }

                // Generate zip file
                const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

                // Set response headers for zip file download
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="receipts-${new Date().toISOString().split('T')[0]}.zip"`);
                
                return res.send(zipBuffer);

            } catch (bulkReceiptError) {
                console.error("Bulk download receipts error:", bulkReceiptError);
                return res.status(500).json({
                    result: {
                        success: false,
                        message: "Failed to generate receipts zip",
                        error: bulkReceiptError.message
                    }
                });
            }
        }
        else if(req.body.purpose === "bulkDownloadInvoices") 
        {
            console.log("Bulk download invoices request received");
            try {
                const invoicesData = req.body.invoices;
                
                if (!invoicesData || !Array.isArray(invoicesData) || invoicesData.length === 0) {
                    return res.status(400).json({
                        result: {
                            success: false,
                            message: "No invoices data provided"
                        }
                    });
                }

                console.log(`Processing ${invoicesData.length} invoices for bulk download`);

                // Generate invoices for each order and zip them
                const JSZip = require('jszip');
                const zip = new JSZip();

                // Generate invoice PDFs for each invoice data
                for (const invoiceData of invoicesData) {
                    try {
                        const invoiceNumber = invoiceData.invoiceNumber;
                        if (!invoiceNumber) {
                            console.warn('Skipping invoice without invoice number');
                            continue;
                        }

                        // The data already has the correct structure from the frontend
                        // Ensure all required nested objects exist with proper null checks
                        const structuredInvoiceData = {
                            personalInfo: invoiceData.personalInfo || {},
                            paymentDetails: invoiceData.paymentDetails || { paymentMethod: 'Cash' },
                            collectionDetails: {
                                collectionMode: invoiceData.collectionDetails?.collectionMode || 'Self-Collection',
                                CollectionDeliveryLocation: invoiceData.collectionDetails?.CollectionDeliveryLocation || '',
                                collectionDate: invoiceData.collectionDetails?.collectionDate || '',
                                collectionTime: invoiceData.collectionDetails?.collectionTime || ''
                            },
                            orderDetails: invoiceData.orderDetails || {
                                items: invoiceData.items || [],
                                totalPrice: invoiceData.totalPrice || invoiceData.donationAmount || 0,
                                orderDate: new Date().toLocaleDateString('en-GB'),
                                orderTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            }
                        };

                        console.log(`Processing invoice ${invoiceNumber}:`, JSON.stringify(structuredInvoiceData, null, 2));

                        // Generate invoice PDF using the checkout invoice generator
                        const invoiceResult = await checkoutInvoiceGenerator.generateCheckoutInvoice(structuredInvoiceData, invoiceNumber);
                        const pdfBuffer = invoiceResult.buffer;
                        
                        // Create filename using backend's standard format
                        const firstName = structuredInvoiceData.personalInfo.firstName || '';
                        const lastName = structuredInvoiceData.personalInfo.lastName || '';
                        const paymentMethod = structuredInvoiceData.paymentDetails.paymentMethod || 'Cash';
                        
                        // Format: Invoice_FirstName_LastName_PaymentMethod_InvoiceNumber.pdf (replacing slashes with underscores)
                        const invoiceNumberFormatted = invoiceNumber.replace(/\//g, '_');
                        const personName = `${firstName}_${lastName}`.replace(/\s+/g, '');
                        const paymentMethodFormatted = paymentMethod.replace(/\s+/g, '');
                        const filename = `Invoice_${personName}_${paymentMethodFormatted}_${invoiceNumberFormatted}.pdf`;
                        
                        zip.file(filename, pdfBuffer);
                        
                        console.log(`Added ${filename} to zip`);
                    } catch (invoiceError) {
                        console.error(`Error generating invoice for ${invoiceData.invoiceNumber}:`, invoiceError);
                    }
                }

                // Generate zip file
                const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

                // Set response headers for zip file download
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="Invoice_${new Date().toISOString().split('T')[0]}.zip"`);
                
                return res.send(zipBuffer);

            } catch (bulkInvoiceError) {
                console.error("Bulk download invoices error:", bulkInvoiceError);
                return res.status(500).json({
                    result: {
                        success: false,
                        message: "Failed to generate invoices zip",
                        error: bulkInvoiceError.message
                    }
                });
            }
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