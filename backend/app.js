var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors");

// Load environment variables
require('dotenv').config();

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
var attendanceRouter = require('./routes/attendance');
var membershipRouter = require('./routes/membership');
var jwksRouter = require('./routes/jwks');
var whatsappRouter = require('./routes/whatsapp');

//app.use(cors()); // Enable CORS
app.use(logger('dev')); // HTTP request logger
app.use(express.json()); // For parsing JSON
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded data
app.use(cookieParser()); // For parsing cookies

// Set up views (if you're using templates)okok
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// Request timeout middleware to prevent hanging requests
app.use((req, res, next) => {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000; // 30 seconds default
  req.setTimeout(timeout, () => {
    console.error(`Request timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Configure middleware in correct order
app.use(logger('dev'));

// CORS configuration
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'], 
  exposedHeaders: ['Content-Disposition']
}));

// Payload parsing with increased limits for Azure App Service (BEFORE routes)
app.use(express.json({ 
  limit: '10mb'
}));

app.use(express.urlencoded({ 
  limit: '10mb',
  extended: true,
  parameterLimit: 50000
}));

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
app.use("/attendance", attendanceRouter);
app.use("/membership", membershipRouter);
app.use("/whatsapp", whatsappRouter);

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

module.exports = app;
