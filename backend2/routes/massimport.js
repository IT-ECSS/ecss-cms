var express = require('express');
var router = express.Router();
var importController = require('../Controller/Import/ImportController'); 

router.post('/', async function(req, res, next) 
{
    try
    {
        if(req.body.purpose === "massimport")
        {
            var controller = new importController();
            console.log("Data Passed From Frontend:", req.body);
            var result = await controller.massImport(req.body.formattedData);
            return res.json({"result": result}); 
        }
    }
    catch(e)
    {
        console.error("Error:", e);
    }
});

module.exports = router;
