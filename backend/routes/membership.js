var express = require("express");
var router = express.Router();
var MembershipController = require('../Controller/Membership/MembershipController');

router.post("/", async function(req, res) 
{
    if(req.body.purpose === "retrieveAll")
    {
        try {
            console.log("Received request to retrieve all membership records", req.body);
            
            var controller = new MembershipController();
            var result = await controller.getMembershipAll();

            console.log("Retrieved all membership records:", result);

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