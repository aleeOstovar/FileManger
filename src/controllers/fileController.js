const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const File = require('../models/File');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const { addFullUrl, addFullUrlToMany } = require('../utils/fileUtils');

const unlinkAsync = promisify(fs.unlink);

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: Get all files
 *     description: Retrieves a list of all files with pagination
 *     tags: [Files]
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
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by file type (image, document, video)
 *     responses:
 *       200:
 *         description: Successfully retrieved files
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
const getAllFiles = catchAsync(async (req, res, next) => {
  logger.info({
    msg: 'Getting all files',
    query: req.query
  });

  // Build query
  const queryObj = { ...req.query };
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
  const files = await query;

  // Add full URLs to all files
  const filesWithUrls = addFullUrlToMany(files, req);

  // Send response
  res.status(200).json({
    status: 'success',
    results: files.length,
    data: filesWithUrls
  });
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Get a single file
 *     description: Retrieves a single file by ID
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: Successfully retrieved file
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
 *       404:
 *         description: File not found
 */
const getFile = catchAsync(async (req, res, next) => {
  logger.info({
    msg: 'Getting file by ID',
    id: req.params.id
  });

  const file = await File.findById(req.params.id);

  if (!file) {
    return next(new AppError('No file found with that ID', 404));
  }

  // Add full URL to the file
  const fileWithUrl = addFullUrl(file, req);

  res.status(200).json({
    status: 'success',
    data: fileWithUrl
  });
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Delete a file
 *     description: Deletes a file by ID from both database and filesystem
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       204:
 *         description: File successfully deleted
 *       404:
 *         description: File not found
 */
const deleteFile = catchAsync(async (req, res, next) => {
  logger.info({
    msg: 'Deleting file',
    id: req.params.id
  });

  const file = await File.findById(req.params.id);

  if (!file) {
    return next(new AppError('No file found with that ID', 404));
  }

  // Delete the file from filesystem
  try {
    await unlinkAsync(file.path);
    logger.info(`File deleted from filesystem: ${file.path}`);
  } catch (err) {
    logger.error(`Error deleting file from filesystem: ${err.message}`);
    return next(new AppError('Error deleting file from filesystem', 500));
  }

  // Delete file document from database
  await File.findByIdAndDelete(req.params.id);

  res.status(204).send();
});

/**
 * @swagger
 * /api/v1/files/stats:
 *   get:
 *     summary: Get file statistics
 *     description: Get statistics about files (count, total size by type)
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: Successfully retrieved file statistics
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
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: image
 *                           count:
 *                             type: integer
 *                             example: 10
 *                           totalSize:
 *                             type: integer
 *                             example: 1048576
 */
const getFileStats = catchAsync(async (req, res, next) => {
  logger.info('Getting file statistics');

  const stats = await File.getStats();

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

module.exports = {
  getAllFiles,
  getFile,
  deleteFile,
  getFileStats
}; 