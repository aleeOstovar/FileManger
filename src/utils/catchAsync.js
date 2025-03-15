/**
 * Wrapper for catching async errors in Express route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync; 