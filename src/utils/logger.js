const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a log file with date as filename
const logFileName = `${new Date().toISOString().split('T')[0]}.log`;
const logFilePath = path.join(logsDir, logFileName);

// Define log levels
const levels = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

// Configure logger based on environment
let loggerConfig;

if (process.env.NODE_ENV === 'production') {
  // For production, use a simpler configuration
  loggerConfig = {
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    }
  };
} else {
  // For development, use pretty printing to console
  loggerConfig = {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    }
  };
}

// Create the logger instance
const logger = pino(loggerConfig);

// Add file logging through separate stream
const fileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
const fileLogger = pino(
  {
    level: 'trace', // Log everything to file
    timestamp: pino.stdTimeFunctions.isoTime,
  }, 
  fileStream
);

// Wrap the logger methods to also write to file
const originalMethods = {
  trace: logger.trace.bind(logger),
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
};

// Override each method to also log to file
Object.keys(originalMethods).forEach(level => {
  logger[level] = function() {
    // Call original method with the console logger
    originalMethods[level].apply(this, arguments);
    
    // Also log to file
    fileLogger[level].apply(fileLogger, arguments);
  };
});

// Add request tracing (simplified version)
logger.trace = function(obj, msg, ...args) {
  const stackObj = {};
  Error.captureStackTrace(stackObj, logger.trace);
  const stack = stackObj.stack.split('\n')[2];
  const match = stack.match(/\((.*):(\d+):(\d+)\)$/);
  
  if (typeof obj === 'object') {
    if (match) {
      const [, file, line, column] = match;
      obj.file = file;
      obj.line = line;
    }
    originalMethods.trace.call(this, obj, msg, ...args);
    fileLogger.trace.call(fileLogger, obj, msg, ...args);
    return;
  }
  
  let traceObj = {};
  if (match) {
    const [, file, line] = match;
    traceObj = { file, line };
  }
  
  originalMethods.trace.call(this, traceObj, obj, msg, ...args);
  fileLogger.trace.call(fileLogger, traceObj, obj, msg, ...args);
};

module.exports = logger; 