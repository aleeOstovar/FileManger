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

// Configure pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      // Console logging in development
      {
        target: 'pino-pretty',
        level: process.env.LOG_LEVEL || 'info',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      // File logging for all environments
      {
        target: 'pino/file',
        options: { destination: logFilePath },
        level: 'trace', // Log everything to file
      },
    ],
  },
  // Include timestamp, file, and line number in logs
  base: {
    pid: process.pid,
    hostname: require('os').hostname(),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  // Customize the serialization of errors
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

// Add request tracing
logger.trace = (obj, msg, ...args) => {
  // Extract stack trace information
  const stackObj = {};
  if (typeof obj === 'object') {
    Error.captureStackTrace(stackObj, logger.trace);
    const stack = stackObj.stack.split('\n')[2];
    const match = stack.match(/\((.*):(\d+):(\d+)\)$/);
    if (match) {
      const [, file, line, column] = match;
      obj.file = file;
      obj.line = line;
      obj.column = column;
    }
    return logger.child(obj).trace(msg, ...args);
  }
  
  // Handle when first argument is a message
  Error.captureStackTrace(stackObj, logger.trace);
  const stack = stackObj.stack.split('\n')[2];
  const match = stack.match(/\((.*):(\d+):(\d+)\)$/);
  let traceObj = {};
  if (match) {
    const [, file, line, column] = match;
    traceObj = { file, line, column };
  }
  return logger.child(traceObj).trace(obj, msg, ...args);
};

module.exports = logger; 