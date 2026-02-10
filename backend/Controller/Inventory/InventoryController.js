const DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class


class InventoryController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    async insertInventory(payload)
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";

                // Insert the inventory order
                const insertResult = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, payload);
                console.log("Insert Inventory Result:", insertResult);

                // Add _id to payload for socket emission
                const dataWithId = {
                    ...payload,
                    _id: insertResult?.insertedId || null
                };

                return {
                    success: true,
                    message: "Inventory order inserted successfully",
                    result: insertResult,
                    data: dataWithId,
                    recordId: insertResult?.insertedId || null
                };
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        } 
        catch (error) {
            console.error("Inventory insert error:", error);
            return {
                success: false,
                message: "Error inserting inventory order",
                error: error.message || String(error)
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }

    async retrieveInventoryRecords()
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Inventory";

                // Retrieve all inventory records
                const records = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);
                console.log("Retrieved Inventory Records:", records?.length || 0, "records");

                return {
                    success: true,
                    message: "Inventory records retrieved successfully",
                    records: records || []
                };
            } else {
                return {
                    success: false,
                    message: "Failed to connect to database",
                    error: result || "Database connection failed"
                };
            }
        } 
        catch (error) {
            console.error("Inventory retrieve error:", error);
            return {
                success: false,
                message: "Error retrieving inventory records",
                error: error.message || String(error)
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }
}

module.exports = InventoryController;
