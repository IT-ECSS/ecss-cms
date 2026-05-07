var express = require('express');
var router = express.Router();
var NsaNotifierController = require('../Controller/NSA_Notifier/NsaNotifierController');

var controller = new NsaNotifierController();

router.post('/', async function(req, res) {
    if (req.body.purpose === 'sendNotifierEmail') {
        return controller.sendNotifierEmail(req, res);
    }
    if (req.body.purpose === 'notifyChange') {
        return controller.notifyChange(req, res);
    }
    return res.status(400).json({ result: false, message: 'Unknown purpose' });
});

module.exports = router;
