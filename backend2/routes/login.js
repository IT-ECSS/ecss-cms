var express = require("express");
var router = express.Router();
var LoginController = require('../Controller/User/LoginController');
const { ObjectId } = require("mongodb");

router.post("/", async function(req, res) 
{
    if(req.body.purpose === "changePassword")
    {
        var {purpose, accountId, newPassword} = req.body;
        accountId = new ObjectId(accountId);
        var controller = new LoginController();
        var result = await controller.changePassword(accountId, newPassword);
        res.json(result);
    }
    else if(req.body.purpose === "resetPassword")
    {
        var {purpose, username, password} = req.body;
        console.log(req.body);
        var controller = new LoginController();
        var result = await controller.resetPassword(username, password);
        res.json(result);
    }
    else if(req.body.purpose === "logout")
    {
        var accountId = req.body.accountId;
        //console.log(email, password);
        var controller = new LoginController();
        var result = await controller.logout(accountId);
        console.log(result);
        res.json({"message": result});
    }
    else
    {
        var email = req.body.email;
        var password = req.body.password;
        //console.log(email, password);
        var controller = new LoginController();
        var result = await controller.login(email, password);
        console.log(result);
        res.json({"message": result});
    }
});

module.exports = router;