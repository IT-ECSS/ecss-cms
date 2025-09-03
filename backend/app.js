var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors");

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
var fitnessRouter = require('./routes/fitness');

app.use(cors()); // Enable CORS
app.use(logger('dev')); // HTTP request logger
app.use(express.json()); // For parsing JSON
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded data
app.use(cookieParser()); // For parsing cookies

// Set up views (if you're using templates)okok
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// Remove request timeout middleware to allow unlimited operation time
// This enables multiple users to perform long-running operations without timeout

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
app.use("/fitness", fitnessRouter);

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

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await databaseManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await databaseManager.shutdown();
  process.exit(0);
});

module.exports = app;
