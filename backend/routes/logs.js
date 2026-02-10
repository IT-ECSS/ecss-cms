var express = require('express');
var router = express.Router();
const LogsController = require('../Controller/Logs/LogsController');

router.post('/', async function(req, res, next) 
{
    const io = req.app.get('io');
    
    if(req.body.purpose === "create")
    {
        try {
            console.log("Creating audit log entry");

            var controller = new LogsController();
            var logDetails = {
                userName: req.body.userName,
                actionType: req.body.actionType,
                module: req.body.module,
                section: req.body.section || '',
                description: req.body.description,
                details: req.body.details || {},
                timestamp: new Date()
            };
            
            var result = await controller.createAuditLog(logDetails);
            console.log("Create audit log result:", result);

            if (io && result.success) {
                console.log("Emitting audit log insert event to all connected clients");
                io.emit('auditLog', {
                    action: 'insert',
                    data: result.data
                });
            }
            
            return res.json({
                success: result.success,
                message: result.message,
                data: result.data || null
            }); 
        } catch (error) {
            console.error("Create audit log error:", error);
            return res.status(500).json({
                success: false,
                message: "Error creating audit log",
                data: null
            });
        }
    }
    else if(req.body.purpose === "retrieve")
    {
        try {
            console.log("Retrieving all audit logs");

            var controller = new LogsController();
            var result = await controller.getAllAuditLogs();
            console.log("Retrieve audit logs result:", result.success);
            
            return res.json({
                success: result.success,
                message: result.message,
                data: result.data || []
            }); 
        } catch (error) {
            console.error("Retrieve audit logs error:", error);
            return res.status(500).json({
                success: false,
                message: "Error retrieving audit logs",
                data: []
            });
        }
    }
    else if(req.body.purpose === "retrieveByUser")
    {
        try {
            console.log("Retrieving audit logs by user");

            var controller = new LogsController();
            var result = await controller.getAuditLogsByUser(req.body.accountId);
            console.log("Retrieve audit logs by user result:", result.success);
            
            return res.json({
                success: result.success,
                message: result.message,
                data: result.data || []
            }); 
        } catch (error) {
            console.error("Retrieve audit logs by user error:", error);
            return res.status(500).json({
                success: false,
                message: "Error retrieving audit logs by user",
                data: []
            });
        }
    }
    else if(req.body.purpose === "retrieveByAction")
    {
        try {
            console.log("Retrieving audit logs by action type");

            var controller = new LogsController();
            var result = await controller.getAuditLogsByAction(req.body.actionType);
            console.log("Retrieve audit logs by action result:", result.success);
            
            return res.json({
                success: result.success,
                message: result.message,
                data: result.data || []
            }); 
        } catch (error) {
            console.error("Retrieve audit logs by action error:", error);
            return res.status(500).json({
                success: false,
                message: "Error retrieving audit logs by action",
                data: []
            });
        }
    }
    else if(req.body.purpose === "retrieveByDateRange")
    {
        try {
            console.log("Retrieving audit logs by date range");

            var controller = new LogsController();
            var result = await controller.getAuditLogsByDateRange(req.body.startDate, req.body.endDate);
            console.log("Retrieve audit logs by date range result:", result.success);
            
            return res.json({
                success: result.success,
                message: result.message,
                data: result.data || []
            }); 
        } catch (error) {
            console.error("Retrieve audit logs by date range error:", error);
            return res.status(500).json({
                success: false,
                message: "Error retrieving audit logs by date range",
                data: []
            });
        }
    }
    else if(req.body.purpose === "deleteOld")
    {
        try {
            console.log("Deleting old audit logs");

            var controller = new LogsController();
            var result = await controller.deleteOldAuditLogs(req.body.daysOld || 365);
            console.log("Delete old audit logs result:", result.success);
            
            return res.json({
                success: result.success,
                message: result.message,
                data: result.data || null
            }); 
        } catch (error) {
            console.error("Delete old audit logs error:", error);
            return res.status(500).json({
                success: false,
                message: "Error deleting old audit logs",
                data: null
            });
        }
    }
    else {
        res.status(400).json({
            success: false,
            message: "Invalid purpose. Expected 'create', 'retrieve', 'retrieveByUser', 'retrieveByAction', 'retrieveByDateRange', or 'deleteOld'",
            data: null
        });
    }
});

module.exports = router;