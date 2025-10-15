var express = require('express');
var router = express.Router();
var FundraisingController = require('../Controller/Fundraising/FundraisingController');

router.post('/', async function(req, res, next) 
{
    // Initialize controllers once at the top
    const fundraisingController = new FundraisingController();
    //const io = req.app.get('io');
    
    try {
        if(req.body.purpose === "insert") {
           //console.log("Fundraising order received:", req.body);
            
            // Save the fundraising order
            const result = await fundraisingController.saveFundraisingOrder(req.body.orderData);
            
            return res.json({ 
                result: result
            });
        }
        else if(req.body.purpose === "retrieve") {
            const result = await fundraisingController.getFundraisingOrders();
            console.log("Retrieve result:", result);
            
            return res.json({ 
                result: result
            });
        }
    } catch (error) {
        console.error("Fundraising route error:", error);
        return res.status(500).json({ 
            result: {
                success: false,
                message: "Internal server error",
                error: error.message
            }
        });
    }
});

module.exports = router;