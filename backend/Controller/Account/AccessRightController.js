var DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class
//Ok

class AccessRightController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    // Handle user login
    async createAccessRight(accountDetails) 
    {
        try 
        {
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Accounts";
                var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accountDetails);   
                if(connectedDatabase === true)
                {
                    return {
                        success: true,
                        message: "New account created successfully",
                        data: result
                    };
                }
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error registering user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async allAccountsWithAccessRight() 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Access Rights";
                var connectedDatabase = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);   
                return connectedDatabase;
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving all user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }  

    async allAccessRights(accountId) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Access Rights";
                var connectedDatabase = await this.databaseConnectivity.retrieveOneFromDatabase(databaseName, collectionName, accountId);   
                var accessRights = {"Account": connectedDatabase["Account"], "Courses": connectedDatabase["Courses"], "Membership": connectedDatabase["Membership"], "Registration And Payment": connectedDatabase["Registration And Payment"], "QR Code":  connectedDatabase["QR Code"], "Reports":  connectedDatabase["Reports"], "Attendances":  connectedDatabase["Attendances"]}
                return accessRights;
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving all user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }  

    async deleteAccessRights(accountId) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Access Rights";
                var connectedDatabase = await this.databaseConnectivity.deleteAccessRights(databaseName, collectionName, accountId);
                return connectedDatabase;
                //console.log(connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving all user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }  

    async updateAccessRight(accessRightId, accessRight) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Access Rights";
                var connectedDatabase = await this.databaseConnectivity.updateAccessRight(databaseName, collectionName, accessRightId, accessRight);
                return connectedDatabase;
                //console.log(connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error retrieving all user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }  
 }

module.exports = AccessRightController;
