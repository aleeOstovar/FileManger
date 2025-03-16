const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

// Check if we're using memory store
const useMemoryStore = process.env.USE_MEMORY_STORE === 'true';

// Load users from file in memory mode
const loadMemoryUsers = () => {
  if (!useMemoryStore) return [];
  
  const usersPath = path.join(process.cwd(), 'data', 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const usersData = fs.readFileSync(usersPath, 'utf8');
      return JSON.parse(usersData);
    } catch (err) {
      logger.error(`Error reading users file: ${err.message}`);
      return [];
    }
  }
  return [];
};

// Save users to file in memory mode
const saveMemoryUsers = (users) => {
  if (!useMemoryStore) return;
  
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const usersPath = path.join(dataDir, 'users.json');
  try {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    logger.info('Users saved to file');
  } catch (err) {
    logger.error(`Error saving users file: ${err.message}`);
  }
};

// For memory store mode, check if password matches
const checkPassword = (user, candidatePassword) => {
  return user.password === candidatePassword;
};

/**
 * Register controller for the dashboard
 */
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    req.flash('error', 'Please provide all required fields');
    return res.redirect('/dashboard/register');
  }

  // Check password length
  if (password.length < 8) {
    req.flash('error', 'Password must be at least 8 characters');
    return res.redirect('/dashboard/register');
  }

  // Check if passwords match
  if (password !== passwordConfirm) {
    req.flash('error', 'Passwords do not match');
    return res.redirect('/dashboard/register');
  }

  try {
    if (useMemoryStore) {
      // Memory store mode
      const users = loadMemoryUsers();
      
      // Check if user already exists
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        req.flash('error', 'A user with this email already exists');
        return res.redirect('/dashboard/register');
      }
      
      // Create new user (for memory store, first user is admin, others are viewers)
      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password, // In a real app, this would be hashed
        role: users.length === 0 ? 'admin' : 'viewer',
        active: true,
        createdAt: new Date().toISOString()
      };
      
      users.push(newUser);
      saveMemoryUsers(users);
      
      logger.info(`New user registered: ${email} (${newUser.role}) - using memory store`);
      
      // Set success message and redirect to login
      req.flash('success', 'Registration successful! You can now log in.');
      return res.redirect('/dashboard/login');
    } else {
      // MongoDB mode - check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        req.flash('error', 'A user with this email already exists');
        return res.redirect('/dashboard/register');
      }
      
      // Create new user (for MongoDB, first user is admin, others are viewers)
      const userCount = await User.countDocuments();
      const role = userCount === 0 ? 'admin' : 'viewer';
      
      await User.create({
        name,
        email,
        password, // Model will hash this
        role
      });
      
      logger.info(`New user registered: ${email} (${role})`);
      
      // Set success message and redirect to login
      req.flash('success', 'Registration successful! You can now log in.');
      return res.redirect('/dashboard/login');
    }
  } catch (err) {
    logger.error({
      msg: 'Registration error',
      error: err.message
    });
    
    req.flash('error', `Error during registration: ${err.message}`);
    return res.redirect('/dashboard/register');
  }
});

/**
 * Login controller for the dashboard
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    req.flash('error', 'Please provide email and password');
    return res.redirect('/dashboard/login');
  }

  if (useMemoryStore) {
    // Memory store mode
    const users = loadMemoryUsers();
    const user = users.find(u => u.email === email && u.active !== false);
    
    if (!user || !checkPassword(user, password)) {
      logger.warn(`Failed login attempt for email: ${email} (memory mode)`);
      req.flash('error', 'Incorrect email or password');
      return res.redirect('/dashboard/login');
    }
    
    // Log successful login
    logger.info(`User logged in: ${user.email} (${user.role}) - using memory store`);
    
    // Create session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    req.flash('success', 'Successfully logged in (memory mode)');
    return res.redirect('/dashboard');
  }
  
  // MongoDB mode
  // Find user
  const user = await User.findOne({ email, active: true }).select('+password');

  // Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password))) {
    logger.warn(`Failed login attempt for email: ${email}`);
    req.flash('error', 'Incorrect email or password');
    return res.redirect('/dashboard/login');
  }

  // Log successful login
  logger.info(`User logged in: ${user.email} (${user.role})`);

  // Create session
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  req.flash('success', 'Successfully logged in');
  res.redirect('/dashboard');
});

/**
 * Logout controller for the dashboard
 */
exports.logout = (req, res) => {
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error destroying session:', err);
    }
    res.redirect('/dashboard/login');
  });
};

/**
 * Middleware to protect dashboard routes
 */
exports.protect = (req, res, next) => {
  // Check if user is logged in
  if (!req.session.user) {
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/dashboard/login');
  }

  // Make user data available to all templates
  res.locals.user = req.session.user;
  
  next();
};

/**
 * Middleware to restrict access to specific roles
 * @param {...string} roles - Roles allowed to access the route
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Should be called after protect middleware
    if (!req.session.user) {
      return res.redirect('/dashboard/login');
    }

    // Check if user's role is included in the roles array
    const userRole = req.session.user.role;
    
    // Admin role has access to everything
    if (userRole === 'admin') {
      return next();
    }
    
    // Manager role has access to manager and viewer routes
    if (userRole === 'manager' && (roles.includes('manager') || roles.includes('viewer'))) {
      return next();
    }
    
    // Viewer role has access only to viewer routes
    if (userRole === 'viewer' && roles.includes('viewer')) {
      return next();
    }

    // If role is not allowed
    logger.warn({
      msg: 'Unauthorized access attempt',
      user: req.session.user.email,
      userRole,
      requiredRoles: roles
    });
    
    req.flash('error', 'You do not have permission to perform this action');
    return res.redirect('/dashboard');
  };
}; 