const { 
  createRssPost, 
  getAllRssPosts, 
  getRssPostById, 
  updateRssPost, 
  deleteRssPost 
} = require('../services/rssPostService');

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RssPost'
 *     responses:
 *       201:
 *         description: Created RSS post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RssPost'
 */
exports.createRssPost = async (req, res, next) => {
  try {
    const newRssPost = await createRssPost(req.body);
    
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