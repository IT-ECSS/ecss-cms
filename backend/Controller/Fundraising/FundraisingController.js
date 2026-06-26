const DatabaseConnectivity = require('../../database/databaseConnectivity');
const { ObjectId } = require('mongodb');
const { generateInvoiceNumber: generateInvoiceNo } = require('../../numbering/invoiceNumber');
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

    // Insert invoice record into Invoices collection
    async insertInvoiceRecord(fundraisingOrderId, invoiceNumber) {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const invoicesCollectionName = "Invoices";

                const database = this.databaseConnectivity.client.db(databaseName);
                const invoicesCollection = database.collection(invoicesCollectionName);

                // Get current date and time
                const now = new Date();
                const date = now.toLocaleDateString('en-GB'); // dd/mm/yyyy format
                const time = now.toLocaleTimeString('en-GB', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                }); // hh:mm:ss 24-hour format

                // Create invoice document using invoiceNumber
                const invoiceDocument = {
                    invoiceNo: invoiceNumber,
                    registration_id: fundraisingOrderId,
                    url: "",
                    staff: "",
                    location: "",
                    date: date,
                    time: time
                };

                // Insert the invoice record
                const insertResult = await invoicesCollection.insertOne(invoiceDocument);

                if (insertResult.acknowledged) {
                    console.log("Invoice record inserted:", insertResult.insertedId);
                    return {
                        success: true,
                        invoiceId: insertResult.insertedId,
                        invoiceNo: invoiceNumber,
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

    // Generate the next fundraising INVOICE number from the Invoices table.
    // Fundraising only ever produces invoices (no receipts). The item code is PAN
    // (Panettone / Christmas Fundraising) per the "Item Code" sheet, and the
    // location code is resolved from the order's collection centre.
    // items    - order items (used only to keep the PAN classification explicit)
    // location - the order's collection centre (one of the centres in the
    //            "Location Code" sheet); required so the number carries a valid
    //            location code.
    async generateFundraisingInvoiceNumber(items, location) {
        try {
            const result = await this.databaseConnectivity.initialize();

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const invoicesCollectionName = "Invoices";

                const database = this.databaseConnectivity.client.db(databaseName);
                const invoicesCollection = database.collection(invoicesCollectionName);

                const year = new Date().getFullYear().toString().slice(-2);
                const existingInvoices = await invoicesCollection.find({
                    $or: [
                        { invoiceNo: { $regex: '^ECSS-' } },
                        { invoiceNumber: { $regex: '^ECSS-' } }
                    ]
                }).toArray();

                // Fundraising = Panettone (Christmas Fundraising) => item code PAN.
                const invoiceNumber = await generateInvoiceNo({
                    existingInvoices,
                    year,
                    itemCode: 'PAN',
                    course: { courseLocation: location, location }
                });

                console.log(`Generated fundraising invoice number: ${invoiceNumber} (Year: 20${year}, Location: ${location || 'N/A'})`);
                return invoiceNumber;
            } else {
                console.error("Database connection failed for fundraising invoice number generation");
                return null;
            }
        } catch (error) {
            console.error("Error generating fundraising invoice number:", error);
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