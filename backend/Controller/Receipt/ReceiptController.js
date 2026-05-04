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
            
            console.log("Data:", receiptDetails);
            // Insert receipt details into the database
            var connectedDatabase = await dbConnection.insertToDatabase(databaseName, collectionName, receiptDetails);  

            // Return success response
            return {
                success: true,
                message: "Receipt created successfully",
                receiptNumber: receiptNo
            };
        } catch (error) {
            console.error("Error creating receipt:", error);
    
            // Return failure response
            return {
                success: false,
                message: "An error occurred while creating the receipt",
                error: error.message
            };
        } finally {
            console.log("Create receipt request completed");
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
