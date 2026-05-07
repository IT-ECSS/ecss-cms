var express = require('express');
var router = express.Router();
var AccountController = require('../Controller/Account/AccountController'); 
var AccessRightController = require('../Controller/Account/AccessRightController');
var { sendAccountCreatedEmail } = require('../Others/Email/accountCreatedEmail');

function getCurrentDateTime() {
    const now = new Date();

    // Get day, month, year, hours, and minutes
    const day = String(now.getDate()).padStart(2, '0'); // Ensure two digits
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format
    const minutes = String(now.getMinutes()).padStart(2, '0'); // Ensure two digits
    const seconds = String(now.getSeconds()).padStart(2, '0'); // Ensure two digits

    // Format date and time
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    return {
        date: formattedDate,
        time: formattedTime,
    };
}

router.post('/', async function(req, res, next) {
    if (req.body.purpose === "create") 
    {
        var { name, email, password, role, site } = req.body.accountDetails;
        console.log(role);
        const currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;

        // Uncomment and implement the controller if necessary
         var controller = new AccountController();
         var result = await controller.createAccount({ name, email, password, role, site, date_created: date, time_created: time, first_time_log_in: "Yes", date_log_in: "", time_log_in: "", date_log_out: "", time_log_out: "" });

        // Log the result if needed
        // console.log(result);
        //Test
        // If account creation is successful, send the email
         if (result.success === true) {

            sendAccountCreatedEmail({ name, email, password });
         }
         res.json({"message": result.message});
    }
    else if(req.body.purpose === "retrieve")
    {
        var controller = new AccountController();
        var result = await controller.allAccounts();
        return res.json({"result": result}); 
    }
    else if(req.body.purpose === "deleteAccount")
    {
       var controller = new AccountController();
        //console.log(req.body);
        var accountId = req.body.accountId;
        var result = await controller.deleteAccount(accountId);
        var controller1 = new AccessRightController();
        var result1 = await controller1.deleteAccessRights(accountId);
        console.log(result1);
        if(result === true&& result1 === true)
        {
            return res.json({"result": result}); 
        }
    }
});

module.exports = router;
