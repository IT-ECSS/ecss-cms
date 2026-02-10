var express = require('express');
var router = express.Router();
var InventoryController = require('../Controller/Inventory/InventoryController'); 

router.post('/', async function(req, res, next) 
{
    if(req.body.purpose === "insert")
    {
        console.log("Insert Inventory Payload:", req.body.payload);
        var controller = new InventoryController();
        var result = await controller.insertInventory(req.body.payload);
        
        return res.json(result);
    }
    else if(req.body.purpose === "retrieve")
    {
        console.log("Retrieving Inventory Records");
        var controller = new InventoryController();
        var result = await controller.retrieveInventoryRecords();
        return res.json(result);
    }
});

module.exports = router;
