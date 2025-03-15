const express = require('express');
const { 
  uploadImage, 
  getAllImages 
} = require('../controllers/imageController');
const { uploadImage: imageUploadMiddleware, handleMulterError } = require('../middlewares/upload');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Images
 *   description: Image management operations
 */

router.route('/')
  .get(getAllImages)
  .post(imageUploadMiddleware.single('file'), handleMulterError, uploadImage);

module.exports = router; 