const express = require('express');
const scraperController = require('../controllers/scraperController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// API Routes
router.get('/status', scraperController.getScraperStatus);
router.get('/stats', scraperController.getScraperStats);
router.get('/progress', scraperController.getScraperProgress);
router.get('/', scraperController.getScrapers);
router.post('/:id/run', scraperController.runScraper);
router.get('/:scraperId/progress/:jobId', scraperController.getJobProgress);

module.exports = router; 