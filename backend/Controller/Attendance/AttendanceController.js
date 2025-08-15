const DatabaseConnectivity = require('../../database/databaseConnectivity');

class AttendanceController {
    constructor() {
        this.databaseConnectivity = new DatabaseConnectivity();
    }

    async insertAttendance(insertData) {
        try {
            console.log("Inserting attendance record:", insertData);
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Attendance";
                
                const insertResult = await this.databaseConnectivity.insertAttendanceRecord(
                    databaseName, 
                    collectionName, 
                    insertData
                );
                
                return {
                    "success": insertResult.success, 
                    "message": insertResult.message, 
                    "details": insertResult.details
                };   
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    error: "Could not establish connection to MongoDB Atlas"
                };
            }
        } catch (error) {
            console.error("Insert attendance error:", error);
            return {
                success: false,
                message: "Error inserting attendance record",
                error: error.message
            };
        } finally {
            await this.databaseConnectivity.close();
        }   
    }

    async getAttendance(filterData = {}) {
        try {
            console.log("Retrieving attendance records with filter:", filterData);
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Attendance";
                
                const attendanceRecords = await this.databaseConnectivity.getAttendanceRecords(
                    databaseName, 
                    collectionName, 
                    filterData
                );
                
                return {
                    "success": attendanceRecords.success, 
                    "message": attendanceRecords.message, 
                    "details": attendanceRecords.data || []
                };   
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    error: "Could not establish connection to MongoDB Atlas",
                    details: []
                };
            }
        } catch (error) {
            console.error("Get attendance error:", error);
            return {
                success: false,
                message: "Error retrieving attendance records",
                error: error.message,
                details: []
            };
        } finally {
            await this.databaseConnectivity.close();
        }   
    }

    async getAttendanceAll() {
        try {
            const result = await this.databaseConnectivity.initialize();
            
            if (result === "Connected to MongoDB Atlas!") {
                const databaseName = "Company-Management-System";
                const collectionName = "Attendance";
                console.log("Retrieving all attendance records without filter");

                const attendanceRecords = await this.databaseConnectivity.getAllAttendanceRecords(
                    databaseName, 
                    collectionName
                );

                console.log("Retrieved all attendance records:", attendanceRecords);
                
                return {
                    "success": attendanceRecords.success, 
                    "message": attendanceRecords.message, 
                    "details": attendanceRecords.data
                };   
            } else {
                return {
                    success: false,
                    message: "Database connection failed",
                    error: "Could not establish connection to MongoDB Atlas",
                    details: []
                };
            }
        } catch (error) {
            console.error("Get attendance error:", error);
            return {
                success: false,
                message: "Error retrieving attendance records",
                error: error.message,
                details: []
            };
        } finally {
            await this.databaseConnectivity.close();
        }   
    }
}

module.exports = AttendanceController;