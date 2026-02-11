var DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class ok

class LogsController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    // Create a new audit log entry
    async createAuditLog(logDetails) 
    {
        try 
        {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Logs";
                
                // Add timestamp if not provided
                if (!logDetails.timestamp) {
                    logDetails.timestamp = new Date();
                }
                
                var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, logDetails);   
                if(connectedDatabase.acknowledged === true)
                {
                    return {
                        success: true,
                        message: "Audit log created successfully",
                        data: connectedDatabase
                    };
                }
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error creating audit log",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }    
    }

    // Retrieve all audit logs
    async getAllAuditLogs() 
    {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Logs";
                var connectedDatabase = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);   
                return {
                    success: true,
                    data: connectedDatabase
                };
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving audit logs",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }    
    }

    // Retrieve audit logs by user/account ID
    async getAuditLogsByUser(accountId) 
    {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Logs";
                var query = { "accountId": accountId };
                var connectedDatabase = await this.databaseConnectivity.retrieveFromDatabaseWithQuery(databaseName, collectionName, query);   
                return {
                    success: true,
                    data: connectedDatabase
                };
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving audit logs by user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }    
    }

    // Retrieve audit logs by action type
    async getAuditLogsByAction(actionType) 
    {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Logs";
                var query = { "actionType": actionType };
                var connectedDatabase = await this.databaseConnectivity.retrieveFromDatabaseWithQuery(databaseName, collectionName, query);   
                return {
                    success: true,
                    data: connectedDatabase
                };
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving audit logs by action",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }    
    }

    // Retrieve audit logs within a date range
    async getAuditLogsByDateRange(startDate, endDate) 
    {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Logs";
                var query = { 
                    "timestamp": { 
                        $gte: new Date(startDate), 
                        $lte: new Date(endDate) 
                    } 
                };
                var connectedDatabase = await this.databaseConnectivity.retrieveFromDatabaseWithQuery(databaseName, collectionName, query);   
                return {
                    success: true,
                    data: connectedDatabase
                };
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving audit logs by date range",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }    
    }

    // Delete old audit logs (for maintenance purposes)
    async deleteOldAuditLogs(daysOld) 
    {
        try {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Logs";
                var cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysOld);
                
                var query = { "timestamp": { $lt: cutoffDate } };
                var connectedDatabase = await this.databaseConnectivity.deleteFromDatabaseWithQuery(databaseName, collectionName, query);   
                return {
                    success: true,
                    message: `Deleted audit logs older than ${daysOld} days`,
                    data: connectedDatabase
                };
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error deleting old audit logs",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close();
        }    
    }
}

module.exports = LogsController;