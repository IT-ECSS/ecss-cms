const DatabaseConnectivity = require('../../database/databaseConnectivity');
const { ObjectId } = require('mongodb');

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
}

module.exports = FundraisingController;