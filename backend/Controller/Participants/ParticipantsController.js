//const Account = require("../../Entity/Account"); // Import the Account class
var DatabaseConnectivity = require("../../database/databaseConnectivity");

class ParticipantsController 
{
  constructor() 
  {
    this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
  }

  // Handle user login
  async login(username, password)
  {
    try 
    {
      console.log(username, password);
      var result = await this.databaseConnectivity.initialize();
      if(result === "Connected to MongoDB Atlas!")
      {
        var databaseName = "Company-Management-System";
        var collectionName = "Members_Volunteers";
        var connectedDatabase = await this.databaseConnectivity.participantsLogin(databaseName, collectionName, username, password);
        //console.log(connectedDatabase.message);
        return {"success": connectedDatabase.success, "message": connectedDatabase.message, "details": connectedDatabase.user};   
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
    finally 
    {
      await this.databaseConnectivity.close(); // Ensure the connection is closed
    }   
  }

    // In ParticipantsController.js
  async update(updateData)
  {
      try 
      {
          console.log("Updating participant:", updateData);
          var result = await this.databaseConnectivity.initialize();
          if(result === "Connected to MongoDB Atlas!")
          {
              var databaseName = "Company-Management-System";
              var collectionName = "Members_Volunteers";
              
              var updateResult = await this.databaseConnectivity.updateParticipant(
                  databaseName, 
                  collectionName, 
                  updateData._id, 
                  updateData
              );
              
              return {
                  "success": updateResult.success, 
                  "message": updateResult.message, 
              };   
          } else {
              return {
                  success: false,
                  message: "Database connection failed"
              };
          }
      } 
      catch (error) 
      {
          console.error("Update error:", error);
          return {
              success: false,
              message: "Error updating participant"    
          };
      }
      finally 
      {
          await this.databaseConnectivity.close();
      }   
  }

    async addParticipant(participantData) {
      try {
          console.log("Adding participant:", participantData);
          var result = await this.databaseConnectivity.initialize();
          if(result === "Connected to MongoDB Atlas!") {
              var databaseName = "Company-Management-System";
              var collectionName = "Members_Volunteers";
              var insertResult = await this.databaseConnectivity.insertParticipant(
                  databaseName,
                  collectionName,
                  participantData
              );
              return {
                  success: insertResult.success,
                  message: insertResult.message,
                  details: insertResult.details
              };
          } else {
              return {
                  success: false,
                  message: "Database connection failed"
              };
          }
      } catch (error) {
          console.error("Add participant error:", error);
          return {
              success: false,
              message: "Error adding participant"
          };
      } finally {
          await this.databaseConnectivity.close();
      }
  }

    // Method to check for duplicate participants by NRIC and phone (legacy method)
    async checkForDuplicates(nric, phone) {
        try {
            console.log("Checking for duplicates with NRIC:", nric, "and phone:", phone);
            var result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Company-Management-System";
                var collectionName = "Members_Volunteers";
                
                var duplicateCheck = await this.databaseConnectivity.findParticipantByNricAndPhone(
                    databaseName,
                    collectionName,
                    nric,
                    phone
                );
                
                return {
                    success: duplicateCheck.success,
                    found: duplicateCheck.found,
                    participants: duplicateCheck.participants,
                    duplicateType: duplicateCheck.duplicateType,
                    canUpdate: duplicateCheck.canUpdate,
                    message: duplicateCheck.message
                };
            } else {
                return {
                    success: false,
                    found: false,
                    participants: [],
                    duplicateType: null,
                    canUpdate: false,
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Duplicate check error:", error);
            return {
                success: false,
                found: false,
                participants: [],
                duplicateType: null,
                canUpdate: false,
                message: "Error checking for duplicates"
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    // Enhanced smart duplicate checking method (traditional methods only)
    async checkForSmartDuplicates(participantData) {
        try {
            console.log("Running smart duplicate check for:", participantData.participantName);
            
            var result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Company-Management-System";
                var collectionName = "Members_Volunteers";
                
                // Enhanced traditional duplicate checking with fuzzy name matching
                var duplicateCheck = await this.databaseConnectivity.findParticipantByNricPhoneAndName(
                    databaseName,
                    collectionName,
                    participantData.nric,
                    participantData.phoneNumber,
                    participantData.participantName
                );

                return {
                    success: duplicateCheck.success,
                    hasDuplicates: duplicateCheck.found,
                    duplicates: duplicateCheck.participants,
                    duplicateType: duplicateCheck.duplicateType,
                    canUpdate: duplicateCheck.canUpdate,
                    message: duplicateCheck.message,
                    recommendation: duplicateCheck.recommendation || 'PROCEED_WITH_REGISTRATION'
                };
                
            } else {
                return {
                    success: false,
                    hasDuplicates: false,
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Smart duplicate check error:", error);
            return {
                success: false,
                hasDuplicates: false,
                message: `Smart duplicate detection failed: ${error.message}`,
                error: error.message
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    

    // Enhanced duplicate checking (traditional methods with smart features)
    async checkForHybridDuplicates(participantData) {
        try {
            console.log("Running enhanced duplicate check for:", participantData.participantName);
            
            // First run traditional exact matching for immediate duplicates
            const traditionalCheck = await this.checkForDuplicates(
                participantData.nric, 
                participantData.phoneNumber
            );

            // If exact duplicates found (both NRIC and phone match), return immediately for update
            if (traditionalCheck.found && traditionalCheck.duplicateType === 'both') {
                return {
                    success: true,
                    duplicateFound: true,
                    duplicateType: 'EXACT_DUPLICATE',
                    method: 'TRADITIONAL',
                    canUpdate: traditionalCheck.canUpdate,
                    participants: traditionalCheck.participants,
                    message: "Exact duplicate found (NRIC and phone match)",
                    recommendation: 'UPDATE_EXISTING_PROFILE'
                };
            }

            // If partial matches found, run enhanced smart checking
            if (traditionalCheck.found) {
                const smartCheck = await this.checkForSmartDuplicates(participantData);
                
                return {
                    success: true,
                    duplicateFound: true,
                    duplicateType: `TRADITIONAL_${traditionalCheck.duplicateType.toUpperCase()}`,
                    method: 'ENHANCED_TRADITIONAL',
                    traditionalResult: traditionalCheck,
                    smartResult: smartCheck,
                    recommendation: this.determineRecommendation(traditionalCheck, smartCheck),
                    message: this.generateEnhancedMessage(traditionalCheck, smartCheck)
                };
            }

            // Run smart check for potential name/email similarities
            const smartCheck = await this.checkForSmartDuplicates(participantData);
            
            return {
                success: true,
                duplicateFound: smartCheck.hasDuplicates,
                duplicateType: smartCheck.hasDuplicates ? 'SMART_SIMILARITY_MATCH' : 'NO_DUPLICATE',
                method: 'SMART_TRADITIONAL',
                smartResult: smartCheck,
                recommendation: smartCheck.recommendation || 'PROCEED_WITH_REGISTRATION',
                message: smartCheck.message || "No duplicates detected"
            };
            
        } catch (error) {
            console.error("Enhanced duplicate check error:", error);
            return {
                success: false,
                duplicateFound: false,
                message: `Enhanced duplicate check failed: ${error.message}`,
                error: error.message
            };
        }
    }

    // Method to find participants by NRIC only
    async findByNRIC(nric) {
        try {
            console.log("Finding participants by NRIC:", nric);
            var result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Company-Management-System";
                var collectionName = "Members_Volunteers";
                
                var findResult = await this.databaseConnectivity.findParticipantsByNRIC(
                    databaseName,
                    collectionName,
                    nric
                );
                
                return {
                    success: findResult.success,
                    found: findResult.found,
                    participants: findResult.participants || [],
                    message: findResult.message
                };
            } else {
                return {
                    success: false,
                    found: false,
                    participants: [],
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Find by NRIC error:", error);
            return {
                success: false,
                found: false,
                participants: [],
                message: "Error finding participants by NRIC"
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }

    // Method to find participants by phone number only
    async findByPhone(phoneNumber) {
        try {
            console.log("Finding participants by phone:", phoneNumber);
            var result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                var databaseName = "Company-Management-System";
                var collectionName = "Members_Volunteers";
                
                var findResult = await this.databaseConnectivity.findParticipantsByPhone(
                    databaseName,
                    collectionName,
                    phoneNumber
                );
                
                return {
                    success: findResult.success,
                    found: findResult.found,
                    participants: findResult.participants || [],
                    message: findResult.message
                };
            } else {
                return {
                    success: false,
                    found: false,
                    participants: [],
                    message: "Database connection failed"
                };
            }
        } catch (error) {
            console.error("Find by phone error:", error);
            return {
                success: false,
                found: false,
                participants: [],
                message: "Error finding participants by phone"
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }



    // Helper method to determine recommendation based on traditional results
    determineRecommendation(traditionalResult, smartResult) {
        if (traditionalResult.duplicateType === 'both') {
            return 'UPDATE_EXISTING_PROFILE';
        } else if (traditionalResult.duplicateType === 'nric') {
            return 'BLOCK_REGISTRATION_NRIC_CONFLICT';
        } else if (traditionalResult.duplicateType === 'phone') {
            return 'MANUAL_REVIEW_PHONE_CONFLICT';
        } else if (smartResult?.hasDuplicates) {
            return 'FLAG_FOR_REVIEW';
        } else {
            return 'PROCEED_WITH_REGISTRATION';
        }
    }

    // Helper method to generate enhanced analysis message
    generateEnhancedMessage(traditionalResult, smartResult) {
        if (traditionalResult.found && smartResult?.hasDuplicates) {
            return `Traditional duplicate found (${traditionalResult.duplicateType}). Smart analysis also detected similarities: ${smartResult.message}`;
        } else if (traditionalResult.found) {
            return `Traditional duplicate detection: ${traditionalResult.message}`;
        } else if (smartResult?.hasDuplicates) {
            return `Smart analysis detected potential similarities: ${smartResult.message}`;
        } else {
            return "No duplicates detected by traditional or smart analysis";
        }
    }
}

module.exports = ParticipantsController;
