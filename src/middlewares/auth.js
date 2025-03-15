const ApiKey = require('../models/ApiKey');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

/**
 * Middleware to protect routes with API key authentication
 * Expects the API key in headers as 'x-api-key'
 */
const protect = catchAsync(async (req, res, next) => {
  // 1) Check if API key exists in header
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    logger.warn('API request without key');
    return next(new AppError('API key is required for this operation', 401));
  }
  
  // 2) Verify the API key
  const apiKeyDoc = await ApiKey.verifyKey(apiKey);
  
  if (!apiKeyDoc) {
    logger.warn(`Invalid API key attempt: ${apiKey}`);
    return next(new AppError('Invalid or expired API key', 401));
  }
  
  // 3) Store the API key document on the request object for later use
  req.apiKey = apiKeyDoc;
  
  logger.info({
    msg: 'API key authenticated',
    keyName: apiKeyDoc.name,
    permissions: apiKeyDoc.permissions
  });
  
  next();
});

/**
 * Middleware to restrict access based on API key permissions
 * @param {...string} permissions - Required permissions
 * @returns {Function} - Express middleware
 */
const restrictTo = (...permissions) => {
  return (req, res, next) => {
    // Check if API key exists (should be set by protect middleware)
    if (!req.apiKey) {
      return next(new AppError('Not authenticated', 401));
    }
    
    // Check if API key has any of the required permissions
    const hasPermission = permissions.some(permission => 
      req.apiKey.hasPermission(permission)
    );
    
    if (!hasPermission) {
      logger.warn({
        msg: 'Permission denied',
        keyName: req.apiKey.name,
        requiredPermissions: permissions,
        actualPermissions: req.apiKey.permissions
      });
      
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    
    next();
  };
};

module.exports = {
  protect,
  restrictTo
}; 