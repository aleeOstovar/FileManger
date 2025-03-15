const express = require('express');
const { 
  createApiKey, 
  getAllApiKeys, 
  revokeApiKey 
} = require('../controllers/apiKeyController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: API key management operations
 */

// All routes after this point are protected and require admin permission
router.use(protect);
router.use(restrictTo('admin'));

router.route('/')
  .post(createApiKey)
  .get(getAllApiKeys);

router.route('/:id')
  .delete(revokeApiKey);

module.exports = router; 