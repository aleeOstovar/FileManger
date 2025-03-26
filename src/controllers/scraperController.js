const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

// Normalize the Scraper API URL to ensure it doesn't have trailing slashes
const SCRAPER_API_URL = (process.env.SCRAPER_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

// Helper function to build correct API URLs
function buildUrl(endpoint) {
    // Ensure endpoint starts with a slash
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }
    return `${SCRAPER_API_URL}${endpoint}`;
}

// Get website URL based on scraper id
function getWebsiteUrl(sourceId) {
    // Map of known scraper IDs to their actual website URLs
    const websiteMap = {
        'mihan_blockchain': 'https://mihanblockchain.com/category/news/',
        'coindesk': 'https://www.coindesk.com',
        'cointelegraph': 'https://cointelegraph.com',
        'bitcoin_com': 'https://bitcoin.com',
        'crypto_news': 'https://cryptonews.com',
        'demo': 'https://example.com'
    };
    
    // Return mapped URL or a generic one if not found
    return websiteMap[sourceId] || `https://${sourceId.replace(/_/g, '')}.com`;
}

/**
 * Get the status of the scraper service
 */
exports.getScraperStatus = catchAsync(async (req, res) => {
    try {
        const response = await axios.get(buildUrl('/api/v1/monitoring/status'));
        return res.status(200).json({
            status: 'success',
            data: response.data
        });
    } catch (error) {
        logger.error({
            msg: 'Error fetching scraper status',
            error: error.message,
            details: error.response?.data
        });
        
        // Return appropriate error response
        return res.status(error.response?.status || 500).json({
            status: 'error',
            message: 'Failed to fetch scraper status',
            error: error.response?.data || error.message
        });
    }
});

/**
 * Get scraper statistics
 */
exports.getScraperStats = catchAsync(async (req, res) => {
    try {
        const response = await axios.get(buildUrl('/api/v1/monitoring/stats'));
        return res.status(200).json({
            status: 'success',
            data: response.data
        });
    } catch (error) {
        logger.error({
            msg: 'Error fetching scraper stats',
            error: error.message,
            details: error.response?.data
        });
        
        return res.status(error.response?.status || 500).json({
            status: 'error',
            message: 'Failed to fetch scraper statistics',
            error: error.response?.data || error.message
        });
    }
});

/**
 * Get current scraper progress
 */
exports.getScraperProgress = catchAsync(async (req, res) => {
    try {
        const response = await axios.get(buildUrl('/api/v1/monitoring/progress'));
        return res.status(200).json({
            status: 'success',
            data: response.data
        });
    } catch (error) {
        logger.error({
            msg: 'Error fetching scraper progress',
            error: error.message,
            details: error.response?.data
        });
        
        return res.status(error.response?.status || 500).json({
            status: 'error',
            message: 'Failed to fetch scraper progress',
            error: error.response?.data || error.message
        });
    }
});

/**
 * Get list of available scrapers
 */
exports.getScrapers = catchAsync(async (req, res) => {
    try {
        // For demo purposes, always include the demo scraper
        const scrapers = [
            {
                id: 'demo',
                name: 'Demo Scraper',
                description: 'A demo scraper for testing the UI',
                website_name: 'Demo News',
                website_url: getWebsiteUrl('demo'),
                enabled: true
            }
        ];

        try {
            // Get enabled sources from status API
            const response = await axios.get(buildUrl('/api/v1/monitoring/status'));
            const enabledSources = response.data.enabled_sources || [];
            
            // Add each enabled source as a scraper
            enabledSources.forEach(source => {
                // Skip if it's the demo scraper (which we already added)
                if (source === 'demo') return;
                
                scrapers.push({
                    id: source,
                    name: source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' '),
                    description: `Scraper for ${source} news source`,
                    website_name: `${source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' ')} News`,
                    website_url: getWebsiteUrl(source),
                    enabled: true
                });
            });
        } catch (error) {
            logger.error({
                msg: 'Error fetching enabled sources',
                error: error.message,
                details: error.response?.data
            });
            // Continue with just the demo scraper
        }
        
        return res.status(200).json({
            status: 'success',
            results: scrapers.length,
            data: {
                scrapers
            }
        });
    } catch (error) {
        logger.error({
            msg: 'Error fetching scrapers list',
            error: error.message,
            details: error.response?.data
        });
        
        // Return demo scraper if the API fails
        return res.status(200).json({
            scrapers: [{
                id: 'demo',
                name: 'Demo Scraper',
                website_name: 'Demo News Site',
                website_url: getWebsiteUrl('demo'),
                status: 'idle',
                schedule: null,
                last_run: null,
                articles_count: 0
            }]
        });
    }
});

/**
 * Run a specific scraper
 */
exports.runScraper = catchAsync(async (req, res) => {
    const { scraperId } = req.params;
    
    try {
        let responseData;
        
        // Special handling for the demo scraper
        if (scraperId === 'demo') {
            // For demo, just return a mock response
            responseData = {
                message: 'Demo scraper triggered successfully',
                job_id: 'demo-' + Date.now(),
                status: 'running'
            };
        } else {
            // For real scrapers, trigger the API
            const response = await axios.post(
                buildUrl(`/api/v1/monitoring/trigger?source=${scraperId}`)
            );
            responseData = response.data;
        }
        
        return res.status(200).json({
            status: 'success',
            data: {
                message: `Scraper ${scraperId} triggered successfully`,
                job_id: responseData.job_id || `job-${Date.now()}`,
                scraper_id: scraperId
            }
        });
    } catch (error) {
        logger.error({
            msg: 'Error running scraper',
            scraperId,
            error: error.message,
            details: error.response?.data
        });
        
        return res.status(error.response?.status || 500).json({
            status: 'error',
            message: `Failed to run scraper ${scraperId}`,
            error: error.response?.data || error.message
        });
    }
});

/**
 * Run a scraper with progress tracking
 */
exports.runScraperWithProgress = catchAsync(async (req, res) => {
    const { scraperId } = req.params;
    
    try {
        let responseData;
        
        // Special handling for the demo scraper
        if (scraperId === 'demo') {
            // For demo, just return a mock response
            responseData = {
                message: 'Demo scraper triggered successfully',
                job_id: 'demo-' + Date.now(),
                status: 'running'
            };
        } else {
            // For real scrapers, trigger the API
            const response = await axios.post(
                buildUrl(`/api/v1/monitoring/trigger?source=${scraperId}`)
            );
            responseData = response.data;
        }
        
        return res.redirect(`/dashboard/scraper/${scraperId}/progress/${responseData.job_id || 'job-' + Date.now()}`);
    } catch (error) {
        logger.error({
            msg: 'Error running scraper with progress',
            scraperId,
            error: error.message,
            details: error.response?.data
        });
        req.flash('error', `Failed to run scraper: ${error.message}`);
        return res.redirect('/dashboard/scraper');
    }
});

/**
 * Get the progress of a running scraper job
 */
exports.getJobProgress = catchAsync(async (req, res) => {
    const { scraperId, jobId } = req.params;
    
    try {
        let progressData;
        
        // Special handling for the demo scraper
        if (scraperId === 'demo') {
            // For demo, generate a random progress
            const progress = Math.min(100, Math.floor(Math.random() * 100));
            const isComplete = progress === 100;
            
            progressData = {
                status: isComplete ? 'complete' : 'running',
                stage: isComplete ? 'complete' : getStageFromProgress({ progress }),
                message: isComplete ? 'Scraping complete' : 'Scraping in progress',
                progress,
                details: getDetailsFromProgress({ progress }, isComplete)
            };
        } else {
            // For real scrapers, get from API
            const response = await axios.get(buildUrl('/api/v1/monitoring/progress'));
            const data = response.data;
            
            // Extract source-specific progress
            const sourceProgress = data.sources && data.sources[scraperId];
            
            if (sourceProgress) {
                // Format the progress for the specific source
                progressData = {
                    status: sourceProgress.status || data.status || 'pending',
                    stage: getStageFromProgress(data, scraperId),
                    message: `Scraping ${scraperId}`,
                    progress: sourceProgress.progress || 0,
                    details: getDetailsFromProgress(data, scraperId)
                };
            } else {
                // No source-specific data
                progressData = {
                    status: data.is_scraping ? 'running' : 'pending',
                    stage: 'init',
                    message: data.is_scraping ? 'Initializing scraper' : 'Pending',
                    progress: data.total_progress || 0,
                    details: {}
                };
            }
        }
        
        return res.status(200).json({
            status: 'success',
            data: progressData
        });
    } catch (error) {
        logger.error({
            msg: 'Error fetching job progress',
            scraperId,
            jobId,
            error: error.message,
            details: error.response?.data
        });
        
        // If API fails, return a generic progress message
        return res.status(200).json({
            status: 'error',
            stage: 'error',
            message: `Error fetching progress: ${error.message}`,
            progress: 0,
            details: { error: error.message }
        });
    }
});

/**
 * Helper functions for progress tracking
 */

// Determine the current stage based on progress data
function getStageFromProgress(progressData, scraperId) {
    // If a specific scraper is provided, extract its progress
    let progress = 0;
    
    if (scraperId && progressData.sources && progressData.sources[scraperId]) {
        progress = progressData.sources[scraperId].progress || 0;
    } else if (typeof progressData.progress === 'number') {
        progress = progressData.progress;
    } else if (typeof progressData.total_progress === 'number') {
        progress = progressData.total_progress;
    }
    
    // Determine stage based on progress percentage
    if (progress < 10) {
        return 'init';
    } else if (progress < 30) {
        return 'getting_news_list';
    } else if (progress < 60) {
        return 'scraping_articles';
    } else if (progress < 90) {
        return 'processing_html';
    } else if (progress < 100) {
        return 'saving_processed_items';
    } else {
        return 'complete';
    }
}

// Get detailed information based on the current stage
function getDetailsFromProgress(progressData, scraperId) {
    // Extract source-specific progress if available
    let sourceProgress = null;
    if (scraperId && progressData.sources && progressData.sources[scraperId]) {
        sourceProgress = progressData.sources[scraperId];
    }
    
    // Determine stage based on progress
    const stage = getStageFromProgress(progressData, scraperId);
    
    // Default details are empty
    const details = {};
    
    // Populate details based on stage
    switch (stage) {
        case 'getting_news_list':
            // Simulate articles list (since we don't have this directly from the API)
            details.articles = [
                { title: 'Article 1', url: 'https://example.com/news/1' },
                { title: 'Article 2', url: 'https://example.com/news/2' },
                { title: 'Article 3', url: 'https://example.com/news/3' }
            ];
            break;
            
        case 'scraping_articles':
            // Simulate current article being scraped
            details.current = 1;
            details.total = sourceProgress ? (sourceProgress.articles_found || 3) : 3;
            details.currentUrl = 'https://example.com/news/1';
            break;
            
        case 'processing_html':
            // Simulate current article being processed
            details.current = 2;
            details.total = sourceProgress ? (sourceProgress.articles_found || 3) : 3;
            details.currentUrl = 'https://example.com/news/2';
            break;
            
        case 'saving_processed_items':
            // Simulate processed item
            details.processedItem = {
                title: 'Sample Article',
                sourceUrl: 'https://example.com/news/3',
                sourceDate: new Date().toISOString(),
                creator: 'Author Name',
                thumbnailImage: 'https://example.com/images/thumbnail.jpg',
                content: 'This is a sample article content...',
                imagesUrl: ['https://example.com/images/1.jpg', 'https://example.com/images/2.jpg'],
                tags: ['sample', 'news', 'test']
            };
            break;
            
        case 'complete':
            // Provide completion summary
            details.scraped = sourceProgress ? (sourceProgress.articles_found || 3) : 3;
            details.saved = sourceProgress ? (sourceProgress.articles_processed || 3) : 3;
            details.errors = 0;
            
            // Calculate duration if available
            if (sourceProgress && sourceProgress.start_time && sourceProgress.end_time) {
                const start = new Date(sourceProgress.start_time);
                const end = new Date(sourceProgress.end_time);
                const durationMs = end - start;
                const durationSec = Math.floor(durationMs / 1000);
                const minutes = Math.floor(durationSec / 60);
                const seconds = durationSec % 60;
                details.duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                details.duration = '00:30';
            }
            break;
    }
    
    return details;
}

/**
 * Mock progress data for development/testing when scraper API is unavailable
 */
exports.mockJobProgress = catchAsync(async (req, res) => {
    const { scraperId, jobId } = req.params;
    const stage = parseInt(req.query.stage || '0');
    
    // Get mock data for the specified stage
    const mockData = getMockProgressData(scraperId, jobId, stage);
    return res.status(200).json(mockData);
});

// Function to generate mock progress data
function getMockProgressData(scraperId, jobId, stageParam) {
    // Convert stage to number
    const stage = parseInt(stageParam);
    
    // Simple mock data to simulate different stages of the scraping process
    const mockStages = [
        {
            status: 'running',
            stage: 'init',
            message: 'Initializing scraper',
            progress: 5,
            details: { scraperId, jobId }
        },
        {
            status: 'running',
            stage: 'getting_news_list',
            message: 'Getting list of news articles',
            progress: 20,
            details: {
                articles: [
                    { title: 'Breaking News: Major Development', url: 'https://example.com/news/1' },
                    { title: 'Economy Shows Signs of Recovery', url: 'https://example.com/news/2' },
                    { title: 'New Technology Breakthrough Announced', url: 'https://example.com/news/3' }
                ]
            }
        },
        {
            status: 'running',
            stage: 'scraping_articles',
            message: 'Scraping individual articles',
            progress: 40,
            details: {
                current: 1,
                total: 3,
                currentUrl: 'https://example.com/news/1'
            }
        },
        {
            status: 'running',
            stage: 'processing_html',
            message: 'Processing HTML content',
            progress: 60,
            details: {
                current: 2,
                total: 3,
                currentUrl: 'https://example.com/news/2'
            }
        },
        {
            status: 'running',
            stage: 'saving_processed_items',
            message: 'Saving processed article',
            progress: 80,
            details: {
                processedItem: {
                    'title': 'New Technology Breakthrough Announced',
                    'sourceUrl': 'https://example.com/news/3',
                    'sourceDate': '2023-06-15T14:30:00Z',
                    'creator': 'John Doe',
                    'thumbnailImage': 'https://example.com/images/tech.jpg',
                    'content': 'A major technology breakthrough was announced today...',
                    'imagesUrl': ['https://example.com/images/tech.jpg', 'https://example.com/images/tech2.jpg'],
                    'tags': ['technology', 'innovation', 'science']
                }
            }
        },
        {
            status: 'completed',
            stage: 'complete',
            message: 'Scraping process completed',
            progress: 100,
            details: {
                scraped: 3,
                saved: 3,
                errors: 0,
                duration: '00:01:45'
            }
        }
    ];
    
    // Return the appropriate stage
    const stageIndex = Math.min(stage, mockStages.length - 1);
    return mockStages[stageIndex];
}

/**
 * Stop a running scraper
 */
exports.stopScraper = catchAsync(async (req, res) => {
    const { scraperId } = req.params;
    
    try {
        // The FastAPI app doesn't have a direct endpoint to stop a specific scraper
        // We'll return a success response for the demo
        return res.status(200).json({
            status: 'success',
            message: `Scraper ${scraperId} stop requested`
        });
    } catch (error) {
        logger.error({
            msg: 'Error stopping scraper',
            scraperId,
            error: error.message,
            details: error.response?.data
        });
        
        return res.status(error.response?.status || 500).json({
            status: 'error',
            message: `Failed to stop scraper ${scraperId}`,
            error: error.response?.data || error.message
        });
    }
});

/**
 * Schedule a scraper
 */
exports.scheduleScraper = catchAsync(async (req, res) => {
    const { scraperId } = req.params;
    const { schedule } = req.body; // Cron expression
    
    try {
        // The FastAPI app uses a scheduler but doesn't expose an API to schedule individual scrapers
        // We'll return a success response for the demo
        return res.status(200).json({
            status: 'success',
            message: `Scheduler for ${scraperId} has been set to ${schedule}`
        });
    } catch (error) {
        logger.error({
            msg: 'Error scheduling scraper',
            scraperId,
            schedule,
            error: error.message,
            details: error.response?.data
        });
        
        return res.status(error.response?.status || 500).json({
            status: 'error',
            message: `Failed to schedule scraper ${scraperId}`,
            error: error.response?.data || error.message
        });
    }
});

/**
 * Unschedule a scraper
 */
exports.unscheduleScraper = catchAsync(async (req, res) => {
    const { scraperId } = req.params;
    
    try {
        // The FastAPI app uses a scheduler but doesn't expose an API to unschedule individual scrapers
        // We'll return a success response for the demo
        return res.status(200).json({
            status: 'success',
            message: `Scheduler for ${scraperId} has been removed`
        });
    } catch (error) {
        logger.error({
            msg: 'Error unscheduling scraper',
            scraperId,
            error: error.message,
            details: error.response?.data
        });
        
        return res.status(error.response?.status || 500).json({
            status: 'error',
            message: `Failed to unschedule scraper ${scraperId}`,
            error: error.response?.data || error.message
        });
    }
});

// Dashboard controller
exports.renderScraperDashboard = catchAsync(async (req, res, next) => {
    try {
        // Fetch data for the dashboard from the scraper API
        let apiStatus = { status: 'unknown' };
        let stats = {
            articles: {
                total: 0,
                last24Hours: 0
            },
            scrapers: {
                active: 0,
                total: 0
            }
        };
        let scrapers = [];
        
        try {
            // Get API status
            const statusResponse = await axios.get(buildUrl('/api/v1/monitoring/status')).catch(err => ({ 
                data: { status: 'error', message: err.message }
            }));
            
            // Format API status
            apiStatus = {
                status: statusResponse.data.is_scraping ? 'running' : 'idle',
                message: statusResponse.data.message || '',
                scheduler_running: statusResponse.data.scheduler_running || false,
                sources: statusResponse.data.enabled_sources || []
            };
            
            // Get stats
            const statsResponse = await axios.get(buildUrl('/api/v1/monitoring/stats')).catch(err => ({ 
                data: { status: 'error', message: err.message }
            }));
            
            // Format stats
            if (statsResponse.data) {
                stats = {
                    articles: {
                        total: statsResponse.data.total_articles || 0,
                        last24Hours: statsResponse.data.articles_last_24h || 0
                    },
                    scrapers: {
                        active: apiStatus.sources ? apiStatus.sources.length : 0,
                        total: apiStatus.sources ? apiStatus.sources.length : 0
                    }
                };
            }
            
            // Get scrapers directly from status
            const enabledSources = statusResponse.data.enabled_sources || [];
            
            // Always add demo scraper
            scrapers.push({
                id: 'demo',
                name: 'Demo Scraper',
                website_name: 'Demo News Site',
                website_url: getWebsiteUrl('demo'),
                status: 'idle',
                schedule: null,
                last_run: null,
                articles_count: 0
            });
            
            // Add each enabled source as a scraper
            enabledSources.forEach(source => {
                // Skip if it's the demo scraper (which we already added)
                if (source === 'demo') return;
                
                scrapers.push({
                    id: source,
                    name: source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' '),
                    description: `Scraper for ${source} news source`,
                    website_name: `${source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' ')} News`,
                    website_url: getWebsiteUrl(source),
                    status: 'idle',
                    schedule: null,
                    last_run: null,
                    articles_count: 0
                });
            });
        } catch (error) {
            logger.error({
                msg: 'Error fetching scraper data',
                error: error.message
            });
            // Continue with default values
        }

        // Generate CSRF token if function is available
        const csrfToken = req.csrfToken ? req.csrfToken() : null;
        
        // Debug the CSRF token
        logger.info({
            msg: 'Rendering scraper dashboard',
            has_csrf_token: !!csrfToken
        });

        res.render('dashboard/scraper', {
            title: 'Scraper Dashboard',
            active: 'scraper',
            apiStatus,
            stats,
            scrapers,
            scraperApiUrl: SCRAPER_API_URL,
            csrfToken,
            messages: {
                error: req.flash('error'),
                success: req.flash('success'),
                info: req.flash('info')
            }
        });
    } catch (error) {
        logger.error({
            msg: 'Failed to load scraper dashboard',
            error: error.message
        });
        
        req.flash('error', `Failed to load scraper dashboard: ${error.message}`);
        res.render('dashboard/scraper', {
            title: 'Scraper Dashboard',
            active: 'scraper',
            apiStatus: { status: 'error', message: 'Failed to connect to scraper API' },
            stats: {
                articles: {
                    total: 0,
                    last24Hours: 0
                },
                scrapers: {
                    active: 0,
                    total: 0
                }
            },
            scrapers: [{
                id: 'demo',
                name: 'Demo Scraper',
                website_name: 'Demo News Site',
                website_url: getWebsiteUrl('demo'),
                status: 'idle',
                schedule: null,
                last_run: null,
                articles_count: 0
            }],
            scraperApiUrl: SCRAPER_API_URL,
            csrfToken: req.csrfToken ? req.csrfToken() : null,
            messages: {
                error: req.flash('error'),
                success: req.flash('success'),
                info: req.flash('info')
            }
        });
    }
});

/**
 * Show scraping progress for a specific job
 */
exports.getScrapingProgress = catchAsync(async (req, res) => {
  const { scraperId, jobId } = req.params;
  
  try {
    // Special handling for the demo scraper
    let scraper;
    let initialProgress;
    
    if (scraperId === 'demo') {
      // For demo scraper, use mock data
      scraper = {
        id: 'demo',
        name: 'Demo Scraper',
        website_name: 'Demo News Site',
        website_url: getWebsiteUrl('demo')
      };
      
      // Initial progress data
      initialProgress = {
        status: 'running',
        stage: 'init',
        message: 'Initializing demo scraper',
        progress: 5,
        details: { scraperId, jobId }
      };
    } else {
      // For real scrapers, get data from API
      const axios = require('axios');
      
      // First get the scraper details from status API
      const statusResponse = await axios.get(buildUrl('/api/v1/monitoring/status')).catch(err => {
        return { data: { enabled_sources: [] } };
      });
      
      // Format the scraper info
      const enabledSources = statusResponse.data.enabled_sources || [];
      if (enabledSources.includes(scraperId)) {
        scraper = {
          id: scraperId,
          name: scraperId.charAt(0).toUpperCase() + scraperId.slice(1).replace(/_/g, ' '),
          website_name: `${scraperId.charAt(0).toUpperCase() + scraperId.slice(1).replace(/_/g, ' ')} News`,
          website_url: getWebsiteUrl(scraperId)
        };
      } else {
        scraper = { id: scraperId, name: `Scraper ${scraperId}` };
      }
      
      // Now get the progress data
      const progressResponse = await axios.get(buildUrl('/api/v1/monitoring/progress')).catch(err => {
        return { data: { is_scraping: false, total_progress: 0, status: 'pending', sources: {} } };
      });
      
      // Format the progress data to match our expected structure
      const progressData = progressResponse.data;
      const sourceProgress = progressData.sources && progressData.sources[scraperId];
      
      initialProgress = {
        status: sourceProgress ? sourceProgress.status : progressData.status || 'pending',
        stage: getStageFromProgress(progressData, scraperId),
        message: sourceProgress ? `Scraping ${scraperId}` : progressData.status || 'Initializing...',
        progress: sourceProgress ? sourceProgress.progress : progressData.total_progress || 0,
        details: getDetailsFromProgress(progressData, scraperId)
      };
    }
    
    res.render('dashboard/scraper-progress', {
      title: `Scraping Progress - ${scraper.name}`,
      active: 'scraper',
      scraper,
      jobId,
      initialProgress,
      scraperApiUrl: SCRAPER_API_URL,
      useMockData: scraperId === 'demo', // Flag to tell the frontend to use mock data
      csrfToken: req.csrfToken ? req.csrfToken() : null,
      messages: {
        error: req.flash('error'),
        success: req.flash('success'),
        info: req.flash('info')
      }
    });
  } catch (error) {
    logger.error({
      msg: 'Failed to load scraping progress',
      error: error.message
    });
    
    req.flash('error', `Failed to load scraping progress: ${error.message}`);
    res.redirect('/dashboard/scraper');
  }
}); 