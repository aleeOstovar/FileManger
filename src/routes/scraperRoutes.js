const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');

// Get scraper status
router.get('/status', scraperController.getStatus);

// Get scraper statistics
router.get('/stats', scraperController.getStats);

// Trigger scraping
router.post('/trigger', scraperController.triggerScraping);

module.exports = router; 