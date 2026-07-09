var express = require("express");
var router = express.Router();
var LoginController = require('../Controller/User/LoginController');
const { ObjectId } = require("mongodb");
var { sendPasswordResetEmail } = require('../Others/Email/passwordResetEmail');

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

        // Return safe account details (never the password) so the frontend can auto-login
        var accountDetails = null;
        if (result.success === true && result.account) {
            // Notify the account holder by email that their password has been reset
            sendPasswordResetEmail({ name: result.account.name, email: result.account.email, password });

            accountDetails = {
                _id: result.account._id,
                name: result.account.name,
                email: result.account.email,
                role: result.account.role,
                site: result.account.site
            };
        }

        res.json({ message: result.message, success: result.success, account: accountDetails });
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