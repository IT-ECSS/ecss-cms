const DatabaseConnectivity = require('../../database/databaseConnectivity');
const { ObjectId } = require('mongodb');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

class FundraisingController {
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity();
    }

    async saveFundraisingOrder(orderData) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fundraising";

                // Use the orderData as-is since frontend already structures it properly
                // Just add the status field at root level for tracking
                const orderDocument = {
                    ...orderData,
                    status: 'Pending' // Default status for order tracking
                };

                // Insert the fundraising order
                const database = this.databaseConnectivity.client.db(databaseName);
                const collection = database.collection(collectionName);
                const insertResult = await collection.insertOne(orderDocument);

                if (insertResult.acknowledged) {
                    console.log("Fundraising order saved:", insertResult.insertedId);

                    return {
                        success: true,
                        message: "Fundraising order saved successfully",
                        orderId: insertResult.insertedId,
                        orderData: orderDocument
                    };
                } else {
                    return {
                        success: false,
                        message: "Failed to save fundraising order"
                    };
                }
            } else {
                return {
                    success: false,
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Save fundraising order error:", error);
            return {
                success: false,
                message: "Error saving fundraising order",
                error: error.message
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    async getFundraisingOrders(filterData) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fundraising";

                const database = this.databaseConnectivity.client.db(databaseName);
                const collection = database.collection(collectionName);
                
                console.log('MongoDB Query Filter:', JSON.stringify(filterData, null, 2));
                
                // Find fundraising orders based on filter (if any)
                const orders = await collection.find(filterData).toArray();
                
                console.log(`MongoDB Query Result: Found ${orders.length} orders`);
                
                // Log the specific orders found for debugging
                if (orders.length > 0) {
                    orders.forEach((order, index) => {
                        console.log(`Order ${index + 1}:`, {
                            _id: order._id,
                            invoiceNumber: order.invoiceNumber,
                            receiptNumber: order.receiptNumber,
                            status: order.status
                        });
                    });
                } else {
                    console.log('No orders found matching the filter criteria');
                }

                // Return only the matching orders (should be specific based on filter)
                return orders;
            } else {
                console.error("Database connection failed");
                return [];
            }
        } catch (error) {
            console.error("Get fundraising orders error:", error);
            return [];
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    async getAllFundraisingOrders() {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fundraising";

                const database = this.databaseConnectivity.client.db(databaseName);
                const collection = database.collection(collectionName);
                
                console.log('Retrieving all fundraising orders without filter');
                
                // Find all fundraising orders without any filter
                const orders = await collection.find({}).toArray();
                
                console.log(`Retrieved ${orders.length} total orders`);
                
                return orders;
            } else {
                console.error("Database connection failed");
                return [];
            }
        } catch (error) {
            console.error("Get all fundraising orders error:", error);
            return [];
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    async getFundraisingOrderById(orderId) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fundraising";

                const database = this.databaseConnectivity.client.db(databaseName);
                const collection = database.collection(collectionName);
                
                // Find fundraising order by ID
                const { ObjectId } = require('mongodb');
                const order = await collection.findOne({ _id: new ObjectId(orderId) });

                if (order) {
                    return order; // Return the order document directly
                } else {
                    return null; // No order found
                }
            } else {
                console.error("Database connection failed");
                return null;
            }
        } catch (error) {
            console.error("Get fundraising order by ID error:", error);
            return null;
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    async updateFundraisingOrder(orderId, updateData) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fundraising";

                const database = this.databaseConnectivity.client.db(databaseName);
                const collection = database.collection(collectionName);
                
                // Validate ObjectId format
                if (!ObjectId.isValid(orderId)) {
                    console.error("Invalid ObjectId format:", orderId);
                    return {
                        success: false,
                        message: "Invalid order ID format"
                    };
                }

                // Calculate total price from items if items are being updated
                if (updateData.items && updateData.items.length > 0) {
                    updateData.totalPrice = updateData.items.reduce((total, item) => {
                        const itemPrice = item.price || item.unitPrice || 0;
                        const quantity = item.quantity || 1;
                        return total + (itemPrice * quantity);
                    }, 0);
                    console.log("Calculated total price from items:", updateData.totalPrice);
                }

                // Update the fundraising order directly without adding timestamps
                console.log("Attempting MongoDB update with ObjectId:", new ObjectId(orderId));
                
                // Prepare update operations
                const updateOperations = {};
                
                // Handle $unset operations (for removing fields)
                if (updateData.$unset) {
                    updateOperations.$unset = updateData.$unset;
                    delete updateData.$unset; // Remove from updateData so it's not included in $set
                }
                
                // Handle $set operations (for setting/updating fields)
                if (Object.keys(updateData).length > 0) {
                    updateOperations.$set = updateData;
                }
                
                const updateResult = await collection.updateOne(
                    { _id: new ObjectId(orderId) },
                    updateOperations
                );
                
                console.log("MongoDB update result:", updateResult);

                if (updateResult.acknowledged && updateResult.matchedCount > 0) {
                    // Fetch the updated document
                    const updatedOrder = await collection.findOne({ _id: new ObjectId(orderId) });
                    
                    return {
                        success: true,
                        message: "Fundraising order updated successfully",
                        modifiedCount: updateResult.modifiedCount,
                        data: updatedOrder
                    };
                } else if (updateResult.matchedCount === 0) {
                    return {
                        success: false,
                        message: "Fundraising order not found"
                    };
                } else {
                    return {
                        success: false,
                        message: "Failed to update fundraising order"
                    };
                }
            } else {
                return {
                    success: false,
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Update fundraising order error:", error);
            return {
                success: false,
                message: "Error updating fundraising order",
                error: error.message
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    async updateFundraisingOrderByFilter(filterData, updateData) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fundraising";

                const database = this.databaseConnectivity.client.db(databaseName);
                const collection = database.collection(collectionName);

                // Update the fundraising order based on filter
                const updateResult = await collection.updateOne(
                    filterData,
                    { $set: updateData }
                );

                if (updateResult.acknowledged && updateResult.matchedCount > 0) {
                    // Fetch the updated document
                    const updatedOrder = await collection.findOne(filterData);
                    
                    return {
                        success: true,
                        message: "Fundraising order updated successfully",
                        modifiedCount: updateResult.modifiedCount,
                        data: updatedOrder
                    };
                } else if (updateResult.matchedCount === 0) {
                    return {
                        success: false,
                        message: "Fundraising order not found with the provided criteria"
                    };
                } else {
                    return {
                        success: false,
                        message: "Failed to update fundraising order"
                    };
                }
            } else {
                return {
                    success: false,
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Update fundraising order by filter error:", error);
            return {
                success: false,
                message: "Error updating fundraising order",
                error: error.message
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    async generateFundraisingKey() {
        // Use the receipt number generation method instead
        return await this.generateReceiptNumber();
    }

    // Insert invoice record into Receipts collection
    async insertInvoiceRecord(fundraisingOrderId, invoiceNumber) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const receiptsCollectionName = "Receipts";

                const database = this.databaseConnectivity.client.db(databaseName);
                const receiptsCollection = database.collection(receiptsCollectionName);

                // Get current date and time
                const now = new Date();
                const date = now.toLocaleDateString('en-GB'); // dd/mm/yyyy format
                const time = now.toLocaleTimeString('en-GB', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                }); // hh:mm:ss 24-hour format

                // Create receipt document using invoiceNumber
                const receiptDocument = {
                    receiptNo: invoiceNumber,
                    registration_id: fundraisingOrderId, // Use fundraising order _id
                    url: "", // Empty string as requested
                    staff: "", // Empty string as requested
                    location: "", // Empty string as requested
                    date: date,
                    time: time
                };

                // Insert the receipt record
                const insertResult = await receiptsCollection.insertOne(receiptDocument);

                if (insertResult.acknowledged) {
                    console.log("Invoice record inserted:", insertResult.insertedId);
                    return {
                        success: true,
                        receiptId: insertResult.insertedId,
                        receiptNo: invoiceNumber,
                        alreadyExists: false
                    };
                } else {
                    console.error("Failed to insert invoice record");
                    return { success: false, message: "Failed to insert invoice record" };
                }
            } else {
                console.error("Database connection failed for invoice insertion");
                return { success: false, message: "Database connection failed" };
            }
        } catch (error) {
            console.error("Error inserting invoice record:", error);
            return { success: false, message: error.message };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    // Generate next receipt number from Receipts table
    // items parameter is optional - if provided, will check for Panettone products
    // orderId parameter is optional - if provided, will associate the receipt with the order
    async generateReceiptNumber(items, orderId) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const receiptsCollectionName = "Receipts";

                const database = this.databaseConnectivity.client.db(databaseName);
                const receiptsCollection = database.collection(receiptsCollectionName);

                // Get current year in 2-digit format
                const currentYear = new Date().getFullYear().toString().slice(-2);

                // Check if ALL items contain "Panettone" substring
                let containsPanettone = false;
                if (items && Array.isArray(items) && items.length > 0) {
                    containsPanettone = items.every(item => {
                        const itemName = item.productName || item.name || item.itemName || '';
                        return itemName.toLowerCase().includes('panettone');
                    });
                }

                // Determine the receipt format based on product content
                const receiptPrefix = containsPanettone ? 'ECSS/Panettone' : 'ECSS/FR';
                const receiptPattern = containsPanettone ? 'ECSS\\/Panettone' : 'ECSS\\/FR';

                // Find the latest receipt number for the current year and format
                const yearPattern = new RegExp(`^${receiptPattern}\\/\\d+\\/${currentYear}$`);
                const latestReceipt = await receiptsCollection
                    .findOne(
                        { receiptNo: { $exists: true, $regex: yearPattern } },
                        { sort: { receiptNo: -1 } }
                    );

                let nextNumber = 1;
                
                if (latestReceipt && latestReceipt.receiptNo) {
                    // Extract the number from ECSS/(FR|Panettone)/xxx/YY format for current year
                    const match = latestReceipt.receiptNo.match(new RegExp(`^${receiptPattern}\\/(\\d+)\\/${currentYear}$`));
                    if (match) {
                        nextNumber = parseInt(match[1]) + 1;
                    }
                }

                // Format the number with leading zeros (3 digits minimum)
                const formattedNumber = nextNumber.toString().padStart(3, '0');
                const receiptNumber = `${receiptPrefix}/${formattedNumber}/${currentYear}`;

                // If orderId is provided, update the order document with the receipt number
                if (orderId) {
                    try {
                        const fundraisingCollectionName = "Fundraising";
                        const fundraisingCollection = database.collection(fundraisingCollectionName);
                        
                        const updateResult = await fundraisingCollection.updateOne(
                            { _id: new ObjectId(orderId) },
                            { $set: { receiptNumber: receiptNumber } }
                        );

                        if (updateResult.modifiedCount > 0) {
                            console.log(`Updated order ${orderId} with receipt number: ${receiptNumber}`);
                        } else {
                            console.warn(`Failed to update order ${orderId} with receipt number`);
                        }
                    } catch (updateError) {
                        console.error("Error updating order with receipt number:", updateError);
                        // Don't fail the receipt generation if update fails
                    }
                }

                console.log(`Generated receipt number: ${receiptNumber} (Year: 20${currentYear}, Contains Panettone: ${containsPanettone}, Order ID: ${orderId || 'N/A'})`);
                return receiptNumber;
            } else {
                console.error("Database connection failed for receipt number generation");
                return null;
            }
        } catch (error) {
            console.error("Error generating receipt number:", error);
            return null;
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    // Get receipt number from Receipts table based on registration_id (order _id)
    // Also updates the corresponding Fundraising record with the receipt number
    async getReceiptNumberByRegistrationId(registrationId) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const receiptsCollectionName = "Receipts";
                const fundraisingCollectionName = "Fundraising";

                const database = this.databaseConnectivity.client.db(databaseName);
                const receiptsCollection = database.collection(receiptsCollectionName);
                const fundraisingCollection = database.collection(fundraisingCollectionName);

                // Find receipt record by registration_id
                console.log("Searching for receipt with registration_id:", registrationId);
                const receiptRecord = await receiptsCollection.findOne({
                    registration_id: new ObjectId(registrationId)
                });

                console.log("Receipt search result:", receiptRecord);

                if (receiptRecord && receiptRecord.receiptNo) {
                    console.log(`Found receipt number ${receiptRecord.receiptNo} for registration_id: ${registrationId}`);
                    
                    // Update the Fundraising table with the receipt number
                    try {
                        const updateResult = await fundraisingCollection.updateOne(
                            { _id: new ObjectId(registrationId) },
                            { $set: { receiptNumber: receiptRecord.receiptNo } }
                        );

                        if (updateResult.modifiedCount > 0) {
                            console.log(`Updated Fundraising record ${registrationId} with receipt number: ${receiptRecord.receiptNo}`);
                        } else {
                            console.log(`Fundraising record ${registrationId} already has receipt number or not found`);
                        }
                    } catch (updateError) {
                        console.error("Error updating Fundraising record with receipt number:", updateError);
                        // Don't fail the receipt lookup if update fails
                    }
                    
                    return receiptRecord.receiptNo;
                } else {
                    console.log(`No receipt found for registration_id: ${registrationId}`);
                    return null;
                }
            } else {
                console.error("Database connection failed for receipt lookup");
                return null;
            }
        } catch (error) {
            console.error("Error getting receipt number by registration_id:", error);
            return null;
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    async getBulkOrders(filterData = {}) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "BulkOrders";

                const database = this.databaseConnectivity.client.db(databaseName);
                const collection = database.collection(collectionName);
                
                console.log('MongoDB Query Filter for Bulk Orders:', JSON.stringify(filterData, null, 2));
                
                // Find bulk orders based on filter (if any)
                const bulkOrders = await collection.find(filterData).sort({ createdAt: -1 }).toArray();
                
                console.log(`MongoDB Query Result: Found ${bulkOrders.length} bulk orders`);
                
                return bulkOrders;
            } else {
                console.error("Database connection failed");
                return [];
            }
        } catch (error) {
            console.error("Get bulk orders error:", error);
            return [];
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    async uploadPdfToGoogleDrive(fileBuffer, fileName, mimeType) {
        try {
            let credentials = null;

            // Try environment variable first (for Azure)
            if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
                console.log("✓ Loading credentials from GOOGLE_DRIVE_CREDENTIALS environment variable");
                try {
                    // Try to parse as JSON directly first (in case it's already JSON)
                    try {
                        credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
                        console.log("✓ Parsed credentials as JSON");
                    } catch (directParseError) {
                        // If that fails, try base64 decode
                        console.log("Attempting base64 decode...");
                        credentials = JSON.parse(Buffer.from(process.env.GOOGLE_DRIVE_CREDENTIALS, 'base64').toString('utf8'));
                        console.log("✓ Decoded credentials from base64");
                    }
                } catch (parseError) {
                    console.error("❌ Failed to parse GOOGLE_DRIVE_CREDENTIALS:", parseError.message);
                    return {
                        success: false,
                        error: parseError.message
                    };
                }
            }
            // Fallback to file (for local development)
            else {
                const keyFile = path.join(__dirname, '../../config/ecss-company-management-system-22a29c296db3.json');
                console.log("🔍 GOOGLE_DRIVE_CREDENTIALS env var not found, checking for credentials file at:", keyFile);
                
                if (fs.existsSync(keyFile)) {
                    console.log("✓ Loading credentials from file");
                    credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
                } else {
                    console.error("❌ Credentials not found in environment variable or file");
                    return {
                        success: false,
                        error: "Service account credentials not found"
                    };
                }
            }

            console.log("✓ Service account credentials loaded successfully");
            console.log("Service account email:", credentials.client_email);

            // Create auth client with Drive API scope
            const auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/drive']
            });

            // Initialize Drive API
            const drive = google.drive({ version: 'v3', auth });
            
            console.log("📤 Uploading PDF to Google Drive:", fileName);
            
            try {
                // Upload file to Google Drive
                const response = await drive.files.create({
                    requestBody: {
                        name: fileName,
                        mimeType: mimeType || 'application/pdf',
                        parents: ['1DF81mvA5pv8_X-_uP8528Vb1xNfs1D8M'] // Fundraising folder ID in Google Drive
                    },
                    media: {
                        mimeType: mimeType || 'application/pdf',
                        body: require('stream').Readable.from([fileBuffer])
                    },
                    fields: 'id, name, webViewLink, createdTime'
                });

                const fileId = response.data.id;
                const fileLink = response.data.webViewLink;
                const uploadedAt = response.data.createdTime;

                console.log("✓ File uploaded successfully to Google Drive");
                console.log("File ID:", fileId);
                console.log("File Link:", fileLink);
                console.log("Uploaded at:", uploadedAt);

                return {
                    success: true,
                    fileId: fileId,
                    fileName: fileName,
                    fileLink: fileLink,
                    uploadedAt: uploadedAt
                };

            } catch (uploadError) {
                console.error("❌ Error uploading file to Google Drive:", uploadError.message);
                return {
                    success: false,
                    error: uploadError.message
                };
            }

        } catch (error) {
            console.error("❌ Error in uploadPdfToGoogleDrive:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async fetchBulkOrdersFromGoogleDrive(fileId, sheetName) {
        try {
            let credentials = null;

            // Try environment variable first (for Azure)
            if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
                console.log("✓ Loading credentials from GOOGLE_DRIVE_CREDENTIALS environment variable");
                try {
                    // Try to parse as JSON directly first (in case it's already JSON)
                    try {
                        credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
                        console.log("✓ Parsed credentials as JSON");
                    } catch (directParseError) {
                        // If that fails, try base64 decode
                        console.log("Attempting base64 decode...");
                        credentials = JSON.parse(Buffer.from(process.env.GOOGLE_DRIVE_CREDENTIALS, 'base64').toString('utf8'));
                        console.log("✓ Decoded credentials from base64");
                    }
                } catch (parseError) {
                    console.error("❌ Failed to parse GOOGLE_DRIVE_CREDENTIALS:", parseError.message);
                    console.error("Env var length:", process.env.GOOGLE_DRIVE_CREDENTIALS.length);
                    console.error("First 100 chars:", process.env.GOOGLE_DRIVE_CREDENTIALS.substring(0, 100));
                    return {
                        success: false,
                        message: "Failed to parse Google Drive credentials from environment",
                        error: parseError.message,
                        debugging: {
                            envVarLength: process.env.GOOGLE_DRIVE_CREDENTIALS.length,
                            isJson: process.env.GOOGLE_DRIVE_CREDENTIALS.startsWith('{'),
                            isBase64: /^[A-Za-z0-9+/=]+$/.test(process.env.GOOGLE_DRIVE_CREDENTIALS)
                        }
                    };
                }
            }
            // Fallback to file (for local development)
            else {
                const keyFile = path.join(__dirname, '../../config/ecss-company-management-system-22a29c296db3.json');
                console.log("🔍 GOOGLE_DRIVE_CREDENTIALS env var not found, checking for credentials file at:", keyFile);
                
                if (fs.existsSync(keyFile)) {
                    console.log("✓ Loading credentials from file");
                    credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
                } else {
                    console.error("❌ Credentials not found in environment variable or file");
                    const configDir = path.join(__dirname, '../../config');
                    return {
                        success: false,
                        message: "Service account credentials not found. Set GOOGLE_DRIVE_CREDENTIALS environment variable or add credentials file.",
                        debugging: {
                            envVarSet: !!process.env.GOOGLE_DRIVE_CREDENTIALS,
                            filePath: keyFile,
                            fileExists: fs.existsSync(keyFile),
                            configDirExists: fs.existsSync(configDir),
                            availableFiles: fs.existsSync(configDir) ? fs.readdirSync(configDir) : []
                        }
                    };
                }
            }

            console.log("✓ Service account credentials loaded successfully");
            console.log("Service account email:", credentials.client_email);

            // Create auth client with Drive API scope
            const auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/drive']
            });

            // Initialize Drive API
            const drive = google.drive({ version: 'v3', auth });
            
            console.log("📤 Fetching Excel file from Google Drive:", fileId);
            
            try {
                // Get file metadata
                const fileMetadata = await drive.files.get({
                    fileId: fileId,
                    fields: 'name, mimeType, size'
                });
                
                console.log("✓ File found:", fileMetadata.data.name);
                console.log("MIME type:", fileMetadata.data.mimeType);
                console.log("File size:", fileMetadata.data.size, "bytes");
                
            } catch (metaError) {
                console.error("❌ Error fetching file metadata:", metaError.message);
                return {
                    success: false,
                    message: "Failed to access Excel file from Google Drive",
                    error: metaError.message,
                    troubleshooting: "Possible causes: 1) Invalid file ID, 2) Service account lacks access, 3) File has been deleted"
                };
            }
            
            // Download file content as buffer
            console.log("📥 Downloading Excel file content...");
            const fileResponse = await drive.files.get({
                fileId: fileId,
                alt: 'media'
            }, { 
                responseType: 'arraybuffer' 
            });
            
            const fileBuffer = Buffer.from(fileResponse.data);
            console.log("✓ File downloaded. Size:", fileBuffer.length, "bytes");
            
            // Parse Excel file
            console.log("📊 Parsing Excel file...");
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            
            // Get all sheet names
            const sheetNames = workbook.SheetNames;
            console.log("📋 Available sheets:", JSON.stringify(sheetNames, null, 2));
            
            // Check if the sheet exists
            if (!sheetNames.includes(sheetName)) {
                const availableSheets = sheetNames.join(', ');
                console.error(`❌ Sheet "${sheetName}" not found. Available sheets: ${availableSheets}`);
                return {
                    success: false,
                    message: `Sheet "${sheetName}" not found in Excel file`,
                    availableSheets: sheetNames
                };
            }
            
            // Read specific sheet
            console.log("📖 Reading sheet:", sheetName);
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (!rows || rows.length === 0) {
                console.error(`❌ No data found in sheet "${sheetName}"`);
                return {
                    success: false,
                    message: `No data found in ${sheetName} sheet`
                };
            }

            // Process the sheet data (skip header row)
            const headers = rows[0];
            const bulkOrders = rows.slice(1).map((row, index) => {
                return {
                    rowIndex: index + 2, // Row number in sheet
                    data: headers.reduce((obj, header, idx) => {
                        obj[header] = row[idx] || '';
                        return obj;
                    }, {})
                };
            }).filter(order => Object.values(order.data).some(val => val !== '')); // Filter out empty rows

            console.log(`✓ Successfully fetched ${bulkOrders.length} delivery details from Excel file`);
            console.log("Headers:", JSON.stringify(headers, null, 2));
            console.log("Bulk orders count:", bulkOrders.length);

            return {
                success: true,
                message: `Fetched ${bulkOrders.length} delivery details from Excel file`,
                totalOrders: bulkOrders.length,
                headers: headers,
                bulkOrders: bulkOrders
            };

        } catch (error) {
            console.error("❌ Error fetching bulk orders from Google Drive:", error);
            console.error("Error stack:", error.stack);
            return {
                success: false,
                message: "Failed to fetch delivery details from Excel file",
                error: error.message,
                debugging: {
                    errorType: error.constructor.name,
                    errorCode: error.code
                }
            };
        }
    }
}

module.exports = FundraisingController;