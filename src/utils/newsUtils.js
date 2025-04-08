const logger = require('./logger');

/**
 * Helper function to ensure image URLs are in the correct format for display
 * Converts string arrays to object arrays if needed
 */
function normalizeImagesFormat(newsPost) {
  if (!newsPost) return newsPost;
  
  // Initialize empty imagesUrl if it doesn't exist
  if (!newsPost.imagesUrl) {
    newsPost.imagesUrl = [];
  }
  
  // Handle imagesUrl format
  if (Array.isArray(newsPost.imagesUrl)) {
    // Handle empty array case
    if (newsPost.imagesUrl.length === 0) {
      // Leave it as an empty array
    }
    // Convert string arrays to objects with properties
    else if (typeof newsPost.imagesUrl[0] === 'string') {
      newsPost.imagesUrl = newsPost.imagesUrl.map((url, idx) => ({
        id: `img${idx}`,
        url,
        caption: '',
        type: 'figure'
      }));
      
      logger.info('Converted string imagesUrl to object structure for display');
    }
  } else if (newsPost.imagesUrl && !Array.isArray(newsPost.imagesUrl)) {
    // Handle case where imagesUrl is not an array
    if (typeof newsPost.imagesUrl === 'string') {
      // Convert single string to array with one object
      newsPost.imagesUrl = [{
        id: 'img0',
        url: newsPost.imagesUrl,
        caption: '',
        type: 'figure'
      }];
      logger.info('Converted string imagesUrl to array of objects');
    } else {
      // Set to empty array if it's an invalid type
      newsPost.imagesUrl = [];
      logger.warn('Reset invalid imagesUrl to empty array');
    }
  }
  
  // Ensure content is an object (needed for preview rendering)
  if (newsPost?.content && typeof newsPost.content === 'string') {
    try {
      // Attempt to parse if it looks like JSON
      if (newsPost.content.trim().startsWith('{') && newsPost.content.trim().endsWith('}')) {
        newsPost.content = JSON.parse(newsPost.content);
        logger.info('Converted string content to object structure for display');
      } else {
         // If it's just plain text, wrap it in a simple object
         newsPost.content = { p0: newsPost.content };
         logger.info('Wrapped plain string content in object structure for display');
      }
    } catch (e) {
      logger.error(`Failed to parse content string as JSON: ${e.message}. Wrapping as plain text.`);
      // Fallback: wrap plain text in a simple object
      newsPost.content = { p0: newsPost.content };
    }
  } else if (newsPost && !newsPost.content) {
      // Handle case where content might be null or undefined
      newsPost.content = {}; // Default to empty object
  }
  
  return newsPost;
}

module.exports = {
  normalizeImagesFormat
}; 