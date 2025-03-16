/**
 * Utility functions for file handling
 */

/**
 * Adds the full URL to a file object
 * @param {Object} file - The file document from the database
 * @param {Object} req - Express request object
 * @returns {Object} - File object with fullUrl added
 */
exports.addFullUrl = (file, req) => {
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host');
  const fullUrl = `${protocol}://${host}${file.url}`;
  
  // If it's a Mongoose document, convert to plain object
  const fileData = file.toObject ? file.toObject() : { ...file };
  fileData.fullUrl = fullUrl;
  
  return fileData;
};

/**
 * Adds full URLs to an array of file objects
 * @param {Array} files - Array of file documents
 * @param {Object} req - Express request object
 * @returns {Array} - Files with fullUrl added to each
 */
exports.addFullUrlToMany = (files, req) => {
  return files.map(file => exports.addFullUrl(file, req));
}; 