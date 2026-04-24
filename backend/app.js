// Load environment variables from .env file
require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors");
const cron = require('node-cron');
const { expireOldFFTEvents } = require('./services/fftExpiryService');

var app = express(); // Initialize the Express app

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require("./routes/login");
var coursesRegistrationRouter = require("./routes/courseregistration");
var accountDetailsRouter = require("./routes/accountDetails");
var accessRightsRouter = require("./routes/accessRights");
var receiptRouter = require("./routes/receipt");
var invoiceRouter = require("./routes/invoice");
var singpassRouter = require("./routes/singpass");
var massimportRouter = require("./routes/massimport");
var coursesRegisteredRouter = require("./routes/coursesRegistered");
var coursesRouter = require("./routes/courses");
var attendanceRouter = require('./routes/attendance');
var membershipRouter = require('./routes/membership');
var jwksRouter = require('./routes/jwks');
var whatsappRouter = require('./routes/whatsapp');
var fundraisingRouter = require('./routes/fundraising');
var googleDriveRouter = require('./routes/googleDrive');
var inventoryRouter = require('./routes/inventory');
var LogsRouter = require('./routes/logs');
var qrcodeRouter = require('./routes/qrcode');
// var skillsfutureRouter = require('./routes/skillsfuture');


// Set up views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// CORS configuration - allow both production and localhost origins
const allowedOrigins = [
  'https://salmon-wave-09f02b100.6.azurestaticapps.net', // Production frontend
  'http://localhost:3000', // Development frontend
  'http://localhost:3001', // Alternative dev port
  'http://127.0.0.1:3000'  // Alternative localhost format
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  exposedHeaders: ['Content-Disposition']
}));

// Middleware
app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/participantsLogin', usersRouter);
app.use("/login", loginRouter);
app.use("/courseregistration", coursesRegistrationRouter);
app.use("/accountDetails", accountDetailsRouter);
app.use("/accessRights", accessRightsRouter);
app.use("/receipt", receiptRouter);
app.use("/invoice", invoiceRouter);
app.use('/', jwksRouter);
app.use("/singpass", singpassRouter);
app.use("/massimport", massimportRouter);
app.use("/coursesRegistered", coursesRegisteredRouter);
app.use("/courses", coursesRouter);
app.use("/attendance", attendanceRouter);
app.use("/membership", membershipRouter);
app.use("/whatsapp", whatsappRouter);
app.use("/fundraising", fundraisingRouter);
app.use("/googleDrive", googleDriveRouter);
app.use("/inventory", inventoryRouter);
app.use("/logs", LogsRouter);
app.use("/qrcode", qrcodeRouter);
// app.use("/skillsfuture", skillsfutureRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// ── FFT Event Expiry: run daily at 16:00 UTC = 00:00 SGT (midnight Singapore time) ───
cron.schedule('0 16 * * *', () => {
  console.log('[FFT Expiry] 00:00 SGT (16:00 UTC) — running expiry job...');
  expireOldFFTEvents();
}, { timezone: 'UTC' });

/*cron.schedule('03 13 * * *', () => {
  console.log('[FFT Expiry] 12:19 SGT — running expiry job...');
  expireOldFFTEvents();
}, { timezone: 'Asia/Singapore' });*/


module.exports = app;
