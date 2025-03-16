const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

/**
 * Middleware to protect dashboard routes
 * Requires user to be logged in
 */
const isLoggedIn = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Save the requested URL for redirection after login
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to view the dashboard');
  res.redirect('/dashboard/login');
};

/**
 * Check if user has the required role
 * @param  {...string} roles - Roles that are allowed to access the route
 * @returns {Function} - Express middleware
 */
const hasRole = (...roles) => {
  return catchAsync(async (req, res, next) => {
    if (!req.session.userId) {
      return next(new AppError('Not logged in', 401));
    }
    
    // Get user
    const user = await User.findById(req.session.userId);
    
    if (!user || !user.active) {
      // Destroy session if user doesn't exist or is inactive
      req.session.destroy();
      return next(new AppError('User no longer exists or is inactive', 401));
    }
    
    // Check if user has the required role
    if (!user.hasRole(roles)) {
      logger.warn({
        msg: 'Role access denied',
        userId: user._id,
        userRole: user.role,
        requiredRoles: roles
      });
      
      req.flash('error', 'You do not have permission to perform this action');
      return res.redirect('/dashboard');
    }
    
    // Set user in request object
    req.user = user;
    res.locals.user = user;
    
    next();
  });
};

/**
 * Check if user has the required permission
 * @param  {...string} permissions - Permissions required to access the route
 * @returns {Function} - Express middleware
 */
const hasPermission = (...permissions) => {
  return catchAsync(async (req, res, next) => {
    if (!req.session.userId) {
      return next(new AppError('Not logged in', 401));
    }
    
    // Get user if not already on the request
    if (!req.user) {
      const user = await User.findById(req.session.userId);
      
      if (!user || !user.active) {
        // Destroy session if user doesn't exist or is inactive
        req.session.destroy();
        return next(new AppError('User no longer exists or is inactive', 401));
      }
      
      req.user = user;
      res.locals.user = user;
    }
    
    // Check if user has any of the required permissions
    const hasRequiredPermission = permissions.some(permission => 
      req.user.hasPermission(permission)
    );
    
    if (!hasRequiredPermission) {
      logger.warn({
        msg: 'Permission denied',
        userId: req.user._id,
        userRole: req.user.role,
        requiredPermissions: permissions
      });
      
      req.flash('error', 'You do not have permission to perform this action');
      return res.redirect('/dashboard');
    }
    
    next();
  });
};

module.exports = {
  isLoggedIn,
  hasRole,
  hasPermission
}; 