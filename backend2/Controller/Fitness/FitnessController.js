// FitnessController.js
const DatabaseConnectivity = require('../../database/databaseConnectivity');
const fs = require('fs');
const path = require('path');

class FitnessController {
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity();
    }

    async getFFTData() {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fitness";

                // Try to get data from database
                const fftData = await this.databaseConnectivity.retrieveFromDatabase(
                    databaseName, 
                    collectionName
                );

                if (fftData && fftData.length > 0) {
                    console.log(`Retrieved ${fftData.length} FFT records from database`);
                    return {
                        success: true,
                        message: "FFT data retrieved successfully",
                        data: fftData,
                        source: 'database'
                    };
                } else {
                    // If no data in database, load from JSON file and save to database
                    const jsonFilePath = path.join(__dirname, '../../fft_combined_cthub.json');
                    
                    if (fs.existsSync(jsonFilePath)) {
                        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
                        
                        // Save to database for future use
                        if (jsonData.length > 0) {
                            await this.databaseConnectivity.insertManyDocuments(
                                databaseName,
                                collectionName,
                                jsonData
                            );
                            console.log(`Imported ${jsonData.length} FFT records to database from JSON file`);
                        }
                        
                        return {
                            success: true,
                            message: "FFT data loaded from JSON file",
                            data: jsonData,
                            source: 'json_file'
                        };
                    } else {
                        return {
                            success: false,
                            message: 'No FFT data found in database or JSON file',
                            data: null
                        };
                    }
                }
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    data: null
                };
            }
        } catch (error) {
            console.error("Error retrieving FFT data:", error);
            return {
                success: false,
                message: "Error retrieving FFT data",
                data: null
            };
        }
    }

    async getFFTStats() {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fitness";

                // Get all FFT data to calculate stats
                const fftData = await this.databaseConnectivity.findAllDocuments(
                    databaseName, 
                    collectionName
                );

                if (fftData) {
                    const totalParticipants = fftData.length;
                    const participants2024 = fftData.filter(item => item['2024']).length;
                    const participants2025 = fftData.filter(item => item['2025']).length;
                    const participantsBothYears = fftData.filter(item => item['2024'] && item['2025']).length;

                    return {
                        success: true,
                        message: "FFT statistics retrieved successfully",
                        stats: {
                            total: totalParticipants,
                            year2024: participants2024,
                            year2025: participants2025,
                            bothYears: participantsBothYears
                        }
                    };
                } else {
                    return {
                        success: false,
                        message: "No FFT data found",
                        stats: null
                    };
                }
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    stats: null
                };
            }
        } catch (error) {
            console.error("Error retrieving FFT stats:", error);
            return {
                success: false,
                message: "Error retrieving FFT statistics",
                stats: null
            };
        }
    }

    async importFFTData({ data }) {
        try {
            if (!data || !Array.isArray(data)) {
                return {
                    success: false,
                    message: 'Invalid data format. Expected an array of FFT records.',
                    insertedCount: 0
                };
            }

            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Fitness";

                // Clear existing data and insert new data
                await this.databaseConnectivity.deleteAllDocuments(databaseName, collectionName);
                const insertResult = await this.databaseConnectivity.insertManyDocuments(
                    databaseName,
                    collectionName,
                    data
                );

                return {
                    success: true,
                    message: `Successfully imported ${data.length} FFT records`,
                    insertedCount: data.length
                };
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    insertedCount: 0
                };
            }
        } catch (error) {
            console.error("Error importing FFT data:", error);
            return {
                success: false,
                message: "Error importing FFT data",
                insertedCount: 0
            };
        }
    }
}

module.exports = FitnessController;
