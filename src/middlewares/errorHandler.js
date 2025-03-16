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
 * Global error handler
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    path: req.path,
    method: req.method,
    status: err.statusCode || 500
  });

  // Check if it's a MongoDB connection error
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
    return res.status(500).json({
      status: 'error',
      message: 'Database connection error. Please check your MongoDB connection settings.',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Database error'
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate value error. A record with this value already exists.',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Validation error'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler; 