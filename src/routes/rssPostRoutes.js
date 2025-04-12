const express = require('express');
const {
  getAllRssPosts,
  getRssPost,
  createRssPost,
  updateRssPost,
  deleteRssPost
} = require('../controllers/rssPostController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: RSS Posts
 *   description: RSS post management operations
 */

router.route('/')
  .get(getAllRssPosts)
  .post(createRssPost);

router.route('/:id')
  .get(getRssPost)
  .patch(updateRssPost)
  .delete(deleteRssPost);

module.exports = router; 