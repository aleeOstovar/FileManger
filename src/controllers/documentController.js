const File = require('../models/File');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/documents:
 *   post:
 *     summary: Upload document
 *     description: Upload a new document file
 *     tags: [Documents]
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
 *                 description: Document file to upload
 *     responses:
 *       201:
 *         description: Document successfully uploaded
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
const uploadDocument = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a document file', 400));
  }

  logger.info({
    msg: 'Uploading document',
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
    type: 'document',
    metadata: {}
  });

  res.status(201).json({
    status: 'success',
    data: file
  });
});

/**
 * @swagger
 * /api/v1/documents:
 *   get:
 *     summary: Get all documents
 *     description: Retrieves a list of all document files with pagination
 *     tags: [Documents]
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
 *         description: Successfully retrieved documents
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
const getAllDocuments = catchAsync(async (req, res, next) => {
  logger.info({
    msg: 'Getting all documents',
    query: req.query
  });

  // Build query to filter only documents
  const queryObj = { ...req.query, type: 'document' };
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
  const documents = await query;

  // Send response
  res.status(200).json({
    status: 'success',
    results: documents.length,
    data: documents
  });
});

module.exports = {
  uploadDocument,
  getAllDocuments
}; 