const axios = require('axios');

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:8000/api/v1';

class ScraperService {
    async getStatus() {
        try {
            const response = await axios.get(`${SCRAPER_API_URL}/monitoring/status`);
            return response.data;
        } catch (error) {
            console.error('Error fetching scraper status:', error.message);
            return {
                status: 'error',
                scheduler: {
                    is_running: false,
                    next_run: null,
                    last_run: null
                },
                enabled_sources: [],
                last_scrape_results: null
            };
        }
    }

    async getStats() {
        try {
            const response = await axios.get(`${SCRAPER_API_URL}/monitoring/stats`);
            return response.data;
        } catch (error) {
            console.error('Error fetching scraper stats:', error.message);
            return {
                total_articles: 0,
                sources: {},
                last_run: null
            };
        }
    }

    async triggerScraping(source = null) {
        try {
            // Pass source as a query parameter if provided
            const url = `${SCRAPER_API_URL}/monitoring/trigger${source ? `?source=${source}` : ''}`;
            const response = await axios.post(url);
            return response.data;
        } catch (error) {
            console.error('Error triggering scraping:', error.message);
            throw new Error(error.response?.data?.detail || 'Failed to trigger scraping');
        }
    }
}

module.exports = new ScraperService(); 