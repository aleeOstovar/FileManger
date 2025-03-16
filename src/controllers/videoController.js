const File = require('../models/File');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const { addFullUrl, addFullUrlToMany } = require('../utils/fileUtils');

/**
 * @swagger
 * /api/v1/videos:
 *   post:
 *     summary: Upload video
 *     description: Upload a new video file
 *     tags: [Videos]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Video file to upload
 *     responses:
 *       201:
 *         description: Video successfully uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/File'
 */
const uploadVideo = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a video file', 400));
  }

  logger.info({
    msg: 'Uploading video',
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });

  // Create a new file document in the database
  const file = await File.create({
    originalname: req.file.originalname,
    encoding: req.file.encoding,
    mimetype: req.file.mimetype,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    type: 'video',
    metadata: {}
  });

  // Generate the full URL
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host');
  const fullUrl = `${protocol}://${host}${file.url}`;

  // Return only the URL in the response
  res.status(201).json({
    status: 'success',
    url: fullUrl
  });
});

/**
 * @swagger
 * /api/v1/videos:
 *   get:
 *     summary: Get all videos
 *     description: Retrieves a list of all video files with pagination
 *     tags: [Videos]
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
 *         description: Sort field (e.g. createdAt:desc)
 *     responses:
 *       200:
 *         description: Successfully retrieved videos
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
 *                     $ref: '#/components/schemas/File'
 */
const getAllVideos = catchAsync(async (req, res, next) => {
  logger.info({
    msg: 'Getting all videos',
    query: req.query
  });

  // Build query to filter only videos
  const queryObj = { ...req.query, type: 'video' };
  const excludeFields = ['page', 'sort', 'limit', 'fields'];
  excludeFields.forEach(field => delete queryObj[field]);

  // Advanced filtering
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  let query = File.find(JSON.parse(queryStr));

  // Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 100;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  // Execute query
  const videos = await query;

  // Add full URLs to all videos
  const videosWithUrls = addFullUrlToMany(videos, req);

  // Send response
  res.status(200).json({
    status: 'success',
    results: videos.length,
    data: videosWithUrls
  });
});

module.exports = {
  uploadVideo,
  getAllVideos
}; 