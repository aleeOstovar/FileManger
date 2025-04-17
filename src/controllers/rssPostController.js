const { 
  createRssPost, 
  getAllRssPosts, 
  getRssPostById, 
  updateRssPost, 
  deleteRssPost,
  checkRssPostExists
} = require('../services/rssPostService');
const { downloadAndSaveImage, getFullImageUrl } = require('../utils/imageUtils');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/rss-posts:
 *   get:
 *     summary: Get all RSS posts
 *     tags: [RSS Posts]
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
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (asc or desc)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: A list of RSS posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RssPost'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalResults:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
exports.getAllRssPosts = async (req, res, next) => {
  try {
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await getAllRssPosts(options);
    
    res.status(200).json({
      status: 'success',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/rss-posts/{id}:
 *   get:
 *     summary: Get an RSS post by ID
 *     tags: [RSS Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: RSS post ID
 *     responses:
 *       200:
 *         description: An RSS post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RssPost'
 *       404:
 *         description: RSS post not found
 */
exports.getRssPost = async (req, res, next) => {
  try {
    const rssPost = await getRssPostById(req.params.id);
    
    res.status(200).json({
      status: 'success',
      data: rssPost
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/rss-posts:
 *   post:
 *     summary: Create a new RSS post
 *     tags: [RSS Posts]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - sourceURL
 *               - pubDate
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the RSS post
 *               sourceURL:
 *                 type: string
 *                 description: Source URL of the RSS post
 *               pubDate:
 *                 type: string
 *                 format: date-time
 *                 description: Publication date of the RSS post
 *               creator:
 *                 type: string
 *                 description: Creator of the RSS post
 *               content:
 *                 type: string
 *                 description: Content of the RSS post
 *               contentSnippet:
 *                 type: string
 *                 description: Content snippet of the RSS post
 *               thumbnailImage:
 *                 type: string
 *                 description: URL of the thumbnail image
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Categories of the RSS post
 *     responses:
 *       201:
 *         description: Created RSS post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RssPost'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Missing or invalid API key
 */
exports.createRssPost = async (req, res, next) => {
  try {
    // Validate required fields
    const requiredFields = ['title', 'sourceURL', 'pubDate'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate URL format for sourceURL and thumbnailImage if provided
    const urlFields = ['sourceURL', 'thumbnailImage'];
    for (const field of urlFields) {
      if (req.body[field]) {
        try {
          new URL(req.body[field]);
        } catch (err) {
          return res.status(400).json({
            status: 'error',
            message: `Invalid URL format for ${field}`
          });
        }
      }
    }

    // Validate categories is an array if provided
    if (req.body.categories && !Array.isArray(req.body.categories)) {
      return res.status(400).json({
        status: 'error',
        message: 'Categories must be an array'
      });
    }
    
    // Handle thumbnail image upload if it's a remote URL
    let thumbnailImageUrl = req.body.thumbnailImage;
    if (thumbnailImageUrl && thumbnailImageUrl.startsWith('http')) {
      try {
        const file = await downloadAndSaveImage(thumbnailImageUrl);
        if (file) {
          thumbnailImageUrl = getFullImageUrl(file, req);
          logger.info(`API: Thumbnail image uploaded and replaced: ${thumbnailImageUrl}`);
        }
      } catch (error) {
        logger.error(`API: Failed to upload thumbnail image: ${error.message}`);
        // Continue with original URL if upload fails
      }
    }
    
    // Prepare data for creation with the potentially updated thumbnail URL
    const rssPostData = {
      ...req.body,
      thumbnailImage: thumbnailImageUrl
    };

    // Create the RSS post
    const newRssPost = await createRssPost(rssPostData);
    
    res.status(201).json({
      status: 'success',
      data: newRssPost
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/rss-posts/{id}:
 *   patch:
 *     summary: Update an RSS post
 *     tags: [RSS Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: RSS post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RssPost'
 *     responses:
 *       200:
 *         description: Updated RSS post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RssPost'
 *       404:
 *         description: RSS post not found
 */
exports.updateRssPost = async (req, res, next) => {
  try {
    const updatedRssPost = await updateRssPost(req.params.id, req.body);
    
    res.status(200).json({
      status: 'success',
      data: updatedRssPost
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/rss-posts/{id}:
 *   delete:
 *     summary: Delete an RSS post
 *     tags: [RSS Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: RSS post ID
 *     responses:
 *       204:
 *         description: No content
 *       404:
 *         description: RSS post not found
 */
exports.deleteRssPost = async (req, res, next) => {
  try {
    await deleteRssPost(req.params.id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/rss-posts/check-exists:
 *   post:
 *     summary: Check if an RSS post exists based on sourceURL
 *     tags: [RSS Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - link
 *             properties:
 *               link:
 *                 type: string
 *                 description: Source URL of the RSS post to check
 *     responses:
 *       200:
 *         description: Check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 isExist:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing sourceURL
 */
exports.checkRssPostExists = async (req, res, next) => {
  try {
    // Validate request body has sourceURL
    if (!req.body || !req.body.link) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide the source URL (link) to check'
      });
    }

    // Validate URL format
    try {
      new URL(req.body.link);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid URL format'
      });
    }
    
    // Check if post exists
    const exists = await checkRssPostExists(req.body);
    
    res.status(200).json({
      status: 'success',
      isExist: exists,
      message: exists ? 'RSS post with this URL already exists' : 'RSS post with this URL does not exist'
    });
  } catch (error) {
    next(error);
  }
}; 