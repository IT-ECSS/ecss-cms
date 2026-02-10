var express = require('express');
var router = express.Router();
var InventoryController = require('../Controller/Inventory/InventoryController'); 

router.post('/', async function(req, res, next) 
{
    try {
        const io = req.app.get('io');
        
        if(req.body.purpose === "insert")
        {
            console.log("Insert Inventory Payload:", req.body.payload);
            var controller = new InventoryController();
            var result = await controller.insertInventory(req.body.payload);
            
            // Emit Socket.IO event to update frontend
            if (io && result && result.success) {
                console.log("Emitting inventory insert event to all connected clients");
                io.emit('inventory', {
                    action: 'insert',
                    data: result.data || {},
                    recordId: result.recordId || null
                });
            }
            
            return res.json(result || { success: false, error: 'No result returned' });
        }
        else if(req.body.purpose === "retrieve")
        {
            console.log("Retrieving Inventory Records");
            var controller = new InventoryController();
            var result = await controller.retrieveInventoryRecords();
            return res.json(result);
        }
    } catch (error) {
        console.error("Inventory route error:", error);
        return res.json({ success: false, error: error.message || 'An error occurred' });
    }
});

module.exports = router;
