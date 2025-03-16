const newsPostService = require('../services/newsPostService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { addFullUrl } = require('../utils/fileUtils');

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
 *             type: object
 *             required:
 *               - title
 *               - content
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
  const newsPost = await newsPostService.createNewsPost(req.body);
  
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
  const newsPost = await newsPostService.updateNewsPost(req.params.id, req.body);
  
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
  
  res.render('dashboard/news-posts/edit', {
    title: 'Edit News Post',
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