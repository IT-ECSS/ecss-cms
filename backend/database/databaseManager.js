const DatabaseConnectivity = require('./databaseConnectivity');

class DatabaseManager {
    constructor() {
        if (DatabaseManager.instance) {
            return DatabaseManager.instance;
        }
        
        this.databaseConnectivity = new DatabaseConnectivity();
        this.isInitialized = false;
        this.initializationPromise = null;
        DatabaseManager.instance = this;
    }

    async initialize() {
        // Handle concurrent initialization requests
        if (this.initializationPromise) {
            console.log("Database Manager initialization already in progress, waiting...");
            await this.initializationPromise;
            return this.databaseConnectivity;
        }

        if (!this.isInitialized) {
            try {
                console.log("Starting Database Manager initialization for multiple user access...");
                this.initializationPromise = this.databaseConnectivity.initialize();
                await this.initializationPromise;
                this.isInitialized = true;
                this.initializationPromise = null;
                console.log("Database Manager initialized successfully for concurrent access");
            } catch (error) {
                this.initializationPromise = null;
                console.error("Failed to initialize Database Manager:", error);
                throw error;
            }
        }
        return this.databaseConnectivity;
    }

    getConnection() {
        if (!this.isInitialized) {
            throw new Error("Database Manager not initialized. Call initialize() first.");
        }
        return this.databaseConnectivity;
    }

    async shutdown() {
        if (this.isInitialized && this.databaseConnectivity) {
            await this.databaseConnectivity.close();
            this.isInitialized = false;
            this.initializationPromise = null;
            console.log("Database Manager shutdown complete");
        }
    }
}

// Export a singleton instance
module.exports = new DatabaseManager();
