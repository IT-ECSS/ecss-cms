const DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class


class InventoryController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    async generateReceiptNumber(sku) {
        try {
            const databaseName = "Company-Management-System";
            const collectionName = "Inventory";

            // Retrieve all inventory records
            const records = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);

            // Filter records that have receiptNumber matching this SKU pattern
            const skuRecords = (records || []).filter(record => {
                if (!record.receiptNumber) return false;
                // Check if receipt number matches pattern ECSS/{sku}/XXXX
                const pattern = `ECSS/${sku}/`;
                return record.receiptNumber.startsWith(pattern);
            });

            if (skuRecords.length === 0) {
                // No existing receipts for this SKU, start at 0001
                return `ECSS/${sku}/0001`;
            }

            // Find the highest running number
            let maxNumber = 0;
            for (const record of skuRecords) {
                const parts = record.receiptNumber.split('/');
                if (parts.length === 3) {
                    const num = parseInt(parts[2], 10);
                    if (!isNaN(num) && num > maxNumber) {
                        maxNumber = num;
                    }
                }
            }

            // Increment and pad to minimum 4 digits (supports unlimited digits beyond 9999)
            const nextNumber = maxNumber + 1;
            const formattedNumber = nextNumber < 10000 
                ? nextNumber.toString().padStart(4, '0') 
                : nextNumber.toString();
            return `ECSS/${sku}/${formattedNumber}`;
        } catch (error) {
            console.error("Error generating receipt number:", error);
            // Fallback to 0001 if error
            return `ECSS/${sku}/0001`;
        }
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

                // Generate receipt number based on SKU
                const sku = payload.sku || 'UNKNOWN';
                const receiptNumber = await this.generateReceiptNumber(sku);
                console.log("Generated Receipt Number:", receiptNumber);

                // Add receipt number to payload, but exclude sku
                const { sku: _sku, ...payloadWithoutSku } = payload;
                const payloadWithReceipt = {
                    ...payloadWithoutSku,
                    receiptNumber: receiptNumber
                };

                // Insert the inventory order
                const insertResult = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, payloadWithReceipt);
                console.log("Insert Inventory Result:", insertResult);

                // Add _id to payload for socket emission
                const dataWithId = {
                    ...payloadWithReceipt,
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
