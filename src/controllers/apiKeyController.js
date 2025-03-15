const ApiKey = require('../models/ApiKey');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/api-keys:
 *   post:
 *     summary: Create a new API key
 *     description: Create a new API key with specified permissions (admin only)
 *     tags: [API Keys]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name/description for the API key
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of permissions (read, write, delete, admin)
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date (optional)
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/ApiKey'
 */
const createApiKey = catchAsync(async (req, res, next) => {
  const { name, permissions = ['read'], expiresAt = null } = req.body;
  
  if (!name) {
    return next(new AppError('API key name is required', 400));
  }
  
  logger.info({
    msg: 'Creating new API key',
    name,
    permissions,
    expiresAt
  });
  
  // Generate a new API key
  const apiKey = await ApiKey.generateKey(name, permissions, expiresAt);
  
  res.status(201).json({
    status: 'success',
    data: apiKey
  });
});

/**
 * @swagger
 * /api/v1/api-keys:
 *   get:
 *     summary: Get all API keys
 *     description: Retrieve a list of all API keys (admin only)
 *     tags: [API Keys]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of API keys retrieved successfully
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
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiKey'
 */
const getAllApiKeys = catchAsync(async (req, res, next) => {
  logger.info('Getting all API keys');
  
  const apiKeys = await ApiKey.find().select('-__v');
  
  res.status(200).json({
    status: 'success',
    results: apiKeys.length,
    data: apiKeys
  });
});

/**
 * @swagger
 * /api/v1/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     description: Revoke an existing API key by setting it as inactive (admin only)
 *     tags: [API Keys]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       204:
 *         description: API key successfully revoked
 *       404:
 *         description: API key not found
 */
const revokeApiKey = catchAsync(async (req, res, next) => {
  logger.info({
    msg: 'Revoking API key',
    id: req.params.id
  });
  
  const apiKey = await ApiKey.findById(req.params.id);
  
  if (!apiKey) {
    return next(new AppError('No API key found with that ID', 404));
  }
  
  // Set key as inactive
  apiKey.active = false;
  await apiKey.save();
  
  res.status(204).send();
});

module.exports = {
  createApiKey,
  getAllApiKeys,
  revokeApiKey
}; 