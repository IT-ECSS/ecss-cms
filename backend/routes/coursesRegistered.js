var express = require('express');
var router = express.Router();
const CourseRegisteredController = require('../Controller/CourseRegistered/CourseRegisteredController'); // Adjust path as needed

router.post('/', async function(req, res, next) 
{
    if(req.body.purpose === "getRegisteredCourses") // Changed from "retrieve" to "getRegisteredCourses"
    {
        try {
            const { nric } = req.body;
            console.log("Retrieving courses for NRIC:", nric);

            // Validate NRIC input
            if (!nric) {
                return res.status(400).json({
                    success: false,
                    message: "NRIC is required",
                    courses: null
                });
            }

            var controller = new CourseRegisteredController();
            var result = await controller.retrievedCourse({ nric });
            
            // Enhanced response format matching Kotlin data class
            return res.json({
                success: result.success,
                message: result.message,
                courses: result.courses || [] // Changed from 'data' to 'courses' to match Kotlin model
            }); 
        } catch (error) {
            console.error("Retrieve courses error:", error);
            return res.status(500).json({
                success: false,
                message: "Error retrieving courses",
                courses: null
            });
        }
    }
    else {
        res.status(400).json({
            success: false,
            message: "Invalid purpose. Expected 'getRegisteredCourses'", // Updated error message
            courses: null
        });
    }
});

module.exports = router;