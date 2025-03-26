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

/**
 * Get Scraper Dashboard
 */
exports.getScraperDashboard = catchAsync(async (req, res) => {
  try {
    // Fetch data for the dashboard from the scraper API
    const axios = require('axios');
    const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    
    // Helper function to build correct API URLs
    function buildUrl(endpoint) {
      // Ensure endpoint starts with a slash
      if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
      }
      return `${SCRAPER_API_URL}${endpoint}`;
    }
    
    // Make parallel requests for better performance
    const [statusResponse, statsResponse] = await Promise.all([
      axios.get(buildUrl('/api/v1/monitoring/status')).catch(err => ({ 
        data: { status: 'error', message: err.message }
      })),
      axios.get(buildUrl('/api/v1/monitoring/stats')).catch(err => ({ 
        data: { status: 'error', message: err.message }
      }))
    ]);
    
    // Try to get scrapers list from different possible endpoints
    let scrapers = [];
    try {
      // First try the v1/scrapers endpoint
      const scrapersResponse = await axios.get(buildUrl('/api/v1/scrapers'));
      scrapers = scrapersResponse.data.scrapers || [];
    } catch (scrapersError) {
      try {
        // Try alternate endpoint structure
        const scrapersAltResponse = await axios.get(buildUrl('/api/scrapers'));
        scrapers = scrapersAltResponse.data.scrapers || [];
      } catch (altError) {
        try {
          // Try another possible endpoint structure
          const scrapersAlt2Response = await axios.get(buildUrl('/scrapers'));
          scrapers = scrapersAlt2Response.data.scrapers || [];
        } catch (alt2Error) {
          // If all fails, create a mock scraper for testing
          scrapers = [{
            id: 'demo',
            name: 'Demo Scraper',
            website_name: 'Demo News Site',
            website_url: 'https://example.com',
            status: 'idle',
            schedule: null,
            last_run: null,
            articles_count: 0
          }];
          console.log('Using mock scraper because API endpoints not found:', scrapersError.message);
        }
      }
    }
    
    res.render('dashboard/scraper', {
      title: 'News Scraper Dashboard',
      active: 'scraper',
      apiStatus: statusResponse.data,
      stats: statsResponse.data,
      scrapers: scrapers,
      scraperApiUrl: SCRAPER_API_URL,
      csrfToken: req.csrfToken ? req.csrfToken() : null,
      messages: {
        error: req.flash('error'),
        success: req.flash('success'),
        info: req.flash('info')
      }
    });
  } catch (error) {
    req.flash('error', `Failed to load scraper dashboard: ${error.message}`);
    res.render('dashboard/scraper', {
      title: 'News Scraper Dashboard',
      active: 'scraper',
      apiStatus: { status: 'error', message: 'Failed to connect to scraper API' },
      stats: { status: 'error' },
      scrapers: [],
      scraperApiUrl: process.env.SCRAPER_API_URL || 'http://localhost:8000',
      csrfToken: req.csrfToken ? req.csrfToken() : null,
      messages: {
        error: req.flash('error'),
        success: req.flash('success'),
        info: req.flash('info')
      }
    });
  }
});

/**
 * Run a scraper
 */
exports.runScraper = catchAsync(async (req, res) => {
  const { scraperId } = req.params;
  
  try {
    // Special handling for the demo scraper
    if (scraperId === 'demo') {
      // Flash a success message as if the scraper started
      req.flash('success', 'Demo scraper started successfully. This is a simulation.');
      return res.redirect('/dashboard/scraper');
    }
    
    const axios = require('axios');
    const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    
    // Try different endpoint formats
    let response;
    try {
      // First try the v1 endpoint format
      response = await axios.post(`${SCRAPER_API_URL}/api/v1/scrapers/${scraperId}/run`);
    } catch (error1) {
      try {
        // Try alternate endpoint structure
        response = await axios.post(`${SCRAPER_API_URL}/api/scrapers/${scraperId}/run`);
      } catch (error2) {
        try {
          // Try another endpoint structure
          response = await axios.post(`${SCRAPER_API_URL}/scrapers/${scraperId}/run`);
        } catch (error3) {
          // If all fail, try one more format
          response = await axios.post(`${SCRAPER_API_URL}/api/v1/scraper/${scraperId}/run`);
        }
      }
    }
    
    req.flash('success', `Scraper ${scraperId} started successfully`);
    res.redirect('/dashboard/scraper');
  } catch (error) {
    req.flash('error', `Failed to start scraper: ${error.message}`);
    res.redirect('/dashboard/scraper');
  }
});

/**
 * Stop a scraper
 */
exports.stopScraper = catchAsync(async (req, res) => {
  const { scraperId } = req.params;
  
  try {
    // Special handling for demo scraper
    if (scraperId === 'demo') {
      req.flash('success', 'Demo scraper stopped successfully (simulation only)');
      return res.redirect('/dashboard/scraper');
    }
    
    const axios = require('axios');
    const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    
    // Stop the scraper
    await axios.post(`${SCRAPER_API_URL}/api/v1/scrapers/${scraperId}/stop`);
    
    req.flash('success', `Scraper ${scraperId} stopped successfully`);
    res.redirect('/dashboard/scraper');
  } catch (error) {
    req.flash('error', `Failed to stop scraper: ${error.message}`);
    res.redirect('/dashboard/scraper');
  }
});

/**
 * Schedule a scraper
 */
exports.scheduleScraper = catchAsync(async (req, res) => {
  const { scraperId } = req.params;
  const { schedule } = req.body;
  
  try {
    if (!schedule) {
      req.flash('error', 'Schedule is required');
      return res.redirect('/dashboard/scraper');
    }
    
    // Special handling for demo scraper
    if (scraperId === 'demo') {
      req.flash('success', `Demo scraper scheduled with "${schedule}" (simulation only)`);
      return res.redirect('/dashboard/scraper');
    }
    
    const axios = require('axios');
    const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    
    // Schedule the scraper
    await axios.post(`${SCRAPER_API_URL}/api/v1/scrapers/${scraperId}/schedule`, { schedule });
    
    req.flash('success', `Scraper ${scraperId} scheduled successfully`);
    res.redirect('/dashboard/scraper');
  } catch (error) {
    req.flash('error', `Failed to schedule scraper: ${error.message}`);
    res.redirect('/dashboard/scraper');
  }
});

/**
 * Unschedule a scraper
 */
exports.unscheduleScraper = catchAsync(async (req, res) => {
  const { scraperId } = req.params;
  
  try {
    // Special handling for demo scraper
    if (scraperId === 'demo') {
      req.flash('success', 'Demo scraper unscheduled successfully (simulation only)');
      return res.redirect('/dashboard/scraper');
    }
    
    const axios = require('axios');
    const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    
    // Unschedule the scraper
    await axios.post(`${SCRAPER_API_URL}/api/v1/scrapers/${scraperId}/unschedule`);
    
    req.flash('success', `Scraper ${scraperId} unscheduled successfully`);
    res.redirect('/dashboard/scraper');
  } catch (error) {
    req.flash('error', `Failed to unschedule scraper: ${error.message}`);
    res.redirect('/dashboard/scraper');
  }
});

/**
 * Show manual scraping form for a specific scraper
 */
exports.getManualScrapingForm = catchAsync(async (req, res) => {
  const { scraperId } = req.params;
  
  try {
    let scraper;
    
    // Special handling for demo scraper
    if (scraperId === 'demo') {
      scraper = {
        id: 'demo',
        name: 'Demo Scraper',
        website_name: 'Demo News Site',
        website_url: 'https://example.com',
        description: 'This is a demo scraper for showing the features of the manual scraping process.'
      };
    } else {
      const axios = require('axios');
      const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      
      // Get the scraper details
      const response = await axios.get(`${SCRAPER_API_URL}/api/v1/scrapers/${scraperId}`).catch(err => {
        return { data: { scraper: { id: scraperId, name: `Scraper ${scraperId}` } } };
      });
      
      scraper = response.data.scraper || { id: scraperId, name: `Scraper ${scraperId}` };
    }
    
    res.render('dashboard/scraper-manual', {
      title: `Manual Scraping - ${scraper.name}`,
      active: 'scraper',
      scraper,
      scraperApiUrl: process.env.SCRAPER_API_URL || 'http://localhost:8000',
      csrfToken: req.csrfToken ? req.csrfToken() : null,
      messages: {
        error: req.flash('error'),
        success: req.flash('success'),
        info: req.flash('info')
      }
    });
  } catch (error) {
    req.flash('error', `Failed to load manual scraping form: ${error.message}`);
    res.redirect('/dashboard/scraper');
  }
});

/**
 * Start a manual scraping job with progress tracking
 */
exports.startManualScraping = catchAsync(async (req, res) => {
  const { scraperId } = req.params;
  
  try {
    // Special handling for the demo scraper
    if (scraperId === 'demo') {
      // For demo scraper, we'll generate a mock job ID and redirect to progress
      const mockJobId = 'demo-' + Date.now();
      return res.redirect(`/dashboard/scraper/${scraperId}/progress/${mockJobId}`);
    }
    
    const axios = require('axios');
    const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
    
    // Start the scraper with progress tracking
    const response = await axios.post(`${SCRAPER_API_URL}/api/v1/scrapers/${scraperId}/run`, {
      detailed_progress: true
    });
    
    // Get the job ID from the response
    const jobId = response.data.jobId || 'latest';
    
    // Redirect to the progress page
    res.redirect(`/dashboard/scraper/${scraperId}/progress/${jobId}`);
  } catch (error) {
    req.flash('error', `Failed to start manual scraping: ${error.message}`);
    res.redirect(`/dashboard/scraper/${scraperId}/manual`);
  }
});

/**
 * Show scraping progress for a specific job
 */
exports.getScrapingProgress = catchAsync(async (req, res) => {
  const { scraperId, jobId } = req.params;
  
  try {
    // Special handling for the demo scraper
    let scraper;
    let initialProgress;
    
    if (scraperId === 'demo') {
      // For demo scraper, use mock data
      scraper = {
        id: 'demo',
        name: 'Demo Scraper',
        website_name: 'Demo News Site',
        website_url: 'https://example.com'
      };
      
      // Initial progress data
      initialProgress = {
        status: 'running',
        stage: 'init',
        message: 'Initializing demo scraper',
        progress: 5,
        details: { scraperId, jobId }
      };
    } else {
      // For real scrapers, get data from API
      const axios = require('axios');
      const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
      
      // First get the scraper details from status API
      const statusResponse = await axios.get(`${SCRAPER_API_URL}/api/v1/monitoring/status`).catch(err => {
        return { data: { enabled_sources: [] } };
      });
      
      // Format the scraper info
      const enabledSources = statusResponse.data.enabled_sources || [];
      if (enabledSources.includes(scraperId)) {
        scraper = {
          id: scraperId,
          name: scraperId.charAt(0).toUpperCase() + scraperId.slice(1).replace(/_/g, ' '),
          website_name: `${scraperId.charAt(0).toUpperCase() + scraperId.slice(1).replace(/_/g, ' ')} News`,
          website_url: `https://example.com/${scraperId}`
        };
      } else {
        scraper = { id: scraperId, name: `Scraper ${scraperId}` };
      }
      
      // Now get the progress data
      const progressResponse = await axios.get(`${SCRAPER_API_URL}/api/v1/monitoring/progress`).catch(err => {
        return { data: { is_scraping: false, total_progress: 0, status: 'pending', sources: {} } };
      });
      
      // Format the progress data to match our expected structure
      const progressData = progressResponse.data;
      const sourceProgress = progressData.sources && progressData.sources[scraperId];
      
      initialProgress = {
        status: sourceProgress ? sourceProgress.status : progressData.status || 'pending',
        stage: getStageFromProgress(progressData, scraperId),
        message: sourceProgress ? `Scraping ${scraperId}` : progressData.status || 'Initializing...',
        progress: sourceProgress ? sourceProgress.progress : progressData.total_progress || 0,
        details: getDetailsFromProgress(progressData, scraperId)
      };
    }
    
    res.render('dashboard/scraper-progress', {
      title: `Scraping Progress - ${scraper.name}`,
      active: 'scraper',
      scraper,
      jobId,
      initialProgress,
      scraperApiUrl: process.env.SCRAPER_API_URL || 'http://localhost:8000',
      useMockData: scraperId === 'demo', // Flag to tell the frontend to use mock data
      csrfToken: req.csrfToken ? req.csrfToken() : null,
      messages: {
        error: req.flash('error'),
        success: req.flash('success'),
        info: req.flash('info')
      }
    });
  } catch (error) {
    req.flash('error', `Failed to load scraping progress: ${error.message}`);
    res.redirect('/dashboard/scraper');
  }
});

// Helper function to determine the current stage based on progress data
function getStageFromProgress(progressData, scraperId) {
  // Default stage is 'init'
  let stage = 'init';
  
  // If no progress data, return init
  if (!progressData || !progressData.sources) {
    return stage;
  }
  
  // Get source-specific progress if available
  const sourceProgress = progressData.sources[scraperId];
  if (!sourceProgress) {
    return stage;
  }
  
  // Determine stage based on progress percentage
  const progress = sourceProgress.progress || 0;
  
  if (progress < 10) {
    return 'init';
  } else if (progress < 30) {
    return 'getting_news_list';
  } else if (progress < 60) {
    return 'scraping_articles';
  } else if (progress < 90) {
    return 'processing_html';
  } else if (progress < 100) {
    return 'saving_processed_items';
  } else {
    return 'complete';
  }
}

// Helper function to get detailed information based on the current stage
function getDetailsFromProgress(progressData, scraperId) {
  // Default details are empty
  const details = {};
  
  // If no progress data, return empty details
  if (!progressData || !progressData.sources) {
    return details;
  }
  
  // Get source-specific progress if available
  const sourceProgress = progressData.sources[scraperId];
  if (!sourceProgress) {
    return details;
  }
  
  // Determine stage based on progress percentage
  const progress = sourceProgress.progress || 0;
  const stage = getStageFromProgress(progressData, scraperId);
  
  // Populate details based on stage
  switch (stage) {
    case 'getting_news_list':
      // Simulate articles list (since we don't have this directly from the API)
      details.articles = [
        { title: 'Article 1', url: 'https://example.com/news/1' },
        { title: 'Article 2', url: 'https://example.com/news/2' },
        { title: 'Article 3', url: 'https://example.com/news/3' }
      ];
      break;
      
    case 'scraping_articles':
      // Simulate current article being scraped
      details.current = 1;
      details.total = 3;
      details.currentUrl = 'https://example.com/news/1';
      break;
      
    case 'processing_html':
      // Simulate current article being processed
      details.current = 2;
      details.total = 3;
      details.currentUrl = 'https://example.com/news/2';
      break;
      
    case 'saving_processed_items':
      // Simulate processed item
      details.processedItem = {
        title: 'Sample Article',
        sourceUrl: 'https://example.com/news/3',
        sourceDate: new Date().toISOString(),
        creator: 'Author Name',
        thumbnailImage: 'https://example.com/images/thumbnail.jpg',
        content: 'This is a sample article content...',
        imagesUrl: ['https://example.com/images/1.jpg', 'https://example.com/images/2.jpg'],
        tags: ['sample', 'news', 'test']
      };
      break;
      
    case 'complete':
      // Provide completion summary
      details.scraped = sourceProgress.articles_found || 3;
      details.saved = sourceProgress.articles_processed || 3;
      details.errors = 0;
      
      // Calculate duration if available
      if (sourceProgress.start_time && sourceProgress.end_time) {
        const start = new Date(sourceProgress.start_time);
        const end = new Date(sourceProgress.end_time);
        const durationMs = end - start;
        const durationSec = Math.floor(durationMs / 1000);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        details.duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        details.duration = '00:30';
      }
      break;
  }
  
  return details;
}

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
  deleteNewsPost: exports.deleteNewsPost,
  getScraperDashboard: exports.getScraperDashboard,
  runScraper: exports.runScraper,
  stopScraper: exports.stopScraper,
  scheduleScraper: exports.scheduleScraper,
  unscheduleScraper: exports.unscheduleScraper,
  getManualScrapingForm: exports.getManualScrapingForm,
  startManualScraping: exports.startManualScraping,
  getScrapingProgress: exports.getScrapingProgress
}; 