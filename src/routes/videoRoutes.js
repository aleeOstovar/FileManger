const express = require('express');
const { 
  uploadVideo, 
  getAllVideos 
} = require('../controllers/videoController');
const { uploadVideo: videoUploadMiddleware, handleMulterError } = require('../middlewares/upload');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Videos
 *   description: Video management operations
 */

router.route('/')
  .get(getAllVideos)
  .post(videoUploadMiddleware.single('file'), handleMulterError, uploadVideo);

module.exports = router; 