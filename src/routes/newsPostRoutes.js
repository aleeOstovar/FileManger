const express = require('express');
const newsPostController = require('../controllers/newsPostController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: News Posts
 *   description: News post management
 */

// Public routes (no authentication required)
router.get('/', newsPostController.getAllNewsPosts);
router.get('/count', newsPostController.getNewsPostCount);
router.get('/stats', newsPostController.getNewsPostStats);
router.get('/:id', newsPostController.getNewsPost);

// Protected routes (require API key authentication)
router.use(protect);
router.post('/check', newsPostController.checkArticleExists);
router.post('/', newsPostController.createNewsPost);
router.patch('/:id', newsPostController.updateNewsPost);
router.delete('/:id', newsPostController.deleteNewsPost);

module.exports = router; 