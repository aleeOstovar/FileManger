const express = require('express');
const { 
  getAllFiles, 
  getFile, 
  deleteFile, 
  getFileStats 
} = require('../controllers/fileController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File management operations
 */

router.route('/')
  .get(getAllFiles);

router.route('/stats')
  .get(getFileStats);

router.route('/:id')
  .get(getFile)
  .delete(deleteFile);

module.exports = router; 