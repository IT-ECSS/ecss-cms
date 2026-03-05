var express = require('express');
var router = express.Router();
var InventoryController = require('../Controller/Inventory/InventoryController'); 
var InventoryGenerator = require('../Others/Pdf/inventoryGenerator');
var GoogleDriveController = require('../Controller/Google/GoogleDriveController');
var multer = require('multer');

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Upload stock adjustment file to Google Drive
router.post('/uploadStockFile', upload.single('file'), async function(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file provided' });
        }

        const googleDriveController = new GoogleDriveController();
        const folderId = '1XRqapiSPspkiA4S8_YTRuY_JyqfVz9nv';
        const filename = req.body.filename || req.file.originalname;

        console.log(`Uploading stock adjustment file: ${filename} to Google Drive folder: ${folderId}`);

        const uploadResult = await googleDriveController.uploadPdfToGoogleDrive(
            req.file.buffer, filename, folderId, req.file.mimetype
        );

        if (uploadResult.success) {
            console.log(`✅ Stock adjustment file uploaded: ${filename}`);
            return res.json({
                success: true,
                message: 'File uploaded to Google Drive',
                fileId: uploadResult.fileId,
                fileLink: uploadResult.fileLink
            });
        } else {
            console.error('❌ Google Drive upload failed:', uploadResult.error);
            return res.status(500).json({ success: false, error: uploadResult.error || 'Upload failed' });
        }
    } catch (error) {
        console.error('Error uploading stock file to Google Drive:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

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

                // determine location string: prefer explicit field, otherwise derive from items
                let location = req.body.location;
                if (!location && Array.isArray(req.body.items) && req.body.items.length > 0) {
                    const locs = [...new Set(req.body.items
                        .map(i => i.location)
                        .filter(l => l && l.toString().trim()))];
                    location = locs.join(',');
                }
                location = (location || 'location').replace(/[^a-zA-Z0-9_]/g, '_').trim();
                const filename = `${customerName}_${location}_${paymentMethod}_${receiptNumber}.pdf`;
                
                // Upload PDF to Google Drive inventory receipts folder
                const googleDriveController = new GoogleDriveController();
                // determine folder by site keyword in location
                let inventoryReceiptsFolderId = '1ZTlyDTXuoMHVo92RUndr_4LFQEhnezoi'; // default shared folder
                const locKey = location.toLowerCase();
                const siteFolderMap = {
                    'ct hub': 'FOLDER_ID_CT_HUB',
                    'tampines north': 'FOLDER_ID_TAMPINES',
                    'pasir ris west': 'FOLDER_ID_PASIR_RIS'
                };
                for (const key in siteFolderMap) {
                    if (locKey.includes(key)) {
                        inventoryReceiptsFolderId = siteFolderMap[key];
                        break;
                    }
                }
                const uploadResult = await googleDriveController.uploadPdfToGoogleDrive(
                    pdfBuffer, filename, inventoryReceiptsFolderId
                );

                if (!uploadResult.success) {
                    console.error("Failed to upload receipt to Google Drive:", uploadResult.error);
                }

                // Return success result with Google Drive link
                return res.json({ 
                    result: {
                        success: true,
                        message: "Receipt generated and uploaded to Google Drive",
                        pdfGenerated: true,
                        pdfFilename: filename,
                        googleDrive: uploadResult.success ? {
                            fileId: uploadResult.fileId,
                            fileLink: uploadResult.fileLink
                        } : null
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
        else if(req.body.purpose === "downloadReceipt") {
            // Generate receipt PDF only (no Google Drive upload) for download
            try {
                const pdfBuffer = await inventoryPdfGenerator.generateInventoryReceipt(req.body);
                const pdfBase64 = pdfBuffer.toString('base64');

                const customerName = (req.body.customerName || 'customer').replace(/[^a-zA-Z0-9_]/g, '_').trim();
                const paymentMethod = (req.body.paymentMethod || 'payment').replace(/[^a-zA-Z0-9_]/g, '');
                const receiptNumber = (req.body.receiptNumber || 'receipt').replace(/[^a-zA-Z0-9_/]/g, '_');
                const location = (req.body.location || 'location').replace(/[^a-zA-Z0-9_]/g, '_').trim();
                const filename = `${customerName}_${location}_${paymentMethod}_${receiptNumber}.pdf`;

                return res.json({ 
                    result: {
                        success: true,
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
            // Prevent browser caching - always fetch fresh data
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            return res.json(result);
        }
        else if(req.body.purpose === "insertStock")
        {
            console.log("Inserting Stock Record:", req.body.payload);
            var controller = new InventoryController();
            var result = await controller.insertStockRecord(req.body.payload);

            if (io && result && result.success) {
                console.log("Emitting stock insert event to all connected clients");
                io.emit('inventory', {
                    action: 'insertStock',
                    data: result.data || {}
                });
            }

            return res.json(result);
        }
        else if(req.body.purpose === "retrieveStock")
        {
            console.log("Retrieving Stock Records");
            var controller = new InventoryController();
            var result = await controller.retrieveStockRecords();
            // Prevent browser caching - always fetch fresh data
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            return res.json(result);
        }
        else if(req.body.purpose === "insertStockAllocation")
        {
            console.log("Inserting Stock Allocation:", req.body.payload);
            var controller = new InventoryController();
            var result = await controller.insertStockAllocation(req.body.payload);

            if (io && result && result.success) {
                console.log("Emitting stock allocation event to all connected clients");
                io.emit('inventory', {
                    action: 'insertStockAllocation',
                    data: result.data || {}
                });
            }

            return res.json(result);
        }
        else if(req.body.purpose === "clearAllStock")
        {
            console.log("Clearing All Stock Records");
            var controller = new InventoryController();
            var result = await controller.clearAllStockRecords();
            return res.json(result);
        }
    } catch (error) {
        console.error("Inventory route error:", error);
        return res.json({ success: false, error: error.message || 'An error occurred' });
    }
});

module.exports = router;
