var express = require('express');
var router = express.Router();
var ReceiptController = require('../Controller/Receipt/ReceiptController');

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

router.post('/', async function(req, res, next) 
{
    if(req.body.purpose === "getReceiptNo")
    {   
        var controller = new ReceiptController();
        console.log("Body data123:", req.body);
        if(req.body.courseType === "Marriage Preparation Programme")
        {
            // Handle specific logic for Marriage Preparation Programme
           var result = await controller.newReceiptNo(req.body.courseLocation, req.body.centreLocation, req.body.courseType, req.body.courseEngName, req.body.courseDuration);
        }
        else
        {
            var result = await controller.newReceiptNo(req.body.courseLocation, req.body.centreLocation);
        }

        //console.log("New Receipt No:", result);
        return res.json({"result": result});
    }
    else if(req.body.purpose === "createReceipt")
    {
       console.log("Create Reciept:", req.body);
        var {receiptNo, registration_id, url, staff, location} = req.body;
        var currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;
        var controller = new ReceiptController();
        var result = await controller.createReceipt(receiptNo, registration_id, url, staff, date, time, location);
       // console.log("Create Receipt:", result);
        return res.json({"result": result.success});
    }
    else if(req.body.purpose === "retrieve")
    {
        var controller = new ReceiptController();
        var result = await controller.retrieveReceipts();
        return res.json({"result": result});
    }
});

module.exports = router;

