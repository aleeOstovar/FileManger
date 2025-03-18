const scraperService = require('../services/scraperService');

class ScraperController {
    async getStatus(req, res) {
        try {
            const status = await scraperService.getStatus();
            res.json(status);
        } catch (error) {
            console.error('Error in getStatus controller:', error);
            res.status(500).json({ 
                error: error.message,
                status: 'error',
                scheduler: {
                    is_running: false,
                    next_run: null,
                    last_run: null
                }
            });
        }
    }

    async getStats(req, res) {
        try {
            const stats = await scraperService.getStats();
            res.json(stats);
        } catch (error) {
            console.error('Error in getStats controller:', error);
            res.status(500).json({ 
                error: error.message,
                total_articles: 0,
                sources: {},
                last_run: null
            });
        }
    }

    async triggerScraping(req, res) {
        try {
            // Get the source from query parameters
            const source = req.query.source || req.body.source;
            const result = await scraperService.triggerScraping(source);
            res.json(result);
        } catch (error) {
            console.error('Error in triggerScraping controller:', error);
            res.status(500).json({ 
                error: error.message || 'Failed to trigger scraping',
                status: 'error'
            });
        }
    }
}

module.exports = new ScraperController(); 