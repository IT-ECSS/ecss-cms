const DatabaseConnectivity = require('../../database/databaseConnectivity');

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

                // Prepare the order document with formatted date and time
                const now = new Date();
                const orderDate = now.toLocaleDateString('en-GB'); // dd/mm/yyyy format
                const orderTime = now.toLocaleTimeString('en-GB', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }); // hh:mm 24-hour format

                // Calculate total price from items if not provided or is 0
                let totalPrice = orderData.totalPrice || 0;
                if (totalPrice === 0 && orderData.items && orderData.items.length > 0) {
                    totalPrice = orderData.items.reduce((total, item) => {
                        const itemPrice = item.price || item.unitPrice || 0;
                        const quantity = item.quantity || 1;
                        return total + (itemPrice * quantity);
                    }, 0);
                }

                const orderDocument = {
                    ...orderData,
                    totalPrice,
                    orderDate,
                    orderTime,
                    status: 'Pending', // Default status
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
                
                // Find fundraising orders based on filter (if any)
                const orders = await collection.find(filterData).toArray();

                return {
                    success: true,
                    message: "Fundraising orders retrieved successfully",
                    data: orders,
                    count: orders.length
                };
            } else {
                return {
                    success: false,
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Get fundraising orders error:", error);
            return {
                success: false,
                message: "Error retrieving fundraising orders",
                error: error.message
            };
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

                // Calculate total price from items if items are being updated
                if (updateData.items && updateData.items.length > 0) {
                    updateData.totalPrice = updateData.items.reduce((total, item) => {
                        const itemPrice = item.price || item.unitPrice || 0;
                        const quantity = item.quantity || 1;
                        return total + (itemPrice * quantity);
                    }, 0);
                }

                // Update the fundraising order directly without adding timestamps
                const { ObjectId } = require('mongodb');
                const updateResult = await collection.updateOne(
                    { _id: new ObjectId(orderId) },
                    { $set: updateData }
                );

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

    // Insert receipt record into Receipts collection
    async insertReceiptRecord(fundraisingOrderId, receiptNo) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const receiptsCollectionName = "Receipts";

                const database = this.databaseConnectivity.client.db(databaseName);
                const receiptsCollection = database.collection(receiptsCollectionName);

                // Check if receipt already exists for this fundraising order
                const existingReceipt = await receiptsCollection.findOne({
                    registration_id: fundraisingOrderId
                });

                if (existingReceipt) {
                    console.log("Receipt already exists for this order:", existingReceipt.receiptNo);
                    return {
                        success: true,
                        receiptId: existingReceipt._id,
                        receiptNo: existingReceipt.receiptNo,
                        alreadyExists: true
                    };
                }

                // Get current date and time
                const now = new Date();
                const date = now.toLocaleDateString('en-GB'); // dd/mm/yyyy format
                const time = now.toLocaleTimeString('en-GB', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                }); // hh:mm:ss 24-hour format

                // Create receipt document
                const receiptDocument = {
                    receiptNo: receiptNo,
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
                    console.log("Receipt record inserted:", insertResult.insertedId);
                    return {
                        success: true,
                        receiptId: insertResult.insertedId,
                        receiptNo: receiptNo,
                        alreadyExists: false
                    };
                } else {
                    console.error("Failed to insert receipt record");
                    return { success: false, message: "Failed to insert receipt record" };
                }
            } else {
                console.error("Database connection failed for receipt insertion");
                return { success: false, message: "Database connection failed" };
            }
        } catch (error) {
            console.error("Error inserting receipt record:", error);
            return { success: false, message: error.message };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    // Generate next receipt number from Receipts table
    async generateReceiptNumber() {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const receiptsCollectionName = "Receipts";

                const database = this.databaseConnectivity.client.db(databaseName);
                const receiptsCollection = database.collection(receiptsCollectionName);

                // Get current year in 2-digit format
                const currentYear = new Date().getFullYear().toString().slice(-2);

                // Find the latest receipt number for the current year
                const yearPattern = new RegExp(`^ECSS\\/FR\\/\\d+\\/${currentYear}$`);
                const latestReceipt = await receiptsCollection
                    .findOne(
                        { receiptNo: { $exists: true, $regex: yearPattern } },
                        { sort: { receiptNo: -1 } }
                    );

                let nextNumber = 1;
                
                if (latestReceipt && latestReceipt.receiptNo) {
                    // Extract the number from ECSS/FR/xxx/YY format for current year
                    const match = latestReceipt.receiptNo.match(new RegExp(`^ECSS\\/FR\\/(\\d+)\\/${currentYear}$`));
                    if (match) {
                        nextNumber = parseInt(match[1]) + 1;
                    }
                }

                // Format the number with leading zeros (3 digits minimum)
                const formattedNumber = nextNumber.toString().padStart(3, '0');
                const receiptNumber = `ECSS/FR/${formattedNumber}/${currentYear}`;

                console.log(`Generated receipt number: ${receiptNumber} (Year: 20${currentYear})`);
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
}

module.exports = FundraisingController;