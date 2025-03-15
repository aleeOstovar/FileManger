const express = require('express');
const { 
  uploadDocument, 
  getAllDocuments 
} = require('../controllers/documentController');
const { uploadDocument: documentUploadMiddleware, handleMulterError } = require('../middlewares/upload');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document management operations
 */

router.route('/')
  .get(getAllDocuments)
  .post(documentUploadMiddleware.single('file'), handleMulterError, uploadDocument);

module.exports = router; 