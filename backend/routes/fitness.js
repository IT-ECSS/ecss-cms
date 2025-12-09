var express = require('express');
var router = express.Router();
const FitnessController = require('../Controller/Fitness/FitnessController');

router.post('/', async function(req, res, next) 
{
    if(req.body.purpose === "retrieve")
    {
        try {
            console.log("Retrieving FFT data");

            var controller = new FitnessController();
            var result = await controller.getFFTData();
            console.log("Retrieve FFT data result:", result);
            
            return res.json({
                success: result.success,
                message: result.message,
                data: result.data || null
            }); 
        } catch (error) {
            console.error("Retrieve FFT data error:", error);
            return res.status(500).json({
                success: false,
                message: "Error retrieving FFT data",
                data: null
            });
        }
    }
    else {
        res.status(400).json({
            success: false,
            message: "Invalid purpose. Expected 'retrieve', 'stats', or 'import'",
            data: null
        });
    }
});

module.exports = router;
