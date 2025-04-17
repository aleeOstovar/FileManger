const express = require('express');
const {
  getAllRssPosts,
  getRssPost,
  createRssPost,
  updateRssPost,
  deleteRssPost,
  checkRssPostExists
} = require('../controllers/rssPostController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: RSS Posts
 *   description: RSS post management operations
 */

router.route('/')
  .get(getAllRssPosts)
  .post(protect, createRssPost);

router.route('/check-exists')
  .post(checkRssPostExists);

router.route('/:id')
  .get(getRssPost)
  .patch(updateRssPost)
  .delete(deleteRssPost);

module.exports = router; 