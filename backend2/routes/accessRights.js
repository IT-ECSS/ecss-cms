var express = require('express');
var router = express.Router();
var AccessRightController = require('../Controller/Account/AccessRightController'); 

router.post('/', async function(req, res, next) 
{
    if(req.body.purpose === "retrieve")
    {
        var controller = new AccessRightController();
        var result = await controller.allAccountsWithAccessRight();
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "retrieveAccessRight")
    {
        var controller = new AccessRightController();
        var result = await controller.allAccessRights(req.body.accountId);
        console.log("All Accounts With Access Right:", result);
        return res.json({"result": result});
    }
    else if(req.body.purpose === "updateAccessRight")
    {
        console.log(req.body);
        var controller = new AccessRightController();

        var result = await controller.updateAccessRight(req.body.accessRightId, req.body.accessRight) ;
        //console.log(result);
        return res.json({"result": result});
    }
});

module.exports = router;
