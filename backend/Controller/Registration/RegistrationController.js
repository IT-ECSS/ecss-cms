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
                
                var getAllResult = await this.databaseConnectivity.retrieveCourseRegistration(
                    databaseName,
                    collectionName
                );
                //console.log("Get All Participants Result:", getAllResult);

                let participants = getAllResult.participants || [];

                return {
                    success: getAllResult.success,
                    participants,
                    count: participants.length,
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
            await this.databaseConnectivity.cleanup(); // Keep pooled connection warm for frequent table retrievals
        }    
    }

    async allParticipantsPaged(role, siteIC, skip = 0, limit = 300) {
        try {
            var result = await this.databaseConnectivity.initialize();
            if (result === "Connected to MongoDB Atlas!") {
                return await this.databaseConnectivity.retrieveCourseRegistrationPaged(
                    "Company-Management-System", "Registration Forms", role, siteIC, skip, limit
                );
            }
            return { data: [], total: 0 };
        } catch (error) {
            return { data: [], total: 0 };
        } finally {
            await this.databaseConnectivity.cleanup();
        }
    }

    async getParticipantById(id) {
        try {
            var result = await this.databaseConnectivity.initialize();
            if (result === "Connected to MongoDB Atlas!") {
                return await this.databaseConnectivity.retrieveRegistrationById(
                    "Company-Management-System", "Registration Forms", id
                );
            }
            return null;
        } catch (error) {
            console.error('getParticipantById error:', error);
            return null;
        } finally {
            await this.databaseConnectivity.cleanup();
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
        }    
    }

    async updateParticipantParticulars(id, field, editedParticulars, rowCourseType) 
    {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                console.log("Updating field in database:", field, "with value:", editedParticulars);
                var connectedDatabase = await this.databaseConnectivity.updateParticipantParticulars(databaseName, id, field, editedParticulars, rowCourseType);  
                console.log("Database response:", connectedDatabase);
                return connectedDatabase;
                //console.log("Update Participant Particulars:",connectedDatabase);
            }
        } 
        catch (error) 
        {
            console.error("Error in updateParticipantParticulars:", error);
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        finally {
        }    
    }

    async clearPaymentDetails(id)
    {
        try {
            var result = await this.databaseConnectivity.initialize();
            if(result === "Connected to MongoDB Atlas!")
            {
                var databaseName = "Company-Management-System";
                var connectedDatabase = await this.databaseConnectivity.clearPaymentDetails(databaseName, id);
                return connectedDatabase?.acknowledged ?? false;
            }
        }
        catch (error)
        {
            return { success: false, message: "Error clearing payment details", error };
        }
        finally {
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
                console.log("✅ [Controller] Receipt number updated:", { id, receiptNo, acknowledged: connectedDatabase.acknowledged });
                return connectedDatabase.acknowledged;
                //console.log(connectedDatabase);
            }
        } 
        catch (error) 
        {
            console.error("❌ [Controller] Error updating receipt number:", error);
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        // NOTE: Do NOT close connection here - let connection pool manage it
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
        // NOTE: Do NOT close connection here - let connection pool manage it
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
        // NOTE: Do NOT close connection here - let connection pool manage it
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
                console.log("✅ [Controller] Official use updated:", { id, status, acknowledged: connectedDatabase.acknowledged });
                
                // For Refunded status, return the refund date/time so frontend can display them
                if (status === "Refunded") {
                    return {
                        acknowledged: connectedDatabase.acknowledged,
                        refundedDate: date,
                        refundedTime: time,
                    };
                }
                
                return connectedDatabase.acknowledged;
                //console.log("Updated Official Use:", connectedDatabase);
            }
        } 
        catch (error) 
        {
            console.error("❌ [Controller] Error updating official use:", error);
            return {
                success: false,
                message: "Error updating user",
                error: error
            };
        }
        // NOTE: Do NOT close connection here - let connection pool manage it
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
                return connectedDatabase;  // Return full object with updatedDocument
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
        }    
    }

async addRefundedDate(id, date, time) {
        try {
            // Connect to the database
            var result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);
    
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Company-Management-System"; 
                var collectionName = "Registration Forms"; // ✅ Defined collection name
                
                // Call addRefundedDate function in databaseConnectivity
                var updateResult = await this.databaseConnectivity.addRefundedDate(databaseName, collectionName, id, date, time);
    
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
        }    
    }
}

module.exports = RegistrationController;
