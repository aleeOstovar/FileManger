const RssPost = require('../models/RssPost');

/**
 * Create a new RSS post
 * @param {Object} postData - RSS post data
 * @returns {Promise<Object>} - Created RSS post
 */
exports.createRssPost = async (postData) => {
  try {
    const newRssPost = await RssPost.create(postData);
    return newRssPost;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if RSS post exists
 * @param {Object} postData - Post data to check (sourceURL)
 * @returns {Promise<Boolean>} - Whether post exists or not
 */
exports.checkRssPostExists = async (postData) => {
  try {
    const { link } = postData;
    
    if (!link) {
      return false;
    }
    
    // Count matching documents based only on sourceURL
    const count = await RssPost.countDocuments({ sourceURL: link });
    
    return count > 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all RSS posts with pagination
 * @param {Object} options - Query options (page, limit, sort, etc.)
 * @returns {Promise<Object>} - RSS posts and pagination info
 */
exports.getAllRssPosts = async (options = {}) => {
  try {
    const page = options.page * 1 || 1;
    const limit = options.limit * 1 || 100;
    const skip = (page - 1) * limit;
    
    const query = {};
    
    // Handle date filtering if provided
    if (options.startDate && options.endDate) {
      query.pubDate = {
        $gte: options.startDate,
        $lte: options.endDate
      };
    } else if (options.startDate) {
      query.pubDate = { $gte: options.startDate };
    } else if (options.endDate) {
      query.pubDate = { $lte: options.endDate };
    }
    
    // Build sort options
    const sortOptions = {};
    if (options.sortBy) {
      const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
      sortOptions[options.sortBy] = sortOrder;
    } else {
      // Default sort by pubDate (newest first)
      sortOptions.pubDate = -1;
    }
    
    // Execute query with pagination
    const rssPosts = await RssPost.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalResults = await RssPost.countDocuments(query);
    
    return {
      results: rssPosts,
      page,
      limit,
      totalResults,
      totalPages: Math.ceil(totalResults / limit)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get a single RSS post by ID
 * @param {string} postId - RSS post ID
 * @returns {Promise<Object>} - RSS post
 */
exports.getRssPostById = async (postId) => {
  try {
    const rssPost = await RssPost.findById(postId);
    
    if (!rssPost) {
      const error = new Error('RSS post not found');
      error.statusCode = 404;
      throw error;
    }
    
    return rssPost;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an RSS post
 * @param {string} postId - RSS post ID
 * @param {Object} updateData - Updated RSS post data
 * @returns {Promise<Object>} - Updated RSS post
 */
exports.updateRssPost = async (postId, updateData) => {
  try {
    const rssPost = await RssPost.findByIdAndUpdate(
      postId,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!rssPost) {
      const error = new Error('RSS post not found');
      error.statusCode = 404;
      throw error;
    }
    
    return rssPost;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an RSS post
 * @param {string} postId - RSS post ID
 * @returns {Promise<void>}
 */
exports.deleteRssPost = async (postId) => {
  try {
    const rssPost = await RssPost.findByIdAndDelete(postId);
    
    if (!rssPost) {
      const error = new Error('RSS post not found');
      error.statusCode = 404;
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    throw error;
  }
}; 