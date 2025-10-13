const DatabaseConnectivity = require('./databaseConnectivity');

class DatabaseManager {
    constructor() {
        if (DatabaseManager.instance) {
            return DatabaseManager.instance;
        }
        
        this.databaseConnectivity = new DatabaseConnectivity();
        this.isInitialized = false;
        DatabaseManager.instance = this;
    }

    async initialize() {
        if (!this.isInitialized) {
            try {
                await this.databaseConnectivity.initialize();
                this.isInitialized = true;
                console.log("Database Manager initialized successfully");
            } catch (error) {
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
            console.log("Database Manager shutdown complete");
        }
    }
}

// Export a singleton instance
module.exports = new DatabaseManager();
