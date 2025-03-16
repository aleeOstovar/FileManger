const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

/**
 * Render login form
 */
const getLoginForm = (req, res) => {
  res.render('dashboard/login', {
    title: 'Login',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
};

/**
 * Handle login form submission
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Check if email and password exist
  if (!email || !password) {
    req.flash('error', 'Please provide email and password');
    return res.redirect('/dashboard/login');
  }
  
  // Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.correctPassword(password, user.password))) {
    logger.warn({
      msg: 'Failed login attempt',
      email
    });
    
    req.flash('error', 'Incorrect email or password');
    return res.redirect('/dashboard/login');
  }
  
  // Check if user is active
  if (!user.active) {
    logger.warn({
      msg: 'Inactive user login attempt',
      userId: user._id,
      email
    });
    
    req.flash('error', 'Your account is inactive. Please contact an administrator.');
    return res.redirect('/dashboard/login');
  }
  
  // Log successful login
  logger.info({
    msg: 'User logged in',
    userId: user._id,
    email,
    role: user.role
  });
  
  // Set user in session
  req.session.userId = user._id;
  req.session.role = user.role;
  
  // Redirect to intended URL or dashboard home
  const redirectUrl = req.session.returnTo || '/dashboard';
  delete req.session.returnTo;
  
  res.redirect(redirectUrl);
});

/**
 * Handle logout
 */
const logout = (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      logger.error({
        msg: 'Error during logout',
        error: err.message
      });
    }
    
    res.redirect('/dashboard/login');
  });
};

module.exports = {
  getLoginForm,
  login,
  logout
}; 