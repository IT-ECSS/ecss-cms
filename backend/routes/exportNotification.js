var express = require('express');
var router  = express.Router();
var ExportNotificationController = require('../Controller/ExportNotification/ExportNotificationController');

var controller = new ExportNotificationController();

router.post('/', async function(req, res) {
    if (req.body.purpose === 'sendExportNotification') {
        return controller.sendExportNotification(req, res);
    }
    return res.status(400).json({ result: false, message: 'Unknown purpose.' });
});

module.exports = router;
