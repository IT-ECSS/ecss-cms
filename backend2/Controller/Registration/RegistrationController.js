const DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class
const fs = require('fs');
const path = require('path');
const XlsxPopulate = require('xlsx-populate');

class RegistrationController {
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

        // Method to get all participants
    async getAllParticipants() {
        try {
            console.log("Retrieving all participants...");
            var result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Company-Management-System";
                var collectionName = "Registration Forms";
                
                var getAllResult = await this.databaseConnectivity.getAllParticipants(
                    databaseName,
                    collectionName
                );
                //console.log("Get All Participants Result:", getAllResult);
                
                return {
                    success: getAllResult.success,
                    participants: getAllResult.participants || [],
                    count: getAllResult.participants ? getAllResult.participants.length : 0,
                    message: getAllResult.message || "Participants retrieved successfully"
                };
            } else {
                return {
                    success: false,
                    participants: [],
                    count: 0,
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Get all participants error:", error);
            return {
                success: false,
                participants: [],
                count: 0,
                message: "Error retrieving participants"
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    // Method to handle user registration
    async newParticipant(data) 
    {
        let db; // Variable to hold the database reference
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Registration Forms";
                var connectedDatabase = await this.databaseConnectivity.insertToDatabase(databaseName, collectionName, data);   
                console.log("Insert New Participants:", connectedDatabase);
                if(connectedDatabase.acknowledged === true)
                {
                    return {
                        success: true,
                        message: "User registered successfully",
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

    async allParticipants(role, siteIC) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var collectionName = "Registration Forms";
                var connectedDatabase = await this.databaseConnectivity.retrieveCourseRegistration(databaseName, collectionName, role, siteIC);   
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

    async updateParticipant(id, newStatus) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var connectedDatabase = await this.databaseConnectivity.updateInDatabase(databaseName, id, newStatus);  
                return connectedDatabase.acknowledged;
                //console.log("Update Participant",connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async updateParticipantParticulars(id, field, editedParticulars) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var connectedDatabase = await this.databaseConnectivity.updateParticipantParticulars(databaseName, id, field, editedParticulars);  
                return connectedDatabase.acknowledged;
                //console.log("Update Participant Particulars:",connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async updateReceiptNumber(id, receiptNo) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var connectedDatabase = await this.databaseConnectivity.updateReceiptNumberData(databaseName, id, receiptNo);  
                return connectedDatabase.acknowledged;
                //console.log(connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async deleteParticipant(id)
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System"; 
                var collectionName = "Registration Forms"
                var connectedDatabase = await this.databaseConnectivity.deleteFromParticipant(databaseName, collectionName, id);  
                return connectedDatabase.acknowledged;
                //console.log("Deleted Participants:", connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async portOverParticipant(id, selectedLocation)
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System"; 
                var collectionName = "Registration Forms"
                var connectedDatabase = await this.databaseConnectivity.portOverParticipant(databaseName, collectionName, id, selectedLocation);  
                return connectedDatabase.success;
                //console.log("Deleted Participants:", connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async updateOfficialUse(id, name, date, time, status)
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System"; 
                var connectedDatabase = await this.databaseConnectivity.updatePaymentOfficialUse(databaseName, id, name, date, time, status);  
                return connectedDatabase.acknowledged;
                //console.log("Updated Official Use:", connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }
    
    async updateConfirmationUse(id, name, date, time, status)
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System"; 
                var connectedDatabase = await this.databaseConnectivity.updateConfirmationOfficialUse(databaseName, id, name, date, time, status);  
                return connectedDatabase.acknowledged;
                //console.log("Updated Official Use:", connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }
    

    async updatePaymentMethod(id, newPaymentMethod, staff, date, time)
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System"; 
                var connectedDatabase = await this.databaseConnectivity.updatePaymentMethod(databaseName, id, newPaymentMethod, staff, date, time);  
                console.log("connectedDatabase:", connectedDatabase);
                return connectedDatabase.acknowledged;
                //console.log(connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async addRefundedDate(id, date) {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
    
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Company-Management-System"; 
                var collectionName = "Registration Forms"; // ✅ Defined collection name
    
                // Call addRefundedDate function in databaseConnectivity
                var updateResult = await this.databaseConnectivity.addRefundedDate(databaseName, collectionName, id, date);
    
                console.log("Update Result:", updateResult);
                return updateResult.acknowledged;
            }
        } catch (error) {
            console.error("Error adding Refunded Date:", error);
            return {
                success: false,
                message: "Error adding Refunded Date",
                error: error
            };
        } finally {
            await this.databaseConnectivity.close(); // ✅ Ensure the connection is closed
        }
    }

    async sendDetails(id) {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
    
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Company-Management-System"; 
                var collectionName = "Registration Forms"; // ✅ Defined collection name
    
                // Call addRefundedDate function in databaseConnectivity
                var updateResult = await this.databaseConnectivity.sendDetails(databaseName, collectionName, id);
    
                console.log("Update Result:", updateResult);
                return updateResult.acknowledged;
            }
        } catch (error) {
            console.error("Error adding Refunded Date:", error);
            return {
                success: false,
                message: "Error adding Refunded Date",
                error: error
            };
        } finally {
            await this.databaseConnectivity.close(); // ✅ Ensure the connection is closed
        }
    }
    
    async updateEntry(participantDetails)
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System"; 
                var collectionName = "Registration Forms";
                var connectedDatabase = await this.databaseConnectivity.updateRegistrationEntry(databaseName, collectionName, participantDetails);  
                return connectedDatabase.acknowledged;
                //console.log(connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async addCancellationRemarks(id, remarks)
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System"; 
                var collectionName = "Registration Forms";
                var connectedDatabase = await this.databaseConnectivity.addCancellationRemarks(databaseName, collectionName, id, remarks);  
                return connectedDatabase.acknowledged;
                //console.log(connectedDatabase);
            }
        } 
        catch (error) 
        {
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }

    async bulkUpdateParticipants(updates, staff, date, time)
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                
                // Process bulk updates using the database connectivity layer
                var connectedDatabase = await this.databaseConnectivity.bulkUpdateRegistrations(
                    databaseName, 
                    updates, 
                    staff, 
                    date, 
                    time
                );
                
                console.log("Bulk Update Result:", connectedDatabase);
                return connectedDatabase;
            }
        } 
        catch (error) 
        {
            console.error("Error in bulk update:", error);
            return {
                success: false,
                message: "Error performing bulk update",
                error: error
            };
        }
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }    
    }
}

module.exports = RegistrationController;
