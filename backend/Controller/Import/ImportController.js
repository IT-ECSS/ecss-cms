const DatabaseConnectivity = require("../../database/databaseConnectivity"); // Import the class


class ImportController 
{
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity(); // Create an instance of DatabaseConnectivity
    }

    async massImport(formattedData)
    {
        try {
            // Connect to the database
            const result = await this.databaseConnectivity.initialize();
            console.log("Database Connectivity:", result);

            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Registration Forms";

                // Find the highest existing receipt number for the given course location
                const importResult = await this.databaseConnectivity.massImport(databaseName, collectionName, formattedData);
                console.log("Import Result:", importResult);


                // Return the newly generated receipt number
                return {
                    success: true,
                    message: "Mass Imported Successfully"
                };
            }
        } 
        catch (error) {
            return {
                success: false,
                message: "Mass Imported Failed",
                error: error
            };
        } 
        finally {
            await this.databaseConnectivity.close(); // Ensure the connection is closed
        }
    }
}

module.exports = ImportController;
