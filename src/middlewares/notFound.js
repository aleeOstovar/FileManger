/**
 * Handle 404 not found routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.status = 'fail';
  error.isOperational = true;
  next(error);
};

module.exports = { notFound }; 