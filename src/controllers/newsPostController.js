const newsPostService = require('../services/newsPostService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { addFullUrl } = require('../utils/fileUtils');
const { normalizeImagesFormat } = require('../utils/newsUtils');
const NewsPost = require('../models/NewsPost');

/**
 * @swagger
 * /api/v1/news-posts:
 *   post:
 *     summary: Create news post
 *     description: Create a new news post
 *     tags: [News Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - title
 *                   - content
 *                 properties:
 *                   title:
 *                     type: string
 *                   creator:
 *                     type: string
 *                   sourceUrl:
 *                     type: string
 *                   thumbnailImage:
 *                     type: string
 *                   imagesUrl:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         url:
 *                           type: string
 *                         caption:
 *                           type: string
 *                         type:
 *                           type: string
 *                   content:
 *                     type: array
 *                     items:
 *                       type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   sourceDate:
 *                     type: string
 *                     format: date
 *               - type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     json:
 *                       type: object
 *     responses:
 *       201:
 *         description: News post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/NewsPost'
 */
exports.createNewsPost = catchAsync(async (req, res, next) => {
  // Log the full request body for debugging
  logger.info(`Request body type: ${typeof req.body}`);
  logger.info(`Request body is array: ${Array.isArray(req.body)}`);
  if (Array.isArray(req.body)) {
    logger.info(`Array length: ${req.body.length}`);
    logger.info(`First item in array: ${JSON.stringify(req.body[0])}`);
  } else {
    logger.info(`Full request body: ${JSON.stringify(req.body)}`);
  }
  
  // Check if the body is an array, extract the first item if it is
  let postData = Array.isArray(req.body) && req.body.length > 0 ? req.body[0] : req.body;
  logger.info(`Post data after array check: ${JSON.stringify(postData)}`);
  
  // Check if we've got a nested 'json' structure and extract from it
  if (postData && postData.json && typeof postData.json === 'object') {
    postData = postData.json;
    logger.info('Extracted data from json property');
    logger.info(`Post data after json extraction: ${JSON.stringify(postData)}`);
  }
  
  // Debug: log keys
  if (postData) {
    logger.info(`Available keys in postData: ${Object.keys(postData)}`);
    if (postData.title) {
      logger.info(`Title found: ${postData.title}`);
    } else {
      logger.info('Title is missing or undefined');
    }
  } else {
    logger.info('postData is null or undefined');
  }
  
  // Ensure content is a valid object (Map in Mongoose terms)
  if (postData && postData.content) {
    if (typeof postData.content !== 'object' || Array.isArray(postData.content)) {
      logger.error(`Invalid content type: expected object, got ${typeof postData.content}`);
      return next(new AppError('Content must be an object', 400));
    } 
    // Optional: Add a check for emptiness if needed, depends on Mongoose validator
    // if (Object.keys(postData.content).length === 0) {
    //   logger.error('Content object is empty');
    //   return next(new AppError('Content object cannot be empty', 400));
    // }
    logger.info('Content field is a valid object.');
  }
  
  // Handle imagesUrl if it's a string instead of an array
  if (postData && postData.imagesUrl) {
    logger.info(`imagesUrl type: ${typeof postData.imagesUrl}`);
    
    // If it's a string, attempt to parse it as JSON first
    if (typeof postData.imagesUrl === 'string') {
      try {
        const parsed = JSON.parse(postData.imagesUrl);
        postData.imagesUrl = parsed;
        logger.info('Successfully parsed imagesUrl as JSON');
      } catch (e) {
        logger.error(`JSON parsing failed: ${e.message}`);
        
        // Try handling it as newline-separated URLs from form submission
        if (postData.imagesUrl.includes('\n')) {
          logger.info('Treating imagesUrl as newline-separated URLs from form');
          const urls = postData.imagesUrl.split('\n').filter(url => url.trim());
          postData.imagesUrl = urls.map((url, index) => ({
            id: `img${index}`,
            url: url.trim(),
            caption: '',
            type: 'figure'
          }));
          logger.info(`Converted ${urls.length} newline-separated URLs to image objects`);
        } else {
          // Try a different approach - sometimes Python sends JS literal notation
          try {
            // Convert to a valid JSON string first by replacing single quotes with double
            const jsonStr = postData.imagesUrl
              .replace(/'/g, '"')
              .replace(/(\w+):/g, '"$1":');  // Convert JS property names to JSON format
            
            const parsed = JSON.parse(jsonStr);
            postData.imagesUrl = parsed;
            logger.info('Successfully parsed imagesUrl after string conversion');
          } catch (err) {
            logger.error(`All parsing attempts failed: ${err.message}`);
            // Set to empty array to avoid validation errors
            postData.imagesUrl = [];
          }
        }
      }
    }
    
    // Handle case where it might be an array of strings
    if (Array.isArray(postData.imagesUrl) && postData.imagesUrl.length > 0) {
      if (typeof postData.imagesUrl[0] === 'string') {
        try {
          postData.imagesUrl = postData.imagesUrl.map(item => {
            if (typeof item === 'string') {
              return JSON.parse(item.replace(/'/g, '"').replace(/(\w+):/g, '"$1":'));
            }
            return item;
          });
          logger.info('Processed string items in imagesUrl array');
        } catch (error) {
          logger.error(`Failed to process array items: ${error.message}`);
        }
      }
      
      // Ensure each object has the expected structure
      postData.imagesUrl = postData.imagesUrl.map(item => {
        if (typeof item === 'object' && item !== null) {
          return {
            id: item.id || '',
            url: item.url || '',
            caption: item.caption || '',
            type: item.type || 'figure'
          };
        }
        return item;
      });
    }
  }
  
  // Process content that might contain image placeholders
  if (postData && postData.content && Array.isArray(postData.content) && postData.imagesUrl && Array.isArray(postData.imagesUrl)) {
    // Map content array to replace image placeholders
    postData.content = postData.content.map(paragraph => {
      if (typeof paragraph === 'string') {
        // Look for image placeholders like **image_image0**
        const imageRegex = /\*\*image_image(\d+)\*\*/g;
        
        return paragraph.replace(imageRegex, (match, imageIdNum) => {
          const imageIndex = parseInt(imageIdNum, 10);
          // Find the image with matching id
          if (postData.imagesUrl[imageIndex]) {
            // Return an empty string - the image is already in imagesUrl
            return '';
          }
          return match; // Keep the placeholder if no matching image
        });
      }
      return paragraph;
    });
    
    // Filter out any empty paragraphs that might have resulted from removing image placeholders
    postData.content = postData.content.filter(paragraph => paragraph.trim() !== '');
  }
  
  // --- Final Validation --- 

  // Basic validation for title
  if (!postData || !postData.title) {
    logger.error('Missing title in news post data');
    
    // Try to handle more complex nested structures
    if (postData) {
      // Check for nested objects that might contain the post data
      const possibleDataFields = ['data', 'post', 'newsPost', 'item', 'article'];
      
      for (const field of possibleDataFields) {
        if (postData[field] && typeof postData[field] === 'object' && postData[field].title) {
          logger.info(`Found title in ${field} property`);
          postData = postData[field];
          break;
        }
      }
      
      // If there's a 0 index property (might be array-like object)
      if (postData[0] && typeof postData[0] === 'object' && postData[0].title) {
        logger.info(`Found title in index 0`);
        postData = postData[0];
      }
      
      // One last check after our attempts to find the data
      if (postData.title) {
        logger.info(`Found title after additional checks: ${postData.title}`);
      } else {
        return next(new AppError('Title is required', 400));
      }
    } else {
      return next(new AppError('Title is required', 400));
    }
  }
  
  // Validation for content (ensure it exists and is a non-empty object)
  if (!postData.content || typeof postData.content !== 'object' || Array.isArray(postData.content) || Object.keys(postData.content).length === 0) {
    logger.error('Missing or invalid content (must be non-empty object) in news post data');
    return next(new AppError('Content must be a non-empty object', 400));
  }
  
  // Create the news post
  const newsPost = await newsPostService.createNewsPost(postData);
  
  res.status(201).json({
    status: 'success',
    data: newsPost
  });
});

/**
 * @swagger
 * /api/v1/news-posts:
 *   get:
 *     summary: Get all news posts
 *     description: Retrieves a list of all news posts with pagination, filtering, and sorting
 *     tags: [News Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field(s) (e.g. createdAt:desc,title:asc)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (draft, published, archived)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for text search
 *     responses:
 *       200:
 *         description: Successfully retrieved news posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NewsPost'
 */
exports.getAllNewsPosts = catchAsync(async (req, res, next) => {
  const newsPosts = await newsPostService.getAllNewsPosts(req.query);
  
  res.status(200).json({
    status: 'success',
    results: newsPosts.length,
    data: newsPosts
  });
});

/**
 * @swagger
 * /api/v1/news-posts/{id}:
 *   get:
 *     summary: Get news post by ID
 *     description: Retrieves a news post by its ID
 *     tags: [News Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: News post ID
 *     responses:
 *       200:
 *         description: Successfully retrieved news post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/NewsPost'
 *       404:
 *         description: News post not found
 */
exports.getNewsPost = catchAsync(async (req, res, next) => {
  const newsPost = await newsPostService.getNewsPostById(req.params.id);
  
  res.status(200).json({
    status: 'success',
    data: newsPost
  });
});

/**
 * @swagger
 * /api/v1/news-posts/{id}:
 *   patch:
 *     summary: Update news post
 *     description: Update an existing news post
 *     tags: [News Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: News post ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               creator:
 *                 type: string
 *               sourceUrl:
 *                 type: string
 *               imageThumbnail:
 *                 type: string
 *               imagesUrl:
 *                 type: array
 *                 items:
 *                   type: string
 *               content:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               sourceDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *     responses:
 *       200:
 *         description: News post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/NewsPost'
 *       404:
 *         description: News post not found
 */
exports.updateNewsPost = catchAsync(async (req, res, next) => {
  // Clone the request body for manipulation
  const updateData = { ...req.body };
  
  // Process imagesUrl from form if it's a string (newline separated URLs)
  if (updateData.imagesUrl && typeof updateData.imagesUrl === 'string') {
    // Split by newlines and filter empty lines
    const imgUrls = updateData.imagesUrl.split('\n').filter(url => url.trim());
    
    // Get existing newsPost to preserve metadata
    const existingPost = await newsPostService.getNewsPostById(req.params.id);
    const existingImages = existingPost.imagesUrl || [];
    
    // Map URLs to objects, preserving existing metadata when possible
    updateData.imagesUrl = imgUrls.map((url, index) => {
      const trimmedUrl = url.trim();
      // Try to find existing image with same URL to preserve metadata
      const existingImg = existingImages.find(img => img.url === trimmedUrl);
      
      if (existingImg) {
        return existingImg;
      } else {
        // Create new image object if URL wasn't in the existing images
        return {
          id: `img${index}`,
          url: trimmedUrl,
          caption: '',
          type: 'figure'
        };
      }
    });
  }
  
  const newsPost = await newsPostService.updateNewsPost(req.params.id, updateData);
  
  res.status(200).json({
    status: 'success',
    data: newsPost
  });
});

/**
 * @swagger
 * /api/v1/news-posts/{id}:
 *   delete:
 *     summary: Delete news post
 *     description: Delete a news post by ID
 *     tags: [News Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: News post ID
 *     responses:
 *       204:
 *         description: No content (successful deletion)
 *       404:
 *         description: News post not found
 */
exports.deleteNewsPost = catchAsync(async (req, res, next) => {
  await newsPostService.deleteNewsPost(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @swagger
 * /api/v1/news-posts/stats:
 *   get:
 *     summary: Get news post statistics
 *     description: Get statistics about news posts by status
 *     tags: [News Posts]
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: array
 *                       items:
 *                         type: object
 */
exports.getNewsPostStats = catchAsync(async (req, res, next) => {
  const stats = await newsPostService.getNewsPostStats();
  
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// Dashboard controllers for news posts

/**
 * Get dashboard page for news posts
 */
exports.getNewsPosts = catchAsync(async (req, res) => {
  // Parse query params
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status || 'published';
  const search = req.query.search || '';
  
  // Build query
  const query = {
    page,
    limit,
    status,
    search
  };
  
  // Get news posts
  const newsPosts = await newsPostService.getAllNewsPosts(query);
  
  // Normalize image format for display in each post
  if (Array.isArray(newsPosts)) {
    newsPosts.forEach(post => normalizeImagesFormat(post));
  } else if (newsPosts.data && Array.isArray(newsPosts.data)) {
    newsPosts.data.forEach(post => normalizeImagesFormat(post));
  }
  
  // Get total count for pagination
  let totalQuery = { status };
  if (search) {
    totalQuery = {
      $text: { $search: search }
    };
  }
  const total = await NewsPost.countDocuments(totalQuery);
  
  res.render('dashboard/news-posts/index', {
    title: 'News Posts',
    active: 'news-posts',
    newsPosts,
    currentStatus: status,
    searchTerm: search,
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
    },
    csrfToken: req.csrfToken ? req.csrfToken() : null
  });
});

/**
 * Show form to create a news post
 */
exports.createNewsPostForm = catchAsync(async (req, res) => {
  res.render('dashboard/news-posts/create', {
    title: 'Create News Post',
    active: 'news-posts',
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    },
    csrfToken: req.csrfToken ? req.csrfToken() : null
  });
});

/**
 * Show news post details
 */
exports.getNewsPostDetails = catchAsync(async (req, res) => {
  const newsPost = await newsPostService.getNewsPostById(req.params.id);
  
  // Normalize image format for display
  normalizeImagesFormat(newsPost);
  
  res.render('dashboard/news-posts/details', {
    title: 'News Post Details',
    active: 'news-posts',
    newsPost,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    },
    csrfToken: req.csrfToken ? req.csrfToken() : null
  });
});

/**
 * Show form to edit a news post
 */
exports.editNewsPostForm = catchAsync(async (req, res) => {
  const newsPost = await newsPostService.getNewsPostById(req.params.id);
  
  // Normalize image format for display
  normalizeImagesFormat(newsPost);
  
  res.render('dashboard/news-posts/edit', {
    title: 'Edit News Post',
    active: 'news-posts',
    newsPost,
    isEditing: true,
    formAction: `/api/v1/news-posts/${newsPost._id}?_method=PATCH`,
    messages: {
      error: req.flash('error'),
      success: req.flash('success'),
      info: req.flash('info')
    },
    csrfToken: req.csrfToken ? req.csrfToken() : null
  });
});

/**
 * @swagger
 * /api/v1/news-posts/check:
 *   post:
 *     summary: Check if an article exists
 *     description: Check if an article with the given source URL already exists
 *     tags: [News Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceUrl
 *             properties:
 *               sourceUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 */
exports.checkArticleExists = catchAsync(async (req, res, next) => {
  // Extract sourceUrl from request body
  const { sourceUrl } = req.body;
  
  // Validate that sourceUrl is provided
  if (!sourceUrl) {
    return next(new AppError('Source URL is required', 400));
  }
  
  logger.info(`Checking if article exists with source URL: ${sourceUrl}`);
  
  // Check if the article exists
  const exists = await newsPostService.checkIfArticleExists(sourceUrl);
  
  logger.info(`Article exists: ${exists}`);
  
  // Return the result
  res.status(200).json({
    exists
  });
});

/**
 * @swagger
 * /api/v1/news-posts/count:
 *   get:
 *     summary: Get count of news posts
 *     description: Get the count of news posts, optionally filtered by source
 *     tags: [News Posts]
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source name (e.g., 'mihan_blockchain', 'arzdigital')
 *     responses:
 *       200:
 *         description: Successfully retrieved count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 42
 */
exports.getNewsPostCount = catchAsync(async (req, res, next) => {
  const { source } = req.query;
  
  // Create filter based on source parameter using regex on sourceUrl
  const filter = {};
  if (source) {
    let urlPattern;
    switch(source.toLowerCase()) {
      case 'mihan_blockchain':
      case 'mihanblockchain':
        urlPattern = /mihanblockchain\.com/i;
        break;
      case 'arzdigital':
        urlPattern = /arzdigital\.com/i;
        break;
      default:
        urlPattern = new RegExp(source, 'i');
    }
    filter.sourceUrl = { $regex: urlPattern };
  }
  
  // Get count from database
  const count = await NewsPost.countDocuments(filter);
  
  logger.info(`News post count for source '${source || 'all'}': ${count}`);
  
  res.status(200).json({
    count
  });
}); 