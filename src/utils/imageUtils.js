const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const File = require('../models/File');

/**
 * Download an image from a URL and save it to the file system
 * @param {string} imageUrl - URL of the image to download
 * @returns {Promise<Object|null>} File object or null if download failed
 */
async function downloadAndSaveImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    logger.warn('Invalid image URL provided');
    return null;
  }

  try {
    // Get file extension from URL
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname;
    const originalFilename = path.basename(pathname);
    
    // Generate a unique filename
    const fileExtension = path.extname(originalFilename) || '.jpg'; // Default to jpg if no extension
    const filename = `${Date.now()}-${uuidv4()}${fileExtension}`;
    
    // Create upload directory path
    const uploadDir = path.join(process.cwd(), 'uploads', 'images');
    const filePath = path.join(uploadDir, filename);
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Download the image
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });
    
    // Get content type and file size
    const mimetype = response.headers['content-type'] || 'image/jpeg';
    
    // Create a write stream
    const writer = fs.createWriteStream(filePath);
    
    // Pipe the response to the file
    response.data.pipe(writer);
    
    // Return a promise that resolves when the download is complete
    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        try {
          // Get file size
          const stats = fs.statSync(filePath);
          const size = stats.size;
          
          // Create a new file record in the database
          const file = await File.create({
            originalname: originalFilename,
            encoding: 'binary',
            mimetype,
            filename,
            path: filePath,
            size,
            type: 'image',
            metadata: {
              sourceUrl: imageUrl
            }
          });
          
          logger.info(`Successfully downloaded and saved image: ${imageUrl} to ${filePath}`);
          
          resolve(file);
        } catch (err) {
          reject(err);
        }
      });
      
      writer.on('error', (err) => {
        logger.error(`Error writing file: ${err.message}`);
        fs.unlink(filePath, () => {}); // Clean up partial file
        reject(err);
      });
    });
  } catch (error) {
    logger.error(`Error downloading image from ${imageUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Get the full URL for a file
 * @param {Object} file - File object from database
 * @param {Object} req - Express request object for host info
 * @returns {string} Full URL to the file
 */
function getFullImageUrl(file, req) {
  if (!file || !file.url) return null;
  
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host');
  return `${protocol}://${host}${file.url}`;
}

module.exports = {
  downloadAndSaveImage,
  getFullImageUrl
}; 