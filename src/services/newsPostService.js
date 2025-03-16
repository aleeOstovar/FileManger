const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const NewsPost = require('../models/NewsPost');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

// Check if we're using memory store mode
const useMemoryStore = process.env.USE_MEMORY_STORE === 'true';
const newsPostsPath = path.join(__dirname, '../../data/news-posts.json');

// Helper function to load news posts from file in memory store mode
const loadNewsPosts = () => {
  try {
    if (!fs.existsSync(newsPostsPath)) {
      return [];
    }
    const data = fs.readFileSync(newsPostsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error loading news posts from file:', error);
    return [];
  }
};

// Helper function to save news posts to file in memory store mode
const saveNewsPosts = (newsPosts) => {
  try {
    const dataDir = path.dirname(newsPostsPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(newsPostsPath, JSON.stringify(newsPosts, null, 2));
  } catch (error) {
    logger.error('Error saving news posts to file:', error);
  }
};

/**
 * Create a new news post
 * @param {Object} postData - The data for the news post
 * @returns {Promise<Object>} The created news post
 */
exports.createNewsPost = async (postData) => {
  logger.info('Creating new news post');
  
  if (useMemoryStore) {
    const newsPosts = loadNewsPosts();
    const newPost = {
      ...postData,
      _id: mongoose.Types.ObjectId().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    newsPosts.push(newPost);
    saveNewsPosts(newsPosts);
    logger.info(`Created news post with ID: ${newPost._id}`);
    return newPost;
  }
  
  const newsPost = await NewsPost.create(postData);
  logger.info(`Created news post with ID: ${newsPost._id}`);
  return newsPost;
};

/**
 * Get all news posts with filtering, sorting, and pagination
 * @param {Object} options - Query options
 * @returns {Promise<{data: Array, total: number}>} News posts and total count
 */
exports.getAllNewsPosts = async (options = {}) => {
  const { 
    page = 1, 
    limit = 10, 
    sort = '-createdAt',
    status = 'published',
    search = ''
  } = options;
  
  const skip = (page - 1) * limit;
  
  if (useMemoryStore) {
    let newsPosts = loadNewsPosts();
    
    // Filter by status
    if (status) {
      newsPosts = newsPosts.filter(post => post.status === status);
    }
    
    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      newsPosts = newsPosts.filter(post => 
        post.title.toLowerCase().includes(searchLower) || 
        post.content.toLowerCase().includes(searchLower) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    
    // Sort
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    
    newsPosts.sort((a, b) => {
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        return sortOrder * (new Date(a[sortField]) - new Date(b[sortField]));
      }
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });
    
    const total = newsPosts.length;
    const paginatedPosts = newsPosts.slice(skip, skip + limit);
    
    return { data: paginatedPosts, total };
  }
  
  // MongoDB implementation
  const query = {};
  
  // Status filter
  if (status) {
    query.status = status;
  }
  
  // Search functionality
  if (search) {
    // Use MongoDB text search if the search is a word, otherwise use regex
    if (search.trim().indexOf(' ') === -1) {
      query.$text = { $search: search };
    } else {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
  }
  
  const [results, total] = await Promise.all([
    NewsPost.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    NewsPost.countDocuments(query)
  ]);
  
  return { data: results, total };
};

/**
 * Get a news post by ID
 * @param {string} id - The news post ID
 * @returns {Promise<Object|null>} The news post or null if not found
 */
exports.getNewsPostById = async (id) => {
  if (useMemoryStore) {
    const newsPosts = loadNewsPosts();
    return newsPosts.find(post => post._id === id) || null;
  }
  
  return await NewsPost.findById(id).lean();
};

/**
 * Update a news post
 * @param {string} id - The news post ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object|null>} The updated news post or null if not found
 */
exports.updateNewsPost = async (id, updateData) => {
  logger.info(`Updating news post with ID: ${id}`);
  
  if (useMemoryStore) {
    const newsPosts = loadNewsPosts();
    const index = newsPosts.findIndex(post => post._id === id);
    
    if (index === -1) {
      logger.warn(`News post with ID ${id} not found`);
      return null;
    }
    
    const updatedPost = {
      ...newsPosts[index],
      ...updateData,
      updatedAt: new Date()
    };
    
    newsPosts[index] = updatedPost;
    saveNewsPosts(newsPosts);
    
    logger.info(`Updated news post with ID: ${id}`);
    return updatedPost;
  }
  
  const newsPost = await NewsPost.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );
  
  if (!newsPost) {
    logger.warn(`News post with ID ${id} not found`);
    return null;
  }
  
  logger.info(`Updated news post with ID: ${id}`);
  return newsPost;
};

/**
 * Delete a news post
 * @param {string} id - The news post ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
exports.deleteNewsPost = async (id) => {
  logger.info(`Deleting news post with ID: ${id}`);
  
  if (useMemoryStore) {
    const newsPosts = loadNewsPosts();
    const initialLength = newsPosts.length;
    
    const filteredPosts = newsPosts.filter(post => post._id !== id);
    
    if (filteredPosts.length === initialLength) {
      logger.warn(`News post with ID ${id} not found`);
      return false;
    }
    
    saveNewsPosts(filteredPosts);
    logger.info(`Deleted news post with ID: ${id}`);
    return true;
  }
  
  const result = await NewsPost.findByIdAndDelete(id);
  
  if (!result) {
    logger.warn(`News post with ID ${id} not found`);
    return false;
  }
  
  logger.info(`Deleted news post with ID: ${id}`);
  return true;
};

/**
 * Get statistics about news posts
 * @returns {Promise<Array>} Statistics by status
 */
exports.getNewsPostStats = async () => {
  if (useMemoryStore) {
    const newsPosts = loadNewsPosts();
    
    // Group posts by status
    const statsByStatus = newsPosts.reduce((acc, post) => {
      const status = post.status || 'unknown';
      
      if (!acc[status]) {
        acc[status] = {
          status,
          count: 0,
          newest: null,
          oldest: null
        };
      }
      
      acc[status].count += 1;
      const createdAt = new Date(post.createdAt);
      
      if (!acc[status].newest || createdAt > new Date(acc[status].newest)) {
        acc[status].newest = post.createdAt;
      }
      
      if (!acc[status].oldest || createdAt < new Date(acc[status].oldest)) {
        acc[status].oldest = post.createdAt;
      }
      
      return acc;
    }, {});
    
    // Convert to array and sort by count
    return Object.values(statsByStatus).sort((a, b) => b.count - a.count);
  }
  
  return await NewsPost.getStats();
};

/**
 * Search news posts by keyword
 * @param {string} keyword - The search keyword
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Matching news posts
 */
exports.searchNewsPosts = async (keyword, limit = 10) => {
  if (useMemoryStore) {
    if (!keyword) return [];
    
    const newsPosts = loadNewsPosts();
    const keywordLower = keyword.toLowerCase();
    
    return newsPosts
      .filter(post => 
        post.title.toLowerCase().includes(keywordLower) || 
        post.content.toLowerCase().includes(keywordLower) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(keywordLower)))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
  
  if (!keyword) return [];
  
  return await NewsPost.find(
    { 
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } }
      ],
      status: 'published'
    }
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get news posts by tag
 * @param {string} tag - The tag to filter by
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<{data: Array, total: number}>} News posts and total count
 */
exports.getNewsPostsByTag = async (tag, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  if (useMemoryStore) {
    const newsPosts = loadNewsPosts();
    
    const filteredPosts = newsPosts.filter(
      post => post.status === 'published' && post.tags && post.tags.includes(tag)
    );
    
    return {
      data: filteredPosts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(skip, skip + limit),
      total: filteredPosts.length
    };
  }
  
  const query = {
    tags: tag,
    status: 'published'
  };
  
  const [results, total] = await Promise.all([
    NewsPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NewsPost.countDocuments(query)
  ]);
  
  return { data: results, total };
}; 