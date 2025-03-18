const express = require('express');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const { isLoggedIn, hasRole, hasPermission } = require('../middlewares/dashboardAuth');
const csrf = require('csurf');
const catchAsync = require('../utils/catchAsync');
const newsPostService = require('../services/newsPostService');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// Set up CSRF protection
const csrfProtection = csrf({ cookie: true });

/**
 * Authentication Routes
 */
router.get('/login', csrfProtection, (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('dashboard/login', {
    title: 'Login',
    layout: 'layouts/auth', // Use a separate layout for auth pages
    csrfToken: req.csrfToken(),
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

router.post('/login', csrfProtection, authController.login);

// Register routes
router.get('/register', csrfProtection, (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('dashboard/register', {
    title: 'Register',
    layout: 'layouts/auth', // Use a separate layout for auth pages
    csrfToken: req.csrfToken(),
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

router.post('/register', csrfProtection, authController.register);

router.get('/logout', authController.logout);

/**
 * Protected Routes - Require authentication
 */
router.use(authController.protect);

// Dashboard home
router.get('/', dashboardController.getDashboard);

/**
 * API Key Management Routes
 */
// Create API keys - restricted to admin and manager - KEEP THESE ROUTES BEFORE THE ID ROUTES
router.get(
  '/api-keys/create',
  authController.restrictTo('admin', 'manager'),
  csrfProtection,
  dashboardController.createApiKeyForm
);

router.post(
  '/api-keys/create',
  authController.restrictTo('admin', 'manager'),
  csrfProtection,
  dashboardController.createApiKey
);

// View API keys - available to all authenticated users
router.get('/api-keys', csrfProtection, dashboardController.getApiKeys);

// API key details and revoke - these routes need to be AFTER specific paths like /create
router.get('/api-keys/:id', csrfProtection, dashboardController.getApiKeyDetails);

// Revoke API keys - restricted to admin
router.post(
  '/api-keys/:id/revoke',
  authController.restrictTo('admin'),
  csrfProtection,
  dashboardController.revokeApiKey
);

/**
 * News Post Management Routes
 */
const newsPostController = require('../controllers/newsPostController');

router.get('/news-posts', authController.protect, csrfProtection, dashboardController.getNewsPostsPage);

// Restricted to admin and manager roles for creation and editing
router.get(
  '/news-posts/create', 
  authController.protect, 
  authController.restrictTo('admin', 'manager'),
  csrfProtection,
  dashboardController.getCreateNewsPostPage
);

router.post(
  '/news-posts/create', 
  authController.protect, 
  authController.restrictTo('admin', 'manager'),
  csrfProtection,
  dashboardController.createNewsPost
);

router.get('/news-posts/:id', authController.protect, csrfProtection, dashboardController.getNewsPostPage);

router.get(
  '/news-posts/:id/edit', 
  authController.protect, 
  authController.restrictTo('admin', 'manager'),
  csrfProtection,
  dashboardController.getEditNewsPostPage
);

router.post(
  '/news-posts/:id/edit', 
  authController.protect, 
  authController.restrictTo('admin', 'manager'),
  csrfProtection,
  dashboardController.updateNewsPost
);

// Restricted to admin role for deletion
router.post(
  '/news-posts/:id/delete', 
  authController.protect, 
  authController.restrictTo('admin'),
  csrfProtection,
  dashboardController.deleteNewsPost
);

/**
 * User Management Routes - Admin only
 */
if (dashboardController.getUsers) {
  router.get('/users', authController.restrictTo('admin'), dashboardController.getUsers);
  router.get('/users/create', csrfProtection, authController.restrictTo('admin'), dashboardController.getCreateUserForm);
  router.post('/users/create', csrfProtection, authController.restrictTo('admin'), dashboardController.createUser);
  router.post('/users/:id/toggle-status', authController.restrictTo('admin'), dashboardController.toggleUserStatus);
}

// Settings Routes - Admin only
router.get('/settings', authController.restrictTo('admin'), csrfProtection, (req, res) => {
  res.render('dashboard/settings', {
    title: 'Settings',
    active: 'settings',
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    },
    csrfToken: req.csrfToken()
  });
});

// Scraper Dashboard - Admin and manager only
router.get('/scraper', authController.restrictTo('admin', 'manager'), csrfProtection, (req, res) => {
  res.render('dashboard/scraper', {
    title: 'News Scraper',
    active: 'scraper',
    csrfToken: req.csrfToken(),
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

module.exports = router; 