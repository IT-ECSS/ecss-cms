
var express = require('express');
var router = express.Router();
//var PdfGenerator = require('../Others/Pdf/PdfGenerator');
var InvoiceController = require("../Controller/Invoice/InvoiceController")

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
    console.log(req.body.details);
    if(req.body.purpose === "generateInvoice")
    {   
        console.log("Generate Invoice");
        var pdf = new PdfGenerator();
        var controller = new InvoiceController();
        var currentDateTime = getCurrentDateTime();
        var result = await controller.newInvoice(req.body.invoiceNumber, req.body.selectedMonth, req.body.userName, currentDateTime.date, currentDateTime.time);
        await pdf.generateInvoice(res, req.body.details, req.body.totalPrice, req.body.totalPriceInWords, req.body.invoiceNumber);
    }
    else if(req.body.purpose === "getInvoiceNumber")
    {
        var controller = new InvoiceController();
        var result = await controller.newInvoiceNo();
        console.log(result);
        return res.json({invoiceNumber: result.invoiceNumber});
    }
    else if(req.body.purpose === "createInvoice")
    {
        var { invoiceNo, registration_id, url, staff, location } = req.body;
        var controller = new InvoiceController();
        var currentDateTime = getCurrentDateTime();
        var result = await controller.createInvoice(
            invoiceNo,
            registration_id,
            url || '',
            staff || '',
            currentDateTime.date,
            currentDateTime.time,
            location || '',
            'Paid'
        );

        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json({
            result: result.success,
            message: result.message,
            invoiceNumber: result.invoiceNumber,
            error: result.error || null
        });
    }
    else if(req.body.purpose === "findInvoiceNumber")
    {
        var controller = new InvoiceController();
        var result = await controller.getInvoiceNumber(req.body.selectedMonth);
        console.log("Find:", result.invoiceNumber);
        return res.json({invoiceNumber: result.invoiceNumber});
    }
    else if(req.body.purpose === "retrieve")
    {
        var controller = new InvoiceController();
        var result = await controller.retrieveInvoices();
        return res.json({
            success: result.success,
            message: result.message,
            invoices: result.invoices || [],
            result: result
        });
    }
});

module.exports = router;

