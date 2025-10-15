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
}

module.exports = FundraisingController;