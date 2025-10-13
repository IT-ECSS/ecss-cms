var express = require("express");
var router = express.Router();
var AttendanceController = require('../Controller/Attendance/AttendanceController');

// Helper function to format time as hh:mm:ss in Singapore Standard Time (SST)
function getCurrentTime() {
    const now = new Date();
    // Convert to Singapore timezone (UTC+8)
    const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const hours = String(singaporeTime.getHours()).padStart(2, '0');
    const minutes = String(singaporeTime.getMinutes()).padStart(2, '0');
    const seconds = String(singaporeTime.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Helper function to format date as dd/mm/yyyy in Singapore Standard Time (SST)
function getCurrentDate() {
    const now = new Date();
    // Convert to Singapore timezone (UTC+8)
    const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const day = String(singaporeTime.getDate()).padStart(2, '0');
    const month = String(singaporeTime.getMonth() + 1).padStart(2, '0');
    const year = singaporeTime.getFullYear();
    return `${day}/${month}/${year}`;
}

router.post("/", async function(req, res) 
{
    if(req.body.purpose === "insert")
    {
        console.log("Received request to insert attendance record", req.body);
        // Get current date and time in specified formats
        const currentDate = getCurrentDate(); // dd/mm/yyyy format
        const currentTime = getCurrentTime(); // hh:mm:ss format (24-hour)
        
        // Extract all attendance fields from request body
        var insertData = {
            name: req.body.name,
            nric: req.body.nric,
            type: req.body.type,
            qrCode: req.body.qrCode,
            time: currentTime,
            date: currentDate,
           // status: req.body.status || "Present"
        };

        // Validate required fields
        if (!insertData.name || !insertData.nric) {
            return res.status(400).json({
                "success": false, 
                "message": "Name and NRIC are required for attendance record"
            });
        }
        

        console.log("Insert attendance data:", insertData);
        var controller = new AttendanceController();
        var result = await controller.insertAttendance(insertData);
        console.log(result);
        res.json({"success": result.success, "message": result.message});
    }
    else if(req.body.purpose === "retrieve")
    {
        try {
            console.log("Received request to retrieve attendance records", req.body);
            
            var controller = new AttendanceController();
            var result = await controller.getAttendance({});
            
            console.log("Retrieved attendance records:", result);
            
            if (result.success) {
                res.json({
                    "success": result.success, 
                    "message": result.message,
                    "data": result.details,
                    "count": result.details ? result.details.length : 0
                });
            } else {
                res.json({
                    "success": result.success, 
                    "message": result.message,
                    "data": [],
                    "count": 0
                });
            }
            
        } catch (error) {
            console.error("Retrieve attendance error:", error);
            res.status(500).json({
                "success": false,
                "message": "Error retrieving attendance records",
                "error": error.message,
                "data": [],
                "count": 0
            });
        }
    }
    else if(req.body.purpose === "retrieveAll")
    {
        try {
            console.log("Received request to retrieve all attendance records", req.body);
            
            var controller = new AttendanceController();
            var result = await controller.getAttendanceAll();

            console.log("Retrieved all attendance records:", result);

            if (result.success) {
                res.json({
                    "success": result.success, 
                    "message": result.message,
                    "data": result.details,
                });
            } else {
                res.json({
                    "success": result.success, 
                    "message": result.message,
                });
            }
            
        } catch (error) {
            console.error("Retrieve attendance error:", error);
            res.status(500).json({
                "success": false,
                "message": "Error retrieving attendance records",
                "error": error.message,
                "data": [],
                "count": 0
            });
        }
    }
 
    else
    {
        res.status(400).json({
            "success": false,
            "message": "Invalid purpose. Expected 'insert'"
        });
    }
});

module.exports = router;