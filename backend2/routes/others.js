const DatabaseConnectivity = require("../database/databaseConnectivity"); // Adjust path as needed

class ImportController {
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    async retrieveAllData() {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Registration Forms";

                // Retrieve all data from the database
                const retrieveResult = await this.databaseConnectivity.findAllParticipants(databaseName, collectionName);
                console.log("Retrieve All Result:", retrieveResult);

                // Return all data in full
                return {
                    success: true,
                    message: "All Data Retrieved Successfully",
                    data: retrieveResult,
                    count: retrieveResult.length
                };
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    error: "Could not establish connection to MongoDB Atlas"
                };
            }
        } 
        catch (error) {
            console.error("Retrieve all data error:", error);
            return {
                success: false,
                message: "Data Retrieval Failed",
                error: {
                    message: error.message,
                    stack: error.stack
                }
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }


    async migrateToParticipantsCollection() {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const sourceCollectionName = "Registration Forms";
                const targetCollectionName = "Participants";

                // Retrieve all data from Registration Forms
                console.log("Retrieving data from Registration Forms...");
                const sourceData = await this.databaseConnectivity.findAllParticipants(databaseName, sourceCollectionName);
                
                if (sourceData && sourceData.participants && sourceData.participants.length > 0) {
                    // Extract just the participant details for migration
                    const participantsToMigrate = sourceData.participants.map(item => item.participantDetails);
                    
                    console.log(`Migrating ${participantsToMigrate.length} participants to ${targetCollectionName}...`);
                    
                    // Insert into Participants collection
                    const migrationResult = await this.databaseConnectivity.massImport(databaseName, targetCollectionName, participantsToMigrate);
                    
                    return {
                        success: true,
                        message: "Migration to Participants collection completed successfully",
                        data: {
                            sourceCollection: sourceCollectionName,
                            targetCollection: targetCollectionName,
                            totalRecordsProcessed: sourceData.statistics.totalRecords,
                            uniqueParticipantsMigrated: participantsToMigrate.length,
                            duplicatesRemoved: sourceData.statistics.duplicatesRemoved,
                            migrationResult: migrationResult
                        }
                    };
                } else {
                    return {
                        success: false,
                        message: "No data found in Registration Forms collection",
                        data: sourceData
                    };
                }
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    error: "Could not establish connection to MongoDB Atlas"
                };
            }
        } catch (error) {
            console.error("Migration error:", error);
            return {
                success: false,
                message: "Migration Failed",
                error: {
                    message: error.message,
                    stack: error.stack
                }
            };
        } finally {
            await this.databaseConnectivity.close();
        }
    }
}

// Execute when file is run directly
if (require.main === module) {
    async function main() {
        const importController = new ImportController();
        
        try {
            console.log("Starting migration process...");
            
            // Migrate data to Participants collection
            const migrationResult = await importController.migrateToParticipantsCollection();
            console.log("Migration Result:", JSON.stringify(migrationResult, null, 2));
            
        } catch (error) {
            console.error("Main execution error:", error);
        }
    }
    
    main();
}