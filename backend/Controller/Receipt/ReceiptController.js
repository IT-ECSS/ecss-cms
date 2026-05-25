const DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class

class ReceiptController {
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    // Get database connection
    getDatabaseConnection() {
        return this.databaseConnectivity;
    }

    // Method to handle generating a new receipt number
    async newReceiptNo(course, paymentMethod) {
        try {
            const dbConnection = this.getDatabaseConnection();
            await dbConnection.ensureConnection();
            
            const databaseName = "Company-Management-System";
            const collectionName = "Receipts";

            const newReceiptNumber = await dbConnection.getNextReceiptNumber(databaseName, collectionName, course, paymentMethod);

            return {
                success: true,
                message: "New receipt number generated successfully",
                receiptNumber: newReceiptNumber
            };
        } 
        catch (error) {
            console.error("Error generating new receipt number:", error);
            return {
                success: false,
                message: "Error generating new receipt number",
                error: error
            };
        } 
        finally {
            console.log("New receipt number request completed");
        }
    }


    async createReceipt(receiptNo, registration_id, url, staff, date, time, location) {
        try {
            // Prepare receipt details
            var receiptDetails = { 
                receiptNo: receiptNo, 
                registration_id: registration_id, 
                url: url, 
                staff: staff, 
                location:location,
                date: date, 
                time: time,
            };
    
            const dbConnection = this.getDatabaseConnection();
            await dbConnection.ensureConnection();
            
            var databaseName = "Company-Management-System";
            var collectionName = "Receipts";
            
            console.log("📝 [Receipt Controller] Data:", receiptDetails);
            // Insert receipt details into the database
            var insertResult = await dbConnection.insertToDatabase(databaseName, collectionName, receiptDetails);
            
            console.log("📝 [Receipt Controller] Insert result:", insertResult);
            
            // Check if insert was acknowledged
            if (!insertResult?.acknowledged) {
                const errorMsg = insertResult?.error || 'Database insert failed - not acknowledged';
                console.error("❌ [Receipt Controller] Failed to insert receipt:", errorMsg);
                
                // Check if it's a duplicate
                if (insertResult?.skipped) {
                    return {
                        success: false,
                        message: "Receipt already exists for this combination of receiptNo, registration, staff, and location",
                        receiptNumber: receiptNo,
                        error: insertResult.reason
                    };
                }
                
                return {
                    success: false,
                    message: "Failed to insert receipt into database",
                    receiptNumber: receiptNo,
                    error: errorMsg
                };
            }
            
            console.log("✅ [Receipt Controller] Receipt created successfully");
            // Return success response
            return {
                success: true,
                message: "Receipt created successfully",
                receiptNumber: receiptNo
            };
        } catch (error) {
            console.error("❌ [Receipt Controller] Error creating receipt:", error);
    
            // Return failure response
            return {
                success: false,
                message: "An error occurred while creating the receipt",
                receiptNumber: receiptNo,
                error: error.message
            };
        } finally {
            console.log("📝 [Receipt Controller] Create receipt request completed");
        }
    }

    async retrieveReceipts() 
    {
        try {
            const dbConnection = this.getDatabaseConnection();
            await dbConnection.ensureConnection();
            
            var databaseName = "Company-Management-System";
            var collectionName = "Receipts";
            var connectedDatabase = await dbConnection.retrieveFromDatabase(databaseName, collectionName);   
            return connectedDatabase;
        } 
        catch (error) 
        {
            console.error("Error retrieving receipts:", error);
            return {
                success: false,
                message: "Error retrieving receipts",
                error: error
            };
        }
        finally {
            console.log("Retrieve receipts request completed");
        }    
    }  

    async deleteReceipt(id) 
    {
        try {
            const dbConnection = this.getDatabaseConnection();
            await dbConnection.ensureConnection();
            
            var databaseName = "Company-Management-System";
            var collectionName = "Receipts";
            var connectedDatabase = await dbConnection.deleteFromDatabase(databaseName, collectionName, id);   
            return connectedDatabase;
        } 
        catch (error) 
        {
            console.error("Error deleting receipt:", error);
            return {
                success: false,
                message: "Error deleting receipt",
                error: error
            };
        }
        finally {
            console.log("Delete receipt request completed");
        }    
    }  
    
}

module.exports = ReceiptController;
