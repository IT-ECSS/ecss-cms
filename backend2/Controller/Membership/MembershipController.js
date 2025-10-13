const DatabaseConnectivity = require('../../database/databaseConnectivity');

class MembershipController {
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity();
    }

    async getMembershipAll() {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Members_Volunteers";
                console.log("Retrieving all membership records without filter");

                const membershipRecords = await this.databaseConnectivity.getAllMembershipRecords(
                    databaseName, 
                    collectionName
                );

                console.log("Retrieved all membership records:", membershipRecords);
                
                return {
                    "success": membershipRecords.success, 
                    "message": membershipRecords.message, 
                    "details": membershipRecords.data
                };   
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    error: "Could not establish connection to MongoDB Atlas",
                    details: []
                };
            }
        } catch (error) {
            console.error("Get attendance error:", error);
            return {
                success: false,
                message: "Error retrieving attendance records",
                error: error.message,
                details: []
            };
        } finally {
            await this.databaseConnectivity.close();
        }   
    }
}

module.exports = MembershipController;