var express = require("express");
var router = express.Router();
var ParticipantsController = require('../Controller/Participants/ParticipantsController');

router.post("/", async function(req, res) 
{
    if(req.body.purpose === "login")
    {
        var userName = req.body.userName;
        var password = req.body.password;
        //console.log(userName, password);
        var controller = new ParticipantsController();
        var result = await controller.login(userName, password);
        console.log(result);
        res.json({"success": result.success, "message": result.message, "details": result.details});
    }
    else if(req.body.purpose === "update")
    {
        // Extract all participant fields from request body
        var updateData = {
            _id: req.body._id,
            name: req.body.name,
            nric: req.body.nric,
            residentialStatus: req.body.residentialStatus,
            race: req.body.race,
            gender: req.body.gender,
            contactNumber: req.body.contactNumber,
            email: req.body.email,
            postalCode: req.body.postalCode,
            educationLevel: req.body.educationLevel,
            workStatus: req.body.workStatus,
            dateOfBirth: req.body.dateOfBirth
        };

        // Validate required fields
        if (!updateData._id) {
            return res.status(400).json({
                "success": false, 
                "message": "Participant ID is required for update"
            });
        }

        console.log("Update data:", updateData);
        var controller = new ParticipantsController();
        var result = await controller.update(updateData);
        console.log(result);
        res.json({"success": result.success, "message": result.message});
    }
    else
    {
        res.status(400).json({
            "success": false,
            "message": "Invalid purpose. Expected 'login' or 'update'"
        });
    }
});

module.exports = router;