var DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class

class AccountController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    // Handle user login
    async createAccount(accountDetails) 
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
                console.log(connectedDatabase); 
                if(connectedDatabase.acknowledged === true)
                {
                    if(accountDetails.role === "Admin" || accountDetails.role === "Sub Admin")
                    {
                        var accountID = connectedDatabase.accountId;
                        var accessRightDetails = {"Account Details":{"Account ID": accountID, "Name": accountDetails.name, "Role": accountDetails.role}, "Account":{"Create Account": true, "Account Table": true, "Access Rights Table": true}, "Courses":{"Upload Courses": true, "NSA Courses": true, "ILP Courses": true, "Update Courses": true, "Delete Courses": true, "Marriage Preparation Programme Courses": true}, "Registration And Payment": {"Registration And Payment Table": true, "Invoice Table": true}, "QR Code": {"Create QR Code": true, "QR Code Table": true, "Update QR Code": true, "Delete QR Code": true}, "Attendance": {"View Attendance": true}, "Reports": {"Monthly Report": true, "Payment Report": true}, "Membership": {"View Membership": true}, "Fitness": {"FFT Results": true}, "Fundraising": {"Fundraising Inventory": true, "Fundraising Table": true}};
                        var collectionName = "Access Rights";
                        var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accessRightDetails);   
                        return {
                            success: true,
                            message: "New account with respectively access rights created successfully"
                        }
                    }
                    else if(accountDetails.role === "Ops in-charge")
                    {
                        var accountID = connectedDatabase.accountId;
                        var accessRightDetails = {"Account Details":{"Account ID": accountID, "Name": accountDetails.name, "Role": accountDetails.role}, "Account":{"Create Account": false, "Account Table": false, "Access Rights Table": false}, "Courses":{"Upload Courses": false, "NSA Courses": true, "ILP Courses": true, "Update Courses": false, "Delete Courses": false, 'Marriage Preparation Programme Courses': false}, "Registration And Payment": {"Registration And Payment Table": true, "Invoice Table": true}, "QR Code": {"Create QR Code": true, "QR Code Table": true, "Update QR Code": true, "Delete QR Code": true}, "Reports": {"Monthly Report": true, "Payment Report": true}, "Attendance": {"View Attendance": true}, "Membership": {"View Membership": true}, "Fitness": {"FFT Results": true}, "Fundraising": {"Fundraising Inventory": true, "Fundraising Table": true}};
                        var collectionName = "Access Rights";
                        var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accessRightDetails);   
                        return {
                            success: true,
                            message: "New account with respectively access rights created successfully"
                        }
                    }
                    else if(accountDetails.role === "NSA in-charge")
                    {
                            var accountID = connectedDatabase.accountId;
                            var accessRightDetails = {"Account Details":{"Account ID": accountID, "Name": accountDetails.name, "Role": accountDetails.role}, "Account":{"Create Account": false, "Account Table": false, "Access Rights Table": false}, "Courses":{"Upload Courses": false, "NSA Courses": true, "ILP Courses": false, "Update Courses": false, "Delete Courses": false, 'Marriage Preparation Programme Courses': false}, "Registration And Payment": {"Registration And Payment Table": true, "Invoice Table": true}, "QR Code": {"Create QR Code": true, "QR Code Table": true, "Update QR Code": true, "Delete QR Code": true}, "Reports": {"Monthly Report": true, "Payment Report": true}, "Attendance": {"View Attendance": true}, "Membership": {"View Membership": true},  "Fitness": {"FFT Results": false}, "Fundraising": {"Fundraising Inventory": false, "Fundraising Table": false} };
                            var collectionName = "Access Rights";
                            var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accessRightDetails);   
                            return {
                                success: true,
                                message: "New account with respectively access rights created successfully"
                            }
                    }
                    else if(accountDetails.role === "Social Worker")
                    {
                            var accountID = connectedDatabase.accountId;
                            var accessRightDetails = {"Account Details":{"Account ID": accountID, "Name": accountDetails.name, "Role": accountDetails.role}, "Account":{"Create Account": false, "Account Table": false, "Access Rights Table": false}, "Courses":{"Upload Courses": false, "NSA Courses": false, "ILP Courses": false, "Update Courses": false, "Delete Courses": false, 'Marriage Preparation Programme Courses': true}, "Registration And Payment": {"Registration And Payment Table": true, "Invoice Table": true}, "QR Code": {"Create QR Code": false, "QR Code Table": false, "Update QR Code": false, "Delete QR Code": false}, "Reports": {"Monthly Report": false, "Payment Report": false}, "Attendance": {"View Attendance": false}, "Membership": {"View Membership": false},  "Fitness": {"FFT Results": false}, "Fundraising": {"Fundraising Inventory": false, "Fundraising Table": false} };
                            var collectionName = "Access Rights";
                            var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accessRightDetails);   
                            return {
                                success: true,
                                message: "New account with respectively access rights created successfully"
                            }
                    }
                    else if(accountDetails.role === "Site in-charge")
                    {
                            var accountID = connectedDatabase.accountId;
                            var accessRightDetails = {"Account Details":{"Account ID": accountID, "Name": accountDetails.name, "Role": accountDetails.role}, "Account":{"Create Account": false,"Account Table": false, "Access Rights Table": false}, "Courses":{"Upload Courses": false, "NSA Courses": true, "ILP Courses": true, "Update Courses": false, "Delete Courses": false, 'Marriage Preparation Programme Courses': false}, "Registration And Payment": {"Registration And Payment Table": true, "Invoice Table": false}, "QR Code": {"Create QR Code": true, "QR Code Table": true, "Update QR Code": false, "Delete QR Code": false}, "Reports": {"Monthly Report": true, "Payment Report": true}, "Attendance": {"View Attendance": true}, "Membership": {"View Membership": true},  "Fitness": {"FFT Results": false}, "Fundraising": {"Fundraising Inventory": false, "Fundraising Table": true} };
                            var collectionName = "Access Rights";
                            var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accessRightDetails);   
                            return {
                                success: true,
                                message: "New account with respectively access rights created successfully"
                            }
                    }
                    else if(accountDetails.role === "Finance")
                    {
                        var accountID = connectedDatabase.accountId;
                        var accessRightDetails = {"Account Details":{"Account ID": accountID, "Name": accountDetails.name, "Role": accountDetails.role}, "Account":{"Create Account": false, "Account Table": false, "Access Rights Table": false}, "Courses":{"Upload Courses": false, "NSA Courses": true, "ILP Courses": true, "Update Courses": false, "Delete Courses": false, 'Marriage Preparation Programme Courses': false}, "Registration And Payment": {"Registration And Payment Table": true, "Invoice Table": true}, "QR Code": {"Create QR Code": false, "QR Code Table": false, "Update QR Code": false, "Delete QR Code": false}, "Reports": {"Monthly Report": true, "Payment Report": true}, "Attendance": {"View Attendance": false}, "Membership": {"View Membership": false},  "Fitness": {"FFT Results": false}, "Fundraising": {"Fundraising Inventory": true, "Fundraising Table": true} };
                        var collectionName = "Access Rights";
                        var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accessRightDetails);   
                        return {
                                    success: true,
                                    message: "New account with respectively access rights created successfully"
                                }
                    }
                    else if(accountDetails.role === "Others")
                    {
                        var accountID = connectedDatabase.accountId;
                        var accessRightDetails = {"Account Details":{"Account ID": accountID, "Name": accountDetails.name, "Role": accountDetails.role}, "Account":{"Create Account": false, "Account Table": false, "Access Rights Table": false}, "Courses":{"Upload Courses": false, "NSA Courses": true, "ILP Courses": true, "Update Courses": false, "Delete Courses": false, 'Marriage Preparation Programme Courses': false}, "Registration And Payment": {"Registration And Payment Table": false, "Invoice Table": false}, "QR Code": {"Create QR Code": false, "QR Code Table": false, "Update QR Code": false, "Delete QR Code": false}, "Reports": {"Monthly Report": true, "Payment Report": true}, "Attendance": {"View Attendance": false}, "Membership": {"View Membership": false},  "Fitness": {"FFT Results": true}, "Fundraising": {"Fundraising Inventory": false, "Fundraising Table": false} };
                        var collectionName = "Access Rights";
                        var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accessRightDetails);   
                        return {
                                    success: true,
                                    message: "New account with respectively access rights created successfully"
                                }
                    }
                    else if(accountDetails.role === "Fitness Trainer")
                    {
                        var accountID = connectedDatabase.accountId;
                        var accessRightDetails = {"Account Details":{"Account ID": accountID, "Name": accountDetails.name, "Role": accountDetails.role}, "Account":{"Create Account": false, "Account Table": false, "Access Rights Table": false}, "Courses":{"Upload Courses": false, "NSA Courses": true, "ILP Courses": true, "Update Courses": false, "Delete Courses": false, 'Marriage Preparation Programme Courses': false}, "Registration And Payment": {"Registration And Payment Table": false, "Invoice Table": false}, "QR Code": {"Create QR Code": false, "QR Code Table": false, "Update QR Code": false, "Delete QR Code": false}, "Reports": {"Monthly Report": false, "Payment Report": false}, "Attendance": {"View Attendance": false}, "Membership": {"View Membership": false},  "Fitness": {"FFT Results": true}, "Fundraising": {"Fundraising Inventory": false, "Fundraising Table": false} };
                        var collectionName = "Access Rights";
                        var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, accessRightDetails);   
                        return {
                                    success: true,
                                    message: "New account with respectively access rights created successfully"
                                }
                    }
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

    async allAccounts() 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Accounts";
                var connectedDatabase = await this.databaseConnectivity.retrieveFromDatabase(databaseName, collectionName);   
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

    async deleteAccount(accountId) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Accounts";
                var connectedDatabase = await this.databaseConnectivity.deleteAccount(databaseName, collectionName, accountId);
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

module.exports = AccountController;
