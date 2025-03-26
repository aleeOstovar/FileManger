// Scraper Progress UI
$(document).ready(function() {
  const useMockData = $('#scraper-progress').data('use-mock');
  const scraperId = $('#scraper-progress').data('scraper-id');
  const jobId = $('#scraper-progress').data('job-id');
  const apiUrl = $('#scraper-progress').data('api-url');
  
  let running = true;
  
  // Initialize progress with data from server
  const initialProgress = $('#scraper-progress').data('initial-progress');
  updateProgressUI(initialProgress);
  
  // Start polling for updates
  const interval = setInterval(updateProgress, 2000);
  
  // Update progress from API
  async function updateProgress() {
    if (!running) {
      clearInterval(interval);
      return;
    }
    
    try {
      let progressData;
      
      if (useMockData && scraperId === 'demo') {
        progressData = getDemoProgress();
      } else {
        // Fetch real progress from API
        const response = await fetch(`${apiUrl}/api/v1/monitoring/progress`);
        const data = await response.json();
        
        // Extract progress for specific source
        const sourceProgress = data.sources && data.sources[scraperId];
        
        // Format progress data
        progressData = {
          status: sourceProgress ? sourceProgress.status : data.status || 'pending',
          stage: getStageFromProgress(data, scraperId),
          message: sourceProgress ? `Scraping ${scraperId}` : data.status || 'Initializing...',
          progress: sourceProgress ? sourceProgress.progress : data.total_progress || 0,
          details: getDetailsFromProgress(data, scraperId)
        };
      }
      
      // Update UI with progress data
      updateProgressUI(progressData);
      
      // Stop polling if scraping is complete or failed
      if (['complete', 'error', 'failed'].includes(progressData.status)) {
        running = false;
        $('#stop-scraping').hide();
        $('#back-button').show();
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      // Don't stop polling on error, just skip this update
    }
  }
  
  // Update UI elements based on progress data
  function updateProgressUI(progress) {
    // Update progress bar
    const progressBar = $('.progress-bar');
    progressBar.css('width', `${progress.progress}%`).attr('aria-valuenow', progress.progress);
    progressBar.text(`${Math.round(progress.progress)}%`);
    
    // Update status message
    $('.scraper-status').text(progress.message || 'Initializing...');
    
    // Update stage badge
    updateStageBadge(progress.stage);
    
    // Update details panel based on stage
    updateDetailsPanel(progress.stage, progress.details);
  }
  
  // Update the stage badges
  function updateStageBadge(stage) {
    // Clear all active badges
    $('.scraper-stage .badge').removeClass('badge-primary').addClass('badge-secondary');
    
    // Set the active badge
    $(`.scraper-stage .badge[data-stage="${stage}"]`).removeClass('badge-secondary').addClass('badge-primary');
  }
  
  // Update details panel based on stage
  function updateDetailsPanel(stage, details) {
    // Hide all detail panels
    $('.detail-panel').hide();
    
    // Show the panel for the current stage
    $(`.detail-panel[data-stage="${stage}"]`).show();
    
    // Update panel content based on stage
    switch (stage) {
      case 'getting_news_list':
        if (details && details.articles) {
          const articlesList = $('.detail-panel[data-stage="getting_news_list"] .articles-list');
          articlesList.empty();
          details.articles.forEach(article => {
            articlesList.append(`
              <li class="list-group-item">
                <a href="${article.url}" target="_blank">${article.title || article.url}</a>
              </li>
            `);
          });
        }
        break;
        
      case 'scraping_articles':
        if (details) {
          $('.detail-panel[data-stage="scraping_articles"] .current-article').text(details.current || '?');
          $('.detail-panel[data-stage="scraping_articles"] .total-articles').text(details.total || '?');
          $('.detail-panel[data-stage="scraping_articles"] .current-url').text(details.currentUrl || '');
        }
        break;
        
      case 'processing_html':
        if (details) {
          $('.detail-panel[data-stage="processing_html"] .current-article').text(details.current || '?');
          $('.detail-panel[data-stage="processing_html"] .total-articles').text(details.total || '?');
          $('.detail-panel[data-stage="processing_html"] .current-url').text(details.currentUrl || '');
        }
        break;
        
      case 'saving_processed_items':
        if (details && details.processedItem) {
          const item = details.processedItem;
          const processedItems = $('.detail-panel[data-stage="saving_processed_items"] .processed-items');
          
          // Only update if new item
          if (processedItems.data('last-url') !== item.sourceUrl) {
            processedItems.data('last-url', item.sourceUrl);
            
            processedItems.prepend(`
              <div class="card mb-3">
                <div class="card-header">
                  <strong>${item.title}</strong>
                </div>
                <div class="card-body">
                  <p class="card-text"><strong>Source:</strong> <a href="${item.sourceUrl}" target="_blank">${item.sourceUrl}</a></p>
                  <p class="card-text"><strong>Date:</strong> ${new Date(item.sourceDate).toLocaleString()}</p>
                  <p class="card-text"><strong>Creator:</strong> ${item.creator || 'Unknown'}</p>
                </div>
              </div>
            `);
          }
        }
        break;
        
      case 'complete':
        if (details) {
          $('.detail-panel[data-stage="complete"] .scraped-count').text(details.scraped || 0);
          $('.detail-panel[data-stage="complete"] .saved-count').text(details.saved || 0);
          $('.detail-panel[data-stage="complete"] .error-count').text(details.errors || 0);
          $('.detail-panel[data-stage="complete"] .duration').text(details.duration || '00:00');
        }
        break;
    }
  }
  
  // Stop scraping button handler
  $('#stop-scraping').on('click', function(e) {
    e.preventDefault();
    
    if (confirm('Are you sure you want to stop the scraping process?')) {
      stopScraping();
    }
  });
  
  // Stop the scraping process
  async function stopScraping() {
    try {
      // For demo scraper, just stop polling
      if (useMockData && scraperId === 'demo') {
        running = false;
        $('#stop-scraping').hide();
        $('#back-button').show();
        updateProgressUI({
          status: 'stopped',
          stage: 'complete',
          message: 'Scraping stopped by user',
          progress: 100,
          details: {
            scraped: 1,
            saved: 1,
            errors: 0,
            duration: '00:05'
          }
        });
        return;
      }
      
      // For real scrapers, call the API to stop
      const response = await fetch(`${apiUrl}/api/v1/monitoring/stop?source=${scraperId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      console.log('Stopped scraping:', result);
      
      // Update UI
      running = false;
      $('#stop-scraping').hide();
      $('#back-button').show();
      updateProgressUI({
        status: 'stopped',
        stage: 'complete',
        message: 'Scraping stopped by user',
        progress: 100,
        details: {
          scraped: 0,
          saved: 0,
          errors: 0,
          duration: '00:00'
        }
      });
    } catch (error) {
      console.error('Error stopping scraping:', error);
      alert('Failed to stop scraping: ' + error.message);
    }
  }
  
  // Demo progress simulation for testing UI
  let demoProgress = 0;
  let demoStage = 'init';
  let demoDetails = {};
  
  function getDemoProgress() {
    // Increment progress by a random amount (1-5%)
    demoProgress += Math.random() * 5 + 1;
    if (demoProgress > 100) demoProgress = 100;
    
    // Determine stage based on progress
    if (demoProgress < 10) {
      demoStage = 'init';
      demoDetails = {};
    } else if (demoProgress < 30) {
      demoStage = 'getting_news_list';
      demoDetails = {
        articles: [
          { title: 'Breaking News', url: 'https://example.com/news/1' },
          { title: 'Latest Updates', url: 'https://example.com/news/2' },
          { title: 'Weather Forecast', url: 'https://example.com/news/3' }
        ]
      };
    } else if (demoProgress < 60) {
      demoStage = 'scraping_articles';
      const current = Math.floor((demoProgress - 30) / 10) + 1;
      demoDetails = {
        current: current,
        total: 3,
        currentUrl: `https://example.com/news/${current}`
      };
    } else if (demoProgress < 80) {
      demoStage = 'processing_html';
      const current = Math.floor((demoProgress - 60) / 6.66) + 1;
      demoDetails = {
        current: current,
        total: 3,
        currentUrl: `https://example.com/news/${current}`
      };
    } else if (demoProgress < 95) {
      demoStage = 'saving_processed_items';
      demoDetails = {
        processedItem: {
          title: 'Sample News Article',
          sourceUrl: `https://example.com/news/${Math.floor(Math.random() * 10) + 1}`,
          sourceDate: new Date().toISOString(),
          creator: 'John Doe',
          thumbnailImage: 'https://example.com/images/thumbnail.jpg',
          content: 'This is a sample article content...',
          imagesUrl: ['https://example.com/images/1.jpg', 'https://example.com/images/2.jpg'],
          tags: ['demo', 'test', 'example']
        }
      };
    } else {
      demoStage = 'complete';
      demoDetails = {
        scraped: 3,
        saved: 3,
        errors: 0,
        duration: '00:15'
      };
    }
    
    // Return the progress data
    return {
      status: demoProgress >= 100 ? 'complete' : 'running',
      stage: demoStage,
      message: demoProgress >= 100 ? 'Scraping complete' : `Scraping in progress (${demoStage})`,
      progress: demoProgress,
      details: demoDetails
    };
  }
  
  // Helper function to determine the current stage based on progress data
  function getStageFromProgress(progressData, scraperId) {
    // Default stage is 'init'
    let stage = 'init';
    
    // If no progress data, return init
    if (!progressData || !progressData.sources) {
      return stage;
    }
    
    // Get source-specific progress if available
    const sourceProgress = progressData.sources[scraperId];
    if (!sourceProgress) {
      return stage;
    }
    
    // Determine stage based on progress percentage
    const progress = sourceProgress.progress || 0;
    
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
  
  // Helper function to get detailed information based on the current stage
  function getDetailsFromProgress(progressData, scraperId) {
    // Default details are empty
    const details = {};
    
    // If no progress data, return empty details
    if (!progressData || !progressData.sources) {
      return details;
    }
    
    // Get source-specific progress if available
    const sourceProgress = progressData.sources[scraperId];
    if (!sourceProgress) {
      return details;
    }
    
    // Determine stage based on progress percentage
    const progress = sourceProgress.progress || 0;
    const stage = getStageFromProgress(progressData, scraperId);
    
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
        details.total = sourceProgress.articles_found || 3;
        details.currentUrl = 'https://example.com/news/1';
        break;
        
      case 'processing_html':
        // Simulate current article being processed
        details.current = 2;
        details.total = sourceProgress.articles_found || 3;
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
        details.scraped = sourceProgress.articles_found || 3;
        details.saved = sourceProgress.articles_processed || 3;
        details.errors = 0;
        
        // Calculate duration if available
        if (sourceProgress.start_time && sourceProgress.end_time) {
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
}); 