const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const File = require('../models/File');
const NewsPost = require('../models/NewsPost');
const newsPostService = require('../services/newsPostService');
const apiKeyService = require('../services/apiKeyService');

/**
 * Dashboard home controller
 */
exports.getDashboard = catchAsync(async (req, res) => {
  // Get counts for dashboard statistics
  const activeApiKeys = await ApiKey.countDocuments({ active: true });
  const users = await User.countDocuments({ active: true });
  
  res.render('dashboard/index', {
    title: 'Dashboard',
    active: 'dashboard',
    stats: {
      activeApiKeys,
      users
    },
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

/**
 * Get all API keys for the dashboard
 */
exports.getApiKeys = catchAsync(async (req, res) => {
  // Get all API keys
  const apiKeys = await ApiKey.find()
    .sort({ createdAt: -1 });
  
  res.render('dashboard/api-keys/index', {
    title: 'API Keys',
    active: 'api-keys',
    apiKeys,
    csrfToken: req.csrfToken ? req.csrfToken() : null,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

/**
 * Show API key creation form
 */
exports.createApiKeyForm = (req, res) => {
  res.render('dashboard/api-keys/create', {
    title: 'Create API Key',
    active: 'api-keys',
    csrfToken: req.csrfToken ? req.csrfToken() : null,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
};

/**
 * Create a new API key
 */
exports.createApiKey = catchAsync(async (req, res) => {
  const { name, expiresIn } = req.body;
  let permissions = req.body.permissions || [];
  
  // Validate input
  if (!name) {
    req.flash('error', 'API key name is required');
    return res.redirect('/dashboard/api-keys/create');
  }
  
  // Ensure permissions is an array
  if (!Array.isArray(permissions)) {
    permissions = [permissions].filter(Boolean);
  }
  
  // Calculate expiration date if provided
  let expiryDate = null;
  if (expiresIn && !isNaN(parseInt(expiresIn, 10))) {
    const days = parseInt(expiresIn, 10);
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
  }
  
  try {
    // Generate a random API key with prefix 'fm_' (file manager)
    const crypto = require('crypto');
    const keyValue = 'fm_' + crypto.randomBytes(24).toString('hex');
    
    // Create new API key with the generated key value
    const apiKey = await ApiKey.create({
      name,
      key: keyValue,
      permissions,
      expiresAt: expiryDate,
      createdBy: req.session.user.id
    });
    
    // Log the creation
    logger.info({
      msg: 'API key created via dashboard',
      user: req.session.user.email,
      keyId: apiKey._id
    });
    
    // Set flash message with the API key (will be shown once)
    req.flash('success', 'API key created successfully');
    req.flash('apiKey', keyValue);
    
    // Redirect to API key details page to show the newly created key
    return res.redirect(`/dashboard/api-keys/${apiKey._id}`);
  } catch (err) {
    logger.error({
      msg: 'Error creating API key',
      error: err.message
    });
    
    req.flash('error', `Error creating API key: ${err.message}`);
    return res.redirect('/dashboard/api-keys/create');
  }
});

/**
 * Revoke an API key
 */
exports.revokeApiKey = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find the API key
    const apiKey = await ApiKey.findById(id);
    
    if (!apiKey) {
      req.flash('error', 'API key not found');
      return res.redirect('/dashboard/api-keys');
    }
    
    // Set as inactive
    apiKey.active = false;
    apiKey.revokedAt = new Date();
    apiKey.revokedBy = req.session.user.id;
    await apiKey.save();
    
    logger.info({
      msg: 'API key revoked via dashboard',
      user: req.session.user.email,
      keyId: apiKey._id,
      keyName: apiKey.name
    });
    
    req.flash('success', 'API key revoked successfully');
    res.redirect('/dashboard/api-keys');
  } catch (err) {
    logger.error({
      msg: 'Error revoking API key',
      error: err.message
    });
    
    req.flash('error', `Error revoking API key: ${err.message}`);
    res.redirect('/dashboard/api-keys');
  }
});

/**
 * Show API key details
 */
exports.getApiKeyDetails = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  // Find the API key
  const apiKey = await ApiKey.findById(id);
  
  if (!apiKey) {
    req.flash('error', 'API key not found');
    return res.redirect('/dashboard/api-keys');
  }
  
  res.render('dashboard/api-keys/details', {
    title: 'API Key Details',
    active: 'api-keys',
    apiKey,
    csrfToken: req.csrfToken ? req.csrfToken() : null,
    newKey: req.flash('apiKey')[0] || null,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

/**
 * User Management (Admin Only)
 */

// Get all users
const getUsers = catchAsync(async (req, res) => {
  // Parse query params
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  
  // Get count for pagination
  const total = await User.countDocuments();
  
  // Get users
  const users = await User.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  res.render('dashboard/users/index', {
    title: 'Users',
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

// Render create user form
const getCreateUserForm = catchAsync(async (req, res) => {
  res.render('dashboard/users/create', {
    title: 'Create User',
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

// Create new user
const createUser = catchAsync(async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password) {
    req.flash('error', 'Name, email, and password are required');
    return res.redirect('/dashboard/users/create');
  }
  
  logger.info({
    msg: 'Creating new user',
    name,
    email,
    role,
    createdBy: req.user ? req.user._id : 'Unknown'
  });
  
  try {
    // Create a new user
    await User.create({
      name,
      email,
      password,
      role: role || 'viewer'
    });
    
    req.flash('success', 'User created successfully');
    res.redirect('/dashboard/users');
  } catch (error) {
    if (error.code === 11000) {
      req.flash('error', 'A user with this email already exists');
    } else {
      logger.error({
        msg: 'Error creating user',
        error: error.message
      });
      
      req.flash('error', `Error creating user: ${error.message}`);
    }
    
    res.redirect('/dashboard/users/create');
  }
});

// Toggle user active status
const toggleUserStatus = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    req.flash('error', 'User not found');
    return res.redirect('/dashboard/users');
  }
  
  // Prevent deactivating yourself
  if (user._id.toString() === req.user._id.toString()) {
    req.flash('error', 'You cannot deactivate your own account');
    return res.redirect('/dashboard/users');
  }
  
  logger.info({
    msg: `${user.active ? 'Deactivating' : 'Activating'} user`,
    userId: user._id,
    email: user.email,
    performedBy: req.user ? req.user._id : 'Unknown'
  });
  
  // Toggle active status
  user.active = !user.active;
  await user.save();
  
  req.flash('success', `User ${user.active ? 'activated' : 'deactivated'} successfully`);
  res.redirect('/dashboard/users');
});

/**
 * Render the News Posts index page
 */
exports.getNewsPostsPage = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status || 'published';
  const searchTerm = req.query.search || '';
  
  const queryOptions = {
    page,
    limit,
    status,
    search: searchTerm
  };
  
  const result = await newsPostService.getAllNewsPosts(queryOptions);
  
  res.render('dashboard/news-posts/index', {
    title: 'News Posts',
    newsPosts: result.data,
    pagination: {
      page: page,
      limit: limit,
      pages: Math.ceil(result.total / limit),
      total: result.total
    },
    currentStatus: status,
    searchTerm: searchTerm,
    active: 'news-posts',
    csrfToken: req.csrfToken ? req.csrfToken() : null,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

/**
 * Render the form to create a new News Post
 */
exports.getCreateNewsPostPage = catchAsync(async (req, res) => {
  res.render('dashboard/news-posts/form', {
    title: 'Create News Post',
    newsPost: null,
    isEditing: false,
    formAction: '/dashboard/news-posts/create',
    active: 'news-posts',
    csrfToken: req.csrfToken ? req.csrfToken() : null,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

/**
 * Handle the creation of a new News Post
 */
exports.createNewsPost = catchAsync(async (req, res) => {
  const {
    title, content, status, creator, sourceUrl, 
    imageThumbnail, imagesUrl, tags, sourceDate
  } = req.body;
  
  // Process the tags from comma-separated string to array
  const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
  
  // Process imagesUrl from newline-separated string to array
  const imagesUrlArray = imagesUrl ? 
    imagesUrl.split('\n').map(url => url.trim()).filter(url => url) : 
    [];
  
  const newsPostData = {
    title,
    content,
    status: status || 'draft',
    creator,
    sourceUrl,
    imageThumbnail,
    imagesUrl: imagesUrlArray,
    tags: tagsArray,
    sourceDate: sourceDate || null
  };
  
  const newsPost = await newsPostService.createNewsPost(newsPostData);
  
  req.flash('success', 'News post created successfully');
  res.redirect(`/dashboard/news-posts/${newsPost._id}`);
});

/**
 * Render a single News Post details page
 */
exports.getNewsPostPage = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const newsPost = await newsPostService.getNewsPostById(id);
  
  if (!newsPost) {
    req.flash('error', 'News post not found');
    return res.redirect('/dashboard/news-posts');
  }
  
  res.render('dashboard/news-posts/view', {
    title: newsPost.title,
    newsPost,
    active: 'news-posts',
    csrfToken: req.csrfToken ? req.csrfToken() : null,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

/**
 * Render the form to edit a News Post
 */
exports.getEditNewsPostPage = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const newsPost = await newsPostService.getNewsPostById(id);
  
  if (!newsPost) {
    req.flash('error', 'News post not found');
    return res.redirect('/dashboard/news-posts');
  }
  
  res.render('dashboard/news-posts/form', {
    title: `Edit ${newsPost.title}`,
    newsPost,
    isEditing: true,
    formAction: `/dashboard/news-posts/${id}/edit`,
    active: 'news-posts',
    csrfToken: req.csrfToken ? req.csrfToken() : null,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    }
  });
});

/**
 * Handle updating a News Post
 */
exports.updateNewsPost = catchAsync(async (req, res) => {
  const {
    title, content, status, creator, sourceUrl, 
    imageThumbnail, imagesUrl, tags, sourceDate
  } = req.body;
  
  // Process the tags from comma-separated string to array
  const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
  
  // Process imagesUrl from newline-separated string to array
  const imagesUrlArray = imagesUrl ? 
    imagesUrl.split('\n').map(url => url.trim()).filter(url => url) : 
    [];
  
  const newsPostData = {
    title,
    content,
    status: status || 'draft',
    creator,
    sourceUrl,
    imageThumbnail,
    imagesUrl: imagesUrlArray,
    tags: tagsArray,
    sourceDate: sourceDate || null
  };
  
  const updatedNewsPost = await newsPostService.updateNewsPost(req.params.id, newsPostData);
  
  if (!updatedNewsPost) {
    req.flash('error', 'News post not found');
    return res.redirect('/dashboard/news-posts');
  }
  
  req.flash('success', 'News post updated successfully');
  res.redirect(`/dashboard/news-posts/${updatedNewsPost._id}`);
});

/**
 * Handle deleting a News Post
 */
exports.deleteNewsPost = catchAsync(async (req, res) => {
  const deleted = await newsPostService.deleteNewsPost(req.params.id);
  
  if (!deleted) {
    req.flash('error', 'News post not found');
  } else {
    req.flash('success', 'News post deleted successfully');
  }
  
  res.redirect('/dashboard/news-posts');
});

module.exports = {
  getDashboard: exports.getDashboard,
  getApiKeys: exports.getApiKeys,
  createApiKeyForm: exports.createApiKeyForm,
  createApiKey: exports.createApiKey,
  revokeApiKey: exports.revokeApiKey,
  getApiKeyDetails: exports.getApiKeyDetails,
  getUsers,
  getCreateUserForm,
  createUser,
  toggleUserStatus,
  getNewsPostsPage: exports.getNewsPostsPage,
  getCreateNewsPostPage: exports.getCreateNewsPostPage,
  createNewsPost: exports.createNewsPost,
  getNewsPostPage: exports.getNewsPostPage,
  getEditNewsPostPage: exports.getEditNewsPostPage,
  updateNewsPost: exports.updateNewsPost,
  deleteNewsPost: exports.deleteNewsPost
}; 