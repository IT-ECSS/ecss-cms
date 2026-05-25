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

function sanitizeStaffName(value) {
    return String(value ?? '').replace(/\s*\(Approved\)\s*$/i, '').trim();
}

router.post('/', async function(req, res, next) 
{
    if(req.body.purpose === "getReceiptNo")
    {   
        var controller = new ReceiptController();
        var result = await controller.newReceiptNo(req.body.course, req.body.paymentMethod);
        console.log("New Receipt No:", result);
        return res.json({"result": result});
    }
    else if(req.body.purpose === "createReceipt")
    {
       console.log("🔍 [Receipt Route] CREATE RECEIPT REQUEST RECEIVED:", JSON.stringify(req.body, null, 2));
        var {receiptNo, registration_id, url, staff, location} = req.body;
        
        console.log("📝 [Receipt Route] Extracted parameters:", { receiptNo, registration_id, url, staff, location });
        
        staff = sanitizeStaffName(staff);
        var currentDateTime = getCurrentDateTime();
        var date = currentDateTime.date;
        var time = currentDateTime.time;
        
        console.log("📝 [Receipt Route] After sanitization:", { receiptNo, registration_id, staff, location, date, time });
        
        var controller = new ReceiptController();
        var result = await controller.createReceipt(receiptNo, registration_id, url, staff, date, time, location);
       console.log("📝 [Receipt Route] Controller result:", result);
        
        // Return error status if receipt creation failed
        const statusCode = result.success ? 200 : 400;
        console.log("📝 [Receipt Route] Returning response:", { statusCode, result });
        
        return res.status(statusCode).json({
            result: result.success,
            message: result.message,
            receiptNumber: result.receiptNumber,
            error: result.error || null
        });
    }
    else if(req.body.purpose === "retrieve")
    {
        var controller = new ReceiptController();
        var result = await controller.retrieveReceipts();
        return res.json({"result": result});
    }
});

module.exports = router;

