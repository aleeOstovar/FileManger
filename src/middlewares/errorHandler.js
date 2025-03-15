const logger = require('../utils/logger');

/**
 * Handle MongoDB CastError
 * @param {Error} err - The error object
 * @returns {Object} - Formatted error response
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return {
    status: 'fail',
    statusCode: 400,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
};

/**
 * Handle MongoDB Duplicate Fields
 * @param {Error} err - The error object
 * @returns {Object} - Formatted error response
 */
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return {
    status: 'fail',
    statusCode: 400,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
};

/**
 * Handle MongoDB Validation Error
 * @param {Error} err - The error object
 * @returns {Object} - Formatted error response
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return {
    status: 'fail',
    statusCode: 400,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
};

/**
 * Handle JWT Error
 * @returns {Object} - Formatted error response
 */
const handleJWTError = () => {
  return {
    status: 'fail',
    statusCode: 401,
    message: 'Invalid token. Please log in again!',
    stack: undefined
  };
};

/**
 * Handle JWT Expired Error
 * @returns {Object} - Formatted error response
 */
const handleJWTExpiredError = () => {
  return {
    status: 'fail',
    statusCode: 401,
    message: 'Your token has expired! Please log in again.',
    stack: undefined
  };
};

/**
 * Send error in development environment
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
  logger.error({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
  
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * Send error in production environment
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
  // Log the error for internal tracking
  logger.error({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
  
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
    // Programming or other unknown error: don't leak error details
  } else {
    // Log error
    logger.error('ERROR 💥:', err);
    
    // Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }
};

/**
 * Global error handler middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;
    
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    sendErrorProd(error, res);
  }
};

module.exports = errorHandler; 